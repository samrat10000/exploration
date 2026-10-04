// Campfire (assets.html → CAMPFIRE): stone ring, teepee logs, three additive flames, warm light, log seat.
// Flames and the light are listed in userData.live; userData.update(t) flickers them.
import { AdditiveBlending, CircleGeometry, ConeGeometry, Group, Mesh, MeshBasicMaterial, PointLight } from "three";
import { M, VC, add, cyl, lin } from "../../art/kit";
import { addTufts } from "../../world/flora/grass";
import { rockGeo } from "../../world/props/rocks";

export function buildCampfire() {
  const g = new Group(), mat = VC(0.95), live: Group["children"] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; add(g, rockGeo(900 + i, 0.2, 0.14, 0.17, 1, 0.7), mat, [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], [0, a, 0]); }
  add(g, new CircleGeometry(0.55, 20), M("#2E2925", 1), [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.28 + 0.3; add(g, cyl(0.06, 0.07, 0.85, 8), M("#6A4C35", 0.95), [Math.cos(a) * 0.18, 0.3, Math.sin(a) * 0.18], [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]); }
  const flames: Mesh[] = [];
  ([["#FFB347", 0.34, 0.7], ["#FFD27A", 0.22, 0.55], ["#FF7A2E", 0.3, 0.45]] as const).forEach(([c, r, h]) => { const f = add(g, new ConeGeometry(r, h, 7, 1), new MeshBasicMaterial({ color: lin(c), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }), [0, 0.2 + h / 2, 0]); f.castShadow = false; flames.push(f); live.push(f); });
  const light = new PointLight(0xffa255, 1.6, 9, 2); light.position.set(0, 0.8, 0); g.add(light); live.push(light);
  add(g, cyl(0.22, 0.24, 1.6, 10), M("#6E5139", 0.95), [1.6, 0.22, 0.5], [0, 0.5, Math.PI / 2]);
  addTufts(g, 20, 1.1, 2.6, 61);
  g.userData.update = (t: number) => flames.forEach((f, i) => { const k = 0.85 + 0.25 * Math.sin(t * 9 + i * 2) + 0.1 * Math.sin(t * 17 + i); f.scale.set(1 + 0.08 * Math.sin(t * 7 + i), k, 1 + 0.08 * Math.cos(t * 6 + i)); f.rotation.y = t * (0.6 + i * 0.3); light.intensity = light.userData.k * (1.4 + 0.25 * Math.sin(t * 11) + 0.15 * Math.sin(t * 23)); });
  light.userData.k = 1;
  g.userData.live = live;
  g.userData.light = light;
  return g;
}
