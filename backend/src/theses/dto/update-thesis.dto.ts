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
// place.
//
// Includes `ticker`: a draft can change which company it's about, like
// any other field. This used to be deliberately excluded, but the edit
// form always offered the choice and always sent it, so every save of
// an existing draft failed validation. Nothing about a draft is public
// and its reference price isn't captured until publish, so allowing the
// change costs nothing - publishing still locks everything, company
// included.
export class UpdateThesisDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ticker?: string;

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
