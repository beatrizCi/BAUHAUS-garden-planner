import { ProductEntity } from './product.entity';

type Seed = Omit<ProductEntity, 'sku' | 'inStock' | 'modelUrl' | 'unit' | 'material'> &
  Partial<Pick<ProductEntity, 'unit' | 'material'>>;

const COL: Record<string, string> = {
  Anthrazit: '#3B3D40', Grau: '#8C8F93', Beige: '#CDBFA6', Natur: '#B5895B', Weiß: '#EDEDEA',
  Grün: '#4F6B45', Terrakotta: '#C2643F', Schwarz: '#1F1F1F', Rot: '#B3261E', Rosa: '#E7A2B8', Blau: '#7C9CD6',
};
const c = (...names: (string | [string, string])[]) =>
  names.map((n) => (Array.isArray(n) ? { name: n[0], hex: n[1] } : { name: n, hex: COL[n] }));

/** Demo catalog. Replace with the BAUHAUS product API (see README → "Real product data"). */
const RAW: Seed[] = [
  { id: 'p01', name: 'Lounge-Set „Lago“, 4-teilig', category: 'Gartenmöbel', price: 899, kind: 'object', colors: c('Anthrazit', 'Grau', 'Beige'), dimensions: { w: 2.6, h: 0.75, d: 0.85 }, keywords: ['lounge', 'sofa', 'couch'] },
  { id: 'p02', name: 'Gartentisch-Set „Tavola“, 7-teilig', category: 'Gartenmöbel', price: 649, kind: 'object', colors: c('Natur', 'Anthrazit', 'Weiß'), dimensions: { w: 2.2, h: 0.9, d: 1.9 }, keywords: ['tisch', 'table', 'dining', 'stühle'] },
  { id: 'p03', name: 'Sonnenliege „Riva“', category: 'Gartenmöbel', price: 129, kind: 'object', colors: c('Grau', 'Weiß', 'Anthrazit'), dimensions: { w: 0.7, h: 0.6, d: 1.95 }, keywords: ['liege', 'lounger'] },
  { id: 'p04', name: 'Ampelschirm Ø 300 cm', category: 'Sonnenschutz', price: 249, kind: 'object', colors: c('Beige', 'Anthrazit', 'Terrakotta', 'Grün'), dimensions: { w: 3, h: 2.5, d: 3 }, keywords: ['schirm', 'parasol', 'umbrella'] },
  { id: 'p05', name: 'Alu-Pergola 3 × 4 m', category: 'Sonnenschutz', price: 1799, kind: 'object', colors: c('Anthrazit', 'Weiß'), dimensions: { w: 4, h: 2.5, d: 3 }, keywords: ['pergola', 'pavillon'] },
  { id: 'p06', name: 'Gasgrill, 4 Brenner', category: 'Grills', price: 499, kind: 'object', colors: c('Schwarz', 'Anthrazit'), dimensions: { w: 1.4, h: 1.15, d: 0.6 }, keywords: ['gasgrill', 'grill', 'bbq'] },
  { id: 'p07', name: 'Holzkohle-Kugelgrill Ø 57 cm', category: 'Grills', price: 179, kind: 'object', colors: c('Schwarz', 'Grün', 'Rot'), dimensions: { w: 0.65, h: 1.05, d: 0.65 }, keywords: ['kugelgrill', 'kettle', 'holzkohle'] },
  { id: 'p08', name: 'Olivenbaum im Kübel, Stamm 80 cm', category: 'Pflanzen', price: 89.99, kind: 'object', colors: c('Anthrazit', 'Terrakotta'), dimensions: { w: 0.9, h: 1.8, d: 0.9 }, keywords: ['olive', 'baum', 'tree'] },
  { id: 'p09', name: 'Lampenputzergras', category: 'Pflanzen', price: 12.99, kind: 'object', colors: c('Grün'), dimensions: { w: 0.6, h: 0.7, d: 0.6 }, keywords: ['gras', 'grass'] },
  { id: 'p10', name: 'Gartenhortensie', category: 'Pflanzen', price: 19.99, kind: 'object', colors: c(['Weiß', '#F4F2EC'], 'Rosa', 'Blau'), dimensions: { w: 0.8, h: 0.7, d: 0.8 }, keywords: ['hortensie', 'hydrangea', 'blumen'] },
  { id: 'p11', name: 'Pflanzkübel quadratisch, 50 cm', category: 'Pflanzgefäße', price: 69.99, kind: 'object', colors: c('Anthrazit', 'Weiß', 'Terrakotta'), dimensions: { w: 0.5, h: 1.0, d: 0.5 }, keywords: ['kübel', 'planter', 'topf'] },
  { id: 'p12', name: 'Hochbeet Lärche 160 × 80 cm', category: 'Pflanzgefäße', price: 149, kind: 'object', colors: c('Natur'), dimensions: { w: 1.6, h: 0.95, d: 0.8 }, keywords: ['hochbeet', 'raised bed'] },
  { id: 'p13', name: 'Schlauchwagen mit 30 m Schlauch', category: 'Gartenbewässerung', price: 59.99, kind: 'object', colors: c(['Grün', '#3E7D3A'], 'Grau'), dimensions: { w: 0.55, h: 0.9, d: 0.5 }, keywords: ['schlauch', 'hose'] },
  { id: 'p14', name: 'WPC-Sichtschutz 180 × 180 cm', category: 'Zäune & Sichtschutz', price: 119, kind: 'object', colors: c('Anthrazit', 'Grau', 'Natur'), dimensions: { w: 1.8, h: 1.8, d: 0.1 }, keywords: ['sichtschutz', 'zaun', 'fence'] },
  { id: 'p15', name: 'Gartenhaus „Nordby“ 2,5 × 2,5 m', category: 'Gartenhäuser', price: 1499, kind: 'object', colors: c('Natur', 'Grau'), dimensions: { w: 2.5, h: 2.4, d: 2.5 }, keywords: ['gartenhaus', 'shed'] },
  { id: 'p16', name: 'Stahlwandpool Ø 3,6 m', category: 'Pools', price: 399, kind: 'object', colors: c('Anthrazit', 'Grau', 'Weiß'), dimensions: { w: 3.6, h: 0.9, d: 3.6 }, keywords: ['pool'] },
  { id: 'p17', name: 'LED-Wegeleuchte', category: 'Garten- & Landschaftsbau', price: 39.99, kind: 'object', colors: c('Anthrazit', 'Grau'), dimensions: { w: 0.12, h: 0.6, d: 0.12 }, keywords: ['leuchte', 'lampe', 'light'] },
  { id: 'p18', name: 'Feinsteinzeug-Terrassenplatte 60 × 60 cm', category: 'Garten- & Landschaftsbau', price: 29.99, unit: 'm²', kind: 'surface', material: 'tiles', colors: c(['Beige', '#D8C7A8'], ['Grau', '#A7A7A2'], ['Anthrazit', '#55575A']), dimensions: { w: 4, h: 0, d: 3 }, keywords: ['platten', 'terrasse', 'tiles'] },
  { id: 'p19', name: 'Rollrasen', category: 'Garten- & Landschaftsbau', price: 4.99, unit: 'm²', kind: 'surface', material: 'lawn', colors: c(['Grün', '#5E9A3A']), dimensions: { w: 5, h: 0, d: 4 }, keywords: ['rasen', 'lawn'] },
  { id: 'p20', name: 'Zierkies 8–16 mm', category: 'Garten- & Landschaftsbau', price: 7.99, unit: 'm²', kind: 'surface', material: 'gravel', colors: c(['Weiß', '#E7E4DC'], ['Grau', '#9C9A94']), dimensions: { w: 2, h: 0, d: 1 }, keywords: ['kies', 'gravel'] },
  { id: 'p21', name: 'WPC-Terrassendielen', category: 'Garten- & Landschaftsbau', price: 39.99, unit: 'm²', kind: 'surface', material: 'deck', colors: c(['Natur', '#A0754C'], ['Grau', '#8A8580']), dimensions: { w: 4, h: 0, d: 3 }, keywords: ['dielen', 'deck', 'decking'] },
];

export const CATALOG: Partial<ProductEntity>[] = RAW.map((p) => ({
  unit: null,
  material: null,
  ...p,
  sku: `DEMO-${p.id.toUpperCase()}`,
  inStock: true,
  modelUrl: p.kind === 'object' ? `/models/${p.id}.glb` : null,
}));
