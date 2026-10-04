// Rocks (assets.html → ROCKS): noise-displaced, flat-bottomed, moss on top, lichen specks.
import { Group, IcosahedronGeometry, Vector3 } from "three";
import { C, VC, add, h3, mixC, n3, paintFaces, rng } from "../../art/kit";
import { addTufts } from "../flora/grass";

const ROCK = { a: C("#8D877D"), b: C("#726E67"), c: C("#A39D91"), moss: C("#6E7F45"), mossL: C("#90A05A"), lichen: C("#C9A25A"), lichen2: C("#D9D3C1"), base: C("#4F4B45") };
export function rockGeo(seed: number, sx = 1, sy = 0.7, sz = 0.9, detail = 2, mossy = 0.55) {
  const geo = new IcosahedronGeometry(1, detail), p = geo.attributes.position, s = seed * 1.37;
  for (let k = 0; k < p.count; k++) {
    const v = new Vector3(p.getX(k), p.getY(k), p.getZ(k));
    const nn = n3(v.x * 1.2 + s, v.y * 1.2, v.z * 1.2) * 0.32 + n3(v.x * 3 + s, v.y * 3, v.z * 3) * 0.1;
    v.multiplyScalar(1 + nn);
    v.x *= sx; v.y *= sy; v.z *= sz;
    if (v.y < -0.3 * sy) v.y = -0.3 * sy + (v.y + 0.3 * sy) * 0.12;
    v.y += (Math.round(v.y * 6) / 6) * 0.06;
    p.setXYZ(k, v.x, v.y, v.z);
  }
  return paintFaces(geo, (c, n, f) => {
    const t = n3(c.x * 2 + s, c.y * 2, c.z * 2);
    let col = t > 0.2 ? mixC(ROCK.a, ROCK.c, t) : mixC(ROCK.a, ROCK.b, -t + 0.3);
    col = mixC(col, ROCK.base, Math.max(0, -c.y / sy) * 0.5);
    const mossAmt = (n.y - mossy) * 2.6 + n3(c.x * 3.3, c.y * 3.3 + s, c.z * 3.3) * 0.6;
    if (mossAmt > 0) col = mixC(col, mixC(ROCK.moss, ROCK.mossL, h3(f, s, 2)), Math.min(1, mossAmt));
    const sp = h3(f, s, 9);
    if (sp > 0.965) col = mixC(col, sp > 0.985 ? ROCK.lichen : ROCK.lichen2, 0.8);
    return col;
  });
}
export function buildRockGroup() {
  const g = new Group(), mat = VC(0.95);
  add(g, rockGeo(1, 1.5, 1.0, 1.2, 3), mat, [0, 0.62, 0], [0, 0.4, 0]);
  add(g, rockGeo(2, 0.8, 0.55, 0.7, 2), mat, [1.65, 0.3, 0.55], [0, 1.2, 0]);
  add(g, rockGeo(3, 0.55, 0.4, 0.5, 2), mat, [-1.35, 0.22, 0.75], [0, 2, 0]);
  const rnd = rng(9);
  for (let i = 0; i < 9; i++) { const a = rnd() * 6.28, r = 1.6 + rnd() * 1.2, s = 0.1 + rnd() * 0.16; add(g, rockGeo(10 + i, s, s * 0.6, s * 0.8, 1), mat, [Math.cos(a) * r, s * 0.25, Math.sin(a) * r], [0, rnd() * 6, 0]); }
  addTufts(g, 26, 1.3, 2.8, 5);
  return g;
}
