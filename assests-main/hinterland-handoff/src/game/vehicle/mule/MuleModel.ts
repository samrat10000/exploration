// The Mule (assets.html → MULE). 3-wheel cargo auto, forward = -Z, metres, ground at y = 0.
// Ported unchanged except: wheels and paint materials are handed back in userData so the game
// can spin the wheels and repaint the cab; crates are live cargo, so opts.cargo is off in game.
import { CatmullRomCurve3, CircleGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, LineCurve3, MeshStandardMaterial, PlaneGeometry, QuadraticBezierCurve3, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { M, add, box, buildWheel, catenary, cyl, glow, lathe, lin, rng, tube } from "../../art/kit";
import { buildCrate } from "../cargo/CrateModel";

export function buildMule(opts: { paint?: string; paintDark?: string; cargo?: boolean } = {}) {
  const g = new Group(), Y = 0.2, W = 1.26, wheels: Group[] = [];
  const paint = M(opts.paint || "#4F8C88", 0.5, 0.12), paintD = M(opts.paintDark || "#3C6F6B", 0.55, 0.12);
  const cream = M("#E6DCC4", 0.6), chrome = M("#D2D4D0", 0.22, 0.9), dark = M("#2B2A27", 0.8), rubber = M("#232220", 0.95);
  const glassM = new MeshStandardMaterial({ color: lin("#9CC2C8"), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45 });
  const interior = M("#1E2A2C", 0.9);
  // cab shell: side profile (z,y) extruded across X with a soft bevel
  const s = new Shape();
  s.moveTo(-0.32, 0.42 + Y); s.lineTo(-1.28, 0.42 + Y);
  s.quadraticCurveTo(-1.52, 0.44 + Y, -1.53, 0.74 + Y);
  s.lineTo(-1.50, 0.98 + Y); s.lineTo(-1.31, 1.70 + Y);
  s.quadraticCurveTo(-1.28, 1.77 + Y, -1.18, 1.77 + Y);
  s.lineTo(-0.42, 1.77 + Y); s.quadraticCurveTo(-0.32, 1.77 + Y, -0.32, 1.67 + Y); s.lineTo(-0.32, 0.42 + Y);
  const cabG = new ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 12 });
  cabG.rotateY(-Math.PI / 2); cabG.translate(W / 2, 0, 0);
  add(g, cabG, paint);
  // lower two-tone skirt + belt line
  for (const sx of [-1, 1]) {
    add(g, box(0.02, 0.3, 1.14), paintD, [sx * (W / 2 + 0.065), 0.62 + Y, -0.9]);
    add(g, box(0.025, 0.035, 1.16), chrome, [sx * (W / 2 + 0.068), 0.8 + Y, -0.9]);
  }
  // windscreen: interior + glass + rubber seal + wiper
  const ang = Math.atan2(0.19, 0.72), wsLen = Math.hypot(0.19, 0.72);
  const ws = new Group(); ws.position.set(0, 1.34 + Y, -1.47); ws.rotation.x = ang; g.add(ws);
  add(ws, new PlaneGeometry(W - 0.1, wsLen - 0.1), interior, [0, 0, -0.052], [0, Math.PI, 0]);
  add(ws, new PlaneGeometry(W - 0.1, wsLen - 0.1), glassM, [0, 0, -0.062], [0, Math.PI, 0]).castShadow = false;
  for (const [w, h, x, y] of [[W - 0.06, 0.03, 0, (wsLen - 0.07) / 2], [W - 0.06, 0.03, 0, -(wsLen - 0.07) / 2], [0.03, wsLen - 0.06, (W - 0.07) / 2, 0], [0.03, wsLen - 0.06, -(W - 0.07) / 2, 0]]) add(ws, box(w, h, 0.02), rubber, [x, y, -0.06]);
  add(ws, box(0.5, 0.018, 0.015), dark, [0.12, -0.2, -0.075], [0, 0, 0.5]);
  // side windows (door glass) + door seam + handle
  const sw = new Shape(); sw.moveTo(-1.35, 1.06 + Y); sw.lineTo(-0.56, 1.06 + Y); sw.lineTo(-0.56, 1.6 + Y); sw.lineTo(-1.2, 1.6 + Y); sw.lineTo(-1.35, 1.06 + Y);
  for (const sx of [-1, 1]) {
    const gi = new ShapeGeometry(sw); gi.rotateY(-Math.PI / 2);
    add(g, gi, interior, [sx * (W / 2 + 0.062), 0, 0]).material.side = DoubleSide;
    const gg = new ShapeGeometry(sw); gg.rotateY(-Math.PI / 2);
    const gl = add(g, gg, glassM, [sx * (W / 2 + 0.07), 0, 0]); gl.castShadow = false; glassM.side = DoubleSide;
    add(g, box(0.015, 1.22, 0.015), paintD, [sx * (W / 2 + 0.066), 1.05 + Y, -0.5]);
    add(g, box(0.03, 0.03, 0.12), chrome, [sx * (W / 2 + 0.08), 0.98 + Y, -0.66]);
  }
  // roof: rounded slab with overhang + gutter
  const rr = new Shape(), RL = 1.42, RW = 1.46, rc = 0.14;
  rr.moveTo(-RW / 2 + rc, -RL / 2); rr.lineTo(RW / 2 - rc, -RL / 2); rr.quadraticCurveTo(RW / 2, -RL / 2, RW / 2, -RL / 2 + rc); rr.lineTo(RW / 2, RL / 2 - rc); rr.quadraticCurveTo(RW / 2, RL / 2, RW / 2 - rc, RL / 2);
  rr.lineTo(-RW / 2 + rc, RL / 2); rr.quadraticCurveTo(-RW / 2, RL / 2, -RW / 2, RL / 2 - rc); rr.lineTo(-RW / 2, -RL / 2 + rc); rr.quadraticCurveTo(-RW / 2, -RL / 2, -RW / 2 + rc, -RL / 2);
  const roofG = new ExtrudeGeometry(rr, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }); roofG.rotateX(Math.PI / 2);
  add(g, roofG, cream, [0, 1.92 + Y, -0.92]);
  add(g, box(RW - 0.1, 0.04, RL - 0.1), M("#D6CBB1", 0.7), [0, 1.86 + Y, -0.92]);
  // nose: headlight pod, indicators, horn grille, plate
  add(g, cyl(0.13, 0.14, 0.12, 20), paint, [0, 0.82 + Y, -1.6], [Math.PI / 2, 0, 0]);
  add(g, new TorusGeometry(0.12, 0.018, 8, 24), chrome, [0, 0.82 + Y, -1.665]);
  add(g, new CircleGeometry(0.11, 24), glow("#FFF1CF", 0.9), [0, 0.82 + Y, -1.668], [0, Math.PI, 0]);
  for (const sx of [-1, 1]) add(g, box(0.09, 0.05, 0.04), glow("#F2A03A", 0.35), [sx * 0.52, 0.64 + Y, -1.55]);
  for (let i = 0; i < 4; i++) add(g, box(0.36, 0.012, 0.02), dark, [0, 0.5 + Y + i * 0.03, -1.56]);
  add(g, box(0.32, 0.09, 0.015), M("#E8C547", 0.6), [0, 0.32 + Y, -1.56]);
  // front wheel, fork, mudguard
  const fw = buildWheel(0.32, 0.2, { blocks: 20 }); fw.position.set(0, 0.32, -1.2); g.add(fw); wheels.push(fw);
  const guard = new CylinderGeometry(0.4, 0.4, 0.26, 18, 1, true, -Math.PI * 0.15, Math.PI * 0.95); guard.rotateZ(Math.PI / 2);
  add(g, guard, paint, [0, 0.32, -1.2]).material.side = DoubleSide;
  for (const sx of [-1, 1]) add(g, cyl(0.025, 0.025, 0.5, 8), chrome, [sx * 0.14, 0.55, -1.12], [-0.25, 0, 0]);
  // mirrors on stalks + bell charm
  for (const sx of [-1, 1]) {
    const a = new Vector3(sx * 0.62, 1.02 + Y, -1.42), b = new Vector3(sx * 0.86, 1.26 + Y, -1.4);
    add(g, tube(new QuadraticBezierCurve3(a, new Vector3(sx * 0.84, 1.04 + Y, -1.44), b), 0.012, 12, 6), dark);
    add(g, new SphereGeometry(0.1, 14, 10), dark, [sx * 0.88, 1.3 + Y, -1.4], null, [0.75, 1.1, 0.28]);
    add(g, new CircleGeometry(0.08, 18), chrome, [sx * 0.88, 1.3 + Y, -1.37], null, [1, 1.35, 1]);
    if (sx === 1) {
      add(g, tube(new LineCurve3(new Vector3(0.86, 1.2 + Y, -1.4), new Vector3(0.86, 1.05 + Y, -1.4)), 0.004, 2, 4), M("#B23B2E", 0.9));
      add(g, lathe([[0, 0.06], [0.025, 0.055], [0.035, 0.02], [0.045, 0], [0, 0]], 12), M("#C8A24A", 0.3, 0.9), [0.86, 0.98 + Y, -1.4]);
    }
  }
  // chassis, axle, springs, exhaust
  for (const sx of [-1, 1]) add(g, box(0.08, 0.1, 2.1), dark, [sx * 0.42, 0.56, 0.55]);
  add(g, cyl(0.045, 0.045, 1.18, 10), dark, [0, 0.32, 1.15], [0, 0, Math.PI / 2]);
  add(g, new SphereGeometry(0.12, 12, 10), dark, [0, 0.32, 1.15], null, [1, 0.8, 1.1]);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add(g, box(0.06, 0.02, 0.7 - i * 0.15), M("#3B3934", 0.6, 0.5), [sx * 0.42, 0.42 + i * 0.025, 1.15]);
  add(g, tube(new CatmullRomCurve3([new Vector3(-0.3, 0.45, 0.2), new Vector3(-0.5, 0.4, 1.2), new Vector3(-0.55, 0.42, 1.7)]), 0.03, 16, 8), M("#6E6A63", 0.4, 0.7));
  // bed: floor planks, posts, slatted gates, headboard, ladder rack
  const BY = 0.8, BZ0 = -0.27, BZ1 = 1.66, BL = BZ1 - BZ0, BW = 1.44, rnd = rng(7);
  const woods = ["#8A6A45", "#94724B", "#7F6040", "#9C7A50"], wood = () => M(woods[Math.floor(rnd() * 4)], 0.85), post = M("#6B5034", 0.85);
  add(g, box(BW + 0.04, 0.06, BL), dark, [0, BY - 0.06, (BZ0 + BZ1) / 2]);
  for (let i = 0; i < 7; i++) { const pw = BW / 7 - 0.008; add(g, box(pw, 0.04, BL - 0.02), wood(), [-BW / 2 + pw / 2 + 0.004 + i * (BW / 7), BY - 0.01, (BZ0 + BZ1) / 2]); }
  const gateH = 0.46, slat = (len: number, x: number, y: number, z: number, rotY: number) => add(g, box(len, 0.075, 0.035), wood(), [x, y, z], [0, rotY, 0]);
  for (const sx of [-1, 1]) {
    for (const z of [BZ0 + 0.03, 0.7, BZ1 - 0.03]) add(g, box(0.06, gateH + 0.08, 0.06), post, [sx * (BW / 2 - 0.01), BY + gateH / 2, z]);
    for (const y of [BY + 0.1, BY + 0.24, BY + 0.38]) slat(BL - 0.02, sx * (BW / 2 + 0.015), y, (BZ0 + BZ1) / 2, Math.PI / 2);
    add(g, new TorusGeometry(0.03, 0.008, 6, 12), chrome, [sx * (BW / 2 + 0.04), BY + 0.4, 0.2], [0, Math.PI / 2, 0]);
    add(g, new TorusGeometry(0.03, 0.008, 6, 12), chrome, [sx * (BW / 2 + 0.04), BY + 0.4, 1.2], [0, Math.PI / 2, 0]);
  }
  for (const y of [BY + 0.1, BY + 0.24, BY + 0.38]) slat(BW, 0, y, BZ1 + 0.02, 0);
  for (const sx of [-1, 1]) add(g, tube(catenary(new Vector3(sx * 0.6, BY + 0.44, BZ1 + 0.03), new Vector3(sx * 0.72, BY + 0.3, BZ1 - 0.1), 0.05), 0.007, 8, 4), chrome);
  for (const sx of [-1, 1]) add(g, box(0.07, 1.12, 0.07), post, [sx * (BW / 2 - 0.02), BY + 0.56, BZ0 - 0.02]);
  for (const y of [BY + 0.12, BY + 0.28, BY + 0.44, BY + 0.6, BY + 0.78]) slat(BW - 0.04, 0, y, BZ0 - 0.02, 0);
  for (const sx of [-1, 1]) {
    add(g, box(0.045, 0.045, BL + 0.05), M("#5E4630", 0.8), [sx * (BW / 2 - 0.02), BY + 1.1, (BZ0 + BZ1) / 2]);
    add(g, box(0.05, 0.62, 0.05), post, [sx * (BW / 2 - 0.02), BY + 0.79, BZ1 - 0.02]);
  }
  for (const z of [0.35, 1.0]) add(g, box(BW - 0.04, 0.035, 0.045), M("#5E4630", 0.8), [0, BY + 1.1, z]);
  // rear: wheels, lights, flaps, plate
  for (const sx of [-1, 1]) {
    const rw = buildWheel(0.32, 0.2, { blocks: 20 }); rw.position.set(sx * 0.66, 0.32, 1.15); g.add(rw); wheels.push(rw);
    const fender = new CylinderGeometry(0.38, 0.38, 0.24, 16, 1, true, -Math.PI * 0.05, Math.PI * 0.6); fender.rotateZ(Math.PI / 2);
    add(g, fender, paintD, [sx * 0.66, 0.34, 1.15]).material.side = DoubleSide;
    add(g, box(0.12, 0.1, 0.03), glow("#C2321F", 0.55), [sx * 0.6, BY - 0.02, BZ1 + 0.04]);
    add(g, box(0.05, 0.05, 0.02), glow("#F2A03A", 0.25), [sx * 0.6, BY + 0.07, BZ1 + 0.04]);
    add(g, box(0.22, 0.26, 0.015), rubber, [sx * 0.66, 0.26, 1.5], [-0.15, 0, 0]);
  }
  add(g, box(0.3, 0.09, 0.015), M("#E8C547", 0.6), [0, BY - 0.05, BZ1 + 0.045]);
  // cargo
  if (opts.cargo !== false) {
    const crates = [[-0.36, BY + 0.2, 0.05, 0.62, 0.4, 0.5, 2], [0.34, BY + 0.2, 0.08, 0.6, 0.4, 0.55, 3], [-0.33, BY + 0.22, 0.78, 0.62, 0.44, 0.58, 4], [0.33, BY + 0.2, 0.8, 0.56, 0.4, 0.52, 5], [0, BY + 0.62, 0.45, 0.7, 0.4, 0.6, 6], [0.02, BY + 0.2, 1.38, 0.9, 0.4, 0.44, 8]];
    for (const [x, y, z, w, h, d, sd] of crates) { const c = buildCrate(w, h, d, sd); c.position.set(x, y, z); c.rotation.y = ((sd % 3) - 1) * 0.06; g.add(c); }
    g.add(muleRopes(BY));
  }
  g.userData = { wheels, paint, paintDark: paintD };
  return g;
}

/** The rope ties over the load (part of the lab's cargo block; the game shows them while loaded). */
export function muleRopes(BY = 0.8, top = 0.86) {
  const g = new Group(), rope = M("#D9C9A0", 0.95);
  for (const z of [0.15, 0.9]) add(g, tube(new CatmullRomCurve3([new Vector3(-0.76, BY + 0.4, z), new Vector3(-0.4, BY + top, z + 0.1), new Vector3(0.4, BY + top, z + 0.1), new Vector3(0.76, BY + 0.4, z)]), 0.012, 20, 5), rope);
  return g;
}
