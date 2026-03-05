import { Injectable, NotFoundException, UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto';

@Injectable()
export class LeaveBalancesService {
    constructor(private prisma: PrismaService) { }

    async findBalances(employeeId?: string, year?: number, actor?: { role: string; sub?: string; employeeId?: string; department?: string }) {
        const where: any = {};

        const manager = actor?.role === 'MANAGER' && actor.employeeId
            ? await this.prisma.employee.findUnique({ where: { id: actor.employeeId } })
            : null;

        const adminOrg = actor?.role === 'ADMIN' && actor.sub
            ? await this.prisma.organization.findUnique({ where: { adminUserId: actor.sub }, select: { id: true } })
            : null;

        if (year) {
            where.periodYear = Number(year);
        }

        if (employeeId) {
            where.employeeId = employeeId;

            // manager access control
            if (actor && actor.role === 'MANAGER' && manager?.department) {
                const targetEmp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
                if (targetEmp?.department !== manager.department || targetEmp?.organizationId !== manager.organizationId) {
                    throw new ForbiddenException({
                        code: 'FORBIDDEN',
                        message: 'Kendi departmanınız dışındaki çalışanlar için izne erişemezsiniz'
                    });
                }
            }

            if (actor && actor.role === 'ADMIN' && adminOrg && (await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { organizationId: true } }))?.organizationId !== adminOrg.id) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı çalışanların bakiyelerine erişemezsiniz' });
            }
        } else if (actor && actor.role === 'EMPLOYEE' && actor.employeeId) {
            where.employeeId = actor.employeeId;
        } else if (actor && actor.role === 'MANAGER' && manager?.department) {
            // if manager checks list, default to his own department
            where.employee = {
                department: manager.department,
                ...(manager.organizationId ? { organizationId: manager.organizationId } : {})
            };
        } else if (actor && actor.role === 'ADMIN' && adminOrg) {
            where.employee = { organizationId: adminOrg.id };
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

    async adjustBalance(dto: AdjustLeaveBalanceDto, actor: { sub: string; role: string; employeeId?: string }) {
        const target = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
        if (!target) {
            throw new NotFoundException({
                code: 'EMPLOYEE_NOT_FOUND',
                message: 'Çalışan bulunamadı'
            });
        }

        if (actor.role === 'ADMIN') {
            const org = await this.prisma.organization.findUnique({ where: { adminUserId: actor.sub }, select: { id: true } });
            if (!org || target.organizationId !== org.id) {
                throw new ForbiddenException({
                    code: 'FORBIDDEN',
                    message: 'Organizasyon dışı çalışanın bakiyesini düzenleyemezsiniz'
                });
            }
        }

        if (actor.role === 'MANAGER') {
            const manager = actor.employeeId
                ? await this.prisma.employee.findUnique({ where: { id: actor.employeeId } })
                : null;
            if (!manager || manager.department !== target.department || manager.organizationId !== target.organizationId) {
                throw new ForbiddenException({
                    code: 'FORBIDDEN',
                    message: 'Sadece kendi departmanınız ve organizasyonunuz içindeki çalışanların bakiyesini düzenleyebilirsiniz'
                });
            }
        }

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
                userId: actor.sub,
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
