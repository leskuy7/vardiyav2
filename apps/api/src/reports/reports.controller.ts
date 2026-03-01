import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { WeekStartQueryDto } from '../common/dto/week-start-query.dto';
import { currentWeekStartIso } from '../common/time.utils';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly-hours')
  weeklyHours(@Query() query: WeekStartQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    const weekStart = query.weekStart ?? currentWeekStartIso();
    return this.reportsService.weeklyHours(weekStart, actor);
  }

  @Get('compliance-violations')
  complianceViolations(@Query() query: WeekStartQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    const weekStart = query.weekStart ?? currentWeekStartIso();
    return this.reportsService.complianceViolations(weekStart, actor);
  }

  @Get('security-events')
  @Roles('ADMIN')
  securityEvents(
    @Query('limit') limit?: string,
    @Query('directive') directive?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const parsedLimit = Number(limit ?? 50);
    return this.reportsService.securityEvents({
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
      directive,
      from,
      to
    });
  }
}
