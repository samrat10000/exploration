// The Snowcat (JOURNEYS §2.2): lab model on the shared controller (tracked: never slides), a sled
// towed on a hitch (it swings wide on the turns), and deep track marks pressed into snow behind it.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, Vector3 } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { live } from "../../state/live";
import { bakeStatic } from "../art/kit";
import { groundAt } from "../world/ground";
import { groundHeight, height } from "../world/height";
import { buildSnowcat } from "./snowcat/SnowcatModel";
import { SNOWCAT, ST } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";

const HITCH = 2.15, SLED_LEN = 1.7, MARKS = 700;

function buildParts() {
  const model = buildSnowcat(), sledSrc = model.userData.sled as Group;
  model.remove(sledSrc);
  sledSrc.position.set(0, 0, 0);
  const root = new Group(), body = new Group();
  root.add(body);
  body.add(bakeStatic(model));
  // the controller wants wheels: four hidden pivots (the tracks are part of the body)
  const wheels = SNOWCAT.wheels.map(([lx, lz]) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, ST.wheelRadius, lz); pivot.add(spin); root.add(pivot);
    return { pivot, spin, lx, lz };
  });
  const parts: VehicleParts = { root, body, wheels };
  return { parts, sled: bakeStatic(sledSrc) };
}

const HALF = { x: 1.3, y: 0.85, z: 1.9 }, CENTER_Y = 1.35;
const I = { x: (ST.mass / 12) * (4 * HALF.y ** 2 + 4 * HALF.z ** 2), y: (ST.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.z ** 2), z: (ST.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.y ** 2) * 2 };

/** Is the ground here snowy (by the region's own ground colour)? */
const snowy = (x: number, z: number) => { const g = groundAt(x, z, height(x, z), 1).color; return g.r > 0.55 && g.b > 0.55; };

export function Snowcat() {
  const m = useMemo(buildParts, []);
  const body = useVehicle(m.parts, SNOWCAT);
  const start = useMemo(spawnPose, []);
  const marks = useMemo(() => {
    const im = new InstancedMesh(new PlaneGeometry(0.55, 0.62).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: new Color("#AEB9C4"), roughness: 1, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), MARKS);
    im.count = 0; im.frustumCulled = false; im.receiveShadow = true;
    return { im, next: 0, d: 0, o: new Object3D(), last: new Vector3() };
  }, []);
  const sled = useRef({ x: start.x - Math.sin(start.yaw) * -(HITCH + SLED_LEN), z: start.z + Math.cos(start.yaw) * (HITCH + SLED_LEN), init: false }).current;

  useFrame(() => {
    const car = live.car, fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
    // the hitch at the back; the sled keeps its distance and swings toward it (a trailer)
    const hx = car.x - fx * HITCH, hz = car.z - fz * HITCH;
    if (!sled.init) { sled.x = hx - fx * SLED_LEN; sled.z = hz - fz * SLED_LEN; sled.init = true; }
    let dx = sled.x - hx, dz = sled.z - hz;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    sled.x = hx + dx * SLED_LEN; sled.z = hz + dz * SLED_LEN;
    // a teleport or a reset: snap behind again
    if (d > 6) { sled.x = hx - fx * SLED_LEN; sled.z = hz - fz * SLED_LEN; }
    const yaw = Math.atan2(dx, dz), y = groundHeight(sled.x, sled.z), yh = groundHeight(hx, hz);
    m.sled.position.set(sled.x, y, sled.z);
    m.sled.rotation.set(Math.atan2(yh - y, SLED_LEN) * -1, yaw, 0, "YXZ");

    // deep track marks, only where there is snow to press
    marks.d += Math.hypot(car.x - marks.last.x, car.z - marks.last.z);
    marks.last.set(car.x, 0, car.z);
    if (marks.d > 0.6 && Math.abs(car.speed) > 0.3 && snowy(car.x, car.z)) {
      marks.d = 0;
      for (const side of [-1, 1]) {
        const x = car.x + Math.cos(car.yaw) * side * 1.05, z = car.z - Math.sin(car.yaw) * side * 1.05;
        marks.o.position.set(x, groundHeight(x, z) + 0.03, z); marks.o.rotation.set(0, car.yaw, 0); marks.o.updateMatrix();
        marks.im.setMatrixAt(marks.next, marks.o.matrix);
        marks.next = (marks.next + 1) % MARKS;
        marks.im.count = Math.min(MARKS, marks.im.count + 1);
      }
      marks.im.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <RigidBody ref={body} colliders={false} canSleep={false} position={[start.x, start.y, start.z]} rotation={[0, start.yaw, 0]} linearDamping={0.05} angularDamping={0.6}>
        <CuboidCollider args={[HALF.x, HALF.y, HALF.z]} position={[0, CENTER_Y, 0]} friction={0.3} restitution={0}
          massProperties={{ mass: ST.mass, centerOfMass: { x: 0, y: ST.comY - CENTER_Y, z: 0 }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }} />
        <primitive object={m.parts.root} />
      </RigidBody>
      <primitive object={m.sled} />
      <primitive object={marks.im} />
    </>
  );
}
