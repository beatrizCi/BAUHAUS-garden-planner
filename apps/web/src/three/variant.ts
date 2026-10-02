import { Color, Material, Mesh, MeshStandardMaterial, Object3D } from 'three';

/** Clone a loaded glTF scene and recolour its "primary" material (the product colour variant). */
export function cloneWithVariant(source: Object3D, hex: string): Object3D {
  const root = source.clone(true);
  const recolour = (m: Material) => {
    if (m.name !== 'primary') return m;
    const c = (m as MeshStandardMaterial).clone();
    c.color = new Color(hex);
    return c;
  };
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(recolour) : recolour(mesh.material);
  });
  return root;
}
