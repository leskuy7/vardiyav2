import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  forceOverride?: boolean;

  @IsOptional()
  @IsString()
  status?: string;
}
