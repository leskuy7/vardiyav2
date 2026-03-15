import { Injectable, UnprocessableEntityException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { getEmployeeScope } from '../common/employee-scope';
import { PrismaService } from '../database/prisma.service';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

type Actor = { role: string; sub?: string; employeeId?: string };

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) { }

  private async assertEmployeeScope(targetEmployeeId: string, actor?: Actor) {
    const scope = await getEmployeeScope(this.prisma, actor);

    if (scope.type === 'self' && targetEmployeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi kayıtlarınıza erişebilirsiniz' });
    }

    if (scope.type === 'department') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { department: true, organizationId: true }
      });
      if (
        !employee ||
        employee.department !== scope.department ||
        (scope.organizationId && employee.organizationId !== scope.organizationId)
      ) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki kayıtları yönetebilirsiniz' });
      }
    }

    if (scope.type === 'all_in_org') {
      const employee = await this.prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        select: { organizationId: true }
      });
      if (!employee || employee.organizationId !== scope.organizationId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi organizasyonunuzdaki kayıtları yönetebilirsiniz' });
      }
    }
  }

  async getActiveEntry(employeeId?: string) {
    if (!employeeId) return null;
    return this.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        status: 'OPEN'
      },
      orderBy: { checkInAt: 'desc' }
    });
  }

  async checkIn(dto: CheckInDto, actor?: Actor) {
    const targetEmployeeId = dto.employeeId ?? actor?.employeeId;
    if (!targetEmployeeId) {
      throw new UnprocessableEntityException({
        code: 'EMPLOYEE_ID_REQUIRED',
        message: 'Giriş yapılacak çalışan belirtilmedi'
      });
    }

    if (actor?.role === 'EMPLOYEE' && targetEmployeeId !== actor.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi girişinizi başlatabilirsiniz' });
    }

    await this.assertEmployeeScope(targetEmployeeId, actor);

    const start = new Date(dto.checkInAt);

    if (dto.shiftId) {
      const shift = await this.prisma.shift.findUnique({
        where: { id: dto.shiftId },
        select: { employeeId: true, status: true }
      });
      if (!shift || shift.employeeId !== targetEmployeeId || shift.status === 'CANCELLED') {
        throw new UnprocessableEntityException({
          code: 'INVALID_SHIFT_FOR_ENTRY',
          message: 'Time entry için geçerli bir vardiya bulunamadı'
        });
      }
    }

    // Prevent checking in twice when already OPEN
    const existingOpen = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId: targetEmployeeId,
        status: 'OPEN'
      }
    });

    if (existingOpen) {
      throw new UnprocessableEntityException({
        code: 'ALREADY_CHECKED_IN',
        message: 'Hali hazırda açık bir giriş kaydınız var'
      });
    }

    const overlapsExisting = await this.prisma.timeEntry.findFirst({
      where: {
        employeeId: targetEmployeeId,
        checkInAt: { lte: start },
        OR: [{ endAt: null }, { endAt: { gt: start } }]
      }
    });

    if (overlapsExisting) {
      throw new UnprocessableEntityException({
        code: 'TIME_ENTRY_OVERLAP',
        message: 'Bu saatte mevcut bir puantaj kaydı ile çakışma var'
      });
    }

    return this.prisma.timeEntry.create({
      data: {
        employeeId: targetEmployeeId,
        checkInAt: start,
        shiftId: dto.shiftId,
        source: dto.source || 'MANUAL',
        status: 'OPEN'
      }
    });
  }

  async checkOut(id: string, dto: CheckOutDto, actor?: Actor) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });

    if (!entry) throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });

    await this.assertEmployeeScope(entry.employeeId, actor);

    // Only admins/managers or the owner can check out
    if (actor?.role === 'EMPLOYEE' && entry.employeeId !== actor.employeeId) {
      throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });
    }

    if (entry.status !== 'OPEN') {
      throw new UnprocessableEntityException({
        code: 'ENTRY_NOT_OPEN',
        message: 'Bu kayıt işlemi zaten kapatılmış veya geçersiz'
      });
    }

    const end = new Date(dto.checkOutAt);

    // Check out should be after check in
    if (end <= entry.checkInAt) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TIMEOUT',
        message: 'Çıkış saati, giriş saatinden önce olamaz'
      });
    }

    const overlapsExisting = await this.prisma.timeEntry.findFirst({
      where: {
        id: { not: id },
        employeeId: entry.employeeId,
        checkInAt: { lt: end },
        OR: [{ endAt: null }, { endAt: { gt: entry.checkInAt } }]
      }
    });

    if (overlapsExisting) {
      throw new UnprocessableEntityException({
        code: 'TIME_ENTRY_OVERLAP',
        message: 'Çıkış aralığı mevcut bir puantaj kaydı ile çakışıyor'
      });
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        checkOutAt: end,
        endAt: end, // For exclusion constraint
        status: 'CLOSED'
      }
    });
  }
}
