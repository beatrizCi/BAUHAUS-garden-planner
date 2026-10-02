import { Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import real from './real-products.json';
import { ProductEntity } from './product.entity';

type RealProduct = Pick<ProductEntity, 'id' | 'sku' | 'name' | 'category' | 'price' | 'kind' | 'colors' | 'dimensions' | 'keywords'> & { imageUrl: string; sourceUrl?: string };

const log = new Logger('RealCatalog');
/** Folder served by the web app (Vite public/). Overridable for deployments. */
const PUBLIC_DIR = process.env.WEB_PUBLIC_DIR ?? join(process.cwd(), '../web/public');

/**
 * Real BAUHAUS products from real-products.json. An entry is only used once it is complete
 * (price > 0, real dimensions, a colour and its photo file exists), so half-filled templates never reach customers.
 */
export function realCatalog(): Partial<ProductEntity>[] {
  const ok: Partial<ProductEntity>[] = [];
  for (const p of real as RealProduct[]) {
    const { w, h, d } = p.dimensions;
    const problems = [
      !(p.price > 0) && 'price',
      !(w > 0 && h > 0 && d > 0) && 'dimensions',
      p.colors.some((c) => c.name.startsWith('TODO')) && 'colors',
      !existsSync(join(PUBLIC_DIR, p.imageUrl)) && `image ${p.imageUrl}`,
    ].filter(Boolean);
    if (problems.length) { log.warn(`${p.sku} ${p.name}: skipped, missing ${problems.join(', ')}`); continue; }
    ok.push({ ...p, unit: null, material: null, modelUrl: null, inStock: true });
  }
  return ok;
}
