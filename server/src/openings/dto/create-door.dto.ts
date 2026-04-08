import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreateDoorDto {
  @IsNumber()
  @IsPositive()
  width!: number;

  @IsNumber()
  @Min(0)
  heightFromScreed!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealLeft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  revealRight?: number;
}
