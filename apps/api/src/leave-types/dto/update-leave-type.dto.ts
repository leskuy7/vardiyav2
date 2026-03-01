import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateLeaveTypeDto {
    @ApiProperty({ example: 'Yıllık İzin' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: 14 })
    @IsInt()
    @Min(0)
    @Max(60)
    @IsOptional()
    annualEntitlementDays?: number;

    @ApiPropertyOptional({ example: false })
    @IsBoolean()
    @IsOptional()
    requiresDocument?: boolean;
}
