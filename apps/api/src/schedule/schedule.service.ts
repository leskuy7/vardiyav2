import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getEmployeeScope } from '../common/employee-scope';
import { parseWeekStart, plusDays, toIsoDate } from '../common/time.utils';
import { PrismaService } from '../database/prisma.service';
import { ShiftsService } from '../shifts/shifts.service';

type ShiftWithRelations = Prisma.ShiftGetPayload<{
  include: {
    employee: { include: { user: true } };
    swapRequests: true;
  }
}>;

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ShiftsService)) private readonly shiftsService: ShiftsService
  ) { }

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
        },
        swapRequests: {
          where: { status: 'PENDING' }
        }
      },
      orderBy: [{ startTime: 'asc' }]
    });
    const warningsByShiftId = await this.shiftsService.buildComplianceWarningsForWeek(
      shifts.map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        startTime: shift.startTime,
        endTime: shift.endTime
      }))
    );

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lt: endDate },
        endDate: { gte: startDate },
        ...(scope.type === 'self' ? { employeeId: scope.employeeId } : {}),
        ...(scope.type === 'department' ? { employee: { department: scope.department } } : {})
      },
      include: {
        employee: {
          include: { user: true }
        }
      }
    });

    const days = Array.from({ length: 7 }).map((_, index) => {
        const dayDate = plusDays(startDate, index);
        const dayIso = toIsoDate(dayDate);

        const dailyShifts = shifts.filter((shift: any) => toIsoDate(shift.startTime) === dayIso);

        const dailyLeaves = leaves.filter((l: any) => {
          const lStart = toIsoDate(l.startDate);
          const lEnd = toIsoDate(l.endDate);
          return dayIso >= lStart && dayIso <= lEnd;
        });

        const mappedShifts = dailyShifts.map((shift: any) => ({
          id: shift.id,
          employeeId: shift.employeeId,
          employeeName: shift.employee.user.name,
          start: shift.startTime.toISOString(),
          end: shift.endTime.toISOString(),
          status: shift.status,
          note: shift.note,
          swapRequests: shift.swapRequests,
          warnings: warningsByShiftId.get(shift.id) ?? []
        }));

        return {
          date: dayIso,
          shifts: mappedShifts,
          leaves: dailyLeaves.map((l: any) => ({
            id: l.id,
            employeeId: l.employeeId,
            employeeName: l.employee.user.name,
            type: l.type,
            reason: l.reason
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
