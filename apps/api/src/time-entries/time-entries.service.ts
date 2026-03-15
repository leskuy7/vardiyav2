import { Injectable, UnprocessableEntityException, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { Actor, getEmployeeScope } from '../common/employee-scope';
import { PaginationQueryDto, paginationArgs } from '../common/dto/pagination-query.dto';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

@Injectable()
export class TimeEntriesService {
  constructor(private prisma: PrismaService) { }

  async list(actor: Actor, params?: { from?: string; to?: string; employeeId?: string; status?: string }, pagination?: PaginationQueryDto) {
    const scope = await getEmployeeScope(this.prisma, actor);
    const where: Prisma.TimeEntryWhereInput = {};

    if (scope.type === 'self') where.employeeId = scope.employeeId;
    if (scope.type === 'all_in_org') where.employee = { organizationId: scope.organizationId };
    if (scope.type === 'department') {
      where.employee = { department: scope.department, ...(scope.organizationId ? { organizationId: scope.organizationId } : {}) };
    }

    if (params?.employeeId) where.employeeId = params.employeeId;
    if (params?.status) where.status = params.status.toUpperCase() as Prisma.EnumTimeEntryStatusFilter;
    if (params?.from || params?.to) {
      where.checkInAt = {};
      if (params.from) where.checkInAt.gte = new Date(params.from);
      if (params.to) where.checkInAt.lte = new Date(params.to);
    }

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { checkInAt: 'desc' },
      ...paginationArgs(pagination, 200),
    });
  }

  async voidEntry(id: string, actor: Actor) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });

    if (actor.role === 'EMPLOYEE' && entry.employeeId !== actor.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu kaydı iptal etme yetkiniz yok' });
    }

    if (entry.status === 'VOID') {
      throw new UnprocessableEntityException({ code: 'ALREADY_VOID', message: 'Bu kayıt zaten iptal edilmiş' });
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data: { status: 'VOID' }
    });
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

  async checkIn(dto: CheckInDto, actorRole?: string, actorEmployeeId?: string) {
    const targetEmployeeId = dto.employeeId ?? actorEmployeeId;
    if (!targetEmployeeId) {
      throw new UnprocessableEntityException({
        code: 'EMPLOYEE_ID_REQUIRED',
        message: 'Giriş yapılacak çalışan belirtilmedi'
      });
    }

    if (actorRole === 'EMPLOYEE' && targetEmployeeId !== actorEmployeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi girişinizi başlatabilirsiniz' });
    }

    const start = new Date(dto.checkInAt);

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

  async checkOut(id: string, dto: CheckOutDto, actorEmployeeId?: string, actorRole?: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });

    if (!entry) throw new NotFoundException({ code: 'TIME_ENTRY_NOT_FOUND', message: 'Kayıt bulunamadı' });

    // Only admins/managers or the owner can check out
    if (actorRole === 'EMPLOYEE' && entry.employeeId !== actorEmployeeId) {
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
