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
import { StartPage } from './components/StartPage';
import { IdeasPage } from './components/Categories';
import { Toast } from './components/Toast';

type View = 'start' | 'planer' | 'ideen';
const viewFor = (h: string): View => (h === '#tipps-ideen' ? 'ideen' : h === '' || h === '#' || h === '#start' ? 'start' : 'planer');

export default function App() {
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [view, setView] = useState<View>(viewFor(location.hash));
  const { setProducts, notify } = useGarden.getState();

  useEffect(() => {
    api.products().then((p) => { setProducts(p); preloadModels(p); }).catch((e) => notify(e.message));
    const id = new URLSearchParams(location.search).get('project');
    if (id) openProject(id).catch((e) => notify(e.message));
  }, [setProducts, notify]);

  useEffect(() => {
    const onHash = () => {
      const h = location.hash;
      setView(viewFor(h));
      window.scrollTo(0, 0);
      if (viewFor(h) === 'planer' && h !== '#planer') requestAnimationFrame(() => document.getElementById(h.slice(1))?.scrollIntoView());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <Header active={view} query={query} onQuery={setQuery} onCart={() => setCartOpen(true)} onPlus={() => setPlusOpen(true)} />
      <main>
        {view === 'start' ? <StartPage /> : view === 'ideen' ? <IdeasPage /> : (<>
        <nav className="crumbs" aria-label="Brotkrumen"><a href="#start">Start</a> / <span>Garten-Planer</span></nav>
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
