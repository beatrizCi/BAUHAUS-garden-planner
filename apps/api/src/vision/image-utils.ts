import sharp from 'sharp';

export interface Gray { data: Uint8Array; width: number; height: number }

export async function readGray(input: Buffer | string, width: number, height: number): Promise<Gray> {
  const { data } = await sharp(input).resize(width, height, { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width, height };
}

export function bbox(mask: Gray, threshold = 128) {
  let minX = mask.width, minY = mask.height, maxX = -1, maxY = -1, count = 0;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++)
      if (mask.data[y * mask.width + x] >= threshold) {
        count++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  if (count === 0) return null;
  return {
    x: minX / mask.width, y: minY / mask.height,
    w: (maxX - minX + 1) / mask.width, h: (maxY - minY + 1) / mask.height,
    area: count / (mask.width * mask.height),
  };
}

/** Grow + feather a binary mask so removals cover object edges and shadows. Returns 0..255 alpha. */
export async function growAndFeather(mask: Gray, grow = 10, feather = 6): Promise<Gray> {
  const { width, height } = mask;
  const raw = { raw: { width, height, channels: 1 as const } };
  // sharp runs operations in a fixed order, so dilate and feather are separate passes.
  const blurred = await sharp(Buffer.from(mask.data), raw).blur(Math.max(0.3, grow)).extractChannel(0).raw().toBuffer();
  const dilated = Buffer.alloc(width * height);
  for (let i = 0; i < dilated.length; i++) dilated[i] = blurred[i] >= 12 ? 255 : 0;
  const soft = await sharp(dilated, raw).blur(Math.max(0.3, feather)).extractChannel(0).raw().toBuffer();
  // keep the full core opaque, feather only outward
  for (let i = 0; i < soft.length; i++) if (mask.data[i] > 127) soft[i] = 255;
  return { data: new Uint8Array(soft), width, height };
}

/**
 * Push-pull hole filling: averages the known pixels of an image pyramid and fills masked pixels
 * from coarser levels. No ML, but gives a smooth, colour-correct fill for lawns, soil and walls.
 */
export function pushPullFill(rgb: Uint8Array, width: number, height: number, alpha: Gray): Uint8Array {
  type Level = { w: number; h: number; c: Float32Array; a: Float32Array };
  const levels: Level[] = [];
  const c0 = new Float32Array(width * height * 3), a0 = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const known = alpha.data[i] < 8 ? 1 : 0;
    a0[i] = known;
    c0[i * 3] = rgb[i * 3] * known; c0[i * 3 + 1] = rgb[i * 3 + 1] * known; c0[i * 3 + 2] = rgb[i * 3 + 2] * known;
  }
  levels.push({ w: width, h: height, c: c0, a: a0 });
  while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
    const p = levels[levels.length - 1];
    const w = Math.max(1, Math.ceil(p.w / 2)), h = Math.max(1, Math.ceil(p.h / 2));
    const c = new Float32Array(w * h * 3), a = new Float32Array(w * h);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const s = y * p.w + x, d = (y >> 1) * w + (x >> 1);
      a[d] += p.a[s]; c[d * 3] += p.c[s * 3]; c[d * 3 + 1] += p.c[s * 3 + 1]; c[d * 3 + 2] += p.c[s * 3 + 2];
    }
    levels.push({ w, h, c, a });
  }
  for (let l = levels.length - 2; l >= 0; l--) {
    const p = levels[l], q = levels[l + 1];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x, j = (y >> 1) * q.w + (x >> 1);
      const wa = Math.min(1, p.a[i]);
      const qa = q.a[j] || 1;
      for (let k = 0; k < 3; k++) {
        const own = p.a[i] > 0 ? p.c[i * 3 + k] / p.a[i] : 0;
        const coarse = q.c[j * 3 + k] / qa;
        p.c[i * 3 + k] = (own * wa + coarse * (1 - wa));
      }
      p.a[i] = 1;
    }
  }
  const out = new Uint8Array(width * height * 3);
  let seed = 1234567;
  const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) / 4294967296 - 0.5) * 14; };
  for (let i = 0; i < width * height; i++) {
    const m = alpha.data[i] / 255;
    for (let k = 0; k < 3; k++) {
      const fill = levels[0].c[i * 3 + k] + (m > 0 ? noise() : 0);
      out[i * 3 + k] = Math.max(0, Math.min(255, Math.round(rgb[i * 3 + k] * (1 - m) + fill * m)));
    }
  }
  return out;
}

/** Keep the original photo everywhere except under the (feathered) mask. */
export async function compositeUnderMask(original: Buffer, generated: Buffer, alpha: Gray): Promise<Buffer> {
  const { width, height } = alpha;
  const orig = await sharp(original).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const gen = await sharp(generated).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const out = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const m = alpha.data[i] / 255;
    for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(orig[i * 3 + k] * (1 - m) + gen[i * 3 + k] * m);
  }
  return sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
}
