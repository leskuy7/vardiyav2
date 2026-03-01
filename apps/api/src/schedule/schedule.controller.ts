import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleWeekQueryDto } from '../common/dto/schedule-week-query.dto';
import { currentWeekStartIso } from '../common/time.utils';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('week')
  getWeek(@Query() query: ScheduleWeekQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    const start = query.start ?? currentWeekStartIso();
    return this.scheduleService.getWeek(start, actor);
  }

  @Get('print')
  getPrint(@Query() query: ScheduleWeekQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    const start = query.start ?? currentWeekStartIso();
    return this.scheduleService.getPrint(start, actor);
  }
}
