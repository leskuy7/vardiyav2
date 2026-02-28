import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class UpdateLeaveRequestStatusDto {
    @IsEnum(LeaveStatus)
    status: LeaveStatus;

    @IsString()
    @IsOptional()
    managerNote?: string;
}
