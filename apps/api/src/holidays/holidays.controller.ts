import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/auth/roles.decorator';
import { RolesGuard } from '../common/auth/roles.guard';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { ListHolidaysQueryDto } from './dto/list-holidays-query.dto';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
    constructor(private readonly holidaysService: HolidaysService) { }

    @Get()
  async list(@Query() query: ListHolidaysQueryDto) {
    return this.holidaysService.list(query.year);
    }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
  async create(@Body() dto: CreateHolidayDto) {
        return this.holidaysService.create(dto.name, dto.date, dto.isRecurring);
    }

    @Delete(':id')
    @UseGuards(RolesGuard)
    @Roles('ADMIN')
    async remove(@Param('id') id: string) {
        return this.holidaysService.remove(id);
    }
}
