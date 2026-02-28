import { Controller, Delete, Get, Param, Post, Query, UseGuards, Body } from '@nestjs/common';
import { Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CsrfGuard } from '../common/auth/csrf.guard';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  list(
    @Query('employeeId') employeeId?: string,
    @Query('dayOfWeek') dayOfWeek?: string,
    @Req() request?: Request
  ) {
    const actor = request?.user as { role: string; employeeId?: string } | undefined;
    return this.availabilityService.list(employeeId, dayOfWeek ? Number(dayOfWeek) : undefined, actor);
  }

  @Post()
  @UseGuards(CsrfGuard)
  create(@Body() dto: CreateAvailabilityDto, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    return this.availabilityService.create(dto, actor);
  }

  @Delete(':id')
  @UseGuards(CsrfGuard)
  remove(@Param('id') id: string, @Req() request: Request) {
    const actor = request.user as { sub: string; role: string; employeeId?: string };
    return this.availabilityService.remove(id, actor);
  }
}
