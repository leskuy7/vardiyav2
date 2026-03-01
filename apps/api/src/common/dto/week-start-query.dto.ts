import { IsDateString, IsOptional } from 'class-validator';

export class WeekStartQueryDto {
  @IsOptional()
  @IsDateString()
  weekStart?: string;
}
