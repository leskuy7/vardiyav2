import { IsOptional, IsString } from 'class-validator';

export class UpdateSelfEmployeeDto {
  @IsOptional()
  @IsString()
  phone?: string;
}
