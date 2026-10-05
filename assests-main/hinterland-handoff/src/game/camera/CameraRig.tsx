// One camera, four behaviours: slow menu orbit, intro/outro glide, chase while driving, drag to look.
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { LENSES } from "../photo";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { angleLerp, clamp, damp, easeInOutCubic } from "../../utils/noise";
import { height } from "../world/height";
import { treesNear } from "../world/props";

const smoothstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Speech above someone's head: project their position to the screen and move the DOM label there. */
const _p = new Vector3();
function placeLabel(camera: PerspectiveCamera) {
  const el = document.getElementById("label"), l = useStore.getState().label;
  if (!el || !l) return;
  _p.set(l.x, l.y, l.z).project(camera);
  const behind = _p.z > 1;
  el.style.transform = `translate(${((_p.x + 1) / 2) * innerWidth}px, ${((1 - _p.y) / 2) * innerHeight}px) translate(-50%, -100%)`;
  el.style.visibility = behind ? "hidden" : "";
}

/** Camera shake on landings and hits. Off when camera motion is Calm. */
export function addShake(v: number) {
  if (useStore.getState().settings.motion === "full") live.shake = Math.min(1, live.shake + v);
}

const camPos = new Vector3(), camLook = new Vector3(), smPos = new Vector3(), smLook = new Vector3();
const _a = new Vector3(), _b = new Vector3(), _c = new Vector3(), _d = new Vector3(), _m = new Vector3(), _n = new Vector3();

function menuPose(outP: Vector3, outL: Vector3, calm: boolean) {
  const car = live.car, clock = live.clock;
  const a = car.yaw + 0.55 + (calm ? 0.08 : 0.26) * Math.sin(clock * 0.045);
  const R = 12.5 + Math.sin(clock * 0.03) * 1.2;
  outP.set(car.x + Math.sin(a) * R, 0, car.z + Math.cos(a) * R);
  outP.y = Math.max(car.y + 2.6 + Math.sin(clock * 0.06) * 0.5, height(outP.x, outP.z) + 1.6);
  const fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw), rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
  outL.set(car.x + fx * 7 - rx * 4.5, car.y + 3.2, car.z + fz * 7 - rz * 4.5);
}

/** Fraction (0..1] of the way from the rover to the camera that terrain and trees leave clear. */
function clearance(px: number, py: number, pz: number) {
  const car = live.car, ox = car.x, oy = car.y + 1.6, oz = car.z;
  const trees = treesNear((ox + px) / 2, (oz + pz) / 2);
  for (let i = 1; i <= 10; i++) {
    const t = i / 10, x = ox + (px - ox) * t, y = oy + (py - oy) * t, z = oz + (pz - oz) * t;
    let blocked = y < height(x, z) + 0.5;
    // pines: a cone of foliage over a trunk (lathe profile is 2.5 wide at the base, 7.8 tall)
    for (let k = 0; k < trees.length && !blocked; k++) {
      const tr = trees[k], h = (y - tr.y) / (7.8 * tr.s);
      if (h < 0 || h > 1) continue;
      blocked = Math.hypot(x - tr.x, z - tr.z) < tr.s * (h < 0.14 ? 0.5 : 2.3 * (1 - h) + 0.3);
    }
    if (blocked) return Math.max(0.3, (i - 1) / 10);
  }
  return 1;
}

let reach = 1;
function chasePose(outP: Vector3, outL: Vector3, yaw: number, dt = 0) {
  const car = live.car, sp = Math.abs(car.speed);
  const dist = live.cam.dist + sp * 0.11, hgt = live.cam.height + sp * 0.025;
  outP.set(car.x + Math.sin(yaw) * dist, car.y + hgt, car.z + Math.cos(yaw) * dist);
  const th = height(outP.x, outP.z) + 1.7;
  if (outP.y < th) outP.y = th;
  // never look through a hillside: pull in quickly when blocked, ease back out slowly
  if (dt > 0) {
    const want = clearance(outP.x, outP.y, outP.z);
    reach += (want - reach) * damp(want < reach ? 8 : 1.5, dt);
    outP.set(car.x + (outP.x - car.x) * reach, car.y + (outP.y - car.y) * reach, car.z + (outP.z - car.z) * reach);
    const th2 = height(outP.x, outP.z) + 1.2;
    if (outP.y < th2) outP.y = th2;
  }
  outL.set(car.x - Math.sin(yaw) * 3, car.y + 1.4, car.z - Math.cos(yaw) * 3);
}

export function CameraRig() {
  const gl = useThree((s) => s.gl);
  const look = useRef({ drag: false, lx: 0, orbit: 0, idle: 0, id: -1 }).current;
  const camYaw = useRef(live.car.yaw);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (useStore.getState().phase !== "play" || e.pointerType === "touch") return;
      look.drag = true; look.lx = e.clientX; look.id = e.pointerId;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!look.drag || e.pointerId !== look.id) return;
      look.orbit -= (e.clientX - look.lx) * 0.006 * (useStore.getState().settings.camSens / 100);
      look.lx = e.clientX;
      look.idle = 0;
    };
    const end = () => { look.drag = false; };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
    };
  }, [gl, look]);

  useFrame(({ camera }, dt) => {
    const s = useStore.getState(), phase = s.phase, calm = s.settings.motion === "calm", car = live.car;

    if (phase === "play" || phase === "paused" || phase === "ending") {
      if (!look.drag) { look.idle += dt; if (look.idle > 1.6) look.orbit *= Math.exp(-1.6 * dt); }
      if (Math.abs(car.speed) > 0.5 || car.air) camYaw.current = angleLerp(camYaw.current, car.yaw, damp(live.cam.yawK, dt));
      if (s.photo) {
        // photo mode: free orbit + dolly around the vehicle, never under the ground
        const o = live.photo;
        camPos.set(car.x + Math.sin(o.yaw) * Math.cos(o.pitch) * o.dist, car.y + 1.2 + Math.sin(o.pitch) * o.dist, car.z + Math.cos(o.yaw) * Math.cos(o.pitch) * o.dist);
        camPos.y = Math.max(camPos.y, height(camPos.x, camPos.z) + 0.8);
        camLook.set(car.x, car.y + 1.2, car.z);
        smPos.lerp(camPos, damp(10, dt));
        smLook.lerp(camLook, damp(12, dt));
      } else if (live.sit) {
        // sitting at a fire: a slow orbit, the fire in the middle of the frame
        const a = live.clock * 0.07, sit = live.sit;
        camPos.set(sit.x + Math.cos(a) * 7.5, 0, sit.z + Math.sin(a) * 7.5);
        camPos.y = Math.max(sit.y + 3, height(camPos.x, camPos.z) + 1.4);
        camLook.set(sit.x, sit.y + 0.9, sit.z);
        smPos.lerp(camPos, damp(1.2, dt));
        smLook.lerp(camLook, damp(1.6, dt));
      } else {
        chasePose(camPos, camLook, camYaw.current + look.orbit, dt);
        const m = live.moment;
        if (m) {
          // a short look toward something worth seeing; the player keeps driving
          m.t += dt;
          const u = m.t / m.dur, k = smoothstep(0, 0.28, u) * (1 - smoothstep(0.72, 1, u)) * 0.9;
          _m.subVectors(camLook, camPos).normalize();
          _n.set(m.x, m.y, m.z).sub(camPos).normalize();
          camLook.copy(camPos).addScaledVector(_m.lerp(_n, k).normalize(), 20);
        }
        smPos.lerp(camPos, damp(live.cam.posK, dt));
        smLook.lerp(camLook, damp(m ? 3 : 7, dt));
      }
    } else if (phase === "intro" || phase === "outro") {
      const tr = live.trans;
      tr.t += dt / tr.dur;
      const e = easeInOutCubic(clamp(tr.t, 0, 1));
      camYaw.current = car.yaw;
      look.orbit = 0;
      menuPose(_a, _b, calm);
      chasePose(_c, _d, car.yaw);
      if (phase === "intro") { smPos.copy(_a).lerp(_c, e); smLook.copy(_b).lerp(_d, e); }
      else { smPos.copy(_c).lerp(_a, e); smLook.copy(_d).lerp(_b, e); }
      if (tr.t >= 1) { if (phase === "intro") s.handoff(); else s.toMenu(); }
    } else {
      menuPose(camPos, camLook, calm);
      if (phase === "loading" || s.veil) { smPos.copy(camPos); smLook.copy(camLook); }
      smPos.lerp(camPos, damp(3, dt));
      smLook.lerp(camLook, damp(3, dt));
    }

    camera.position.copy(smPos);
    if (live.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * live.shake * 0.35;
      camera.position.y += (Math.random() - 0.5) * live.shake * 0.35;
      live.shake *= Math.exp(-6 * dt);
      if (live.shake < 0.01) live.shake = 0;
    }
    camera.lookAt(smLook);
    placeLabel(camera as PerspectiveCamera);
    const cam = camera as PerspectiveCamera;
    const targetFov = s.photo ? LENSES[live.photo.lens][1] : phase === "play" && !calm ? 55 + Math.min(1, Math.abs(car.speed) / 21) * 7 : 55;
    if (Math.abs(cam.fov - targetFov) > 0.01) {
      cam.fov += (targetFov - cam.fov) * damp(3, dt);
      cam.updateProjectionMatrix();
    }
  }, -20);

  return null;
}
