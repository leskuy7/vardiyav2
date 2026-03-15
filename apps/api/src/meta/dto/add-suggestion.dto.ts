import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class AddSuggestionDto {
  @IsIn(['DEPARTMENT', 'POSITION'])
  kind!: 'DEPARTMENT' | 'POSITION';

  @IsString()
  @MinLength(1, { message: 'Değer boş olamaz.' })
  @MaxLength(200, { message: 'Değer en fazla 200 karakter olabilir.' })
  value!: string;
}
