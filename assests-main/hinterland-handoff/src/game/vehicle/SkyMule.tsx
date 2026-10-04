// Fliers (JOURNEYS §1.10, §2.3): the Sky Mule (the Mule with its Sky Kit out) and the Rover glider. An arcade glider (flight.ts), not
// a Rapier body: it unfolds on a launch ridge (3 s), flies, lands, and folds back into the Mule.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshStandardMaterial } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, damp } from "../../utils/noise";
import { mergeByMaterial } from "../art/kit";
import { addShake } from "../camera/CameraRig";
import { groundHeight } from "../world/height";
import { SKY, agl, newFlight, stepFlight, type FlightState } from "./flight";
import { attachDriveInput, clearDriveInput, input, readInput } from "./input";
import { buildSkyKit } from "./mule/SkyKit";
import { buildMule } from "./mule/MuleModel";
import { buildGliderKit } from "./rover/GliderKit";
import { buildRover } from "./rover/RoverModel";
import { PAINTS } from "./paints";
import { spawnPose } from "./useVehicle";

const UNFOLD = 3, HOLD = 1.2;
type Phase = "unfold" | "fly" | "landed" | "fold";

export type FlierKind = "skymule" | "glider";
/** what each flier folds back into */
const GROUND: Record<FlierKind, "mule" | "rover"> = { skymule: "mule", glider: "rover" };

function buildModel(kind: FlierKind) {
  const base = kind === "skymule" ? buildMule({ cargo: false }) : buildRover(), paint = base.userData.paint as MeshStandardMaterial;
  const kit = kind === "skymule" ? buildSkyKit() : buildGliderKit(), root = new Group(), body = new Group();
  root.add(body);
  body.add(mergeByMaterial(base), kit);
  return { root, body, kit, paint };
}

export function SkyMule({ kind = "skymule" }: { kind?: FlierKind }) {
  const m = useMemo(() => buildModel(kind), [kind]);
  const glider = kind === "glider";
  const st = useRef<{ f: FlightState; phase: Phase; t: number; hold: number; recover: number; touchT: number }>(null!);
  if (!st.current) {
    const p = spawnPose(), start = live.flight.start;
    const air = start === "air" ? 60 : 0;
    st.current = { f: newFlight(p.x, p.y + air, p.z, p.yaw, start === "air" ? 17 : 0), phase: start === "air" ? "fly" : start === "landed" ? "landed" : "unfold", t: start === "air" ? UNFOLD : 0, hold: 0, recover: -1, touchT: 0 };
    if (start !== "air") st.current.f.onGround = true;
    if (glider) st.current.f.puffs = st.current.f.maxPuffs = 0; // no prop: rising air only
  }
  const paintIdx = useStore((s) => s.paint[GROUND[kind]]);
  useEffect(() => { m.paint.color.set(PAINTS[GROUND[kind]][paintIdx] ?? PAINTS[GROUND[kind]][0]); }, [m, paintIdx, kind]);

  useEffect(() => {
    const detach = attachDriveInput();
    live.vehicle = kind;
    live.flight.on = true;
    live.cam.dist = 12.5; live.cam.height = 4.1; live.cam.posK = 3; live.cam.yawK = 1.8;
    live.teleport = (x, z, yaw) => { const s = st.current; s.f = newFlight(x, groundHeight(x, z) + 0.05, z, yaw, 0); s.f.onGround = true; s.phase = "landed"; s.t = 0; };
    return () => { detach(); clearDriveInput(); live.flight.on = false; live.flight.prompt = ""; live.teleport = null; useStore.setState({ cinema: false }); };
  }, []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), s = st.current, f = s.f, store = useStore.getState(), playing = store.phase === "play";
    if (playing) readInput(); else { input.throttle = input.steer = 0; input.brake = input.wings = false; }
    const map = SKY[store.region];
    let deploy = 1, prop = 0;

    if (s.phase === "unfold" || s.phase === "fold") {
      // the 3 s cinematic: letterbox, parts move in sequence, then control returns
      s.t += dt * (s.phase === "unfold" ? 1 : -1);
      deploy = clamp(s.t / UNFOLD, 0, 1);
      prop = deploy;
      if (store.cinema !== (s.t > 0 && s.t < UNFOLD)) useStore.setState({ cinema: s.t > 0 && s.t < UNFOLD });
      if (s.phase === "unfold" && s.t >= UNFOLD) {
        // off the ridge: a gentle push out over the edge
        s.phase = "fly"; f.v = 16; f.onGround = false; f.y += 0.6; f.safe = { x: f.x, y: f.y + 8, z: f.z, yaw: f.yaw };
      }
      if (s.phase === "fold" && s.t <= 0) {
        live.spawnAt = { x: f.x, z: f.z, yaw: f.yaw };
        useStore.setState({ vehicle: GROUND[kind] });
        return;
      }
    } else if (s.phase === "fly") {
      prop = live.flight.puffing ? 1 : 0.25;
      const near = map.landings.find((l) => Math.hypot(f.x - l.x, f.z - l.z) < l.r + 2);
      const res = playing && s.recover < 0 ? stepFlight(f, map, dt, input.throttle, input.steer, !glider && input.brake, !!near && agl(f) < 6, live.flight.turb) : "ok";
      if (live.flight.slow) { f.v *= 0.85; live.flight.slow = 0; }
      if (res === "touch" && s.touchT <= 0) { addShake(0.25); s.touchT = 0.6; }
      s.touchT -= dt;
      if (res === "land") { s.phase = "landed"; if (near) store.setExtra("landingsSeen", ((store.extra.landingsSeen as number | undefined) ?? 0) + 1); }
      if (res === "hard") { s.recover = 0; useStore.setState({ fade: true }); }
    } else {
      // landed: hold T to fold the wings away
      f.v *= Math.exp(-3 * dt);
    }
    // no-fail recovery: fade, back to the last rising air (or launch), fade in
    if (s.recover >= 0) {
      const before = s.recover;
      s.recover += dt;
      if (before < 0.6 && s.recover >= 0.6) { const sf = f.safe; s.f = newFlight(sf.x, Math.max(sf.y, groundHeight(sf.x, sf.z) + 25), sf.z, sf.yaw, 15); if (glider) s.f.puffs = s.f.maxPuffs = 0; }
      if (s.recover >= 0.95) { s.recover = -1; useStore.setState({ fade: false }); }
    }

    // hold T: unfold is started by the launch ridge; here it folds when landed
    const canFold = s.phase === "landed" && playing;
    s.hold = canFold && input.wings ? s.hold + dt : 0;
    live.flight.prompt = canFold ? "fold" : live.flight.prompt === "fold" ? "" : live.flight.prompt;
    live.flight.hold = clamp(s.hold / HOLD, 0, 1);
    if (s.hold >= HOLD) { s.phase = "fold"; s.t = UNFOLD; s.hold = 0; live.flight.prompt = ""; }

    // draw: position, heading, pitch and bank; wings set to the deploy state
    const g = s.f;
    m.root.position.set(g.x, g.y, g.z);
    m.root.rotation.set(0, g.yaw, 0);
    m.body.rotation.set(g.onGround ? 0 : g.pitch, 0, g.onGround ? 0 : g.bank, "YXZ");
    (m.kit.userData.set as (t: number, p: number, dt: number) => void)(deploy, prop, dt);

    // share the pose with the camera, director, audio and HUD
    const car = live.car;
    car.x = g.x; car.y = g.y; car.z = g.z; car.yaw = g.yaw; car.speed = g.v;
    car.air = !g.onGround; car.still = g.v < 0.5 ? car.still + dt : 0; car.load = live.flight.puffing ? 0.8 : 0.2;
    car.steer = input.steer; car.yawRate = 0; car.accel = 0;
    const lo = map.landings[0] ? groundHeight(map.landings[0].x, map.landings[0].z) : 0, hi = Math.max(lo + 120, ...map.thermals.map((t) => t.top));
    live.flight.alt = agl(g);
    live.flight.alt01 += (clamp((g.y - lo) / (hi - lo), 0, 1) - live.flight.alt01) * damp(4, dt);
    const sb = map.storms[0];
    live.flight.band = sb ? [clamp((sb.y0 - lo) / (hi - lo), 0, 1), clamp((sb.y1 - lo) / (hi - lo), 0, 1)] : null;
    live.flight.goal01 = map.landings.length ? 0 : -1;
    live.flight.puffs = glider ? -1 : g.puffs;
    live.flight.puffing = g.puffT > 0;
    // the first two times you enter rising air, the HUD names it
    if (g.inThermal > 1 && live.flight.rising <= 1) { const n = (store.extra.risingSeen as number | undefined) ?? 0; if (n < 3) store.setExtra("risingSeen", n + 1); }
    live.flight.rising = g.inThermal;
    live.flight.slowT = g.slowT;
    live.flight.nearLanding = map.landings.some((l) => Math.hypot(g.x - l.x, g.z - l.z) < 300) && s.phase === "fly";
    live.safe.x = g.safe.x; live.safe.z = g.safe.z; live.safe.yaw = g.safe.yaw;
  }, -40);

  return <primitive object={m.root} />;
}

