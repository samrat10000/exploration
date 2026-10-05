// Seeds and the garden (WEATHER.md §3), valley sandbox: glowing seed pods beside the route. Drive within
// 3.2 m to collect one into the pouch (bottom-left dots). Stop anywhere off the route, out of water and snow,
// and press G to plant it 3 m to your right: a wooden stake with a ribbon, and 34 flowers of that species that
// grow in over a day (40 real minutes in free roam). The garden is saved and comes back on every visit.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, IcosahedronGeometry, InstancedMesh, Mesh, MeshStandardMaterial, Object3D } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { distToSeg, hash, smooth } from "../../utils/noise";
import { audio } from "../audio/audio";
import { M, add, bakeStatic, box, cyl, glow, halo, mergeByMaterial } from "../art/kit";
import { activeGround, height, waterLevel } from "./height";
import { ROUTE } from "./ground";
import { flowerModel, type FlowerKind } from "./flora/grass";

export const SPECIES: { kind: FlowerKind; colour: string; line: string }[] = [
  { kind: "daisy", colour: "#FBF8F2", line: "Daisies, here, forever now" },
  { kind: "buttercup", colour: "#F2C230", line: "Buttercups, the colour of the evening" },
  { kind: "lupin", colour: "#9A8AE0", line: "Lupins. Give them a minute" },
  { kind: "cosmos", colour: "#E58AAE", line: "Cosmos, small and stubborn" },
];
export interface Planting { x: number; z: number; sp: number; t0: number }
const GROW_MS = 40 * 60 * 1000, N = 34, PODS = 12;
const GROUND = new Set(["rover", "mule", "bus", "tortoise", "snowcat"]);

function podSites() {
  const out: { x: number; z: number; sp: number }[] = [];
  for (let i = 0; i < PODS; i++) {
    const t = (i + 0.5) / PODS, side = hash(i, 71) > 0.5 ? 1 : -1, off = 4 + hash(i, 72) * 7;
    const dx = ROUTE.bx - ROUTE.ax, dz = ROUTE.bz - ROUTE.az, len = Math.hypot(dx, dz);
    out.push({ x: ROUTE.ax + dx * t - (dz / len) * side * off, z: ROUTE.az + dz * t + (dx / len) * side * off, sp: Math.floor(hash(i, 73) * SPECIES.length) });
  }
  return out;
}


export function Seeds() {
  const region = useStore((s) => s.region);
  const pods = useMemo(() => region !== "valley" ? [] : podSites().map((p, i) => {
    const g = new Group(), y = height(p.x, p.z);
    g.position.set(p.x, y, p.z);
    add(g, cyl(0.01, 0.015, 0.6, 4), M("#56703A", 0.9), [0, 0.3, 0]);
    const ball = add(g, new IcosahedronGeometry(0.16, 1), glow(SPECIES[p.sp].colour, 0.7), [0, 0.66, 0]);
    halo(g, [0, 0.66, 0], SPECIES[p.sp].colour, 0.9);
    return { id: i, sp: p.sp, g, ball, x: p.x, z: p.z, ph: hash(i, 74) * 6 };
  }), [region]);

  const garden = useRef<{ p: Planting; root: Group; ims: InstancedMesh[]; slots: number[][]; grown: number }[]>([]).current;
  const world = useRef<Group>(null!);
  const dummy = useMemo(() => new Object3D(), []);

  const setPatch = (e: (typeof garden)[number], g: number) => {
    e.slots.forEach(([x, y, z, r, s, delay], i) => {
      const k = Math.max(0, Math.min(1, (g - delay) / (1 - delay))), q = smooth(0, 1, k) * s;
      dummy.position.set(x, y - 0.02, z); dummy.rotation.set(0, r, 0); dummy.scale.setScalar(Math.max(0.001, q)); dummy.updateMatrix();
      for (const im of e.ims) im.setMatrixAt(i, dummy.matrix);
    });
    for (const im of e.ims) im.instanceMatrix.needsUpdate = true;
  };
  const grow = (p: Planting) => {
    const sp = SPECIES[p.sp], root = new Group(), model = mergeByMaterial(flowerModel(sp.kind, 3)), ims: InstancedMesh[] = [];
    for (const c of model.children as Mesh[]) { const im = new InstancedMesh(c.geometry, c.material as MeshStandardMaterial, N); im.frustumCulled = false; im.receiveShadow = true; ims.push(im); root.add(im); }
    const slots: number[][] = [];
    for (let i = 0; i < N; i++) { const a = hash(i, p.x) * 6.28, r = Math.sqrt(hash(p.z, i)) * 1.6, x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; slots.push([x, height(x, z), z, hash(i, 91) * 6.28, 1.1 + hash(i, 92) * 0.8, hash(i, 93) * 0.4]); }
    const stake = new Group(); stake.position.set(p.x, height(p.x, p.z), p.z);
    add(stake, box(0.05, 0.7, 0.05), M("#7A5A3E", 0.85), [0, 0.35, 0]); add(stake, box(0.03, 0.22, 0.12), M(sp.colour, 0.8), [0.04, 0.6, 0.07]);
    root.add(bakeStatic(stake));
    const e = { p, root, ims, slots, grown: Math.min(1, (Date.now() - p.t0) / GROW_MS) };
    setPatch(e, e.grown); garden.push(e); world.current.add(root);
  };

  // the saved garden comes back on every visit
  useEffect(() => {
    if (region !== "valley") return;
    ((useStore.getState().extra.garden as Planting[] | undefined) ?? []).forEach(grow);
    return () => { garden.splice(0).forEach((e) => { e.root.removeFromParent(); e.ims.forEach((im) => im.dispose()); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  const plant = () => {
    const s = useStore.getState(), pouch = (s.extra.pouch as number[] | undefined) ?? [];
    if (!live.garden.can || !pouch.length) return;
    const [sp, ...rest] = pouch, car = live.car;
    const p: Planting = { x: car.x + Math.cos(car.yaw) * 3.2, z: car.z - Math.sin(car.yaw) * 3.2, sp, t0: Date.now() };
    s.setExtra("pouch", rest); s.setExtra("garden", [...((s.extra.garden as Planting[] | undefined) ?? []), p]);
    grow(p); audio.bell(car.x, car.y + 1, car.z);
    live.note.text = SPECIES[sp].line; live.note.t = 4;
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.code === "KeyG" && !e.repeat && useStore.getState().phase === "play") plant(); };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useFrame((_, dt) => {
    const s = useStore.getState(), car = live.car, got = (s.extra.podsGot as number[] | undefined) ?? [];
    const on = region === "valley" && GROUND.has(live.vehicle) && s.phase === "play";
    for (const o of pods) {
      const taken = got.includes(o.id);
      o.g.visible = !taken;
      if (taken) continue;
      o.ball.position.y = 0.66 + Math.sin(live.clock * 1.6 + o.ph) * 0.04; o.ball.rotation.y += dt * 0.4;
      if (on && Math.hypot(car.x - o.x, car.z - o.z) < 3.2) {
        s.setExtra("podsGot", [...got, o.id]); s.setExtra("pouch", [...((s.extra.pouch as number[] | undefined) ?? []), o.sp]);
        audio.bell(o.x, 1, o.z);
        if (got.length === 0) { live.note.text = "A seed. Stop anywhere off the path and press G to plant it"; live.note.t = 6; }
      }
    }
    // growing patches
    for (const e of garden) if (e.grown < 1) { e.grown = Math.min(1, (Date.now() - e.p.t0) / GROW_MS); setPatch(e, e.grown); }
    const g = activeGround(), grip = g.grip ? g.grip(car.x, car.z) : 1, pouch = (s.extra.pouch as number[] | undefined)?.length ?? 0;
    live.garden.can = on && pouch > 0 && Math.abs(car.speed) < 0.6 && !car.air && distToSeg(car.x, car.z, ROUTE.ax, ROUTE.az, ROUTE.bx, ROUTE.bz) > 3.2 && waterLevel(car.x, car.z) - height(car.x, car.z) < 0.05 && grip >= 0.95;
  });

  return (
    <>
      <group ref={world} />
      {pods.map((o) => <primitive key={o.id} object={o.g} />)}
    </>
  );
}
