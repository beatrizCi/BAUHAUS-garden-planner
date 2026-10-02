import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CalibrationDto {
  @IsNumber() @Min(0) @Max(1) horizon: number;
  @IsNumber() @Min(20) @Max(120) fov: number;
  @IsNumber() @Min(0.2) @Max(20) cameraHeight: number;
}

export class PlacedItemDto {
  @IsString() id: string;
  @IsString() productId: string;
  @IsString() color: string;
  @IsArray() @IsNumber({}, { each: true }) position: [number, number, number];
  @IsNumber() rotationY: number;
  @IsArray() @IsNumber({}, { each: true }) scale: [number, number, number];
}

export class SaveProjectDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() photoUrl?: string | null;
  @IsOptional() @IsString() originalPhotoUrl?: string | null;
  @IsOptional() @IsString() thumbnailUrl?: string | null;
  @ValidateNested() @Type(() => CalibrationDto) calibration: CalibrationDto;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PlacedItemDto) items: PlacedItemDto[];
}
