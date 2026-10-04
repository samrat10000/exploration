// The Rover (assets.html → ROVER). Forward = -Z, metres, ground at y = 0. Ported unchanged except
// the four road wheels and the paint material are handed back in userData.
import { CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, MeshStandardMaterial, PlaneGeometry, QuadraticBezierCurve3, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { M, add, box, buildWheel, cyl, glow, lin, tube } from "../../art/kit";

export function buildRover() {
  const g = new Group(), W = 1.9, wheels: Group[] = [];
  const paint = M("#C7AB78", 0.48, 0.15), trim = M("#2A2E31", 0.8, 0.1), chrome = M("#C9CCCB", 0.25, 0.9);
  const glassM = new MeshStandardMaterial({ color: lin("#8FB0BC"), roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.5, side: DoubleSide });
  const interior = M("#1C2427", 0.9);
  const s = new Shape();
  s.moveTo(2.05, 0.62); s.lineTo(-2.0, 0.62); s.quadraticCurveTo(-2.12, 0.62, -2.12, 0.78); s.lineTo(-2.1, 1.12); s.quadraticCurveTo(-2.06, 1.24, -1.9, 1.25);
  s.lineTo(-0.95, 1.3); s.lineTo(-0.7, 1.98); s.quadraticCurveTo(-0.66, 2.04, -0.56, 2.04); s.lineTo(1.9, 2.04); s.quadraticCurveTo(2.02, 2.04, 2.04, 1.92); s.lineTo(2.05, 0.62);
  const body = new ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 4, curveSegments: 10 });
  body.rotateY(-Math.PI / 2); body.translate(W / 2, 0, 0);
  add(g, body, paint);
  add(g, box(W + 0.18, 0.2, 4.3), trim, [0, 0.66, 0]);
  // glass: windscreen + side + rear
  const ang = Math.atan2(0.25, 0.68), wl = Math.hypot(0.25, 0.68);
  const ws = new Group(); ws.position.set(0, 1.64, -0.84); ws.rotation.x = ang; g.add(ws);
  add(ws, new PlaneGeometry(W - 0.2, wl - 0.12), interior, [0, 0, -0.075], [0, Math.PI, 0]);
  add(ws, new PlaneGeometry(W - 0.2, wl - 0.12), glassM, [0, 0, -0.085], [0, Math.PI, 0]).castShadow = false;
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-0.72, 0.3], [0.42, 1.85]]) {
    const sh = new Shape(); sh.moveTo(z0, 1.4); sh.lineTo(z1, 1.4); sh.lineTo(z1, 1.92); sh.lineTo(z0 + (z0 < 0 ? 0.16 : 0), 1.92); sh.lineTo(z0, 1.4);
    const a = new ShapeGeometry(sh); a.rotateY(-Math.PI / 2); add(g, a, interior, [sx * (W / 2 + 0.072), 0, 0]).material.side = DoubleSide;
    const b = new ShapeGeometry(sh); b.rotateY(-Math.PI / 2); add(g, b, glassM, [sx * (W / 2 + 0.08), 0, 0]).castShadow = false;
  }
  add(g, new PlaneGeometry(1.5, 0.5), interior, [0, 1.66, 2.125]);
  add(g, new PlaneGeometry(1.5, 0.5), glassM, [0, 1.66, 2.13]).castShadow = false;
  // door seams, handles, steps
  for (const sx of [-1, 1]) {
    for (const z of [-0.75, 0.36, 1.5]) add(g, box(0.012, 0.62, 0.012), trim, [sx * (W / 2 + 0.072), 1.0, z]);
    add(g, box(0.03, 0.03, 0.16), chrome, [sx * (W / 2 + 0.085), 1.2, 0.15]);
    add(g, box(0.18, 0.05, 1.4), trim, [sx * (W / 2 + 0.1), 0.55, 0.15]);
  }
  // flares
  for (const sx of [-1, 1]) for (const z of [-1.38, 1.38]) {
    const f = new CylinderGeometry(0.62, 0.62, 0.24, 16, 1, true, -Math.PI * 0.12, Math.PI * 0.82); f.rotateZ(Math.PI / 2);
    add(g, f, trim, [sx * (W / 2 + 0.02), 0.5, z]).material.side = DoubleSide;
  }
  // front: grille, lamps, bull bar, light bar
  for (let i = 0; i < 6; i++) add(g, box(0.05, 0.32, 0.02), trim, [-0.5 + i * 0.2, 1.0, -2.2]);
  for (const sx of [-1, 1]) {
    add(g, cyl(0.11, 0.11, 0.06, 18), trim, [sx * 0.72, 1.02, -2.19], [Math.PI / 2, 0, 0]);
    add(g, new CircleGeometry(0.085, 18), glow("#FFF1CF", 0.9), [sx * 0.72, 1.02, -2.225], [0, Math.PI, 0]);
    add(g, box(0.12, 0.06, 0.03), glow("#F2A03A", 0.3), [sx * 0.85, 0.8, -2.2]);
  }
  add(g, tube(new CatmullRomCurve3([new Vector3(-0.85, 0.55, -2.3), new Vector3(-0.75, 0.95, -2.38), new Vector3(0.75, 0.95, -2.38), new Vector3(0.85, 0.55, -2.3)]), 0.04, 24, 8), trim);
  add(g, box(1.2, 0.1, 0.14), trim, [0, 2.13, -0.62]);
  for (let i = 0; i < 4; i++) add(g, box(0.2, 0.06, 0.02), glow("#FFF6E0", 0.5), [-0.45 + i * 0.3, 2.13, -0.7]);
  // snorkel
  add(g, tube(new CatmullRomCurve3([new Vector3(0.98, 1.05, -1.5), new Vector3(1.0, 1.4, -1.0), new Vector3(1.0, 2.1, -0.82), new Vector3(0.95, 2.3, -0.8)]), 0.055, 20, 8), trim);
  // roof rack: rails, crossbars, jerry cans, rolled tarp
  for (const sx of [-1, 1]) add(g, box(0.05, 0.05, 2.5), M("#8E908C", 0.35, 0.6), [sx * 0.82, 2.2, 0.65]);
  for (let i = 0; i < 4; i++) add(g, box(1.7, 0.04, 0.05), M("#8E908C", 0.35, 0.6), [0, 2.2, -0.5 + i * 0.75]);
  for (const x of [-0.45, 0.45]) add(g, box(0.3, 0.42, 0.5), M("#5F6E52", 0.6), [x, 2.44, 1.4]);
  add(g, cyl(0.16, 0.16, 1.3, 14), M("#A88E5E", 0.9), [0, 2.38, 0.3], [0, 0, Math.PI / 2]);
  for (const x of [-0.4, 0.4]) add(g, new TorusGeometry(0.165, 0.015, 6, 18), M("#5A4632", 0.8), [x, 2.38, 0.3], [0, Math.PI / 2, 0]);
  // rear: ladder, spare, lights
  for (const sx of [-1, 1]) add(g, box(0.035, 1.3, 0.035), M("#8E908C", 0.35, 0.6), [sx * 0.55 + 0.5, 1.45, 2.2]);
  for (let i = 0; i < 5; i++) add(g, box(0.33, 0.03, 0.03), M("#8E908C", 0.35, 0.6), [0.5, 0.95 + i * 0.25, 2.2]);
  const spare = buildWheel(0.42, 0.28); spare.rotation.y = Math.PI / 2; spare.position.set(-0.35, 1.25, 2.28); g.add(spare);
  add(g, cyl(0.43, 0.43, 0.1, 24), M("#6B6F5A", 0.9), [-0.35, 1.25, 2.43], [Math.PI / 2, 0, 0]);
  for (const sx of [-1, 1]) add(g, box(0.12, 0.3, 0.04), glow("#C2321F", 0.55), [sx * 0.86, 1.08, 2.13]);
  add(g, box(2.0, 0.2, 0.18), trim, [0, 0.72, 2.18]);
  for (const sx of [-1, 1]) for (const z of [-1.38, 1.38]) { const w = buildWheel(0.46, 0.38); w.position.set(sx * 0.98, 0.46, z); g.add(w); wheels.push(w); }
  for (const sx of [-1, 1]) {
    add(g, tube(new QuadraticBezierCurve3(new Vector3(sx * 0.9, 1.38, -0.72), new Vector3(sx * 1.1, 1.38, -0.75), new Vector3(sx * 1.14, 1.5, -0.72)), 0.014, 10, 6), trim);
    add(g, new SphereGeometry(0.11, 12, 10), trim, [sx * 1.15, 1.55, -0.72], null, [0.4, 1, 0.8]);
  }
  g.userData = { wheels, paint };
  return g;
}
