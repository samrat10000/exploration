// Trail-side stones (assets.html → TRAIL): low, half-buried stones along the outer edge, with tufts.
import { Group } from "three";
import { VC, add, rng } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { rockGeo } from "../props/rocks";

export function buildTrailStones() { // replaces the plain blocks along the trail edge
  const g = new Group(), mat = VC(0.95), rnd = rng(21);
  for (let i = 0; i < 7; i++) {
    const s = 0.35 + rnd() * 0.25, x = -3 + i * 1.0 + rnd() * 0.2;
    add(g, rockGeo(30 + i, s * 1.2, s * 0.75, s, 2, 0.45), mat, [x, s * 0.35, (rnd() - 0.5) * 0.3], [0, rnd() * 6, 0]);
  }
  addTufts(g, 22, 0.2, 3.4, 11, true);
  return g;
}
