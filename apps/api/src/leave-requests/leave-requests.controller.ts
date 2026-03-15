import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { UpdateLeaveRequestStatusDto } from './dto/update-leave-request.dto';
import { LeaveRequestsService } from './leave-requests.service';

@Controller('leave-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveRequestsController {
    constructor(private readonly leaveRequestsService: LeaveRequestsService) { }

    @Post()
    @UseGuards(CsrfGuard)
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async create(@Body() dto: CreateLeaveRequestDto, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string };
        return this.leaveRequestsService.create(dto, actor);
    }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async findAll(@Query('status') status: string | undefined, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string; sub?: string; department?: string };
        return this.leaveRequestsService.findAll(actor, status);
    }

    @Patch(':id/status')
    @UseGuards(CsrfGuard)
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateLeaveRequestStatusDto,
        @Req() req: Request,
    ) {
        const actor = req.user as { role: string; employeeId?: string; sub?: string };
        return this.leaveRequestsService.updateStatus(id, dto, actor);
    }

    @Delete(':id')
    @UseGuards(CsrfGuard)
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    async remove(@Param('id') id: string, @Req() req: Request) {
        const actor = req.user as { role: string; employeeId?: string; sub?: string };
        return this.leaveRequestsService.remove(id, actor);
    }
}
