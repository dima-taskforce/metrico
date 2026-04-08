import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ObjectType, ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsEnum(ObjectType)
  objectType?: ObjectType;

  @IsOptional()
  @IsNumber()
  @Min(1.5)
  @Max(10)
  defaultCeilingHeight?: number;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
