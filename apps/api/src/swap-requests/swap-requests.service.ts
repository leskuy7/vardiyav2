import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@Injectable()
export class SwapRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    private async getAdminOrganizationId(sub?: string) {
        if (!sub) return null;
        const org = await this.prisma.organization.findUnique({
            where: { adminUserId: sub },
            select: { id: true }
        });
        return org?.id ?? null;
    }

    async create(dto: CreateSwapRequestDto, actor: { role: string; employeeId?: string; sub?: string }) {
        if (actor.role === 'EMPLOYEE' && !actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee ID is missing for the actor' });
        }

        const pendingRequest = await this.prisma.swapRequest.findFirst({
            where: { shiftId: dto.shiftId, status: 'PENDING' }
        });
        if (pendingRequest) {
            throw new ConflictException({ code: 'SWAP_ALREADY_PENDING', message: 'Bu vardiya için zaten bekleyen bir takas talebi var' });
        }

        const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
        if (!shift) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Shift not found' });
        }

        if (actor.role === 'EMPLOYEE' && shift.employeeId !== actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only request to swap your own shifts' });
        }

        if (shift.status !== 'PUBLISHED' && shift.status !== 'ACKNOWLEDGED') {
            throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Only PUBLISHED or ACKNOWLEDGED shifts can be swapped' });
        }

        const requester = await this.prisma.employee.findUnique({ where: { id: shift.employeeId } });
        if (!requester) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Requester employee not found' });
        }

        if (actor.role === 'ADMIN') {
            const orgId = await this.getAdminOrganizationId(actor.sub);
            if (!orgId || requester.organizationId !== orgId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı vardiyalar için takas talebi oluşturamazsınız' });
            }
        }

        if (actor.role === 'MANAGER' && actor.employeeId) {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (!manager || requester.department !== manager.department || requester.organizationId !== manager.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Sadece kendi departmanınızdaki vardiyalar için takas talebi oluşturabilirsiniz' });
            }
        }

        if (dto.targetEmployeeId) {
            const target = await this.prisma.employee.findUnique({ where: { id: dto.targetEmployeeId } });
            if (!target) {
                throw new NotFoundException({ code: 'NOT_FOUND', message: 'Target employee not found' });
            }
            if (target.department !== requester.department || target.organizationId !== requester.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Target employee must be in the same department' });
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

    async approve(id: string, actor: { role: string; employeeId?: string; sub?: string }, providedTargetId?: string) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id }, include: { shift: true } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Valid pending swap request not found' });
        }

        const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
        if (!requester) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Requester employee not found' });
        }

        if (actor.role === 'ADMIN') {
            const orgId = await this.getAdminOrganizationId(actor.sub);
            if (!orgId || requester.organizationId !== orgId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı takas taleplerini yönetemezsiniz' });
            }
        }

        if (actor.role === 'MANAGER') {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (requester?.department !== manager?.department || requester?.organizationId !== manager?.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only approve swaps in your department' });
            }
        }

        const definitiveTargetId = swap.targetEmployeeId || providedTargetId;
        if (!definitiveTargetId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Target employee must be explicitly defined before manager approval' });
        }

        // Avoid self-swap
        if (definitiveTargetId === swap.requesterId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Target employee cannot be the requester' });
        }

        const target = await this.prisma.employee.findUnique({ where: { id: definitiveTargetId } });

        if (
            !target ||
            !target.isActive ||
            target.deletedAt ||
            requester.department !== target.department ||
            requester.organizationId !== target.organizationId
        ) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Swap target must be in the same department and organization' });
        }

        const overlappingShift = await this.prisma.shift.findFirst({
            where: {
                employeeId: definitiveTargetId,
                status: { not: 'CANCELLED' },
                isActive: true,
                startTime: { lt: swap.shift.endTime },
                endTime: { gt: swap.shift.startTime }
            }
        });

        if (overlappingShift) {
            throw new ConflictException({ code: 'SWAP_TARGET_SHIFT_OVERLAP', message: 'Hedef çalışanın aynı zaman aralığında vardiyası var' });
        }

        const overlappingLeave = await this.prisma.leaveRequest.findFirst({
            where: {
                employeeId: definitiveTargetId,
                status: 'APPROVED',
                startAt: { lt: swap.shift.endTime },
                endAt: { gt: swap.shift.startTime }
            }
        });

        if (overlappingLeave) {
            throw new UnprocessableEntityException({
                code: 'SWAP_TARGET_LEAVE_OVERLAP',
                message: 'Hedef çalışan belirtilen aralıkta onaylı izinde'
            });
        }

        const result = await this.prisma.$transaction(async (trx: any) => {
            const overlapInTx = await trx.shift.findFirst({
                where: {
                    employeeId: definitiveTargetId,
                    status: { not: 'CANCELLED' },
                    isActive: true,
                    startTime: { lt: swap.shift.endTime },
                    endTime: { gt: swap.shift.startTime }
                }
            });
            if (overlapInTx) {
                throw new ConflictException({ code: 'SWAP_TARGET_SHIFT_OVERLAP', message: 'Hedef çalışanın aynı zaman aralığında vardiyası var' });
            }

            const leaveInTx = await trx.leaveRequest.findFirst({
                where: {
                    employeeId: definitiveTargetId,
                    status: 'APPROVED',
                    startAt: { lt: swap.shift.endTime },
                    endAt: { gt: swap.shift.startTime }
                }
            });
            if (leaveInTx) {
                throw new UnprocessableEntityException({
                    code: 'SWAP_TARGET_LEAVE_OVERLAP',
                    message: 'Hedef çalışan belirtilen aralıkta onaylı izinde'
                });
            }

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

            return { request: updatedSwap, newShift };
        });

        const userId = (actor as { sub?: string })?.sub;
        if (userId) {
            await this.prisma.shiftEvent.create({
                data: {
                    shiftId: swap.shiftId,
                    actorUserId: userId,
                    action: 'SWAPPED',
                    previousStatus: swap.shift.status,
                    newStatus: 'SWAPPED'
                }
            });
        }

        return result;
    }

    async reject(id: string, actor: { role: string; employeeId?: string; sub?: string }) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Valid pending swap request not found' });
        }

        const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
        if (!requester) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Requester employee not found' });
        }

        if (actor.role === 'ADMIN') {
            const orgId = await this.getAdminOrganizationId(actor.sub);
            if (!orgId || requester.organizationId !== orgId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Organizasyon dışı takas taleplerini yönetemezsiniz' });
            }
        }

        if (actor.role === 'MANAGER') {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (!manager || requester.department !== manager.department || requester.organizationId !== manager.organizationId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only reject swaps in your department' });
            }
        }

        if (actor.role === 'EMPLOYEE' && swap.targetEmployeeId && swap.targetEmployeeId !== actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You are not the target for this swap' });
        }

        return this.prisma.swapRequest.update({
            where: { id },
            data: { status: 'REJECTED' }
        });
    }
}
