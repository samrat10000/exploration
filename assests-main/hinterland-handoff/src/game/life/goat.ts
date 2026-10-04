// Goat (assets.html → GOAT): patched coat, curved horns, beard, ears out to the side.
import { ConeGeometry, Group, IcosahedronGeometry, QuadraticBezierCurve3, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, bakeStatic, box, cyl, h3, mixC, paintFaces, tube } from "../art/kit";

export function buildGoat() {
  const g = new Group(), coat = VC(0.95);
  const body = new IcosahedronGeometry(1, 1); body.scale(0.24, 0.22, 0.42);
  add(g, paintFaces(body, (c, n) => h3(Math.floor(c.x * 8), Math.floor(c.y * 8), Math.floor(c.z * 8)) > 0.78 || c.z > 0.25 ? C("#7A5638") : mixC(C("#E9E2D3"), C("#FFFFFF"), n.y * 0.5 + 0.3)), coat, [0, 0.66, 0]);
  add(g, cyl(0.08, 0.1, 0.34, 8), M("#EDE6D8", 0.95), [0, 0.86, -0.36], [0.7, 0, 0]);
  const head = new IcosahedronGeometry(1, 1); head.scale(0.09, 0.1, 0.17);
  add(g, paintFaces(head, () => C("#F1EBDF")), coat, [0, 0.98, -0.52], [0.3, 0, 0]);
  for (const sx of [-1, 1]) {
    add(g, tube(new QuadraticBezierCurve3(new Vector3(sx * 0.04, 1.06, -0.5), new Vector3(sx * 0.06, 1.2, -0.42), new Vector3(sx * 0.07, 1.16, -0.3)), 0.016, 8, 5), M("#8B7A62", 0.6));
    add(g, box(0.12, 0.03, 0.05), M("#E3DBCB", 0.95), [sx * 0.12, 1.0, -0.47], [0, 0, sx * 0.4]);
    add(g, new SphereGeometry(0.014, 6, 4), M("#1B1A18", 0.3), [sx * 0.065, 1.0, -0.6]);
    for (const z of [-0.26, 0.26]) { add(g, cyl(0.028, 0.022, 0.5, 6), M("#E6DED0", 0.95), [sx * 0.12, 0.25, z]); add(g, cyl(0.024, 0.024, 0.05, 6), M("#3A332B", 0.8), [sx * 0.12, 0.025, z]); }
  }
  add(g, new ConeGeometry(0.025, 0.1, 5), M("#D8D0C0", 0.95), [0, 0.86, -0.64], [Math.PI, 0, 0]);
  add(g, new ConeGeometry(0.04, 0.12, 5), M("#7A5638", 0.95), [0, 0.86, 0.42], [-0.6, 0, 0]);
  return g;
}

/** A game goat: body baked, the head (horns, ears, eyes, beard) on a neck pivot in userData.head. */
export function goatModel() {
  const g = buildGoat(), head = new Group();
  head.position.set(0, 0.9, -0.4);
  for (const c of [...g.children]) if (c.position.z < -0.4 && c.position.y > 0.84) head.attach(c);
  const out = bakeStatic(g), pivot = new Group();
  pivot.position.copy(head.position);
  head.position.set(0, 0, 0);
  pivot.add(...bakeStatic(head).children);
  out.add(pivot);
  out.userData.head = pivot;
  return out;
}
