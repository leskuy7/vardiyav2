import { Injectable } from '@nestjs/common';
import type { AvailabilityBlock, LeaveRequest, Prisma } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import {
  istanbulLocalTimeToUtcDate,
  parseWeekStart,
  plusDays,
  toIsoDate
} from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';
import { HolidaysService } from '../holidays/holidays.service';
import { SettingsService } from '../settings/settings.service';
import { ShiftsService } from '../shifts/shifts.service';

/**
 * Auto-scheduler: Müsaitlik + kural tabanlı otomatik haftalık çizelge önerici.
 * DRAFT statüsünde vardiyalar oluşturur, admin onayladığında PUBLISHED yapılır.
 */
@Injectable()
export class AutoScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftsService: ShiftsService,
    private readonly holidaysService: HolidaysService,
    private readonly settingsService: SettingsService
  ) { }

  private readonly defaultWorkDays = [1, 2, 3, 4, 5];

  private buildScopedWhere(scope: Awaited<ReturnType<typeof getEmployeeScope>>) {
    const where: Prisma.EmployeeWhereInput = { isActive: true, deletedAt: null };

    if (scope.type === 'all_in_org') {
      where.organizationId = scope.organizationId;
    } else if (scope.type === 'department') {
      where.department = scope.department;
      if (scope.organizationId) {
        where.organizationId = scope.organizationId;
      }
    } else if (scope.type === 'self') {
      where.id = scope.employeeId;
      if (scope.organizationId) {
        where.organizationId = scope.organizationId;
      }
    }

    return where;
  }

  private readWorkDays(value: unknown) {
    if (!Array.isArray(value)) {
      return this.defaultWorkDays;
    }

    const normalized = value
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);

    return normalized.length > 0 ? Array.from(new Set(normalized)).sort((a, b) => a - b) : this.defaultWorkDays;
  }

  private resolveMaxWeeklyHours(employeeMaxWeeklyHours: number | null | undefined, organizationMaxWeeklyHours: number) {
    if (employeeMaxWeeklyHours == null) {
      return organizationMaxWeeklyHours;
    }

    if (employeeMaxWeeklyHours === 45 && organizationMaxWeeklyHours !== 45) {
      return organizationMaxWeeklyHours;
    }

    return Math.min(employeeMaxWeeklyHours, organizationMaxWeeklyHours);
  }

  private parseTimeToMinutes(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    const [hours = 0, minutes = 0] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToClock(value: number) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private intervalsOverlap(startA: number, endA: number, startB: number, endB: number) {
    return startA < endB && endA > startB;
  }

  private isWithinDateRange(dayIso: string, startDate?: Date | null, endDate?: Date | null) {
    const start = startDate ? toIsoDate(startDate) : undefined;
    const end = endDate ? toIsoDate(endDate) : undefined;

    if (start && dayIso < start) {
      return false;
    }
    if (end && dayIso > end) {
      return false;
    }

    return true;
  }

  private evaluateAvailability(
    availability: AvailabilityBlock[],
    dayOfWeek: number,
    dayIso: string,
    shiftStartMinutes: number,
    shiftEndMinutes: number
  ) {
    let blocked = false;
    let preferNot = false;
    let hasAvailableOnly = false;
    let availableOnlySatisfied = false;

    for (const block of availability) {
      if (block.dayOfWeek !== dayOfWeek) {
        continue;
      }
      if (!this.isWithinDateRange(dayIso, block.startDate, block.endDate)) {
        continue;
      }

      const blockStartMinutes = this.parseTimeToMinutes(block.startTime) ?? 0;
      const blockEndMinutes = this.parseTimeToMinutes(block.endTime) ?? 24 * 60;
      const overlaps = this.intervalsOverlap(shiftStartMinutes, shiftEndMinutes, blockStartMinutes, blockEndMinutes);

      if (block.type === 'UNAVAILABLE' && overlaps) {
        blocked = true;
      }

      if (block.type === 'PREFER_NOT' && overlaps) {
        preferNot = true;
      }

      if (block.type === 'AVAILABLE_ONLY') {
        hasAvailableOnly = true;
        if (shiftStartMinutes >= blockStartMinutes && shiftEndMinutes <= blockEndMinutes) {
          availableOnlySatisfied = true;
        }
      }
    }

    if (hasAvailableOnly && !availableOnlySatisfied) {
      blocked = true;
    }

    return { blocked, preferNot };
  }

  private overlapsApprovedLeave(leaveRequests: LeaveRequest[], startTime: Date, endTime: Date) {
    return leaveRequests.some((leave) => leave.startAt < endTime && leave.endAt > startTime);
  }

  private weeklyMinutes(shifts: Array<{ startTime: Date; endTime: Date }>) {
    return shifts.reduce((accumulator, shift) => {
      return accumulator + Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / 60000);
    }, 0);
  }

  async generateWeek(
    weekStart: string,
    actor?: { role: string; sub?: string; employeeId?: string; organizationId?: string }
  ) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);
    const organizationId =
      scope.type === 'all_in_org'
        ? scope.organizationId
        : scope.type === 'department' || scope.type === 'self'
          ? scope.organizationId ?? undefined
          : actor?.organizationId;

    const settings = organizationId ? await this.settingsService.getForOrganization(organizationId) : null;
    const organizationMaxWeeklyHours = settings?.maxWeeklyHours ?? 45;
    const workDays = this.readWorkDays(settings?.workDays);
    const minDuration = settings?.shiftMinDuration ?? 60;
    const maxDuration = settings?.shiftMaxDuration ?? 720;
    const proposedDurationMinutes = Math.min(Math.max(8 * 60, minDuration), maxDuration);
    const shiftStartMinutes = Math.max(0, 17 * 60 - proposedDurationMinutes);
    const shiftStartClock = this.minutesToClock(shiftStartMinutes);

    const employees = await this.prisma.employee.findMany({
      where: this.buildScopedWhere(scope),
      include: {
        user: { select: { name: true } },
        availability: true,
        shifts: {
          where: {
            startTime: { gte: start, lt: end },
            status: { not: 'CANCELLED' },
            isActive: true
          }
        },
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startAt: { lt: end },
            endAt: { gt: start }
          }
        }
      }
    });

    const holidays = await this.holidaysService.listForRange(start, end);
    const holidayDates = new Set(holidays.map((holiday) => toIsoDate(holiday.date)));

    const proposedMinutesByEmployee = new Map<string, number>();
    const proposedShifts: Array<{
      employeeId: string;
      employeeName: string;
      date: string;
      startTime: string;
      endTime: string;
      isHoliday: boolean;
    }> = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayDate = plusDays(start, dayIndex);
      const dayIso = toIsoDate(dayDate);
      const dayOfWeek = new Date(`${dayIso}T12:00:00.000Z`).getUTCDay();

      if (!workDays.includes(dayOfWeek) || holidayDates.has(dayIso)) {
        continue;
      }

      const sortedEmployees = [...employees].sort((left, right) => {
        const leftMinutes = this.weeklyMinutes(left.shifts) + (proposedMinutesByEmployee.get(left.id) ?? 0);
        const rightMinutes = this.weeklyMinutes(right.shifts) + (proposedMinutesByEmployee.get(right.id) ?? 0);
        return leftMinutes - rightMinutes;
      });

      for (const employee of sortedEmployees) {
        const shiftStart = istanbulLocalTimeToUtcDate(dayIso, shiftStartClock);
        const shiftEnd = new Date(shiftStart.getTime() + proposedDurationMinutes * 60 * 1000);
        if (toIsoDate(shiftEnd) !== dayIso) {
          continue;
        }
        const existingOverlap = employee.shifts.some((shift) => shift.startTime < shiftEnd && shift.endTime > shiftStart);
        if (existingOverlap) {
          continue;
        }

        const availability = this.evaluateAvailability(
          employee.availability,
          dayOfWeek,
          dayIso,
          shiftStartMinutes,
          shiftStartMinutes + proposedDurationMinutes
        );
        if (availability.blocked || availability.preferNot) {
          continue;
        }

        if (this.overlapsApprovedLeave(employee.leaveRequests, shiftStart, shiftEnd)) {
          continue;
        }

        const maxWeeklyMinutes = this.resolveMaxWeeklyHours(employee.maxWeeklyHours, organizationMaxWeeklyHours) * 60;
        const currentWeeklyMinutes = this.weeklyMinutes(employee.shifts);
        const alreadyProposedMinutes = proposedMinutesByEmployee.get(employee.id) ?? 0;
        if (currentWeeklyMinutes + alreadyProposedMinutes + proposedDurationMinutes > maxWeeklyMinutes) {
          continue;
        }

        proposedShifts.push({
          employeeId: employee.id,
          employeeName: employee.user.name,
          date: dayIso,
          startTime: shiftStart.toISOString(),
          endTime: shiftEnd.toISOString(),
          isHoliday: false
        });
        proposedMinutesByEmployee.set(employee.id, alreadyProposedMinutes + proposedDurationMinutes);
      }
    }

    return {
      weekStart,
      totalProposed: proposedShifts.length,
      holidays: holidays.map((holiday) => ({ name: holiday.name, date: toIsoDate(holiday.date) })),
      shifts: proposedShifts
    };
  }

  async confirmAndCreate(
    shifts: Array<{ employeeId: string; startTime: string; endTime: string }>,
    actor?: { role: string; sub?: string; employeeId?: string; organizationId?: string }
  ) {
    const created = [];
    for (const shift of shifts) {
      created.push(
        await this.shiftsService.create(
          {
            employeeId: shift.employeeId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: 'DRAFT'
          },
          actor
        )
      );
    }
    return { success: true, count: created.length, shifts: created };
  }
}
