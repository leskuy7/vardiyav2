import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request.dto';

@Injectable()
export class LeaveRequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateLeaveRequestDto, actor: { role: string; employeeId?: string }) {
        if (!actor.employeeId) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'User is not linked to an employee profile' });
        }

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (startDate > endDate) {
            throw new BadRequestException({ code: 'BAD_REQUEST', message: 'Start date cannot be after end date' });
        }

        return this.prisma.leaveRequest.create({
            data: {
                employeeId: actor.employeeId,
                type: dto.type,
                startDate,
                endDate,
                reason: dto.reason,
                status: 'PENDING'
            }
        });
    }

    async findAll(actor: { role: string; employeeId?: string }) {
        if (actor.role === 'ADMIN') {
            return this.prisma.leaveRequest.findMany({ include: { employee: { include: { user: true } } }, orderBy: { createdAt: 'desc' } });
        }

        if (actor.role === 'MANAGER' && actor.employeeId) {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            return this.prisma.leaveRequest.findMany({
                where: { employee: { department: manager?.department } },
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

    async updateStatus(id: string, dto: UpdateLeaveRequestStatusDto, actor: { role: string; employeeId?: string }) {
        const leave = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
        if (!leave) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Leave request not found' });
        }

        if (actor.role === 'EMPLOYEE') {
            if (dto.status === 'CANCELLED' && leave.employeeId === actor.employeeId && leave.status === 'PENDING') {
                // Employees can cancel their own pending requests
            } else {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Employees can only cancel their own pending requests' });
            }
        } else if (actor.role === 'MANAGER') {
            const manager = await this.prisma.employee.findUnique({ where: { id: actor.employeeId } });
            if (manager?.department !== leave.employee.department) {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only manage leaves in your department' });
            }
        }

        return this.prisma.leaveRequest.update({
            where: { id },
            data: {
                status: dto.status,
                managerNote: dto.managerNote
            }
        });
    }

    async remove(id: string, actor: { role: string; employeeId?: string }) {
        const leave = await this.prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true } });
        if (!leave) {
            throw new NotFoundException({ code: 'NOT_FOUND', message: 'Leave request not found' });
        }

        if (actor.role !== 'ADMIN') {
            if (leave.employeeId !== actor.employeeId || leave.status !== 'PENDING') {
                throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Only admins can delete non-pending or others leave requests' });
            }
        }

        return this.prisma.leaveRequest.delete({ where: { id } });
    }
}
