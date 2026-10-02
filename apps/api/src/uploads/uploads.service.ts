import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import { uploadDir } from '../config/paths';

export interface StoredImage { url: string; width: number; height: number }

@Injectable()
export class UploadsService {
  /** Normalises any uploaded image: EXIF rotation applied, max 2400 px, JPEG. */
  async storeImage(buf: Buffer, opts: { maxSize?: number; format?: 'jpeg' | 'png' } = {}): Promise<StoredImage> {
    const format = opts.format ?? 'jpeg';
    try {
      const pipeline = sharp(buf).rotate().resize({ width: opts.maxSize ?? 2400, height: opts.maxSize ?? 2400, fit: 'inside', withoutEnlargement: true });
      const out = format === 'png' ? pipeline.png() : pipeline.jpeg({ quality: 88 });
      const name = `${randomUUID()}.${format === 'png' ? 'png' : 'jpg'}`;
      const info = await out.toFile(join(uploadDir(), name));
      return { url: `/uploads/${name}`, width: info.width, height: info.height };
    } catch {
      throw new BadRequestException('Das Bild konnte nicht gelesen werden. Bitte JPG, PNG oder HEIC/WebP verwenden.');
    }
  }

  /** Accepts "data:image/png;base64,..." strings sent from canvases. */
  decodeDataUrl(dataUrl: string): Buffer {
    const m = /^data:image\/[\w+.-]+;base64,(.+)$/.exec(dataUrl);
    if (!m) throw new BadRequestException('Expected a base64 image data URL');
    return Buffer.from(m[1], 'base64');
  }
}
