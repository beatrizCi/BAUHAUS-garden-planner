import { useEffect, useState } from 'react';
import { BeforeAfter } from './BeforeAfter';

/** Tiles are complete images (photo, icon, title, arrow) in public/categories/<slug>.png. */
export const CATEGORIES = [
  { slug: 'balkon', label: 'Balkon', sub: 'Kleine Räume, große Ideen' },
  { slug: 'beete', label: 'Beete', sub: 'Selbst anbauen, frisch genießen' },
  { slug: 'carport-garage', label: 'Carport & Garage', sub: 'Schutz mit Stil' },
  { slug: 'gewaechshaeuser', label: 'Garten- & Gewächshäuser', sub: 'Mehr Raum für deine Pflanzen' },
  { slug: 'gartenbewaesserung', label: 'Gartenbewässerung', sub: 'Effizient und nachhaltig' },
  { slug: 'gartengestaltung', label: 'Gartengestaltung', sub: 'Ideen für jeden Garten' },
  { slug: 'grillen', label: 'Grillen', sub: 'Genuss im Freien' },
  { slug: 'pflanzen', label: 'Pflanzen', sub: 'Für ein grüneres Zuhause' },
  { slug: 'pool', label: 'Pool', sub: 'Erfrischung für zuhause' },
  { slug: 'rasen', label: 'Rasen', sub: 'Ein gepflegter Auftritt' },
  { slug: 'sauna', label: 'Sauna', sub: 'Entspannung im eigenen Garten' },
  { slug: 'sichtschutz', label: 'Sichtschutz', sub: 'Privatsphäre mit Design' },
  { slug: 'terrasse', label: 'Terrasse', sub: 'Wohlfühlen im Freien' },
  { slug: 'tiere-im-garten', label: 'Tiere im Garten', sub: 'Ein Zuhause für Nützlinge' },
];

/** The "Tipps & Ideen" tab. */
export function IdeasPage() {
  return (
    <>
      <nav className="crumbs" aria-label="Brotkrumen"><a href="#planer">Start</a> / <span>Tipps &amp; Ideen</span> / <span>Garten &amp; Balkon</span></nav>
      <section className="ideas-hero">
        <div className="ideas-hero-img"><img src="/categories/hero.png" alt="" /></div>
        <div className="ideas-hero-txt">
          <span className="eyebrow">Garten &amp; Balkon</span>
          <h1>Garten &amp; Balkon</h1>
          <p>Alles für deinen grünen Wohlfühlort.</p>
          <ul>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15zM5 19c3-5 6-8 10-10" /></svg>Ideen &amp; Inspiration</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" /></svg>Praktische Ratgeber</li>
            <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 4h3l2.5 11h11L21 7H6.2" /><circle cx="9" cy="19.5" r="1.6" /><circle cx="17" cy="19.5" r="1.6" /></svg>Passende Produkte</li>
          </ul>
          <a className="pill-cta" href="#kategorien">Jetzt entdecken <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <section id="kategorien" aria-label="Kategorien">
        <div className="cat-grid">
          {CATEGORIES.map((c) => (
            <a key={c.slug} className="cat" href="#tipps-ideen" aria-label={`${c.label}: ${c.sub}`}>
              <img src={`/categories/${c.slug}.png`} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      </section>
      <Showcase />
    </>
  );
}

/** Before/after: public/showcase/before.jpg (old garden) and after.jpg (renovated). Hidden until both exist. */
function Showcase() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let n = 0;
    ['before', 'after'].forEach((f) => {
      const i = new Image();
      i.onload = () => { if (++n === 2) setOk(true); };
      i.src = `/showcase/${f}.jpg`;
    });
  }, []);
  if (!ok) return null;
  return (
    <section className="showcase" aria-labelledby="show-h">
      <h2 id="show-h">So wird aus Ihrem Garten ein Lieblingsplatz</h2>
      <p className="muted">Regler nach links ziehen und den neuen Garten entdecken.</p>
      <BeforeAfter before="/showcase/before.jpg" after="/showcase/after.jpg" />
    </section>
  );
}
