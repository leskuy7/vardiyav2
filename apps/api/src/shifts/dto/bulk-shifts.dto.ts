import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateShiftDto } from './create-shift.dto';

export class BulkShiftsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShiftDto)
  shifts!: CreateShiftDto[];
}
