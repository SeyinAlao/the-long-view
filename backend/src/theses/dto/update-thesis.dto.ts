import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ThesisMetricDto } from './thesis-metric.dto';

// Written out explicitly rather than derived from CreateThesisDto via a
// generic helper — every field a draft can change, visibly, in one
// place. Deliberately has no `ticker`: which security a thesis is about
// doesn't change after creation. If that's wrong, discard the draft and
// start a new one against the right ticker.
export class UpdateThesisDto {
  @IsOptional()
  @IsString()
  @MinLength(80)
  @MaxLength(4000)
  statement?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  conviction?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1825)
  horizonDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bullCase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  baseCase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bearCase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  catalysts?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  risks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  invalidationCondition?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ThesisMetricDto)
  metrics?: ThesisMetricDto[];
}
