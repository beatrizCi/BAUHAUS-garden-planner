import { Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Product } from '../types';
import { cloneWithVariant } from '../three/variant';
import { surfaceTexture } from '../three/surfaceTextures';

/** One shared offscreen renderer produces product thumbnails (avoids a WebGL context per card). */
let renderer: WebGLRenderer | null = null;
const loader = new GLTFLoader();
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

export function productThumbnail(p: Product, colorName: string): Promise<string> {
  const hex = p.colors.find((c) => c.name === colorName)?.hex ?? p.colors[0].hex;
  const key = `${p.id}|${hex}`;
  if (!cache.has(key)) {
    const job = queue.then(() => (p.kind === 'surface' ? surfaceThumb(p, hex) : modelThumb(p, hex)));
    queue = job.catch(() => undefined);
    cache.set(key, job);
  }
  return cache.get(key)!;
}

function surfaceThumb(p: Product, hex: string) {
  const tex = surfaceTexture(p.material!, hex);
  return Promise.resolve((tex.image as HTMLCanvasElement).toDataURL('image/jpeg', 0.85));
}

async function modelThumb(p: Product, hex: string) {
  if (!renderer) {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(320, 240, false);
    renderer.outputColorSpace = SRGBColorSpace;
  }
  const gltf = await loader.loadAsync(p.modelUrl!);
  const obj = cloneWithVariant(gltf.scene, hex);
  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x8a7a60, 2.2));
  const sun = new DirectionalLight(0xffffff, 2); sun.position.set(3, 5, 4); scene.add(sun);
  scene.add(obj);
  const box = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3()), centre = box.getCenter(new Vector3());
  const cam = new PerspectiveCamera(30, 4 / 3, 0.01, 100);
  const dist = Math.max(size.x, size.y * 1.3, size.z) * 2.1;
  cam.position.set(centre.x + dist * 0.62, centre.y + dist * 0.42, centre.z + dist * 0.75);
  cam.lookAt(centre);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/png');
}
