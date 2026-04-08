import { IsString, IsBoolean, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';

export class CreateAngleDto {
  @IsString()
  @MaxLength(10)
  cornerLabel!: string;

  @IsString()
  wallAId!: string;

  @IsString()
  wallBId!: string;

  @IsOptional()
  @IsBoolean()
  isRightAngle?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  angleDegrees?: number;
}
