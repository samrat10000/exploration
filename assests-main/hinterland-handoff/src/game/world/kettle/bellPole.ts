// Bell pole (assets.html → BELL POLE): cairn base, weathered pole, crossbar, swinging brass bell, flags.
import { Group, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, box, cyl, h3, lathe, mixC, n3, paintFaces } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { chainUpdate, flagLine } from "../props/house";
import { rockGeo } from "../props/rocks";

export function buildBellPole() {
  const g = new Group(), mat = VC(0.95);
  for (let i = 0; i < 6; i++) add(g, rockGeo(950 + i, 0.34 - i * 0.04, 0.12, 0.3 - i * 0.035, 1, 0.5), mat, [0, 0.08 + i * 0.18, 0], [0, i * 1.1, 0]);
  const pole = cyl(0.06, 0.08, 3.2, 7), p = pole.attributes.position; for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + n3(p.getY(k) * 2, 3, 0) * 0.02);
  add(g, paintFaces(pole, (c) => mixC(C("#5B4636"), C("#8C7458"), h3(c.x * 30, c.y * 14, 1) * 0.5 + 0.2)), VC(0.95), [0, 1.6, 0]);
  add(g, box(0.7, 0.07, 0.07), M("#5B4636", 0.9), [0, 2.9, 0]);
  const bellG = lathe([[0, 0.2], [0.05, 0.19], [0.07, 0.12], [0.1, 0.03], [0.12, 0], [0, 0]], 16);
  const bell = new Group(); bell.position.set(0.28, 2.86, 0); g.add(bell);
  add(bell, cyl(0.004, 0.004, 0.14, 4), M("#3A342C", 0.9), [0, -0.07, 0]);
  add(bell, bellG, M("#C29A45", 0.3, 0.9), [0, -0.34, 0]);
  add(bell, new SphereGeometry(0.025, 8, 6), M("#3A342C", 0.5, 0.6), [0, -0.33, 0]);
  flagLine(g, new Vector3(0, 3.1, 0), new Vector3(3.6, 0.5, 1.4), 9, 0.45);
  add(g, cyl(0.04, 0.05, 1, 6), M("#5A4632", 0.9), [3.6, 0.5, 1.4]);
  chainUpdate(g, (t) => { bell.rotation.z = Math.sin(t * 1.7) * 0.18; });
  (g.userData.live as Group["children"]).push(bell);
  addTufts(g, 18, 0.5, 2.4, 91);
  return g;
}
