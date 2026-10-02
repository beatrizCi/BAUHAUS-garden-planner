import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      ok: true,
      features: {
        segmentation: Boolean(process.env.HF_TOKEN),
        inpainting: process.env.GEMINI_API_KEY ? 'gemini' : process.env.HF_INPAINT_ENDPOINT ? 'hf-endpoint' : 'local',
        suggestions: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    };
  }
}
