import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeaveTypeCode, LeaveUnit } from '@prisma/client';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
    /** İzin türü (zorunlu). type alanı geriye dönük uyumluluk için opsiyonel. */
    @IsEnum(LeaveTypeCode)
    @IsNotEmpty({ message: 'İzin türü (leaveCode) zorunludur' })
    leaveCode!: LeaveTypeCode;

    @IsEnum(LeaveTypeCode)
    @IsOptional()
    type?: LeaveTypeCode;

    @IsEnum(LeaveUnit)
    @IsOptional()
    unit?: LeaveUnit;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @ApiPropertyOptional({ example: '09:00' })
    @IsString()
    @IsOptional()
    startTime?: string;

    @ApiPropertyOptional({ example: '13:00' })
    @IsString()
    @IsOptional()
    endTime?: string;

    @IsString()
    @IsOptional()
    reason?: string;
}
