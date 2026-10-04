// Anchor boulders (JOURNEYS §1.9): iron rings set into boulders are the only things the winch hooks.
// They glint softly. Solid, and in the wheels' ride-over set so a hauled Rover climbs onto them.
import { useEffect, useMemo } from "react";
import { useRapier } from "@react-three/rapier";
import { Quaternion, Vector3 } from "three";
import { useStore } from "../../state/store";
import { bakeStatic } from "../art/kit";
import { buildAnchor } from "../vehicle/winch/WinchModel";
import type { RegionId } from "../journeys/journeys";
import { START, height } from "./height";
import { obstacleColliders } from "./kettle/KettleObstacles";

/** x, z: where the boulder sits (its centre); ring: the ring in world space; top: height of its crown */
export interface Anchor { x: number; z: number; yaw: number; ring: Vector3; top: number; r: number; base: number; gx: number; gz: number }
const LIFT = 0.95, S = 0.8; // group origin above the ground (the boulder sits half-buried) and its scale
const UP = new Vector3(0, 1, 0);
function anchorAt(gx: number, gz: number, yaw: number): Anchor {
  const base = height(gx, gz), ring = new Vector3(0, 0.6, -0.05).multiplyScalar(S).applyAxisAngle(UP, yaw).add(new Vector3(gx, base + LIFT, gz));
  const c = new Vector3(0, 0, -0.6 * S).applyAxisAngle(UP, yaw); // the rock sits behind its ring
  return { x: gx + c.x, z: gz + c.z, yaw, ring, top: base + LIFT + 0.6 * S, r: 1.3, base, gx, gz };
}
/** Per region. The valley's pair near the start is the winch sandbox (J3 brings a boulder garden). */
export const ANCHORS: Record<RegionId, Anchor[]> = {
  get valley() { return (valleyAnchors ??= [anchorAt(START.x + 16, START.z - 34, -0.3), anchorAt(START.x + 26, START.z - 48, -0.3)]); },
  kettle: [],
};
let valleyAnchors: Anchor[] | null = null;

export function Anchors() {
  const region = useStore((s) => s.region), list = ANCHORS[region];
  const { world, rapier } = useRapier();
  const models = useMemo(() => list.map(() => bakeStatic(buildAnchor())), [list]);
  useEffect(() => {
    const made = list.map((a) => {
      const b = world.createRigidBody(rapier.RigidBodyDesc.fixed().setTranslation(a.x, a.base + 0.1, a.z));
      const c = world.createCollider(rapier.ColliderDesc.ball(1.2).setFriction(0.9), b);
      obstacleColliders.add(c.handle);
      // the face the winch hauls you up: a short slope from the ground to the crown, on the approach side
      const q = new Quaternion().setFromAxisAngle(UP, a.yaw).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.42));
      const ramp = world.createCollider(rapier.ColliderDesc.cuboid(1.2, 0.08, 1.9).setTranslation(Math.sin(a.yaw) * 2.1, 0.55, Math.cos(a.yaw) * 2.1).setRotation(q).setFriction(1), b);
      obstacleColliders.add(ramp.handle);
      return { b, c };
    });
    return () => made.forEach(({ b, c }) => { obstacleColliders.delete(c.handle); world.removeRigidBody(b); });
  }, [list, world, rapier]);
  return <>{list.map((a, i) => <primitive key={i} object={models[i]} position={[a.gx, a.base + LIFT, a.gz]} rotation-y={a.yaw} scale={S} />)}</>;
}
