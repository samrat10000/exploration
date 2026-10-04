// Dev panel, canvas side (dev builds only, lazy-loaded): stats, slow-mo, free camera, and debug
// drawing for colliders, the route spline and trigger volumes. Also where each region's beats are.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { BufferGeometry, Euler, Float32BufferAttribute, LineBasicMaterial, LineSegments, Quaternion, Vector3 } from "three";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { POOL, TARN, VP, height } from "./world/height";
import { HUT, TRAIL, TRAIL_LEN, progressOf } from "./world/kettle/kettle";
import { BRIDGE, CAMPS, GOATS, LOG, TRAVELER, beside } from "./world/kettle/layout";
import { journey, routeProgress, type RegionId } from "./journeys/journeys";

type Pose = { x: number; z: number; yaw: number };
const facing = (x: number, z: number, tx: number, tz: number): Pose => ({ x, z, yaw: Math.atan2(-(tx - x), -(tz - z)) });
const J1 = journey("overlook").route!;

/** A pose on the region's route at progress p, facing along it. */
export function poseAt(region: RegionId, p: number): Pose {
  if (region === "kettle") { const b = beside(Math.min(p, 0.985), 0); return { x: b.x, z: b.z, yaw: b.yaw }; }
  const lens = J1.slice(1).map((b, i) => Math.hypot(b.x - J1[i].x, b.z - J1[i].z)), total = lens.reduce((a, b) => a + b, 0);
  let d = p * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const a = J1[i], b = J1[i + 1], t = Math.min(1, d / lens[i]);
      return facing(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, b.x, b.z);
    }
    d -= lens[i];
  }
  return facing(J1[0].x, J1[0].z, J1[1].x, J1[1].z);
}

/** Teleport targets (keys 1–7), each with the progress it stands for. */
export function beats(region: RegionId): { name: string; p: number; pose: Pose }[] {
  if (region === "kettle") {
    return ([["orchard", 0.075], ["log", 0.285], ["bridge", 0.43], ["bell poles", 0.53], ["hairpin", progressOf(1440)], ["clouds", 0.775], ["hut", 0.96]] as const)
      .map(([name, p]) => ({ name, p, pose: poseAt("kettle", p) }));
  }
  const at = (x: number, z: number, tx: number, tz: number) => { const pose = facing(x, z, tx, tz); return { pose, p: routeProgress(J1, x, z) }; };
  return [
    { name: "start", p: 0, pose: poseAt("valley", 0) },
    { name: "highfall", ...at(POOL.x + 15, POOL.z + 9, POOL.x, POOL.z - 20) },
    { name: "tarn", ...at(TARN.x + TARN.radius + 6, TARN.z, TARN.x, TARN.z) },
    { name: "overlook", ...at(VP.x, VP.z + 7, VP.x, VP.z - 10) },
  ];
}

/** Which spiral turn of Kettle Peak the trail is on at progress p (1-based). */
const TURNS = (() => {
  const out: number[] = []; let a = Math.atan2(TRAIL[0].x, TRAIL[0].z), acc = 0;
  for (const t of TRAIL) { const b = Math.atan2(t.x, t.z); let d = b - a; d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI; acc += d; a = b; out.push(1 + Math.floor(Math.abs(acc) / (2 * Math.PI))); }
  return out;
})();
export const turnAt = (p: number) => TURNS[Math.min(TURNS.length - 1, Math.round((p * TRAIL_LEN) / 2))];

/** Trigger volumes worth seeing: where beats fire. */
function triggers(region: RegionId) {
  if (region === "kettle") {
    const lines = [0.4, 0.765].map((p) => ({ ...beside(p, 0), r: 4 })); // eagle, cloud sea: crossing a progress line
    return [{ ...TRAVELER, r: 7 }, ...CAMPS.map((c) => ({ ...c, r: 9 })), { ...HUT, r: 16 }, { ...GOATS, r: 24 }, { ...LOG, r: 4.2 }, { ...BRIDGE, r: 7.5 }, ...lines];
  }
  return [{ ...POOL, r: 26 }, { ...VP, r: 11 }, { ...TARN, r: TARN.radius + 7 }];
}

function lines(color: string) {
  const l = new LineSegments(new BufferGeometry(), new LineBasicMaterial({ color, fog: false, depthTest: false, transparent: true, opacity: 0.85 }));
  l.frustumCulled = false; l.renderOrder = 10; l.visible = false;
  return l;
}

const keys = new Set<string>();
const fc = { on: false, yaw: 0, pitch: 0, pos: new Vector3(), drag: false, lx: 0, ly: 0 };
const _q = new Quaternion(), _v = new Vector3(), _e = new Euler(0, 0, 0, "YXZ");

export default function DevScene() {
  const { gl, clock, camera } = useThree();
  const { world } = useRapier();
  const region = useStore((s) => s.region);
  const colliders = useMemo(() => lines("#7FE0A0"), []);
  const spline = useMemo(() => lines("#E9C47E"), []);
  const trig = useMemo(() => lines("#8FCFEA"), []);

  // slow-mo: every useFrame (and the physics step, which follows the frame) sees a quarter of the time
  useEffect(() => {
    const raw = clock.getDelta.bind(clock);
    clock.getDelta = () => raw() * (live.dev.slow ? 0.25 : 1);
    return () => { clock.getDelta = raw; };
  }, [clock]);

  // free camera input: WASD fly, Q/E down/up, Shift fast, drag to look
  useEffect(() => {
    const el = gl.domElement;
    const kd = (e: KeyboardEvent) => { if (live.dev.freeCam) keys.add(e.code); };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    const pd = (e: PointerEvent) => { if (live.dev.freeCam) { fc.drag = true; fc.lx = e.clientX; fc.ly = e.clientY; } };
    const pm = (e: PointerEvent) => {
      if (!fc.drag) return;
      fc.yaw -= (e.clientX - fc.lx) * 0.004; fc.pitch = Math.max(-1.5, Math.min(1.5, fc.pitch - (e.clientY - fc.ly) * 0.004));
      fc.lx = e.clientX; fc.ly = e.clientY;
    };
    const pu = () => { fc.drag = false; };
    addEventListener("keydown", kd); addEventListener("keyup", ku);
    el.addEventListener("pointerdown", pd); addEventListener("pointermove", pm); addEventListener("pointerup", pu);
    return () => {
      removeEventListener("keydown", kd); removeEventListener("keyup", ku);
      el.removeEventListener("pointerdown", pd); removeEventListener("pointermove", pm); removeEventListener("pointerup", pu);
    };
  }, [gl]);

  // route spline + trigger rings, rebuilt per region (they follow the ground)
  useEffect(() => {
    const sp: number[] = [];
    if (region === "kettle") for (let i = 1; i < TRAIL.length; i++) sp.push(TRAIL[i - 1].x, TRAIL[i - 1].h + 0.4, TRAIL[i - 1].z, TRAIL[i].x, TRAIL[i].h + 0.4, TRAIL[i].z);
    else for (let i = 0; i < 400; i++) {
      const a = poseAt("valley", i / 400), b = poseAt("valley", (i + 1) / 400);
      sp.push(a.x, height(a.x, a.z) + 0.6, a.z, b.x, height(b.x, b.z) + 0.6, b.z);
    }
    spline.geometry.setAttribute("position", new Float32BufferAttribute(sp, 3));
    const tr: number[] = [];
    for (const t of triggers(region)) for (let k = 0; k < 48; k++) {
      const a = (k / 48) * Math.PI * 2, b = ((k + 1) / 48) * Math.PI * 2;
      const ax = t.x + Math.cos(a) * t.r, az = t.z + Math.sin(a) * t.r, bx = t.x + Math.cos(b) * t.r, bz = t.z + Math.sin(b) * t.r;
      tr.push(ax, height(ax, az) + 0.5, az, bx, height(bx, bz) + 0.5, bz);
    }
    trig.geometry.setAttribute("position", new Float32BufferAttribute(tr, 3));
  }, [region, spline, trig]);

  useFrame((state, dt) => {
    const d = live.dev, raw = dt / (d.slow ? 0.25 : 1);
    // stats: renderer.info still holds the previous frame
    const info = gl.info.render;
    d.stats.fps += (1 / Math.max(raw, 1e-4) - d.stats.fps) * 0.05;
    d.stats.ms += (raw * 1000 - d.stats.ms) * 0.05;
    d.stats.calls = info.calls; d.stats.tris = info.triangles;

    spline.visible = d.spline; trig.visible = d.triggers; colliders.visible = d.colliders;
    if (d.colliders) drawColliders(world, colliders, state.camera.position);

    if (d.look) {
      const [x, y, z] = d.look.from, [tx, ty, tz] = d.look.to;
      d.freeCam = fc.on = true; fc.pos.set(x, y, z);
      fc.yaw = Math.atan2(-(tx - x), -(tz - z)); fc.pitch = Math.atan2(ty - y, Math.hypot(tx - x, tz - z));
      d.look = null;
    }
    if (!d.freeCam) { fc.on = false; return; }
    if (!fc.on) {
      fc.on = true; fc.pos.copy(camera.position);
      _e.setFromQuaternion(camera.quaternion); fc.yaw = _e.y; fc.pitch = _e.x;
    }
    const k = (c: string) => keys.has(c), sp = (k("ShiftLeft") || k("ShiftRight") ? 45 : 12) * raw;
    _q.setFromEuler(_e.set(fc.pitch, fc.yaw, 0));
    const f = _v.set(0, 0, -1).applyQuaternion(_q);
    fc.pos.addScaledVector(f, ((k("KeyW") ? 1 : 0) - (k("KeyS") ? 1 : 0)) * sp);
    const rx = Math.cos(fc.yaw), rz = -Math.sin(fc.yaw), side = ((k("KeyD") ? 1 : 0) - (k("KeyA") ? 1 : 0)) * sp;
    fc.pos.x += rx * side; fc.pos.z += rz * side;
    fc.pos.y += ((k("KeyE") || k("Space") ? 1 : 0) - (k("KeyQ") ? 1 : 0)) * sp;
    camera.position.copy(fc.pos);
    camera.quaternion.copy(_q);
  }, -10);

  return (
    <>
      <primitive object={colliders} />
      <primitive object={spline} />
      <primitive object={trig} />
    </>
  );
}

/** Wireframes for every collider within 70 m of the camera, except the terrain heightfield. */
const _p = new Vector3(), _r = new Quaternion(), _a = new Vector3(), _b = new Vector3();
function drawColliders(world: ReturnType<typeof useRapier>["world"], out: LineSegments, cam: Vector3) {
  const v: number[] = [];
  const seg = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
    _a.set(ax, ay, az).applyQuaternion(_r).add(_p); _b.set(bx, by, bz).applyQuaternion(_r).add(_p);
    v.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z);
  };
  const ring = (r: number, y: number, axis: "x" | "y" | "z") => {
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * Math.PI * 2, b = ((k + 1) / 20) * Math.PI * 2, c0 = Math.cos(a) * r, s0 = Math.sin(a) * r, c1 = Math.cos(b) * r, s1 = Math.sin(b) * r;
      if (axis === "y") seg(c0, y, s0, c1, y, s1); else if (axis === "x") seg(y, c0, s0, y, c1, s1); else seg(c0, s0, y, c1, s1, y);
    }
  };
  world.forEachCollider((c) => {
    const t = c.translation();
    if (Math.hypot(t.x - cam.x, t.z - cam.z) > 70) return;
    const sh = c.shape as unknown as { halfExtents?: { x: number; y: number; z: number }; radius?: number; halfHeight?: number; type: number };
    _p.set(t.x, t.y, t.z); const r = c.rotation(); _r.set(r.x, r.y, r.z, r.w);
    if (sh.halfExtents) {
      const { x, y, z } = sh.halfExtents;
      for (const [sy, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) seg(-x, sy * y, sz * z, x, sy * y, sz * z);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) seg(sx * x, -y, sz * z, sx * x, y, sz * z);
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) seg(sx * x, sy * y, -z, sx * x, sy * y, z);
    } else if (sh.radius !== undefined && sh.halfHeight !== undefined) {
      ring(sh.radius, -sh.halfHeight, "y"); ring(sh.radius, sh.halfHeight, "y");
      for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) seg(sx * sh.radius, -sh.halfHeight, sz * sh.radius, sx * sh.radius, sh.halfHeight, sz * sh.radius);
    } else if (sh.radius !== undefined) {
      ring(sh.radius, 0, "x"); ring(sh.radius, 0, "y"); ring(sh.radius, 0, "z");
    }
  });
  out.geometry.setAttribute("position", new Float32BufferAttribute(v, 3));
}
