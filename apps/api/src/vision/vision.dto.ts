import { IsArray, IsOptional, IsString } from 'class-validator';

export class SegmentDto {
  @IsString() imageUrl: string;
}

export class InpaintDto {
  @IsString() imageUrl: string;
  /** Mask masks from /vision/segment to remove */
  @IsOptional() @IsArray() @IsString({ each: true }) maskUrls?: string[];
  /** Hand-painted mask from the brush tool (white = remove), any size; scaled to the photo */
  @IsOptional() @IsString() maskDataUrl?: string;
}
