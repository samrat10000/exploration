// Dragon (kit/dragon.js): a friendly lantern-festival dragon. The serpentine body is rebuilt every frame along the path the head has flown;
// fins, mane, legs, whiskers and a glowing pearl follow it. userData.update(t, headPos, headDir) moves it.
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, ConeGeometry, DoubleSide, Group, IcosahedronGeometry, Mesh, MeshStandardMaterial, Sphere, SphereGeometry, Vector3 } from "three";
import { C, M, VC, add, box, cyl, glow, halo, mixC, paintFaces, tube } from "../../art/kit";

const N = 64, SIDES = 12, LEN = 34;
const PAL = {
  jade: { back: "#2E7D63", back2: "#3FA07C", belly: "#E8C770", mane: "#F2EFE6", horn: "#E8C770", fin: "#C9473A" },
  ember: { back: "#B0352B", back2: "#D9563A", belly: "#F2CF6A", mane: "#F7E7B8", horn: "#F2CF6A", fin: "#2E7D63" },
};

export function buildDragon(palette: "jade" | "ember" = "jade") {
  const P = PAL[palette], g = new Group();
  const geo = new BufferGeometry(), pos = new Float32Array((N + 1) * SIDES * 3), colA = new Float32Array((N + 1) * SIDES * 3), idx: number[] = [];
  for (let i = 0; i < N; i++) for (let s = 0; s < SIDES; s++) { const a = i * SIDES + s, b = i * SIDES + ((s + 1) % SIDES), c = (i + 1) * SIDES + s, d = (i + 1) * SIDES + ((s + 1) % SIDES); idx.push(a, c, b, b, c, d); }
  geo.setIndex(idx); geo.setAttribute("position", new BufferAttribute(pos, 3)); geo.setAttribute("color", new BufferAttribute(colA, 3));
  const cB = C(P.back), cB2 = C(P.back2), cBe = C(P.belly);
  for (let i = 0; i <= N; i++) for (let s = 0; s < SIDES; s++) {
    const a = (s / SIDES) * Math.PI * 2, belly = Math.max(0, -Math.cos(a)), scale = Math.sin(i * 1.9 + s * 2.3) > 0.2 ? 1 : 0.82;
    const col = mixC(mixC(cB, cB2, ((i + s) % 3) / 3), cBe, Math.pow(belly, 0.7) * 1.1).multiplyScalar(scale), k = (i * SIDES + s) * 3;
    colA[k] = col.r; colA[k + 1] = col.g; colA[k + 2] = col.b;
  }
  const body = new Mesh(geo, new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15 })); body.frustumCulled = false; body.castShadow = true; g.add(body);
  const finM = M(P.fin, 0.6, 0, { side: DoubleSide }), maneM = M(P.mane, 0.9), hornM = M(P.horn, 0.4, 0.3);
  const fins: { m: Mesh; i: number }[] = [];
  for (let i = 3; i < N - 2; i += 2) { const f = new Mesh(new ConeGeometry(0.16, 0.7, 4), finM); f.castShadow = true; g.add(f); fins.push({ m: f, i }); }
  const manes: { m: Mesh; i: number; sd: number }[] = [];
  for (let i = 1; i < 8; i++) for (const sd of [-1, 1]) { const m = new Mesh(new ConeGeometry(0.12, 0.9, 5), maneM); g.add(m); manes.push({ m, i, sd }); }
  const head = new Group(); g.add(head);
  const skull = new IcosahedronGeometry(1, 1); skull.scale(0.62, 0.5, 0.95);
  add(head, paintFaces(skull, (_c, n) => (n.y < -0.3 ? C(P.belly) : mixC(C(P.back), C(P.back2), n.y * 0.5 + 0.5))), VC(0.5), [0, 0, 0]);
  const snout = new IcosahedronGeometry(1, 1); snout.scale(0.42, 0.3, 0.6);
  add(head, paintFaces(snout, (_c, n) => (n.y < -0.2 ? C(P.belly) : C(P.back2))), VC(0.5), [0, -0.08, -0.95]);
  add(head, box(0.5, 0.08, 0.62), M("#7A2A22", 0.6), [0, -0.3, -0.85], [0.2, 0, 0]);
  for (const sx of [-1, 1]) {
    add(head, new SphereGeometry(0.13, 12, 10), glow("#FFD24A", 1.2), [sx * 0.36, 0.18, -0.5]);
    add(head, new SphereGeometry(0.06, 8, 6), M("#1A1410", 0.2), [sx * 0.4, 0.19, -0.6]);
    add(head, tube(new CatmullRomCurve3([new Vector3(sx * 0.25, 0.35, -0.1), new Vector3(sx * 0.45, 0.9, 0.3), new Vector3(sx * 0.38, 1.3, 0.9), new Vector3(sx * 0.6, 1.5, 1.2)]), 0.06, 16, 6), hornM);
    add(head, new ConeGeometry(0.12, 0.5, 5), M(P.back2, 0.6), [sx * 0.55, 0.3, 0.2], [0, 0, sx * 1.2]);
  }
  const whiskers = [-1, 1].map((sx) => { const w = new Mesh(new BufferGeometry(), M(P.mane, 0.8)); head.add(w); return { w, sx }; });
  const beard = Array.from({ length: 5 }, (_, k) => add(head, new ConeGeometry(0.05, 0.6, 4), maneM, [-0.16 + k * 0.08, -0.55, -0.7], [Math.PI * 0.85, 0, 0]));
  const pearl = new Mesh(new SphereGeometry(0.45, 18, 14), glow("#FFF2C8", 1.4)); g.add(pearl);
  const pearlHalo = halo(g, [0, 0, 0], "#FFE7A0", 3.2);
  const legs: { L: Group; at: number; sd: number }[] = [];
  for (const at of [10, 34]) for (const sd of [-1, 1]) {
    const L = new Group(); add(L, cyl(0.12, 0.09, 0.9, 6), M(P.back, 0.6), [0, -0.45, 0]);
    for (let k = 0; k < 3; k++) add(L, new ConeGeometry(0.05, 0.25, 4), M("#F2EFE6", 0.4), [(-1 + k) * 0.08, -0.95, -0.08], [Math.PI * 0.8, 0, 0]);
    g.add(L); legs.push({ L, at, sd });
  }
  const tailFin = new Mesh(new ConeGeometry(0.5, 1.6, 4), finM); g.add(tailFin);
  // the spine follows a history of the head's path
  const hist: Vector3[] = [], spine = Array.from({ length: N + 1 }, () => new Vector3());
  const up = new Vector3(0, 1, 0), tg = new Vector3(), nm = new Vector3(), bn = new Vector3(), tmp = new Vector3();
  const radius = (i: number) => { const t = i / N; return (t < 0.06 ? 0.55 + t * 6 : 1.0 - t * 0.82) * 0.95 + 0.08; };
  g.userData.update = (t: number, headPos: Vector3, headDir: Vector3) => {
    hist.unshift(headPos.clone()); if (hist.length > 520) hist.length = 520;
    // resample the spine at equal arc lengths
    let acc = 0, j = 0; spine[0].copy(hist[0]); const step = LEN / N;
    for (let i = 1; i <= N; i++) {
      const target = i * step; let placed = false;
      while (j < hist.length - 1) { const d = hist[j].distanceTo(hist[j + 1]); if (acc + d >= target) { spine[i].copy(hist[j]).lerp(hist[j + 1], (target - acc) / Math.max(d, 1e-5)); placed = true; break; } acc += d; j++; }
      if (!placed) spine[i].copy(hist[hist.length - 1]).addScaledVector(headDir, -(target - acc));
    }
    for (let i = 0; i <= N; i++) {
      const a = spine[Math.max(0, i - 1)], b = spine[Math.min(N, i + 1)];
      tg.subVectors(a, b).normalize(); if (tg.lengthSq() < 0.5) tg.copy(headDir);
      nm.crossVectors(tg, up).normalize(); if (nm.lengthSq() < 0.5) nm.set(1, 0, 0);
      bn.crossVectors(nm, tg).normalize();
      const r = radius(i), wob = Math.sin(t * 3 - i * 0.35) * 0.05;
      for (let s = 0; s < SIDES; s++) { const ang = (s / SIDES) * Math.PI * 2, k = (i * SIDES + s) * 3; tmp.copy(spine[i]).addScaledVector(nm, Math.sin(ang) * r).addScaledVector(bn, Math.cos(ang) * r * (1 + wob)); pos[k] = tmp.x; pos[k + 1] = tmp.y; pos[k + 2] = tmp.z; }
      const f = fins.find((o) => o.i === i);
      if (f) { f.m.position.copy(spine[i]).addScaledVector(bn, r + 0.25); f.m.lookAt(tmp.copy(f.m.position).add(bn)); f.m.rotateX(Math.PI / 2); }
      manes.forEach((m) => { if (m.i === i) { m.m.position.copy(spine[i]).addScaledVector(bn, r * 0.7).addScaledVector(nm, m.sd * r * 0.7); m.m.lookAt(tmp.copy(m.m.position).addScaledVector(tg, -1).addScaledVector(nm, m.sd * 0.6).addScaledVector(bn, 0.3)); m.m.rotateX(Math.PI / 2); m.m.rotation.z += Math.sin(t * 5 + i) * 0.15; } });
      legs.forEach((L) => { if (L.at === i) { L.L.position.copy(spine[i]).addScaledVector(nm, L.sd * r * 0.9).addScaledVector(bn, -r * 0.4); L.L.lookAt(tmp.copy(L.L.position).add(tg)); L.L.rotation.x += Math.sin(t * 4 + i) * 0.4; } });
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    head.position.copy(spine[0]).addScaledVector(headDir, 0.3); head.lookAt(tmp.copy(head.position).sub(headDir)); head.rotateY(Math.PI);
    tailFin.position.copy(spine[N]); tailFin.lookAt(tmp.copy(spine[N - 2])); tailFin.rotateX(-Math.PI / 2); tailFin.scale.set(0.25, 1, 1.4);
    pearl.position.copy(spine[0]).addScaledVector(headDir, 3.2 + Math.sin(t * 1.3) * 0.6); pearl.position.y += Math.sin(t * 2) * 0.4; pearlHalo.position.copy(pearl.position);
    whiskers.forEach(({ w, sx }) => {
      const pts: Vector3[] = [];
      for (let k = 0; k < 6; k++) pts.push(new Vector3(sx * (0.3 + k * 0.35), -0.1 - k * 0.12 + Math.sin(t * 3 + k + sx) * 0.12 * k, -1.2 + k * 0.45 + Math.cos(t * 2 + k) * 0.1 * k));
      w.geometry.dispose(); w.geometry = tube(new CatmullRomCurve3(pts), 0.025, 14, 4);
    });
    beard.forEach((bd, k) => { bd.rotation.z = Math.sin(t * 3 + k) * 0.15; });
  };
  return g;
}
void Sphere;
