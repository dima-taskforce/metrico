import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateAdjacencyDto {
  @IsString()
  @IsUUID()
  wallAId!: string;

  @IsString()
  @IsUUID()
  wallBId!: string;

  @IsBoolean()
  hasDoorBetween: boolean = false;

  @IsOptional()
  @IsString()
  @IsUUID()
  doorOpeningId?: string;
}
