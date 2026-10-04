// House (assets.html → HOUSE): farmhouse / summit hut. Sits on a pad, plinth 1.2 m below ground.
// Ported unchanged; the animated smoke and flags are listed in userData.live for bakeStatic().
import { CircleGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, box, catenary, cyl, glow, h3, mixC, paintFaces, rng, tube } from "../../art/kit";
import { rockGeo } from "./rocks";

type Live = { userData: { update?: (t: number) => void; live?: Group["children"] } };
const liveOf = (g: Group) => (g.userData.live ??= []) as Group["children"];

export interface HouseOpts { seed?: number; w?: number; d?: number; h?: number; walls?: "stone"; pitch?: number; shutter?: string; flags?: boolean }
export function buildHouse(opts: HouseOpts = {}) {
  const g = new Group(), rnd = rng(opts.seed || 12);
  const W = opts.w || 5, D = opts.d || 4, H = opts.h || 2.6, stoneWalls = opts.walls === "stone";
  const plaster = M("#EFE6D3", 0.95), timber = M("#5A4030", 0.85), stone = VC(0.95);
  // terrain pad + foundation plinth (goes 1.2 m BELOW ground: never floats on a slope)
  const circle = new CircleGeometry(Math.max(W, D) * 0.85, 40); circle.rotateX(-Math.PI / 2);
  add(g, paintFaces(circle, (c) => mixC(C("#7C6B52"), C("#8F8162"), h3(c.x * 3, 0, c.z * 3))), VC(1), [0, 0.005, 0]);
  add(g, box(W + 0.5, 1.6, D + 0.5), M("#837D73", 0.95), [0, -0.45, 0]);
  for (let x = -W / 2 - 0.2; x < W / 2 + 0.2; x += 0.4 + rnd() * 0.15) for (const z of [-(D / 2 + 0.26), D / 2 + 0.26]) add(g, rockGeo(500 + Math.floor(x * 10) + (z > 0 ? 50 : 0), 0.2 + rnd() * 0.06, 0.13, 0.06, 1, 0.7), stone, [x, 0.12 + rnd() * 0.12, z]);
  for (let z = -D / 2 - 0.1; z < D / 2 + 0.1; z += 0.4 + rnd() * 0.15) for (const x of [-(W / 2 + 0.26), W / 2 + 0.26]) add(g, rockGeo(600 + Math.floor(z * 10) + (x > 0 ? 50 : 0), 0.06, 0.13, 0.2 + rnd() * 0.06, 1, 0.7), stone, [x, 0.12 + rnd() * 0.12, z]);
  const base = 0.35;
  // walls
  const wallG = box(W, H, D);
  add(g, paintFaces(wallG, (c) => stoneWalls ? mixC(C("#8E887E"), C("#A49D90"), h3(Math.floor(c.x * 4), Math.floor(c.y * 6), Math.floor(c.z * 4))) : mixC(C("#D9CFBA"), C("#F2EADA"), ((c.y + H / 2) / H) * 0.8 + 0.2)), VC(0.95), [0, base + H / 2, 0]);
  if (stoneWalls) { for (let y = base + 0.25; y < base + H; y += 0.32) for (let x = -W / 2 + 0.2; x < W / 2; x += 0.45 + rnd() * 0.2) add(g, rockGeo(700 + Math.floor(x * 10 + y * 100), 0.22, 0.12, 0.05, 1, 0.8), stone, [x, y, D / 2 + 0.03]); }
  else {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, box(0.16, H, 0.16), timber, [sx * (W / 2 - 0.05), base + H / 2, sz * (D / 2 - 0.05)]);
    for (const sz of [-1, 1]) add(g, box(W + 0.02, 0.14, 0.05), timber, [0, base + H * 0.52, sz * (D / 2 + 0.01)]);
    for (const sz of [-1, 1]) add(g, box(W + 0.02, 0.16, 0.05), timber, [0, base + H - 0.08, sz * (D / 2 + 0.01)]);
    for (const sx of [-1, 1]) add(g, box(0.05, 0.14, D), timber, [sx * (W / 2 + 0.01), base + H * 0.52, 0]);
  }
  // windows: frame, warm glass, shutters, sill, flower box
  const win = (x: number, y: number, z: number, face: number) => {
    const grp = new Group(); grp.position.set(x, y, z); grp.rotation.y = face; g.add(grp);
    add(grp, new PlaneGeometry(0.62, 0.78), glow("#FFD9A0", 0.35), [0, 0, 0.03]);
    for (const [w, h, px, py] of [[0.74, 0.06, 0, 0.42], [0.74, 0.06, 0, -0.42], [0.06, 0.9, 0.34, 0], [0.06, 0.9, -0.34, 0], [0.62, 0.03, 0, 0], [0.03, 0.78, 0, 0]]) add(grp, box(w, h, 0.06), M("#F4EFE4", 0.7), [px, py, 0.05]);
    for (const sx of [-1, 1]) { add(grp, box(0.34, 0.84, 0.035), M(opts.shutter || "#5E7B5C", 0.7), [sx * 0.58, 0, 0.12], [0, sx * 0.35, 0]); for (let k = 0; k < 6; k++) add(grp, box(0.3, 0.015, 0.01), M("#4C6649", 0.7), [sx * 0.58, -0.34 + k * 0.13, 0.14], [0, sx * 0.35, 0]); }
    add(grp, box(0.8, 0.05, 0.16), M("#D8CFBE", 0.8), [0, -0.47, 0.1]);
    add(grp, box(0.7, 0.14, 0.16), M("#7A5A3E", 0.85), [0, -0.57, 0.17]);
    for (let k = 0; k < 9; k++) add(grp, new SphereGeometry(0.045, 8, 6), M(["#D8445A", "#F2C230", "#F4F0E6", "#E58AAE"][k % 4], 0.6), [-0.3 + k * 0.075, -0.46 + (k % 2) * 0.03, 0.2]);
  };
  win(-W * 0.25, base + H * 0.55, D / 2 + 0.03, 0); win(W * 0.28, base + H * 0.55, D / 2 + 0.03, 0); win(W / 2 + 0.03, base + H * 0.55, 0, Math.PI / 2); win(-W / 2 - 0.03, base + H * 0.55, 0, -Math.PI / 2);
  // door + step stones
  const dx = W * 0.02;
  add(g, box(0.9, 1.85, 0.08), M("#6A4A33", 0.85), [dx, base + 0.93, -D / 2 - 0.03]);
  for (let k = 0; k < 5; k++) add(g, box(0.16, 1.8, 0.02), M(k % 2 ? "#714F36" : "#634430", 0.85), [dx - 0.36 + k * 0.18, base + 0.93, -D / 2 - 0.08]);
  add(g, box(1.06, 0.1, 0.12), timber, [dx, base + 1.9, -D / 2 - 0.05]);
  add(g, new SphereGeometry(0.035, 8, 6), M("#2E2B27", 0.4, 0.8), [dx + 0.3, base + 0.95, -D / 2 - 0.11]);
  for (let k = 0; k < 3; k++) add(g, rockGeo(800 + k, 0.55 - k * 0.05, 0.12, 0.3, 1, 0.5), stone, [dx, 0.3 - k * 0.12, -D / 2 - 0.45 - k * 0.45]);
  // roof (tiles or shingles, laid in overlapping rows)
  const pitch = opts.pitch || 0.62, over = 0.45, half = D / 2 + over, rise = Math.tan(pitch) * (D / 2), slopeLen = half / Math.cos(pitch);
  const rows = Math.ceil(slopeLen / 0.28), tileTones = stoneWalls ? ["#6B5A48", "#5E4F40", "#77634E"] : ["#B5583C", "#A94E36", "#C2654A", "#9E4732"];
  for (const sz of [-1, 1]) {
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows, zz = sz * (t * half), yy = base + H + rise - t * slopeLen * Math.sin(pitch) - 0.02;
      add(g, box(W + over * 2, 0.06, 0.32), M(tileTones[Math.floor(rnd() * tileTones.length)], 0.8), [0, yy, zz], [sz * pitch, 0, 0]);
      if (!stoneWalls) for (let k = -W / 2 - over + 0.2; k < W / 2 + over; k += 0.26) add(g, cyl(0.06, 0.06, 0.3, 6), M(tileTones[Math.floor(rnd() * 4)], 0.8), [k, yy + 0.045 * Math.cos(pitch), zz - sz * 0.045 * Math.sin(pitch)], [sz * pitch + Math.PI / 2, 0, 0], [1, 1, 0.55]);
    }
  }
  add(g, cyl(0.11, 0.11, W + over * 2, 8), M(stoneWalls ? "#4F4236" : "#8E3F2C", 0.8), [0, base + H + rise + 0.04, 0], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) {
    const tri = new Shape(); tri.moveTo(-D / 2, 0); tri.lineTo(D / 2, 0); tri.lineTo(0, rise); tri.lineTo(-D / 2, 0);
    const tg = new ShapeGeometry(tri); tg.rotateY(Math.PI / 2);
    add(g, tg, stoneWalls ? M("#948D80", 0.95) : plaster, [sx * (W / 2 + 0.005), base + H, 0]).material.side = DoubleSide;
  }
  // chimney + smoke puffs
  const chX = W * 0.3, chH = rise + 1.0;
  add(g, box(0.5, chH, 0.5), M("#8E887E", 0.95), [chX, base + H + chH / 2 - 0.2, D * 0.15]);
  add(g, box(0.62, 0.08, 0.62), M("#6F6A62", 0.9), [chX, base + H + chH - 0.16, D * 0.15]);
  const smoke: Mesh<IcosahedronGeometry, MeshStandardMaterial>[] = [];
  for (let k = 0; k < 4; k++) { const sm = add(g, new IcosahedronGeometry(0.18 + k * 0.07, 1), new MeshStandardMaterial({ color: 0xf2efe8, transparent: true, opacity: 0.32 - k * 0.06, roughness: 1, flatShading: true }), [chX, base + H + chH + 0.1 + k * 0.35, D * 0.15]) as Mesh<IcosahedronGeometry, MeshStandardMaterial>; sm.castShadow = false; smoke.push(sm); liveOf(g).push(sm); }
  // porch props: bench, woodpile, potted plants
  add(g, box(1.4, 0.06, 0.38), M("#7A5A3E", 0.85), [-W * 0.28, 0.82, -D / 2 - 0.45]);
  for (const x of [-0.6, 0.6]) add(g, box(0.08, 0.4, 0.32), M("#5E4630", 0.85), [-W * 0.28 + x, 0.6, -D / 2 - 0.45]);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - r; k++) add(g, cyl(0.09, 0.09, 0.7, 8), M(k % 2 ? "#8C6B4A" : "#7A5C3F", 0.9), [W / 2 + 0.5, 0.44 + r * 0.16, -D / 2 + 0.5 + k * 0.18 + r * 0.09], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 3; k++) { add(g, cyl(0.14, 0.1, 0.22, 10), M("#B26A44", 0.8), [W * 0.16 + k * 0.38, 0.46, -D / 2 - 0.32]); add(g, new IcosahedronGeometry(0.17, 0), M("#5E7F42", 0.9, 0, { flatShading: true }), [W * 0.16 + k * 0.38, 0.66, -D / 2 - 0.32]); }
  if (opts.flags) {
    const a = new Vector3(-W / 2 - over, base + H + rise * 0.6, 0), b = new Vector3(-W / 2 - 4, 0.9, -1.2);
    add(g, cyl(0.05, 0.06, 1.2, 6), M("#5A4632", 0.9), [b.x, 0.6, b.z]);
    flagLine(g, a, b, 10, 0.5);
    for (const sx of [-0.7, 0.7]) add(g, box(0.2, 0.28, 0.2), glow("#FFC874", 1.2), [dx + sx, base + 1.7, -D / 2 - 0.2]);
  }
  chainUpdate(g, (t) => smoke.forEach((sm, k) => { const ph = (t * 0.25 + k * 0.25) % 1; sm.position.y = base + H + chH + 0.1 + ph * 1.6; sm.position.x = chX + ph * 0.5; sm.scale.setScalar(0.6 + ph * 1.4); sm.material.opacity = 0.34 * (1 - ph); }));
  return g;
}

export function flagLine(g: Group, a: Vector3, b: Vector3, n: number, sag: number) {
  const curve = catenary(a, b, sag), cols = ["#3E6FA8", "#F2EFE6", "#C9473A", "#4F8A54", "#E1B640"];
  add(g, tube(curve, 0.008, 24, 4), M("#D9C9A0", 0.95));
  const flags: Mesh[] = [];
  for (let i = 1; i <= n; i++) { const p = curve.getPoint(i / (n + 1)); const f = add(g, new PlaneGeometry(0.26, 0.32, 4, 1), M(cols[i % 5], 0.9, 0, { side: DoubleSide }), [p.x, p.y - 0.17, p.z]); f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2; f.castShadow = false; flags.push(f); liveOf(g).push(f); }
  chainUpdate(g, (t) => flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 2.4 + i) * 0.25; }));
}

/** Run fn after whatever update the model already has (the lab's chainUpdate). */
export function chainUpdate(g: Live, fn: (t: number) => void) { const prev = g.userData.update; g.userData.update = (t: number) => { if (prev) prev(t); fn(t); }; }

