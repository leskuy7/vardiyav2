import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { WeekStartQueryDto } from '../common/dto/week-start-query.dto';
import { currentWeekStartIso } from '../common/time.utils';
import { AuditTrailQueryDto } from './dto/audit-trail-query.dto';
import { SecurityEventsQueryDto } from './dto/security-events-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly-hours')
  weeklyHours(@Query() query: WeekStartQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    const weekStart = query.weekStart ?? currentWeekStartIso();
    return this.reportsService.weeklyHours(weekStart, actor);
  }

  @Get('compliance-violations')
  complianceViolations(@Query() query: WeekStartQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    const weekStart = query.weekStart ?? currentWeekStartIso();
    return this.reportsService.complianceViolations(weekStart, actor);
  }

  @Get('security-events')
  @Roles('ADMIN')
  securityEvents(@Query() query: SecurityEventsQueryDto) {
    return this.reportsService.securityEvents({
      limit: query.limit ?? 50,
      directive: query.directive,
      from: query.from,
      to: query.to
    });
  }

  @Get('audit-trail')
  auditTrail(@Query() query: AuditTrailQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    return this.reportsService.auditTrail(
      {
        limit: query.limit ?? 100,
        action: query.action,
        entityType: query.entityType,
        userId: query.userId,
        from: query.from,
        to: query.to
      },
      actor
    );
  }
}
