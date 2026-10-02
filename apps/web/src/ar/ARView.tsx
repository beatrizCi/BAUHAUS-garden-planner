import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGarden } from '../store';
import { ARSession, ARStatus } from './ARSession';
import { buildLayout } from './loadModels';
import { openQuickLook, supportsQuickLook } from './quickLook';

/**
 * "In AR ansehen": Android → WebXR (ARCore). iOS → AR Quick Look (ARKit). Desktop → explanation.
 * scope = "selected" places only the selected item, otherwise the whole plan.
 */
// Taps on overlay buttons must not also count as an XR "select" (which would place/measure).
const blockXrSelect = (el: HTMLDivElement | null) => {
  el?.addEventListener('beforexrselect', (e) => e.preventDefault());
};

export function ARButton({ scope = 'plan', className = 'btn ghost' }: { scope?: 'plan' | 'selected'; className?: string }) {
  const overlay = useRef<HTMLDivElement>(null);
  const session = useRef<ARSession | null>(null);
  const [status, setStatus] = useState<ARStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const notify = useGarden((s) => s.notify);

  const start = async () => {
    const s = useGarden.getState();
    const items = scope === 'selected' ? s.project.items.filter((i) => i.id === s.selectedId) : s.project.items;
    if (!items.length) { notify('Platzieren Sie zuerst ein Produkt.'); return; }
    setBusy(true);
    try {
      const layout = await buildLayout(items, s.products);
      if (await ARSession.supported()) {
        const ar = new ARSession(layout, setStatus, () => { session.current = null; setStatus(null); });
        session.current = ar;
        setStatus({ tracking: false, placed: false, mode: 'place', measurement: null, depth: 'none', centreDepth: null });
        await new Promise((r) => requestAnimationFrame(r));
        await ar.start(overlay.current!);
      } else if (supportsQuickLook()) {
        await openQuickLook(layout);
      } else {
        notify('AR braucht ein Smartphone: Android mit Chrome (ARCore) oder iPhone mit Safari.');
      }
    } catch (e) {
      setStatus(null);
      notify(`AR konnte nicht starten: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const ar = session.current;
  return (
    <>
      <button className={className} onClick={start} disabled={busy}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>
        {busy ? 'AR wird gestartet …' : scope === 'selected' ? 'In AR ansehen' : 'Plan in AR ansehen'}
      </button>
      {createPortal(
        <div ref={overlay} className="ar-overlay" style={{ display: status ? 'block' : 'none' }}>
          <AnimatePresence>
            {status && (
              <motion.div className="ar-ui" ref={blockXrSelect} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onPointerDown={(e) => e.stopPropagation()}>
                <div className="ar-msg">
                  {status.mode === 'measure'
                    ? status.measurement != null ? `${status.measurement.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m` : status.tracking ? 'Tippen Sie auf den Startpunkt, dann auf den Endpunkt.' : 'Bewegen Sie das Handy langsam über den Boden.'
                    : status.placed ? 'Platziert. Erneut tippen, um zu verschieben.' : status.tracking ? 'Boden erkannt. Tippen zum Platzieren.' : 'Bewegen Sie das Handy langsam über den Boden.'}
                </div>
                {status.depth !== 'none' && <div className="ar-depth">Tiefensensor aktiv{status.centreDepth ? `: ${status.centreDepth.toLocaleString('de-DE')} m` : ''}</div>}
                <div className="ar-actions" onClickCapture={(e) => e.stopPropagation()}>
                  <button className={status.mode === 'place' ? 'btn' : 'btn ghost light'} onClick={() => ar?.setMode('place')}>Platzieren</button>
                  <button className={status.mode === 'measure' ? 'btn' : 'btn ghost light'} onClick={() => ar?.setMode('measure')}>Messen</button>
                  <button className="btn ghost light" onClick={() => ar?.rotate(15)} aria-label="Drehen">↻ 15°</button>
                  <button className="btn dark" onClick={() => ar?.end()}>Beenden</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </>
  );
}
