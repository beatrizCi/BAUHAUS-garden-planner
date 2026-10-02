import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { surfaceArea, useGarden } from '../store';
import type { Suggestion } from '../types';
import { api } from '../lib/api';
import { eur } from '../lib/format';
import { brushMaskDataUrl, useRemoval } from '../lib/removal';
import { ARButton } from '../ar/ARView';

const panel = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.18 } };

export function SidePanels() {
  const tool = useGarden((s) => s.tool);
  const selectedId = useGarden((s) => s.selectedId);
  return (
    <aside className="side" aria-label="Einstellungen und KI">
      <AnimatePresence mode="popLayout">
        {selectedId && <motion.div key="sel" {...panel}><SelectionPanel /></motion.div>}
        {tool === 'calibrate' && <motion.div key="cal" {...panel}><CalibrationPanel /></motion.div>}
        {tool === 'erase' && <motion.div key="erase" {...panel}><RemovalPanel /></motion.div>}
      </AnimatePresence>
      <SuggestionsPanel />
      <PlanSummary />
    </aside>
  );
}

function SelectionPanel() {
  const item = useGarden((s) => s.project.items.find((i) => i.id === s.selectedId));
  const product = useGarden((s) => (item ? s.products.find((p) => p.id === item.productId) : undefined));
  const { updateItem, removeItem, duplicateItem, addToCart, setTool } = useGarden.getState();
  if (!item || !product) return null;
  const qty = product.kind === 'surface' ? surfaceArea(product, item) : 1;
  return (
    <div className="card">
      <div className="sel-name">{product.name}</div>
      <div className="muted">{eur(product.price)}{product.unit ? ` / ${product.unit}, ca. ${qty} ${product.unit}` : ''}</div>
      <div className="swatches">
        {product.colors.map((c) => <button key={c.name} className="sw" style={{ background: c.hex }} title={c.name} aria-label={`Farbe ${c.name}`} aria-pressed={c.name === item.color} onClick={() => updateItem(item.id, { color: c.name }, { history: true })} />)}
      </div>
      <div className="row">
        <button className="btn small ghost" onClick={() => updateItem(item.id, { rotationY: item.rotationY - 15 }, { history: true })}>↺ 15°</button>
        <button className="btn small ghost" onClick={() => updateItem(item.id, { rotationY: item.rotationY + 15 }, { history: true })}>↻ 15°</button>
        <button className="btn small ghost" onClick={() => setTool('rotate')}>Frei drehen</button>
        <button className="btn small ghost" onClick={() => setTool('scale')}>Größe</button>
        <button className="btn small ghost" onClick={() => duplicateItem(item.id)}>Duplizieren</button>
        <button className="btn small ghost" onClick={() => removeItem(item.id)}>Entfernen</button>
      </div>
      <div className="row">
        <button className="btn small" onClick={() => addToCart(product.id, item.color, qty)}>{product.unit ? `${eur(product.price * qty)} in den Warenkorb` : 'In den Warenkorb'}</button>
        <ARButton scope="selected" className="btn small ghost" />
      </div>
    </div>
  );
}

function CalibrationPanel() {
  const cal = useGarden((s) => s.project.calibration);
  const set = useGarden((s) => s.setCalibration);
  const rows: { key: keyof typeof cal; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
    { key: 'horizon', label: 'Horizont', min: 0.05, max: 0.95, step: 0.005, fmt: (v) => `${Math.round(v * 100)} %` },
    { key: 'fov', label: 'Bildwinkel', min: 30, max: 90, step: 1, fmt: (v) => `${v}°` },
    { key: 'cameraHeight', label: 'Kamerahöhe', min: 0.6, max: 4, step: 0.05, fmt: (v) => `${v.toFixed(2)} m` },
  ];
  return (
    <div className="card">
      <h3>Foto kalibrieren</h3>
      <p className="muted" style={{ margin: 0 }}>Damit Produkte in echter Größe erscheinen. Das Raster zeigt 1-m-Felder auf dem Boden.</p>
      {rows.map((r) => (
        <label key={r.key} className="range">
          <span>{r.label}</span>
          <input type="range" min={r.min} max={r.max} step={r.step} value={cal[r.key]} onChange={(e) => set({ [r.key]: Number(e.target.value) })} />
          <span>{r.fmt(cal[r.key])}</span>
        </label>
      ))}
      <p className="muted" style={{ margin: 0 }}>Tipp: Ein bekanntes Maß (z. B. Terrassenplatte 60 cm) mit „Messen“ prüfen.</p>
    </div>
  );
}

function RemovalPanel() {
  const project = useGarden((s) => s.project);
  const photoAspect = useGarden((s) => s.photoAspect);
  const { setPhoto, notify, setScanning } = useGarden.getState();
  const { segments, selected, brush, painted, set, toggle, clearPaint } = useRemoval();
  const [busy, setBusy] = useState<'detect' | 'remove' | null>(null);

  const detect = async () => {
    if (!project.photoUrl) return;
    setBusy('detect'); setScanning(true);
    try {
      const res = await api.segment(project.photoUrl);
      set({ segments: res.segments, selected: [] });
      notify(res.message ?? (res.segments.length ? `${res.segments.filter((s) => s.removable).length} entfernbare Objekte erkannt.` : 'Keine Objekte erkannt. Markieren Sie mit dem Pinsel.'));
    } catch (e) { notify((e as Error).message); }
    finally { setBusy(null); setScanning(false); }
  };
  const remove = async () => {
    if (!project.photoUrl) return;
    const maskUrls = segments.filter((s) => selected.includes(s.id)).map((s) => s.maskUrl);
    const maskDataUrl = brushMaskDataUrl();
    if (!maskUrls.length && !maskDataUrl) { notify('Markieren Sie zuerst ein Objekt.'); return; }
    setBusy('remove'); setScanning(true);
    try {
      const res = await api.inpaint(project.photoUrl, maskUrls, maskDataUrl);
      setPhoto(res.url, photoAspect, { keepOriginal: true });
      clearPaint(); set({ segments: [], selected: [] });
      notify(res.warning ?? (res.provider === 'local' ? 'Entfernt (lokale Füllung). Für fotorealistische Ergebnisse Gemini oder ein HF-Endpoint konfigurieren.' : 'Objekt entfernt.'));
    } catch (e) { notify((e as Error).message); }
    finally { setBusy(null); setScanning(false); }
  };
  const removable = segments.filter((s) => s.removable);

  return (
    <div className="card">
      <h3>Objekte entfernen</h3>
      <div className="row">
        <button className="btn small ghost" onClick={detect} disabled={!!busy}>{busy === 'detect' ? 'Erkenne …' : 'Objekte erkennen'}</button>
        <label className="range" style={{ gridTemplateColumns: '60px 1fr', flex: 1 }}>
          <span>Pinsel</span>
          <input type="range" min={8} max={120} value={brush} onChange={(e) => set({ brush: Number(e.target.value) })} />
        </label>
      </div>
      {removable.length > 0 && (
        <div className="seg-list" role="group" aria-label="Erkannte Objekte">
          {removable.map((s) => <button key={s.id} className="chip" aria-pressed={selected.includes(s.id)} onClick={() => toggle(s.id)}>{s.label}{s.score ? ` ${Math.round(s.score * 100)} %` : ''}</button>)}
        </div>
      )}
      <div className="row">
        <button className="btn" onClick={remove} disabled={!!busy || (!painted && !selected.length)}>{busy === 'remove' ? 'Wird entfernt …' : 'Markiertes entfernen'}</button>
        <button className="btn small ghost" onClick={clearPaint} disabled={!painted}>Pinsel löschen</button>
        {project.originalPhotoUrl && project.originalPhotoUrl !== project.photoUrl && (
          <button className="btn small ghost" onClick={() => setPhoto(project.originalPhotoUrl!, photoAspect, { keepOriginal: true })}>Originalfoto</button>
        )}
      </div>
    </div>
  );
}

function SuggestionsPanel() {
  const project = useGarden((s) => s.project);
  const product = useGarden((s) => s.product);
  const { addItem, addToCart, notify, pushHistory } = useGarden.getState();
  const [wishes, setWishes] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ analysis: string; style: string; suggestions: Suggestion[] } | null>(null);

  const run = async () => {
    if (!project.photoUrl) { notify('Für KI-Vorschläge brauchen Sie ein Foto.'); return; }
    setBusy(true);
    try { setRes(await api.suggest(project.photoUrl, project.calibration, project.items, wishes)); }
    catch (e) { notify((e as Error).message); }
    finally { setBusy(false); }
  };
  const place = (s: Suggestion) => {
    const it = addItem(s.productId, s.color, [s.x, -Math.abs(s.z)]);
    if (it && s.rotationY) useGarden.getState().updateItem(it.id, { rotationY: s.rotationY });
  };

  return (
    <div className="card">
      <h3>KI-Vorschläge</h3>
      <p className="muted" style={{ margin: 0 }}>Die KI sieht sich Ihr Foto an und schlägt Produkte mit Platzierung vor.</p>
      <textarea rows={2} value={wishes} onChange={(e) => setWishes(e.target.value)} placeholder="Optional: „pflegeleicht, Platz für 6 Personen, mediterran“" />
      <button className="btn" onClick={run} disabled={busy}>{busy ? 'Analysiere …' : 'Garten analysieren'}</button>
      {res && (
        <>
          <div><b>{res.style}</b><p className="muted" style={{ margin: '4px 0 0' }}>{res.analysis}</p></div>
          <div>
            {res.suggestions.map((s, i) => {
              const p = product(s.productId);
              if (!p) return null;
              return (
                <div className="sugg" key={i}>
                  <div><b>{p.name}</b><span className="muted"> {s.color}, {eur(p.price)}</span><p>{s.reason}</p></div>
                  <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <button className="btn small" onClick={() => place(s)}>Platzieren</button>
                    <button className="btn small ghost" onClick={() => addToCart(p.id, s.color, p.unit ? 10 : 1)}>Warenkorb</button>
                  </div>
                </div>
              );
            })}
          </div>
          {res.suggestions.length > 0 && (
            <button className="btn dark" onClick={() => { pushHistory(); res.suggestions.forEach(place); notify('Vorschläge übernommen. „Rückgängig“ holt den alten Stand zurück.'); }}>Alle übernehmen</button>
          )}
        </>
      )}
    </div>
  );
}

function PlanSummary() {
  const items = useGarden((s) => s.project.items);
  const products = useGarden((s) => s.products);
  const { addToCart, select } = useGarden.getState();
  if (!items.length) return null;
  const lines = items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    const qty = p?.kind === 'surface' ? surfaceArea(p, it) : 1;
    return { it, p, qty, total: p ? p.price * qty : 0 };
  }).filter((l): l is typeof l & { p: NonNullable<typeof l.p> } => !!l.p);
  const total = lines.reduce((s, l) => s + l.total, 0);
  return (
    <div className="card">
      <h3>Ihr Plan</h3>
      {lines.map(({ it, p, qty, total }) => (
        <div key={it.id} className="line" style={{ padding: '6px 0' }}>
          <button className="x" style={{ fontSize: 15, textAlign: 'left', padding: 0 }} onClick={() => select(it.id)}>{p.name} <span className="muted">({it.color}{p.unit ? `, ${qty} ${p.unit}` : ''})</span></button>
          <span>{eur(total)}</span>
        </div>
      ))}
      <div className="total"><span>Summe</span><span>{eur(total)}</span></div>
      <button className="btn" style={{ width: '100%' }} onClick={() => lines.forEach((l) => addToCart(l.p.id, l.it.color, l.qty))}>Alles in den Warenkorb</button>
    </div>
  );
}
