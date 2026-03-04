import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Yeni şifre en az 8 karakter olmalıdır.' })
  newPassword!: string;
}
