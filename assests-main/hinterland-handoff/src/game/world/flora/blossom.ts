// Blossom / apple tree (assets.html → BLOSSOM): branching trunk, lumpy canopy, real flowers.
import { CatmullRomCurve3, CircleGeometry, Color, DoubleSide, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, LatheGeometry, MeshStandardMaterial, Object3D, QuadraticBezierCurve3, SphereGeometry, TubeGeometry, Vector2, Vector3 } from "three";
import { C, M, VC, add, h3, lin, mixC, n3, paintFaces, rng } from "../../art/kit";

export function flowerGeo(r = 0.07, seg = 20) {
  const g = new CircleGeometry(r, seg), p = g.attributes.position, cols: number[] = [];
  const rim = new Color(1, 1, 1), mid = C("#F7E6A0");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), a = Math.atan2(y, x), d = Math.hypot(x, y);
    const k = d < 1e-5 ? 0 : 0.55 + 0.45 * Math.abs(Math.cos(a * 2.5));
    p.setXY(i, x * k, y * k); const c = d < 1e-5 ? mid : rim; cols.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new Float32BufferAttribute(cols, 3));
  return g;
}

/** lite (game): 10-segment flowers, 6×4 apples, and no shadows from flowers, petals and fruit (ART §4). */
export function buildBlossom(seed = 3, kind: "pink" | "apple" = "pink", lite = false) {
  const g = new Group(), rnd = rng(seed);
  const bark = M(kind === "pink" ? "#5B4033" : "#5E4A36", 0.95);
  const trunkCurve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0.08, 0.7, 0.02), new Vector3(-0.04, 1.35, 0.05), new Vector3(0.05, 1.75, 0)]);
  add(g, new TubeGeometry(trunkCurve, 16, 0.16, 8, false), bark);
  add(g, new LatheGeometry([[0.3, 0], [0.2, 0.15], [0.16, 0.35]].map((p) => new Vector2(p[0], p[1])), 8), bark);
  const lobes: { c: Vector3; r: number }[] = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + rnd() * 0.5, d = i === 0 ? 0 : 0.75 + rnd() * 0.35, y = 2.55 + (i === 0 ? 0.55 : (rnd() - 0.3) * 0.6);
    const c = new Vector3(Math.cos(a) * d, y, Math.sin(a) * d), r = i === 0 ? 1.0 : 0.62 + rnd() * 0.28;
    lobes.push({ c, r });
    if (i > 0) add(g, new TubeGeometry(new QuadraticBezierCurve3(new Vector3(0, 1.6, 0), new Vector3(c.x * 0.4, 1.9 + rnd() * 0.3, c.z * 0.4), c.clone().multiplyScalar(0.85)), 10, 0.055, 6, false), bark);
  }
  const leafA = C(kind === "pink" ? "#6D8A48" : "#5E7F42"), leafB = C(kind === "pink" ? "#4C6A3A" : "#3F5E33"), bloom = C(kind === "pink" ? "#E8A7BC" : "#F2ECDF");
  for (const { c, r } of lobes) {
    const geo = new IcosahedronGeometry(r, 1), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = new Vector3(p.getX(k), p.getY(k), p.getZ(k)); v.multiplyScalar(1 + 0.16 * n3(v.x * 2.2 + seed, v.y * 2.2, v.z * 2.2)); v.y *= 0.82; p.setXYZ(k, v.x, v.y, v.z); }
    add(g, paintFaces(geo, (cc, n) => {
      const sun = Math.max(0, n.y * 0.7 + n.x * 0.3);
      let col = mixC(leafB, leafA, sun + 0.15);
      if (h3(cc.x * 5 + c.x, cc.y * 5, cc.z * 5) < (kind === "pink" ? 0.45 : 0.2)) col = mixC(col, bloom, 0.55 + sun * 0.3);
      return col;
    }), VC(0.9), [c.x, c.y, c.z]);
  }
  // flowers on the canopy surface
  const fg = flowerGeo(kind === "pink" ? 0.085 : 0.07, lite ? 10 : 20);
  const fm = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: DoubleSide });
  const count = kind === "pink" ? 420 : 220, inst = new InstancedMesh(fg, fm, count), d = new Object3D();
  const pinks = ["#F4B6C8", "#F7CBD7", "#EC9AB5", "#FFF1F3", "#F9D9E2"].map(C), whites = ["#FFFFFF", "#FFF6EE", "#FBEFF2", "#FFF9E6"].map(C);
  for (let i = 0; i < count; i++) {
    const L = lobes[Math.floor(rnd() * lobes.length)], dir = new Vector3(rnd() * 2 - 1, rnd() * 1.4 - 0.4, rnd() * 2 - 1).normalize();
    const pos = L.c.clone().add(dir.clone().multiplyScalar(L.r * (1.0 + rnd() * 0.08))).setY(L.c.y + dir.y * L.r * 0.82 + 0.02);
    d.position.copy(pos); d.lookAt(pos.clone().add(dir)); d.rotateZ(rnd() * 6.28); d.scale.setScalar(0.75 + rnd() * 0.6); d.updateMatrix();
    inst.setMatrixAt(i, d.matrix); inst.setColorAt(i, (kind === "pink" ? pinks : whites)[Math.floor(rnd() * 5) % (kind === "pink" ? 5 : 4)]);
  }
  inst.castShadow = !lite; g.add(inst);
  // fallen petals ring
  const pc = 160, pet = new InstancedMesh(new CircleGeometry(0.035, 6), new MeshStandardMaterial({ color: kind === "pink" ? lin("#F2BACB") : lin("#FFF8EE"), roughness: 0.8 }), pc);
  for (let i = 0; i < pc; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 2.4; d.position.set(Math.cos(a) * r, 0.012, Math.sin(a) * r); d.rotation.set(-Math.PI / 2, 0, rnd() * 6); d.scale.setScalar(0.6 + rnd() * 0.8); d.updateMatrix(); pet.setMatrixAt(i, d.matrix); }
  pet.receiveShadow = true; g.add(pet);
  if (kind === "apple") {
    for (let i = 0; i < 26; i++) {
      const L = lobes[1 + Math.floor(rnd() * (lobes.length - 1))], dir = new Vector3(rnd() * 2 - 1, -rnd() * 0.7, rnd() * 2 - 1).normalize();
      const pos = L.c.clone().add(dir.multiplyScalar(L.r * 0.95));
      add(g, new SphereGeometry(0.075, lite ? 6 : 10, lite ? 4 : 8), M(i % 3 ? "#C8452F" : "#D9A93A", 0.5), [pos.x, pos.y, pos.z]).castShadow = !lite;
    }
  }
  return g;
}
