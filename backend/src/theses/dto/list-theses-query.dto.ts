import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// GET /theses's query (audit F-15). Validated, so nonsense is a 400:
// before, "?take=abc" reached Prisma as NaN (500) and a negative take
// returned a page counted backwards.
export class ListThesesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticker?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  take?: number;
}
