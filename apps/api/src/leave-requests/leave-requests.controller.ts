import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request.dto';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveRequestsController {
    constructor(private readonly leaveRequestsService: LeaveRequestsService) { }

    @Post()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async create(@Body() dto: CreateLeaveRequestDto, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.leaveRequestsService.create(dto, actor);
    }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async findAll(@Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.leaveRequestsService.findAll(actor);
    }

    @Patch(':id/status')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateLeaveRequestStatusDto,
        @Req() req: Request,
    ) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.leaveRequestsService.updateStatus(id, dto, actor);
    }

    @Delete(':id')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async remove(@Param('id') id: string, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.leaveRequestsService.remove(id, actor);
    }
}
