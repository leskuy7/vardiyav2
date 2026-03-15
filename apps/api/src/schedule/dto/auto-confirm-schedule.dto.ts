import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsISO8601, IsUUID, ValidateNested } from 'class-validator';

export class AutoConfirmShiftDto {
  @IsUUID()
  employeeId!: string;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;
}

export class AutoConfirmScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AutoConfirmShiftDto)
  shifts!: AutoConfirmShiftDto[];
}
