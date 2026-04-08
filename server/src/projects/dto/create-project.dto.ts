import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ObjectType } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsEnum(ObjectType)
  objectType: ObjectType;

  @IsOptional()
  @IsNumber()
  @Min(1.5)
  @Max(10)
  defaultCeilingHeight?: number;
}
