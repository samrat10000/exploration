// Traveler / keeper (assets.html → PERSON): simple, friendly, readable silhouettes.
import { Group, SphereGeometry, TorusGeometry } from "three";
import { M, add, bakeStatic, box, cyl } from "../art/kit";

export function buildPerson(kind: "traveler" | "keeper" = "traveler") {
  const g = new Group(), keeper = kind === "keeper";
  const skin = M(keeper ? "#B98A68" : "#C99A74", 0.8), coat = M(keeper ? "#8C5A3C" : "#5F7A8C", 0.85), pants = M(keeper ? "#4A4038" : "#5E5446", 0.9), boots = M("#3A2E25", 0.8);
  for (const sx of [-1, 1]) { add(g, cyl(0.075, 0.065, 0.82, 8), pants, [sx * 0.1, 0.46, 0]); add(g, box(0.13, 0.1, 0.24), boots, [sx * 0.1, 0.05, -0.04]); }
  add(g, cyl(0.2, 0.24, 0.72, 10), coat, [0, 1.2, 0]);
  add(g, cyl(0.245, 0.26, 0.1, 10), M("#4A3A2E", 0.8), [0, 0.88, 0]);
  if (keeper) add(g, box(0.36, 0.62, 0.03), M("#C9B48A", 0.9), [0, 1.0, -0.22]);
  for (const sx of [-1, 1]) { add(g, cyl(0.06, 0.055, 0.62, 7), coat, [sx * 0.27, 1.22, 0], [0, 0, sx * 0.16]); add(g, new SphereGeometry(0.055, 8, 6), skin, [sx * 0.32, 0.9, 0]); }
  add(g, cyl(0.06, 0.07, 0.1, 8), skin, [0, 1.6, 0]);
  add(g, new SphereGeometry(0.15, 14, 12), skin, [0, 1.76, 0], null, [1, 1.08, 1]);
  add(g, new TorusGeometry(0.12, 0.05, 8, 16), M(keeper ? "#C9473A" : "#E1B640", 0.9), [0, 1.6, 0], [Math.PI / 2, 0, 0]);
  if (keeper) {
    add(g, new SphereGeometry(0.16, 14, 8, 0, 6.29, 0, 1.6), M("#C9473A", 0.9), [0, 1.8, 0]);
    add(g, new SphereGeometry(0.11, 10, 8), M("#D9D3C6", 0.95), [0, 1.66, -0.07], null, [1, 0.9, 0.7]);
  } else {
    add(g, cyl(0.3, 0.3, 0.02, 18), M("#8C6E4A", 0.85), [0, 1.86, 0]);
    add(g, cyl(0.14, 0.16, 0.14, 14), M("#8C6E4A", 0.85), [0, 1.94, 0]);
    add(g, box(0.38, 0.5, 0.22), M("#6E7F54", 0.85), [0, 1.22, 0.3]);
    add(g, cyl(0.09, 0.09, 0.44, 10), M("#B7563C", 0.9), [0, 1.54, 0.3], [0, 0, Math.PI / 2]);
    add(g, cyl(0.018, 0.018, 1.6, 6), M("#7A5C3F", 0.9), [0.36, 0.8, -0.05], [0, 0, -0.06]);
  }
  for (const sx of [-1, 1]) add(g, new SphereGeometry(0.018, 6, 4), M("#1E1C19", 0.3), [sx * 0.055, 1.78, -0.14]);
  return g;
}

/** A game person: baked, with the left arm + hand on a shoulder pivot (userData.arm) so it can wave. */
export function personModel(kind: "traveler" | "keeper") {
  const g = buildPerson(kind), arm = new Group();
  arm.position.set(-0.25, 1.5, 0);
  g.add(arm);
  for (const c of [...g.children]) if (c !== arm && c.position.x < -0.2 && c.position.y > 0.85 && c.position.y < 1.3) arm.attach(c);
  g.remove(arm);
  const out = bakeStatic(g), pivot = new Group();
  pivot.position.copy(arm.position);
  arm.position.set(0, 0, 0);
  pivot.add(...bakeStatic(arm).children);
  out.add(pivot);
  out.userData.arm = pivot;
  return out;
}
