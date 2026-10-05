// The Mule: a three-wheeled cargo auto with a slatted wooden rack and six crates (JOURNEYS §2.1).
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial, Vector3 } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { mergeByMaterial } from "../art/kit";
import { useCargo } from "./cargo";
import { buildMule, muleRopes } from "./mule/MuleModel";
import { dirtify } from "./dirt";
import { PAINTS } from "./paints";
import { MT, MULE } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";

const BED_Y = 0.81; // top of the rack floor (MuleModel bed)
const SLOTS = [
  new Vector3(-0.36, BED_Y + 0.275, 0.33), new Vector3(0.36, BED_Y + 0.275, 0.33),
  new Vector3(-0.36, BED_Y + 0.275, 1.06), new Vector3(0.36, BED_Y + 0.275, 1.06),
  new Vector3(-0.3, BED_Y + 0.825, 0.7), new Vector3(0.3, BED_Y + 0.825, 0.7),
];

/** The lab model, merged per material; the wheels move to the controller's pivots. */
function buildParts(): VehicleParts & { rack: Group; ropes: Group; paintDark: MeshStandardMaterial } {
  const model = buildMule({ cargo: false });
  const { wheels: modelWheels, paint, paintDark } = model.userData as { wheels: Group[]; paint: MeshStandardMaterial; paintDark: MeshStandardMaterial };
  modelWheels.forEach((w) => model.remove(w));
  const root = new Group(), body = new Group(), rack = new Group(), ropes = muleRopes(0.8, 1.13);
  root.add(body);
  body.add(mergeByMaterial(model), rack, ropes);
  const wheels = MULE.wheels.map(([lx, lz], i) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, MT.wheelRadius, lz);
    pivot.add(spin);
    root.add(pivot);
    spin.add(mergeByMaterial(modelWheels[i]));
    return { pivot, spin, lx, lz };
  });
  dirtify(root, [paint, paintDark]);
  return { root, body, wheels, paint, paintDark, rack, ropes };
}

// box from just above the wheels to the roof; centre of mass kept low-ish (the rack raises it in feel, via the tip thresholds)
const HALF = { x: 0.72, y: 0.62, z: 1.52 }, CENTER = { y: 1.2, z: -0.1 };
const I = { x: (MT.mass / 12) * (4 * HALF.y ** 2 + 4 * HALF.z ** 2), y: (MT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.z ** 2), z: (MT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.y ** 2) * 1.4 };

export function Mule() {
  const parts = useMemo(buildParts, []);
  const loose = useMemo(() => new Group(), []);
  // wandering Kettle Peak after the journey: an empty rack, and any crates still lying on the mountain
  const opts = useMemo(() => {
    const s = useStore.getState();
    // the Lighthouse run carries one heavy generator, not a rack of crates
    if (s.region === "light") return { aboard: 1 };
    if (s.region !== "kettle" || s.mode !== "wander") return {};
    return { aboard: 0, looseAt: ((s.extra.kettleLoose as { x: number; y: number; z: number }[] | undefined) ?? []).slice(0, SLOTS.length) };
  }, []);
  const onStep = useCargo(SLOTS, parts.rack, loose, opts);
  const body = useVehicle(parts, MULE, onStep);
  const start = useMemo(spawnPose, []);

  const paintIdx = useStore((s) => s.paint.mule);
  useEffect(() => {
    parts.paint!.color.set(PAINTS.mule[paintIdx] ?? PAINTS.mule[0]);
    parts.paintDark.color.copy(parts.paint!.color).multiplyScalar(0.6); // the lab skirt #3C6F6B is 0.6 of #4F8C88 (linear)
  }, [parts, paintIdx]);
  useFrame(() => { parts.ropes.visible = live.cargo.aboard > 0; });

  return (
    <>
      <RigidBody ref={body} colliders={false} canSleep={false} position={[start.x, start.y, start.z]} rotation={[0, start.yaw, 0]} linearDamping={0.02} angularDamping={0.4}>
        <CuboidCollider
          args={[HALF.x, HALF.y, HALF.z]} position={[0, CENTER.y, CENTER.z]} friction={0.3} restitution={0}
          massProperties={{ mass: MT.mass, centerOfMass: { x: 0, y: MT.comY - CENTER.y, z: -CENTER.z }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }}
        />
        <primitive object={parts.root} />
      </RigidBody>
      <primitive object={loose} />
    </>
  );
}
