import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly-hours')
  weeklyHours(@Query('weekStart') weekStart: string, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    return this.reportsService.weeklyHours(weekStart, actor);
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
