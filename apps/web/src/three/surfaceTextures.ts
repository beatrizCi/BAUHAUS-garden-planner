import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Texture } from 'three';
import type { Product } from '../types';

/** Size in meters that one texture tile covers. */
export const TILE_METERS: Record<NonNullable<Product['material']>, number> = { tiles: 1.2, lawn: 1, gravel: 0.6, deck: 1.12 };

const cache = new Map<string, Texture>();

function shade(hex: string, pct: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(pct < 0 ? v * (1 + pct / 100) : v + (255 - v) * (pct / 100))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Procedural, seamless texture for a ground material. Swap for real PBR textures later. */
export function surfaceTexture(material: NonNullable<Product['material']>, hex: string): Texture {
  const key = material + hex;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = rng(hex.length * 977 + material.length);
  if (material === 'tiles') {
    g.fillStyle = shade(hex, -30); g.fillRect(0, 0, S, S);
    const t = S / 2, gap = 3;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      g.fillStyle = shade(hex, ((x * 7 + y * 3) % 5 - 2) * 2.5);
      g.fillRect(x * t + gap, y * t + gap, t - gap * 2, t - gap * 2);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(x * t + gap + r() * (t - 2 * gap), y * t + gap + r() * (t - 2 * gap), 2, 2); }
    }
  } else if (material === 'lawn') {
    g.fillStyle = hex; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 14000; i++) {
      const x = r() * S, y = r() * S;
      g.strokeStyle = shade(hex, (r() - 0.5) * 50); g.lineWidth = 1 + r();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 8); g.stroke();
    }
  } else if (material === 'gravel') {
    g.fillStyle = shade(hex, -20); g.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) {
      const x = r() * S, y = r() * S;
      for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
        g.fillStyle = shade(hex, (r() - 0.5) * 40);
        g.beginPath(); g.ellipse(x + dx, y + dy, 3 + r() * 5, 2 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill();
      }
    }
  } else {
    const boards = 8, w = S / boards;
    g.fillStyle = shade(hex, -40); g.fillRect(0, 0, S, S);
    for (let i = 0; i < boards; i++) {
      g.fillStyle = shade(hex, ((i * 5) % 7 - 3) * 3);
      g.fillRect(i * w + 2, 0, w - 4, S);
      for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(0,0,0,.08)`; g.fillRect(i * w + 4 + k * (w / 4), 0, 1, S); }
      const joint = ((i * 191) % S);
      g.fillStyle = shade(hex, -45); g.fillRect(i * w, joint, w, 3);
    }
  }
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** A product photo used as floor texture repeats every this many meters (mirrored, so there are no hard seams). */
export const PHOTO_TILE_METERS = 1.5;
