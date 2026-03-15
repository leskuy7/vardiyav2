import { Controller, Get, Query, UseGuards, Req, Post } from '@nestjs/common';
import type { Request } from 'express';
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Actor } from '../common/employee-scope';
import { WeekStartQueryDto } from '../common/dto/week-start-query.dto';
import { OvertimeStrategy } from '@prisma/client';

type AuthRequest = Request & { user: Actor };

@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
    constructor(
        private readonly overtimeService: OvertimeService,
    ) { }

    @Get('weekly')
    @Roles('ADMIN', 'MANAGER')
    async getWeeklyOvertime(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Req() req: AuthRequest
    ) {
        return this.overtimeService.calculateWeeklyOvertime(query.weekStart!, strategy, req.user);
    }

    @Get('my')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    getMyOvertime(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Req() req: AuthRequest
    ) {
        return this.overtimeService.calculateWeeklyOvertime(query.weekStart!, strategy, req.user, req.user?.employeeId);
    }

    @Post('recalculate')
    @UseGuards(CsrfGuard)
    @Roles('ADMIN', 'MANAGER')
    recalculateWeekly(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Req() req: AuthRequest
    ) {
        return this.overtimeService.recalculateWeeklyOvertime(query.weekStart!, strategy, req.user);
    }
}
