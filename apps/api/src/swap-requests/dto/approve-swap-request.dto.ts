import { IsOptional, IsUUID } from 'class-validator';

export class ApproveSwapRequestDto {
  @IsOptional()
  @IsUUID()
  targetEmployeeId?: string;
}
