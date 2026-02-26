import { IsDateString } from 'class-validator';

export class CopyWeekDto {
  @IsDateString()
  sourceWeekStart!: string;

  @IsDateString()
  targetWeekStart!: string;
}
