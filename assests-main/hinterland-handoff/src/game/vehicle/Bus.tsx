// The Loaf: lab model + physics body on the shared controller (BUS spec). Route logic: world/BusRoute.tsx.
import { useMemo } from "react";
import { Group } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { bakeStatic, mergeByMaterial } from "../art/kit";
import { buildBus } from "./bus/BusModel";
import { BT, BUS } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";

function buildParts(): VehicleParts {
  const model = buildBus(), modelWheels = model.userData.wheels as Group[];
  modelWheels.forEach((w) => model.remove(w));
  const root = new Group(), body = new Group(), wheel = mergeByMaterial(modelWheels[0]);
  root.add(body);
  body.add(bakeStatic(model));
  const wheels = BUS.wheels.map(([lx, lz]) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, BT.wheelRadius, lz);
    pivot.add(spin);
    root.add(pivot);
    spin.add(wheel.clone());
    return { pivot, spin, lx, lz };
  });
  return { root, body, wheels };
}

const HALF = { x: 1.18, y: 1.05, z: 3.75 }, CENTER_Y = 1.75;
const I = { x: (BT.mass / 12) * (4 * HALF.y ** 2 + 4 * HALF.z ** 2), y: (BT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.z ** 2), z: (BT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.y ** 2) * 2.2 };

export function Bus() {
  const parts = useMemo(buildParts, []);
  const body = useVehicle(parts, BUS);
  const start = useMemo(spawnPose, []);
  return (
    <RigidBody ref={body} colliders={false} canSleep={false} position={[start.x, start.y, start.z]} rotation={[0, start.yaw, 0]} linearDamping={0.02} angularDamping={0.5}>
      <CuboidCollider args={[HALF.x, HALF.y, HALF.z]} position={[0, CENTER_Y, 0]} friction={0.3} restitution={0}
        massProperties={{ mass: BT.mass, centerOfMass: { x: 0, y: BT.comY - CENTER_Y, z: 0 }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }} />
      <primitive object={parts.root} />
    </RigidBody>
  );
}
