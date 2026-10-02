import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Calibration, CartLine, PlacedItem, Product, Project, Tool, ViewMode } from './types';
import { centreGroundDistance, uid } from './lib/format';

export const DEFAULT_CALIBRATION: Calibration = { horizon: 0.42, fov: 55, cameraHeight: 1.6 };

interface ToastState { text: string; id: number }

interface GardenState {
  products: Product[];
  setProducts: (p: Product[]) => void;
  product: (id: string) => Product | undefined;

  project: Project;
  photoAspect: number;
  dirty: boolean;
  setProject: (p: Project) => void;
  newProject: () => void;
  setPhoto: (url: string, aspect: number, opts?: { keepOriginal?: boolean }) => void;
  setCalibration: (c: Partial<Calibration>) => void;
  rename: (name: string) => void;

  items: () => PlacedItem[];
  addItem: (productId: string, color?: string, at?: [number, number]) => PlacedItem | null;
  updateItem: (id: string, patch: Partial<PlacedItem>, opts?: { history?: boolean }) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  history: PlacedItem[][];
  pushHistory: () => void;
  undo: () => void;

  selectedId: string | null;
  select: (id: string | null) => void;
  tool: Tool;
  setTool: (t: Tool) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  scanning: boolean;
  setScanning: (s: boolean) => void;
  capturing: boolean;
  setCapturing: (c: boolean) => void;

  cart: CartLine[];
  addToCart: (productId: string, color: string, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  plusCard: { last4: string; points: number } | null;
  linkPlusCard: (num: string) => void;
  unlinkPlusCard: () => void;

  toast: ToastState | null;
  notify: (text: string) => void;
}

const emptyProject = (): Project => ({ name: 'Mein Garten', photoUrl: null, originalPhotoUrl: null, calibration: { ...DEFAULT_CALIBRATION }, items: [] });

export const useGarden = create<GardenState>()(
  persist(
    (set, get) => ({
      products: [],
      setProducts: (products) => set({ products: Array.isArray(products) ? products : [] }),
      product: (id) => get().products.find((p) => p.id === id),

      project: emptyProject(),
      photoAspect: 4 / 3,
      dirty: false,
      setProject: (project) => set({ project, history: [], selectedId: null, dirty: false }),
      newProject: () => set({ project: emptyProject(), history: [], selectedId: null, dirty: false, photoAspect: 4 / 3 }),
      setPhoto: (url, aspect, opts) =>
        set((s) => ({
          photoAspect: aspect,
          dirty: true,
          project: { ...s.project, photoUrl: url, originalPhotoUrl: opts?.keepOriginal ? s.project.originalPhotoUrl ?? url : url },
        })),
      setCalibration: (c) => set((s) => ({ dirty: true, project: { ...s.project, calibration: { ...s.project.calibration, ...c } } })),
      rename: (name) => set((s) => ({ dirty: true, project: { ...s.project, name } })),

      items: () => get().project.items,
      addItem: (productId, color, at) => {
        const p = get().product(productId);
        if (!p) return null;
        get().pushHistory();
        const d = centreGroundDistance(get().project.calibration);
        const [x, z] = at ?? [(Math.random() - 0.5) * 3, -d - Math.random() * 1.5];
        const item: PlacedItem = {
          id: uid(), productId, color: color ?? p.colors[0].name,
          position: [x, 0, z], rotationY: 0, scale: [1, 1, 1],
        };
        set((s) => ({ dirty: true, selectedId: item.id, project: { ...s.project, items: [...s.project.items, item] } }));
        return item;
      },
      updateItem: (id, patch, opts) => {
        if (opts?.history) get().pushHistory();
        set((s) => ({ dirty: true, project: { ...s.project, items: s.project.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } }));
      },
      removeItem: (id) => {
        get().pushHistory();
        set((s) => ({ dirty: true, selectedId: s.selectedId === id ? null : s.selectedId, project: { ...s.project, items: s.project.items.filter((i) => i.id !== id) } }));
      },
      duplicateItem: (id) => {
        const it = get().project.items.find((i) => i.id === id);
        if (!it) return;
        get().pushHistory();
        const copy: PlacedItem = { ...it, id: uid(), position: [it.position[0] + 0.6, 0, it.position[2] + 0.3] };
        set((s) => ({ dirty: true, selectedId: copy.id, project: { ...s.project, items: [...s.project.items, copy] } }));
      },
      history: [],
      pushHistory: () => set((s) => ({ history: [...s.history.slice(-40), s.project.items] })),
      undo: () => {
        const h = get().history;
        if (!h.length) return;
        set((s) => ({ history: h.slice(0, -1), selectedId: null, dirty: true, project: { ...s.project, items: h[h.length - 1] } }));
      },

      selectedId: null,
      select: (selectedId) => set({ selectedId }),
      tool: 'move',
      setTool: (tool) => set({ tool }),
      view: 'photo',
      setView: (view) => set({ view }),
      scanning: false,
      setScanning: (scanning) => set({ scanning }),
      capturing: false,
      setCapturing: (capturing) => set({ capturing }),

      cart: [],
      addToCart: (productId, color, qty = 1) => {
        const key = `${productId}|${color}`;
        set((s) => {
          const ex = s.cart.find((l) => l.key === key);
          return { cart: ex ? s.cart.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...s.cart, { key, productId, color, qty }] };
        });
        const p = get().product(productId);
        get().notify(`${p?.name ?? 'Produkt'} (${color}) liegt im Warenkorb.`);
      },
      setQty: (key, qty) => set((s) => ({ cart: s.cart.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)) })),
      removeFromCart: (key) => set((s) => ({ cart: s.cart.filter((l) => l.key !== key) })),
      clearCart: () => set({ cart: [] }),
      plusCard: null,
      // Demo only: replace with the real PlusCard lookup
      linkPlusCard: (num) => set({ plusCard: { last4: num.slice(-4), points: 1240 } }),
      unlinkPlusCard: () => set({ plusCard: null }),

      toast: null,
      notify: (text) => set({ toast: { text, id: Date.now() } }),
    }),
    {
      name: 'bauhaus-garten-planer',
      partialize: (s) => ({ cart: s.cart, plusCard: s.plusCard, project: s.project, photoAspect: s.photoAspect }),
    },
  ),
);

/** Area in m² of a surface item (default dimensions × scale). */
export function surfaceArea(p: Product, it: PlacedItem) {
  return Math.max(1, Math.round(p.dimensions.w * it.scale[0] * p.dimensions.d * it.scale[2]));
}
