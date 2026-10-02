import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGarden } from '../store';
import type { Tool } from '../types';
import { GardenCanvas } from '../three/GardenScene';
import { captureScene } from '../lib/capture';
import { demoGardenBlob, loadPhoto } from '../lib/photo';
import { saveProject } from '../lib/projectActions';
import { CameraCapture } from './CameraCapture';
import { MaskPainter } from './MaskPainter';
import { BeforeAfter } from './BeforeAfter';
import { Modal } from './Overlay';
import { ProjectsModal } from './Commerce';
import { ARButton } from '../ar/ARView';

const TOOLS: { id: Tool; label: string; icon: string; photoOnly?: boolean }[] = [
  { id: 'move', label: 'Verschieben', icon: 'M12 2v20M2 12h20M12 2l-3 3m3-3 3 3M12 22l-3-3m3 3 3-3M2 12l3-3m-3 3 3 3M22 12l-3-3m3 3-3 3' },
  { id: 'rotate', label: 'Drehen', icon: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5' },
  { id: 'scale', label: 'Größe', icon: 'M4 14v6h6M20 10V4h-6M4 20l7-7M20 4l-7 7' },
  { id: 'measure', label: 'Messen', icon: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2' },
  { id: 'erase', label: 'Entfernen', icon: 'm4 15 9-9 7 7-6 6H8zM9 19h11', photoOnly: true },
  { id: 'calibrate', label: 'Kalibrieren', icon: 'M3 20h18M6 20 12 6l6 14M9 13h6', photoOnly: true },
];

const HINTS: Record<Tool, string> = {
  move: 'Produkte antippen und über den Boden ziehen.',
  rotate: 'Produkt antippen, dann am Ring drehen.',
  scale: 'Produkt antippen, dann an den Griffen ziehen. Flächen lassen sich in Länge und Breite ändern.',
  measure: 'Zwei Punkte auf dem Boden antippen. Die Strecke wird in Metern angezeigt.',
  erase: 'Malen Sie über das Objekt, das aus dem Foto verschwinden soll, oder wählen Sie erkannte Objekte rechts.',
  calibrate: 'Schieben Sie die Regler, bis das rote 1-m-Raster flach auf dem Boden liegt.',
};

export function Planner() {
  const project = useGarden((s) => s.project);
  const tool = useGarden((s) => s.tool);
  const view = useGarden((s) => s.view);
  const aspect = useGarden((s) => s.photoAspect);
  const scanning = useGarden((s) => s.scanning);
  const dirty = useGarden((s) => s.dirty);
  const historyLen = useGarden((s) => s.history.length);
  const { setTool, setView, undo, rename, notify, newProject } = useGarden.getState();

  const fileIn = useRef<HTMLInputElement>(null);
  const captureIn = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [drop, setDrop] = useState(false);
  const [compare, setCompare] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const hasPhoto = !!project.photoUrl;
  const fallbackCamera = useCallback(() => { setCamera(false); notify('Kamera nicht freigegeben. Bitte Foto über die Gerätekamera wählen.'); captureIn.current?.click(); }, [notify]);

  // keyboard shortcuts
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement).tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      const s = useGarden.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); s.undo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) { e.preventDefault(); s.removeItem(s.selectedId); }
      else if (e.key === 'Escape') s.select(null);
      else if (e.key === 'r') s.setTool('rotate');
      else if (e.key === 's' && !e.ctrlKey && !e.metaKey) s.setTool('scale');
      else if (e.key === 'g' || e.key === 'v') s.setTool('move');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const onFile = (f?: File | null) => f && loadPhoto(f);
  const demo = async () => loadPhoto(await demoGardenBlob(), { horizon: 0.4 });
  const openCompare = async () => {
    if (!project.originalPhotoUrl) { notify('Für Vorher/Nachher brauchen Sie ein Foto.'); return; }
    if (view !== 'photo') setView('photo');
    await new Promise((r) => setTimeout(r, 150));
    setCompare(await captureScene(1600));
  };
  const save = async () => {
    setSaving(true);
    try { await saveProject(); } catch (e) { notify((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <section id="planer" aria-label="Planungsfläche">
      <div className="projectbar">
        <label className="sr" htmlFor="pname">Projektname</label>
        <input id="pname" className="field" value={project.name} onChange={(e) => rename(e.target.value)} />
        <button className="btn small" onClick={save} disabled={saving}>{saving ? 'Speichert …' : 'Projekt speichern'}</button>
        <button className="btn small ghost" onClick={() => setProjectsOpen(true)}>Meine Projekte</button>
        <button className="btn small ghost" onClick={() => { if (!dirty || confirm('Ungespeicherte Änderungen verwerfen?')) { newProject(); history.replaceState(null, '', location.pathname); } }}>Neu</button>
        <span className="dirty">{project.id ? (dirty ? 'Ungespeicherte Änderungen' : 'Gespeichert') : 'Noch nicht gespeichert'}</span>
      </div>

      <div className="tools" role="toolbar" aria-label="Werkzeuge">
        {TOOLS.map((t) => (
          <button key={t.id} className="tool" aria-pressed={tool === t.id} disabled={t.photoOnly && (!hasPhoto || view !== 'photo')} onClick={() => setTool(t.id)} title={t.label}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
            <span>{t.label}</span>
          </button>
        ))}
        <span className="sep" />
        <button className="tool" aria-pressed={view === '3d'} onClick={() => { setView(view === 'photo' ? '3d' : 'photo'); if (view === 'photo' && (tool === 'erase' || tool === 'calibrate')) setTool('move'); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>
          <span>{view === 'photo' ? '3D-Ansicht' : 'Fotoansicht'}</span>
        </button>
        <button className="tool" onClick={openCompare} disabled={!hasPhoto}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" /><path d="M12 2v20" /></svg><span>Vorher/Nachher</span></button>
        <button className="tool" onClick={undo} disabled={!historyLen}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg><span>Rückgängig</span></button>
      </div>

      <div
        className={`stage${drop ? ' drop' : ''}`}
        style={{ aspectRatio: view === 'photo' && hasPhoto ? String(aspect) : '16 / 10' }}
        onDragOver={(e) => { e.preventDefault(); setDrop(true); }}
        onDragLeave={() => setDrop(false)}
        onDrop={(e) => { e.preventDefault(); setDrop(false); onFile(e.dataTransfer.files[0]); }}
      >
        <GardenCanvas />
        {tool === 'erase' && view === 'photo' && hasPhoto && <MaskPainter />}
        {!hasPhoto && view === 'photo' && (
          <div className="empty">
            <svg className="ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="5" width="20" height="15" rx="2" /><path d="m2 16 6-5 5 4 3-2 6 5" /><circle cx="16" cy="9" r="1.8" /></svg>
            <h2 style={{ margin: 0 }}>Fotografieren Sie Ihren Garten</h2>
            <p>Quer, aus Augenhöhe, mit der ganzen Fläche im Bild. Oder Foto hierher ziehen.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn" onClick={() => setCamera(true)}>Kamera öffnen</button>
              <button className="btn ghost" onClick={() => fileIn.current?.click()}>Foto hochladen</button>
              <button className="btn ghost" onClick={demo}>Beispielgarten</button>
              <button className="btn ghost" onClick={() => setView('3d')}>Ohne Foto in 3D planen</button>
            </div>
          </div>
        )}
        <AnimatePresence>
          {scanning && <motion.div className="stage-busy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Fläche wird erfasst …</motion.div>}
        </AnimatePresence>
      </div>
      <p className="hint">{HINTS[tool]}</p>
      <div className="row">
        {hasPhoto && <button className="btn small ghost" onClick={() => setCamera(true)}>Neues Foto aufnehmen</button>}
        {hasPhoto && <button className="btn small ghost" onClick={() => fileIn.current?.click()}>Anderes Foto hochladen</button>}
        <ARButton />
      </div>

      <input ref={fileIn} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={captureIn} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {camera && <CameraCapture onClose={() => setCamera(false)} onFallback={fallbackCamera} onCapture={(b) => { setCamera(false); loadPhoto(b); }} />}
      <Modal open={!!compare} onClose={() => setCompare(null)} title="Vorher / Nachher" wide>
        {compare && project.originalPhotoUrl && <BeforeAfter before={project.originalPhotoUrl} after={compare} />}
      </Modal>
      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </section>
  );
}
