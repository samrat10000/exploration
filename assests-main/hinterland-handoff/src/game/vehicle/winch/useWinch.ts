// Grapple winch (JOURNEYS §1.9), a Rover mod. Hold the right mouse button to aim (snaps to the nearest
// anchor ring within 18 m, in front), release to throw (the hook flies in an arc), then W reels in,
// S lets out, Q lets go. The cable is a rope with a motor: taut, it pulls like a stiff spring along
// the line; past its working load the winch slips (it never snaps). On top of the boulder, the hook
// lets go by itself.
import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useBeforePhysicsStep, type RapierRigidBody } from "@react-three/rapier";
import { Group, Mesh, MeshStandardMaterial, QuadraticBezierCurve3, Quaternion, TubeGeometry, Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { clamp } from "../../../utils/noise";
import { ANCHORS } from "../../world/Anchors";
import { input } from "../input";
import { buildHook } from "./WinchModel";

const RANGE = 18, REEL = 1.6, SLIP = 1.1 /* × weight, per second of pull */, THROW = 0.55;
/** cable exit on the Rover (vehicle space) */
const EXIT = new Vector3(0, 0.72, -2.55);
const _q = new Quaternion(), _p = new Vector3(), _a = new Vector3(), _d = new Vector3();

export function useWinch(body: RefObject<RapierRigidBody>, region: "valley" | "kettle") {
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

  // the rope: reel, pull, slip; let go on top
  useBeforePhysicsStep((world) => {
    const w = live.winch, b = body.current;
    if (!b || w.state !== "latched") return;
    const dt = world.timestep, a = ANCHORS[region][w.anchor];
    exitWorld(_a);
    _d.set(a.ring.x - _a.x, a.ring.y - _a.y, a.ring.z - _a.z);
    const dist = _d.length();
    // W reels in (the line shortens, the rope pulls); never shorter than the ring is high above the bumper
    w.length = clamp(w.length + (input.throttle > 0 ? -REEL : input.throttle < 0 ? REEL : 0) * dt, Math.max(0.6, dist - 4), RANGE + 2);
    const stretch = dist - w.length, m = b.mass();
    w.tension = 0;
    if (stretch > 0.02 || input.throttle > 0) {
      _d.divideScalar(dist);
      const v = b.linvel(), along = v.x * _d.x + v.y * _d.y + v.z * _d.z;
      // a strong, damped pull along the line; reeling adds a lift so the nose climbs the face (the rope
      // runs up to the crown, so hauling must raise the vehicle, not only drag it into the rock)
      const reeling = input.throttle > 0 ? 1 : 0, max = SLIP * m * 24;
      let f = m * (60 * Math.max(stretch, reeling * 0.4) - 8 * along);
      if (f > max) { f = max; w.length += (stretch - max / (60 * m)) * 0.5; } // the drum slips, never snaps
      f = Math.max(0, f);
      w.tension = f / max;
      b.applyImpulse({ x: _d.x * f * dt, y: (_d.y * f + reeling * m * 30 * clamp(a.top - b.translation().y + 0.5, 0, 1)) * dt, z: _d.z * f * dt }, true);
    }
    // on top: all four wheels up there, the hook lets go
    const t = b.translation();
    if (t.y > a.top - 0.3 && Math.hypot(t.x - a.x, t.z - a.z) < a.r) w.state = "idle";
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
