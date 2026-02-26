import { Injectable } from '@nestjs/common';
import { parseWeekStart, plusDays } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async weeklyHours(weekStart: string) {
    const start = parseWeekStart(weekStart);
    const end = plusDays(start, 7);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lt: end },
        status: { in: ['PUBLISHED', 'ACKNOWLEDGED'] }
      },
      include: {
        employee: {
          include: { user: true }
        }
      }
    });

    const summary = new Map<string, { employeeId: string; employeeName: string; hours: number; hourlyRate: number; maxWeeklyHours: number }>();

    for (const shift of shifts) {
      const diffHours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      const current = summary.get(shift.employeeId) ?? {
        employeeId: shift.employeeId,
        employeeName: shift.employee.user.name,
        hours: 0,
        hourlyRate:
          shift.employee.hourlyRate == null
            ? 0
            : typeof shift.employee.hourlyRate === 'number'
              ? shift.employee.hourlyRate
              : shift.employee.hourlyRate.toNumber(),
        maxWeeklyHours: shift.employee.maxWeeklyHours ?? 45
      };
      current.hours += diffHours;
      summary.set(shift.employeeId, current);
    }

    const rows = Array.from(summary.values()).map((item) => {
      const overtimeHours = Math.max(0, item.hours - item.maxWeeklyHours);
      const regularHours = Math.max(0, item.hours - overtimeHours);
      const overtimeRate = item.hourlyRate * 1.5;
      const regularCost = regularHours * item.hourlyRate;
      const overtimeCost = overtimeHours * overtimeRate;
      return {
        ...item,
        regularHours,
        overtimeHours,
        cost: regularCost + overtimeCost
      };
    });

    const totals = rows.reduce(
      (accumulator, row) => {
        accumulator.hours += row.hours;
        accumulator.cost += row.cost;
        accumulator.overtimeHours += row.overtimeHours;
        return accumulator;
      },
      { hours: 0, overtimeHours: 0, cost: 0 }
    );

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      employees: rows,
      totals
    };
  }
}
