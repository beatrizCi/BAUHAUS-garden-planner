import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { productThumbnail } from '../lib/thumbnails';

export function Thumb({ product, color }: { product: Product; color: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    productThumbnail(product, color).then((s) => alive && setSrc(s)).catch(() => undefined);
    return () => { alive = false; };
  }, [product, color]);
  return <div className="thumb">{src ? <img src={src} alt="" /> : null}</div>;
}
