import { create } from 'zustand';
import type { Segment } from '../types';

/** Shared state between the brush overlay on the stage and the removal panel. */
interface RemovalState {
  segments: Segment[];
  selected: string[];
  brush: number;
  painted: boolean;
  maskCanvas: HTMLCanvasElement | null;
  set: (p: Partial<RemovalState>) => void;
  toggle: (id: string) => void;
  clearPaint: () => void;
}
export const useRemoval = create<RemovalState>((set, get) => ({
  segments: [],
  selected: [],
  brush: 40,
  painted: false,
  maskCanvas: null,
  set: (p) => set(p),
  toggle: (id) => set({ selected: get().selected.includes(id) ? get().selected.filter((x) => x !== id) : [...get().selected, id] }),
  clearPaint: () => {
    const c = get().maskCanvas;
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    set({ painted: false });
  },
}));

/** White-on-black PNG of the brush strokes, for the inpainting API. */
export function brushMaskDataUrl(): string | undefined {
  const { maskCanvas, painted } = useRemoval.getState();
  if (!maskCanvas || !painted) return undefined;
  const out = document.createElement('canvas');
  out.width = maskCanvas.width; out.height = maskCanvas.height;
  const g = out.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, out.width, out.height);
  g.globalCompositeOperation = 'lighter';
  g.filter = 'brightness(0) invert(1)';
  g.drawImage(maskCanvas, 0, 0);
  return out.toDataURL('image/png');
}
