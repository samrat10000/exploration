// Dry-stone wall (assets.html → WALL): three courses of irregular stones, cap stones, tufts. Built along X.
import { Group } from "three";
import { VC, add, rng } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { rockGeo } from "../props/rocks";

export function buildWall(len = 3.2) {
  const g = new Group(), mat = VC(0.95), rnd = rng(42);
  const rows = [0.16, 0.4, 0.62];
  rows.forEach((y, r) => {
    let x = -len / 2 + (r % 2 ? 0.18 : 0);
    while (x < len / 2 - 0.12) {
      const w = 0.26 + rnd() * 0.22, h = 0.16 + rnd() * 0.07;
      add(g, rockGeo(100 + r * 40 + Math.floor(x * 10), w * 0.55, h * 0.62, 0.24, 1, 0.6), mat, [x + w / 2, y + (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.05], [0, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.12]);
      x += w + 0.015;
    }
  });
  for (let x = -len / 2 + 0.1; x < len / 2 - 0.1; x += 0.42 + rnd() * 0.1) add(g, rockGeo(300 + Math.floor(x * 10), 0.26, 0.07, 0.27, 1, 0.3), mat, [x + 0.2, 0.8, 0], [0, rnd(), 0]);
  addTufts(g, 18, 0.15, len * 0.5, 77, true);
  return g;
}
