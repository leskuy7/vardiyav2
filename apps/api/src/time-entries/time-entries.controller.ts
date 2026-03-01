import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { CheckInDto, CheckOutDto } from './dto/time-entries.dto';

@Controller('time-entries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeEntriesController {
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Post('check-in')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkIn(@Body() checkInDto: CheckInDto, @Request() req: any) {
        return this.timeEntriesService.checkIn(
            checkInDto,
            req.user.id,
            req.user.employeeId
        );
    }

    @Post(':id/check-out')
    @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
    checkOut(
        @Param('id') id: string,
        @Body() checkOutDto: CheckOutDto,
        @Request() req: any
    ) {
        return this.timeEntriesService.checkOut(
            id,
            checkOutDto,
            req.user.employeeId,
            req.user.role
        );
    }
}
