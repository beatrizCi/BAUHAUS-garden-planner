import { useEffect, useRef } from 'react';
import { useGarden } from '../store';
import { useRemoval } from '../lib/removal';

/** Brush overlay on top of the 3D stage: paint what should disappear from the photo. */
export function MaskPainter() {
  const ref = useRef<HTMLCanvasElement>(null);
  const aspect = useGarden((s) => s.photoAspect);
  const { brush, segments, selected } = useRemoval();
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = ref.current!;
    const prev = useRemoval.getState().maskCanvas;
    c.width = 1024; c.height = Math.round(1024 / aspect);
    if (prev && prev !== c) c.getContext('2d')!.drawImage(prev, 0, 0, c.width, c.height);
    useRemoval.getState().set({ maskCanvas: c });
  }, [aspect]);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ref.current!.width, y: ((e.clientY - r.top) / r.height) * ref.current!.height, k: ref.current!.width / r.width };
  };
  const stroke = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => {
    const g = ref.current!.getContext('2d')!;
    g.strokeStyle = g.fillStyle = '#D9342B';
    g.lineCap = 'round'; g.lineWidth = brush * k;
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  };

  return (
    <>
      {segments.filter((s) => selected.includes(s.id)).map((s) => (
        <div key={s.id} aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(217,52,43,.5)', WebkitMaskImage: `url(${s.maskUrl})`, maskImage: `url(${s.maskUrl})`, maskMode: 'luminance', WebkitMaskSize: '100% 100%', maskSize: '100% 100%', pointerEvents: 'none' } as React.CSSProperties} />
      ))}
      <canvas
        ref={ref}
        className="mask-layer"
        style={{ opacity: 0.55 }}
        aria-label="Bereich zum Entfernen markieren"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const p = pos(e); last.current = p; stroke(p, p, p.k); useRemoval.getState().set({ painted: true }); }}
        onPointerMove={(e) => { if (!last.current) return; const p = pos(e); stroke(last.current, p, p.k); last.current = p; }}
        onPointerUp={() => { last.current = null; }}
        onPointerCancel={() => { last.current = null; }}
      />
    </>
  );
}
