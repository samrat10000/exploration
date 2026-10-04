// Rover glider kit (JOURNEYS §2.3): the side panels swing up and out into two long wings, struts
// brace them, and a small tail rises off the ladder. No prop: the glider lives on rising air.
// Built in the Sky Kit's style (canvas over timber ribs); deploy 0 → 1 like buildSkyKit().
import { DoubleSide, ExtrudeGeometry, Group, LineCurve3, Shape, Vector3 } from "three";
import { M, add, bakeStatic, box, tube } from "../../art/kit";

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const phase = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export function buildGliderKit() {
  const g = new Group(), canvas = M("#D9CBA6", 0.85, 0, { side: DoubleSide }), rib = M("#2A2E31", 0.8, 0.1), tip = M("#C7AB78", 0.5, 0.15);
  const wing = new Shape(); wing.moveTo(0, 0); wing.lineTo(4.2, 0.25); wing.quadraticCurveTo(4.45, 0.3, 4.4, 0.75); wing.lineTo(0, 1.5); wing.lineTo(0, 0);
  const wings: Group[] = [], struts: Group[] = [];
  for (const sx of [-1, 1]) {
    const piv = new Group(); piv.position.set(sx * 1.0, 1.9, -0.6); g.add(piv); wings.push(piv);
    const part = new Group(), wg = new ExtrudeGeometry(wing, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    wg.rotateX(Math.PI / 2); if (sx < 0) wg.scale(-1, 1, 1);
    add(part, wg, canvas);
    for (let k = 1; k < 5; k++) add(part, box(0.035, 0.035, 1.4 - k * 0.2), rib, [sx * k * 0.85, 0.03, 0.7 - k * 0.05]);
    add(part, box(0.45, 0.04, 0.35), tip, [sx * 4.15, 0.04, 0.5]);
    piv.add(...bakeStatic(part).children);
    const sp = new Group(); sp.position.set(sx * 1.0, 1.0, -0.4); g.add(sp); struts.push(sp);
    add(sp, tube(new LineCurve3(new Vector3(0, 0, 0), new Vector3(sx * 2.0, 0.9, -0.1)), 0.025, 4, 6), rib);
  }
  const tail = new Group(); tail.position.set(0, 2.2, 2.0); g.add(tail);
  add(tail, box(0.07, 0.8, 0.6), canvas, [0, 0.4, 0]);
  add(tail, box(1.8, 0.05, 0.45), canvas, [0, 0.05, 0.1]);
  const set = (t: number) => {
    // folded: panels hang down the sides like doors; out: level wings
    const w = phase(t, 0.08, 0.6);
    wings.forEach((p, i) => { const sx = i ? 1 : -1; p.rotation.z = -sx * (1 - w) * 1.45; });
    const s = phase(t, 0.45, 0.75); struts.forEach((p) => p.scale.setScalar(Math.max(0.001, s)));
    const tl = phase(t, 0.6, 0.9); tail.scale.set(1, Math.max(0.001, tl), 1);
  };
  set(0);
  g.userData.set = set;
  return g;
}
