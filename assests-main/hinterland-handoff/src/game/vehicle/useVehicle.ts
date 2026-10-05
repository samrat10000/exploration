// Vehicle controller on a Rapier rigid body, shared by the Rover and the Mule (a VehicleSpec
// tells them apart; the Rover's spec reproduces its original tuning exactly).
//
// Raycast springs carry the body (real suspension, real weight on landings). On top of that,
// longitudinal speed, grip and yaw are driven toward the prototype's arcade targets so the feel
// stays forgiving: gravity's downhill pull is cancelled while grounded and replaced by the soft
// slope drag from CLAUDE.md §4. Collisions with trees, rocks and the ground are pure Rapier.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useAfterPhysicsStep, useBeforePhysicsStep, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { obstacleColliders } from "../world/kettle/KettleObstacles";
import { Group, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, damp, smooth } from "../../utils/noise";
import { activeGround, gripAt, groundHeight, height, waterLevel } from "../world/height";
import { audio } from "../audio/audio";
import { handling } from "./mods";
import { attachDecor } from "./decor";
import { addShake } from "../camera/CameraRig";
import { attachDriveInput, clearDriveInput, input, readInput } from "./input";
import type { VehicleSpec } from "./tuning";

export interface VehicleParts {
  root: Group;
  body: Group;
  /** the Garage-paintable material (vehicles without paint leave it out) */
  paint?: MeshStandardMaterial;
  wheels: { pivot: Group; spin: Group; lx: number; lz: number }[];
}

const Y = new Vector3(0, 1, 0);
const q = new Quaternion(), up = new Vector3(), fwd = new Vector3(), right = new Vector3();
const lin = new Vector3(), ang = new Vector3(), com = new Vector3(), A = new Vector3(), rel = new Vector3(), pv = new Vector3();
const imp = new Vector3(), nAvg = new Vector3(), n = new Vector3(), gt = new Vector3(), f = new Vector3(), rt = new Vector3(), axis = new Vector3();
const qa = new Quaternion(), qb = new Quaternion();

function normalAt(x: number, z: number, out: Vector3) {
  const e = 0.75;
  const hx = (groundHeight(x + e, z) - groundHeight(x - e, z)) / (2 * e), hz = (groundHeight(x, z + e) - groundHeight(x, z - e)) / (2 * e);
  return out.set(-hx, 1, -hz).normalize();
}

/** Distance along the ray (anchor -> dir) to the ground, or -1 if nothing within `max`. */
function probe(a: Vector3, d: Vector3, max: number) {
  const fn = (s: number) => a.y + d.y * s - groundHeight(a.x + d.x * s, a.z + d.z * s);
  if (fn(0) <= 0) return 0;
  if (fn(max) > 0) return -1;
  let lo = 0, hi = max;
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Where a vehicle appears when it mounts: a pending swap point, else the saved session, else the start. */
export function spawnPose() {
  const sess = useStore.getState().save?.session;
  const g = activeGround();
  const pose = live.spawnAt ?? (sess && sess.region === g.id ? { x: sess.x, z: sess.z, yaw: sess.yaw } : g.start);
  live.spawnAt = null;
  return { ...pose, y: groundHeight(pose.x, pose.z) + 0.15 };
}

/** Felt acceleration in the cab (m/s², gravity included), handed to cargo every physics step. */
export interface StepInfo { dt: number; lat: number; long: number; vert: number; up: Vector3; rolled: boolean; /** false while parked or settling */ live: boolean }

export function useVehicle(parts: VehicleParts, spec: VehicleSpec, onStep?: (s: StepInfo) => void) {
  const T = spec.T, WHEELS = spec.wheels, ANCHOR_Y = spec.anchorY, N = WHEELS.length;
  const { rapier } = useRapier();
  const ref = useRef<RapierRigidBody>(null);
  const st = useRef({
    steer: 0, lens: WHEELS.map(() => T.restLength), shown: WHEELS.map(() => T.restLength),
    grounded: 0, airTime: 0, flipped: 0, speed: 0, frameSpeed: 0, accel: 0, load: 0, yawRate: 0, tilt: 0,
    vAfter: new Vector3(), vPrev: new Vector3(), felt: new Vector3(),
    lat: 0, lean: 0, leanShown: 0, over: 0, tipping: 0, tipT: 0, age: 0, onSide: 0, safeT: 0, recovering: -1,
  }).current;

  useEffect(() => {
    live.vehicle = spec.id;
    Object.assign(live.cam, spec.cam);
  }, [spec]);

  useEffect(() => attachDriveInput(), []);
  const decor = useMemo(() => attachDecor(parts.body, spec.id), [parts, spec]);

  useEffect(() => {
    live.teleport = (x, z, yaw) => {
      const b = ref.current;
      if (!b) return;
      qa.setFromUnitVectors(Y, normalAt(x, z, n));
      qb.setFromAxisAngle(Y, yaw);
      qa.multiply(qb);
      const p = { x, y: groundHeight(x, z) + 0.15, z };
      b.setTranslation(p, true);
      b.setRotation(qa, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      // move the visual too, so the camera never sees one interpolated frame at the old spot
      parts.root.parent?.position.set(p.x, p.y, p.z);
      parts.root.parent?.quaternion.copy(qa);
      Object.assign(live.car, { x, y: p.y, z, yaw, speed: 0, still: 0 });
      st.speed = st.frameSpeed = 0;
      st.tipping = 0; st.tipT = 0; st.over = 0; st.onSide = 0; st.lat = 0; st.age = 0;
      st.vPrev.set(0, 0, 0);
      clearDriveInput();
    };
    return () => { live.teleport = null; };
  }, [parts, st]);

  useBeforePhysicsStep((world) => {
    const b = ref.current;
    if (!b) return;
    const dt = world.timestep, m = b.mass();
    const ss = useStore.getState(), playing = ss.phase === "play" && !ss.cutscene && !ss.sitting;
    if (playing) readInput();
    else { input.throttle = 0; input.steer = 0; input.brake = false; }
    const thr = input.throttle, brake = input.brake || !playing; // parked outside of play

    const t = b.translation(), r = b.rotation();
    q.set(r.x, r.y, r.z, r.w);
    up.set(0, 1, 0).applyQuaternion(q);
    fwd.set(0, 0, -1).applyQuaternion(q);
    right.set(1, 0, 0).applyQuaternion(q);
    const c = b.worldCom();
    com.set(c.x, c.y, c.z);
    let lv = b.linvel(), av = b.angvel();
    lin.set(lv.x, lv.y, lv.z);
    ang.set(av.x, av.y, av.z);
    const vyBefore = lv.y;
    st.steer += (input.steer - st.steer) * damp(T.inputK, dt);

    /* ---- suspension: one spring-damper per wheel along the body's down axis ---- */
    let grounded = 0;
    nAvg.set(0, 0, 0);
    const down = imp.copy(up).negate(), max = T.restLength + T.wheelRadius;
    const dirX = down.x, dirY = down.y, dirZ = down.z;
    for (let i = 0; i < WHEELS.length; i++) {
      const [lx, lz] = WHEELS[i];
      A.set(lx, ANCHOR_Y, lz).applyQuaternion(q).add(t as Vector3);
      let s = probe(A, down.set(dirX, dirY, dirZ), max);
      // loose rocks and logs: the wheel rides up over them (and presses down on them)
      if (live.obstacles && obstacleColliders.size) {
        const h = world.castRay(new rapier.Ray(A, down), max, true, undefined, undefined, undefined, undefined, (c) => obstacleColliders.has(c.handle));
        if (h && (s < 0 || h.timeOfImpact < s)) {
          s = h.timeOfImpact;
          h.collider.parent()?.applyImpulse({ x: dirX * m * 0.02, y: dirY * m * 0.02, z: dirZ * m * 0.02 }, true);
        }
      }
      if (s < 0) { st.lens[i] = T.restLength; continue; }
      const raw = s - T.wheelRadius, len = Math.max(T.minLength, raw);
      st.lens[i] = len;
      rel.subVectors(A, com);
      pv.crossVectors(ang, rel).add(lin);
      const vUp = pv.dot(up);
      let F = m * ((T.springK / N) * (T.restLength - len) - (T.springC / N) * vUp);
      if (raw < T.minLength) F += m * (T.minLength - raw) * 400; // bump stop
      if (F > 0) b.applyImpulseAtPoint({ x: up.x * F * dt, y: up.y * F * dt, z: up.z * F * dt }, A, true);
      grounded++;
      nAvg.add(normalAt(A.x + dirX * s, A.z + dirZ * s, n));
    }

    // re-read: the spring impulses above already changed the body's velocity
    lv = b.linvel(); av = b.angvel();
    lin.set(lv.x, lv.y, lv.z);
    ang.set(av.x, av.y, av.z);
    const gf = grounded / N;

    if (grounded > 0) {
      nAvg.normalize();
      // cancel gravity's downhill pull; the forgiving slope drag below replaces it.
      // Two wheels down is enough: on a steep bank the others often hang free.
      gt.set(0, -T.gravity, 0).addScaledVector(nAvg, T.gravity * nAvg.y);
      lin.addScaledVector(gt, -dt * Math.min(1, grounded / 2));

      f.copy(fwd).addScaledVector(nAvg, -fwd.dot(nAvg)).normalize();
      rt.copy(right).addScaledVector(nAvg, -right.dot(nAvg)).normalize();
      const vf = lin.dot(f), vr = lin.dot(rt);
      const slope = f.y / Math.max(1e-3, Math.hypot(f.x, f.z));
      const wet = height(t.x, t.z) < waterLevel(t.x, t.z) - 0.25;
      const hm = handling();
      let maxF = (wet ? T.maxWater : T.maxForward) * hm.speed;
      // a loaded Mule labours uphill
      if (spec.loadedUphillMax) maxF -= (maxF - Math.min(maxF, spec.loadedUphillMax)) * live.cargo.load * smooth(0, 0.1, slope);

      // surface: mud and snow take grip; full throttle on mud mostly spins the wheel
      const grip0 = (spec.tracked ? 1 : gripAt(t.x, t.z)) * hm.grip, spin = 1 - (1 - grip0) * smooth(0.35, 1, Math.abs(thr));
      live.spin = grip0 < 1 && Math.abs(thr) > 0.6 ? 1 - grip0 : 0;
      let sp = vf;
      if (thr > 0) sp += sp < -0.5 ? T.turnaround * dt : T.accel * spin * thr * dt * Math.max(0, 1 - sp / maxF);
      else if (thr < 0) sp += sp > 0.5 ? -T.turnaroundBack * dt : -T.reverseAccel * dt * Math.max(0, 1 + sp / T.maxReverse);
      else sp -= sp * T.coast * dt;
      if (brake) { const d = T.brake * dt; sp = Math.abs(sp) < d ? 0 : sp - Math.sign(sp) * d; }
      sp -= slope * T.slopeDrag * dt;
      if (wet) sp -= sp * T.waterDrag * dt;
      // engine braking: steep descents settle a little above top speed instead of running away
      if (sp > maxF) sp -= (sp - maxF) * T.overspeedDrag * dt;
      if (thr === 0 && Math.abs(slope) < T.holdSlope && Math.abs(sp) < T.holdSpeed) sp = 0;

      lin.addScaledVector(f, (sp - vf) * gf);
      lin.addScaledVector(rt, -vr * damp(T.lateralGrip * grip0, dt) * gf);
      // crosswind (Kettle Peak's upper turn): a sideways shove while grounded
      if ((live.wind.x || live.wind.z) && !spec.tracked) { lin.x += live.wind.x * dt * gf; lin.z += live.wind.z * dt * gf; }
      // parked (menus, intro) or braked to a stop: hold fast, never creep down a bank
      if (!playing || (brake && sp === 0)) {
        const hold = Math.min(1, grounded / 2);
        lin.addScaledVector(f, -lin.dot(f) * hold).addScaledVector(rt, -lin.dot(rt) * hold);
      }

      // grip ramps in with speed; holding the throttle adds a little so a rover nosed into a
      // tree can still pivot off it instead of feeling stuck
      const a = Math.abs(sp), grip = Math.min(1, Math.max(a / T.gripSpeed, Math.abs(thr) * T.pushGrip));
      const target = st.steer * T.steerRate * grip * (1 - T.topSpeedSteerCut * Math.min(1, a / 22)) * (sp < 0 ? -1 : 1);
      ang.addScaledVector(up, (target - ang.dot(up)) * damp(T.yawFollow, dt) * gf);
      st.speed = sp;
      st.load = clamp(slope * 2 + thr * 0.4, 0, 1);
    } else {
      ang.addScaledVector(up, (st.steer * T.airSteer - ang.dot(up)) * damp(2, dt));
      st.speed = lin.dot(fwd);
      st.load = 0;
    }

    /* ---- tippiness (Mule): lean past one threshold, roll past the next ---- */
    const latRaw = st.speed * ang.dot(up); // + = pushed toward the right of the cab
    st.lat += (latRaw - st.lat) * damp(6, dt);
    if (spec.tip && playing) {
      const ld = live.cargo.load, rollT = spec.tip.roll + (spec.tip.rollLoaded - spec.tip.roll) * ld;
      const leanT = spec.tip.lean + (spec.tip.leanLoaded - spec.tip.lean) * ld;
      st.lean = Math.sign(st.lat) * smooth(leanT, rollT, Math.abs(st.lat));
      st.over = Math.abs(st.lat) > rollT && grounded ? st.over + dt : Math.max(0, st.over - dt * 2);
      if (st.over > 0.6 && !st.tipping) st.tipping = Math.sign(st.lat);
      if (st.tipping) ang.addScaledVector(fwd, st.tipping * 7 * dt); // over it goes, outward
    } else st.lean = 0;
    live.latAccel = st.lat;

    /* ---- stability: it should never feel stuck or end up on its roof ---- */
    const tilt = Math.acos(clamp(up.y, -1, 1));
    axis.crossVectors(up, Y);
    if (!st.tipping) ang.addScaledVector(axis, (grounded ? smooth(0.75, 1.2, tilt) * 18 : 2.5) * dt);
    if (!grounded) {
      const wu = ang.dot(up);
      ang.addScaledVector(up, -wu).multiplyScalar(Math.exp(-1.5 * dt)).addScaledVector(up, wu);
    }
    st.flipped = up.y < 0.3 ? st.flipped + dt : 0;

    // soft edge of the world
    const rr = Math.hypot(t.x, t.z), MAP_RADIUS = activeGround().radius;
    if (rr > MAP_RADIUS) {
      const rx = t.x / rr, rz = t.z / rr, out = lin.x * rx + lin.z * rz;
      if (out > 0) { lin.x -= rx * out; lin.z -= rz * out; }
      lin.x -= rx * (rr - MAP_RADIUS) * 3 * dt;
      lin.z -= rz * (rr - MAP_RADIUS) * 3 * dt;
    }

    b.setLinvel(lin, true);
    b.setAngvel(ang, true);
    st.vAfter.copy(lin);

    // landings: weight you can feel
    if (grounded === 0) st.airTime += dt;
    else {
      if (st.airTime > 0.25) { addShake(clamp(-vyBefore * 0.05, 0, 0.7)); audio.thud(-vyBefore); }
      st.airTime = 0;
    }
    st.grounded = grounded;
    st.yawRate = ang.dot(up);

    const c2 = live.car;
    c2.still = playing && Math.abs(st.speed) < 0.3 && thr === 0 ? c2.still + dt : playing ? 0 : c2.still + dt;
    if (spec.recover) {
      // remember where it last sat safely: upright, all wheels down, not in water
      st.safeT += dt;
      if (st.safeT > 0.5 && grounded === N && up.y > 0.88 && Math.abs(st.speed) < 9 && !(height(t.x, t.z) < waterLevel(t.x, t.z) - 0.2)) {
        st.safeT = 0;
        Object.assign(live.safe, { x: t.x, z: t.z, yaw: Math.atan2(-fwd.x, -fwd.z) });
      }
      // no-fail recovery: on its side for 1.5 s, or falling off a cliff -> fade, set it back, fade in
      st.onSide = up.y < 0.5 ? st.onSide + dt : 0;
      // once it has gone over, it has gone over: don't leave it resting on a rack corner
      st.tipT = st.tipping ? st.tipT + dt : 0;
      const falling = st.airTime > 0.8 && lin.y < -5 && t.y - groundHeight(t.x, t.z) > 6;
      if (st.recovering < 0 && (st.onSide > 1.5 || st.tipT > 1.6 || falling)) {
        st.recovering = 0;
        useStore.setState({ fade: true });
      }
      if (st.recovering >= 0) {
        const before = st.recovering;
        st.recovering += dt;
        if (before < 0.6 && st.recovering >= 0.6) {
          const p = live.safePoint?.(live.safe.x, live.safe.z) ?? live.safe;
          live.teleport?.(p.x, p.z, p.yaw);
        }
        if (st.recovering >= 0.95) { st.recovering = -1; useStore.setState({ fade: false }); }
      }
    } else if (st.flipped > 2.5) {
      // last resort: set it back on its wheels where it is
      const yaw = Math.atan2(-fwd.x, -fwd.z);
      live.teleport?.(t.x, t.z, yaw);
      st.flipped = 0;
    }
  });

  // hits against trees, rocks and banks show up as a sudden sideways change in velocity
  useAfterPhysicsStep((world) => {
    const b = ref.current;
    if (!b) return;
    const v = b.linvel(), d = Math.hypot(v.x - st.vAfter.x, v.z - st.vAfter.z);
    if (d > 2.5) addShake(Math.min(0.5, d * 0.04));
    st.age += world.timestep;
    if (!onStep) return;
    // what a crate on the rack feels: the cornering load the tip system uses, the change in
    // forward speed, and vertical jolts from the springs (gravity included, so 24 at rest)
    const dt = world.timestep;
    A.set(st.lat, (st.speed - st.vPrev.x) / dt, (v.y - st.vPrev.y) / dt + T.gravity);
    st.vPrev.set(st.speed, v.y, 0);
    st.felt.lerp(A, damp(10, dt));
    // settling after a spawn or teleport is not driving
    const playing = useStore.getState().phase === "play";
    const r = b.rotation();
    q.set(r.x, r.y, r.z, r.w);
    up.set(0, 1, 0).applyQuaternion(q);
    // rolled means over on its side (the right axis tipping toward vertical), not nosing down a bank
    const rollSin = Math.abs(right.set(1, 0, 0).applyQuaternion(q).y);
    onStep({ dt, lat: st.felt.x, long: st.felt.y, vert: st.felt.z, up, rolled: rollSin > 0.75 || st.tipping !== 0, live: playing && st.age > 1 });
  });

  // visuals + live state, after physics has interpolated the body (priority -40 > physics -50)
  useFrame((_, dt) => {
    decor();
    const holder = parts.root.parent;
    if (!holder) return;
    const p = holder.position, c = live.car;
    fwd.set(0, 0, -1).applyQuaternion(holder.quaternion);
    c.x = p.x; c.y = p.y; c.z = p.z;
    c.yaw = Math.atan2(-fwd.x, -fwd.z);
    const prev = st.frameSpeed;
    st.frameSpeed += (st.speed - st.frameSpeed) * damp(20, dt);
    st.accel += ((st.frameSpeed - prev) / Math.max(dt, 1e-3) - st.accel) * damp(8, dt);
    c.speed = st.frameSpeed;
    c.air = st.airTime > 0.12;
    c.load = st.load;
    c.steer = st.steer;
    c.yawRate = st.yawRate;
    c.accel = st.accel;

    parts.wheels.forEach((w, i) => {
      st.shown[i] += (st.lens[i] - st.shown[i]) * damp(18, dt);
      w.pivot.position.y = ANCHOR_Y - st.shown[i];
      if (w.lz < 0) w.pivot.rotation.y = st.steer * spec.steerVisual;
      // the inside rear wheel lifts as the Mule leans
      if (spec.tip && w.lz > 0 && Math.sign(w.lx) === -Math.sign(st.lean)) w.pivot.position.y += Math.abs(st.leanShown) * 0.24;
      w.spin.rotation.x -= (st.frameSpeed * dt) / T.wheelRadius;
    });
    // squat under acceleration, dive under braking, roll out of turns
    st.tilt += (clamp(st.accel * 0.012, -0.05, 0.05) - st.tilt) * damp(6, dt);
    st.leanShown += (st.lean - st.leanShown) * damp(8, dt);
    parts.body.rotation.set(st.tilt, 0, -st.yawRate * Math.abs(st.frameSpeed) * 0.0035 - st.leanShown * 0.16);
  }, -40);

  return ref;
}
