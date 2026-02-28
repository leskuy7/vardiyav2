import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { getEmployeeScope } from '../common/employee-scope';
import { PrismaService } from '../database/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private toMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async list(employeeId?: string, dayOfWeek?: number, actor?: { role: string; employeeId?: string }) {
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
          employee: { department: scope.department },
          ...(employeeId ? { employeeId } : {}),
          ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
      });
    }

    return this.prisma.availabilityBlock.findMany({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(dayOfWeek !== undefined ? { dayOfWeek } : {})
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  async create(dto: CreateAvailabilityDto, actor: { sub: string; role: string; employeeId?: string }) {
    if (actor.role === 'EMPLOYEE') {
      if (actor.employeeId !== dto.employeeId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only manage your own availability' });
      }
    } else if (actor.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      const target = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (!target || target.department !== manager?.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only manage availability for employees in your department' });
      }
    }

    if ((dto.startTime && !dto.endTime) || (!dto.startTime && dto.endTime)) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startTime and endTime must be together' });
    }

    if (dto.startTime && dto.endTime && this.toMinutes(dto.startTime) >= this.toMinutes(dto.endTime)) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startTime must be before endTime' });
    }

    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'startDate must be before endDate' });
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

  async remove(id: string, actor: { sub: string; role: string; employeeId?: string }) {
    const record = await this.prisma.availabilityBlock.findUnique({ where: { id }, include: { employee: true } });
    if (!record) {
      throw new BadRequestException({ code: 'AVAILABILITY_NOT_FOUND', message: 'Availability not found' });
    }

    if (actor.role === 'EMPLOYEE') {
      if (actor.employeeId !== record.employeeId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only delete your own availability' });
      }
    } else if (actor.role === 'MANAGER' && actor.employeeId) {
      const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
      if (record.employee.department !== manager?.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only delete availability for employees in your department' });
      }
    }

    await this.prisma.availabilityBlock.delete({ where: { id } });
    return { message: 'Availability deleted' };
  }
}
