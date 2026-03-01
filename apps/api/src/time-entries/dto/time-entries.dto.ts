import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeEntrySource } from '@prisma/client';

export class CheckInDto {
    @ApiPropertyOptional({ example: 'uuid' })
    @IsString()
    @IsOptional()
    shiftId?: string;

    @ApiPropertyOptional({ example: 'uuid' })
    @IsString()
    @IsOptional()
    employeeId?: string;

    @ApiProperty({ example: '2026-03-01T06:05:00.000Z' })
    @IsDateString()
    checkInAt: string;

    @ApiPropertyOptional({ enum: TimeEntrySource, example: 'MOBILE' })
    @IsEnum(TimeEntrySource)
    @IsOptional()
    source?: TimeEntrySource;
}

export class CheckOutDto {
    @ApiProperty({ example: '2026-03-01T14:02:00.000Z' })
    @IsDateString()
    checkOutAt: string;
}
