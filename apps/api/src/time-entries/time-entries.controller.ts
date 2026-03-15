import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

@Controller('time-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeEntriesController {
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Get('active')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    getActive(@Request() req: any) {
        return this.timeEntriesService.getActiveEntry(req.user.employeeId);
    }

    @Post('check-in')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkIn(@Body() checkInDto: CheckInDto, @Request() req: any) {
        const actor = req.user as { role: string; sub?: string; employeeId?: string };
        return this.timeEntriesService.checkIn(checkInDto, actor);
    }

    @Post(':id/check-out')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkOut(
        @Param('id') id: string,
        @Body() checkOutDto: CheckOutDto,
        @Request() req: any
    ) {
        const actor = req.user as { role: string; sub?: string; employeeId?: string };
        return this.timeEntriesService.checkOut(id, checkOutDto, actor);
    }
}

