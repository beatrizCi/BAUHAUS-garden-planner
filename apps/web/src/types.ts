export interface ProductColor { name: string; hex: string }

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  unit: string | null;
  kind: 'object' | 'surface';
  colors: ProductColor[];
  modelUrl: string | null;
  /** Real product photo (transparent PNG); shown as an upright cut-out when there is no 3D model. */
  imageUrl?: string | null;
  sourceUrl?: string | null;
  material: 'tiles' | 'lawn' | 'gravel' | 'deck' | null;
  dimensions: { w: number; h: number; d: number };
  keywords: string[];
  inStock: boolean;
}

/** Placed product. Meters; ground is y = 0, the photo camera looks down -Z. */
export interface PlacedItem {
  id: string;
  productId: string;
  color: string;
  position: [number, number, number];
  rotationY: number;
  scale: [number, number, number];
}

export interface Calibration { horizon: number; fov: number; cameraHeight: number }

export interface Project {
  id?: string;
  name: string;
  photoUrl: string | null;
  originalPhotoUrl: string | null;
  thumbnailUrl?: string | null;
  calibration: Calibration;
  items: PlacedItem[];
  updatedAt?: string;
}

export interface Segment {
  id: string;
  label: string;
  score: number | null;
  maskUrl: string;
  removable: boolean;
  bbox: { x: number; y: number; w: number; h: number; area: number };
}

export interface Suggestion { productId: string; color: string; x: number; z: number; rotationY: number; reason: string }

export interface CartLine { key: string; productId: string; color: string; qty: number }

export type Tool = 'move' | 'rotate' | 'scale' | 'measure' | 'erase' | 'calibrate';
export type ViewMode = 'photo' | '3d';
