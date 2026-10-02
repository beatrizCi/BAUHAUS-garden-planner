import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PlacedItem, Product } from '../types';
import { cloneWithVariant } from '../three/variant';
import { surfaceTexture, TILE_METERS } from '../three/surfaceTextures';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Object3D>>();
const load = (url: string) => {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url).then((g) => g.scene));
  return cache.get(url)!;
};

/**
 * Builds the plan (or a subset) as a plain three.js group, centred on its footprint,
 * for WebXR and USDZ export. Positions stay in real meters.
 */
export async function buildLayout(items: PlacedItem[], products: Product[]): Promise<Group> {
  const group = new Group();
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) continue;
    const hex = p.colors.find((c) => c.name === it.color)?.hex ?? p.colors[0].hex;
    let obj: Object3D;
    if (p.kind === 'surface' && p.material) {
      const tex = surfaceTexture(p.material, hex).clone();
      tex.repeat.set(p.dimensions.w / TILE_METERS[p.material], p.dimensions.d / TILE_METERS[p.material]);
      tex.needsUpdate = true;
      const m = new Mesh(new PlaneGeometry(p.dimensions.w, p.dimensions.d), new MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.receiveShadow = true;
      obj = new Group(); obj.add(m);
    } else if (p.modelUrl) {
      obj = cloneWithVariant(await load(p.modelUrl), hex);
    } else continue;
    obj.position.set(...it.position);
    obj.rotation.y = (it.rotationY * Math.PI) / 180;
    obj.scale.set(...it.scale);
    group.add(obj);
  }
  // centre on the footprint so the tap point becomes the middle of the plan
  const box = new Box3().setFromObject(group);
  const c = box.getCenter(new Vector3());
  group.children.forEach((ch) => { ch.position.x -= c.x; ch.position.z -= c.z; });
  return group;
}
