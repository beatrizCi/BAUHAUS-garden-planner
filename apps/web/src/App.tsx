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
import { CategorySection, Showcase } from './components/Categories';
import { Toast } from './components/Toast';

export default function App() {
  const [query, setQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const { setProducts, notify } = useGarden.getState();

  useEffect(() => {
    api.products().then((p) => { setProducts(p); preloadModels(p); }).catch((e) => notify(e.message));
    const id = new URLSearchParams(location.search).get('project');
    if (id) openProject(id).catch((e) => notify(e.message));
  }, [setProducts, notify]);

  return (
    <>
      <Header query={query} onQuery={setQuery} onCart={() => setCartOpen(true)} onPlus={() => setPlusOpen(true)} />
      <main>
        <nav className="crumbs" aria-label="Brotkrumen"><a href="/">Start</a> / <a href="#produkte">Produkte</a> / <a href="#produkte">Garten &amp; Freizeit</a> / <span>Garten-Planer</span></nav>
        <h1>Garten-Planer</h1>
        <p className="lede">Garten fotografieren, Produkte in echter Größe platzieren, in 3D und AR ansehen, alles direkt in den Warenkorb legen.</p>
        <div className="workspace">
          <Planner />
          <SidePanels />
        </div>
        <ProductSlider query={query} />
        <CategorySection />
        <Showcase />
        <ServiceSection />
      </main>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onPlus={() => { setCartOpen(false); setPlusOpen(true); }} />
      <PlusCardModal open={plusOpen} onClose={() => setPlusOpen(false)} />
      <Toast />
    </>
  );
}
