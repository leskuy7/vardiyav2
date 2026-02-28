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
    const warnings: string[] = [];

    // Day 1
    const day1 = startTime.getUTCDay();
    const shiftStart1 = this.toMinutes(startTime);
    const isCrossDay = startTime.getUTCDate() !== endTime.getUTCDate() || startTime.getUTCMonth() !== endTime.getUTCMonth() || startTime.getUTCFullYear() !== endTime.getUTCFullYear();
    const shiftEnd1 = isCrossDay ? 24 * 60 : this.toMinutes(endTime);

    const blocksDay1 = await this.prisma.availabilityBlock.findMany({
      where: { employeeId, dayOfWeek: day1 }
    });

    for (const block of blocksDay1) {
      if (!this.inDateRange(startTime, block.startDate, block.endDate)) {
        continue;
      }

      const blockStartMinutes = block.startTime ? this.parseTimeToMinutes(block.startTime) : 0;
      const blockEndMinutes = block.endTime ? this.parseTimeToMinutes(block.endTime) : 24 * 60;
      const hit = this.intervalsOverlap(shiftStart1, shiftEnd1, blockStartMinutes, blockEndMinutes);

      if (!hit) {
        continue;
      }

      if (block.type === 'UNAVAILABLE' && !forceOverride) {
        throw new UnprocessableEntityException({ code: 'UNAVAILABLE_CONFLICT', message: `Shift conflicts with UNAVAILABLE block on ${startTime.toISOString().slice(0, 10)}` });
      }

      if (block.type === 'UNAVAILABLE' && forceOverride) {
        warnings.push('UNAVAILABLE block overridden on start day');
      }

      if (block.type === 'PREFER_NOT') {
        warnings.push('Employee prefers not to work on start day');
      }

      if (block.type === 'AVAILABLE_ONLY') {
        const fullyInside = shiftStart1 >= blockStartMinutes && shiftEnd1 <= blockEndMinutes;
        if (!fullyInside && !forceOverride) {
          throw new UnprocessableEntityException({ code: 'AVAILABLE_ONLY_CONFLICT', message: 'Shift must stay within AVAILABLE_ONLY interval on start day' });
        }
        if (!fullyInside && forceOverride) {
          warnings.push('AVAILABLE_ONLY rule overridden on start day');
        }
      }
    }

    if (isCrossDay) {
      // Day 2 exists
      const day2 = endTime.getUTCDay();
      const shiftStart2 = 0;
      const shiftEnd2 = this.toMinutes(endTime);

      const blocksDay2 = await this.prisma.availabilityBlock.findMany({
        where: { employeeId, dayOfWeek: day2 }
      });

      for (const block of blocksDay2) {
        if (!this.inDateRange(endTime, block.startDate, block.endDate)) {
          continue;
        }

        const blockStartMinutes = block.startTime ? this.parseTimeToMinutes(block.startTime) : 0;
        const blockEndMinutes = block.endTime ? this.parseTimeToMinutes(block.endTime) : 24 * 60;
        const hit = this.intervalsOverlap(shiftStart2, shiftEnd2, blockStartMinutes, blockEndMinutes);

        if (!hit) {
          continue;
        }

        if (block.type === 'UNAVAILABLE' && !forceOverride) {
          throw new UnprocessableEntityException({ code: 'UNAVAILABLE_CONFLICT', message: `Shift conflicts with UNAVAILABLE block on ${endTime.toISOString().slice(0, 10)}` });
        }

        if (block.type === 'UNAVAILABLE' && forceOverride) {
          warnings.push('UNAVAILABLE block overridden on end day');
        }

        if (block.type === 'PREFER_NOT') {
          warnings.push('Employee prefers not to work on end day');
        }

        if (block.type === 'AVAILABLE_ONLY') {
          const fullyInside = shiftStart2 >= blockStartMinutes && shiftEnd2 <= blockEndMinutes;
          if (!fullyInside && !forceOverride) {
            throw new UnprocessableEntityException({ code: 'AVAILABLE_ONLY_CONFLICT', message: 'Shift must stay within AVAILABLE_ONLY interval on end day' });
          }
          if (!fullyInside && forceOverride) {
            warnings.push('AVAILABLE_ONLY rule overridden on end day');
          }
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

    if (scope.type === 'department' && employeeId) {
      const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (emp?.department !== scope.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only access shifts in your department' });
      }
    }

    const where: Prisma.ShiftWhereInput = {
      status: status as ShiftStatus | undefined,
      startTime: start || end ? { gte: start ? new Date(start) : undefined, lte: end ? new Date(end) : undefined } : undefined
    };

    if (scope.type === 'all') {
      where.employeeId = employeeId;
    } else if (scope.type === 'self') {
      where.employeeId = scope.employeeId;
    } else if (scope.type === 'department') {
      if (employeeId) {
        where.employeeId = employeeId;
      } else {
        where.employee = { department: scope.department };
      }
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

    if (scope.type === 'department') {
      const emp = await this.prisma.employee.findUnique({ where: { id: shift.employeeId } });
      if (emp?.department !== scope.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only access shifts in your department' });
      }
    }

    return shift;
  }

  async create(dto: CreateShiftDto, actor?: { role: string; employeeId?: string }) {
    const scope = await getEmployeeScope(this.prisma, actor);
    if (scope.type === 'self' && dto.employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only assign shifts to yourself' });
    }
    if (scope.type === 'department') {
      const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (emp?.department !== scope.department) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only assign shifts to employees in your department' });
      }
    }

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

  async update(id: string, dto: UpdateShiftDto, actor?: { role: string; employeeId?: string }) {
    const existing = await this.getById(id, actor);

    const employeeId = dto.employeeId ?? existing.employeeId;

    if (dto.employeeId && dto.employeeId !== existing.employeeId) {
      const scope = await getEmployeeScope(this.prisma, actor);
      if (scope.type === 'department') {
        const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (emp?.department !== scope.department) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only assign shifts to employees in your department' });
        }
      }
    }

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

  async remove(id: string, actor?: { role: string; employeeId?: string }) {
    await this.getById(id, actor);
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

  async bulkCreate(payload: CreateShiftDto[], actor?: { role: string; employeeId?: string }) {
    const created: Array<unknown> = [];
    const failed: Array<{ index: number; reason: string }> = [];

    for (let index = 0; index < payload.length; index += 1) {
      try {
        const item = payload[index];
        const shift = await this.create(item, actor);
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

  async copyWeek(sourceWeekStart: string, targetWeekStart: string, actor?: { role: string; employeeId?: string }) {
    const scope = await getEmployeeScope(this.prisma, actor);
    const sourceStart = parseWeekStart(sourceWeekStart);
    const sourceEnd = plusDays(sourceStart, 7);

    const targetStart = parseWeekStart(targetWeekStart);

    const sourceShifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: sourceStart, lt: sourceEnd },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department' ? { employee: { department: scope.department } } : {})
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
