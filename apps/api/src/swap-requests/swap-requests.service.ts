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

    async approve(id: string, actor: { role: string; employeeId?: string }) {
        const swap = await this.prisma.swapRequest.findUnique({ where: { id }, include: { shift: true } });
        if (!swap || swap.status !== 'PENDING') {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Valid pending swap request not found' });
        }

        // Role checks
        if (actor.role === 'EMPLOYEE') {
            if (swap.targetEmployeeId && swap.targetEmployeeId !== actor.employeeId) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You are not the designated target for this swap' });
            } else if (!swap.targetEmployeeId) {
                // Open to anyone in the department. Validate department match.
                const target = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
                const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
                if (target?.department !== requester?.department) {
                    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You must be in the same department to accept this swap' });
                }
            }
        } else if (actor.role === 'MANAGER') {
            // Manager can approve swaps, but must be in the same department
            const requester = await this.prisma.employee.findUnique({ where: { id: swap.requesterId } });
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (requester?.department !== manager?.department) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only approve swaps in your department' });
            }
        }

        const definitiveTargetId = actor.role === 'EMPLOYEE' ? actor.employeeId! : swap.targetEmployeeId;
        if (!definitiveTargetId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Target employee must be explicitly defined before manager approval' });
        }

        return this.prisma.$transaction(async (trx: any) => {
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
