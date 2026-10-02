import type { WebGLRenderer } from 'three';
import { useGarden } from '../store';

/** Set from <Canvas onCreated>. Used for before/after and thumbnails (canvas has preserveDrawingBuffer). */
export const renderRef: { gl: WebGLRenderer | null } = { gl: null };

const frames = (n: number) => new Promise<void>((res) => { const tick = () => (n-- <= 0 ? res() : requestAnimationFrame(tick)); tick(); });

/** Renders the scene without selection rings/gizmos and returns a data URL. */
export async function captureScene(maxWidth = 1600, type = 'image/jpeg'): Promise<string> {
  const gl = renderRef.gl;
  if (!gl) throw new Error('3D-Ansicht nicht bereit');
  const s = useGarden.getState();
  s.setCapturing(true);
  await frames(3);
  const src = gl.domElement;
  const scale = Math.min(1, maxWidth / src.width);
  const out = document.createElement('canvas');
  out.width = Math.round(src.width * scale);
  out.height = Math.round(src.height * scale);
  out.getContext('2d')!.drawImage(src, 0, 0, out.width, out.height);
  s.setCapturing(false);
  return out.toDataURL(type, 0.88);
}
