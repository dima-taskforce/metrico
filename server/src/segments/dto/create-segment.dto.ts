import { IsEnum, IsOptional, IsNumber, IsString, IsPositive, IsInt, Min, IsBoolean } from 'class-validator';
import { SegmentType } from '@prisma/client';

export class CreateSegmentDto {
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsEnum(SegmentType)
  segmentType!: SegmentType;

  @IsNumber()
  @IsPositive()
  length!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  offsetFromPrev?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  depth?: number;

  @IsOptional()
  @IsBoolean()
  isInner?: boolean;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  windowOpeningId?: string;

  @IsOptional()
  @IsString()
  doorOpeningId?: string;
}
