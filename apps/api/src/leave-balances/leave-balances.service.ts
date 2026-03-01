import { Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto';

@Injectable()
export class LeaveBalancesService {
    constructor(private prisma: PrismaService) { }

    async findBalances(employeeId?: string, year?: number, actor?: { role: string; employeeId?: string; department?: string }) {
        const where: any = {};

        if (year) {
            where.periodYear = Number(year);
        }

        if (employeeId) {
            where.employeeId = employeeId;

            // manager access control
            if (actor && actor.role === 'MANAGER' && actor.department) {
                const targetEmp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (targetEmp?.department !== actor.department) {
                    throw new ForbiddenException({
                        code: 'FORBIDDEN',
                        message: 'Kendi departmanınız dışındaki çalışanlar için izne erişemezsiniz'
                    });
                }
            }
        } else if (actor && actor.role === 'EMPLOYEE' && actor.employeeId) {
            where.employeeId = actor.employeeId;
        } else if (actor && actor.role === 'MANAGER' && actor.department) {
            // if manager checks list, default to his own department
            where.employee = { department: actor.department };
        }

        const balances = await this.prisma.leaveBalance.findMany({
            where,
            include: { employee: true, leaveType: true },
            orderBy: [{ periodYear: 'desc' }, { leaveCode: 'asc' }]
        });

        return balances.map(b => {
            const remaining = b.accruedMinutes + b.carryMinutes + b.adjustedMinutes - b.usedMinutes;
            return {
                ...b,
                remainingMinutes: remaining
            };
        });
    }

    async adjustBalance(dto: AdjustLeaveBalanceDto, actorId: string) {
        const balance = await this.prisma.leaveBalance.findUnique({
            where: {
                employeeId_leaveCode_periodYear: {
                    employeeId: dto.employeeId,
                    leaveCode: dto.leaveCode,
                    periodYear: dto.year
                }
            }
        });

        if (!balance) {
            throw new NotFoundException({
                code: 'LEAVE_BALANCE_NOT_FOUND',
                message: 'İzin bakiyesi bulunamadı'
            });
        }

        const newAdjusted = balance.adjustedMinutes + dto.deltaMinutes;
        const remainingAfter = balance.accruedMinutes + balance.carryMinutes + newAdjusted - balance.usedMinutes;

        if (remainingAfter < 0) {
            throw new UnprocessableEntityException({
                code: 'NEGATIVE_BALANCE',
                message: 'Düzeltme sonrası bakiye negatif olamaz'
            });
        }

        const updated = await this.prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { adjustedMinutes: newAdjusted }
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actorId,
                action: 'LEAVE_BALANCE_ADJUST',
                entityType: 'LEAVE_BALANCE',
                entityId: balance.id,
                details: {
                    deltaMinutes: dto.deltaMinutes,
                    reason: dto.reason,
                    newRemaining: remainingAfter
                }
            }
        });

        return { ...updated, remainingMinutes: remainingAfter };
    }
}
