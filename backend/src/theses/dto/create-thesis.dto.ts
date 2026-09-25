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

export class CreateThesisDto {
  @IsString()
  @MaxLength(20)
  ticker!: string;

  // Matches the 80-character minimum already shown in the publish-form
  // UI copy ("0 characters. Minimum 80.") — the backend actually
  // enforces what the frontend has been telling people all along.
  @IsString()
  @MinLength(80)
  @MaxLength(4000)
  statement!: string;

  @IsNumber()
  @IsPositive()
  targetPrice!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  conviction!: number;

  @IsInt()
  @Min(1)
  @Max(1825) // 5 years — a generous ceiling, not an arbitrary one
  horizonDays!: number;

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
