// Pine (assets.html → PINE): 7–8 lobed tiers with drooping skirts, vertex-painted by height and sun.
import { ConeGeometry, DoubleSide, Group, LatheGeometry, Vector2 } from "three";
import { C, M, VC, add, cyl, h3, mixC, n3, paintFaces, rng } from "../../art/kit";

const PINE = { dark: C("#21392A"), mid: C("#2F4D35"), light: C("#4E6E42"), tip: C("#7C9256"), bark: C("#4E3A2B"), barkL: C("#6E5440") };
export function buildPine(seed = 1, H = 8) {
  const g = new Group(), rnd = rng(seed);
  const trunk = new LatheGeometry([[0.34, 0], [0.22, 0.18], [0.17, 0.6], [0.14, H * 0.55], [0.05, H * 0.95]].map((p) => new Vector2(p[0], p[1])), 8);
  add(g, paintFaces(trunk, (_c, _n, f) => mixC(PINE.bark, PINE.barkL, h3(f, 1, seed) * 0.6)), VC(0.95));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + rnd(); add(g, cyl(0.02, 0.12, 0.7, 5), M("#4E3A2B", 0.95), [Math.cos(a) * 0.3, 0.08, Math.sin(a) * 0.3], [Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25]); }
  const tiers = 7 + Math.floor(rnd() * 2);
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), rad = H * 0.27 * (1 - t * 0.8) + 0.25, ht = H * 0.25 * (1 - t * 0.42), y0 = H * (0.16 + t * 0.68);
    const cone = new ConeGeometry(rad, ht, 10, 3, true);
    const p = cone.attributes.position, ph = rnd() * 6.28;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k), z = p.getZ(k), a = Math.atan2(z, x), lv = (y + ht / 2) / ht;
      let r = 1 + 0.14 * Math.sin(a * 5 + ph) + 0.08 * Math.sin(a * 11 + ph * 2) + 0.06 * n3(x * 2 + seed, y * 2, z * 2);
      let dy = 0;
      if (lv < 0.05) { r *= 1.08; dy = -0.22 * rad * (0.6 + 0.4 * Math.sin(a * 5 + ph)); }
      p.setXYZ(k, x * r, y + dy, z * r);
    }
    const geo = paintFaces(cone, (c, n) => {
      const lv = (c.y + ht / 2) / ht, sun = Math.max(0, n.y * 0.6 + n.x * 0.3 + 0.2);
      let col = mixC(PINE.dark, PINE.mid, lv * 0.9 + 0.1);
      col = mixC(col, PINE.light, sun * 0.8);
      if (lv < 0.2) col = mixC(col, PINE.tip, sun * 0.5);
      return mixC(col, PINE.dark, h3(c.x * 3, c.y * 3, c.z * 3) * 0.25);
    });
    add(g, geo, VC(0.9, { side: DoubleSide }), [0, y0 + ht / 2, 0], [0, rnd() * 6.28, 0]);
  }
  add(g, new ConeGeometry(0.18, 0.9, 6), M("#4E6E42", 0.9, 0, { flatShading: true }), [0, H * 0.97, 0]);
  return g;
}
