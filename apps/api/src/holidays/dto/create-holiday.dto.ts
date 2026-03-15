import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateHolidayDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRecurring?: boolean;
}
