// Hut variants (kit/buildings.js → HUT VARIANTS): tea house, weather station, bakery, beekeeper,
// star-watcher. Each is the house kit plus its own yard props.
import { Group, ConeGeometry, DoubleSide, CircleGeometry, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, box, catenary, cyl, glow, h3, mixC, paintFaces, tube } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { buildHouse, chainUpdate } from "./house";

export type HutKind = "tea" | "weather" | "bakery" | "bees" | "stars";

const BASE: Record<HutKind, Parameters<typeof buildHouse>[0] & { w: number; d: number }> = {
  tea: { seed: 41, w: 4.6, d: 3.8, h: 2.4, shutter: "#B0473A" },
  weather: { seed: 42, w: 3.6, d: 3.2, h: 2.3, walls: "stone", shutter: "#3E6FA8", pitch: 0.45 },
  bakery: { seed: 43, w: 5.2, d: 4.0, h: 2.6, shutter: "#C9A04A" },
  bees: { seed: 44, w: 3.8, d: 3.2, h: 2.2, walls: "stone", shutter: "#D9A93A", pitch: 0.55 },
  stars: { seed: 45, w: 4.0, d: 3.6, h: 2.4, walls: "stone", shutter: "#3B4A6B", pitch: 0.5 },
};
/** how far the door's front yard reaches (where the keeper stands and you stop) */
export const HUT_FRONT = (k: HutKind) => BASE[k].d / 2 + 2.2;

function stringLights(g: Group, a: Vector3, b: Vector3, n: number) {
  const curve = catenary(a, b, 0.35);
  add(g, tube(curve, 0.006, 20, 4), M("#3A342C", 0.9));
  for (let i = 1; i <= n; i++) { const p = curve.getPoint(i / (n + 1)); add(g, new SphereGeometry(0.07, 10, 8), glow("#FFC874", 0.9), [p.x, p.y - 0.08, p.z]).castShadow = false; }
}

export function buildHut(kind: HutKind) {
  const b = BASE[kind], g = buildHouse(b), W = b.w, D = b.d;
  if (kind === "tea") {
    for (const x of [-1.6, 0.4]) {
      add(g, cyl(0.5, 0.5, 0.05, 16), M("#7A5A3E", 0.8), [x, 0.78, -D / 2 - 1.6]); add(g, cyl(0.05, 0.07, 0.72, 8), M("#5E4630", 0.85), [x, 0.4, -D / 2 - 1.6]);
      for (let k = 0; k < 3; k++) { const a = k * 2.1; add(g, cyl(0.045, 0.035, 0.07, 10), M("#F2EFE6", 0.4), [x + Math.cos(a) * 0.25, 0.84, -D / 2 - 1.6 + Math.sin(a) * 0.25]); }
      for (const sx of [-0.75, 0.75]) add(g, box(0.36, 0.42, 0.36), M("#8C6A48", 0.85), [x + sx, 0.21, -D / 2 - 1.6]);
    }
    stringLights(g, new Vector3(-W / 2, 2.5, -D / 2 - 0.1), new Vector3(-W / 2 - 1, 2.0, -D / 2 - 3.4), 8);
    add(g, cyl(0.04, 0.05, 2.2, 6), M("#5A4632", 0.9), [-W / 2 - 1, 1.1, -D / 2 - 3.4]);
    add(g, box(1.1, 0.35, 0.04), M("#E9DFC9", 0.8), [0.6, 2.3, -D / 2 - 0.12]);
  }
  if (kind === "weather") {
    add(g, cyl(0.04, 0.05, 4.2, 8), M("#C9CCCB", 0.3, 0.8), [W / 2 + 0.8, 2.1, 0]);
    const cups = new Group(); cups.position.set(W / 2 + 0.8, 4.25, 0); g.add(cups);
    for (let k = 0; k < 3; k++) { const a = k * 2.094; add(cups, box(0.45, 0.015, 0.015), M("#C9CCCB", 0.3, 0.8), [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22], [0, -a, 0]); add(cups, new SphereGeometry(0.08, 10, 6, 0, 6.29, 0, 1.6), M("#C9473A", 0.5), [Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45], [0, 0, Math.PI / 2]); }
    const cone = new ConeGeometry(0.14, 0.9, 10, 4, true); cone.rotateZ(Math.PI / 2);
    const sk = add(g, cone, M("#E8743B", 0.8, 0, { side: DoubleSide }), [W / 2 + 1.25, 3.6, 0]);
    add(g, box(0.6, 0.7, 0.5), M("#F2EFE6", 0.7), [-W / 2 - 1, 0.95, 0]);
    for (let k = 0; k < 4; k++) add(g, box(0.6, 0.02, 0.52), M("#D9D6CE", 0.7), [-W / 2 - 1, 0.7 + k * 0.15, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, cyl(0.025, 0.025, 0.6, 6), M("#F2EFE6", 0.7), [-W / 2 - 1 + sx * 0.25, 0.3, sz * 0.2]);
    chainUpdate(g, (t) => { cups.rotation.y = t * 3.2; sk.rotation.y = Math.sin(t * 0.7) * 0.4; sk.scale.y = 1 + Math.sin(t * 5) * 0.08; });
    (g.userData.live ??= []).push(cups, sk);
  }
  if (kind === "bakery") {
    const dome = new SphereGeometry(1.0, 14, 10, 0, 6.29, 0, Math.PI / 2);
    add(g, paintFaces(dome, (c) => mixC(C("#B98A62"), C("#D6A87A"), h3(Math.floor(c.x * 5), Math.floor(c.y * 5), Math.floor(c.z * 5)))), VC(0.9), [W / 2 + 1.4, 0.3, 0.6]);
    add(g, new CircleGeometry(0.32, 16, 0, Math.PI), M("#1E1714", 1), [W / 2 + 1.4, 0.32, -0.41]);
    add(g, new CircleGeometry(0.22, 16, 0, Math.PI), glow("#FF8A3A", 0.9), [W / 2 + 1.4, 0.33, -0.42]);
    add(g, box(1.2, 1.0, 0.35), M("#7A5A3E", 0.85), [-W / 2 - 0.2, 0.85, -D / 2 - 0.6]);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) add(g, new SphereGeometry(0.11, 10, 8), M(j % 2 ? "#C98A4A" : "#B87A3E", 0.7), [-W / 2 - 0.62 + j * 0.28, 0.55 + k * 0.3, -D / 2 - 0.72], null, [1.3, 0.7, 0.9]);
  }
  if (kind === "bees") {
    const cols = ["#F2EFE6", "#E1B640", "#9FC0C8", "#E8B4A8", "#B6C79A"];
    for (let k = 0; k < 5; k++) {
      const x = -W / 2 - 1 + k * 1.1, z = -D / 2 - 2.4 - (k % 2) * 0.6;
      add(g, box(0.5, 0.12, 0.5), M("#6E5139", 0.85), [x, 0.06, z]);
      for (let j = 0; j < 3; j++) add(g, box(0.46, 0.22, 0.46), M(cols[(k + j) % 5], 0.7), [x, 0.24 + j * 0.23, z]);
      add(g, box(0.56, 0.06, 0.56), M("#8C8A84", 0.5, 0.4), [x, 0.95, z]);
    }
    const bees = Array.from({ length: 14 }, () => add(g, new SphereGeometry(0.03, 6, 4), M("#2E2A1E", 0.6), [0, 1, 0]));
    chainUpdate(g, (t) => bees.forEach((s, i) => { const a = t * (1.2 + i * 0.07) + i; s.position.set(-W / 2 + 1.2 + Math.cos(a) * 1.6, 0.9 + Math.sin(a * 2.3) * 0.3, -D / 2 - 2.6 + Math.sin(a) * 1.0); }));
    (g.userData.live ??= []).push(...bees);
    addTufts(g, 30, 2, 4, 7);
  }
  if (kind === "stars") {
    add(g, cyl(1.05, 1.05, 0.9, 20), M("#8E887E", 0.9), [W / 2 + 1.4, 0.45, 0]);
    add(g, new SphereGeometry(1.05, 20, 10, 0, 6.29, 0, Math.PI / 2), M("#D9DCDF", 0.35, 0.6), [W / 2 + 1.4, 0.9, 0]);
    add(g, box(0.3, 0.9, 1.4), M("#1C2230", 0.8), [W / 2 + 1.4, 1.3, -0.2], [0.6, 0, 0]);
    add(g, cyl(0.08, 0.11, 1.0, 12), M("#3A4258", 0.4, 0.6), [-W / 2 - 0.9, 1.1, -D / 2 - 0.6], [-0.7, 0.4, 0]);
    for (const a of [0, 2.1, 4.2]) add(g, cyl(0.015, 0.015, 1.0, 5), M("#3A342C", 0.6), [-W / 2 - 0.9 + Math.cos(a) * 0.25, 0.45, -D / 2 - 0.6 + Math.sin(a) * 0.25], [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]);
  }
  return g;
}
