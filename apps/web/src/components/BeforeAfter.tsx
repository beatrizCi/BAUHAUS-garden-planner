import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef } from 'react';

/** Before/after comparison: drag the handle (pointer or keyboard). */
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const box = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(50);
  const clip = useTransform(pos, (p) => `inset(0 0 0 ${p}%)`);
  const left = useTransform(pos, (p) => `${p}%`);
  const move = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    pos.set(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div className="ba" ref={box}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => e.buttons && move(e.clientX)}>
      <img src={before} alt="Vorher" />
      <motion.div className="after" style={{ clipPath: clip }}><img src={after} alt="Nachher" /></motion.div>
      <motion.div className="handle" style={{ left }} role="slider" tabIndex={0} aria-label="Vorher-Nachher-Regler" aria-valuemin={0} aria-valuemax={100}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') pos.set(Math.max(0, pos.get() - 5)); if (e.key === 'ArrowRight') pos.set(Math.min(100, pos.get() + 5)); }} />
      <span className="tag" style={{ left: 12 }}>Vorher</span>
      <span className="tag" style={{ right: 12 }}>Nachher</span>
    </div>
  );
}
