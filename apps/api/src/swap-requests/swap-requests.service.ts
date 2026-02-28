import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';

@Injectable()
export class SwapRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateSwapRequestDto, actor: { role: string; employeeId?: string }) {
        if (actor.role === 'EMPLOYEE' && !actor.employeeId) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employee ID is missing for the actor' });
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

        if (dto.targetEmployeeId) {
            const target = await this.prisma.employee.findUnique({ where: { id: dto.targetEmployeeId } });
            if (!target) {
                throw new NotFoundException({ code: 'NOT_FOUND', message: 'Target employee not found' });
            }
            if (target.department !== requester?.department) {
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

    async approve(id: string, actor: { role: string; employeeId?: string }, providedTargetId?: string) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id }, include: { shift: true } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Valid pending swap request not found' });
        }

        if (actor.role === 'MANAGER') {
            const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (requester?.department !== manager?.department) {
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

        const result = await this.prisma.$transaction(async (trx: any) => {
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

    async reject(id: string, actor: { role: string; employeeId?: string }) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Valid pending swap request not found' });
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
