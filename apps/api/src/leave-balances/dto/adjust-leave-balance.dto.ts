import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LeaveTypeCode } from '@prisma/client';

export class AdjustLeaveBalanceDto {
    @ApiProperty({ example: 'uuid-string' })
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ example: 'ANNUAL' })
    @IsString()
    @IsNotEmpty()
    leaveCode: LeaveTypeCode;

    @ApiProperty({ example: 2026 })
    @IsInt()
    @Min(2000)
    year: number;

    @ApiProperty({ example: 240, description: 'Eklenecek/Çıkarılacak dakika miktarı. Negatif olabilir.' })
    @IsInt()
    deltaMinutes: number;

    @ApiProperty({ example: 'Manuel düzeltme' })
    @IsString()
    @IsNotEmpty()
    reason: string;
}
