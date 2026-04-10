import { IsNumber, IsOptional, IsBoolean, IsPositive, Min } from 'class-validator';

export class CreateWindowDto {
  @IsNumber()
  @IsPositive()
  width!: number;

  @IsNumber()
  @Min(0)
  height!: number;

  @IsNumber()
  @Min(0)
  sillHeightFromScreed!: number;

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
