import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService } from '../common/audit.service';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { BulkShiftsDto } from './dto/bulk-shifts.dto';
import { CopyWeekDto } from './dto/copy-week.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShiftsController {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly auditService: AuditService
  ) { }

  @Get()
  list(
    @Req() request: Request,
    @Query('employeeId') employeeId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('status') status?: string
  ) {
    const actor = request.user as { role: string; employeeId?: string };
    return this.shiftsService.list(employeeId, start, end, status, actor);
  }

  @Get(':id')
  getById(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    return this.shiftsService.getById(id, actor);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async create(@Body() dto: CreateShiftDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.create(dto, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_CREATE',
      entityType: 'SHIFT',
      entityId: result.id,
      details: { employeeId: result.employeeId }
    });
    return result;
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateShiftDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.update(id, dto, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_UPDATE',
      entityType: 'SHIFT',
      entityId: id,
      details: dto
    });
    return result;
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async remove(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.remove(id, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_CANCEL',
      entityType: 'SHIFT',
      entityId: id
    });
    return result;
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async cancel(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.remove(id, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_CANCEL',
      entityType: 'SHIFT',
      entityId: id
    });
    return result;
  }

  @Post(':id/acknowledge')
  @Roles('EMPLOYEE')
  @UseGuards(CsrfGuard)
  async acknowledge(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { role: string; employeeId?: string };
    const result = await this.shiftsService.acknowledge(id, actor);
    const user = request.user as { sub: string };
    await this.auditService.log({
      userId: user.sub,
      action: 'SHIFT_ACKNOWLEDGE',
      entityType: 'SHIFT',
      entityId: id
    });
    return result;
  }

  @Post('copy-week')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async copyWeek(@Body() dto: CopyWeekDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.copyWeek(dto.sourceWeekStart, dto.targetWeekStart, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_COPY_WEEK',
      entityType: 'SHIFT',
      entityId: dto.targetWeekStart,
      details: { sourceWeekStart: dto.sourceWeekStart, created: result.created, skipped: result.skipped }
    });
    return result;
  }

  @Post('bulk')
  @Roles('ADMIN', 'MANAGER')
  @UseGuards(CsrfGuard)
  async bulk(@Body() dto: BulkShiftsDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    const result = await this.shiftsService.bulkCreate(dto.shifts, actor);
    await this.auditService.log({
      userId: actor.sub,
      action: 'SHIFT_BULK_CREATE',
      entityType: 'SHIFT',
      entityId: 'bulk',
      details: { created: result.created, errors: result.errors }
    });
    return result;
  }
}
