// Garage decor (cosmetic only): rack lights, a charm, prayer flags. Built once per vehicle onto its body group, shown or hidden each frame
// from the saved choice (extra.mods[vehicle].rack / .charm). Positions come from the body's own bounding box, so every vehicle fits.
import { Box3, Group, Vector3 } from "three";
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
  // a scarf tied to the antenna side
  add(scarf, box(0.9, 0.18, 0.02), M("#B0473A", 0.9), [c.x + w * 0.9, top + 0.1, c.y * 0 + b.max.z - L * 0.25]);
  add(scarf, box(0.6, 0.18, 0.02), M("#E9DFC9", 0.9), [c.x + w * 0.9 + 0.7, top + 0.0, b.max.z - L * 0.25]);
  // prayer flags strung along the rack
  const a = new Vector3(c.x - w, top + 0.35, front + 0.4), z = new Vector3(c.x + w, top + 0.35, b.max.z - L * 0.3);
  flagLine(flags, a, z, 9, 0.18);
  root.add(lights, star, flags, scarf);
  body.add(root);
  return () => {
    const m = modsOf(vehicle);
    lights.visible = m.rack === "lights"; flags.visible = m.rack === "flags";
    star.visible = m.charm === "star"; scarf.visible = m.charm === "scarf";
  };
}
