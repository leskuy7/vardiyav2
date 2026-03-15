import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request.dto';

const IST_OFFSET_MINUTES = 180; // Europe/Istanbul offset

function addDaysISO(dateISO: string, days: number) {
    const d = new Date(`${dateISO}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

function istToUtc(dateISO: string, timeHHmm: string) {
    const [h, m] = timeHHmm.split(':').map(Number);
    const midnightUtcMs = new Date(`${dateISO}T00:00:00.000Z`).getTime();
    const localMinutes = h * 60 + m;
    const utcMs = midnightUtcMs + localMinutes * 60_000 - IST_OFFSET_MINUTES * 60_000;
    return new Date(utcMs);
}

function istMidnightUtc(dateISO: string) { return istToUtc(dateISO, '00:00'); }

function minutesBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 60_000); }

@Injectable()
export class LeaveRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    private async getAdminOrganizationId(sub?: string): Promise<string | null> {
        if (!sub) return null;
        const org = await this.prisma.organization.findUnique({ where: { adminUserId: sub }, select: { id: true } });
        return org?.id ?? null;
    }

    async create(dto: CreateLeaveRequestDto, actor: { role: string; employeeId?: string }) {
        if (!actor.employeeId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'User is not linked to an employee profile' });
        }

        const leaveCode = dto.leaveCode ?? dto.type;
        const unit = dto.unit ?? 'DAY';
        const startDateString = dto.startDate.slice(0, 10);
        const endDateString = dto.endDate.slice(0, 10);

        if (!leaveCode || !startDateString || !endDateString) {
            throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'leaveCode, startDate, endDate zorunlu' });
        }

        if (startDateString > endDateString) {
            throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'startDate endDate\'den sonra olamaz' });
        }

        let startAt: Date;
        let endAt: Date;

        if (unit === 'HOUR' || unit === 'HALF_DAY') {
            if (startDateString !== endDateString) {
                throw new BadRequestException({ code: 'INVALID_DATE_RANGE', message: 'Saatlik veya yarım gün izin talepleri tek günü kapsamalıdır' });
            }
            const st = dto.startTime ?? (unit === 'HALF_DAY' ? '09:00' : null);
            const et = dto.endTime ?? (unit === 'HALF_DAY' ? '13:00' : null);
            if (!st || !et) {
                throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startTime/endTime zorunlu' });
            }
            startAt = istToUtc(startDateString, st);
            endAt = istToUtc(startDateString, et);
        } else {
            startAt = istMidnightUtc(startDateString);
            endAt = istMidnightUtc(addDaysISO(endDateString, 1));
        }

        if (startAt >= endAt) {
            throw new BadRequestException({ code: 'INVALID_TIME_RANGE', message: 'startAt < endAt olmalı' });
        }

        const leaveMinutes = minutesBetween(startAt, endAt);
        const year = Number(startDateString.slice(0, 4));

        const leaveType = await this.prisma.leaveType.findUnique({ where: { code: leaveCode } });
        if (!leaveType) {
            throw new NotFoundException({ code: 'LEAVE_TYPE_NOT_FOUND', message: 'İzin türü bulunamadı' });
        }

        if (leaveType.isPaid) {
            const bal = await this.prisma.leaveBalance.findUnique({
                where: { employeeId_leaveCode_periodYear: { employeeId: actor.employeeId, leaveCode, periodYear: year } }
            });
            const remaining = (bal?.accruedMinutes ?? 0) + (bal?.carryMinutes ?? 0) + (bal?.adjustedMinutes ?? 0) - (bal?.usedMinutes ?? 0);
            if (remaining < leaveMinutes) {
                throw new UnprocessableEntityException({ code: 'LEAVE_BALANCE_INSUFFICIENT', message: 'İzin bakiyesi yetersiz', details: { remaining, required: leaveMinutes } });
            }
        }

        // Check for overlap of existing pending/approved leaves
        const overlap = await this.prisma.leaveRequest.findFirst({
            where: {
                employeeId: actor.employeeId,
                status: { in: ['PENDING', 'APPROVED'] },
                startDate: { lt: endAt },
                endDate: { gt: startAt }
            }
        });

        if (overlap) {
            throw new UnprocessableEntityException({ code: 'LEAVE_OVERLAP', message: 'İzin aralığı başka bir onaylı/bekleyen izinle çakışıyor' });
        }

        return this.prisma.leaveRequest.create({
            data: {
                employeeId: actor.employeeId,
                leaveCode,
                unit,
                // store unit inside reason just temporarily as backwards compat for DB schema mismatches if needed?
                // we are keeping type, startDate, endDate but passing in the exact time limits using startAt and endAt. Note that our DB migration dropped startAt unfortunately, or changed it.
                startDate: startAt,
                endDate: endAt,
                startAt,
                endAt,
                reason: dto.reason ?? null,
                status: 'PENDING'
            }
        });
    }

    async findAll(actor: { role: string; employeeId?: string; sub?: string; department?: string }) {
        if (actor.role === 'ADMIN') {
            const organizationId = await this.getAdminOrganizationId(actor.sub);
            if (!organizationId) return [];
            return this.prisma.leaveRequest.findMany({
                where: { employee: { organizationId } },
                include: { employee: { include: { user: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (actor.role === 'MANAGER' && actor.employeeId) {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (!manager) return [];
            return this.prisma.leaveRequest.findMany({
                where: {
                    employee: {
                        department: manager.department,
                        ...(manager.organizationId ? { organizationId: manager.organizationId } : {})
                    }
                },
                include: { employee: { include: { user: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        // Employee sees their own
        if (actor.employeeId) {
            return this.prisma.leaveRequest.findMany({
                where: { employeeId: actor.employeeId },
                include: { employee: { include: { user: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        return [];
    }

    async updateStatus(id: string, dto: UpdateLeaveRequestStatusDto, actor: { role: string; employeeId?: string; sub?: string }) {
        if (actor.role === 'EMPLOYEE') {
            const leave = await this.prisma.leaveRequest.findUnique({ where: { id } });
            if (!leave || leave.employeeId !== actor.employeeId || leave.status !== 'PENDING') {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Çalışanlar sadece kendi bekleyen izinlerini iptal edebilir' });
            }
            if (dto.status !== 'CANCELLED') {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Çalışanlar sadece CANCELLED durumuna çekebilir' });
            }
            return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
        }

        // Logic for MANAGER/ADMIN
        if (dto.status === 'APPROVED') {
            return this.approve(id, dto.managerNote, actor);
        } else if (dto.status === 'REJECTED') {
            return this.prisma.leaveRequest.update({
                where: { id },
                data: { status: 'REJECTED', rejectedByUserId: actor.sub, managerNote: dto.managerNote, rejectedAt: new Date() }
            });
        }

        if (dto.status === 'CANCELLED') {
            const leave = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
            if (!leave) throw new NotFoundException({ code: 'NOT_FOUND', message: 'İzin talebi bulunamadı' });
            if (actor.role === 'ADMIN') {
                const orgId = await this.getAdminOrganizationId(actor.sub);
                if (!orgId || leave.employee.organizationId !== orgId) {
                    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı izin iptal edemezsiniz' });
                }
            } else if (actor.role === 'MANAGER' && actor.employeeId) {
                const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
                if (!manager || manager.department !== leave.employee.department || manager.organizationId !== leave.employee.organizationId) {
                    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Departman dışı izin iptal edemezsiniz' });
                }
            }
            return this.prisma.leaveRequest.update({
                where: { id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), managerNote: dto.managerNote ?? undefined }
            });
        }

        return this.prisma.leaveRequest.update({
            where: { id },
            data: { status: dto.status as any, managerNote: dto.managerNote }
        });
    }

    async approve(id: string, managerNote: string | undefined, actor: { sub?: string; role: string; employeeId?: string }) {
        if (actor.role === 'EMPLOYEE') throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yetkisiz onyalama islemi' });

        const adminOrganizationId = actor.role === 'ADMIN' ? await this.getAdminOrganizationId(actor.sub) : null;

        return this.prisma.$transaction(async (tx) => {
            const leave = await tx.leaveRequest.findUnique({ where: { id }, include: { employee: true, leaveType: true } });
            if (!leave) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Leave request not found' });
            if (leave.status !== 'PENDING') throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Sadece PENDING onaylanabilir' });

            if (actor.role === 'ADMIN') {
                if (!adminOrganizationId || leave.employee.organizationId !== adminOrganizationId) {
                    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı izin yönetemezsiniz' });
                }
            }

            if (actor.role === 'MANAGER' && actor.employeeId) {
                const manager = await tx.employee.findUnique({ where: { id: actor.employeeId } });
                if (!manager || manager.department !== leave.employee.department || manager.organizationId !== leave.employee.organizationId) {
                    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Departman dışı izin yönetemezsiniz' });
                }
            }

            const leaveMinutes = Math.round((leave.endAt.getTime() - leave.startAt.getTime()) / 60_000);
            const year = Number(leave.startDate.toISOString().slice(0, 4));

            if (leave.leaveType.isPaid) {
                const bal = await tx.leaveBalance.findUnique({
                    where: { employeeId_leaveCode_periodYear: { employeeId: leave.employeeId, leaveCode: leave.leaveCode, periodYear: year } }
                });
                const remaining = (bal?.accruedMinutes ?? 0) + (bal?.carryMinutes ?? 0) + (bal?.adjustedMinutes ?? 0) - (bal?.usedMinutes ?? 0);

                if (remaining < leaveMinutes) {
                    throw new UnprocessableEntityException({ code: 'LEAVE_BALANCE_INSUFFICIENT', message: 'İzin bakiyesi yetersiz', details: { remaining, required: leaveMinutes } });
                }

                await tx.leaveBalance.update({
                    where: { employeeId_leaveCode_periodYear: { employeeId: leave.employeeId, leaveCode: leave.leaveCode, periodYear: year } },
                    data: { usedMinutes: { increment: leaveMinutes } }
                });
            }

            const updatedLeave = await tx.leaveRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    managerNote: managerNote ?? null,
                }
            });

            // overlapping shifts cancel
            const shifts = await tx.shift.findMany({
                where: {
                    employeeId: leave.employeeId,
                    isActive: true,
                    startTime: { lt: leave.endAt },
                    endTime: { gt: leave.startAt }
                }
            });

            for (const shift of shifts) {
                await tx.shift.update({
                    where: { id: shift.id },
                    data: {
                        status: 'CANCELLED',
                        isActive: false,
                        cancelledByLeaveRequestId: leave.id,
                        cancelledReason: 'LEAVE_APPROVED'
                    }
                });

                await tx.shiftEvent.create({
                    data: {
                        shiftId: shift.id,
                        actorUserId: actor.sub || 'system',
                        action: 'CANCELLED',
                        previousStatus: shift.status,
                        newStatus: 'CANCELLED',
                        reason: `Leave approved (${leave.leaveCode})`
                    }
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: actor.sub || 'system',
                    action: 'LEAVE_APPROVE',
                    entityType: 'LEAVE_REQUEST',
                    entityId: leave.id,
                    details: { employeeId: leave.employeeId, leaveCode: leave.leaveCode, cancelledShifts: shifts.length } as any
                }
            });

            return { ...updatedLeave, cancelledShifts: shifts.length };
        });
    }

    async remove(id: string, actor: { role: string; employeeId?: string; sub?: string }) {
        const leave = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
        if (!leave) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'İzin talebi bulunamadı' });
        }

        if (actor.role === 'ADMIN') {
            const orgId = await this.getAdminOrganizationId(actor.sub);
            if (!orgId || leave.employee.organizationId !== orgId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi organizasyonunuzdaki izinleri silebilirsiniz' });
            }
        } else if (actor.role === 'MANAGER' && actor.employeeId) {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (!manager || manager.department !== leave.employee.department || manager.organizationId !== leave.employee.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki izinleri silebilirsiniz' });
            }
        } else {
            if (leave.employeeId !== actor.employeeId || leave.status !== 'PENDING') {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Çalışanlar yalnızca kendi bekleyen taleplerini silebilir' });
            }
        }

        return this.prisma.leaveRequest.delete({ where: { id } });
    }
}
