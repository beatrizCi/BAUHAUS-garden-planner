import { useEffect, useState } from 'react';
import type { Product } from '../types';
import { productThumbnail } from '../lib/thumbnails';

export function Thumb({ product, color }: { product: Product; color: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (product.imageUrl && !product.modelUrl) return;
    let alive = true;
    productThumbnail(product, color).then((s) => alive && setSrc(s)).catch(() => undefined);
    return () => { alive = false; };
  }, [product, color]);
  const photo = product.imageUrl && !product.modelUrl ? product.imageUrl : src;
  return <div className="thumb">{photo ? <img src={photo} alt="" /> : null}</div>;
}
