import { IsDateString, IsOptional, IsString } from 'class-validator';

export class PrintFormQueryDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
