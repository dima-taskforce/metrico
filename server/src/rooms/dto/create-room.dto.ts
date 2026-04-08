import { IsString, IsEnum, IsOptional, IsNumber, IsInt, Min, Max, MaxLength } from 'class-validator';
import { RoomType, RoomShape } from '@prisma/client';

export class CreateRoomDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(RoomType)
  type: RoomType;

  @IsEnum(RoomShape)
  shape: RoomShape;

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

  @IsInt()
  @Min(0)
  sortOrder: number;
}
