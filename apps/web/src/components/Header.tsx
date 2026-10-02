import { useGarden } from '../store';
import { num } from '../lib/format';

export function Header({ query, onQuery, onCart, onPlus }: { query: string; onQuery: (q: string) => void; onCart: () => void; onPlus: () => void }) {
  const count = useGarden((s) => s.cart.length);
  const card = useGarden((s) => s.plusCard);
  return (
    <header className="top">
      <div className="top-in">
        <div className="bar">
          {/* Replace with the official BAUHAUS logo SVG */}
          <a className="logo" href="/" aria-label="BAUHAUS Startseite">
            <svg width="42" height="42" viewBox="0 0 44 44" aria-hidden="true"><path d="M4 22 22 6l18 16v18H4z" fill="#fff" /><path d="M15 40V27h14v13" fill="#D9342B" /></svg>
            <span className="logo-mark"><span className="wordmark">BAUHAUS</span><span className="tagline">Wenn's gut werden muss.</span></span>
          </a>
          <label className="search">
            <span className="sr">Produkte suchen</span>
            <input type="search" placeholder="Was suchen Sie?" value={query} onChange={(e) => onQuery(e.target.value)} />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
          </label>
          <div className="store"><div><b>BAUHAUS Mannheim-Waldhof</b><span>Heute bis 20:00 Uhr</span></div></div>
        </div>
        <nav className="nav" aria-label="Hauptnavigation">
          <a href="#produkte">Produkte</a>
          <a href="#planer">Tipps &amp; Ideen</a>
          <a href="#produkte">Angebote</a>
          <a href="#service">Service &amp; Beratung</a>
          <span className="spacer" />
          <button className="iconbtn plus-pill" onClick={onPlus}><span className="pc">PLUS</span><span className="lbl-t">{card ? `${num(card.points)} Punkte` : 'PlusCard verknüpfen'}</span></button>
          <button className="iconbtn acct" aria-label="Mein Konto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg></button>
          <button className="iconbtn" onClick={onCart} aria-label="Warenkorb öffnen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4h3l2.5 11h11L21 7H6.2" /><circle cx="9" cy="19.5" r="1.6" /><circle cx="17" cy="19.5" r="1.6" /></svg>
            {count > 0 && <span className="badge">{count}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
}
