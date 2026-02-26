import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private toMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async list(employeeId?: string, dayOfWeek?: number) {
    return this.prisma.availabilityBlock.findMany({
      where: {
        employeeId,
        dayOfWeek
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
  }

  async create(dto: CreateAvailabilityDto, actor: { sub: string; role: string; employeeId?: string }) {
    const canManageAll = actor.role === 'ADMIN' || actor.role === 'MANAGER';
    if (!canManageAll && actor.employeeId !== dto.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only manage your own availability' });
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
    const record = await this.prisma.availabilityBlock.findUnique({ where: { id } });
    if (!record) {
      throw new BadRequestException({ code: 'AVAILABILITY_NOT_FOUND', message: 'Availability not found' });
    }

    const canManageAll = actor.role === 'ADMIN' || actor.role === 'MANAGER';
    if (!canManageAll && actor.employeeId !== record.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only delete your own availability' });
    }

    await this.prisma.availabilityBlock.delete({ where: { id } });
    return { message: 'Availability deleted' };
  }
}
