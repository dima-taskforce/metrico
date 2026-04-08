import { IsEnum, IsOptional, IsNumber, IsString, IsPositive, Min, MaxLength } from 'class-validator';
import { ElementType } from '@prisma/client';

export class UpdateElementDto {
  @IsOptional()
  @IsEnum(ElementType)
  elementType?: ElementType;

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
  @IsPositive()
  depth?: number;

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offsetFromWall?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offsetFromFloor?: number;

  @IsOptional()
  @IsString()
  wallId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cornerLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
