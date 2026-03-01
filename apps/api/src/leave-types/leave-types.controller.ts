import { Controller, Get, Patch, Body, Param, UseGuards, Put } from '@nestjs/common';
import { LeaveTypesService } from './leave-types.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { LeaveTypeCode } from '@prisma/client';
import { UpdateLeaveTypeDto } from './dto/update-leave-type.dto';

@Controller('leave-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveTypesController {
    constructor(private readonly leaveTypesService: LeaveTypesService) { }

    @Get()
    @Roles('ADMIN', 'MANAGER')
    findAll() {
        return this.leaveTypesService.findAll();
    }

    @Patch(':code')
    @Roles('ADMIN')
    update(
        @Param('code') code: LeaveTypeCode,
        @Body() updateLeaveTypeDto: UpdateLeaveTypeDto
    ) {
        return this.leaveTypesService.update(code, updateLeaveTypeDto);
    }
}
