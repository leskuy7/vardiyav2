import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { OvertimeStrategy, type Prisma } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays, toIsoDate } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OvertimeService {
  constructor(private readonly prisma: PrismaService) { }

  private buildEmployeeWhere(
    scope: Awaited<ReturnType<typeof getEmployeeScope>>,
    employeeId?: string
  ) {
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      isActive: true
    };

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

    if (employeeId) {
      where.id = employeeId;
    }

    return where;
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

  async calculateWeeklyOvertime(
    weekStart: string,
    strategy: OvertimeStrategy,
    actor?: { role: string; sub?: string; employeeId?: string },
    employeeId?: string
  ) {
    if (!weekStart) {
      throw new BadRequestException({ code: 'WEEK_START_REQUIRED', message: 'weekStart parametresi (YYYY-MM-DD) zorunlu' });
    }

    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    if (scope.type === 'self' && employeeId && employeeId !== scope.employeeId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi mesai verilerinize erişebilirsiniz.' });
    }

    const employees = await this.prisma.employee.findMany({
      where: this.buildEmployeeWhere(scope, employeeId),
      include: {
        user: { select: { name: true, email: true } },
        shifts: {
          where: {
            startTime: { gte: start, lt: end },
            status: { not: 'CANCELLED' },
            isActive: true
          }
        },
        timeEntries: {
          where: {
            checkInAt: { gte: start, lt: end },
            status: 'CLOSED'
          }
        }
      }
    });

    const organizationIds = Array.from(
      new Set(employees.map((employee) => employee.organizationId).filter(Boolean))
    ) as string[];
    const settingsRows = organizationIds.length === 0
      ? []
      : await this.prisma.orgSettings.findMany({
        where: {
          organizationId: { in: organizationIds }
        }
      });
    const settingsByOrganizationId = new Map(settingsRows.map((settings) => [settings.organizationId, settings]));

    const rows = [];

    for (const employee of employees) {
      let totalMinutes = 0;

      if (strategy === 'PLANNED') {
        totalMinutes = employee.shifts.reduce((accumulator, shift) => {
          return accumulator + Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / 60000);
        }, 0);
      } else if (strategy === 'ACTUAL') {
        totalMinutes = employee.timeEntries.reduce((accumulator, entry) => {
          if (!entry.checkOutAt) {
            return accumulator;
          }
          return accumulator + Math.round((entry.checkOutAt.getTime() - entry.checkInAt.getTime()) / 60000);
        }, 0);
      }

      const settings = employee.organizationId ? settingsByOrganizationId.get(employee.organizationId) : undefined;
      const maxWeeklyHours = this.resolveMaxWeeklyHours(employee.maxWeeklyHours, settings?.maxWeeklyHours ?? 45);
      const maxWeeklyMinutes = maxWeeklyHours * 60;
      let regularMinutes = totalMinutes;
      let overtimeMinutes = 0;

      if (totalMinutes > maxWeeklyMinutes) {
        regularMinutes = maxWeeklyMinutes;
        overtimeMinutes = totalMinutes - maxWeeklyMinutes;
      }

      const hourlyRate = employee.hourlyRate ? Number(employee.hourlyRate) : 0;
      const ratePerMinute = hourlyRate / 60;
      const overtimeMultiplier = settings?.overtimeMultiplier ? Number(settings.overtimeMultiplier) : 1.5;
      const currency = settings?.currency ?? 'TRY';
      const estimatedPay = (regularMinutes * ratePerMinute) + (overtimeMinutes * ratePerMinute * overtimeMultiplier);

      rows.push({
        employeeId: employee.id,
        employee: { id: employee.id, user: employee.user },
        weekStart: start,
        strategy,
        totalMinutes,
        regularMinutes,
        overtimeMinutes,
        overtimeMultiplier,
        currency,
        estimatedPay: Number(estimatedPay.toFixed(2))
      });
    }

    return { weekStart: toIsoDate(start), strategy, rows };
  }

  async recalculateWeeklyOvertime(
    weekStart: string,
    strategy: OvertimeStrategy,
    actor?: { role: string; sub?: string; employeeId?: string }
  ) {
    const result = await this.calculateWeeklyOvertime(weekStart, strategy, actor);

    for (const row of result.rows) {
      await this.prisma.overtimeRecord.upsert({
        where: {
          employeeId_weekStart_strategy: {
            employeeId: row.employeeId,
            weekStart: new Date(row.weekStart),
            strategy: row.strategy
          }
        },
        update: {
          plannedMinutes: strategy === 'PLANNED' ? row.totalMinutes : 0,
          actualMinutes: strategy === 'ACTUAL' ? row.totalMinutes : 0,
          regularMinutes: row.regularMinutes,
          overtimeMinutes: row.overtimeMinutes,
          overtimeMultiplier: row.overtimeMultiplier,
          currency: row.currency,
          estimatedPay: row.estimatedPay
        },
        create: {
          employeeId: row.employeeId,
          weekStart: new Date(row.weekStart),
          strategy: row.strategy,
          plannedMinutes: strategy === 'PLANNED' ? row.totalMinutes : 0,
          actualMinutes: strategy === 'ACTUAL' ? row.totalMinutes : 0,
          regularMinutes: row.regularMinutes,
          overtimeMinutes: row.overtimeMinutes,
          overtimeMultiplier: row.overtimeMultiplier,
          currency: row.currency,
          estimatedPay: row.estimatedPay
        }
      });
    }

    return { success: true, count: result.rows.length, rows: result.rows };
  }
}
