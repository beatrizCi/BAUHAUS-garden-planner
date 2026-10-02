import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import { InferenceClient } from '@huggingface/inference';
import { uploadDir, uploadPathFromUrl } from '../config/paths';
import { UploadsService } from '../uploads/uploads.service';
import { bbox, compositeUnderMask, Gray, growAndFeather, pushPullFill, readGray } from './image-utils';
import { InpaintDto } from './vision.dto';

/** Labels that are part of the scene structure; we don't offer them for removal. */
const STRUCTURAL = new Set(['sky', 'wall', 'building', 'house', 'floor', 'ground', 'earth', 'road', 'sidewalk', 'grass', 'field', 'ceiling', 'land', 'hill', 'mountain', 'path', 'dirt track', 'sand']);

export interface Segment {
  id: string; label: string; score: number | null; maskUrl: string; removable: boolean;
  bbox: { x: number; y: number; w: number; h: number; area: number };
}

@Injectable()
export class VisionService {
  private readonly log = new Logger(VisionService.name);
  constructor(private readonly uploads: UploadsService) {}

  // ---------------------------------------------------------------- segmentation
  async segment(imageUrl: string): Promise<{ provider: string; segments: Segment[]; message?: string }> {
    const token = process.env.HF_TOKEN;
    if (!token) {
      return { provider: 'none', segments: [], message: 'HF_TOKEN fehlt: automatische Erkennung ist aus. Markieren Sie Objekte mit dem Pinsel.' };
    }
    const file = await this.readUpload(imageUrl);
    const meta = await sharp(file).metadata();
    const model = process.env.HF_SEGMENTATION_MODEL ?? 'nvidia/segformer-b0-finetuned-ade-512-512';
    const client = new InferenceClient(token);
    let output;
    try {
      output = await client.imageSegmentation({
        model,
        inputs: new Blob([new Uint8Array(file)], { type: 'image/jpeg' }),
        ...(process.env.HF_PROVIDER ? { provider: process.env.HF_PROVIDER as never } : {}),
      });
    } catch (e) {
      this.log.warn(`Segmentation failed: ${(e as Error).message}`);
      return { provider: 'huggingface', segments: [], message: 'Die Objekterkennung ist gerade nicht erreichbar. Markieren Sie Objekte mit dem Pinsel.' };
    }
    const W = Math.min(meta.width ?? 1024, 1024), H = Math.round(W * (meta.height ?? 768) / (meta.width ?? 1024));
    const segments: Segment[] = [];
    for (const el of output) {
      const maskBuf = Buffer.from(el.mask, 'base64');
      const gray = await readGray(maskBuf, W, H);
      const box = bbox(gray);
      if (!box || box.area < 0.002) continue;
      const name = `${randomUUID()}.png`;
      await sharp(Buffer.from(gray.data), { raw: { width: W, height: H, channels: 1 } }).png().toFile(join(uploadDir(), name));
      segments.push({
        id: name.replace('.png', ''), label: el.label, score: el.score ?? null, maskUrl: `/uploads/${name}`,
        removable: !STRUCTURAL.has(el.label.toLowerCase()) && box.area < 0.5, bbox: box,
      });
    }
    segments.sort((a, b) => Number(b.removable) - Number(a.removable) || b.bbox.area - a.bbox.area);
    return { provider: `huggingface:${model}`, segments };
  }

  // ---------------------------------------------------------------- inpainting
  async inpaint(dto: InpaintDto): Promise<{ url: string; provider: string; warning?: string }> {
    const original = await this.readUpload(dto.imageUrl);
    const meta = await sharp(original).rotate().metadata();
    const width = meta.width!, height = meta.height!;
    const raw = await this.buildMask(dto, width, height);
    if (!raw.data.some((v) => v > 127)) throw new BadRequestException('Die Maske ist leer. Markieren Sie zuerst ein Objekt.');
    const alpha = await growAndFeather(raw, Math.max(4, width / 160), Math.max(2, width / 300));

    const provider = process.env.INPAINT_PROVIDER ?? (process.env.GEMINI_API_KEY ? 'gemini' : process.env.HF_INPAINT_ENDPOINT ? 'hf-endpoint' : 'local');
    let result: Buffer | null = null, used = provider, warning: string | undefined;
    try {
      if (provider === 'gemini') result = await this.inpaintGemini(original, alpha);
      else if (provider === 'hf-endpoint') result = await this.inpaintHfEndpoint(original, alpha);
    } catch (e) {
      this.log.warn(`${provider} inpainting failed, falling back to local fill: ${(e as Error).message}`);
      warning = 'Das KI-Modell war nicht erreichbar, der Bereich wurde lokal aufgefüllt.';
    }
    if (!result) { used = 'local'; result = await this.inpaintLocal(original, alpha); }
    else result = await compositeUnderMask(original, result, alpha);

    const stored = await this.uploads.storeImage(result);
    return { url: stored.url, provider: used, warning };
  }

  private async buildMask(dto: InpaintDto, width: number, height: number): Promise<Gray> {
    const data = new Uint8Array(width * height);
    const add = (g: Gray) => { for (let i = 0; i < data.length; i++) if (g.data[i] > data[i]) data[i] = g.data[i]; };
    for (const url of dto.maskUrls ?? []) add(await readGray(await this.readUpload(url), width, height));
    if (dto.maskDataUrl) add(await readGray(this.uploads.decodeDataUrl(dto.maskDataUrl), width, height));
    for (let i = 0; i < data.length; i++) data[i] = data[i] > 127 ? 255 : 0;
    return { data, width, height };
  }

  private async inpaintLocal(original: Buffer, alpha: Gray): Promise<Buffer> {
    const { width, height } = alpha;
    const rgb = await sharp(original).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    const filled = pushPullFill(new Uint8Array(rgb), width, height, alpha);
    // smooth the pyramid's block structure, then blend back only under the mask
    const smooth = await sharp(Buffer.from(filled), { raw: { width, height, channels: 3 } }).blur(Math.max(2, width / 220)).jpeg().toBuffer();
    return compositeUnderMask(original, smooth, alpha);
  }

  /** Gemini image editing: original + a copy with the area to remove highlighted in magenta. */
  private async inpaintGemini(original: Buffer, alpha: Gray): Promise<Buffer> {
    const { width, height } = alpha;
    // @google/genai is ESM-only; load it lazily from this CommonJS build.
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const overlay = await sharp({ create: { width, height, channels: 3, background: '#FF00FF' } })
      .joinChannel(Buffer.from(alpha.data.map((v) => Math.round(v * 0.75))), { raw: { width, height, channels: 1 } }).png().toBuffer();
    const highlighted = await sharp(original).resize(width, height, { fit: 'fill' }).composite([{ input: overlay }]).jpeg().toBuffer();
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL ?? 'gemini-2.5-flash-image',
      contents: [{
        role: 'user',
        parts: [
          { text: 'You get two images of the same garden photo. In the second image, the object to remove is highlighted in magenta. Return the FIRST image with that object completely removed, filling the area with a realistic continuation of the surrounding ground, wall or plants. Keep everything else, the framing, perspective and lighting identical. No text, no watermark.' },
          { inlineData: { mimeType: 'image/jpeg', data: original.toString('base64') } },
          { inlineData: { mimeType: 'image/jpeg', data: highlighted.toString('base64') } },
        ],
      }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error('Gemini returned no image');
    return Buffer.from(part.inlineData.data, 'base64');
  }

  /**
   * Custom Hugging Face Inference Endpoint (e.g. LaMa or SDXL-inpainting with a custom handler).
   * Contract: POST JSON { inputs: <base64 image>, parameters: { mask_image: <base64 png>, prompt } }
   * → image bytes, or JSON with a base64 image in "image" / "generated_image".
   */
  private async inpaintHfEndpoint(original: Buffer, alpha: Gray): Promise<Buffer> {
    const { width, height } = alpha;
    const mask = await sharp(Buffer.from(alpha.data), { raw: { width, height, channels: 1 } }).threshold(40).png().toBuffer();
    const res = await fetch(process.env.HF_INPAINT_ENDPOINT!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'image/png', Authorization: `Bearer ${process.env.HF_TOKEN ?? ''}` },
      body: JSON.stringify({
        inputs: original.toString('base64'),
        parameters: { mask_image: mask.toString('base64'), prompt: process.env.HF_INPAINT_PROMPT ?? 'empty garden, natural continuation of the surrounding ground, photorealistic' },
      }),
    });
    if (!res.ok) throw new Error(`HF endpoint ${res.status}`);
    if (res.headers.get('content-type')?.startsWith('image/')) return Buffer.from(await res.arrayBuffer());
    const json = (await res.json()) as Record<string, unknown> | Record<string, unknown>[];
    const obj = Array.isArray(json) ? json[0] : json;
    const b64 = (obj?.image ?? obj?.generated_image) as string | undefined;
    if (!b64) throw new Error('HF endpoint returned no image');
    return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  }

  private async readUpload(url: string) {
    try { return await readFile(uploadPathFromUrl(url)); }
    catch { throw new BadRequestException(`Bild nicht gefunden: ${url}`); }
  }
}

