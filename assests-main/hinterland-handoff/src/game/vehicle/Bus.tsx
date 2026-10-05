// The Loaf: lab model + physics body on the shared controller (BUS spec). Route logic: world/BusRoute.tsx.
import { useFrame } from "@react-three/fiber";
import { live } from "../../state/live";
import { dirtify } from "./dirt";
import { useMemo } from "react";
import { Group } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { bakeStatic, mergeByMaterial } from "../art/kit";
import { buildBus } from "./bus/BusModel";
import { BT, BUS } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";

function buildParts(): VehicleParts & { door: Group } {
  const model = buildBus(), modelWheels = model.userData.wheels as Group[];
  modelWheels.forEach((w) => model.remove(w));
  const door = model.userData.door as Group;
  model.remove(door);
  const root = new Group(), body = new Group(), wheel = mergeByMaterial(modelWheels[0]);
  root.add(body);
  body.add(bakeStatic(model), door);
  door.userData.live = true;
  const wheels = BUS.wheels.map(([lx, lz]) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, BT.wheelRadius, lz);
    pivot.add(spin);
    root.add(pivot);
    spin.add(wheel.clone());
    return { pivot, spin, lx, lz };
  });
  dirtify(root);
  return { root, body, wheels, door };
}

const HALF = { x: 1.18, y: 1.05, z: 3.75 }, CENTER_Y = 1.75;
const I = { x: (BT.mass / 12) * (4 * HALF.y ** 2 + 4 * HALF.z ** 2), y: (BT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.z ** 2), z: (BT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.y ** 2) * 2.2 };

export function Bus() {
  const parts = useMemo(buildParts, []);
  const body = useVehicle(parts, BUS);
  // the door folds shut against its hinge when the doors open at a stop (the bus route sets live.bus.door)
  useFrame((_, dt) => { const d = parts.door; d.userData.k = (d.userData.k ?? 0) + ((live.bus.door ? 1 : 0) - (d.userData.k ?? 0)) * Math.min(1, dt * 5); d.scale.z = 1 - 0.82 * d.userData.k; d.rotation.y = 0.5 * d.userData.k; });
  const start = useMemo(spawnPose, []);
  return (
    <RigidBody ref={body} colliders={false} canSleep={false} position={[start.x, start.y, start.z]} rotation={[0, start.yaw, 0]} linearDamping={0.02} angularDamping={0.5}>
      <CuboidCollider args={[HALF.x, HALF.y, HALF.z]} position={[0, CENTER_Y, 0]} friction={0.3} restitution={0}
        massProperties={{ mass: BT.mass, centerOfMass: { x: 0, y: BT.comY - CENTER_Y, z: 0 }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }} />
      <primitive object={parts.root} />
    </RigidBody>
  );
}
