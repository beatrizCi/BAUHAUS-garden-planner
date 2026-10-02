import { animate, motion, useMotionValue } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGarden } from '../store';
import type { Product } from '../types';
import { eur } from '../lib/format';
import { Thumb } from './Thumb';

const CATEGORY_ORDER = ['Gartenmöbel', 'Sonnenschutz', 'Grills', 'Pflanzen', 'Pflanzgefäße', 'Gartenbewässerung', 'Zäune & Sichtschutz', 'Gartenhäuser', 'Pools', 'Garten- & Landschaftsbau'];

export function ProductSlider({ query }: { query: string }) {
  const products = useGarden((s) => s.products);
  const [cat, setCat] = useState('Alle');
  const [color, setColor] = useState<string | null>(null);

  const cats = useMemo(() => ['Alle', ...CATEGORY_ORDER.filter((c) => products.some((p) => p.category === c)), ...[...new Set(products.map((p) => p.category))].filter((c) => !CATEGORY_ORDER.includes(c))], [products]);
  const colors = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => !m.has(c.name) && m.set(c.name, c.hex)));
    return [...m];
  }, [products]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (cat === 'Alle' || p.category === cat) && (!color || p.colors.some((c) => c.name === color)) && (!q || [p.name, p.category, ...p.keywords].join(' ').toLowerCase().includes(q)));
  }, [products, cat, color, query]);

  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [limit, setLimit] = useState(0);
  useEffect(() => {
    const measure = () => setLimit(Math.min(0, (wrap.current?.clientWidth ?? 0) - (track.current?.scrollWidth ?? 0) - 4));
    measure();
    animate(x, 0, { duration: 0.3 });
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [list, x]);
  const page = (dir: number) => animate(x, Math.max(limit, Math.min(0, x.get() - dir * (wrap.current?.clientWidth ?? 600) * 0.8)), { type: 'spring', stiffness: 260, damping: 32 });

  return (
    <section id="produkte" aria-label="Produkte">
      <div className="slider-head">
        <h2 style={{ margin: 0 }}>Produkte für Ihren Garten</h2>
        <div className="slider-nav">
          <button className="round" onClick={() => page(-1)} aria-label="Zurück">‹</button>
          <button className="round" onClick={() => page(1)} aria-label="Weiter">›</button>
        </div>
      </div>
      <div className="chips" role="group" aria-label="Kategorien" style={{ marginTop: 8 }}>
        {cats.map((c) => <button key={c} className="chip" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="muted">Farbe</span>
        <div className="swatches" role="group" aria-label="Farbfilter">
          {colors.map(([name, hex]) => <button key={name} className="sw" style={{ background: hex }} title={name} aria-label={`Farbe ${name}`} aria-pressed={color === name} onClick={() => setColor(color === name ? null : name)} />)}
        </div>
        <span className="muted">{list.length} Produkte{color ? ` in ${color}` : ''}</span>
      </div>
      <div className="slider" ref={wrap}>
        {list.length ? (
          <motion.div className="track" ref={track} style={{ x }} drag="x" dragConstraints={{ left: limit, right: 0 }} dragElastic={0.08}>
            {list.map((p) => <ProductCard key={p.id} product={p} preferColor={color} />)}
          </motion.div>
        ) : (
          <p className="muted">Keine Produkte für diese Auswahl. Entfernen Sie den Farbfilter oder wählen Sie „Alle“.</p>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Demodaten: Produkte, Preise und Verfügbarkeit kommen im Produktivsystem aus der Produkt-API.</p>
    </section>
  );
}

function ProductCard({ product, preferColor }: { product: Product; preferColor: string | null }) {
  const initial = product.colors.find((c) => c.name === preferColor)?.name ?? product.colors[0].name;
  const [color, setColor] = useState(initial);
  useEffect(() => setColor(initial), [initial]);
  const addToCart = useGarden((s) => s.addToCart);
  const place = () => {
    const s = useGarden.getState(); // read fresh state: the photo may have been loaded after this card rendered
    if (!s.project.photoUrl && s.view === 'photo') { s.notify('Laden Sie zuerst ein Foto oder wechseln Sie in die 3D-Ansicht.'); return; }
    s.addItem(product.id, color);
    s.setTool('move');
    document.getElementById('planer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <article className="prod">
      <Thumb product={product} color={color} />
      <div className="swatches">
        {product.colors.map((c) => <button key={c.name} className="sw sm" style={{ background: c.hex }} title={c.name} aria-label={c.name} aria-pressed={c.name === color} onClick={() => setColor(c.name)} />)}
      </div>
      <div className="pn">{product.name}</div>
      <div className="pr">{eur(product.price)}{product.unit && <small> / {product.unit}</small>}</div>
      <div className="avail">{product.inStock ? 'Im Markt verfügbar' : 'Online bestellbar'}</div>
      <div className="row">
        <button className="btn small" style={{ flex: 1 }} onClick={place}>Platzieren</button>
        <button className="btn small ghost" aria-label="In den Warenkorb" title="In den Warenkorb" onClick={() => addToCart(product.id, color, product.unit ? 10 : 1)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h3l2.5 11h11L21 7H6.2" /><circle cx="9" cy="19.5" r="1.6" /><circle cx="17" cy="19.5" r="1.6" /></svg>
        </button>
      </div>
    </article>
  );
}
