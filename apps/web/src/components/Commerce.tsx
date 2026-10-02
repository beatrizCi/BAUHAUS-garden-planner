import { useEffect, useState } from 'react';
import { useGarden } from '../store';
import type { Project } from '../types';
import { api } from '../lib/api';
import { eur, num } from '../lib/format';
import { openProject } from '../lib/projectActions';
import { Drawer, Modal } from './Overlay';
import { Thumb } from './Thumb';

/** Demo rule. Replace with the real PlusCard points logic. */
export const pointsFor = (total: number) => Math.floor(total);

export function CartDrawer({ open, onClose, onPlus }: { open: boolean; onClose: () => void; onPlus: () => void }) {
  const cart = useGarden((s) => s.cart);
  const products = useGarden((s) => s.products);
  const card = useGarden((s) => s.plusCard);
  const { setQty, removeFromCart, notify } = useGarden.getState();
  const total = cart.reduce((s, l) => s + (products.find((p) => p.id === l.productId)?.price ?? 0) * l.qty, 0);
  return (
    <Drawer open={open} onClose={onClose} title="Warenkorb" footer={
      <>
        <div className="total"><span>Gesamt</span><span>{eur(total)}</span></div>
        <div className="points"><span className="pc">PLUS</span>
          {card ? <span>Sie sammeln <b>{num(pointsFor(total))} Punkte</b>. Kontostand {num(card.points)} Punkte.</span>
                : <span>Mit der PlusCard sammeln Sie <b>{num(pointsFor(total))} Punkte</b>. <button className="x" style={{ fontSize: 15, textDecoration: 'underline', color: 'var(--link)' }} onClick={onPlus}>PlusCard verknüpfen</button></span>}
        </div>
        <button className="btn" style={{ width: '100%' }} onClick={() => notify(cart.length ? `Prototyp: Weiterleitung zum Checkout mit ${eur(total)}.` : 'Der Warenkorb ist leer.')}>Zur Kasse</button>
      </>
    }>
      {cart.length === 0 && <p className="muted">Ihr Warenkorb ist leer. Platzieren Sie Produkte im Garten und legen Sie sie von dort in den Warenkorb.</p>}
      {cart.map((l) => {
        const p = products.find((x) => x.id === l.productId);
        if (!p) return null;
        return (
          <div className="line" key={l.key} style={{ gridTemplateColumns: '64px 1fr auto' }}>
            <Thumb product={p} color={l.color} />
            <div>
              <div style={{ fontWeight: 600, lineHeight: 1.25 }}>{p.name}</div>
              <div className="muted">{l.color}, {eur(p.price)}{p.unit ? ` / ${p.unit}` : ''}</div>
              <div className="qty">
                <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Weniger">−</button>
                <input value={l.qty} inputMode="numeric" aria-label="Menge" onChange={(e) => setQty(l.key, parseInt(e.target.value) || 1)} />
                <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Mehr">+</button>
                <span className="muted">{p.unit ?? 'Stk.'}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700 }}>{eur(p.price * l.qty)}<br />
              <button className="x" style={{ fontSize: 14, textDecoration: 'underline' }} onClick={() => removeFromCart(l.key)}>Entfernen</button></div>
          </div>
        );
      })}
    </Drawer>
  );
}

export function PlusCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const card = useGarden((s) => s.plusCard);
  const { linkPlusCard, unlinkPlusCard, notify } = useGarden.getState();
  const [num_, setNum] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="BAUHAUS PlusCard">
      {card ? (
        <>
          <div className="points"><span className="pc">PLUS</span><span>Karte endet auf <b>{card.last4}</b><br />Kontostand <b>{num(card.points)} Punkte</b></span></div>
          <button className="btn ghost" onClick={() => { unlinkPlusCard(); onClose(); }}>Karte entfernen</button>
        </>
      ) : (
        <>
          <p className="muted">Punkte sammeln bei jedem Einkauf im Markt und online. Im Prototyp genügt eine beliebige Nummer.</p>
          <label className="lbl" htmlFor="pcn">Kartennummer</label>
          <input id="pcn" className="field" inputMode="numeric" autoComplete="off" value={num_} onChange={(e) => setNum(e.target.value)} />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => { const d = num_.replace(/\D/g, ''); if (d.length < 6) { notify('Bitte mindestens 6 Ziffern eingeben.'); return; } linkPlusCard(d); setNum(''); onClose(); notify('PlusCard verknüpft.'); }}>PlusCard verknüpfen</button>
          </div>
        </>
      )}
    </Modal>
  );
}

const SERVICE_PHONE = { display: '0000 000 000', tel: '+490000000000' }; // placeholder: real Garten-Service number

export function ServiceSection() {
  const project = useGarden((s) => s.project);
  const notify = useGarden((s) => s.notify);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: 'Vormittags', note: '' });
  const send = async () => {
    try {
      await api.serviceRequest({ ...form, projectId: project.id });
      setOpen(false);
      notify('Rückruf angefordert. Der Garten-Service meldet sich innerhalb eines Werktags.');
    } catch (e) { notify((e as Error).message); }
  };
  return (
    <section className="service" id="service">
      <div>
        <h2>Lieber vom Profi umsetzen lassen?</h2>
        <p style={{ margin: 0, maxWidth: '56ch' }}>Der BAUHAUS Garten-Service plant mit Ihnen vor Ort, verlegt Platten, setzt Pflanzen und baut Gartenhäuser auf. Ihr gespeicherter Plan wird mitgeschickt.</p>
      </div>
      <div>
        <span className="muted">Garten-Service, Mo–Sa 8–20 Uhr</span>
        <a className="phone" href={`tel:${SERVICE_PHONE.tel}`}>{SERVICE_PHONE.display}</a>
        <div className="row"><a className="btn" href={`tel:${SERVICE_PHONE.tel}`}>Jetzt anrufen</a><button className="btn ghost" onClick={() => setOpen(true)}>Rückruf anfordern</button></div>
        <p className="muted" style={{ fontSize: 12 }}>Demo-Nummer, im Prototyp nicht erreichbar.</p>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Rückruf vom Garten-Service">
        <label className="lbl" htmlFor="sn">Name</label><input id="sn" className="field" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="lbl" htmlFor="st">Telefon</label><input id="st" className="field" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <label className="lbl" htmlFor="sw">Wunschzeit</label>
        <select id="sw" className="field" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}>{['Vormittags', 'Mittags', 'Nachmittags', 'Abends'].map((t) => <option key={t}>{t}</option>)}</select>
        <label className="lbl" htmlFor="sno">Worum geht es?</label><textarea id="sno" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <p className="muted">{project.id ? `Plan „${project.name}“ (${project.items.length} Produkte) wird angehängt.` : 'Tipp: Speichern Sie Ihr Projekt, dann hängen wir den Plan an.'}</p>
        <button className="btn" onClick={send}>Rückruf anfordern</button>
      </Modal>
    </section>
  );
}

export function ProjectsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [list, setList] = useState<Project[] | null>(null);
  const notify = useGarden((s) => s.notify);
  useEffect(() => { if (open) api.listProjects().then(setList).catch((e) => { notify(e.message); setList([]); }); }, [open, notify]);
  return (
    <Modal open={open} onClose={onClose} title="Meine Projekte">
      {!list && <p className="muted">Lädt …</p>}
      {list?.length === 0 && <p className="muted">Noch keine gespeicherten Projekte.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {list?.map((p) => (
          <div key={p.id} className="card" style={{ padding: 10 }}>
            <div className="thumb">{(p.thumbnailUrl || p.photoUrl) && <img src={p.thumbnailUrl ?? p.photoUrl!} alt="" />}</div>
            <b style={{ display: 'block', marginTop: 6 }}>{p.name}</b>
            <span className="muted" style={{ fontSize: 13 }}>{p.updatedAt ? new Date(p.updatedAt).toLocaleString('de-DE') : ''}</span>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn small" onClick={async () => { await openProject(p.id!); onClose(); }}>Öffnen</button>
              <button className="btn small ghost" onClick={async () => { if (confirm(`„${p.name}“ löschen?`)) { await api.deleteProject(p.id!); setList(list.filter((x) => x.id !== p.id)); } }}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
