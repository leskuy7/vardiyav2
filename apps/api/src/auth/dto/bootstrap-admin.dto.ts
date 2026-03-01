import { IsOptional, IsString, MinLength } from 'class-validator';

export class BootstrapAdminDto {
  @IsString()
  @MinLength(1)
  businessTypeCode!: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  adminName?: string;
}
