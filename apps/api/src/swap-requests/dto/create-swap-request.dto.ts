import { IsOptional, IsUUID } from 'class-validator';

export class CreateSwapRequestDto {
    @IsUUID()
    shiftId!: string;

    @IsOptional()
    @IsUUID()
    targetEmployeeId?: string;
}
