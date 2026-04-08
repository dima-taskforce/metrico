import { IsString, IsEnum, IsOptional, IsNumber, IsInt, IsBoolean, Min, Max, MaxLength } from 'class-validator';
import { RoomType, RoomShape } from '@prisma/client';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @IsOptional()
  @IsEnum(RoomShape)
  shape?: RoomShape;

  @IsOptional()
  @IsNumber()
  @Min(1.5)
  @Max(10)
  ceilingHeight1?: number;

  @IsOptional()
  @IsNumber()
  @Min(1.5)
  @Max(10)
  ceilingHeight2?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isMeasured?: boolean;
}
