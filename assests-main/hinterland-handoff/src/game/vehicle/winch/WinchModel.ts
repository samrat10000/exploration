// Grapple winch (assets.html → GRAPPLE WINCH): the bumper drum, the hook, and an anchor boulder with
// its iron ring. buildWinch() in the lab draws all three in one scene; here they are separate builders
// (drum on the Rover, anchors in the world, the hook on the end of the cable). Geometry unchanged.
import { CatmullRomCurve3, ConeGeometry, Group, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { M, VC, add, box, cyl, glow, tube } from "../../art/kit";
import { rockGeo } from "../../world/props/rocks";

export function buildHook() {
  const g = new Group(), steel = M("#6E6A63", 0.35, 0.85);
  add(g, new TorusGeometry(0.07, 0.02, 8, 16), steel, [0, 0.14, 0]);
  add(g, cyl(0.03, 0.03, 0.16, 8), steel, [0, 0.02, 0]);
  const hook = new CatmullRomCurve3([new Vector3(0, -0.06, 0), new Vector3(0, -0.2, 0), new Vector3(0.08, -0.3, 0), new Vector3(0.16, -0.22, 0), new Vector3(0.15, -0.1, 0)]);
  add(g, tube(hook, 0.025, 16, 8), steel);
  add(g, new ConeGeometry(0.03, 0.06, 8), steel, [0.15, -0.07, 0]);
  return g;
}

/** The drum on the Rover's front bumper (Rover space: front bumper at z ≈ -2.2). */
export function buildWinchDrum() {
  const g = new Group(), trim = M("#2A2E31", 0.8), steel = M("#8E908C", 0.35, 0.7);
  add(g, cyl(0.13, 0.13, 0.5, 16), M("#3A3D3F", 0.5, 0.6), [0, 0.72, -0.2], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) add(g, box(0.08, 0.34, 0.3), trim, [sx * 0.3, 0.72, -0.2]);
  add(g, box(0.3, 0.1, 0.06), steel, [0, 0.62, -0.38]);
  return g;
}
/** where the cable leaves the drum, in the drum's space */
export const DRUM_EXIT = new Vector3(0, 0.7, -0.4);

/** Just the ring set in a rim (for boulders that are part of the terrain): iron plate, ring and a soft glint. */
export function buildRing() {
  const g = new Group();
  add(g, box(0.3, 0.05, 0.3), M("#4A4740", 0.5, 0.7), [0, 0.6, -0.12], [-0.25, 0, 0]);
  add(g, new TorusGeometry(0.12, 0.025, 8, 18), M("#6E6A63", 0.35, 0.85), [0, 0.6, -0.05], [-1.2, 0, 0]);
  g.userData = { glint: add(g, new SphereGeometry(0.05, 8, 6), glow("#FFE7B0", 1.4), [0.08, 0.66, -0.02]) };
  return g;
}

/**
 * An anchor boulder: the ring sits on the boulder's face at `ring` (relative to the group), with an
 * iron plate behind it and a soft glint (userData.glint) so the player reads the world, not a marker.
 */
export function buildAnchor() {
  // the ring is set into the crown, at the front edge: hauling on it lifts the nose up the face
  const g = new Group(), ring = new Vector3(0, 0.5, -0.05);
  add(g, rockGeo(1200, 1.4, 1.2, 1.1, 3), VC(0.95), [0, -0.9, -0.6]);
  add(g, box(0.3, 0.05, 0.3), M("#4A4740", 0.5, 0.7), [0, 0.6, -0.12], [-0.25, 0, 0]);
  add(g, new TorusGeometry(0.12, 0.025, 8, 18), M("#6E6A63", 0.35, 0.85), [0, 0.6, -0.05], [-1.2, 0, 0]);
  const glint = add(g, new SphereGeometry(0.05, 8, 6), glow("#FFE7B0", 1.4), [0.08, 0.66, -0.02]);
  g.userData = { glint, ring };
  return g;
}
