// Grapple winch (JOURNEYS §1.9), a Rover mod. Hold the right mouse button to aim (snaps to the nearest
// anchor ring within 18 m, in front), release to throw (the hook flies in an arc), then W reels in,
// S lets out, Q lets go. The cable is a rope with a motor: taut, it pulls like a stiff spring along
// the line; past its working load the winch slips (it never snaps). On top of the boulder, the hook
// lets go by itself.
import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBeforePhysicsStep, type RapierRigidBody } from "@react-three/rapier";
import { Euler, Group, Mesh, MeshStandardMaterial, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { clamp } from "../../../utils/noise";
import { ANCHORS } from "../../world/Anchors";
import type { RegionId } from "../../journeys/journeys";
import { input } from "../input";
import { buildHook } from "./WinchModel";

const RANGE = 18, REEL = 1.6, HAUL_SPEED = 2.4, THROW = 0.55;
/** cable exit on the Rover (vehicle space) */
const EXIT = new Vector3(0, 0.72, -2.55);
const _q = new Quaternion(), _p = new Vector3(), _a = new Vector3(), _d = new Vector3(), _e = new Euler();

export function useWinch(body: RefObject<RapierRigidBody>, region: RegionId) {
  const camera = useThree((s) => s.camera), gl = useThree((s) => s.gl);
  const parts = useMemo(() => {
    const hook = buildHook(), cable = new Mesh(new TubeGeometry(new QuadraticBezierCurve3(new Vector3(), new Vector3(), new Vector3(0, 0, -1)), 16, 0.014, 5), new MeshStandardMaterial({ color: "#3B3934", roughness: 0.6, metalness: 0.4 }));
    cable.frustumCulled = false; hook.visible = cable.visible = false;
    const g = new Group(); g.add(hook, cable);
    return { g, hook, cable };
  }, []);

  // right mouse: aim while held, throw on release; Q lets go
  useEffect(() => {
    const el = gl.domElement, w = live.winch;
    const down = (e: PointerEvent) => { if (e.button === 2 && live.vehicle === "rover" && useStore.getState().phase === "play") { w.aiming = true; e.preventDefault(); } };
    const up = (e: PointerEvent) => {
      if (e.button !== 2 || !w.aiming) return;
      w.aiming = false;
      if (w.target >= 0 && w.state === "idle") { w.state = "flying"; w.t = 0; w.anchor = w.target; }
    };
    const menu = (e: MouseEvent) => e.preventDefault();
    const key = (e: KeyboardEvent) => { if (e.code === "KeyQ" && w.state !== "idle") w.state = "idle"; };
    el.addEventListener("pointerdown", down); addEventListener("pointerup", up); el.addEventListener("contextmenu", menu); addEventListener("keydown", key);
    return () => { el.removeEventListener("pointerdown", down); removeEventListener("pointerup", up); el.removeEventListener("contextmenu", menu); removeEventListener("keydown", key); w.state = "idle"; w.aiming = false; };
  }, [gl]);

  const exitWorld = (out: Vector3) => {
    const b = body.current!, t = b.translation(), r = b.rotation();
    return out.copy(EXIT).applyQuaternion(_q.set(r.x, r.y, r.z, r.w)).add(_p.set(t.x, t.y, t.z));
  };

  // the haul: with the hook latched, W winds the Rover along the rope to the boulder's crown (S lowers it back,
  // letting go drops it). It follows a smooth path (a lift over the rim for a face, a gentle sag across a gap),
  // nose pitched along the line, and lets go by itself on top. Kinematic on purpose: the rope does the work, the
  // player chooses when and which ring.
  useBeforePhysicsStep((world) => {
    const w = live.winch, b = body.current;
    if (!b) return;
    if (w.state !== "latched") { w.haul = null; return; }
    const dt = world.timestep, a = ANCHORS[region][w.anchor], t = b.translation();
    exitWorld(_a);
    w.tension = 0;
    const wantUp = input.throttle > 0, wantDown = input.throttle < 0;
    if (!w.haul && wantUp) {
      const dx = a.crown.x - t.x, dz = a.crown.z - t.z, len = Math.hypot(dx, a.crown.y - t.y, dz);
      w.haul = { s: 0, len: Math.max(1, len), ax: t.x, ay: t.y, az: t.z };
    }
    const h = w.haul;
    if (!h) { w.length = clamp(w.length + (wantDown ? REEL : 0) * dt, 0.6, RANGE + 2); return; }
    h.s = clamp(h.s + ((wantUp ? 1 : wantDown ? -1 : 0) * HAUL_SPEED * dt) / h.len, 0, 1);
    const k = h.s * h.s * (3 - 2 * h.s), horiz = Math.hypot(a.crown.x - h.ax, a.crown.z - h.az), up = a.crown.y - h.ay;
    const lift = up > 1.2 ? 0.7 : -Math.min(1.6, horiz * 0.1);
    const at = (kk: number) => _p.set(h.ax + (a.crown.x - h.ax) * kk, h.ay + up * kk + lift * Math.sin(Math.PI * kk), h.az + (a.crown.z - h.az) * kk);
    at(k);
    const px = _p.x, py = _p.y, pz = _p.z;
    at(Math.min(1, k + 0.02));
    const tx = _p.x - px, ty = _p.y - py, tz = _p.z - pz, th = Math.hypot(tx, tz);
    const yaw = Math.atan2(-(a.crown.x - h.ax), -(a.crown.z - h.az)), pitch = clamp(Math.atan2(ty, Math.max(th, 1e-3)) * 0.8, -0.6, 0.7) * (k > 0.97 ? 0 : 1);
    _e.set(pitch, yaw, 0, "YXZ"); _q.setFromEuler(_e);
    b.setTranslation({ x: px, y: py, z: pz }, true); b.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    w.tension = wantUp ? 0.8 : 0.4; w.length = Math.max(0.6, _a.distanceTo(a.ring));
    // on top: the hook lets go and the wheels take the weight
    if (h.s >= 1) { w.state = "idle"; w.haul = null; }
  });

  // aim, hook flight, cable drawing
  useFrame((_, dt) => {
    const w = live.winch, b = body.current;
    if (!b) return;
    const anchors = ANCHORS[region], car = live.car;
    // the nearest ring within range, in front of the Rover and on screen
    w.target = -1;
    if (w.aiming && w.state === "idle") {
      let best = RANGE;
      anchors.forEach((a, i) => {
        const dx = a.ring.x - car.x, dz = a.ring.z - car.z, d = Math.hypot(dx, dz), fwd = (-Math.sin(car.yaw) * dx - Math.cos(car.yaw) * dz) / (d || 1);
        _p.copy(a.ring).project(camera);
        if (d < best && fwd > 0.2 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1 && _p.z < 1) { best = d; w.target = i; }
      });
    }
    const { hook, cable } = parts;
    hook.visible = cable.visible = w.state !== "idle";
    if (w.state === "idle") return;
    const a = anchors[w.anchor];
    exitWorld(_a);
    let end: Vector3;
    if (w.state === "flying") {
      // the hook arcs out to the ring
      w.t += dt / THROW;
      const k = clamp(w.t, 0, 1);
      end = _p.copy(_a).lerp(a.ring, k); end.y += Math.sin(k * Math.PI) * 2.2;
      if (w.t >= 1) { w.state = "latched"; w.length = _a.distanceTo(a.ring) + 0.3; }
    } else end = _p.copy(a.ring);
    hook.position.copy(end); hook.lookAt(_a);
    // slack: a catenary sag; taut: straight
    const span = _a.distanceTo(end), sag = w.state === "latched" ? Math.max(0, w.length - span) * 0.6 * (1 - w.tension) : span * 0.15;
    const mid = _d.copy(_a).lerp(end, 0.5); mid.y -= sag;
    cable.geometry.dispose();
    cable.geometry = new TubeGeometry(new QuadraticBezierCurve3(_a.clone(), mid.clone(), end.clone()), 16, 0.014, 5);
  });

  return parts.g;
}
