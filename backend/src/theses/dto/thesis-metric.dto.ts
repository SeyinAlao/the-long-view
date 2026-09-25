import { IsString, MaxLength } from 'class-validator';

export class ThesisMetricDto {
  @IsString()
  @MaxLength(60)
  label!: string;

  @IsString()
  @MaxLength(120)
  value!: string;
}
