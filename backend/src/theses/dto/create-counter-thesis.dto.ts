import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCounterThesisDto {
  @IsNumber()
  @IsPositive()
  targetPrice!: number;

  @IsInt()
  @Min(1)
  @Max(10)
  conviction!: number;

  @IsInt()
  @Min(1)
  @Max(1825)
  horizonDays!: number;

  @IsString()
  @MinLength(80)
  @MaxLength(4000)
  reasoning!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  risks?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assumptions?: string;
}
