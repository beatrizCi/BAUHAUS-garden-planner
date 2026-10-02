import { Canvas, ThreeEvent, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, TransformControls, useGLTF, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Object3D, PerspectiveCamera, Plane, SRGBColorSpace, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGarden } from '../store';
import type { PlacedItem, Product } from '../types';
import { cameraPitch } from '../lib/format';
import { renderRef } from '../lib/capture';
import { cloneWithVariant } from './variant';
import { surfaceTexture, TILE_METERS } from './surfaceTextures';
import { ScanGrid } from './ScanGrid';

const GROUND = new Plane(new Vector3(0, 1, 0), 0);
const tmp = new Vector3();

export function GardenCanvas() {
  const select = useGarden((s) => s.select);
  return (
    <Canvas
      shadows
      flat
      dpr={[1, 2]}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      camera={{ fov: 55, near: 0.05, far: 250, position: [0, 1.6, 0] }}
      onCreated={({ gl }) => { renderRef.gl = gl; }}
      onPointerMissed={() => select(null)}
    >
      <Scene />
    </Canvas>
  );
}

function Scene() {
  const view = useGarden((s) => s.view);
  const photoUrl = useGarden((s) => s.project.photoUrl);
  const items = useGarden((s) => s.project.items);
  const scanning = useGarden((s) => s.scanning);
  const tool = useGarden((s) => s.tool);
  const capturing = useGarden((s) => s.capturing);

  return (
    <>
      {view === 'photo' && photoUrl ? (
        <Suspense fallback={null}><PhotoBackground url={photoUrl} /></Suspense>
      ) : (
        <color attach="background" args={['#cfe3f3']} />
      )}
      {view === '3d' && <fog attach="fog" args={['#cfe3f3', 25, 80]} />}
      <hemisphereLight args={['#ffffff', '#8a7a60', 1.1]} />
      <directionalLight
        position={[4, 10, -1]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <CameraRig />
      <Ground />
      <Suspense fallback={null}>
        {items.map((it, i) => <ItemNode key={it.id} item={it} order={i} />)}
      </Suspense>
      <SelectedGizmo />
      {(scanning || tool === 'calibrate') && !capturing && <ScanGrid sweep={scanning} />}
      {tool === 'measure' && <MeasureTool />}
    </>
  );
}

/** Photo as scene background; the canvas has the photo's aspect ratio so it maps 1:1. */
function PhotoBackground({ url }: { url: string }) {
  const tex = useTexture(url);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    tex.colorSpace = SRGBColorSpace;
    scene.background = tex;
    return () => { scene.background = null; };
  }, [tex, scene]);
  return null;
}

/** Photo mode: camera matched to the photo via calibration. 3D mode: orbit around the plan. */
function CameraRig() {
  const view = useGarden((s) => s.view);
  const cal = useGarden((s) => s.project.calibration);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    if (view !== 'photo') return;
    camera.fov = cal.fov;
    camera.position.set(0, cal.cameraHeight, 0);
    camera.rotation.set(-cameraPitch(cal), 0, 0, 'YXZ');
    camera.updateProjectionMatrix();
  }, [view, cal, camera, size]);

  // 3D view: orbit around the middle of the plan
  const target = useMemo<[number, number, number]>(() => {
    const items = useGarden.getState().project.items;
    if (!items.length) return [0, 0, -5];
    const x = items.reduce((a, i) => a + i.position[0], 0) / items.length;
    const z = items.reduce((a, i) => a + i.position[2], 0) / items.length;
    return [x, 0, z];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useLayoutEffect(() => {
    if (view !== '3d') return;
    camera.fov = 50;
    camera.position.set(target[0] + 6, 6, target[2] + 7);
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [view, camera, target]);

  return view === '3d' ? <OrbitControls makeDefault target={target} maxPolarAngle={Math.PI / 2.08} minDistance={2} maxDistance={40} /> : null;
}

function Ground() {
  const view = useGarden((s) => s.view);
  const lawn = useMemo(() => {
    const t = surfaceTexture('lawn', '#6E9F48').clone();
    t.needsUpdate = true;
    t.repeat.set(60, 60);
    return t;
  }, []);
  if (view === 'photo') {
    return (
      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial transparent opacity={0.32} />
      </mesh>
    );
  }
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.002} receiveShadow raycast={() => null}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial map={lawn} roughness={1} />
    </mesh>
  );
}

// ------------------------------------------------------------------ items

function ItemNode({ item, order }: { item: PlacedItem; order: number }) {
  const product = useGarden((s) => s.products.find((p) => p.id === item.productId));
  const selected = useGarden((s) => s.selectedId === item.id);
  const capturing = useGarden((s) => s.capturing);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const drag = useRef<{ dx: number; dz: number } | null>(null);
  if (!product) return null;

  // Raycast against the ground plane so items slide along the floor under the pointer.
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = useGarden.getState();
    s.select(item.id);
    if (s.tool !== 'move') return;
    const hit = e.ray.intersectPlane(GROUND, tmp);
    if (!hit) return;
    s.pushHistory();
    drag.current = { dx: item.position[0] - hit.x, dz: item.position[2] - hit.z };
    (e.target as unknown as Element).setPointerCapture(e.pointerId);
    if (controls) controls.enabled = false;
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    e.stopPropagation();
    const hit = e.ray.intersectPlane(GROUND, tmp);
    if (!hit) return;
    useGarden.getState().updateItem(item.id, { position: [hit.x + drag.current.dx, 0, Math.min(-0.5, hit.z + drag.current.dz)] });
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    drag.current = null;
    (e.target as unknown as Element).releasePointerCapture(e.pointerId);
    if (controls) controls.enabled = true;
  };

  return (
    <group
      name={`item-${item.id}`}
      position={item.position}
      rotation-y={(item.rotationY * Math.PI) / 180}
      scale={item.scale}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = useGarden.getState().tool === 'move' ? 'grab' : 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      {product.kind === 'surface' ? <SurfacePatch product={product} color={item.color} order={order} /> : <GltfModel product={product} color={item.color} />}
      {selected && !capturing && <SelectionMarker product={product} />}
    </group>
  );
}

function GltfModel({ product, color }: { product: Product; color: string }) {
  const gltf = useGLTF(product.modelUrl!);
  const hex = product.colors.find((c) => c.name === color)?.hex ?? product.colors[0].hex;
  const obj = useMemo(() => cloneWithVariant(gltf.scene, hex), [gltf.scene, hex]);
  return <primitive object={obj} />;
}

function SurfacePatch({ product, color, order }: { product: Product; color: string; order: number }) {
  const hex = product.colors.find((c) => c.name === color)?.hex ?? product.colors[0].hex;
  const { w, d } = product.dimensions;
  const tex = useMemo(() => {
    const t = surfaceTexture(product.material!, hex).clone();
    const m = TILE_METERS[product.material!];
    t.repeat.set(w / m, d / m);
    t.needsUpdate = true;
    return t;
  }, [product.material, hex, w, d]);
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.004 + order * 0.0004} receiveShadow renderOrder={order}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={tex} roughness={product.material === 'tiles' ? 0.55 : 0.95} polygonOffset polygonOffsetFactor={-1 - order} />
    </mesh>
  );
}

function SelectionMarker({ product }: { product: Product }) {
  const r = Math.max(product.dimensions.w, product.dimensions.d) / 2 + 0.12;
  if (product.kind === 'surface') {
    const { w, d } = product.dimensions;
    const pts: [number, number, number][] = [[-w / 2, 0.03, -d / 2], [w / 2, 0.03, -d / 2], [w / 2, 0.03, d / 2], [-w / 2, 0.03, d / 2], [-w / 2, 0.03, -d / 2]];
    return <Line points={pts} color="#D9342B" lineWidth={3} dashed dashSize={0.25} gapSize={0.15} />;
  }
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02} raycast={() => null}>
      <ringGeometry args={[r, r + 0.06, 64]} />
      <meshBasicMaterial color="#D9342B" transparent opacity={0.9} depthTest={false} />
    </mesh>
  );
}

/** Rotate / scale with Three.js TransformControls; results are written back to the store on release. */
function SelectedGizmo() {
  const selectedId = useGarden((s) => s.selectedId);
  const tool = useGarden((s) => s.tool);
  const capturing = useGarden((s) => s.capturing);
  const items = useGarden((s) => s.project.items);
  const scene = useThree((s) => s.scene);
  const [obj, setObj] = useState<Object3D | null>(null);
  const item = items.find((i) => i.id === selectedId);
  const product = useGarden((s) => (item ? s.products.find((p) => p.id === item.productId) : undefined));

  useEffect(() => {
    if (!selectedId) { setObj(null); return; }
    // wait one frame so the group exists after a fresh placement
    const id = requestAnimationFrame(() => setObj(scene.getObjectByName(`item-${selectedId}`) ?? null));
    return () => cancelAnimationFrame(id);
  }, [selectedId, scene, items.length]);

  if (!obj || !item || !product || capturing || (tool !== 'rotate' && tool !== 'scale')) return null;
  const surface = product.kind === 'surface';
  return (
    <TransformControls
      object={obj}
      mode={tool}
      showX={tool === 'scale'}
      showY={tool === 'rotate' || (tool === 'scale' && !surface)}
      showZ={tool === 'scale'}
      size={0.9}
      onMouseDown={() => useGarden.getState().pushHistory()}
      onObjectChange={() => {
        // constrain: rotate around Y only; objects scale uniformly; surfaces stay flat
        obj.rotation.x = 0; obj.rotation.z = 0;
        if (!surface) { const s = Math.max(0.2, Math.min(4, tool === 'scale' ? (obj.scale.x + obj.scale.y + obj.scale.z) / 3 : obj.scale.x)); obj.scale.setScalar(s); }
        else obj.scale.y = 1;
      }}
      onMouseUp={() => {
        useGarden.getState().updateItem(item.id, {
          rotationY: Math.round(((obj.rotation.y * 180) / Math.PI) * 10) / 10,
          scale: [obj.scale.x, obj.scale.y, obj.scale.z].map((v) => Math.round(v * 100) / 100) as [number, number, number],
        });
      }}
    />
  );
}

// ------------------------------------------------------------------ measuring

function MeasureTool() {
  const [pts, setPts] = useState<Vector3[]>([]);
  const resetToken = useGarden((s) => s.project.items.length); // fresh start when items change
  useEffect(() => setPts([]), [resetToken]);
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const hit = e.ray.intersectPlane(GROUND, new Vector3());
    if (!hit) return;
    setPts((p) => (p.length >= 2 ? [hit] : [...p, hit]));
  };
  const dist = pts.length === 2 ? pts[0].distanceTo(pts[1]) : null;
  return (
    <>
      {/* invisible-but-raycastable hit plane (visible={false} would be skipped by the raycaster) */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.001} onPointerDown={onDown}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {pts.map((p, i) => (
        <mesh key={i} position={[p.x, 0.03, p.z]} raycast={() => null}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#D9342B" depthTest={false} />
        </mesh>
      ))}
      {dist !== null && (
        <>
          <Line points={[pts[0].clone().setY(0.03), pts[1].clone().setY(0.03)]} color="#D9342B" lineWidth={3} depthTest={false} />
          <Html position={pts[0].clone().lerp(pts[1], 0.5).setY(0.25)} center className="measure-label">
            {dist.toLocaleString('de-DE', { maximumFractionDigits: 2 })} m
          </Html>
        </>
      )}
    </>
  );
}

// preload so the slider feels instant
export function preloadModels(products: Product[]) {
  products.forEach((p) => p.modelUrl && useGLTF.preload(p.modelUrl));
}
