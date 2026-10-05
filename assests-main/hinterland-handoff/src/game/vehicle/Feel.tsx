// Ground feel (FEEL.md §2–3): what the wheels throw up. One particle pool for every ground vehicle:
// dust on the path, petals off the meadow, white spray in snow, brown flecks when the wheels spin in mud,
// droplets + mist + ripple rings in water. Surface comes from the active region (water, grip, route).
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, DoubleSide, Mesh, MeshBasicMaterial, Points, RingGeometry, ShaderMaterial } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { audio } from "../audio/audio";
import { clamp, distToSeg, hash } from "../../utils/noise";
import { ROUTE } from "../world/ground";
import { activeGround, height, waterLevel } from "../world/height";
import { dirt, stepDirt } from "./dirt";

const sfx = { t: 0 };
const N = 700, RINGS = 20, GROUND = new Set(["rover", "mule", "bus", "tortoise", "snowcat"]);
type Kind = 0 | 1 | 2 | 3 | 4 | 5; // dust, petal, snow, mud, droplet, mist
const PETALS = [[0.95, 0.94, 0.88], [0.96, 0.82, 0.32], [0.9, 0.55, 0.7], [0.66, 0.56, 0.86]];

export function Feel() {
  const { pts, rings, P } = useMemo(() => {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3)); g.setAttribute("color", new BufferAttribute(col, 3));
    g.setAttribute("aSize", new BufferAttribute(size, 1)); g.setAttribute("aAlpha", new BufferAttribute(alpha, 1));
    const mat = new ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */ `attribute float aSize, aAlpha; attribute vec3 color; varying float vA; varying vec3 vC;
        void main(){ vA = aAlpha; vC = color; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = aSize*420.0/max(1.0, -mv.z); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vC, vA*smoothstep(0.5, 0.15, d)); }`,
    });
    const pts = new Points(g, mat); pts.frustumCulled = false;
    const rm = new MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: DoubleSide, opacity: 0 });
    const rg = new RingGeometry(0.94, 1, 32); rg.rotateX(-Math.PI / 2);
    const rings = Array.from({ length: RINGS }, () => { const m = new Mesh(rg, rm.clone()); m.visible = false; m.frustumCulled = false; return m; });
    const P = { pos, col, size, alpha, vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), kind: new Uint8Array(N), s0: new Float32Array(N), s1: new Float32Array(N), a0: new Float32Array(N), next: 0, ringT: [0, 0, 0, 0], ringAge: new Float32Array(RINGS).fill(9), ringNext: 0 };
    return { pts, rings, P };
  }, []);

  const emit = (kind: Kind, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, s0: number, s1: number, a0: number, r: number, g: number, b: number) => {
    const i = P.next; P.next = (P.next + 1) % N;
    P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
    P.life[i] = P.max[i] = life; P.kind[i] = kind; P.s0[i] = s0; P.s1[i] = s1; P.a0[i] = a0; P.col[i * 3] = r; P.col[i * 3 + 1] = g; P.col[i * 3 + 2] = b;
  };
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  useEffect(() => {
    // dirt and roof snow are remembered (saved with the rest of the session extras)
    const d = useStore.getState().extra.dirt as typeof dirt | undefined;
    if (d) Object.assign(dirt, d);
    return () => { useStore.getState().extra.dirt = { ...dirt }; };
  }, []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), s = useStore.getState(), car = live.car, g = activeGround();
    if (GROUND.has(live.vehicle) && s.phase === "play") {
      const wet = waterLevel(car.x, car.z) - height(car.x, car.z) > 0.05, grip = g.grip ? g.grip(car.x, car.z) : 1;
      stepDirt(dt, car.air ? "air" : wet ? "water" : grip < 0.7 ? "meadow" : grip < 0.95 ? "snow" : g.id === "kettle" || distToSeg(car.x, car.z, ROUTE.ax, ROUTE.az, ROUTE.bx, ROUTE.bz) < 3.2 ? "path" : "meadow");
      s.extra.dirt = { ...dirt };
      // what the tyres sound like: splash, mud squelch, snow crunch, stones (the meadow is silent)
      sfx.t -= dt;
      if (sfx.t <= 0 && !car.air && Math.abs(car.speed) > 1.5) {
        const kind = wet ? "water" : grip < 0.7 ? "mud" : grip < 0.95 || g.id === "pass" ? "snow" : g.id === "kettle" || distToSeg(car.x, car.z, ROUTE.ax, ROUTE.az, ROUTE.bx, ROUTE.bz) < 3.2 ? "path" : null;
        if (kind) audio.surface(kind, Math.abs(car.speed));
        sfx.t = (kind === "water" ? 0.14 : 0.24) + Math.random() * 0.12 - Math.min(0.1, Math.abs(car.speed) * 0.008);
      }
    }
    const on = GROUND.has(live.vehicle) && s.phase === "play" && !car.air, sp = Math.abs(car.speed);
    const night = live.env.stars, lit = 0.4 + 0.6 * (1 - night);
    if (on && sp > 1.2) {
      const hx = -Math.sin(car.yaw), hz = -Math.cos(car.yaw), rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw);
      const spec = live.vehicle === "bus" ? [2.3, 0.95] : live.vehicle === "mule" ? [1.0, 0.8] : [1.35, 0.95];
      let wi = 0;
      for (const fz of [-1, 1]) for (const fx of [-1, 1]) {
        const wx = car.x + hx * fz * spec[0] + rx * fx * spec[1], wz = car.z + hz * fz * spec[0] + rz * fx * spec[1], gy = height(wx, wz);
        const wet = waterLevel(wx, wz) - gy > 0.05, grip = g.grip ? g.grip(wx, wz) : 1, vx = hx * car.speed, vz = hz * car.speed;
        const idx = wi++, k = dt * 60;
        if (wet) {
          // splash: droplets up and out carrying 35% of the vehicle's velocity, mist, and ripple rings
          const n = Math.min(10, sp * 0.9) * 0.22 * k;
          for (let j = 0; j < n; j++) if (Math.random() < Math.min(1, n)) {
            const a = Math.random() * 6.28, o = rnd(1.2, 3.6);
            emit(4, wx, waterLevel(wx, wz) + 0.1, wz, Math.cos(a) * o + vx * 0.35, rnd(2.2, 5), Math.sin(a) * o + vz * 0.35, rnd(0.7, 1.2), 0.1, 0.1, 0.85, 0.85, 0.93, 1);
          }
          if (Math.random() < 0.12 * k) emit(5, wx, waterLevel(wx, wz) + 0.2, wz, vx * 0.1, 0.5, vz * 0.1, 1.2, 0.5, 2.1, 0.25, 1, 1, 1);
          P.ringT[idx] -= dt;
          if (P.ringT[idx] <= 0) { P.ringT[idx] = 0.12; const r = P.ringNext; P.ringNext = (r + 1) % RINGS; P.ringAge[r] = 0; rings[r].position.set(wx, waterLevel(wx, wz) + 0.03, wz); }
        } else if (grip < 0.7) {
          if (live.spin > 0.2 && Math.random() < 0.5 * k) emit(3, wx, gy + 0.2, wz, -vx * 0.2 + rnd(-1.5, 1.5), rnd(1.5, 3.5), -vz * 0.2 + rnd(-1.5, 1.5), rnd(0.5, 0.9), 0.13, 0.1, 0.95, 0.29, 0.22, 0.15);
        } else if (grip < 0.95) {
          if (Math.random() < Math.min(1, sp / 8) * 0.5 * k) emit(2, wx, gy + 0.15, wz, -vx * 0.15 + rnd(-0.8, 0.8), rnd(1.2, 2.6), -vz * 0.15 + rnd(-0.8, 0.8), rnd(0.6, 1.0), 0.26, 0.5, 0.7, 0.96, 0.98, 1);
        } else {
          const path = g.id === "kettle" || distToSeg(wx, wz, ROUTE.ax, ROUTE.az, ROUTE.bx, ROUTE.bz) < 3.2;
          if (path && sp > 5.5 && Math.random() < Math.min(1, (sp - 5) / 10) * 0.45 * k) {
            const c = night > 0.5 ? [0.45, 0.47, 0.52] : [0.78, 0.7, 0.54];
            emit(0, wx, gy + 0.1, wz, -vx * 0.1 + rnd(-0.4, 0.4), rnd(0.5, 1.2), -vz * 0.1 + rnd(-0.4, 0.4), rnd(1.0, 1.5), 0.5, 1.6, 0.3 * lit, c[0], c[1], c[2]);
          } else if (!path && g.id === "valley" && sp > 2.5 && Math.random() < 0.12 * k && hash(Math.floor(wx), Math.floor(wz)) < 0.45) {
            const c = PETALS[Math.floor(Math.random() * 4)];
            emit(1, wx, gy + 0.3, wz, rnd(-0.6, 0.6), rnd(0.8, 2.0), rnd(-0.6, 0.6), rnd(1.2, 2.0), 0.12, 0.12, 0.9, c[0] * lit, c[1] * lit, c[2] * lit);
          }
        }
      }
    }
    // integrate
    const wl = (x: number, z: number) => waterLevel(x, z);
    for (let i = 0; i < N; i++) {
      if (P.life[i] <= 0) { P.alpha[i] = 0; continue; }
      P.life[i] -= dt;
      const u = 1 - clamp(P.life[i] / P.max[i], 0, 1), k = P.kind[i];
      if (k === 4 || k === 3) P.vel[i * 3 + 1] -= 9.8 * dt;
      else if (k === 1) { P.vel[i * 3] += Math.sin(live.clock * 4 + i) * dt * 1.5; P.vel[i * 3 + 1] += (0.6 - P.vel[i * 3 + 1]) * dt * 2 - 0.9 * dt; }
      else P.vel[i * 3 + 1] *= Math.exp(-1.2 * dt);
      P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt;
      // droplets stop on the surface
      if (k === 4 && P.pos[i * 3 + 1] < wl(P.pos[i * 3], P.pos[i * 3 + 2]) + 0.02 && P.vel[i * 3 + 1] < 0) P.life[i] = 0;
      P.size[i] = P.s0[i] + (P.s1[i] - P.s0[i]) * u;
      P.alpha[i] = P.a0[i] * (k === 1 || k === 4 ? 1 - u * u : 1 - u) * (u < 0.1 ? u * 10 : 1);
    }
    pts.geometry.attributes.position.needsUpdate = pts.geometry.attributes.aSize.needsUpdate = pts.geometry.attributes.aAlpha.needsUpdate = pts.geometry.attributes.color.needsUpdate = true;
    // ripple rings grow to 2.7 m over 0.7 s, fading from 50%
    for (let r = 0; r < RINGS; r++) {
      P.ringAge[r] += dt;
      const m = rings[r], a = P.ringAge[r], v = a < 0.7;
      m.visible = v;
      if (v) { const q = a / 0.7; m.scale.setScalar(0.3 + 2.4 * q); (m.material as MeshBasicMaterial).opacity = 0.32 * (1 - q); }
    }
  }, 5);

  return (
    <>
      <primitive object={pts} />
      {rings.map((m, i) => <primitive key={i} object={m} />)}
    </>
  );
}
