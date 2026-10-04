// Kettle Peak's obstacles: a goat herd on the trail, a fallen log, a rockslide, and the plank bridge.
// None of them can be failed; they ask you to slow down, nudge, or wait.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import type { RigidBody as RRigidBody } from "@dimforge/rapier3d-compat";
import { CircleGeometry, Euler, Group, InstancedMesh, Object3D, Quaternion, TorusGeometry, Vector3 } from "three";
import { C, M, VC, add, bakeStatic, box, catenary, cyl, h3, mixC, n3, paintFaces, tube } from "../../art/kit";
import { rockGeo } from "../props/rocks";
import { live } from "../../../state/live";
import { goatModel } from "../../life/goat";
import { useStore } from "../../../state/store";
import { hash, smooth } from "../../../utils/noise";
import { audio } from "../../audio/audio";
import { input } from "../../vehicle/input";
import { FEATURES, kettleGround, onBridge, pointAt } from "./kettle";
import { BRIDGE, GOATS, LOG, SLIDE } from "./layout";

/** Colliders whose bodies the wheels should ride over (rocks, the log). */
export const obstacleColliders = new Set<number>();

function goatMesh(s: number) {
  const g = goatModel();
  g.scale.setScalar(s);
  return g;
}

/** Goats graze on the trail until you stop near them (or honk), then amble off uphill in 6–10 s. */
function Goats() {
  const { world, rapier } = useRapier();
  const herd = useMemo(() => GOATS.herd.map((h, k) => {
    const p = pointAt(FEATURES.goats), x = p.x + p.dx * h.along + p.dz * h.across, z = p.z + p.dz * h.along - p.dx * h.across;
    return { mesh: goatMesh(h.s), x, z, home: { x, z }, dur: 6 + hash(k, 3) * 4, t: 0, yaw: hash(k, 4) * 6.28, body: null as RRigidBody | null };
  }), []);
  const st = useRef({ leaving: false, waited: 0 }).current;
  useEffect(() => {
    for (const g of herd) {
      g.body = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(g.x, kettleGround.height(g.x, g.z) + 0.5, g.z));
      world.createCollider(rapier.ColliderDesc.ball(0.5), g.body);
    }
    return () => { for (const g of herd) if (g.body) world.removeRigidBody(g.body); };
  }, [herd, world, rapier]);
  useFrame((_, dt) => {
    const car = live.car, near = Math.hypot(car.x - GOATS.x, car.z - GOATS.z) < 24;
    // stopping politely (or a honk) is what moves them on
    if (!st.leaving) {
      st.waited = near && Math.abs(car.speed) < 0.6 ? st.waited + dt : 0;
      if (st.waited > 1.5 || (near && live.clock - live.honk < 0.5)) st.leaving = true;
    }
    for (const [k, g] of herd.entries()) {
      if (st.leaving && g.t < 1) g.t = Math.min(1, g.t + dt / g.dur);
      // amble uphill (inward), each on its own line
      const p = pointAt(FEATURES.goats), inx = -p.dz, inz = p.dx, side = Math.sign(-(p.x * inx + p.z * inz)) || 1;
      const e = smooth(0, 1, g.t), off = e * (11 + hash(k, 5) * 6);
      g.x = g.home.x - inx * side * off + Math.sin(k * 2 + e * 3) * e * 2;
      g.z = g.home.z - inz * side * off + Math.cos(k * 3 + e * 2) * e * 2;
      const y = kettleGround.height(g.x, g.z);
      g.mesh.position.set(g.x, y, g.z);
      if (g.t > 0 && g.t < 1) g.yaw = Math.atan2(-inx * side, -inz * side) + Math.PI;
      g.mesh.rotation.y = g.yaw;
      // heads down to graze, up to look at you
      g.mesh.userData.head.rotation.x = st.leaving ? 0 : near ? -0.1 : 0.5 + Math.sin(live.clock * 1.3 + k) * 0.2;
      g.body?.setNextKinematicTranslation({ x: g.x, y: y + 0.5, z: g.z });
    }
  });
  return <>{herd.map((g, i) => <primitive key={i} object={g.mesh} />)}</>;
}

/** A fallen log across the trail: nudge it slowly and it rolls off the edge. */
function Log() {
  const { world, rapier } = useRapier();
  const mesh = useMemo(() => {
    // bark in ridges, pale ring-cut ends, two snapped branch stubs
    const g = new Group(), bark = cyl(0.3, 0.34, 4.2, 12), p = bark.attributes.position;
    for (let k = 0; k < p.count; k++) { const a = Math.atan2(p.getZ(k), p.getX(k)), r = 1 + 0.06 * Math.sin(a * 9 + p.getY(k) * 0.8) + 0.04 * n3(p.getX(k) * 3, p.getY(k), p.getZ(k) * 3); p.setX(k, p.getX(k) * r); p.setZ(k, p.getZ(k) * r); }
    add(g, paintFaces(bark, (c, n) => mixC(C("#4A3626"), C("#6E5440"), h3(Math.floor(c.y * 3), Math.atan2(n.z, n.x) * 3, 1) * 0.7)), VC(0.95));
    for (const sy of [-1, 1]) { add(g, new CircleGeometry(sy > 0 ? 0.29 : 0.33, 12), M("#C9A87A", 0.9), [0, sy * 2.101, 0], [sy * -Math.PI / 2, 0, 0]); add(g, new TorusGeometry(sy > 0 ? 0.18 : 0.2, 0.012, 4, 14), M("#9C7A52", 0.9), [0, sy * 2.104, 0], [Math.PI / 2, 0, 0]); }
    add(g, cyl(0.05, 0.08, 0.5, 6), M("#5A4632", 0.95), [0.3, 0.6, 0.05], [0, 0, -1.1]);
    add(g, cyl(0.04, 0.07, 0.4, 6), M("#5A4632", 0.95), [-0.28, -0.9, -0.1], [0.3, 0, 1.2]);
    return bakeStatic(g);
  }, []);
  const body = useRef<RRigidBody | null>(null);
  useEffect(() => {
    // lying down (cylinder axis horizontal), turned across the trail
    const q = new Quaternion().setFromEuler(new Euler(0, LOG.yaw, Math.PI / 2, "YXZ"));
    const b = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(LOG.x, LOG.y, LOG.z).setRotation(q)
      .setLinearDamping(0.2).setAngularDamping(0.3));
    // not in the wheels' ride-over set: the Mule's nose pushes it rather than climbing it
    world.createCollider(rapier.ColliderDesc.cylinder(2.1, 0.32).setDensity(150).setFriction(0.35), b);
    body.current = b;
    if (import.meta.env.DEV) Object.assign(window, { __log: b });
    return () => { world.removeRigidBody(b); };
  }, [world, rapier]);
  // nudged slowly, it gives way and rolls off the edge (the bank alone would roll it back inward)
  useBeforePhysicsStep((w) => {
    const b = body.current, car = live.car;
    if (!b) return;
    const p = b.translation();
    if (Math.hypot(car.x - p.x, car.z - p.z) < 4.2 && Math.abs(car.speed) < 4 && input.throttle > 0) {
      // a firm, slow shove toward the drop, a little lift so it doesn't dig in, and a swing
      const m = b.mass() * w.timestep;
      b.applyImpulse({ x: LOG.out.x * m * 11, y: m * 3, z: LOG.out.z * m * 11 }, true);
      b.applyTorqueImpulse({ x: 0, y: m * 2.2, z: 0 }, true);
    }
  });
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    const p = b.translation(), r = b.rotation();
    mesh.position.set(p.x, p.y, p.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
    if (p.y < -20) mesh.visible = false;
  });
  return <primitive object={mesh} />;
}

/** A rockslide spill: small loose rocks to crawl through. */
function Rockslide() {
  const { world, rapier } = useRapier();
  const mesh = useMemo(() => {
    const m = new InstancedMesh(rockGeo(77, 1, 0.8, 0.95, 1, 0.75), VC(0.95), SLIDE.length);
    m.castShadow = m.receiveShadow = true;
    m.frustumCulled = false;
    return m;
  }, []);
  const bodies = useRef<{ b: RRigidBody; r: number }[]>([]);
  useEffect(() => {
    bodies.current = SLIDE.map((p, k) => {
      const r = 0.16 + hash(k, 5) * 0.16;
      const b = world.createRigidBody(rapier.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setAngularDamping(0.6).setLinearDamping(0.2));
      const c = world.createCollider(rapier.ColliderDesc.ball(r).setDensity(1400).setFriction(0.9).setRestitution(0.1), b);
      obstacleColliders.add(c.handle);
      return { b, r };
    });
    return () => { for (const { b } of bodies.current) { b.collider(0) && obstacleColliders.delete(b.collider(0).handle); world.removeRigidBody(b); } bodies.current = []; };
  }, [world, rapier]);
  const d = useMemo(() => new Object3D(), []);
  useFrame(() => {
    bodies.current.forEach(({ b, r }, i) => {
      const p = b.translation(), q = b.rotation();
      d.position.set(p.x, p.y, p.z); d.quaternion.set(q.x, q.y, q.z, q.w); d.scale.set(r * 1.15, r, r * 1.05); d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <primitive object={mesh} />;
}

/** A plank bridge over the washed-out gap. It sways and creaks; fast, the boards bounce the cargo. */
function Bridge() {
  const deck = useRef<Group>(null!);
  const model = useMemo(() => {
    // planks of four tones laid with small gaps, weathered posts, rope rails sagging between them
    const g = new Group(), tones = ["#7A5E40", "#86674A", "#6E5439", "#8E7052"];
    for (let k = -18; k <= 18; k++) add(g, box(3.6, 0.08, 0.34), M(tones[Math.floor(hash(k, 3) * 4)], 0.9), [0, -0.04 + (hash(k, 1) - 0.5) * 0.03, k * 0.4], [0, (hash(k, 2) - 0.5) * 0.05, 0]);
    for (const x of [-1.85, 1.85]) {
      const tops: Vector3[] = [];
      for (const z of [-7.3, -2.4, 2.4, 7.3]) {
        const post = cyl(0.07, 0.09, 1.3, 7);
        add(g, paintFaces(post, (c) => mixC(C("#4E3A2B"), C("#7A6048"), (c.y + 0.65) / 1.3 * 0.6 + h3(c.x * 20, c.y * 20, z) * 0.3)), VC(0.95), [x, 0.45, z]);
        tops.push(new Vector3(x, 0.98, z));
      }
      for (let i = 0; i < 3; i++) add(g, tube(catenary(tops[i], tops[i + 1], 0.22), 0.025, 16, 5), M("#D9C9A0", 0.95));
    }
    return bakeStatic(g);
  }, []);
  useFrame(() => {
    const car = live.car, on = onBridge(car.x, car.z);
    live.onBridge = on;
    // a gentle sway, more when something is on it
    const k = on ? 1 + Math.min(1, Math.abs(car.speed) / 6) : 0.4;
    deck.current.rotation.z = Math.sin(live.clock * 1.7) * 0.012 * k;
    deck.current.position.y = BRIDGE.y + Math.sin(live.clock * 2.3) * 0.02 * k;
    if (on && useStore.getState().phase === "play") audio.creak(Math.min(1, Math.abs(car.speed) / 5));
  });
  return (
    <group ref={deck} position={[BRIDGE.x, BRIDGE.y, BRIDGE.z]} rotation-y={BRIDGE.yaw}>
      <primitive object={model} />
    </group>
  );
}

export function KettleObstacles() {
  return (
    <>
      <Goats />
      <Log />
      <Rockslide />
      <Bridge />
    </>
  );
}
