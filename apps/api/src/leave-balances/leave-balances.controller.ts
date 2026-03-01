import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { LeaveBalancesService } from './leave-balances.service';
import { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';

@Controller('leave-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveBalancesController {
    constructor(private readonly leaveBalancesService: LeaveBalancesService) { }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    findAll(
        @Query('employeeId') employeeId: string,
        @Query('year') year: number,
        @Request() req: any
    ) {
        const actor = {
            role: req.user.role,
            employeeId: req.user.employeeId,
            department: req.user.department
        };
        return this.leaveBalancesService.findBalances(employeeId, year, actor);
    }

    @Post('adjust')
    @Roles('ADMIN', 'MANAGER')
    adjust(@Body() adjustDto: AdjustLeaveBalanceDto, @Request() req: any) {
        return this.leaveBalancesService.adjustBalance(adjustDto, req.user.userId);
    }
}
