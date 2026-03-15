import { IsDateString } from 'class-validator';

export class AutoGenerateScheduleDto {
  @IsDateString()
  weekStart!: string;
}
