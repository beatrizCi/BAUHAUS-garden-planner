import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { RenovateDto, SuggestDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post('suggest') suggest(@Body() dto: SuggestDto) { return this.ai.suggest(dto); }
  @Post('renovate') renovate(@Body() dto: RenovateDto) { return this.ai.renovate(dto); }
}
