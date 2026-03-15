import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma, ShiftEventAction, ShiftStatus } from '@prisma/client';
import { Actor, getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

const SHIFT_STATUS_VALUES = new Set<ShiftStatus>([
  'PROPOSED',
  'DRAFT',
  'PUBLISHED',
  'ACKNOWLEDGED',
  'DECLINED',
  'SWAPPED',
  'CANCELLED'
]);

const AVAILABILITY_TIMEZONE = 'Europe/Istanbul';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) { }

  private getWeekBounds(reference: Date) {
    const day = reference.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    const weekStart = new Date(reference.getTime() - diff * 24 * 60 * 60 * 1000);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = plusDays(weekStart, 7);
    return { weekStart, weekEnd };
  }

  private calculateLargestGapHours(
    intervals: Array<{ startTime: Date; endTime: Date }>,
    weekStart: Date,
    weekEnd: Date
  ) {
    const allIntervals = intervals
      .map((s) => ({ start: s.startTime.getTime(), end: s.endTime.getTime() }))
      .sort((a, b) => a.start - b.start);

    let maxGapMs = 0;
    let previousEnd = weekStart.getTime();

    for (const interval of allIntervals) {
      const gap = interval.start - previousEnd;
      if (gap > maxGapMs) maxGapMs = gap;
      if (interval.end > previousEnd) previousEnd = interval.end;
    }

    const finalGap = weekEnd.getTime() - previousEnd;
    if (finalGap > maxGapMs) maxGapMs = finalGap;

    return maxGapMs / (1000 * 60 * 60);
  }

  private computeComplianceWarnings(
    maxWeeklyHours: number,
    weekShifts: Array<{ startTime: Date; endTime: Date }>,
    weekStart: Date,
    weekEnd: Date
  ) {
    const warnings: string[] = [];
    const totalWeeklyHours =
      weekShifts.reduce((acc, s) => acc + (s.endTime.getTime() - s.startTime.getTime()), 0) /
      (1000 * 60 * 60);

    if (totalWeeklyHours > maxWeeklyHours) {
      warnings.push(
        `Haftalık yasal çalışma süresi (${maxWeeklyHours} saat) aşıldı! Toplam: ${totalWeeklyHours.toFixed(1)} saat.`
      );
    }

    const maxGapHours = this.calculateLargestGapHours(weekShifts, weekStart, weekEnd);
    if (maxGapHours < 24) {
      warnings.push(
        `Personelin bu hafta 24 saatlik kesintisiz hafta tatili bulunmuyor! (En büyük boşluk: ${Math.floor(maxGapHours)} saat)`
      );
    }

    return warnings;
  }

  private async recordShiftEvent(
    shiftId: string,
    actorUserId: string,
    action: ShiftEventAction,
    previousStatus: ShiftStatus | null,
    newStatus: ShiftStatus | null,
    reason?: string
  ) {
    await this.prisma.shiftEvent.create({
      data: {
        shiftId,
        actorUserId,
        action,
        previousStatus,
        newStatus,
        reason: reason ?? undefined
      }
    });
  }

  private toMinutes(isoDate: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: AVAILABILITY_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(isoDate);
    const hours = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minutes = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return hours * 60 + minutes;
  }

  private toLocalIsoDate(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: AVAILABILITY_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private toLocalDayOfWeek(date: Date) {
    const isoDate = this.toLocalIsoDate(date);
    return new Date(`${isoDate}T12:00:00.000Z`).getUTCDay();
  }

  private inDateRange(target: Date, startDate?: Date | null, endDate?: Date | null) {
    const value = this.toLocalIsoDate(target);
    const start = startDate ? this.toLocalIsoDate(startDate) : undefined;
    const end = endDate ? this.toLocalIsoDate(endDate) : undefined;
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

  private parseStatusFilter(status?: string): Prisma.ShiftWhereInput['status'] {
    if (!status) return undefined;

    const values = status
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter((item): item is ShiftStatus => SHIFT_STATUS_VALUES.has(item as ShiftStatus));

    if (values.length === 0) return undefined;
    if (values.length === 1) return values[0];
    return { in: values };
  }

  private intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
    return startA < endB && endA > startB;
  }

  private async buildAvailabilityWarnings(employeeId: string, startTime: Date, endTime: Date, forceOverride?: boolean) {
    const warnings: string[] = [];

    // Day 1
    const day1 = this.toLocalDayOfWeek(startTime);
    const shiftStart1 = this.toMinutes(startTime);
    const isCrossDay = this.toLocalIsoDate(startTime) !== this.toLocalIsoDate(endTime);
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
        throw new UnprocessableEntityException({ code: 'UNAVAILABLE_CONFLICT', message: `Çalışan ${this.toLocalIsoDate(startTime)} tarihinde müsait değil.` });
      }

      if (block.type === 'UNAVAILABLE' && forceOverride) {
        warnings.push('Başlangıç günündeki müsaitlik kısıtlaması (UNAVAILABLE) geçersiz kılındı.');
      }

      if (block.type === 'PREFER_NOT') {
        warnings.push('Çalışan başlangıç gününde çalışmayı tercih etmiyor.');
      }

      if (block.type === 'AVAILABLE_ONLY') {
        const fullyInside = shiftStart1 >= blockStartMinutes && shiftEnd1 <= blockEndMinutes;
        if (!fullyInside && !forceOverride) {
          throw new UnprocessableEntityException({ code: 'AVAILABLE_ONLY_CONFLICT', message: 'Vardiya, başlangıç gününde çalışanın müsait olduğu saatler dışına taşıyor.' });
        }
        if (!fullyInside && forceOverride) {
          warnings.push('Başlangıç gününde müsait saat kuralı geçersiz kılındı.');
        }
      }
    }

    if (isCrossDay) {
      // Day 2 exists
      const day2 = this.toLocalDayOfWeek(endTime);
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
          throw new UnprocessableEntityException({ code: 'UNAVAILABLE_CONFLICT', message: `Çalışan ${this.toLocalIsoDate(endTime)} tarihinde müsait değil.` });
        }

        if (block.type === 'UNAVAILABLE' && forceOverride) {
          warnings.push('Bitiş günündeki müsaitlik kısıtlaması (UNAVAILABLE) geçersiz kılındı.');
        }

        if (block.type === 'PREFER_NOT') {
          warnings.push('Çalışan bitiş gününde çalışmayı tercih etmiyor.');
        }

        if (block.type === 'AVAILABLE_ONLY') {
          const fullyInside = shiftStart2 >= blockStartMinutes && shiftEnd2 <= blockEndMinutes;
          if (!fullyInside && !forceOverride) {
            throw new UnprocessableEntityException({ code: 'AVAILABLE_ONLY_CONFLICT', message: 'Vardiya, bitiş gününde çalışanın müsait olduğu saatler dışına taşıyor.' });
          }
          if (!fullyInside && forceOverride) {
            warnings.push('Bitiş gününde müsait saat kuralı geçersiz kılındı.');
          }
        }
      }
    }

    return warnings;
  }

  async buildComplianceWarnings(employeeId: string, startTime: Date, endTime: Date, forceOverride?: boolean, excludeShiftId?: string) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) return [];
    const { weekStart, weekEnd } = this.getWeekBounds(startTime);

    // Fetch all shifts in this week
    const weekShifts = await this.prisma.shift.findMany({
      where: {
        employeeId,
        status: { not: 'CANCELLED' },
        startTime: { gte: weekStart, lt: weekEnd },
        ...(excludeShiftId ? { id: { not: excludeShiftId } } : {})
      },
      orderBy: { startTime: 'asc' }
    });

    const warnings = this.computeComplianceWarnings(
      emp.maxWeeklyHours,
      [...weekShifts, { startTime, endTime }],
      weekStart,
      weekEnd
    );

    if (!forceOverride && warnings.length > 0) {
      const first = warnings[0];
      if (first.includes('yasal çalışma süresi')) {
        throw new UnprocessableEntityException({ code: 'COMPLIANCE_MAX_HOURS', message: first });
      }
      throw new UnprocessableEntityException({ code: 'COMPLIANCE_NO_REST', message: first });
    }

    return warnings;
  }

  async buildComplianceWarningsForWeek(
    shifts: Array<{ id: string; employeeId: string; startTime: Date; endTime: Date }>
  ): Promise<Map<string, string[]>> {
    const warningsByShiftId = new Map<string, string[]>();
    if (shifts.length === 0) return warningsByShiftId;

    const employeeIds = Array.from(new Set(shifts.map((s) => s.employeeId)));
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, maxWeeklyHours: true }
    });
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    const shiftsByEmployee = new Map<string, Array<{ id: string; startTime: Date; endTime: Date }>>();
    for (const shift of shifts) {
      const list = shiftsByEmployee.get(shift.employeeId) ?? [];
      list.push({ id: shift.id, startTime: shift.startTime, endTime: shift.endTime });
      shiftsByEmployee.set(shift.employeeId, list);
    }

    for (const [employeeId, employeeShifts] of shiftsByEmployee.entries()) {
      const emp = employeeMap.get(employeeId);
      if (!emp || employeeShifts.length === 0) continue;

      const { weekStart, weekEnd } = this.getWeekBounds(employeeShifts[0].startTime);
      const warnings = this.computeComplianceWarnings(
        emp.maxWeeklyHours,
        employeeShifts.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        weekStart,
        weekEnd
      );

      for (const shift of employeeShifts) {
        warningsByShiftId.set(shift.id, warnings);
      }
    }

    return warningsByShiftId;
  }

  async list(employeeId?: string, start?: string, end?: string, status?: string, actor?: Actor) {
    const scope = await getEmployeeScope(this.prisma, actor);

    if (scope.type === 'self' && employeeId && employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi vardiyalarınıza erişebilirsiniz.' });
    }

    if (scope.type === 'department' && employeeId) {
      const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
      if (emp?.department !== scope.department || (scope.organizationId && emp.organizationId !== scope.organizationId)) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki vardiyalara erişebilirsiniz.' });
      }
    }

    const where: Prisma.ShiftWhereInput = {
      status: this.parseStatusFilter(status),
      startTime: start || end ? { gte: start ? new Date(start) : undefined, lte: end ? new Date(end) : undefined } : undefined
    };

    if (scope.type === 'all_in_org') {
      where.employee = { organizationId: scope.organizationId };
      where.employeeId = employeeId;
    } else if (scope.type === 'self') {
      where.employeeId = scope.employeeId;
    } else if (scope.type === 'department') {
      if (employeeId) {
        where.employeeId = employeeId;
      } else {
        where.employee = {
          department: scope.department,
          ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
        };
      }
    }

    return this.prisma.shift.findMany({
      where,
      orderBy: [{ startTime: 'asc' }]
    });
  }

  async getById(id: string, actor?: Actor) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: undefined
    });

    if (!shift) {
      throw new NotFoundException({ code: 'SHIFT_NOT_FOUND', message: 'Vardiya bulunamadı.' });
    }

    const scope = await getEmployeeScope(this.prisma, actor);
    if (scope.type === 'self' && shift.employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi vardiyalarınıza erişebilirsiniz.' });
    }

    if (scope.type === 'department') {
      const emp = await this.prisma.employee.findUnique({ where: { id: shift.employeeId } });
      if (emp?.department !== scope.department || (scope.organizationId && emp.organizationId !== scope.organizationId)) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki vardiyalara erişebilirsiniz.' });
      }
    }

    if (scope.type === 'all_in_org') {
      const emp = await this.prisma.employee.findUnique({ where: { id: shift.employeeId }, select: { organizationId: true } });
      if (!emp || emp.organizationId !== scope.organizationId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi organizasyonunuzdaki vardiyalara erişebilirsiniz.' });
      }
    }

    return shift;
  }

  async create(dto: CreateShiftDto, actor?: Actor) {
    const scope = await getEmployeeScope(this.prisma, actor);
    if (scope.type === 'self' && dto.employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendinize vardiya atayabilirsiniz.' });
    }
    if (scope.type === 'department') {
      const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (emp?.department !== scope.department || (scope.organizationId && emp.organizationId !== scope.organizationId)) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki çalışanlara vardiya atayabilirsiniz.' });
      }
    }
    if (scope.type === 'all_in_org') {
      const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, select: { organizationId: true } });
      if (!emp || emp.organizationId !== scope.organizationId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi organizasyonunuzdaki çalışanlara vardiya atayabilirsiniz.' });
      }
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Başlangıç zamanı, bitiş zamanından önce olmalıdır.' });
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
      throw new ConflictException({ code: 'SHIFT_OVERLAP', message: 'Bu vardiya, aynı çalışanın mevcut bir vardiyasıyla çakışıyor.' });
    }

    const overlapLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: 'APPROVED',
        startDate: { lte: endTime },
        endDate: { gte: startTime }
      }
    });

    if (overlapLeave) {
      throw new UnprocessableEntityException({ code: 'LEAVE_OVERLAP', message: 'Personel belirtilen tarihlerde onaylı izinde.' });
    }

    const availWarnings = await this.buildAvailabilityWarnings(dto.employeeId, startTime, endTime, dto.forceOverride);
    const compWarnings = await this.buildComplianceWarnings(dto.employeeId, startTime, endTime, dto.forceOverride);
    const warnings = [...availWarnings, ...compWarnings];

    const status = (dto.status as ShiftStatus) || 'PUBLISHED';
    const shift = await this.prisma.shift.create({
      data: {
        employeeId: dto.employeeId,
        startTime,
        endTime,
        note: dto.note,
        status
      }
    });

    const userId = (actor as Actor)?.sub ?? 'SYSTEM';
    await this.recordShiftEvent(shift.id, userId, 'CREATED', null, status);

    return { ...shift, warnings };
  }

  async update(id: string, dto: UpdateShiftDto, actor?: Actor) {
    const existing = await this.getById(id, actor);

    const employeeId = dto.employeeId ?? existing.employeeId;

    if (dto.employeeId && dto.employeeId !== existing.employeeId) {
      const scope = await getEmployeeScope(this.prisma, actor);
      if (scope.type === 'department') {
        const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (emp?.department !== scope.department || (scope.organizationId && emp.organizationId !== scope.organizationId)) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki çalışanlara vardiya atayabilirsiniz.' });
        }
      }
      if (scope.type === 'all_in_org') {
        const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, select: { organizationId: true } });
        if (!emp || emp.organizationId !== scope.organizationId) {
          throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi organizasyonunuzdaki çalışanlara vardiya atayabilirsiniz.' });
        }
      }
    }

    const startTime = new Date(dto.startTime ?? existing.startTime.toISOString());
    const endTime = new Date(dto.endTime ?? existing.endTime.toISOString());

    if (startTime >= endTime) {
      throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'Başlangıç zamanı, bitiş zamanından önce olmalıdır.' });
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
      throw new ConflictException({ code: 'SHIFT_OVERLAP', message: 'Bu vardiya, aynı çalışanın mevcut bir vardiyasıyla çakışıyor.' });
    }

    const overlapLeave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { lte: endTime },
        endDate: { gte: startTime }
      }
    });

    if (overlapLeave) {
      throw new UnprocessableEntityException({ code: 'LEAVE_OVERLAP', message: 'Personel belirtilen tarihlerde onaylı izinde.' });
    }

    const availWarnings = await this.buildAvailabilityWarnings(employeeId, startTime, endTime, dto.forceOverride);
    const compWarnings = await this.buildComplianceWarnings(employeeId, startTime, endTime, dto.forceOverride, id);
    const warnings = [...availWarnings, ...compWarnings];

    const newStatus = (dto.status as ShiftStatus) ?? existing.status;
    const shift = await this.prisma.shift.update({
      where: { id },
      data: {
        employeeId,
        startTime,
        endTime,
        note: dto.note ?? existing.note,
        ...(dto.status ? { status: dto.status as ShiftStatus } : {})
      }
    });

    const userId = (actor as Actor)?.sub ?? 'SYSTEM';
    if (existing.status !== newStatus || dto.startTime || dto.endTime || dto.employeeId) {
      await this.recordShiftEvent(id, userId, 'UPDATED', existing.status, newStatus);
    }

    return { ...shift, warnings };
  }

  async remove(id: string, actor?: Actor) {
    const existing = await this.getById(id, actor);
    await this.prisma.shift.update({ where: { id }, data: { status: 'CANCELLED' } });
    const userId = (actor as Actor)?.sub ?? 'SYSTEM';
    await this.recordShiftEvent(id, userId, 'CANCELLED', existing.status, 'CANCELLED');
    return { message: 'Vardiya iptal edildi.' };
  }

  async acknowledge(id: string, actor: { role: string; employeeId?: string }) {
    const shift = await this.getById(id, actor);
    if (actor.role === 'EMPLOYEE' && actor.employeeId !== shift.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi vardiyalarınızı onaylayabilirsiniz.' });
    }
    if (shift.status !== 'PUBLISHED' && shift.status !== 'PROPOSED') {
      throw new UnprocessableEntityException({ code: 'INVALID_STATUS', message: 'Yalnızca YAYINLANMIŞ veya ÖNERİLMİŞ vardiyalar onaylanabilir.' });
    }
    const updated = await this.prisma.shift.update({ where: { id }, data: { status: 'ACKNOWLEDGED' } });
    const userId = (actor as Actor)?.sub ?? 'SYSTEM';
    await this.recordShiftEvent(id, userId, 'ACKNOWLEDGED', shift.status, 'ACKNOWLEDGED');
    return updated;
  }

  async decline(id: string, reason: string, actor: { role: string; employeeId?: string }) {
    const shift = await this.getById(id, actor);
    if (actor.role === 'EMPLOYEE' && actor.employeeId !== shift.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi vardiyalarınızı reddedebilirsiniz.' });
    }
    if (shift.status !== 'PUBLISHED' && shift.status !== 'PROPOSED') {
      throw new UnprocessableEntityException({ code: 'INVALID_STATUS', message: 'Yalnızca YAYINLANMIŞ veya ÖNERİLMİŞ vardiyalar reddedilebilir.' });
    }

    const updated = await this.prisma.shift.update({
      where: { id },
      data: {
        status: 'DECLINED',
        note: shift.note ? `${shift.note}\n--- Reddetme Nedeni: ${reason}` : `Reddetme Nedeni: ${reason}`
      }
    });
    const userId = (actor as Actor)?.sub ?? 'SYSTEM';
    await this.recordShiftEvent(id, userId, 'DECLINED', shift.status, 'DECLINED', reason);
    return updated;
  }

  async bulkCreate(payload: CreateShiftDto[], actor?: Actor) {
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

  async copyWeek(sourceWeekStart: string, targetWeekStart: string, actor?: Actor) {
    const scope = await getEmployeeScope(this.prisma, actor);
    const sourceStart = parseWeekStart(sourceWeekStart);
    const sourceEnd = plusDays(sourceStart, 7);

    const targetStart = parseWeekStart(targetWeekStart);

    const sourceShifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: sourceStart, lt: sourceEnd },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'all_in_org' ? { employee: { organizationId: scope.organizationId } } : {}),
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department'
          ? {
              employee: {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
              }
            }
          : {})
      }
    });

    const results = await this.prisma.$transaction(async (trx: Prisma.TransactionClient) => {
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
          errors.push({ shiftId: shift.id, reason: 'Hedef haftada çakışan vardiya mevcut.' });
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
