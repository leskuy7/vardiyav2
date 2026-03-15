import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LeaveBalancesService } from './leave-balances.service';
import { AdjustLeaveBalanceDto } from './dto/adjust-leave-balance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Actor } from '../common/employee-scope';

type AuthRequest = Request & { user: Actor & { department?: string } };

@Controller('leave-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeaveBalancesController {
    constructor(private readonly leaveBalancesService: LeaveBalancesService) { }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    findAll(
        @Query('employeeId') employeeId: string,
        @Query('year') year: number,
        @Req() req: AuthRequest
    ) {
        const actor = {
            role: req.user.role,
            sub: req.user.sub,
            employeeId: req.user.employeeId,
            department: req.user.department
        };
        return this.leaveBalancesService.findBalances(employeeId, year, actor);
    }

    @Post('adjust')
    @UseGuards(CsrfGuard)
    @Roles('ADMIN', 'MANAGER')
    adjust(@Body() adjustDto: AdjustLeaveBalanceDto, @Req() req: AuthRequest) {
        return this.leaveBalancesService.adjustBalance(adjustDto, req.user as { sub: string; role: string; employeeId?: string });
    }
}
