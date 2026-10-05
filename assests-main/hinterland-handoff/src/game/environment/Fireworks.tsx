// Fireworks (SKY_SOUND §3, kit/fireworks.js): rockets with spark tails, 8 shell types (peony, chrysanthemum,
// willow, ring, palm, crackle, strobe, crossette), glittering trails, colour-changing stars, strobe + crackle,
// lingering smoke lit by the bursts, a flash light, and sound delayed by distance. C launches a small volley anywhere.
// Villages with a festival call live.fireworks.show(origin, spread, height, on) at night.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, PointLight, Points, ShaderMaterial, Vector3, type Camera } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { audio } from "../audio/audio";

const MAX = 12000, SMAX = 500, LIGHT = 90;
const PAL: Record<string, Color> = Object.fromEntries(Object.entries({ red: "#FF3B2F", green: "#5CFF6A", blue: "#4F86FF", gold: "#FFB547", white: "#FFF6E6", purple: "#C06BFF", pink: "#FF7FC8", teal: "#4FFFE0", orange: "#FF8A2E", silver: "#E8F0FF" }).map(([k, v]) => [k, new Color(v)]));
const TYPES = ["peony", "chrys", "willow", "ring", "palm", "crackle", "strobe", "crossette", "peony", "chrys", "willow"] as const;
const PALS = [["red", "gold"], ["blue", "silver"], ["green", "gold"], ["purple", "pink"], ["gold", "gold"], ["teal", "white"], ["pink", "white"], ["orange", "red"], ["white", "blue"]];
export type ShellType = (typeof TYPES)[number];

interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; r: number; g: number; b: number; s: number; drag: number; grav: number; trail: number; tt: number; tc: Color | null; strobe: number; crackle: number; split: number; c2: Color | null; flick: number }
interface Rocket { x: number; y: number; z: number; vx: number; vy: number; vz: number; fuse: number; type: ShellType; pal: string[] }
interface Smoke { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; c: Color; s0: number; s1: number; glow: number }
export interface FireworksApi { launch(pos: { x: number; y: number; z: number }, height: number, type?: ShellType): void; volley(pos: { x: number; y: number; z: number }, n?: number): void; show(origin: { x: number; y: number; z: number } | null, spread?: number, height?: number): void }

const VERT = "attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; uniform float uScale; void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = max(1.5, aSize*uScale/max(1.0, -mv.z)); gl_Position = projectionMatrix*mv; }";

function buildSystem(scene: { add(...o: unknown[]): void }, S = 1) {
  const mk = (n: number) => { const g = new BufferGeometry(), P = new Float32Array(n * 3), C = new Float32Array(n * 3), Z = new Float32Array(n), A = new Float32Array(n); g.setAttribute("position", new BufferAttribute(P, 3)); g.setAttribute("color", new BufferAttribute(C, 3)); g.setAttribute("aSize", new BufferAttribute(Z, 1)); g.setAttribute("aAlpha", new BufferAttribute(A, 1)); return { g, P, C, Z, A }; };
  const sp = mk(MAX), sm = mk(SMAX);
  const mat = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, vertexColors: true, fog: false, uniforms: { uScale: { value: 420 } }, vertexShader: VERT,
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard; float core = exp(-d*d*60.0), halo = exp(-d*d*9.0); gl_FragColor = vec4(vC*(halo*0.55 + core*1.6)*vA, 1.0); }" });
  const smat = new ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, uniforms: { uScale: { value: 420 } }, vertexShader: VERT,
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, vA*smoothstep(0.5, 0.1, d)); }" });
  const pts = new Points(sp.g, mat), smoke = new Points(sm.g, smat); pts.frustumCulled = smoke.frustumCulled = false; pts.renderOrder = 5; smoke.renderOrder = 4;
  const lights = [0, 1, 2].map(() => { const l = new PointLight(0xffffff, 0, 380 * S, 1.6); l.userData.k = 9; return l; });
  scene.add(pts, smoke, ...lights);
  let li = 0, pn = 0, sn = 0;
  const p: Spark[] = Array.from({ length: MAX }, () => ({ life: 0 } as Spark)), smk: Smoke[] = Array.from({ length: SMAX }, () => ({ life: 0 } as Smoke)), rockets: Rocket[] = [];
  const R = Math.random;
  const spark = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, c: Color, size: number, drag: number, grav: number, f: Partial<Spark> = {}) => {
    const q = p[pn]; pn = (pn + 1) % MAX;
    Object.assign(q, { x, y, z, vx, vy, vz, life, max: life, r: c.r, g: c.g, b: c.b, s: size, drag, grav, trail: f.trail || 0, tt: 0, tc: f.tc || null, strobe: f.strobe || 0, crackle: f.crackle || 0, split: f.split || 0, c2: f.c2 || null, flick: f.flick ?? 0.25 });
  };
  const puffSmoke = (x: number, y: number, z: number, c: Color, n: number, spread: number) => {
    for (let i = 0; i < n; i++) { const q = smk[sn]; sn = (sn + 1) % SMAX; Object.assign(q, { x: x + (R() - 0.5) * spread, y: y + (R() - 0.5) * spread, z: z + (R() - 0.5) * spread, vx: (R() - 0.5) * 1.2 * S, vy: (0.2 + R() * 0.6) * S, vz: (R() - 0.5) * 1.2 * S, life: 5 + R() * 4, c: c.clone(), s0: 5 * S, s1: 16 * S, glow: 1 }); q.max = q.life; }
  };
  const burst = (x: number, y: number, z: number, type: ShellType, pal: string[], cam: Camera) => {
    const c1 = PAL[pal[0]], c2 = PAL[pal[1]], gold = PAL.gold, white = PAL.white, speed = S * (type === "willow" ? 8.5 : type === "palm" ? 15 : 13 + R() * 3);
    const axis = new Vector3(R() - 0.5, 1, R() - 0.5).normalize(), ring = new Vector3().crossVectors(axis, new Vector3(1, 0, 0)).normalize(), ring2 = new Vector3().crossVectors(axis, ring);
    const N = type === "palm" ? 9 : type === "crossette" ? 16 : type === "ring" ? 90 : type === "willow" ? 110 : 150;
    for (let i = 0; i < N; i++) {
      let vx: number, vy: number, vz: number;
      if (type === "ring") { const a = (i / N) * 6.283; vx = (ring.x * Math.cos(a) + ring2.x * Math.sin(a)) * speed; vy = (ring.y * Math.cos(a) + ring2.y * Math.sin(a)) * speed; vz = (ring.z * Math.cos(a) + ring2.z * Math.sin(a)) * speed; }
      else { const u = R() * 2 - 1, a = R() * 6.283, r = Math.sqrt(1 - u * u), k = speed * (type === "palm" ? 1 : 0.82 + R() * 0.18); vx = r * Math.cos(a) * k; vy = u * k + (type === "palm" ? 3 * S : 0); vz = r * Math.sin(a) * k; }
      const cc = type === "crackle" || type === "willow" ? gold : i % 4 === 0 ? c2 : c1;
      if (type === "peony") spark(x, y, z, vx, vy, vz, 1.6 + R() * 0.6, cc, 2.4 * S, 1.6, 4.5 * S, { c2: R() < 0.5 ? c2 : null, flick: 0.35 });
      else if (type === "chrys") spark(x, y, z, vx, vy, vz, 1.8 + R() * 0.5, cc, 2.2 * S, 1.5, 4.5 * S, { trail: 0.03, tc: gold });
      else if (type === "willow") spark(x, y, z, vx, vy, vz, 3.8 + R() * 0.9, cc, 2.0 * S, 2.4, 2.4 * S, { trail: 0.022, tc: gold, flick: 0.15 });
      else if (type === "ring") spark(x, y, z, vx, vy, vz, 1.7, cc, 2.4 * S, 1.4, 3.5 * S, { c2 });
      else if (type === "palm") spark(x, y, z, vx, vy, vz, 2.4, gold, 3.6 * S, 1.1, 5 * S, { trail: 0.012, tc: white });
      else if (type === "crackle") spark(x, y, z, vx, vy, vz, 1.4 + R() * 0.5, cc, 2.0 * S, 1.7, 4 * S, { crackle: 1, trail: 0.05, tc: gold });
      else if (type === "strobe") spark(x, y, z, vx, vy, vz, 2.4 + R() * 0.6, white, 2.3 * S, 1.6, 3.5 * S, { strobe: 1 });
      else spark(x, y, z, vx * 0.8, vy * 0.8, vz * 0.8, 0.75, cc, 2.8 * S, 1.0, 4 * S, { split: 1, trail: 0.02, tc: cc });
    }
    for (let i = 0; i < 26; i++) spark(x, y, z, (R() - 0.5) * 4 * S, (R() - 0.5) * 4 * S, (R() - 0.5) * 4 * S, 0.18, white, 7 * S, 3, 0);
    const L = lights[li++ % 3]; L.position.set(x, y, z); L.color.copy(c1).lerp(white, 0.3); L.intensity = 9 * LIGHT;
    puffSmoke(x, y, z, c1.clone().multiplyScalar(0.5), 5, 10 * S);
    const d = cam.position.distanceTo(new Vector3(x, y, z));
    audio.boom(d / 343, type === "willow" ? 0.7 : 1); if (type === "crackle") audio.crackle(d / 343 + 1.3, 30);
  };
  let showT = 2, finaleT = 40, finaleN = 0, origin: { x: number; y: number; z: number } | null = null, spread = 30, height = 90;
  const jitter = () => ({ x: origin!.x + (R() - 0.5) * spread, y: origin!.y, z: origin!.z + (R() - 0.5) * spread });
  const launch: FireworksApi["launch"] = (pos, h, type) => {
    const hh = h * (0.8 + R() * 0.35), g0 = 9.8 * S, v = Math.sqrt(2 * g0 * hh);
    rockets.push({ x: pos.x + (R() - 0.5) * 2, y: pos.y, z: pos.z + (R() - 0.5) * 2, vx: (R() - 0.5) * 2 * S, vy: v, vz: (R() - 0.5) * 2 * S, fuse: (v / g0) * 0.96, type: type || TYPES[Math.floor(R() * TYPES.length)], pal: PALS[Math.floor(R() * PALS.length)] });
    audio.launch(0.1);
  };
  const update = (dt: number, cam: Camera, on: boolean) => {
    if (on && origin) {
      showT -= dt; finaleT -= dt;
      if (finaleT <= 0 && finaleN === 0) finaleN = 12;
      if (finaleN > 0 && showT <= 0) { finaleN--; showT = 0.22; launch(jitter(), height); if (finaleN === 0) finaleT = 45 + R() * 20; }
      else if (showT <= 0) { showT = 0.9 + R() * 2.2; launch(jitter(), height); if (R() < 0.3) { const t = TYPES[Math.floor(R() * TYPES.length)]; setTimeout(() => launch(jitter(), height, t), 150); } }
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.fuse -= dt; r.vy -= 9.8 * S * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      spark(r.x, r.y, r.z, (R() - 0.5) * S, -2 * S - R() * 2 * S, (R() - 0.5) * S, 0.45 + R() * 0.3, PAL.gold, 1.4 * S, 2, 3 * S, { flick: 0.6 });
      if (R() < 0.25) puffSmoke(r.x, r.y, r.z, new Color(0.25, 0.23, 0.22), 1, 1);
      if (r.fuse <= 0) { burst(r.x, r.y, r.z, r.type, r.pal, cam); rockets.splice(i, 1); }
    }
    for (let i = 0; i < MAX; i++) {
      const q = p[i]; if (!(q.life > 0)) { sp.A[i] = 0; continue; }
      q.life -= dt; const t = 1 - q.life / q.max, dr = Math.exp(-q.drag * dt);
      q.vx *= dr; q.vy = q.vy * dr - q.grav * dt; q.vz *= dr; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.trail) { q.tt -= dt; if (q.tt <= 0) { q.tt = q.trail; spark(q.x, q.y, q.z, q.vx * 0.05, q.vy * 0.05 - 0.5 * S, q.vz * 0.05, 0.5 + (q.trail < 0.025 ? 0.9 : 0.2), q.tc || new Color(q.r, q.g, q.b), q.s * 0.55, 2.5, 1.2 * S, { flick: 0.5 }); } }
      if (q.split && t > 0.98) { q.split = 0; const c = new Color(q.r, q.g, q.b); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) spark(q.x, q.y, q.z, a * 6 * S + q.vx * 0.3, 2 * S, b * 6 * S + q.vz * 0.3, 1.1, c, 2 * S, 1.6, 4 * S, { trail: 0.03, tc: PAL.gold }); }
      if (q.crackle && q.life < dt * 1.5) for (let k = 0; k < 5; k++) spark(q.x, q.y, q.z, (R() - 0.5) * 5 * S, (R() - 0.5) * 5 * S, (R() - 0.5) * 5 * S, 0.07 + R() * 0.06, PAL.white, 3 * S, 4, 0);
      let br = Math.min(1, (1 - t) * 2.4) * (1 - q.flick + q.flick * R());
      if (q.strobe) br *= Math.sin(q.life * 38 + i) > 0.2 ? 1 : 0.05;
      let r = q.r, g = q.g, b = q.b; if (q.c2 && t > 0.5) { const k = Math.min(1, (t - 0.5) * 3); r += (q.c2.r - r) * k; g += (q.c2.g - g) * k; b += (q.c2.b - b) * k; }
      sp.P[i * 3] = q.x; sp.P[i * 3 + 1] = q.y; sp.P[i * 3 + 2] = q.z; sp.C[i * 3] = r; sp.C[i * 3 + 1] = g; sp.C[i * 3 + 2] = b; sp.Z[i] = q.s * (1 - t * 0.5); sp.A[i] = br;
    }
    for (let i = 0; i < SMAX; i++) {
      const q = smk[i]; if (!(q.life > 0)) { sm.A[i] = 0; continue; }
      q.life -= dt; const t = 1 - q.life / q.max; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.glow *= Math.exp(-2.5 * dt);
      sm.P[i * 3] = q.x; sm.P[i * 3 + 1] = q.y; sm.P[i * 3 + 2] = q.z; const base = 0.12 + q.glow * 0.5;
      sm.C[i * 3] = base + q.c.r * q.glow; sm.C[i * 3 + 1] = base + q.c.g * q.glow; sm.C[i * 3 + 2] = base * 1.1 + q.c.b * q.glow; sm.Z[i] = q.s0 + (q.s1 - q.s0) * t; sm.A[i] = 0.28 * Math.min(1, (1 - t) * 1.6) * Math.min(1, t * 8);
    }
    for (const l of lights) l.intensity = Math.max(0, l.intensity - dt * l.userData.k * LIGHT * 4);
    for (const s of [sp, sm]) for (const a of ["position", "color", "aSize", "aAlpha"]) (s.g.attributes[a] as BufferAttribute).needsUpdate = true;
  };
  const api: FireworksApi = {
    launch,
    volley(pos, n = 5) { for (let i = 0; i < n; i++) setTimeout(() => launch({ x: pos.x + (R() - 0.5) * 12, y: pos.y, z: pos.z + (R() - 0.5) * 12 }, 70 + R() * 30), i * 260); },
    show(o, sprd = 30, h = 90) { origin = o; spread = sprd; height = h; },
  };
  return { update, api, dispose() { sp.g.dispose(); sm.g.dispose(); mat.dispose(); smat.dispose(); } };
}

export function Fireworks() {
  const scene = useThree((s) => s.scene);
  const fw = useMemo(() => buildSystem(scene), [scene]);
  useEffect(() => {
    live.fireworks = fw.api;
    const key = (e: KeyboardEvent) => {
      const s = useStore.getState();
      if (e.code === "KeyC" && !e.repeat && s.phase === "play" && !s.photo) {
        // a small volley a good way ahead of you
        const c = live.car, a = c.yaw, d = 90;
        fw.api.volley({ x: c.x - Math.sin(a) * d, y: Math.max(c.y, 0) , z: c.z - Math.cos(a) * d }, 5);
      }
    };
    addEventListener("keydown", key);
    return () => { removeEventListener("keydown", key); live.fireworks = null; fw.dispose(); };
  }, [fw]);
  useFrame(({ camera }, dt) => fw.update(Math.min(dt, 0.05), camera, true));
  return null;
}
