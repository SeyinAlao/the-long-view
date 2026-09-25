import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchSecuritiesDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;
}
