import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { uploadPathFromUrl } from '../config/paths';
import { ProductsService } from '../products/products.service';
import { UploadsService } from '../uploads/uploads.service';
import { RenovateDto, SuggestDto } from './ai.dto';

export interface Suggestion { productId: string; color: string; x: number; z: number; rotationY: number; reason: string }
export interface SuggestResult { analysis: string; style: string; suggestions: Suggestion[] }

/** Google SDK errors carry a JSON string; keep only code and a short message. */
function briefError(e: unknown): string {
  const m = (e as Error).message ?? String(e);
  const code = /"code":\s*(\d+)/.exec(m)?.[1];
  const quota = /quota/i.test(m) ? 'Kontingent erschöpft oder nicht im kostenlosen Tarif' : m.replace(/\s+/g, ' ').slice(0, 80);
  return `${code ?? '?'} ${quota}`;
}

@Injectable()
export class AiService {
  constructor(private readonly products: ProductsService, private readonly uploads: UploadsService) {}

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

  /** Generates a renovated version of the customer's garden photo (same framing) for the before/after slider. */
  async renovate(dto: RenovateDto): Promise<{ url: string; model: string }> {
    if (!process.env.GEMINI_API_KEY) throw new ServiceUnavailableException('GEMINI_API_KEY fehlt: die Garten-Neugestaltung braucht einen Google-AI-Studio-Schlüssel.');
    let photo: Buffer;
    try { photo = await readFile(uploadPathFromUrl(dto.imageUrl)); } catch { throw new BadRequestException('Foto nicht gefunden'); }
    const meta = await sharp(photo).metadata();
    const jpeg = await sharp(photo).resize({ width: 1280, height: 1280, fit: 'inside' }).jpeg({ quality: 88 }).toBuffer();
    const style = dto.style?.trim() || 'modern und gepflegt';
    const prompt = `This is a photo of a customer's garden. Return the SAME photo, with identical camera position, framing, perspective, house, fences, walls and lighting, but renovated as a beautiful ${style} garden: new terrace paving or decking, a healthy lawn, tidy planted borders, a few quality garden furniture pieces and plants in suitable places. Do not move or change buildings or the horizon. Photorealistic, no text, no watermark, no people.${dto.wishes?.trim() ? ` Customer wishes: ${dto.wishes.trim()}` : ''}`;
    const models = (process.env.GEMINI_RENOVATE_MODEL ?? 'gemini-3.1-flash-image,gemini-2.5-flash-image,gemini-3.1-flash-image-preview').split(',').map((m) => m.trim()).filter(Boolean);
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const errors: string[] = [];
    for (const model of models) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }] }],
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        });
        const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
        if (!part?.inlineData?.data) { errors.push(`${model}: kein Bild erhalten`); continue; }
        // match the original size exactly so the slider lines up
        const out = await sharp(Buffer.from(part.inlineData.data, 'base64')).resize(meta.width, meta.height, { fit: 'cover' }).toBuffer();
        const stored = await this.uploads.storeImage(out);
        return { url: stored.url, model };
      } catch (e) { errors.push(`${model}: ${briefError(e)}`); }
    }
    throw new ServiceUnavailableException(`Bild-KI nicht verfügbar (${errors.join(' | ').slice(0, 400)}). Bitte später erneut versuchen.`);
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

  /** Free-tier friendly fallback (Google AI Studio key). Plain REST, no extra dependency. Tries several models because free-tier models are often busy or retired. */
  private async askGemini(system: string, prompt: string, jpeg: Buffer): Promise<string> {
    const models = (process.env.GEMINI_TEXT_MODEL ?? 'gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3.1-flash-lite').split(',').map((m) => m.trim()).filter(Boolean);
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpeg.toString('base64') } }, { text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096 },
    });
    let last = '';
    for (const model of models) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
        body,
      });
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        if (text) return text;
        last = `${model}: leere Antwort`;
        continue;
      }
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      last = `${model}: ${res.status} ${err?.error?.message ?? ''}`.trim();
      if (res.status === 400 || res.status === 401 || res.status === 403) break; // bad request or key: other models will not help
    }
    throw new ServiceUnavailableException(`Gemini nicht verfügbar (${last.slice(0, 160)}). Bitte später erneut versuchen.`);
  }
}
