import { IsString, IsBoolean, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';

export class UpdateAngleDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cornerLabel?: string;

  @IsOptional()
  @IsString()
  wallAId?: string;

  @IsOptional()
  @IsString()
  wallBId?: string;

  @IsOptional()
  @IsBoolean()
  isRightAngle?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  angleDegrees?: number;
}
