import { api } from './api';
import { useGarden } from '../store';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function aspectOf(blob: Blob) {
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(() => null);
  if (bmp) { const a = bmp.width / bmp.height; bmp.close(); return a; }
  return 4 / 3;
}

/** Upload a garden photo, set it as background and play the scan animation. */
export async function loadPhoto(blob: Blob, opts: { horizon?: number } = {}) {
  const s = useGarden.getState();
  if (!blob.type.startsWith('image/')) { s.notify('Bitte eine Bilddatei wählen.'); return; }
  s.setScanning(true);
  try {
    const [aspect, up] = await Promise.all([aspectOf(blob), api.uploadPhoto(blob)]);
    s.setPhoto(up.url, up.width && up.height ? up.width / up.height : aspect);
    s.setView('photo');
    if (opts.horizon) s.setCalibration({ horizon: opts.horizon });
    await wait(2600);
    s.notify('Fläche erfasst. Prüfen Sie unter „Kalibrieren“, ob das Raster auf dem Boden liegt.');
  } catch (e) {
    s.notify((e as Error).message);
  } finally {
    s.setScanning(false);
  }
}

/** Procedural sample garden so the planner can be demoed without a photo. */
export function demoGardenBlob(): Promise<Blob> {
  const W = 1600, H = 1200, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  let seed = 42;
  const r = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
  const hz = H * 0.42;
  let gr = g.createLinearGradient(0, 0, 0, hz); gr.addColorStop(0, '#7FB4E6'); gr.addColorStop(1, '#D8E9F5'); g.fillStyle = gr; g.fillRect(0, 0, W, hz + 40);
  g.fillStyle = '#E9EEF2'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(140 + i * 300, 100 + r() * 60, 110, 30, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 70; i++) { g.fillStyle = ['#3F6B34', '#4D7A3D', '#365C2D'][i % 3]; g.beginPath(); g.arc(r() * W * 0.7, hz - 120 + r() * 90, 36 + r() * 60, 0, 7); g.fill(); }
  g.fillStyle = '#2B5326'; g.fillRect(0, hz - 70, W * 0.66, 120);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `hsl(${95 + r() * 30},${35 + r() * 20}%,${16 + r() * 16}%)`; g.beginPath(); g.arc(r() * W * 0.66, hz - 70 + r() * 115, 3 + r() * 7, 0, 7); g.fill(); }
  gr = g.createLinearGradient(0, hz + 45, 0, H); gr.addColorStop(0, '#9C8463'); gr.addColorStop(1, '#7D6446'); g.fillStyle = gr; g.fillRect(0, hz + 45, W, H);
  for (let i = 0; i < 14000; i++) { const y = hz + 45 + Math.pow(r(), 0.8) * (H - hz), s = (y - hz) / (H - hz) + 0.2; g.fillStyle = `rgba(${60 + r() * 80},${45 + r() * 55},${25 + r() * 35},${0.25 + r() * 0.4})`; g.fillRect(r() * W, y, 3 * s * (1 + r()), 2.4 * s * (1 + r())); }
  g.fillStyle = '#EDEBE6'; g.fillRect(W * 0.68, 0, W * 0.32, H * 0.66);
  g.fillStyle = '#8A6A4E'; g.fillRect(W * 0.68, 0, W * 0.32, 140);
  g.fillStyle = '#2B2E31'; g.fillRect(W * 0.73, 300, W * 0.24, 480);
  gr = g.createLinearGradient(W * 0.74, 300, W * 0.96, 780); gr.addColorStop(0, '#5E6E78'); gr.addColorStop(0.5, '#3B464E'); gr.addColorStop(1, '#6E7C84'); g.fillStyle = gr;
  g.fillRect(W * 0.74, 312, W * 0.105, 460); g.fillRect(W * 0.855, 312, W * 0.105, 460);
  g.fillStyle = '#A9A59C'; g.fillRect(W * 0.66, H * 0.66, W * 0.34, 18);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.9));
}
