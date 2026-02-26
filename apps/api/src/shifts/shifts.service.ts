import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma, ShiftStatus } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) { }

  private toMinutes(isoDate: Date) {
    return isoDate.getUTCHours() * 60 + isoDate.getUTCMinutes();
  }

  private inDateRange(target: Date, startDate?: Date | null, endDate?: Date | null) {
    const value = target.toISOString().slice(0, 10);
    const start = startDate?.toISOString().slice(0, 10);
    const end = endDate?.toISOString().slice(0, 10);
    if (start && value < start) return false;
    if (end && value > end) return false;
    return true;
  }

  private inTimeRange(target: Date, startTime?: string | null, endTime?: string | null) {
    if (!startTime || !endTime) return true;
    const targetMinutes = this.toMinutes(target);
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return targetMinutes >= startMinutes && targetMinutes < endMinutes;
  }

  private parseTimeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
    return startA < endB && endA > startB;
  }

  private async buildAvailabilityWarnings(employeeId: string, startTime: Date, endTime: Date, forceOverride?: boolean) {
    const dayOfWeek = startTime.getUTCDay();
    const blocks = await this.prisma.availabilityBlock.findMany({
      where: { employeeId, dayOfWeek }
    });

    const warnings: string[] = [];
    const shiftStartMinutes = this.toMinutes(startTime);
    const shiftEndMinutes = this.toMinutes(endTime);

    for (const block of blocks) {
      if (!this.inDateRange(startTime, block.startDate, block.endDate)) {
        continue;
      }

      const blockStartMinutes = block.startTime ? this.parseTimeToMinutes(block.startTime) : 0;
      const blockEndMinutes = block.endTime ? this.parseTimeToMinutes(block.endTime) : 24 * 60;
      const hit = this.intervalsOverlap(shiftStartMinutes, shiftEndMinutes, blockStartMinutes, blockEndMinutes);

      if (!hit) {
        continue;
      }

      if (block.type === 'UNAVAILABLE' && !forceOverride) {
        throw new UnprocessableEntityException({ code: 'UNAVAILABLE_CONFLICT', message: 'Shift conflicts with UNAVAILABLE block' });
      }

      if (block.type === 'UNAVAILABLE' && forceOverride) {
        warnings.push('UNAVAILABLE block overridden');
      }

      if (block.type === 'PREFER_NOT') {
        warnings.push('Employee prefers not to work in this interval');
      }

      if (block.type === 'AVAILABLE_ONLY') {
        const fullyInside = shiftStartMinutes >= blockStartMinutes && shiftEndMinutes <= blockEndMinutes;
        if (!fullyInside && !forceOverride) {
          throw new UnprocessableEntityException({ code: 'AVAILABLE_ONLY_CONFLICT', message: 'Shift must stay within AVAILABLE_ONLY interval' });
        }
        if (!fullyInside && forceOverride) {
          warnings.push('AVAILABLE_ONLY rule overridden');
        }
      }
    }

    return warnings;
  }

  async list(employeeId?: string, start?: string, end?: string, status?: string, actor?: { role: string; employeeId?: string }) {
    const scope = await getEmployeeScope(this.prisma, actor);

    if (scope.type === 'self' && employeeId && employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only access your own shifts' });
    }

    const where: Prisma.ShiftWhereInput = {
      status: status as ShiftStatus | undefined,
      startTime: start || end ? { gte: start ? new Date(start) : undefined, lte: end ? new Date(end) : undefined } : undefined
    };

    if (scope.type === 'all') {
      where.employeeId = employeeId;
    } else { // scope.type must be 'self'
      where.employeeId = scope.employeeId;
    }

    return this.prisma.shift.findMany({
      where,
      orderBy: [{ startTime: 'asc' }]
    });
  }

  async getById(id: string, actor?: { role: string; employeeId?: string }) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: undefined
    });

    if (!shift) {
      throw new NotFoundException({ code: 'SHIFT_NOT_FOUND', message: 'Shift not found' });
    }

    const scope = await getEmployeeScope(this.prisma, actor);
    if (scope.type === 'self' && shift.employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only access your own shifts' });
    }



    return shift;
  }

  async create(dto: CreateShiftDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startTime must be before endTime' });
    }

    const overlap = await this.prisma.shift.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: { not: 'CANCELLED' },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (overlap) {
      throw new ConflictException({ code: 'SHIFT_OVERLAP', message: 'Shift overlaps another shift' });
    }

    const warnings = await this.buildAvailabilityWarnings(dto.employeeId, startTime, endTime, dto.forceOverride);
    const shift = await this.prisma.shift.create({
      data: {
        employeeId: dto.employeeId,
        startTime,
        endTime,
        note: dto.note,
        status: 'PUBLISHED'
      }
    });

    return { ...shift, warnings };
  }

  async update(id: string, dto: UpdateShiftDto) {
    const existing = await this.getById(id);

    const employeeId = dto.employeeId ?? existing.employeeId;
    const startTime = new Date(dto.startTime ?? existing.startTime.toISOString());
    const endTime = new Date(dto.endTime ?? existing.endTime.toISOString());

    if (startTime >= endTime) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startTime must be before endTime' });
    }

    const overlap = await this.prisma.shift.findFirst({
      where: {
        id: { not: id },
        employeeId,
        status: { not: 'CANCELLED' },
        startTime: { lt: endTime },
        endTime: { gt: startTime }
      }
    });

    if (overlap) {
      throw new ConflictException({ code: 'SHIFT_OVERLAP', message: 'Shift overlaps another shift' });
    }

    const warnings = await this.buildAvailabilityWarnings(employeeId, startTime, endTime, dto.forceOverride);

    const shift = await this.prisma.shift.update({
      where: { id },
      data: {
        employeeId,
        startTime,
        endTime,
        note: dto.note ?? existing.note
      }
    });

    return { ...shift, warnings };
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.shift.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { message: 'Shift cancelled' };
  }

  async acknowledge(id: string, actor: { role: string; employeeId?: string }) {
    const shift = await this.getById(id);
    if (actor.role === 'EMPLOYEE' && actor.employeeId !== shift.employeeId) {
      throw new BadRequestException({ code: 'FORBIDDEN', message: 'You can only acknowledge your own shifts' });
    }
    if (shift.status !== 'PUBLISHED') {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Only PUBLISHED shifts can be acknowledged' });
    }
    return this.prisma.shift.update({ where: { id }, data: { status: 'ACKNOWLEDGED' } });
  }

  async bulkCreate(payload: CreateShiftDto[]) {
    const created: Array<unknown> = [];
    const failed: Array<{ index: number; reason: string }> = [];

    for (let index = 0; index < payload.length; index += 1) {
      try {
        const item = payload[index];
        const shift = await this.create(item);
        created.push(shift);
      } catch (error) {
        failed.push({ index, reason: (error as Error).message });
      }
    }

    return {
      created: created.length,
      errors: failed.length,
      shifts: created,
      failed
    };
  }

  async copyWeek(sourceWeekStart: string, targetWeekStart: string) {
    const sourceStart = parseWeekStart(sourceWeekStart);
    const sourceEnd = plusDays(sourceStart, 7);

    const targetStart = parseWeekStart(targetWeekStart);

    const sourceShifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: sourceStart, lt: sourceEnd },
        status: { not: 'CANCELLED' }
      }
    });

    const results = await this.prisma.$transaction(async (trx: any) => {
      const created: Array<unknown> = [];
      const errors: Array<{ shiftId: string; reason: string }> = [];
      let skipped = 0;

      for (const shift of sourceShifts) {
        const startOffsetMs = shift.startTime.getTime() - sourceStart.getTime();
        const endOffsetMs = shift.endTime.getTime() - sourceStart.getTime();
        const targetStartTime = new Date(targetStart.getTime() + startOffsetMs);
        const targetEndTime = new Date(targetStart.getTime() + endOffsetMs);

        const overlap = await trx.shift.findFirst({
          where: {
            employeeId: shift.employeeId,
            status: { not: 'CANCELLED' },
            startTime: { lt: targetEndTime },
            endTime: { gt: targetStartTime }
          }
        });

        if (overlap) {
          skipped += 1;
          errors.push({ shiftId: shift.id, reason: 'Target overlap exists' });
          continue;
        }

        const createdShift = await trx.shift.create({
          data: {
            employeeId: shift.employeeId,
            startTime: targetStartTime,
            endTime: targetEndTime,
            note: shift.note,
            status: shift.status
          }
        });

        created.push(createdShift);
      }

      return { created, errors, skipped };
    });

    return {
      created: results.created.length,
      errors: results.errors,
      shifts: results.created,
      skipped: results.skipped
    };
  }
}
