import { useEffect, useRef, useState } from 'react';
import { SeasonSection } from './Seasons';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const STEPS = [
  { title: 'Live in deinem Garten ansehen', text: 'Scanne deinen Garten und platziere Produkte in Originalgröße, direkt bei dir zu Hause.', img: '/start/step1.jpg' },
  { title: 'Produkte einfach platzieren', text: 'Wähle aus unserem Sortiment und setze Möbel, Pflanzen, Sichtschutz und mehr direkt in deinen Garten.', img: '/start/step2.jpg' },
  { title: 'Maße erfassen und Empfehlungen erhalten', text: 'Die Fläche wird automatisch vermessen, du bekommst passende Produktvorschläge inklusive Mengenangaben.', img: '/start/step3.jpg' },
  { title: 'Objekte entfernen oder neu gestalten', text: 'Markiere störende Elemente wie alte Möbel, Pflanzen oder Beete und sieh sofort, wie dein Garten danach aussehen kann.', img: '/start/step4.jpg' },
  { title: 'Gesamten Garten erfassen', text: 'Scanne deinen Garten bequem von innen durch die Terrassentür und erhalte eine komplette 3D-Ansicht.', img: '/start/step5.jpg' },
];

/** Step explorer: details on the left, animated stage in the middle, vertical number picker on the right. */
function StepExplorer() {
  const [i, setI] = useState(0);
  const dir = useRef(1);
  const reduce = useReducedMotion();
  const go = (n: number) => { const t = Math.max(0, Math.min(STEPS.length - 1, n)); dir.current = t >= i ? 1 : -1; setI(t); };
  const step = STEPS[i];
  const d = reduce ? 0 : 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.target as HTMLElement).closest?.('.explorer')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <section className="explorer" aria-labelledby="how-h">
      <div className="ex-info">
        <h2 id="how-h">So funktioniert&rsquo;s</h2>
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 14 * d }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 * d }} transition={{ duration: 0.25 }}>
            <p className="ex-kicker">Schritt {i + 1} von {STEPS.length}</p>
            <h3>{step.title}</h3>
            <p className="muted">{step.text}</p>
          </motion.div>
        </AnimatePresence>
        <a className="pill-cta" href="#planer">Ausprobieren <span aria-hidden="true">→</span></a>
      </div>

      <div className="ex-stage" aria-live="polite">
        <AnimatePresence initial={false} custom={dir.current}>
          <motion.div key={i} className="ex-slide" custom={dir.current}
            initial={{ opacity: 0, y: 60 * dir.current * d, scale: 1.04 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -60 * dir.current * d, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <img className="ex-bg" src={step.img} alt="" aria-hidden="true" />
            <img className="ex-img" src={step.img} alt={step.title} />
            {/* highlight that sweeps over the image like the selected area in a floor plan */}
            {!reduce && <motion.span className="ex-sweep" initial={{ x: '-110%' }} animate={{ x: '110%' }} transition={{ duration: 0.9, delay: 0.15, ease: 'easeInOut' }} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="ex-picker" role="tablist" aria-label="Schritt wählen" aria-orientation="vertical">
        <button className="ex-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Vorheriger Schritt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 15 7-7 7 7" /></svg></button>
        <div className="ex-nums">
          <motion.span className="ex-box" aria-hidden="true" initial={false} animate={{ y: i * 96 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }} />
          {STEPS.map((s, n) => (
            <button key={s.title} role="tab" aria-selected={n === i} aria-label={`Schritt ${n + 1}: ${s.title}`} className={n === i ? 'ex-num on' : 'ex-num'} onClick={() => go(n)}>
              <span>{n + 1}</span>
            </button>
          ))}
        </div>
        <button className="ex-arrow" onClick={() => go(i + 1)} disabled={i === STEPS.length - 1} aria-label="Nächster Schritt"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 9 7 7 7-7" /></svg></button>
      </div>
    </section>
  );
}

/** Landing page: explains what the BAUHAUS Garten-Planer does. Images live in public/start/. */
export function StartPage() {
  return (
    <>
      <nav className="crumbs" aria-label="Brotkrumen"><span>Start</span></nav>
      <section className="start-hero">
        <div className="start-hero-txt">
          <span className="eyebrow">BAUHAUS Garten-Planer</span>
          <h1>Plane deinen Garten, bevor du kaufst.</h1>
          <p className="lede">Fotografiere deinen Garten, platziere echte BAUHAUS-Produkte in Originalgröße, sieh alles in 3D und AR und lege den Plan direkt in den Warenkorb.</p>
          <div className="row">
            <a className="pill-cta" href="#planer">Garten-Planer starten <span aria-hidden="true">→</span></a>
            <a className="btn ghost" href="#tipps-ideen">Tipps &amp; Ideen ansehen</a>
          </div>
        </div>
        <motion.img className="start-hero-img" src="/start/hero.jpg" alt="Terrasse mit platzierten Gartenmöbeln und Produktauswahl am unteren Rand"
          initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
      </section>

      <StepExplorer />
      <SeasonSection />

      <section className="service start-cta">
        <div>
          <h2>Bereit für deinen Traumgarten?</h2>
          <p style={{ margin: 0, maxWidth: '56ch' }}>Starte mit einem Foto oder probiere den Beispielgarten aus. Keine Anmeldung nötig.</p>
        </div>
        <div className="row"><a className="pill-cta" href="#planer">Jetzt Garten planen <span aria-hidden="true">→</span></a></div>
      </section>
    </>
  );
}
