// Sky hazards (JOURNEYS §1.10, screens → Birds ahead / Thunderstorm): murmuration flocks you steer
// through (a hit is a bump + scatter, never a fail) and a storm cell (dark cloud, rain, turbulence,
// lightning + late thunder). Writes live.flight.storm / bump / hit / flash / warn for the flier and HUD.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, MeshBasicMaterial, Object3D, PointLight, Points, PointsMaterial } from "three";
import { audio } from "../audio/audio";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp, hash } from "../../utils/noise";
import { addShake } from "../camera/CameraRig";
import { CloudSet, makeCloudSet } from "../environment/CozyClouds";
import { SKY, type Flock, type Storm } from "../vehicle/flight";
import { height } from "./height";

const HIT = 3;

function flockModel(f: Flock, seed: number) {
  const wing = new BufferGeometry();
  wing.setAttribute("position", new Float32BufferAttribute([0, 0, -0.25, 0, 0, 0.3, 1.1, 0, 0], 3));
  const mat = new MeshBasicMaterial({ color: 0x2b2a2e, side: DoubleSide, fog: false });
  const L = new InstancedMesh(wing, mat, f.n), R = new InstancedMesh(wing, mat, f.n);
  L.frustumCulled = R.frustumCulled = false;
  const b = Array.from({ length: f.n }, (_, i) => ({
    ph: hash(i, seed) * 6.28, rad: f.r * (0.3 + hash(i, seed + 1) * 1.1), h: (hash(i, seed + 2) - 0.5) * 16, sp: 0.35 + hash(i, seed + 3) * 0.25,
    sx: 0, sy: 0, sz: 0, x: 0, y: 0, z: 0,
  }));
  return { f, L, R, b };
}

function stormModel(s: Storm) {
  const g = new Group();
  const N = 1400, p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = hash(i, 21) * 6.28, r = Math.sqrt(hash(i, 22)) * s.r; p[i * 3] = s.x + Math.cos(a) * r; p[i * 3 + 1] = hash(i, 23); p[i * 3 + 2] = s.z + Math.sin(a) * r; }
  const rg = new BufferGeometry(); rg.setAttribute("position", new Float32BufferAttribute(p, 3));
  const rain = new Points(rg, new PointsMaterial({ color: 0xcfdcea, size: 0.5, transparent: true, opacity: 0.55, depthWrite: false }));
  rain.frustumCulled = false;
  const bolt = new PointLight(0xdfe8ff, 0, 600, 1.5); bolt.position.set(s.x, s.y1 - 10, s.z);
  g.add(rain, bolt);
  return { s, g, rain, bolt, p, next: 4, flash: 0 };
}

export function SkyHazards() {
  const region = useStore((s) => s.region);
  const map = SKY[region];
  const flocks = useMemo(() => map.flocks.map((f, i) => flockModel(f, 40 + i * 7)), [map]);
  const storms = useMemo(() => map.storms.map(stormModel), [map]);
  // storm towers, and a cumulus capping every thermal (pilots read it: the cloud marks the lift)
  const clouds = useMemo(() => {
    const c = makeCloudSet();
    map.thermals.forEach((t, i) => c.cumulus(t.x, t.top + 4, t.z, 24, 70 + i));
    return c;
  }, [map]);
  // the storm tower only stands while you fly (it loomed over the start meadow and the title screen)
  const towers = useMemo(() => {
    const c = makeCloudSet();
    map.storms.forEach((st, i) => c.cumulonimbus(st.x, st.y0, st.z, st.r * 0.7, 90 + i));
    return c;
  }, [map]);
  const d = useMemo(() => new Object3D(), []), wd = useMemo(() => new Object3D(), []);
  useMemo(() => { d.add(wd); }, [d, wd]);
  const st = useMemo(() => ({ hitT: 0, warned: false, thunderAt: [] as number[] }), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05), clock = live.clock, fl = live.flight, car = live.car, flying = fl.on;
    // flocks: each bird circles the flock centre; a hit pushes the nearest birds outward, then they drift back
    let hit = false;
    for (const k of flocks) {
      const { f, L, R, b } = k;
      for (let i = 0; i < b.length; i++) {
        const u = b[i], a = clock * u.sp * 0.5 + u.ph, wob = Math.sin(clock * 0.3 + i * 0.01) * 4;
        u.x = f.x + Math.cos(a) * (u.rad + wob) + u.sx; u.y = f.y + u.h + Math.sin(a * 2.3) * 2 + u.sy; u.z = f.z + Math.sin(a) * (u.rad + wob) + u.sz;
        if (flying && !hit && (u.x - car.x) ** 2 + (u.y - car.y) ** 2 + (u.z - car.z) ** 2 < HIT * HIT) {
          hit = true;
          for (const o of b) { const dx = o.x - car.x, dy = o.y - car.y, dz = o.z - car.z, q = Math.hypot(dx, dy, dz); if (q < 14) { const n = (14 - q) * 0.9 / Math.max(q, 0.5); o.sx += dx * n; o.sy += dy * n; o.sz += dz * n; } }
        }
        const rel = Math.exp(-0.5 * dt); u.sx *= rel; u.sy *= rel; u.sz *= rel;
        d.position.set(u.x, u.y, u.z); d.rotation.set(0, -a, 0); d.scale.setScalar(1.6);
        const flap = Math.sin(clock * 9 + u.ph * 5) * 0.55;
        wd.rotation.set(0, 0, flap); d.updateMatrixWorld(true);
        L.setMatrixAt(i, d.matrixWorld);
        wd.rotation.set(0, 0, -flap); wd.scale.set(-1, 1, 1); d.updateMatrixWorld(true); wd.scale.set(1, 1, 1);
        R.setMatrixAt(i, wd.matrixWorld);
      }
      L.instanceMatrix.needsUpdate = R.instanceMatrix.needsUpdate = true;
    }
    if (hit && st.hitT <= 0) { st.hitT = 1.4; fl.hit = 1; fl.slow = 1; addShake(0.5); }
    st.hitT -= dt; fl.hit = Math.max(0, fl.hit - dt / 0.4);

    // storm: how deep inside the cell the flier is (0..1), rain falling inside, lightning + late thunder
    let storm = 0, near = 1e9;
    for (const m of storms) {
      const { s, rain, bolt, p } = m;
      const dist = Math.hypot(car.x - s.x, car.z - s.z), inY = clamp((car.y - (s.y0 - 25)) / 25, 0, 1) * clamp((s.y1 + 10 - car.y) / 25, 0, 1);
      if (flying) { storm = Math.max(storm, clamp((s.r - dist) / (s.r * 0.25), 0, 1) * inY); near = Math.min(near, dist - s.r); }
      // the cell's rain only falls while you are flying (it was square specks drifting over the title screen and the first level)
      rain.visible = flying;
      if (!flying) continue;
      const a = rain.geometry.attributes.position, top = s.y0 + 20;
      for (let i = 0; i < p.length / 3; i++) {
        const gy = height(p[i * 3], p[i * 3 + 2]);
        let y = a.getY(i) - 38 * dt; if (y < gy || y > top) y = top - hash(i, Math.floor(clock * 7)) * 6;
        a.setY(i, y);
      }
      a.needsUpdate = true;
      m.flash = Math.max(0, m.flash - dt / 0.12); bolt.intensity = m.flash * 6000;
      m.next -= dt;
      if (m.next <= 0) {
        m.next = 3 + Math.random() * 5;
        if (flying && dist < s.r * 2.5) { m.flash = 1; st.thunderAt.push(clock + 1 + Math.random() * 2); bolt.position.x = s.x + (Math.random() - 0.5) * s.r; }
      }
      fl.flash = m.flash;
    }
    if (!storms.length) fl.flash = 0;
    while (st.thunderAt.length && st.thunderAt[0] <= clock) { st.thunderAt.shift(); audio.thunder(); }
    fl.storm += (storm - fl.storm) * Math.min(1, dt * 2.5);
    // turbulence (skyroad.js): a rolling heave plus noise, scaled by how deep in the cell
    fl.turb = fl.storm * (Math.sin(clock * 3.1) * Math.sin(clock * 1.7 + 2) * 6 + (Math.random() - 0.5) * 4);
    // "Weather coming in" once per approach (re-armed after you are well clear)
    if (flying && near < 220 && !st.warned) { st.warned = true; fl.warn = 5; }
    if (near > 420) st.warned = false;
    fl.warn = Math.max(0, fl.warn - dt);
  }, -39);

  return (
    <>
      {flocks.map((k, i) => <group key={`f${i}`}><primitive object={k.L} /><primitive object={k.R} /></group>)}
      {storms.map((m, i) => <primitive key={`s${i}`} object={m.g} />)}
      <CloudSet set={clouds} />
      {towers.count() > 0 && <CloudSet set={towers} flash={() => live.flight.flash} show={() => live.flight.on} />}
    </>
  );
}
