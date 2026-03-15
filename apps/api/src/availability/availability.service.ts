import { BadRequestException, Injectable } from '@nestjs/common';
import { getEmployeeScope } from '../common/employee-scope';
import { assertActorAccessToEmployee } from '../common/manager-scope';
import { PrismaService } from '../database/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private toMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async list(employeeId?: string, dayOfWeek?: number, actor?: { role: string; sub?: string; employeeId?: string }) {
    const scope = await getEmployeeScope(this.prisma, actor);

    if (scope.type === 'self') {
      return this.prisma.availabilityBlock.findMany({
        where: {
          employeeId: scope.employeeId,
          ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    }

    if (scope.type === 'department') {
      return this.prisma.availabilityBlock.findMany({
        where: {
          employee: {
            department: scope.department,
            ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
          },
          ...(employeeId ? { employeeId } : {}),
          ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    }

    if (scope.type === 'all') {
      return this.prisma.availabilityBlock.findMany({
        where: {
          ...(employeeId ? { employeeId } : {}),
          ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    }

    return this.prisma.availabilityBlock.findMany({
      where: {
        employee: { organizationId: scope.organizationId },
        ...(employeeId ? { employeeId } : {}),
        ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  async create(dto: CreateAvailabilityDto, actor: { sub: string; role: string; employeeId?: string }) {
    await assertActorAccessToEmployee(this.prisma, actor, dto.employeeId);

    if ((dto.startTime && !dto.endTime) || (!dto.startTime && dto.endTime)) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Başlangıç ve bitiş saati birlikte belirtilmelidir' });
    }

    if (dto.startTime && dto.endTime && this.toMinutes(dto.startTime) >= this.toMinutes(dto.endTime)) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Başlangıç saati bitiş saatinden önce olmalıdır' });
    }

    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır' });
    }

    return this.prisma.availabilityBlock.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        note: dto.note
      }
    });
  }

  async update(id: string, dto: Partial<CreateAvailabilityDto>, actor: { sub: string; role: string; employeeId?: string }) {
    const record = await this.prisma.availabilityBlock.findUnique({ where: { id } });
    if (!record) {
      throw new BadRequestException({ code: 'AVAILABILITY_NOT_FOUND', message: 'Müsaitlik kaydı bulunamadı' });
    }

    await assertActorAccessToEmployee(this.prisma, actor, record.employeeId);

    if (dto.startTime && dto.endTime && this.toMinutes(dto.startTime) >= this.toMinutes(dto.endTime)) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Başlangıç saati bitiş saatinden önce olmalıdır' });
    }

    return this.prisma.availabilityBlock.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.dayOfWeek !== undefined && { dayOfWeek: dto.dayOfWeek }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.note !== undefined && { note: dto.note })
      }
    });
  }

  async remove(id: string, actor: { sub: string; role: string; employeeId?: string }) {
    const record = await this.prisma.availabilityBlock.findUnique({ where: { id } });
    if (!record) {
      throw new BadRequestException({ code: 'AVAILABILITY_NOT_FOUND', message: 'Müsaitlik kaydı bulunamadı' });
    }

    await assertActorAccessToEmployee(this.prisma, actor, record.employeeId);

    await this.prisma.availabilityBlock.delete({ where: { id } });
    return { message: 'Müsaitlik kaydı silindi' };
  }
}
