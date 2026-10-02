import { useState } from 'react';
import { BeforeAfter } from './BeforeAfter';

/** Drop images into public/categories/<slug>.jpg (4:3 works best). Missing images fall back to a green gradient. */
export const CATEGORIES = [
  { slug: 'balkon', label: 'Balkon' },
  { slug: 'beete', label: 'Beete' },
  { slug: 'carport-garage', label: 'Carport & Garage' },
  { slug: 'gewaechshaeuser', label: 'Garten- & Gewächshäuser' },
  { slug: 'gartenbewaesserung', label: 'Gartenbewässerung' },
  { slug: 'gartengestaltung', label: 'Gartengestaltung' },
  { slug: 'grillen', label: 'Grillen' },
  { slug: 'pflanzen', label: 'Pflanzen' },
  { slug: 'pool', label: 'Pool' },
  { slug: 'rasen', label: 'Rasen' },
  { slug: 'sauna', label: 'Sauna' },
  { slug: 'sichtschutz', label: 'Sichtschutz' },
  { slug: 'terrasse', label: 'Terrasse' },
  { slug: 'tiere-im-garten', label: 'Tiere im Garten' },
];

function Tile({ slug, label }: { slug: string; label: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <a className="cat" href={`#kategorie-${slug}`}>
      {!missing && <img src={`/categories/${slug}.jpg`} alt="" loading="lazy" onError={() => setMissing(true)} />}
      <span>{label}</span>
    </a>
  );
}

export function CategorySection() {
  return (
    <section className="cats" id="kategorien" aria-labelledby="cats-h">
      <h2 id="cats-h">Ideen &amp; Inspiration für Ihren Garten</h2>
      <div className="cat-grid">{CATEGORIES.map((c) => <Tile key={c.slug} {...c} />)}</div>
    </section>
  );
}

/** Before/after showcase: public/showcase/before.jpg (old garden) and after.jpg (renovated). */
export function Showcase() {
  return (
    <section className="showcase" aria-labelledby="show-h">
      <h2 id="show-h">So wird aus Ihrem Garten ein Lieblingsplatz</h2>
      <p className="muted">Regler nach links ziehen und den neuen Garten entdecken.</p>
      <BeforeAfter before="/showcase/before.jpg" after="/showcase/after.jpg" />
    </section>
  );
}
