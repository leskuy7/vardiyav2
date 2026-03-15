import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '@prisma/client';
import { OvertimeStrategy } from '@prisma/client';
import { Actor, getEmployeeScope } from '../common/employee-scope';

@Injectable()
export class OvertimeService {
    constructor(private readonly prisma: PrismaService) { }

    async calculateWeeklyOvertime(weekStart: string, strategy: OvertimeStrategy, actor?: Actor, employeeId?: string) {
        if (!weekStart) throw new BadRequestException({ code: 'WEEK_START_REQUIRED', message: 'weekStart parametresi (YYYY-MM-DD) zorunlu' });

        // Parse week start (Monday)
        const start = new Date(`${weekStart}T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 7);

        const scope = await getEmployeeScope(this.prisma, actor);
        const whereEmp: Prisma.EmployeeWhereInput = {};
        if (employeeId) whereEmp.id = employeeId;
        if (scope.type === 'all_in_org') whereEmp.organizationId = scope.organizationId;
        if (scope.type === 'department') {
            whereEmp.department = scope.department;
            if (scope.organizationId) whereEmp.organizationId = scope.organizationId;
        }
        if (scope.type === 'self') whereEmp.id = scope.employeeId;

        const employees = await this.prisma.employee.findMany({
            where: whereEmp,
            include: {
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

        const rows = [];

        for (const emp of employees) {
            let totalMinutes = 0;

            if (strategy === 'PLANNED') {
                totalMinutes = emp.shifts.reduce((acc, shift) => {
                    return acc + Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / 60000);
                }, 0);
            } else if (strategy === 'ACTUAL') {
                totalMinutes = emp.timeEntries.reduce((acc, entry) => {
                    if (!entry.checkOutAt) return acc;
                    return acc + Math.round((entry.checkOutAt.getTime() - entry.checkInAt.getTime()) / 60000);
                }, 0);
            }

            const maxWeeklyMinutes = emp.maxWeeklyHours * 60;
            let regularMinutes = totalMinutes;
            let overtimeMinutes = 0;

            if (totalMinutes > maxWeeklyMinutes) {
                regularMinutes = maxWeeklyMinutes;
                overtimeMinutes = totalMinutes - maxWeeklyMinutes;
            }

            const hourlyRate = emp.hourlyRate ? Number(emp.hourlyRate) : 0;
            const ratePerMinute = hourlyRate / 60;
            const otMultiplier = 1.5;

            const estimatedPay = (regularMinutes * ratePerMinute) + (overtimeMinutes * ratePerMinute * otMultiplier);

            rows.push({
                employeeId: emp.id,
                weekStart: start,
                strategy,
                totalMinutes,
                regularMinutes,
                overtimeMinutes,
                overtimeMultiplier: otMultiplier,
                estimatedPay: Number(estimatedPay.toFixed(2))
            });
        }

        return { weekStart: start.toISOString().split('T')[0], strategy, rows };
    }

    async recalculateWeeklyOvertime(weekStart: string, strategy: OvertimeStrategy, actor?: Actor) {
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
                    estimatedPay: row.estimatedPay
                }
            });
        }

        return { success: true, count: result.rows.length, rows: result.rows };
    }
}
