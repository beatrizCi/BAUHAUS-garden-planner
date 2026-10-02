import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { uploadPathFromUrl } from '../config/paths';
import { ProductsService } from '../products/products.service';
import { SuggestDto } from './ai.dto';

export interface Suggestion { productId: string; color: string; x: number; z: number; rotationY: number; reason: string }
export interface SuggestResult { analysis: string; style: string; suggestions: Suggestion[] }

@Injectable()
export class AiService {
  constructor(private readonly products: ProductsService) {}

  async suggest(dto: SuggestDto): Promise<SuggestResult> {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) throw new ServiceUnavailableException('Weder ANTHROPIC_API_KEY noch GEMINI_API_KEY gesetzt: KI-Vorschläge sind deaktiviert.');
    let photo: Buffer;
    try { photo = await readFile(uploadPathFromUrl(dto.imageUrl)); } catch { throw new BadRequestException('Foto nicht gefunden'); }
    const jpeg = await sharp(photo).resize({ width: 1280, height: 1280, fit: 'inside' }).jpeg({ quality: 85 }).toBuffer();
    const catalog = await this.products.findAll({});
    const lines = catalog.map((p) => `${p.id} | ${p.name} | ${p.category} | colors: ${p.colors.map((c) => c.name).join('/')} | ${p.kind} | ${p.dimensions.w}×${p.dimensions.d} m | ${p.price} €${p.unit ? '/' + p.unit : ''}`).join('\n');
    const placed = (dto.items ?? []).map((i) => `${i.productId} (${i.color}) at x=${i.position[0].toFixed(1)} z=${(-i.position[2]).toFixed(1)}`).join('\n') || 'nothing yet';
    const { horizon, fov, cameraHeight } = dto.calibration;

    const prompt = `You are a garden planner at BAUHAUS. The image is a customer's garden photo.
Coordinates: ground plane in meters, seen from the camera. x = meters to the right (+) or left (−) of the image centre line, z = meters straight ahead of the camera (always > 1). Camera height ${cameraHeight} m, vertical FOV ${fov}°, horizon at ${Math.round(horizon * 100)}% from the top of the image. Use these to estimate distances from where objects touch the ground.

CATALOG (only use these ids and color names):
${lines}

ALREADY PLACED:
${placed}

CUSTOMER WISHES: ${dto.wishes?.trim() || 'none'}

Reply with JSON only:
{"analysis":"2-3 sentences in German: size, ground, light, style, what is missing","style":"short style name in German","suggestions":[{"productId":"p01","color":"Anthrazit","x":-1.2,"z":5.5,"rotationY":0,"reason":"one short German sentence"}]}
Rules: 3 to 6 suggestions. Only on walkable ground visible in the photo, never inside walls, hedges or the house. Respect real sizes (see catalog) so items don't overlap. Surfaces (kind=surface) are placed with their centre at x/z. rotationY in degrees.`;

    const system = 'Reply with a single JSON object only. No prose, no Markdown fences.';
    const text = process.env.ANTHROPIC_API_KEY ? await this.askClaude(system, prompt, jpeg) : await this.askGemini(system, prompt, jpeg);
    const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
    let parsed: SuggestResult;
    try { parsed = JSON.parse(json); } catch { throw new ServiceUnavailableException('Die KI-Antwort war unvollständig. Bitte erneut versuchen.'); }
    const ids = new Set(catalog.map((p) => p.id));
    parsed.suggestions = (parsed.suggestions ?? []).filter((s) => ids.has(s.productId));
    return parsed;
  }

  private async askClaude(system: string, prompt: string, jpeg: Buffer): Promise<string> {
    const res = await new Anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5',
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } },
        { type: 'text', text: prompt },
      ] }],
    });
    return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  }

  /** Free-tier friendly fallback (Google AI Studio key). Plain REST, no extra dependency. */
  private async askGemini(system: string, prompt: string, jpeg: Buffer): Promise<string> {
    const model = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
      }),
    });
    if (res.status === 429) throw new ServiceUnavailableException('Gemini-Limit erreicht (kostenloses Kontingent). Bitte in einer Minute erneut versuchen.');
    if (!res.ok) throw new ServiceUnavailableException(`Gemini-Fehler ${res.status}. Ist GEMINI_API_KEY gültig?`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  }
}
