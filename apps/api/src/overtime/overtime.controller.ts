import { Controller, Get, Query, UseGuards, Request, Post } from '@nestjs/common';
import { OvertimeService } from './overtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { WeekStartQueryDto } from '../common/dto/week-start-query.dto';
import { OvertimeStrategy } from '@prisma/client';

@Controller('overtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OvertimeController {
  constructor(private readonly overtimeService: OvertimeService) { }

    @Get('weekly')
    @Roles('ADMIN', 'MANAGER')
    async getWeeklyOvertime(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Request() req: any
    ) {
        return this.overtimeService.calculateWeeklyOvertime(query.weekStart!, strategy, req.user);
    }

    @Get('my')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    getMyOvertime(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Request() req: any
    ) {
        return this.overtimeService.calculateWeeklyOvertime(query.weekStart!, strategy, req.user, req.user?.employeeId);
    }

    @Post('recalculate')
    @Roles('ADMIN', 'MANAGER')
    recalculateWeekly(
        @Query() query: WeekStartQueryDto,
        @Query('strategy') strategy: OvertimeStrategy,
        @Request() req: any
    ) {
        return this.overtimeService.recalculateWeeklyOvertime(query.weekStart!, strategy, req.user);
    }
}
