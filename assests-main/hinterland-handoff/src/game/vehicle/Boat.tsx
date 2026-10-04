// Rover boat mode (JOURNEYS §2.3): an arcade boat on the water surface (no Rapier body). It floats
// out from a slipway (3 s: wheels fold, floats out, prop down), bobs, leaves a wake, and keeps to
// water deep enough to float; at a slipway, hold T to drive back ashore as the Rover.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, damp } from "../../utils/noise";
import { mergeByMaterial } from "../art/kit";
import { glowTexture } from "../environment/textures";
import { addShake } from "../camera/CameraRig";
import { height, waterLevel } from "../world/height";
import { SLIPWAYS } from "../world/Slipways";
import { attachDriveInput, clearDriveInput, input, readInput } from "./input";
import { buildBoatKit } from "./rover/BoatKit";
import { buildRover } from "./rover/RoverModel";
import { PAINTS } from "./paints";
import { spawnPose } from "./useVehicle";

const SHIFT = 3, HOLD = 1.2, MAX = 9, REV = 3, ACCEL = 3.2, DRAG = 0.5, DRAFT = 0.75;
const deep = (x: number, z: number) => waterLevel(x, z) - height(x, z) > DRAFT;
const WAKE = 110;

function buildModel() {
  const rover = buildRover(), paint = rover.userData.paint as MeshStandardMaterial, wheels = rover.userData.wheels as Group[];
  wheels.forEach((w) => rover.remove(w));
  const root = new Group(), body = new Group(), kit = buildBoatKit();
  root.add(body);
  body.add(mergeByMaterial(rover), kit);
  const wheel = mergeByMaterial(wheels[0]);
  const ws = wheels.map((w) => { const p = new Group(); p.position.copy(w.position); p.add(wheel.clone()); body.add(p); return p; });
  return { root, body, kit, paint, ws };
}

export function Boat() {
  const m = useMemo(buildModel, []);
  const wake = useMemo(() => {
    const im = new InstancedMesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false }), WAKE);
    im.frustumCulled = false;
    for (let i = 0; i < WAKE; i++) im.setColorAt(i, new Color(0, 0, 0));
    return { im, life: new Float32Array(WAKE), size: new Float32Array(WAKE), pos: new Float32Array(WAKE * 2), next: 0, d: 0, o: new Object3D(), c: new Color() };
  }, []);
  const st = useRef<{ x: number; z: number; yaw: number; v: number; turn: number; phase: "float" | "boat" | "ashore"; t: number; hold: number; bump: number }>(null!);
  if (!st.current) { const p = spawnPose(); st.current = { x: p.x, z: p.z, yaw: p.yaw, v: 0, turn: 0, phase: "float", t: 0, hold: 0, bump: 0 }; }
  const paintIdx = useStore((s) => s.paint.rover);
  useEffect(() => { m.paint.color.set(PAINTS.rover[paintIdx] ?? PAINTS.rover[0]); }, [m, paintIdx]);

  useEffect(() => {
    const detach = attachDriveInput();
    live.vehicle = "boat";
    live.cam.dist = 9.5; live.cam.height = 3.2; live.cam.posK = 3.5; live.cam.yawK = 2;
    live.teleport = (x, z, yaw) => { const s = st.current; s.x = x; s.z = z; s.yaw = yaw; s.v = 0; };
    return () => { detach(); clearDriveInput(); live.flight.prompt = ""; live.teleport = null; useStore.setState({ cinema: false }); };
  }, []);

  const splash = (x: number, z: number, n: number, size: number) => {
    for (let k = 0; k < n; k++) {
      const i = wake.next = (wake.next + 1) % WAKE, a = (k / n) * 6.28;
      wake.pos[i * 2] = x + Math.cos(a) * 1.2; wake.pos[i * 2 + 1] = z + Math.sin(a) * 1.2; wake.life[i] = 1; wake.size[i] = size;
    }
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), s = st.current, store = useStore.getState(), playing = store.phase === "play";
    if (playing) readInput(); else { input.throttle = input.steer = 0; input.brake = input.wings = false; }
    let deploy = 1;
    if (s.phase !== "boat") {
      s.t += dt * (s.phase === "float" ? 1 : -1);
      deploy = clamp(s.t / SHIFT, 0, 1);
      const inCut = s.t > 0 && s.t < SHIFT;
      if (store.cinema !== inCut) useStore.setState({ cinema: inCut });
      if (s.phase === "float" && s.t >= SHIFT) { s.phase = "boat"; splash(s.x, s.z, 12, 2.2); addShake(0.2); }
      if (s.phase === "ashore" && s.t <= 0) {
        // drive up the ramp: appear on the bank behind the slipway
        const sl = SLIPWAYS[store.region].reduce((a, b) => (Math.hypot(b.x - s.x, b.z - s.z) < Math.hypot(a.x - s.x, a.z - s.z) ? b : a));
        live.spawnAt = { x: sl.x + Math.sin(sl.yaw) * 7, z: sl.z + Math.cos(sl.yaw) * 7, yaw: sl.yaw + Math.PI };
        useStore.setState({ vehicle: "rover" });
        return;
      }
    } else if (playing) {
      // throttle and rudder: turning needs way on (but a little at rest, like a small prop wash)
      const want = input.throttle > 0 ? MAX * input.throttle : input.throttle < 0 ? -REV : 0;
      s.v += clamp(want - s.v, -ACCEL * dt, ACCEL * dt) - s.v * DRAG * dt * (input.throttle ? 0 : 1);
      s.turn += (input.steer * (0.25 + Math.min(1, Math.abs(s.v) / 5) * 0.55) - s.turn) * damp(3, dt);
      s.yaw += s.turn * Math.sign(s.v || 1) * dt;
      const nx = s.x - Math.sin(s.yaw) * s.v * dt, nz = s.z - Math.cos(s.yaw) * s.v * dt;
      // keep to water deep enough to float: test the bow, nudge off the bank
      const bx = nx - Math.sin(s.yaw) * 2.4 * Math.sign(s.v || 1), bz = nz - Math.cos(s.yaw) * 2.4 * Math.sign(s.v || 1);
      if (deep(nx, nz) && deep(bx, bz)) { s.x = nx; s.z = nz; }
      else { if (Math.abs(s.v) > 2 && s.bump <= 0) { addShake(0.15); s.bump = 0.8; } s.v *= -0.25; }
      s.bump -= dt;
      // hold T beside a slipway to go ashore
      const near = SLIPWAYS[store.region].some((sl) => Math.hypot(sl.x - s.x, sl.z - s.z) < 8);
      const can = near && Math.abs(s.v) < 1;
      s.hold = can && input.wings ? s.hold + dt : 0;
      live.flight.prompt = can ? "ashore" : live.flight.prompt === "ashore" ? "" : live.flight.prompt;
      live.flight.hold = clamp(s.hold / HOLD, 0, 1);
      if (s.hold >= HOLD) { s.phase = "ashore"; s.t = SHIFT; s.hold = 0; live.flight.prompt = ""; }
    }

    // float on the surface, bob, pitch with the throttle, lean into the turn
    const t = live.clock, wy = waterLevel(s.x, s.z);
    const y = deploy < 1 ? Math.max(height(s.x, s.z), wy - 0.9) * (1 - deploy) + (wy - 0.55) * deploy : wy - 0.55 + Math.sin(t * 1.6) * 0.05;
    m.root.position.set(s.x, y, s.z);
    m.root.rotation.set(0, s.yaw, 0);
    m.body.rotation.set(Math.sin(t * 1.3) * 0.02 - s.v * 0.006, 0, Math.sin(t * 1.1 + 1) * 0.025 - s.turn * Math.abs(s.v) * 0.012, "YXZ");
    (m.kit.userData.set as (t: number, p: number, dt: number) => void)(deploy, Math.abs(s.v) / MAX + (s.phase === "boat" ? 0.15 : 0), dt);
    // wheels fold up into the arches as it floats
    m.ws.forEach((w, i) => { w.rotation.z = (i < 2 ? -1 : 1) * deploy * 1.4; w.position.y = 0.46 + deploy * 0.35; });

    // wake: little foam patches dropped behind, spreading and fading
    wake.d += Math.abs(s.v) * dt;
    if (s.phase === "boat" && wake.d > 0.6 && Math.abs(s.v) > 1) {
      wake.d = 0;
      for (const side of [-1, 1]) {
        const i = wake.next = (wake.next + 1) % WAKE;
        wake.pos[i * 2] = s.x + Math.sin(s.yaw) * 2.3 + Math.cos(s.yaw) * side * 0.9; wake.pos[i * 2 + 1] = s.z + Math.cos(s.yaw) * 2.3 - Math.sin(s.yaw) * side * 0.9;
        wake.life[i] = 1; wake.size[i] = 0.9;
      }
    }
    for (let i = 0; i < WAKE; i++) {
      wake.life[i] = Math.max(0, wake.life[i] - dt / 3);
      const l = wake.life[i], px = wake.pos[i * 2], pz = wake.pos[i * 2 + 1];
      wake.o.position.set(px, waterLevel(px, pz) + 0.03, pz); wake.o.scale.setScalar(wake.size[i] * (2.4 - l * 1.4)); wake.o.updateMatrix();
      wake.im.setMatrixAt(i, wake.o.matrix);
      wake.im.setColorAt(i, wake.c.setScalar(l * l * 0.22)); // soft foam, gone in 3 s
    }
    wake.im.instanceMatrix.needsUpdate = true;
    if (wake.im.instanceColor) wake.im.instanceColor.needsUpdate = true;

    // the shared pose (camera, director, audio)
    const car = live.car;
    car.x = s.x; car.y = y; car.z = s.z; car.yaw = s.yaw; car.speed = s.v; car.air = false;
    car.still = Math.abs(s.v) < 0.3 ? car.still + dt : 0; car.load = Math.abs(input.throttle) * 0.5; car.steer = input.steer; car.yawRate = s.turn; car.accel = 0;
    live.safe.x = s.x; live.safe.z = s.z; live.safe.yaw = s.yaw;
  }, -40);

  return <><primitive object={m.root} /><primitive object={wake.im} /></>;
}
