// Art kit: the Asset Lab's core helpers (reference/assets.html → CORE HELPERS), ported as-is,
// plus mergeByMaterial() so a built model costs one draw call per material.
// three r169 manages colour: `new Color(hex)` is already linear, so lin() doesn't convert again.
import {
  AdditiveBlending, BoxGeometry, CanvasTexture, Sprite, SpriteMaterial, BufferAttribute, BufferGeometry, Color, CylinderGeometry, CurvePath, Group, LatheGeometry, Material, Matrix4, Mesh,
  InstancedMesh, MeshStandardMaterial, Object3D, QuadraticBezierCurve3, TubeGeometry, Vector2, Vector3, type Curve, type MeshStandardMaterialParameters,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type V3 = [number, number, number] | null | undefined;

export const lin = (h: string) => new Color(h);
export const C = lin;
const matCache = new Map<string, MeshStandardMaterial>();
export function M(hex: string, rough = 0.8, metal = 0, extra?: MeshStandardMaterialParameters) {
  const k = hex + rough + metal + JSON.stringify(extra || {});
  if (!matCache.has(k)) matCache.set(k, new MeshStandardMaterial(Object.assign({ color: lin(hex), roughness: rough, metalness: metal }, extra || {})));
  return matCache.get(k)!;
}
export const VC = (rough = 0.9, extra?: MeshStandardMaterialParameters) => new MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: rough, flatShading: true }, extra || {}));

/** Emissive materials and their base intensity; scaled by time of day (updateGlow). */
const emissives: { m: MeshStandardMaterial; base: number }[] = [];
const glowCache = new Map<string, MeshStandardMaterial>();
export function glow(hex: string, base: number) {
  const k = hex + base;
  if (!glowCache.has(k)) {
    const m = new MeshStandardMaterial({ color: lin(hex), emissive: lin(hex), emissiveIntensity: base, roughness: 0.4 });
    glowCache.set(k, m);
    emissives.push({ m, base });
  }
  return glowCache.get(k)!;
}
/** The lab's glow presets: morning .35, golden .7, night 2.2. tod 0 dawn … 3 golden, 4 sunset. */
export let glowLevel = 0.7;
export function updateGlow(tod: number) {
  const k = glowLevel = tod < 1 ? 0.9 - tod * 0.55 : tod < 2 ? 0.35 : tod < 3 ? 0.35 + (tod - 2) * 0.35 : 0.7 + (tod - 3) * 0.9;
  for (const e of emissives) e.m.emissiveIntensity = e.base * k;
}

export function add(parent: Object3D, geo: BufferGeometry, mat: Material, p?: V3, r?: V3, s?: number | V3) {
  const m = new Mesh(geo, mat);
  if (p) m.position.set(p[0], p[1], p[2]);
  if (r) m.rotation.set(r[0], r[1], r[2]);
  if (s) typeof s === "number" ? m.scale.setScalar(s) : m.scale.set(s[0], s[1], s[2]);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
export const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 12) => new CylinderGeometry(rt, rb, h, seg);
export function rng(seed: number) { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function h3(x: number, y: number, z: number) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); }
export function n3(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (i: number, j: number, k: number) => h3(xi + i, yi + j, zi + k);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
/** paint a flat-shaded geometry face by face: fn(centroid, normal, faceIndex) -> Color */
export function paintFaces(geo: BufferGeometry, fn: (c: Vector3, n: Vector3, f: number) => Color) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal, cols = new Float32Array(p.count * 3);
  const c = new Vector3(), nn = new Vector3();
  for (let f = 0; f < p.count / 3; f++) {
    c.set(0, 0, 0); nn.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { const i = f * 3 + k; c.x += p.getX(i) / 3; c.y += p.getY(i) / 3; c.z += p.getZ(i) / 3; nn.x += n.getX(i); nn.y += n.getY(i); nn.z += n.getZ(i); }
    nn.normalize();
    const col = fn(c, nn, f);
    for (let k = 0; k < 3; k++) { const i = (f * 3 + k) * 3; cols[i] = col.r; cols[i + 1] = col.g; cols[i + 2] = col.b; }
  }
  geo.setAttribute("color", new BufferAttribute(cols, 3));
  return geo;
}
export const mixC = (a: Color, b: Color, t: number) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
export function catenary(a: Vector3, b: Vector3, sag: number) { const mid = a.clone().lerp(b, 0.5); mid.y -= sag; return new QuadraticBezierCurve3(a, mid, b); }
export const tube = (curve: Curve<Vector3> | CurvePath<Vector3>, r: number, seg = 20, rad = 6) => new TubeGeometry(curve as Curve<Vector3>, seg, r, rad, false);
export const lathe = (pts: [number, number][], seg: number) => new LatheGeometry(pts.map((p) => new Vector2(p[0], p[1])), seg);

/* ============ ASSET: WHEEL (shared by all vehicles) ============ */
export function buildWheel(r: number, w: number, opts: { blocks?: number; rim?: string; hub?: string } = {}) {
  const g = new Group(), inner = r * 0.6, rr = Math.min(w * 0.32, r * 0.18), pts: Vector2[] = [];
  pts.push(new Vector2(inner, -w / 2));
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i / 5) * Math.PI / 2; pts.push(new Vector2(r - rr + Math.cos(a) * rr, -w / 2 + rr + Math.sin(a) * rr)); }
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(new Vector2(r - rr + Math.cos(a) * rr, w / 2 - rr + Math.sin(a) * rr)); }
  pts.push(new Vector2(inner, w / 2));
  const tire = new LatheGeometry(pts, 28); tire.rotateZ(Math.PI / 2);
  const rubber = M("#232220", 0.95);
  add(g, tire, rubber);
  const n = opts.blocks || 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, side = i % 2 ? 1 : -1;
    const b = add(g, box(w * 0.42, r * 0.09, r * 0.16), rubber, [side * w * 0.2, Math.cos(a) * (r + r * 0.02), Math.sin(a) * (r + r * 0.02)], [a, 0, 0]);
    b.castShadow = false;
  }
  const rim = M(opts.rim || "#B9B4A8", 0.35, 0.7);
  add(g, cyl(inner * 0.98, inner * 0.98, w * 0.72, 20), rim, null, [0, 0, Math.PI / 2]);
  add(g, cyl(inner * 0.55, inner * 0.7, w * 0.8, 16), M(opts.hub || "#8E897F", 0.4, 0.6), null, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(g, cyl(r * 0.035, r * 0.035, w * 0.86, 6), M("#4A4740", 0.5, 0.6), [0, Math.cos(a) * inner * 0.38, Math.sin(a) * inner * 0.38], [0, 0, Math.PI / 2]); }
  return g;
}

/* ============ merging + instancing ============ */
const _m = new Matrix4(), _inv = new Matrix4(), _im = new Matrix4(), _c = new Color(), _c2 = new Color();
/** Materials that look the same merge together (VC() makes a fresh material per call). */
function matKey(mat: Material) {
  const m = mat as MeshStandardMaterial;
  return [m.type, m.color?.getHex(), m.roughness, m.metalness, m.vertexColors, m.side, m.transparent, m.opacity, m.flatShading, m.emissive?.getHex(), m.emissiveIntensity].join('|');
}
const bakedMats = new Map<string, MeshStandardMaterial>();
/** A plain opaque, non-glowing standard material can become vertex colour on a shared material. */
function bakeable(mat: Material) {
  const m = mat as MeshStandardMaterial;
  return m.isMeshStandardMaterial && !m.transparent && !m.map && m.emissive.getHex() === 0;
}
/**
 * Bake every mesh under root (instanced ones expanded, instance colours baked into vertex colours)
 * into one mesh per material look and shadow flag. With `bake`, plain colours become vertex colours
 * too, so a whole prop collapses to two or three draws. Returns a new group; root's transform is ignored.
 */
export function mergeByMaterial(root: Object3D, bake = false) {
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: Material; cast: boolean; geos: BufferGeometry[] }>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    let mat = m.material as Material;
    const sm = mat as MeshStandardMaterial, baked = bake && bakeable(mat);
    let key = matKey(mat);
    if (baked) {
      const metal = sm.metalness >= 0.3;
      // one look per side + metal class, flat-shaded (the low-poly look): a prop becomes 2–3 draws
      key = ['bake', sm.side, metal].join('|');
      if (!bakedMats.has(key)) bakedMats.set(key, new MeshStandardMaterial({ vertexColors: true, roughness: metal ? 0.35 : 0.9, metalness: metal ? 0.6 : 0, flatShading: true, side: sm.side }));
      mat = bakedMats.get(key)!;
    }
    key += m.castShadow ? 'c' : '';
    const vc = !!(mat as MeshStandardMaterial).vertexColors, hadColor = !!sm.vertexColors;
    const inst = (m as InstancedMesh).isInstancedMesh ? (m as InstancedMesh) : null;
    const base = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    for (let i = 0; i < (inst ? inst.count : 1); i++) {
      const g = base.clone();
      _m.multiplyMatrices(_inv, m.matrixWorld);
      if (inst) { inst.getMatrixAt(i, _im); _m.multiply(_im); }
      g.applyMatrix4(_m);
      for (const at of Object.keys(g.attributes)) if (at !== 'position' && at !== 'normal' && !(at === 'color' && hadColor)) g.deleteAttribute(at);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (vc) {
        if (!g.attributes.color) g.setAttribute('color', new BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
        _c.setRGB(1, 1, 1);
        if (baked) _c.copy(sm.color);
        if (inst?.instanceColor) { inst.getColorAt(i, _c2); _c.multiply(_c2); }
        const col = g.attributes.color;
        if (_c.r !== 1 || _c.g !== 1 || _c.b !== 1) for (let k = 0; k < col.count; k++) col.setXYZ(k, col.getX(k) * _c.r, col.getY(k) * _c.g, col.getZ(k) * _c.b);
      }
      if (!buckets.has(key)) buckets.set(key, { mat, cast: m.castShadow, geos: [] });
      buckets.get(key)!.geos.push(g);
    }
  });
  const out = new Group();
  for (const b of buckets.values()) {
    const mesh = new Mesh(mergeGeometries(b.geos), b.mat);
    mesh.castShadow = b.cast; mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}

/** Static props merged per map cell (for many small varied things like rocks): one draw per cell per look. */
export function mergedAt(items: { model: Object3D; m: Matrix4 }[], cell = 96) {
  const cells = new Map<string, Group>();
  for (const it of items) {
    const k = Math.floor(it.m.elements[12] / cell) + ',' + Math.floor(it.m.elements[14] / cell);
    if (!cells.has(k)) cells.set(k, new Group());
    const o = it.model.clone(); o.matrixAutoUpdate = false; o.matrix.copy(it.m);
    cells.get(k)!.add(o);
  }
  const out = new Group();
  for (const g of cells.values()) out.add(...mergeByMaterial(g, true).children);
  return out;
}

/**
 * One InstancedMesh per part of a merged model per map cell (so off-screen cells are culled, in the
 * shadow pass too), placed at each matrix. `tint(i, c)` sets instance i's colour multiplier.
 */
export function instanced(model: Object3D, mats: Matrix4[], opts: { patch?: (m: Material) => Material; tint?: (i: number, c: Color) => void; cell?: number } = {}) {
  const out = new Group(), cell = opts.cell ?? 96;
  if (!mats.length) return out;
  const cells = new Map<string, number[]>();
  mats.forEach((mt, i) => {
    const k = Math.floor(mt.elements[12] / cell) + "," + Math.floor(mt.elements[14] / cell);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k)!.push(i);
  });
  for (const part of mergeByMaterial(model, true).children as Mesh[]) {
    const mat = opts.patch ? opts.patch(part.material as Material) : (part.material as Material);
    for (const ids of cells.values()) {
      const im = new InstancedMesh(part.geometry, mat, ids.length);
      ids.forEach((id, j) => {
        im.setMatrixAt(j, mats[id]);
        if (opts.tint) { opts.tint(id, _c.setRGB(1, 1, 1)); im.setColorAt(j, _c); }
      });
      im.castShadow = part.castShadow; im.receiveShadow = true;
      im.computeBoundingSphere();
      out.add(im);
    }
  }
  return out;
}
/** Matrix for a placed prop: position, yaw, uniform or xyz scale, optional small lean. */
export function place(x: number, y: number, z: number, yaw = 0, s: number | [number, number, number] = 1, lean: [number, number] = [0, 0]) {
  const o = new Object3D();
  o.position.set(x, y, z); o.rotation.set(lean[0], yaw, lean[1]);
  typeof s === 'number' ? o.scale.setScalar(s) : o.scale.set(s[0], s[1], s[2]);
  o.updateMatrix();
  return o.matrix.clone();
}

/**
 * Merge a built prop for the game: everything static is baked, while the objects listed in
 * userData.live (smoke, flags, flames, lights, a swinging bell: direct children) stay as they are.
 */
export function bakeStatic(model: Object3D) {
  const keep: Object3D[] = model.userData.live ?? [];
  keep.forEach((o) => model.remove(o));
  // halos (sprites) survive the merge, placed where they were
  model.updateMatrixWorld(true);
  _inv.copy(model.matrixWorld).invert();
  const sprites: Sprite[] = [];
  model.traverse((o) => { if ((o as Sprite).isSprite) sprites.push(o as Sprite); });
  const out = mergeByMaterial(model, true);
  for (const sp of sprites) { const c = sp.clone(); c.matrix.multiplyMatrices(_inv, sp.matrixWorld); c.matrix.decompose(c.position, c.quaternion, c.scale); out.add(c); }
  if (keep.length) out.add(...keep);
  out.userData = model.userData;
  return out;
}

const _cv = new Vector3();
/**
 * Distance LOD for instanced cells: each InstancedMesh under g shows only while its cell centre is
 * between min and max metres from the camera. Call every frame.
 */
export function cullByDistance(g: Object3D, cam: Vector3, max: number, min = 0) {
  g.traverse((o) => {
    const im = o as InstancedMesh;
    if (!im.isInstancedMesh || !im.boundingSphere) return;
    const d = _cv.copy(im.boundingSphere.center).applyMatrix4(im.matrixWorld).distanceTo(cam);
    im.visible = d >= min && d < max;
  });
}

/** Soft additive glow sprite (the lab's halo(): stand-in for bloom on lamps). */
let haloTex: CanvasTexture | null = null;
/** light: the lab's point light strength; the game adds night lights later (phase 6), so it is unused for now */
export function halo(parent: Object3D, p: [number, number, number], hex: string, size = 0.5, _light = 0) {
  if (!haloTex) {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d")!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.2, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    haloTex = new CanvasTexture(c);
  }
  const s = new Sprite(new SpriteMaterial({ map: haloTex, color: new Color(hex), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.8 }));
  s.position.set(p[0], p[1], p[2]); s.scale.setScalar(size); parent.add(s);
  return s;
}
