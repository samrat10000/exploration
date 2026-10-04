// Grass + wildflowers (assets.html → GRASS + WILDFLOWERS): the blade, ground tufts, and the lab's
// reference patch. The field shader (3.3) is built from bladeGeo().
import { CircleGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, QuadraticBezierCurve3, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, cyl, h3, lin, mixC, paintFaces, rng, tube } from "../../art/kit";
import { flowerGeo } from "./blossom";

export function bladeGeo(w = 0.045, h = 0.55, bend = 0.18) {
  const g = new PlaneGeometry(w, h, 1, 6); g.translate(0, h / 2, 0);
  const p = g.attributes.position, cols: number[] = [], base = C("#4C6232"), tip = C("#B9B86A");
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / h;
    p.setX(i, p.getX(i) * (1 - t * 0.9));
    p.setZ(i, bend * t * t);
    const c = mixC(base, tip, Math.pow(t, 1.3)); cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new Float32BufferAttribute(cols, 3));
  return g;
}

export function addTufts(parent: Object3D, n: number, r0: number, r1: number, seed: number, line?: boolean) {
  const rnd = rng(seed), d = new Object3D(), count = n * 9;
  const inst = new InstancedMesh(bladeGeo(0.035, 0.32, 0.08), new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.9 }), count);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, r = r0 + rnd() * (r1 - r0);
    const cx = line ? (rnd() * 2 - 1) * r1 : Math.cos(a) * r, cz = line ? (rnd() - 0.5) * 0.9 : Math.sin(a) * r;
    for (let j = 0; j < 9; j++) {
      d.position.set(cx + (rnd() - 0.5) * 0.12, 0, cz + (rnd() - 0.5) * 0.12); d.rotation.set(0, rnd() * 6.28, 0); d.scale.set(1, 0.6 + rnd() * 0.8, 1); d.updateMatrix();
      inst.setMatrixAt(k++, d.matrix);
    }
  }
  inst.castShadow = false; inst.receiveShadow = true; parent.add(inst);
}

export function buildGrassPatch() {
  const g = new Group(), rnd = rng(11), d = new Object3D();
  const soil = new CircleGeometry(1.6, 48); soil.rotateX(-Math.PI / 2);
  add(g, paintFaces(soil, (c) => mixC(C("#5E6B3C"), C("#7A6A4A"), h3(c.x * 6, 0, c.z * 6) * 0.5)), VC(1), [0, 0.001, 0]);
  const N = 2600, blades = new InstancedMesh(bladeGeo(), new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.85 }), N);
  const tint = new Color();
  for (let i = 0; i < N; i++) {
    const clump = Math.floor(rnd() * 90), ca = h3(clump, 1, 1) * 6.28, cr = Math.sqrt(h3(clump, 2, 2)) * 1.45;
    const a = rnd() * 6.28, rr = rnd() * 0.16;
    d.position.set(Math.cos(ca) * cr + Math.cos(a) * rr, 0, Math.sin(ca) * cr + Math.sin(a) * rr);
    d.rotation.set(0, rnd() * 6.28, 0); d.scale.set(0.8 + rnd() * 0.5, 0.55 + rnd() * 0.75, 1); d.updateMatrix(); blades.setMatrixAt(i, d.matrix);
    tint.setHSL(0.2 + (rnd() - 0.5) * 0.05, 0.25 + rnd() * 0.2, 0.9 + rnd() * 0.15); blades.setColorAt(i, tint);
  }
  blades.receiveShadow = true; g.add(blades);
  // wild oats (seed heads)
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 1.4, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.6 + rnd() * 0.3;
    const stem = new QuadraticBezierCurve3(new Vector3(x, 0, z), new Vector3(x, h * 0.7, z), new Vector3(x + 0.08, h, z + 0.04));
    add(g, tube(stem, 0.004, 8, 4), M("#B7A96E", 0.9));
    for (let j = 0; j < 5; j++) { const t = 0.78 + j * 0.045, p = stem.getPoint(t); add(g, new SphereGeometry(0.014, 6, 4), M("#D2C38A", 0.9), [p.x + 0.02, p.y - 0.015, p.z], null, [0.6, 1.6, 0.6]); }
  }
  // flowers: daisy, buttercup, lupin, cosmos
  const daisy = flowerGeo(0.035), cosmos = flowerGeo(0.045);
  const fm = (c: string) => new MeshStandardMaterial({ color: lin(c), vertexColors: true, roughness: 0.7, side: DoubleSide });
  const stemM = M("#56703A", 0.9);
  const place = (k: number, fn: (x: number, z: number, i: number) => void) => { for (let i = 0; i < k; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 1.45; fn(Math.cos(a) * r, Math.sin(a) * r, i); } };
  place(26, (x, z) => { const h = 0.18 + rnd() * 0.12; add(g, cyl(0.003, 0.003, h, 4), stemM, [x, h / 2, z]); add(g, daisy, fm("#FFFFFF"), [x, h, z], [-Math.PI / 2 + 0.4, 0, rnd() * 6]); });
  place(22, (x, z) => { const h = 0.22 + rnd() * 0.15; add(g, cyl(0.003, 0.003, h, 4), stemM, [x, h / 2, z]); add(g, new SphereGeometry(0.022, 8, 6, 0, 6.29, 0, 1.6), M("#F2C230", 0.45), [x, h, z], null, [1, 0.7, 1]); });
  place(7, (x, z) => { const h = 0.45 + rnd() * 0.2; add(g, cyl(0.006, 0.006, h, 5), stemM, [x, h / 2, z]); for (let j = 0; j < 7; j++) add(g, new ConeGeometry(0.03 - j * 0.003, 0.05, 6), M(j % 2 ? "#8F78C2" : "#A48CD6", 0.6), [x, h * 0.6 + j * 0.045, z]); });
  place(12, (x, z) => { const h = 0.38 + rnd() * 0.12; add(g, cyl(0.004, 0.004, h, 4), stemM, [x, h / 2, z]); add(g, cosmos, fm(rnd() > 0.5 ? "#F2A9C4" : "#E58AAE"), [x, h, z], [-Math.PI / 2 + 0.5, 0, rnd() * 6]); });
  // clover
  place(18, (x, z) => { for (let j = 0; j < 3; j++) { const a = j * 2.09; add(g, new CircleGeometry(0.018, 8), M("#4F7038", 0.8), [x + Math.cos(a) * 0.018, 0.035, z + Math.sin(a) * 0.018], [-Math.PI / 2, 0, 0]); } });
  g.userData.camHint = 2.6;
  return g;
}

export type FlowerKind = "daisy" | "buttercup" | "lupin" | "cosmos";
/** One flower, built exactly as buildGrassPatch builds it, for drifts of a single species (ART §5). */
export function flowerModel(kind: FlowerKind, seed = 1) {
  const g = new Group(), rnd = rng(seed), stemM = M("#56703A", 0.9);
  const fm = (c: string) => new MeshStandardMaterial({ color: lin(c), vertexColors: true, roughness: 0.7, side: DoubleSide });
  if (kind === "daisy") { const h = 0.18 + rnd() * 0.12; add(g, cyl(0.003, 0.003, h, 4), stemM, [0, h / 2, 0]); add(g, flowerGeo(0.035), fm("#FFFFFF"), [0, h, 0], [-Math.PI / 2 + 0.4, 0, rnd() * 6]); }
  if (kind === "buttercup") { const h = 0.22 + rnd() * 0.15; add(g, cyl(0.003, 0.003, h, 4), stemM, [0, h / 2, 0]); add(g, new SphereGeometry(0.022, 8, 6, 0, 6.29, 0, 1.6), M("#F2C230", 0.45), [0, h, 0], null, [1, 0.7, 1]); }
  if (kind === "lupin") { const h = 0.45 + rnd() * 0.2; add(g, cyl(0.006, 0.006, h, 5), stemM, [0, h / 2, 0]); for (let j = 0; j < 7; j++) add(g, new ConeGeometry(0.03 - j * 0.003, 0.05, 6), M(j % 2 ? "#8F78C2" : "#A48CD6", 0.6), [0, h * 0.6 + j * 0.045, 0]); }
  if (kind === "cosmos") { const h = 0.38 + rnd() * 0.12; add(g, cyl(0.004, 0.004, h, 4), stemM, [0, h / 2, 0]); add(g, flowerGeo(0.045), fm(rnd() > 0.5 ? "#F2A9C4" : "#E58AAE"), [0, h, 0], [-Math.PI / 2 + 0.5, 0, rnd() * 6]); }
  g.traverse((o) => { o.castShadow = false; });
  return g;
}
