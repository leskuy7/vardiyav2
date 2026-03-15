import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  take?: number;
}

export function paginationArgs(dto?: PaginationQueryDto, defaultTake = 100) {
  return {
    skip: dto?.skip ?? 0,
    take: dto?.take ?? defaultTake,
  };
}
