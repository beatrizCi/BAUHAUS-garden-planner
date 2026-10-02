import { Body, Controller, Post } from '@nestjs/common';
import { VisionService } from './vision.service';
import { InpaintDto, SegmentDto } from './vision.dto';

@Controller('vision')
export class VisionController {
  constructor(private readonly vision: VisionService) {}

  /** Detect objects in a garden photo → masks + bounding boxes */
  @Post('segment') segment(@Body() dto: SegmentDto) { return this.vision.segment(dto.imageUrl); }

  /** Remove the masked objects → URL of the new photo */
  @Post('inpaint') inpaint(@Body() dto: InpaintDto) { return this.vision.inpaint(dto); }
}
