import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { ScheduleWeekQueryDto } from '../common/dto/schedule-week-query.dto';
import { currentWeekStartIso } from '../common/time.utils';
import { AutoConfirmScheduleDto } from './dto/auto-confirm-schedule.dto';
import { AutoGenerateScheduleDto } from './dto/auto-generate-schedule.dto';
import { PrintFormQueryDto } from './dto/print-form-query.dto';
import { ScheduleService } from './schedule.service';
import { AutoScheduleService } from './auto-schedule.service';

@Controller('schedule')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly autoScheduleService: AutoScheduleService,
  ) { }

  @Get('week')
  getWeek(@Query() query: ScheduleWeekQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    const start = query.start ?? currentWeekStartIso();
    return this.scheduleService.getWeek(start, actor);
  }

  @Get('print')
  getPrint(@Query() query: ScheduleWeekQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    const start = query.start ?? currentWeekStartIso();
    return this.scheduleService.getPrint(start, actor);
  }

  @Get('print-form')
  getPrintForm(@Query() query: PrintFormQueryDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string };
    const start = query.start ?? currentWeekStartIso();
    return this.scheduleService.getPrintForm(start, query.department, actor);
  }

  @Post('auto-generate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  autoGenerate(@Body() dto: AutoGenerateScheduleDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string; organizationId?: string };
    return this.autoScheduleService.generateWeek(dto.weekStart, actor);
  }

  @Post('auto-confirm')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  autoConfirm(@Body() dto: AutoConfirmScheduleDto, @Req() request: Request) {
    const actor = request.user as { role: string; sub?: string; employeeId?: string; organizationId?: string };
    return this.autoScheduleService.confirmAndCreate(dto.shifts, actor);
  }
}
