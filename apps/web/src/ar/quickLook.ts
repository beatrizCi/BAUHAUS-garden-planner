import type { Group } from 'three';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';

/** iOS Safari: AR Quick Look (ARKit, uses LiDAR where available) needs a USDZ file, generated on the fly. */
export function supportsQuickLook() {
  const a = document.createElement('a');
  return a.relList.supports?.('ar') ?? false;
}

export async function openQuickLook(layout: Group, title = 'BAUHAUS Garten-Planer') {
  const data = await new USDZExporter().parseAsync(layout);
  const url = URL.createObjectURL(new Blob([data], { type: 'model/vnd.usdz+zip' }));
  const a = document.createElement('a');
  a.rel = 'ar';
  a.href = `${url}#allowsContentScaling=0&checkoutTitle=${encodeURIComponent(title)}`;
  a.appendChild(document.createElement('img')); // Quick Look requires an <img> child
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 60_000);
}
