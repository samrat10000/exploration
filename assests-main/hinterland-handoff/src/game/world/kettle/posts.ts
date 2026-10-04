// Posts + rope (assets.html → POSTS). The lab's three-post run, plus the same post on its own and a
// rope span, so the game can stand posts wherever the trail edge needs them and hang rope between.
import { Group, TorusGeometry, Vector3 } from "three";
import { C, M, VC, add, catenary, cyl, h3, mixC, n3, paintFaces, rng, tube } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { rockGeo } from "../props/rocks";

/** One weathered post (x = 0), its iron ring and base stone. Returns the rope tie point. */
function addPost(g: Group, x: number, i: number, rnd: () => number) {
  const h = 1.05 + rnd() * 0.12, lean = (rnd() - 0.5) * 0.08;
  const geo = cyl(0.065, 0.085, h, 7), p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) p.setX(k, p.getX(k) + n3(p.getY(k) * 3, i, 0) * 0.012);
  add(g, paintFaces(geo, (c) => mixC(C("#5B4636"), C("#8C7458"), ((c.y + h / 2) / h) * 0.7 + h3(c.x * 20, c.y * 20, i) * 0.3)), VC(0.95), [x, h / 2, 0], [0, 0, lean]);
  add(g, new TorusGeometry(0.03, 0.007, 6, 12), M("#5D5A55", 0.5, 0.7), [x + lean * h, h - 0.12, 0.07]);
  add(g, rockGeo(70 + i, 0.16, 0.1, 0.14, 1), VC(0.95), [x + 0.12, 0.05, 0.08]);
  return new Vector3(x - lean * h * 0.5, h - 0.12, 0.08);
}

export function buildPosts() {
  const g = new Group(), rnd = rng(5), rope = M("#CDB88C", 0.95);
  const tops: Vector3[] = [];
  for (let i = 0; i < 3; i++) tops.push(addPost(g, -2.4 + i * 2.4, i, rnd));
  for (let i = 0; i < 2; i++) add(g, tube(catenary(tops[i], tops[i + 1], 0.18), 0.016, 20, 6), rope);
  addTufts(g, 20, 0.2, 3.2, 31, true);
  return g;
}

/** A single post (for instancing), seeded. */
export function buildPost(seed: number) {
  const g = new Group();
  addPost(g, 0, seed, rng(seed + 5));
  addTufts(g, 5, 0.1, 0.35, seed + 31);
  return g;
}
export const POST_TIE_Y = 1.0;
/** Rope between two world-space tie points, sagging 0.18 m. */
export const ropeGeo = (a: Vector3, b: Vector3) => tube(catenary(a, b, 0.18), 0.016, 20, 6);
export const ropeMat = () => M("#CDB88C", 0.95);
