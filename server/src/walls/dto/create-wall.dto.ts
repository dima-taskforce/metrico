import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsPositive,
  Min,
  MaxLength,
} from 'class-validator';
import { WallMaterial, WallType } from '@prisma/client';

export class CreateWallDto {
  @IsString()
  @MaxLength(10)
  cornerFrom!: string;

  @IsString()
  @MaxLength(10)
  cornerTo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  label?: string;

  @IsNumber()
  @IsPositive()
  length!: number;

  @IsOptional()
  @IsEnum(WallMaterial)
  material?: WallMaterial;

  @IsOptional()
  @IsEnum(WallType)
  wallType?: WallType;

  @IsOptional()
  @IsNumber()
  curvatureBottom?: number;

  @IsOptional()
  @IsNumber()
  curvatureMiddle?: number;

  @IsOptional()
  @IsNumber()
  curvatureTop?: number;

  @IsInt()
  @Min(0)
  sortOrder!: number;
}
