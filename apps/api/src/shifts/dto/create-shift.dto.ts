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
}
