import { useEffect, useState } from 'react';
import { useGarden } from './store';
import { api } from './lib/api';
import { openProject } from './lib/projectActions';
import { preloadModels } from './three/GardenScene';
import { Header } from './components/Header';
import { Planner } from './components/Planner';
import { SidePanels } from './components/SidePanels';
import { ProductSlider } from './components/ProductSlider';
import { CartDrawer, PlusCardModal, ServiceSection } from './components/Commerce';
import { IdeasPage } from './components/Categories';
import { Toast } from './components/Toast';

export default function App() {
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [view, setView] = useState<'planer' | 'ideen'>(location.hash === '#tipps-ideen' ? 'ideen' : 'planer');
  const { setProducts, notify } = useGarden.getState();

  useEffect(() => {
    api.products().then((p) => { setProducts(p); preloadModels(p); }).catch((e) => notify(e.message));
    const id = new URLSearchParams(location.search).get('project');
    if (id) openProject(id).catch((e) => notify(e.message));
  }, [setProducts, notify]);

  useEffect(() => {
    const onHash = () => {
      const h = location.hash;
      setView(h === '#tipps-ideen' ? 'ideen' : 'planer');
      if (h && h !== '#tipps-ideen') requestAnimationFrame(() => document.getElementById(h.slice(1))?.scrollIntoView());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <Header active={view} query={query} onQuery={setQuery} onCart={() => setCartOpen(true)} onPlus={() => setPlusOpen(true)} />
      <main>
        {view === 'ideen' ? <IdeasPage /> : (<>
        <nav className="crumbs" aria-label="Brotkrumen"><a href="/">Start</a> / <a href="#produkte">Produkte</a> / <a href="#produkte">Garten &amp; Freizeit</a> / <span>Garten-Planer</span></nav>
        <h1>Garten-Planer</h1>
        <p className="lede">Garten fotografieren, Produkte in echter Größe platzieren, in 3D und AR ansehen, alles direkt in den Warenkorb legen.</p>
        <div className="workspace">
          <Planner />
          <SidePanels />
        </div>
        <ProductSlider query={query} />
        <ServiceSection />
        </>)}
      </main>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onPlus={() => { setCartOpen(false); setPlusOpen(true); }} />
      <PlusCardModal open={plusOpen} onClose={() => setPlusOpen(false)} />
      <Toast />
    </>
  );
}
