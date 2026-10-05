// Garage decor (cosmetic only): rack lights, a charm, prayer flags. Built once per vehicle onto its body group, shown or hidden each frame
// from the saved choice (extra.mods[vehicle].rack / .charm). Positions come from the body's own bounding box, so every vehicle fits.
import { Box3, Group, SphereGeometry, Vector3 } from "three";
import { M, add, box, cyl, glow, halo } from "../art/kit";
import { flagLine } from "../world/props/house";
import { modsOf } from "./mods";

export function attachDecor(body: Group, vehicle: string) {
  const b = new Box3().setFromObject(body), c = b.getCenter(new Vector3()), h = b.max.y - b.min.y, L = b.max.z - b.min.z,
    // the bounding box includes the antenna and the spare wheel: aim for the roof itself (about 72% up, the cab starting a third of the way back)
    top = b.min.y + h * 0.7, front = b.min.z + L * 0.3, w = (b.max.x - b.min.x) * 0.36;
  const root = new Group(), lights = new Group(), star = new Group(), flags = new Group(), scarf = new Group();
  // rack lights: a small bar of warm lamps on the roof front
  add(lights, box(w * 1.6, 0.1, 0.12), M("#2A2E31", 0.6), [c.x, top + 0.12, front]);
  for (let i = 0; i < 4; i++) add(lights, cyl(0.07, 0.07, 0.1, 10), glow("#FFE3A8", 1.6), [c.x + (i - 1.5) * w * 0.45, top + 0.2, front - 0.05], [Math.PI / 2, 0, 0]);
  halo(lights, [c.x, top + 0.25, front - 0.2], "#FFD58A", 1.6);
  // a gold star charm on a thread from the front of the roof
  add(star, cyl(0.008, 0.008, 0.5, 4), M("#D9C9A0", 0.8), [c.x - w * 0.5, top - 0.2, front + 0.1]);
  for (let k = 0; k < 5; k++) add(star, box(0.22, 0.05, 0.03), M("#E9C47E", 0.4, 0.5), [c.x - w * 0.5, top - 0.55, front + 0.1], [0, 0, (k / 5) * Math.PI]);
  // a scarf knotted at the back of the roof (the Tortoise: the ladder top), its two tails trailing back and down
  const sa = vehicle === "tortoise" ? new Vector3(0.45, 2.02, 1.88) : new Vector3(c.x + w, top, b.max.z - L * 0.12);
  scarf.position.copy(sa);
  add(scarf, new SphereGeometry(0.06, 8, 6), M("#B0473A", 0.9), [0, 0, 0]);
  add(scarf, box(0.16, 0.02, 0.55), M("#B0473A", 0.9), [0.04, -0.12, 0.26], [0.45, 0, 0]);
  add(scarf, box(0.13, 0.02, 0.42), M("#E9DFC9", 0.9), [-0.06, -0.16, 0.2], [0.7, 0.15, 0]);
  // prayer flags strung between two short poles standing on the roof (the Tortoise's along its roof rail, just outside the pop-up tent)
  const t = vehicle === "tortoise", base = t ? 1.97 : top,
    a = t ? new Vector3(0.8, 2.42, -1.2) : new Vector3(c.x - w, top + 0.35, front + 0.4), z = t ? new Vector3(0.8, 2.42, 1.2) : new Vector3(c.x + w, top + 0.35, b.max.z - L * 0.3);
  for (const p of [a, z]) add(flags, cyl(0.018, 0.018, p.y - base + 0.02, 6), M("#7A5A3E", 0.85), [p.x, (p.y + base) / 2, p.z]);
  flagLine(flags, a, z, 9, 0.18);
  if (t) { // and the same on the other rail
    const a2 = a.clone().setX(-0.8), z2 = z.clone().setX(-0.8);
    for (const p of [a2, z2]) add(flags, cyl(0.018, 0.018, p.y - base + 0.02, 6), M("#7A5A3E", 0.85), [p.x, (p.y + base) / 2, p.z]);
    flagLine(flags, a2, z2, 9, 0.18);
  }
  root.add(lights, star, flags, scarf);
  body.add(root);
  return () => {
    const m = modsOf(vehicle);
    lights.visible = m.rack === "lights"; flags.visible = m.rack === "flags";
    star.visible = m.charm === "star"; scarf.visible = m.charm === "scarf";
    if (scarf.visible) scarf.rotation.set(Math.sin(performance.now() * 0.003) * 0.08, Math.sin(performance.now() * 0.0021) * 0.12, 0);
  };
}
