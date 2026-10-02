// Generates simple low-poly placeholder .glb models for the demo catalog.
// Run: npm run models   →  apps/web/public/models/pXX.glb
//
// Every model uses real-world meters, sits on y = 0 and faces +Z.
// The material named "primary" is the one the app recolours for colour variants.
// Replace these files with the real product models from the 3D/PIM team when available.
import { Document, NodeIO } from '@gltf-transform/core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'models');
mkdirSync(OUT, { recursive: true });

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const hex = (h) => [1, 3, 5].map((i) => srgbToLinear(parseInt(h.slice(i, i + 2), 16) / 255));

const MATS = {
  primary: { color: '#3B3D40', rough: 0.7 },
  wood: { color: '#B5895B', rough: 0.8 },
  darkwood: { color: '#7D5C3A', rough: 0.8 },
  metal: { color: '#9A9DA1', rough: 0.35, metal: 0.8 },
  dark: { color: '#2A2A2A', rough: 0.6 },
  cushion: { color: '#E6E1D6', rough: 0.95 },
  rattan: { color: '#8D8273', rough: 0.9 },
  leaf: { color: '#5B7F45', rough: 0.9 },
  leaf2: { color: '#7E9A6A', rough: 0.9 },
  olive: { color: '#93AD7F', rough: 0.9 },
  trunk: { color: '#6B5640', rough: 0.95 },
  soil: { color: '#4A3626', rough: 1 },
  plume: { color: '#D9C9A3', rough: 0.95 },
  water: { color: '#4FB3D9', rough: 0.1, metal: 0.1 },
  glass: { color: '#8FB4CC', rough: 0.1, metal: 0.2 },
  roof: { color: '#4A4A4A', rough: 0.8 },
  rim: { color: '#D5D5D5', rough: 0.5 },
  light: { color: '#FFE7A3', rough: 0.4, emissive: '#FFD27A' },
};

// ---------------------------------------------------------------- geometry
function box() {
  const p = [], n = [], idx = [];
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
    [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ];
  for (const [N, U, V] of faces) {
    const b = p.length / 3;
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      p.push(...[0, 1, 2].map((k) => 0.5 * (N[k] + su * U[k] + sv * V[k])));
      n.push(...N);
    }
    // wind so the face points outward
    const cross = [U[1] * V[2] - U[2] * V[1], U[2] * V[0] - U[0] * V[2], U[0] * V[1] - U[1] * V[0]];
    const out = cross[0] * N[0] + cross[1] * N[1] + cross[2] * N[2] > 0;
    idx.push(...(out ? [b, b + 1, b + 2, b, b + 2, b + 3] : [b, b + 2, b + 1, b, b + 3, b + 2]));
  }
  return { p, n, idx };
}
/** Unit-height cylinder/cone centred at origin, radius 1 at bottom * rb, top * rt. */
function cylinder(rt = 1, rb = 1, seg = 20) {
  const p = [], n = [], idx = [];
  const slope = (rb - rt);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const len = Math.hypot(1, slope);
    p.push(c * rb, -0.5, s * rb, c * rt, 0.5, s * rt);
    n.push(c / len, slope / len, s / len, c / len, slope / len, s / len);
  }
  for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
  for (const [y, r, ny] of [[0.5, rt, 1], [-0.5, rb, -1]]) {
    if (r <= 0) continue;
    const c0 = p.length / 3; p.push(0, y, 0); n.push(0, ny, 0);
    for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; p.push(Math.cos(a) * r, y, Math.sin(a) * r); n.push(0, ny, 0); }
    for (let i = 0; i < seg; i++) idx.push(...(ny > 0 ? [c0, c0 + 2 + i, c0 + 1 + i] : [c0, c0 + 1 + i, c0 + 2 + i]));
  }
  return { p, n, idx };
}
function sphere(seg = 16, rings = 12) {
  const p = [], n = [], idx = [];
  for (let r = 0; r <= rings; r++) {
    const v = r / rings, phi = v * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const th = (s / seg) * Math.PI * 2;
      const x = Math.sin(phi) * Math.cos(th), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(th);
      p.push(x, y, z); n.push(x, y, z);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return { p, n, idx };
}
/** Triangular prism (gable roof), base 1 wide on x, apex at y = 1, depth 1 on z. */
function prism() {
  const tri = [[-0.5, 0], [0.5, 0], [0, 1]];
  const p = [], n = [], idx = [];
  for (const z of [0.5, -0.5]) {
    const b = p.length / 3;
    for (const [x, y] of tri) { p.push(x, y, z); n.push(0, 0, Math.sign(z)); }
    idx.push(...(z > 0 ? [b, b + 1, b + 2] : [b, b + 2, b + 1]));
  }
  const sides = [[0, 1], [1, 2], [2, 0]];
  for (const [i, j] of sides) {
    const [x1, y1] = tri[i], [x2, y2] = tri[j];
    let nx = y2 - y1, ny = -(x2 - x1); const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    const b = p.length / 3;
    p.push(x1, y1, 0.5, x2, y2, 0.5, x2, y2, -0.5, x1, y1, -0.5);
    for (let k = 0; k < 4; k++) n.push(nx, ny, 0);
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  return { p, n, idx };
}

const GEO = {
  box: () => box(), cyl: () => cylinder(1, 1), sphere: () => sphere(),
  cone: () => cylinder(0, 1, 24), prism: () => prism(),
  taper: () => cylinder(1, 0.82, 24), // planter pot
};

// part helpers: [geometry, material, size[x,y,z], position[x,y,z], rotation-euler-deg[x,y,z]]
const B = (m, s, t, r) => ['box', m, s, t, r];
const Cy = (m, radius, h, t, r) => ['cyl', m, [radius, h, radius], t, r];
const Sp = (m, rx, ry, rz, t) => ['sphere', m, [rx, ry, rz], t];
const Co = (m, radius, h, t, r) => ['cone', m, [radius, h, radius], t, r];

const MODELS = {
  p01: [ // lounge set
    B('primary', [2.0, 0.32, 0.85], [-0.3, 0.24, 0]), B('primary', [2.0, 0.42, 0.14], [-0.3, 0.6, -0.36]),
    B('primary', [0.14, 0.55, 0.85], [-1.33, 0.36, 0]), B('primary', [0.14, 0.55, 0.85], [0.73, 0.36, 0]),
    B('cushion', [0.94, 0.12, 0.68], [-0.78, 0.46, 0.05]), B('cushion', [0.94, 0.12, 0.68], [0.18, 0.46, 0.05]),
    B('cushion', [0.92, 0.34, 0.12], [-0.78, 0.66, -0.24], [-10, 0, 0]), B('cushion', [0.92, 0.34, 0.12], [0.18, 0.66, -0.24], [-10, 0, 0]),
    ...[[-1.3, -0.38], [-1.3, 0.38], [0.7, -0.38], [0.7, 0.38]].map(([x, z]) => B('dark', [0.05, 0.08, 0.05], [x, 0.04, z])),
    B('wood', [0.6, 0.05, 0.6], [1.0, 0.4, 0.1]),
    ...[[0.74, -0.16], [0.74, 0.36], [1.26, -0.16], [1.26, 0.36]].map(([x, z]) => B('metal', [0.04, 0.38, 0.04], [x, 0.19, z])),
  ],
  p02: [ // dining set
    B('primary', [1.8, 0.04, 0.9], [0, 0.74, 0]),
    ...[[-0.82, -0.38], [-0.82, 0.38], [0.82, -0.38], [0.82, 0.38]].map(([x, z]) => B('dark', [0.06, 0.72, 0.06], [x, 0.36, z])),
    ...[-0.6, 0, 0.6].flatMap((x) => [-1, 1].flatMap((side) => [
      B('rattan', [0.46, 0.06, 0.46], [x, 0.45, side * 0.68]),
      B('rattan', [0.46, 0.46, 0.05], [x, 0.7, side * 0.9], [side * 8, 0, 0]),
      B('cushion', [0.42, 0.05, 0.42], [x, 0.5, side * 0.68]),
      ...[[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]].map(([dx, dz]) => B('dark', [0.03, 0.42, 0.03], [x + dx, 0.21, side * 0.68 + dz])),
    ])),
  ],
  p03: [ // sun lounger
    B('primary', [0.66, 0.06, 1.35], [0, 0.32, 0.28]), B('primary', [0.66, 0.06, 0.62], [0, 0.52, -0.6], [-42, 0, 0]),
    B('cushion', [0.6, 0.05, 1.3], [0, 0.37, 0.28]),
    ...[[-0.3, 0.9], [0.3, 0.9], [-0.3, -0.3], [0.3, -0.3]].map(([x, z]) => B('dark', [0.04, 0.3, 0.04], [x, 0.15, z])),
  ],
  p04: [ // parasol
    B('dark', [0.9, 0.08, 0.9], [0, 0.04, 0]), Cy('metal', 0.025, 2.35, [0, 1.2, 0]),
    Co('primary', 1.5, 0.45, [0, 2.2, 0]), Cy('primary', 1.5, 0.08, [0, 1.97, 0]),
  ],
  p05: [ // pergola 4 x 3 m
    ...[[-1.94, -1.44], [-1.94, 1.44], [1.94, -1.44], [1.94, 1.44]].map(([x, z]) => B('primary', [0.12, 2.5, 0.12], [x, 1.25, z])),
    B('primary', [4.0, 0.16, 0.12], [0, 2.42, -1.44]), B('primary', [4.0, 0.16, 0.12], [0, 2.42, 1.44]),
    B('primary', [0.12, 0.16, 3.0], [-1.94, 2.42, 0]), B('primary', [0.12, 0.16, 3.0], [1.94, 2.42, 0]),
    ...Array.from({ length: 16 }, (_, i) => B('primary', [0.18, 0.025, 2.86], [-1.8 + i * 0.24, 2.44, 0], [0, 0, 35])),
  ],
  p06: [ // gas grill
    B('primary', [0.8, 0.72, 0.55], [0, 0.44, 0]), Cy('primary', 0.3, 0.8, [0, 0.82, -0.02], [0, 0, 90]),
    B('metal', [0.32, 0.03, 0.5], [-0.58, 0.8, 0]), B('metal', [0.32, 0.03, 0.5], [0.58, 0.8, 0]),
    B('metal', [0.6, 0.03, 0.03], [0, 0.98, 0.32]),
    ...[-0.3, 0.3].map((x) => Cy('dark', 0.08, 0.05, [x, 0.08, -0.2], [0, 0, 90])),
    ...[-0.24, -0.08, 0.08, 0.24].map((x) => Cy('metal', 0.022, 0.03, [x, 0.72, 0.28], [90, 0, 0])),
  ],
  p07: [ // kettle grill
    Sp('primary', 0.3, 0.28, 0.3, [0, 0.82, 0]), B('dark', [0.14, 0.03, 0.03], [0, 1.12, 0]),
    ...[0, 120, 240].map((a) => { const r = (a * Math.PI) / 180; return Cy('metal', 0.014, 0.72, [Math.cos(r) * 0.2, 0.36, Math.sin(r) * 0.2]); }),
    Cy('metal', 0.18, 0.02, [0, 0.3, 0]), Cy('dark', 0.07, 0.04, [0.22, 0.07, 0], [0, 0, 90]),
  ],
  p08: [ // olive tree in pot
    ['taper', 'primary', [0.32, 0.55, 0.32], [0, 0.275, 0]], Cy('soil', 0.3, 0.02, [0, 0.55, 0]),
    Cy('trunk', 0.045, 0.9, [0, 0.95, 0], [0, 0, 4]),
    Sp('leaf2', 0.42, 0.34, 0.42, [0, 1.45, 0]), Sp('olive', 0.28, 0.22, 0.28, [0.22, 1.6, 0.1]),
    Sp('leaf2', 0.26, 0.2, 0.26, [-0.22, 1.38, -0.1]), Sp('olive', 0.2, 0.16, 0.2, [0, 1.7, -0.12]),
  ],
  p09: [ // fountain grass
    ...Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2, tilt = 14 + (i % 3) * 6;
      return Co(i % 2 ? 'primary' : 'leaf2', 0.035, 0.62, [Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08], [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt]);
    }),
    ...Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      return Sp('plume', 0.04, 0.11, 0.04, [Math.cos(a) * 0.22, 0.62, Math.sin(a) * 0.22]);
    }),
  ],
  p10: [ // hydrangea
    Sp('leaf', 0.4, 0.26, 0.4, [0, 0.26, 0]), Sp('leaf', 0.25, 0.18, 0.25, [0.22, 0.32, 0.1]),
    ...[[0, 0.55, 0], [0.22, 0.48, 0.12], [-0.2, 0.47, 0.1], [0.05, 0.5, -0.22], [-0.15, 0.45, -0.16]].map((t) => Sp('primary', 0.14, 0.12, 0.14, t)),
  ],
  p11: [ // square planter + boxwood ball
    B('primary', [0.5, 0.6, 0.5], [0, 0.3, 0]), B('primary', [0.54, 0.04, 0.54], [0, 0.6, 0]),
    Sp('leaf', 0.27, 0.27, 0.27, [0, 0.86, 0]),
  ],
  p12: [ // raised bed
    B('primary', [1.6, 0.8, 0.06], [0, 0.42, 0.37]), B('primary', [1.6, 0.8, 0.06], [0, 0.42, -0.37]),
    B('primary', [0.06, 0.8, 0.8], [-0.77, 0.42, 0]), B('primary', [0.06, 0.8, 0.8], [0.77, 0.42, 0]),
    B('soil', [1.5, 0.04, 0.7], [0, 0.78, 0]),
    ...[-0.6, -0.3, 0, 0.3, 0.6].flatMap((x, i) => [Sp(i % 2 ? 'leaf' : 'leaf2', 0.13, 0.1, 0.13, [x, 0.86, -0.15]), Sp('leaf', 0.11, 0.09, 0.11, [x + 0.12, 0.85, 0.18])]),
    ...[-0.74, 0.74].map((x) => B('darkwood', [0.08, 0.04, 0.8], [x, 0.02, 0])),
  ],
  p13: [ // hose reel
    Cy('primary', 0.22, 0.34, [0, 0.42, 0], [0, 0, 90]), Cy('leaf', 0.17, 0.3, [0, 0.42, 0], [0, 0, 90]),
    B('dark', [0.04, 0.8, 0.04], [-0.22, 0.42, -0.05], [12, 0, 0]), B('dark', [0.04, 0.8, 0.04], [0.22, 0.42, -0.05], [12, 0, 0]),
    B('dark', [0.48, 0.04, 0.04], [0, 0.82, -0.14]),
    Cy('dark', 0.1, 0.05, [-0.26, 0.1, 0.08], [0, 0, 90]), Cy('dark', 0.1, 0.05, [0.26, 0.1, 0.08], [0, 0, 90]),
  ],
  p14: [ // privacy screen 180 x 180
    B('dark', [0.09, 1.86, 0.09], [-0.95, 0.93, 0]), B('dark', [0.09, 1.86, 0.09], [0.95, 0.93, 0]),
    ...Array.from({ length: 13 }, (_, i) => B('primary', [1.8, 0.125, 0.025], [0, 0.1 + i * 0.135, 0])),
    B('dark', [1.92, 0.04, 0.06], [0, 1.82, 0]),
  ],
  p15: [ // garden shed 2.5 x 2.5
    B('primary', [2.5, 2.0, 2.5], [0, 1.0, 0]), ['prism', 'primary', [2.5, 0.72, 2.5], [0, 2.0, 0]],
    B('roof', [1.5, 0.05, 2.8], [-0.66, 2.37, 0], [0, 0, 30]), B('roof', [1.5, 0.05, 2.8], [0.66, 2.37, 0], [0, 0, -30]),
    B('darkwood', [0.85, 1.85, 0.04], [0, 0.93, 1.26]), B('metal', [0.04, 0.12, 0.04], [0.3, 0.95, 1.29]),
    B('rim', [0.6, 0.5, 0.03], [-0.85, 1.25, 1.26]), B('glass', [0.5, 0.4, 0.03], [-0.85, 1.25, 1.275]),
    B('rim', [0.03, 0.5, 0.6], [1.26, 1.25, 0]), B('glass', [0.03, 0.4, 0.5], [1.275, 1.25, 0]),
  ],
  p16: [ // round pool 3.6 m
    Cy('primary', 1.8, 0.88, [0, 0.44, 0]), Cy('water', 1.74, 0.02, [0, 0.82, 0]), Cy('rim', 1.84, 0.05, [0, 0.885, 0]),
  ],
  p17: [ // path bollard
    Cy('primary', 0.05, 0.52, [0, 0.26, 0]), Cy('light', 0.055, 0.06, [0, 0.5, 0]), Cy('primary', 0.065, 0.03, [0, 0.545, 0]),
  ],
};

function euler(deg = [0, 0, 0]) {
  const [x, y, z] = deg.map((d) => (d * Math.PI) / 360);
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  return [sx * cy * cz - cx * sy * sz, cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz, cx * cy * cz + sx * sy * sz];
}

const io = new NodeIO();
for (const [id, parts] of Object.entries(MODELS)) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(id);
  const root = doc.createNode(id);
  scene.addChild(root);
  const mats = {}, meshes = {};
  const mat = (name) => mats[name] ??= (() => {
    const d = MATS[name];
    const m = doc.createMaterial(name).setBaseColorFactor([...hex(d.color), 1]).setRoughnessFactor(d.rough ?? 0.8).setMetallicFactor(d.metal ?? 0);
    if (d.emissive) m.setEmissiveFactor(hex(d.emissive));
    return m;
  })();
  const mesh = (geo, m) => meshes[geo + m] ??= (() => {
    const g = GEO[geo]();
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.p)).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(g.n)).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(g.idx)).setBuffer(buffer))
      .setMaterial(mat(m));
    return doc.createMesh(`${geo}-${m}`).addPrimitive(prim);
  })();
  for (const [geo, m, size, pos, rot] of parts) {
    root.addChild(doc.createNode().setMesh(mesh(geo, m)).setTranslation(pos).setRotation(euler(rot)).setScale(size));
  }
  await io.write(join(OUT, `${id}.glb`), doc);
}
console.log(`Wrote ${Object.keys(MODELS).length} models to ${OUT}`);
