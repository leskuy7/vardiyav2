import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  employeeId!: string;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  forceOverride?: boolean;

  @IsOptional()
  @IsString()
  status?: any; // any to avoid strict type mismatch before build, will cast in service
}
