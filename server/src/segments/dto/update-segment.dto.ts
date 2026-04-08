import { IsEnum, IsOptional, IsNumber, IsString, IsPositive, IsInt, Min } from 'class-validator';
import { SegmentType } from '@prisma/client';

export class UpdateSegmentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(SegmentType)
  segmentType?: SegmentType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  length?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  depth?: number;

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
