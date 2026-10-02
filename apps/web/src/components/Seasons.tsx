import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGarden } from '../store';
import { eur } from '../lib/format';

/** One scan, four looks. Images: public/start/season-<id>.jpg, all taken from the same camera position. */
const SEASONS = [
  { id: 'fruehling', label: 'Frühling', accent: '#6fb551', sky: ['#cfe8b5', '#7fb069'], planting: 'Tulpen, Hortensien und frischer Rollrasen', furniture: 'Hochbeet zum Anpflanzen, leichte Bistro-Möbel', products: ['p12', 'p10', 'p19', 'p13'] },
  { id: 'sommer', label: 'Sommer', accent: '#e8a317', sky: ['#ffe28a', '#f08a24'], planting: 'Olivenbaum, Gräser und blühende Kübelpflanzen', furniture: 'Lounge, Sonnenliegen, Schirm und Grill', products: ['p04', 'p03', 'p06', 'p16'] },
  { id: 'herbst', label: 'Herbst', accent: '#c4622d', sky: ['#f0b36a', '#9c4a24'], planting: 'Lampenputzergras, Chrysanthemen und Laub in warmen Tönen', furniture: 'Decken, Feuerschale und Holzkohlegrill', products: ['p09', 'p11', 'p17', 'p07'] },
  { id: 'winter', label: 'Winter', accent: '#5b8fb9', sky: ['#dbe8f2', '#8fa9bf'], planting: 'Immergrüne Kübel und Zierkies statt Beet', furniture: 'Möbel winterfest verstaut, Wegebeleuchtung und Sichtschutz', products: ['p17', 'p15', 'p14', 'p20'] },
];

export function SeasonSection() {
  const [i, setI] = useState(1);
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const reduce = useReducedMotion();
  const products = useGarden((s) => s.products);
  const s = SEASONS[i];
  const picks = s.products.map((id) => products.find((p) => p.id === id)).filter((p) => !!p);

  return (
    <section className="seasons" aria-labelledby="seasons-h" style={{ ['--accent' as string]: s.accent }}>
      <div className="seasons-head">
        <h2 id="seasons-h">Dein Garten zu jeder Jahreszeit</h2>
        <p className="muted">Einmal scannen, vier Jahreszeiten sehen: derselbe Platz mit passender Bepflanzung, Möbeln und saisonalen Produkten.</p>
      </div>
      <div className="seasons-tabs" role="tablist" aria-label="Jahreszeit wählen">
        {SEASONS.map((x, n) => (
          <button key={x.id} role="tab" aria-selected={n === i} className={n === i ? 'on' : ''} onClick={() => setI(n)}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') setI((i + 1) % 4); if (e.key === 'ArrowLeft') setI((i + 3) % 4); }}>
            {x.label}
          </button>
        ))}
      </div>
      <div className="seasons-body">
        <div className="seasons-stage" style={{ background: `linear-gradient(160deg, ${s.sky[0]}, ${s.sky[1]})` }}>
          <AnimatePresence initial={false}>
            <motion.div key={s.id} className="seasons-img" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.7, ease: 'easeOut' }}>
              {missing[s.id]
                ? <span className="seasons-ph">{s.label}<small>Bild: public/start/season-{s.id}.jpg</small></span>
                : <img src={`/start/season-${s.id}.jpg`} alt={`Derselbe Garten im ${s.label}`} onError={() => setMissing((m) => ({ ...m, [s.id]: true }))} />}
            </motion.div>
          </AnimatePresence>
          <span className="seasons-tag">{s.label}</span>
        </div>
        <div className="seasons-info">
          <AnimatePresence mode="wait">
            <motion.div key={s.id} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
              <h3>{s.label}</h3>
              <dl>
                <dt>Bepflanzung</dt><dd>{s.planting}</dd>
                <dt>Möbel &amp; Deko</dt><dd>{s.furniture}</dd>
              </dl>
              {picks.length > 0 && (
                <>
                  <h4>Saisonale Produkte</h4>
                  <ul className="seasons-products">
                    {picks.map((p) => <li key={p!.id}><span>{p!.name}</span><b>{eur(p!.price)}</b></li>)}
                  </ul>
                </>
              )}
              <a className="pill-cta" href="#planer">Im Planer ausprobieren <span aria-hidden="true">→</span></a>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
