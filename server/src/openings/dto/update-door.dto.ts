import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateDoorDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heightFromScreed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealRight?: number;
}
