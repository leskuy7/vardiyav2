import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LeaveTypeCode } from '@prisma/client';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Injectable()
export class LeaveTypesService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.leaveType.findMany({
            orderBy: { code: 'asc' }
        });
    }

    async update(code: LeaveTypeCode, dto: UpdateLeaveTypeDto) {
        const leaveType = await this.prisma.leaveType.findUnique({
            where: { code }
        });

        if (!leaveType) {
            throw new NotFoundException({
                code: 'LEAVE_TYPE_NOT_FOUND',
                message: 'Belirtilen izin türü bulunamadı'
            });
        }

        // code cannot be modified, only other fields
        return this.prisma.leaveType.update({
            where: { code },
            data: dto
        });
    }
}
