import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('week')
  getWeek(@Query('start') start: string, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    return this.scheduleService.getWeek(start, actor);
  }

  @Get('print')
  getPrint(@Query('start') start: string, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    return this.scheduleService.getPrint(start, actor);
  }
}
