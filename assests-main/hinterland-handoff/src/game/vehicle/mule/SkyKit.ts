// Sky Kit (assets.html → SKY MULE): canvas wings, struts, tail fin + tailplane and a pusher prop,
// ported from buildSkyMule() with each part on a pivot so the kit can unfold (deploy 0 → 1).
// Folded: wings flat on the roof, struts in, tail down, prop tucked under the rack.
import { ConeGeometry, DoubleSide, ExtrudeGeometry, Group, LineCurve3, Shape, Vector3 } from "three";
import { M, add, bakeStatic, box, tube } from "../../art/kit";

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** part timings within the 3 s unfold: roof latches → wings → struts → tail → prop */
const SEQ = { wings: [0.08, 0.55], struts: [0.4, 0.7], tail: [0.55, 0.85], prop: [0.75, 1] } as const;
const phase = (t: number, [a, b]: readonly [number, number]) => ease((t - a) / (b - a));

export function buildSkyKit() {
  const g = new Group(), canvas = M("#EFE6D3", 0.85, 0, { side: DoubleSide }), strut = M("#6B5034", 0.8), Y = 0.2;
  const wing = new Shape(); wing.moveTo(0, 0); wing.lineTo(3.4, 0.18); wing.quadraticCurveTo(3.6, 0.2, 3.55, 0.5); wing.lineTo(0.0, 0.95); wing.lineTo(0, 0);
  const wings: Group[] = [], struts: Group[] = [];
  for (const sx of [-1, 1]) {
    // wing + its ribs + tip on one pivot at the root (rotates up and over onto the roof when folded)
    const piv = new Group(); piv.position.set(sx * 0.72, 2.02 + Y, -1.3); g.add(piv); wings.push(piv);
    const part = new Group();
    const wg = new ExtrudeGeometry(wing, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
    wg.rotateX(Math.PI / 2); if (sx < 0) wg.scale(-1, 1, 1);
    add(part, wg, canvas);
    for (let k = 1; k < 4; k++) add(part, box(0.03, 0.03, 0.9 - k * 0.12), strut, [sx * k * 0.85, 0.03, 0.45 + k * 0.02]);
    add(part, box(0.5, 0.03, 0.3), M("#C9473A", 0.7), [sx * 3.23, 0.04, 0.35]);
    piv.add(...bakeStatic(part).children);
    // the diagonal strut, from the cab side up under the wing
    const sp = new Group(); sp.position.set(sx * 0.7, 1.0 + Y, -1.0); g.add(sp); struts.push(sp);
    add(sp, tube(new LineCurve3(new Vector3(0, 0, 0), new Vector3(sx * 1.6, 1.0, 0.1)), 0.02, 4, 6), strut);
  }
  // tail fin + tailplane rise from the rack
  const tail = new Group(); tail.position.set(0, 1.2, 1.5); g.add(tail);
  add(tail, box(0.08, 0.9, 0.7), canvas, [0, 0.45, 0]);
  add(tail, box(1.6, 0.05, 0.5), canvas, [0, 0.05, 0.12]);
  // pusher prop drops in behind
  const prop = new Group(); prop.position.set(0, 1.25, 1.95); g.add(prop);
  const hub = new Group(); prop.add(hub);
  add(hub, new ConeGeometry(0.09, 0.2, 12), M("#C9CCCB", 0.3, 0.8), null, [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 3; k++) { const bl = add(hub, box(0.09, 0.75, 0.02), M("#7A5A3E", 0.6)); bl.geometry.translate(0, 0.38, 0); bl.rotation.z = k * 2.094; }
  let spin = 0;
  /** t: 0 folded … 1 flying; prop: spin speed 0..1 */
  const set = (t: number, propSpeed: number, dt: number) => {
    const w = phase(t, SEQ.wings);
    wings.forEach((p, i) => { const sx = i ? 1 : -1; p.rotation.z = sx * (1 - w) * 2.95; });
    const s = phase(t, SEQ.struts); struts.forEach((p) => { p.scale.setScalar(Math.max(0.001, s)); });
    const tl = phase(t, SEQ.tail); tail.scale.set(1, Math.max(0.001, tl), 1); tail.position.y = 0.6 + tl * 0.6;
    const pr = phase(t, SEQ.prop); prop.position.set(0, 0.7 + pr * 0.55, 1.6 + pr * 0.35); prop.visible = pr > 0.02;
    spin += propSpeed * 28 * dt; hub.rotation.z = spin;
  };
  set(0, 0, 0);
  g.userData.set = set;
  return g;
}
