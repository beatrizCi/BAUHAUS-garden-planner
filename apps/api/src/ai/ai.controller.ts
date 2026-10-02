import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { SuggestDto } from './ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post('suggest') suggest(@Body() dto: SuggestDto) { return this.ai.suggest(dto); }
}
