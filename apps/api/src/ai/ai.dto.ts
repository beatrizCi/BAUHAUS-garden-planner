import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { CalibrationDto, PlacedItemDto } from '../projects/project.dto';

export class SuggestDto {
  @IsString() imageUrl: string;
  @IsOptional() @IsString() @MaxLength(1000) wishes?: string;
  @ValidateNested() @Type(() => CalibrationDto) calibration: CalibrationDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlacedItemDto) items?: PlacedItemDto[];
}

export class RenovateDto {
  @IsString() imageUrl: string;
  @IsOptional() @IsString() @MaxLength(60) style?: string;
  @IsOptional() @IsString() @MaxLength(500) wishes?: string;
}
