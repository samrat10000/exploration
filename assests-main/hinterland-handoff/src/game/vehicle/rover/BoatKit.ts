// Rover boat kit (JOURNEYS §2.3): side panels lift out into two floats, a small prop drops down at the
// back. Built in the Rover's own materials (sand paint, charcoal trim); deploy 0 → 1 over the 3 s
// transformation. The wheels fold up separately (Boat.tsx).
import { ConeGeometry, Group, Shape, ExtrudeGeometry } from "three";
import { M, add, bakeStatic, box, cyl } from "../../art/kit";

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const phase = (t: number, a: number, b: number) => ease((t - a) / (b - a));

export function buildBoatKit() {
  const g = new Group(), paint = M("#C7AB78", 0.48, 0.15), trim = M("#2A2E31", 0.8, 0.1), steel = M("#8E908C", 0.35, 0.6);
  // a float: a rounded pontoon profile (side view) extruded across its width, nose turned up
  const s = new Shape();
  s.moveTo(2.4, 0.15); s.lineTo(-2.0, 0.15); s.quadraticCurveTo(-2.55, 0.15, -2.6, 0.55); s.lineTo(-2.45, 0.7); s.lineTo(2.3, 0.7); s.quadraticCurveTo(2.5, 0.6, 2.4, 0.15);
  const floats: Group[] = [];
  for (const sx of [-1, 1]) {
    const piv = new Group(); piv.position.set(sx * 1.05, 0.9, 0); g.add(piv); floats.push(piv);
    const part = new Group(), fg = new ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 8 });
    fg.rotateY(-Math.PI / 2); fg.translate(0.275, -0.9, 0);
    add(part, fg, paint, [sx * 0.42, 0, 0]);
    add(part, box(0.04, 0.06, 4.6), trim, [sx * 0.72, -0.5, 0]);
    for (const z of [-1.4, 0, 1.4]) add(part, box(0.5, 0.08, 0.1), steel, [sx * 0.2, -0.2, z]);
    piv.add(...bakeStatic(part).children);
  }
  const prop = new Group(); prop.position.set(0, 0.4, 2.35); g.add(prop);
  add(prop, cyl(0.05, 0.05, 0.9, 8), steel, [0, -0.1, 0]);
  const hub = new Group(); hub.position.set(0, -0.55, 0.05); prop.add(hub);
  add(hub, new ConeGeometry(0.07, 0.16, 10), steel, null, [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 3; k++) { const bl = add(hub, box(0.07, 0.32, 0.02), trim); bl.geometry.translate(0, 0.16, 0); bl.rotation.z = k * 2.094; }
  let spin = 0;
  /** t: 0 = the Rover as it drives, 1 = afloat. propSpeed 0..1. */
  const set = (t: number, propSpeed: number, dt: number) => {
    const f = phase(t, 0.1, 0.6);
    floats.forEach((p, i) => { const sx = i ? 1 : -1; p.rotation.z = sx * (1 - f) * 1.3; p.scale.setScalar(Math.max(0.001, f)); });
    const pr = phase(t, 0.55, 0.95); prop.position.y = 0.4 + (1 - pr) * 0.6; prop.visible = pr > 0.02;
    spin += propSpeed * 30 * dt; hub.rotation.z = spin;
  };
  set(0, 0, 0);
  g.userData.set = set;
  return g;
}
