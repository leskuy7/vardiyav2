import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'E-posta veya kullanıcı adı girin.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Şifre girin.' })
  password!: string;
}
