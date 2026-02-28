import { Injectable } from '@nestjs/common';
import { getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays, toIsoDate } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) { }

  async getWeek(start: string, actor?: { role: string; employeeId?: string }) {
    const startDate = parseWeekStart(start);
    const endDate = plusDays(startDate, 7);
    const scope = await getEmployeeScope(this.prisma, actor);

    const shifts = await this.prisma.shift.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lt: endDate },
        status: { not: 'CANCELLED' },
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department' ? { employee: { department: scope.department } } : {})
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      },
      orderBy: [{ startTime: 'asc' }]
    });

    const days = Array.from({ length: 7 }).map((_, index) => {
      const dayDate = plusDays(startDate, index);
      const dayIso = toIsoDate(dayDate);

      return {
        date: dayIso,
        shifts: shifts
          .filter((shift: (typeof shifts)[number]) => toIsoDate(shift.startTime) === dayIso)
          .map((shift: (typeof shifts)[number]) => ({
            id: shift.id,
            employeeId: shift.employeeId,
            employeeName: shift.employee.user.name,
            start: shift.startTime.toISOString(),
            end: shift.endTime.toISOString(),
            status: shift.status
          }))
      };
    });

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      days
    };
  }

  async getPrint(start: string, actor?: { role: string; employeeId?: string }) {
    const week = await this.getWeek(start, actor);
    return {
      ...week,
      businessName: 'Vardiya',
      generatedAt: new Date().toISOString()
    };
  }
}
