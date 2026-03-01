import { IsDateString, IsOptional } from 'class-validator';

export class ScheduleWeekQueryDto {
  @IsOptional()
  @IsDateString()
  start?: string;
}
