const STEPS = [
  { title: 'Live in deinem Garten ansehen', text: 'Scanne deinen Garten und platziere Produkte in Originalgröße, direkt bei dir zu Hause.' },
  { title: 'Produkte einfach platzieren', text: 'Wähle aus unserem Sortiment und setze Möbel, Pflanzen, Sichtschutz und mehr direkt in deinen Garten.' },
  { title: 'Maße erfassen und Empfehlungen erhalten', text: 'Die Fläche wird automatisch vermessen, du bekommst passende Produktvorschläge inklusive Mengenangaben.' },
  { title: 'Objekte entfernen oder neu gestalten', text: 'Markiere störende Elemente wie alte Möbel, Pflanzen oder Beete und sieh sofort, wie dein Garten danach aussehen kann.' },
  { title: 'Gesamten Garten erfassen', text: 'Scanne deinen Garten bequem von innen durch die Terrassentür und erhalte eine komplette 3D-Ansicht.' },
];

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
        <img className="start-hero-img" src="/start/hero.jpg" alt="Terrasse mit platzierten Gartenmöbeln und Produktauswahl am unteren Rand" />
      </section>

      <section className="start-how" aria-labelledby="how-h">
        <h2 id="how-h">So funktioniert&rsquo;s</h2>
        <img src="/start/features.jpg" alt="Die Funktionen im Überblick: Garten live ansehen, Produkte platzieren, Maße erfassen, Objekte entfernen, Garten von innen scannen" loading="lazy" />
        <ol className="sr">
          {STEPS.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}
        </ol>
      </section>

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
