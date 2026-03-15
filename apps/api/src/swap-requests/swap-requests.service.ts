import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '@prisma/client';
import { Actor, getEmployeeScope } from '../common/employee-scope';
import { PaginationQueryDto, paginationArgs } from '../common/dto/pagination-query.dto';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@Injectable()
export class SwapRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(actor: Actor, status?: string, pagination?: PaginationQueryDto) {
        const scope = await getEmployeeScope(this.prisma, actor);
        const where: Prisma.SwapRequestWhereInput = {};

        if (status) where.status = status.toUpperCase() as Prisma.EnumSwapRequestStatusFilter;

        if (scope.type === 'self') {
            where.OR = [
                { requesterId: scope.employeeId },
                { targetEmployeeId: scope.employeeId }
            ];
        } else if (scope.type === 'department') {
            where.requester = {
                department: scope.department,
                ...(scope.organizationId ? { organizationId: scope.organizationId } : {})
            };
        } else if (scope.type === 'all_in_org') {
            where.requester = { organizationId: scope.organizationId };
        }

        return this.prisma.swapRequest.findMany({
            where,
            include: {
                shift: true,
                requester: { include: { user: { select: { name: true, email: true } } } },
                targetEmployee: { include: { user: { select: { name: true, email: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            ...paginationArgs(pagination, 100),
        });
    }

    async create(dto: CreateSwapRequestDto, actor: { role: string; employeeId?: string }) {
        if (actor.role === 'EMPLOYEE' && !actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Çalışan kimliği bulunamadı' });
        }

        const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
        if (!shift) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Vardiya bulunamadı' });
        }

        if (actor.role === 'EMPLOYEE' && shift.employeeId !== actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi vardiyalarınız için takas talebi oluşturabilirsiniz' });
        }

        if (shift.status !== 'PUBLISHED' && shift.status !== 'ACKNOWLEDGED') {
            throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Yalnızca yayınlanmış veya onaylanmış vardiyalar takas edilebilir' });
        }

        const requester = await this.prisma.employee.findUnique({ where: { id: shift.employeeId } });
        if (!requester) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Talep eden çalışan bulunamadı' });
        }

        if (dto.targetEmployeeId) {
            const target = await this.prisma.employee.findUnique({ where: { id: dto.targetEmployeeId } });
            if (!target) {
                throw new NotFoundException({ code: 'NOT_FOUND', message: 'Hedef çalışan bulunamadı' });
            }
            if (target.department !== requester.department || target.organizationId !== requester.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Hedef çalışan aynı departmanda olmalıdır' });
            }
        }

        return this.prisma.swapRequest.create({
            data: {
                shiftId: dto.shiftId,
                requesterId: shift.employeeId,
                targetEmployeeId: dto.targetEmployeeId,
                status: 'PENDING'
            }
        });
    }

    async approve(id: string, actor: { role: string; employeeId?: string }, providedTargetId?: string) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id }, include: { shift: true } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Geçerli bekleyen takas talebi bulunamadı' });
        }

        if (actor.role === 'MANAGER') {
            const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (requester?.department !== manager?.department || requester?.organizationId !== manager?.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Yalnızca kendi departmanınızdaki takasları onaylayabilirsiniz' });
            }
        }

        const definitiveTargetId = swap.targetEmployeeId || providedTargetId;
        if (!definitiveTargetId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Yönetici onayı öncesinde hedef çalışan belirtilmelidir' });
        }

        const [requester, target] = await Promise.all([
            this.prisma.employee.findUnique({ where: { id: swap.requesterId } }),
            this.prisma.employee.findUnique({ where: { id: definitiveTargetId } })
        ]);

        if (!requester || !target || requester.department !== target.department || requester.organizationId !== target.organizationId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Takas hedefi aynı departman ve organizasyonda olmalıdır' });
        }

        // Avoid self-swap
        if (definitiveTargetId === swap.requesterId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Hedef çalışan talep eden kişi olamaz' });
        }

        const userId = (actor as { sub?: string })?.sub ?? 'SYSTEM';

        const result = await this.prisma.$transaction(async (trx: Prisma.TransactionClient) => {
            // Update swap status
            const updatedSwap = await trx.swapRequest.update({
                where: { id },
                data: { status: 'APPROVED', targetEmployeeId: definitiveTargetId }
            });

            // Update original shift to SWAPPED
            await trx.shift.update({
                where: { id: swap.shiftId },
                data: { status: 'SWAPPED' }
            });

            // Clone a new published shift for the target employee
            const newShift = await trx.shift.create({
                data: {
                    employeeId: definitiveTargetId,
                    startTime: swap.shift.startTime,
                    endTime: swap.shift.endTime,
                    note: `Swapped from employee ${swap.requesterId}`,
                    status: 'PUBLISHED'
                }
            });

            // Record shift event inside transaction
            await trx.shiftEvent.create({
                data: {
                    shiftId: swap.shiftId,
                    actorUserId: userId,
                    action: 'SWAPPED',
                    previousStatus: swap.shift.status,
                    newStatus: 'SWAPPED'
                }
            });

            // Record audit log inside transaction
            await trx.auditLog.create({
                data: {
                    userId,
                    action: 'SWAP_APPROVE',
                    entityType: 'SWAP_REQUEST',
                    entityId: id,
                    details: {
                        shiftId: swap.shiftId,
                        requesterId: swap.requesterId,
                        targetEmployeeId: definitiveTargetId,
                        newShiftId: newShift.id
                    }
                }
            });

            return { request: updatedSwap, newShift };
        });

        return result;
    }

    async reject(id: string, actor: { role: string; employeeId?: string }) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Geçerli bekleyen takas talebi bulunamadı' });
        }

        if (actor.role === 'EMPLOYEE' && swap.targetEmployeeId && swap.targetEmployeeId !== actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Bu takas için hedef kişi siz değilsiniz' });
        }

        return this.prisma.swapRequest.update({
            where: { id },
            data: { status: 'REJECTED' }
        });
    }
}
