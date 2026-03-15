import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { Actor } from '../common/employee-scope';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

type AuthRequest = Request & { user: Actor };

@Controller('time-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeEntriesController {
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Get()
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    list(
        @Query('from') from: string | undefined,
        @Query('to') to: string | undefined,
        @Query('employeeId') employeeId: string | undefined,
        @Query('status') status: string | undefined,
        @Query() pagination: PaginationQueryDto,
        @Req() req: AuthRequest
    ) {
        return this.timeEntriesService.list(req.user, { from, to, employeeId, status }, pagination);
    }

    @Patch(':id/void')
    @Roles('ADMIN', 'MANAGER')
    voidEntry(@Param('id') id: string, @Req() req: AuthRequest) {
        return this.timeEntriesService.voidEntry(id, req.user);
    }

    @Get('active')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    getActive(@Req() req: AuthRequest) {
        return this.timeEntriesService.getActiveEntry(req.user.employeeId);
    }

    @Post('check-in')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkIn(@Body() checkInDto: CheckInDto, @Req() req: AuthRequest) {
        return this.timeEntriesService.checkIn(
            checkInDto,
            req.user.role,
            req.user.employeeId
        );
    }

    @Post(':id/check-out')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkOut(
        @Param('id') id: string,
        @Body() checkOutDto: CheckOutDto,
        @Req() req: AuthRequest
    ) {
        return this.timeEntriesService.checkOut(
            id,
            checkOutDto,
            req.user.employeeId,
            req.user.role
        );
    }
}

