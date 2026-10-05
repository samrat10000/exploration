// Hot air balloon (kit/balloon.js): a striped envelope, wicker basket, ropes, a burner that flares now and then (and glows at night),
// and two people in the basket. userData.update(t, dt, night) animates the burner and the passengers.
import { AdditiveBlending, ConeGeometry, Group, LatheGeometry, LineCurve3, MeshBasicMaterial, PointLight, TorusGeometry, Vector2, Vector3 } from "three";
import { C, M, VC, add, box, cyl, halo, mixC, paintFaces, rng, tube } from "../../art/kit";
import { buildPerson } from "../../life/person";

const PALS = [["#E1B640", "#C9473A"], ["#3E6FA8", "#F2EFE6"], ["#4F8A54", "#E8C547"], ["#E58AAE", "#F2EFE6"], ["#E8743B", "#5E3C7A"]];

export function buildBalloon(seed = 1) {
  const g = new Group(), rnd = rng(seed), pal = PALS[seed % 5];
  const prof: Vector2[] = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24, r = t < 0.62 ? 1.6 + Math.sin((t / 0.62) * Math.PI * 0.5) * 5.9 : 7.5 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.62) / 0.38, 2))) + 0.001; prof.push(new Vector2(Math.max(r, 0.05), t * 14)); }
  const A = C(pal[0]), B = C(pal[1]), band = C("#F2EFE6"), dark = C("#3A3632");
  add(g, paintFaces(new LatheGeometry(prof, 32), (c, n) => {
    const a = Math.atan2(c.z, c.x), gore = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
    let col = gore % 2 ? A : B; if (c.y > 8.4 && c.y < 9.2) col = band; if (c.y < 1.2) col = dark;
    return mixC(col, C("#000000"), Math.max(0, -n.y) * 0.15);
  }), VC(0.75, { flatShading: false }), [0, 4.2, 0]);
  add(g, new TorusGeometry(1.62, 0.05, 6, 24), M("#3A3632", 0.7), [0, 4.2, 0], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; add(g, tube(new LineCurve3(new Vector3(Math.cos(a) * 1.6, 4.2, Math.sin(a) * 1.6), new Vector3(Math.cos(a) * 0.62, 1.3, Math.sin(a) * 0.62)), 0.015, 2, 4), M("#4A4238", 0.8)); }
  add(g, paintFaces(box(1.3, 0.9, 1.3), (c) => mixC(C("#8C6A45"), C("#B08A5C"), (Math.sin(c.y * 60) > 0 ? 0.7 : 0) + (Math.sin((c.x + c.z) * 55) > 0.3 ? 0.3 : 0))), VC(0.95), [0, 0.45, 0]);
  add(g, cyl(0.06, 0.08, 0.9, 8), M("#C9CCCB", 0.3, 0.8), [0, 1.55, 0]);
  const flame = add(g, new ConeGeometry(0.22, 1.1, 8), new MeshBasicMaterial({ color: "#FFB04A", transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }), [0, 2.4, 0]);
  const fl = new PointLight(0xffa04a, 0, 18, 2); fl.position.set(0, 2.6, 0); g.add(fl);
  const glow = halo(g, [0, 3, 0], "#FFB04A", 5);
  const people = [[-0.3, 0.2], [0.3, -0.15]].map(([x, z], i) => { const p = buildPerson(i ? "keeper" : "traveler"); p.scale.setScalar(0.55); p.position.set(x, 0.35, z); g.add(p); return p; });
  let burn = 0, next = 1 + rnd() * 4;
  g.userData.update = (t: number, dt: number, night: number) => {
    next -= dt; if (next <= 0) { burn = 1.2 + rnd() * 1.2; next = 3 + rnd() * 6; }
    burn = Math.max(0, burn - dt);
    const k = burn > 0 ? 0.8 + 0.2 * Math.sin(t * 30) : 0;
    (flame.material as MeshBasicMaterial).opacity = k * 0.9; flame.scale.set(1, 0.8 + k * 0.4, 1);
    fl.intensity = k * (night > 0.5 ? 30 : 10); (glow.material as { opacity: number }).opacity = k * (night > 0.5 ? 0.9 : 0.35);
    people[0].rotation.y = Math.sin(t * 0.4) * 0.6; people[1].rotation.y = Math.PI + Math.sin(t * 0.3 + 1) * 0.5;
  };
  return g;
}
