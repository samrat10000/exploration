// The expedition rover: mesh + physics body. Driving logic lives in useVehicle.
import { useEffect, useMemo } from "react";
import { Group, MeshStandardMaterial } from "three";
import { mergeByMaterial } from "../art/kit";
import { buildRover } from "./rover/RoverModel";
import { useWinch } from "./winch/useWinch";
import { buildWinchDrum } from "./winch/WinchModel";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ROVER, T, WHEELS } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";
import { useStore } from "../../state/store";
import { PAINTS } from "./paints";

/** The lab model, merged per material; the road wheels move to the controller's pivots. */
function buildParts(): VehicleParts {
  const model = buildRover();
  const { wheels: modelWheels, paint } = model.userData as { wheels: Group[]; paint: MeshStandardMaterial };
  modelWheels.forEach((w) => model.remove(w));
  const root = new Group(), body = new Group(), wheel = mergeByMaterial(modelWheels[0]);
  root.add(body);
  body.add(mergeByMaterial(model), mergeByMaterial(buildWinchDrum()).translateZ(-2.05));
  const wheels = WHEELS.map(([lx, lz]) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, T.wheelRadius, lz);
    pivot.add(spin);
    root.add(pivot);
    spin.add(wheel.clone());
    return { pivot, spin, lx, lz };
  });
  return { root, body, wheels, paint };
}

// box from just above the wheels to the roof: the rover never rides on its belly
const HALF = { x: 1.0, y: 0.72, z: 2.12 }, CENTER_Y = 1.27;
// box inertia, with extra roll inertia so it feels planted rather than tippy
const I = { x: (T.mass / 12) * (4 * HALF.y * HALF.y + 4 * HALF.z * HALF.z), y: (T.mass / 12) * (4 * HALF.x * HALF.x + 4 * HALF.z * HALF.z), z: (T.mass / 12) * (4 * HALF.x * HALF.x + 4 * HALF.y * HALF.y) * 1.8 };

export function Rover() {
  const parts = useMemo(buildParts, []);
  const body = useVehicle(parts, ROVER);
  const region = useStore((s) => s.region);
  const winch = useWinch(body, region);
  const start = useMemo(() => { const p = spawnPose(); return { pos: [p.x, p.y, p.z] as [number, number, number], yaw: p.yaw }; }, []);

  // Garage paint
  const paintIdx = useStore((s) => s.paint.rover);
  useEffect(() => { parts.paint!.color.set(PAINTS.rover[paintIdx] ?? PAINTS.rover[0]); }, [parts, paintIdx]);

  return (
    <>
    <RigidBody
      ref={body}
      colliders={false}
      canSleep={false}
      position={start.pos}
      rotation={[0, start.yaw, 0]}
      linearDamping={0.02}
      angularDamping={0.4}
    >
      <CuboidCollider
        args={[HALF.x, HALF.y, HALF.z]}
        position={[0, CENTER_Y, 0]}
        friction={0.3}
        restitution={0}
        massProperties={{ mass: T.mass, centerOfMass: { x: 0, y: T.comY - CENTER_Y, z: 0 }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }}
      />
      <primitive object={parts.root} />
    </RigidBody>
    <primitive object={winch} />
    </>
  );
}
