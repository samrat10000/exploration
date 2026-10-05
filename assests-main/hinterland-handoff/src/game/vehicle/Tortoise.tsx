// The Tortoise + make camp (JOURNEYS §1.12): stopped on flat ground, hold E and the tent pops up, the
// awning rolls out, chairs appear (2.5 s). It counts as a campfire: it saves, the camera orbits, and
// the camp menu (ui/CampMenu.tsx) offers the lantern, cooking and sleeping until morning. Esc packs up.
import { dirtify } from "./dirt";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, PointLight, Points, PointsMaterial, SphereGeometry } from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, hash } from "../../utils/noise";
import { bakeStatic, mergeByMaterial } from "../art/kit";
import { gridSlope } from "../world/height";
import { input } from "./input";
import { buildTortoise } from "./tortoise/TortoiseModel";
import { TORTOISE, TT } from "./tuning";
import { spawnPose, useVehicle, type VehicleParts } from "./useVehicle";

const POP = 2.5, HOLD = 1.0;

function buildParts() {
  const model = buildTortoise(), u = model.userData as { wheels: Group[]; camp: Group; tent: Group; lantern: Mesh; paint: MeshStandardMaterial };
  [...u.wheels, u.camp, u.tent].forEach((o) => model.remove(o));
  const root = new Group(), body = new Group(), wheel = mergeByMaterial(u.wheels[0]);
  root.add(body);
  body.add(mergeByMaterial(model));
  // the camp set and tent stay as live groups so they can unfold
  const camp = new Group(); camp.add(...bakeStatic(u.camp).children); body.add(camp);
  const tent = new Group(); tent.add(...bakeStatic(u.tent).children); body.add(tent);
  // lantern light + moths (shown when the lantern is lit)
  const lamp = new PointLight(0xffc874, 0, 9, 1.6); lamp.position.set(1.84, 1.36, 0.5); camp.add(lamp);
  const mg = new BufferGeometry(), mp = new Float32Array(10 * 3); mg.setAttribute("position", new Float32BufferAttribute(mp, 3));
  const moths = new Points(mg, new PointsMaterial({ color: 0xfff2d8, size: 0.05, transparent: true, opacity: 0.9 })); moths.visible = false; camp.add(moths);
  // cooking: a few puffs of steam over the tea table
  const steam = new Group(); steam.position.set(1.79, 0.62, 0.05); camp.add(steam);
  for (let k = 0; k < 5; k++) { const p = new Mesh(new SphereGeometry(0.06 + k * 0.02, 8, 6), new MeshStandardMaterial({ color: 0xf6f3ec, transparent: true, opacity: 0, roughness: 1 })); steam.add(p); }
  const wheels = TORTOISE.wheels.map(([lx, lz]) => {
    const pivot = new Group(), spin = new Group();
    pivot.position.set(lx, TT.wheelRadius, lz); pivot.add(spin); root.add(pivot);
    spin.add(wheel.clone());
    return { pivot, spin, lx, lz };
  });
  dirtify(root, [u.paint]);
  const parts: VehicleParts = { root, body, wheels, paint: u.paint };
  return { parts, camp, tent, lamp, moths, steam };
}

const HALF = { x: 0.95, y: 0.75, z: 1.95 }, CENTER_Y = 1.2;
const I = { x: (TT.mass / 12) * (4 * HALF.y ** 2 + 4 * HALF.z ** 2), y: (TT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.z ** 2), z: (TT.mass / 12) * (4 * HALF.x ** 2 + 4 * HALF.y ** 2) * 1.8 };

export function Tortoise() {
  const m = useMemo(buildParts, []);
  const body = useVehicle(m.parts, TORTOISE);
  const start = useMemo(spawnPose, []);
  const st = useRef({ t: 0, open: false, hold: 0 }).current;
  useEffect(() => () => { live.camp.prompt = false; if (useStore.getState().camping) useStore.setState({ camping: false, sitting: false }); }, []);

  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, c = live.camp;
    // make camp: stopped, on flat ground, hold E
    const flat = gridSlope(car.x, car.z) > 0.97; // about 14°
    const can = s.phase === "play" && !s.camping && Math.abs(car.speed) < 0.3 && flat;
    st.hold = can && input.action ? st.hold + dt : 0;
    c.prompt = can && st.t <= 0;
    c.hold = clamp(st.hold / HOLD, 0, 1);
    if (st.hold >= HOLD) {
      st.hold = 0; st.open = true;
      // the camp sits on the door side (+x); the camera orbits it
      const rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
      live.sit = { x: car.x + rx * 1.6, y: car.y, z: car.z + rz * 1.6 };
      useStore.setState({ camping: true, sitting: true, hints: false });
      s.writeSave(); // a camp is a campfire: it saves
      c.line = "Camp. Saved."; c.lineT = 4;
    }
    // Esc (or "Pack up") gets you up: fold the camp away
    if (st.open && !s.sitting) { st.open = false; useStore.setState({ camping: false }); live.sit = null; c.lantern = false; }
    st.t = clamp(st.t + (st.open ? dt : -dt) / POP, 0, 1);
    const e = st.t * st.t * (3 - 2 * st.t);
    m.camp.visible = e > 0.01; m.camp.scale.set(Math.max(0.001, e), Math.max(0.001, e), 1);
    m.tent.scale.set(1, Math.max(0.001, e), 1); m.tent.visible = e > 0.01;
    // the lantern and its moths
    m.lamp.intensity = c.lantern && st.open ? 6 : 0;
    m.moths.visible = c.lantern && st.open;
    if (m.moths.visible) {
      const p = m.moths.geometry.attributes.position;
      for (let i = 0; i < 10; i++) { const a = live.clock * (1.4 + hash(i, 1)) + i * 2.1, r = 0.18 + hash(i, 2) * 0.2; p.setXYZ(i, 1.84 + Math.cos(a) * r, 1.36 + Math.sin(a * 1.7) * 0.12, 0.5 + Math.sin(a) * r); }
      p.needsUpdate = true;
    }
    // cooking: steam for 8 s
    c.cookT = Math.max(0, c.cookT - dt);
    m.steam.children.forEach((p, k) => {
      const ph = (live.clock * 0.5 + k / 5) % 1, mat = (p as Mesh).material as MeshStandardMaterial;
      p.position.set(Math.sin(ph * 6 + k) * 0.05, ph * 0.6, 0);
      mat.opacity = c.cookT > 0 ? 0.35 * (1 - ph) : 0;
    });
    c.lineT = Math.max(0, c.lineT - dt);
    live.fireNear = c.lantern && st.open ? 0.6 : live.fireNear;
  });

  return (
    <RigidBody ref={body} colliders={false} canSleep={false} position={[start.x, start.y, start.z]} rotation={[0, start.yaw, 0]} linearDamping={0.02} angularDamping={0.45}>
      <CuboidCollider args={[HALF.x, HALF.y, HALF.z]} position={[0, CENTER_Y, 0]} friction={0.3} restitution={0}
        massProperties={{ mass: TT.mass, centerOfMass: { x: 0, y: TT.comY - CENTER_Y, z: 0 }, principalAngularInertia: I, angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 } }} />
      <primitive object={m.parts.root} />
    </RigidBody>
  );
}

