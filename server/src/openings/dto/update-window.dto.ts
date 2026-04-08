import { IsNumber, IsOptional, IsBoolean, IsPositive, Min } from 'class-validator';

export class UpdateWindowDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sillHeightFromScreed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealWidthLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealWidthRight?: number;

  @IsOptional()
  @IsBoolean()
  isFrenchDoor?: boolean;
}
