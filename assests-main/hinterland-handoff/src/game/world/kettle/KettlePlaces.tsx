// The people and places of Kettle Peak: the farm and its waving traveller, the stone shelter,
// the hut and its keeper, the lanterns, prayer flags, cairns and the campfires.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, BufferGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, Group, Material, MeshStandardMaterial, PointLight } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { C, M, VC, add, bakeStatic, box, cyl, glow, glowLevel, h3, instanced, mixC, paintFaces, place } from "../../art/kit";
import { addTufts } from "../flora/grass";
import { rockGeo } from "../props/rocks";
import { buildWall } from "./wall";
import { glowTexture } from "../../environment/textures";
import { buildCampfire } from "../../exploration/campfire/CampfireModel";
import { personModel } from "../../life/person";
import { buildHouse, type HouseOpts } from "../props/house";
import { buildBellPole } from "./bellPole";
import { U } from "../../shaders";
import { useFixedColliders } from "../colliders";
import { Cairn } from "../Overlook";
import { HUT, kettleGround } from "./kettle";
import { BELLS, CAIRNS, CAMPS, FARM, FLAGS, LANTERNS, SHELTER, TRAVELER, outward } from "./layout";

/** A lab person (traveler or keeper) facing yaw; the traveler waves slowly. */
export function Person({ x, y, z, yaw, kind, wave = false }: { x: number; y: number; z: number; yaw: number; kind: "traveler" | "keeper"; wave?: boolean }) {
  const model = useMemo(() => personModel(kind), [kind]);
  useFrame(() => { if (wave) (model.userData.arm as Group).rotation.z = -(2.4 + Math.sin(live.clock * 3.2) * 0.45); });
  return <primitive object={model} position={[x, y, z]} rotation-y={yaw} />;
}

/** A lab house, baked, with its smoke (and flags) animating. */
function House({ x, y, z, yaw, opts }: { x: number; y: number; z: number; yaw: number; opts: HouseOpts }) {
  const model = useMemo(() => bakeStatic(buildHouse(opts)), [opts]);
  useFrame(() => model.userData.update?.(live.clock));
  return <primitive object={model} position={[x, y, z]} rotation-y={yaw} />;
}

/** Campfire (lab model): the flames flicker and the warm light breathes. */
export function Campfire({ x, y, z }: { x: number; y: number; z: number }) {
  const model = useMemo(() => {
    const m = bakeStatic(buildCampfire()), light = m.userData.light as PointLight;
    light.distance = 14; light.decay = 1.6; // physical light units: the lab's legacy 1.6 reads as ~6
    return m;
  }, []);
  useFrame(() => { (model.userData.light as PointLight).userData.k = 4 + 2 * Math.min(1, glowLevel); model.userData.update(live.clock); });
  return <primitive object={model} position={[x, y, z]} />;
}

/** Bell poles through the cloud band: instanced poles and flags (fluttering), each bell swinging. */
function BellPoles() {
  const { poles, bells } = useMemo(() => {
    const model = buildBellPole(), live_ = model.userData.live as Group[], bell = live_[live_.length - 1];
    model.remove(bell);
    // flags line out away from the mountain
    const yaw = (b: { x: number; z: number }) => Math.atan2(b.z, b.x) * -1;
    const poles = instanced(model, BELLS.map((b) => place(b.x, b.y - 0.05, b.z, yaw(b))), { patch: (m) => (m as MeshStandardMaterial).side === DoubleSide ? fluttering(m) : m });
    const at = bell.position.clone();
    bell.position.set(0, 0, 0);
    const bellMesh = bakeStatic(bell);
    const bells = BELLS.map((b) => {
      const pivot = new Group(), s = Math.sin(yaw(b)), c = Math.cos(yaw(b));
      pivot.position.set(b.x + at.x * c, b.y - 0.05 + at.y, b.z - at.x * s);
      pivot.add(...bellMesh.children.map((o) => o.clone()));
      pivot.rotation.y = yaw(b);
      return pivot;
    });
    return { poles, bells };
  }, []);
  useFrame(() => bells.forEach((b, k) => { b.rotation.z = Math.sin(live.clock * 1.7 + k) * 0.18; }));
  return <><primitive object={poles} />{bells.map((b, k) => <primitive key={k} object={b} />)}</>;
}

/** Flags and grass blades flutter with height: a merged-mesh version of the lab's per-flag swing. */
function fluttering(m: Material) {
  const c = m.clone();
  c.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      float flap = sin(uTime*2.4 + position.x*1.7 + position.z*1.3)*0.06*smoothstep(0.3, 3.0, position.y);
      transformed.x += flap*0.6; transformed.z += flap;`);
  };
  return c;
}

/** Prayer flags fluttering on lines across the last ramp. */
function Flags() {
  const { geo, material } = useMemo(() => {
    const pos: number[] = [], col: number[] = [], idx: number[] = [], palette = ["#3E6FB0", "#F2EEE4", "#C8463A", "#4E8A4A", "#E2B53C"].map((h) => new Color(h));
    let n = 0;
    FLAGS.forEach(({ a, b }, li) => {
      const count = 11;
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count, sag = Math.sin(t * Math.PI) * 0.6;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t - sag, z = a.z + (b.z - a.z) * t;
        const c = palette[(k + li) % 5], w = 0.16;
        // a hanging square: top edge on the line
        const dx = ((b.x - a.x) / Math.hypot(b.x - a.x, b.z - a.z)) * w, dz = ((b.z - a.z) / Math.hypot(b.x - a.x, b.z - a.z)) * w;
        pos.push(x - dx, y, z - dz, x + dx, y, z + dz, x - dx, y - 0.34, z - dz, x + dx, y - 0.34, z + dz);
        for (let v = 0; v < 4; v++) col.push(c.r, c.g, c.b);
        idx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
        n += 4;
      }
    });
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const material = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: 0.9 });
    material.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime;
      sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        float flap = sin(uTime*5.0 + position.x*1.7 + position.z*1.3)*0.12;
        transformed.x += flap*0.6; transformed.z += flap;`);
    };
    return { geo, material };
  }, []);
  return <mesh geometry={geo} material={material} castShadow />;
}

/** A lantern on a post (post, bracket, framed lamp with a cap): lit glows warm, unlit is dark glass. */
function lanternModel(lit: boolean) {
  const g = new Group(), wood = M("#5A4634", 0.95), iron = M("#3A3631", 0.5, 0.6);
  const post = cyl(0.05, 0.07, 2.4, 7);
  add(g, paintFaces(post, (c) => mixC(C("#4E3A2B"), C("#7A6048"), (c.y + 1.2) / 2.4 * 0.6 + h3(c.x * 20, c.y * 20, 3) * 0.3)), VC(0.95), [0, 1.2, 0]);
  add(g, box(0.5, 0.05, 0.05), wood, [0.22, 2.3, 0]);
  const lamp = new Group(); lamp.position.set(0.42, 2.0, 0); g.add(lamp);
  add(lamp, box(0.16, 0.22, 0.16), lit ? glow("#FFC874", 2.2) : M("#3B4246", 0.25, 0.3));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(lamp, box(0.02, 0.26, 0.02), iron, [sx * 0.085, 0, sz * 0.085]);
  add(lamp, box(0.2, 0.02, 0.2), iron, [0, -0.13, 0]);
  add(lamp, new ConeGeometry(0.15, 0.1, 4), iron, [0, 0.17, 0], [0, Math.PI / 4, 0]);
  add(lamp, cyl(0.004, 0.004, 0.18, 4), iron, [0, 0.28, 0]);
  addTufts(g, 4, 0.1, 0.35, 7);
  return bakeStatic(g);
}
let lanterns: Record<"on" | "off", Group> | null = null;
/** One lantern lights for every crate that reached the hut (and every one brought up later). */
function Lanterns() {
  const lit = useStore((s) => (s.extra.kettleLanterns as number | undefined) ?? 0);
  const models = (lanterns ??= { on: lanternModel(true), off: lanternModel(false) });
  const tex = useMemo(glowTexture, []);
  return (
    <>
      {LANTERNS.map((l, k) => {
        const yaw = Math.atan2(HUT.x - l.x, HUT.z - l.z) - Math.PI / 2; // the lamp hangs toward the hut
        return (
          <group key={k} position={[l.x, l.y - 0.05, l.z]} rotation-y={yaw}>
            <primitive object={(k < lit ? models.on : models.off).clone()} />
            {k < lit && (
              <sprite position={[0.42, 2.0, 0]} scale={2.6}>
                <spriteMaterial map={tex} color="#FFD9A0" transparent depthWrite={false} blending={AdditiveBlending} fog={false} />
              </sprite>
            )}
          </group>
        );
      })}
    </>
  );
}

/** The stone shelter in the cloud band: three dry-stone walls under a roof of big flat slabs. */
function shelterModel() {
  const g = new Group(), mat = VC(0.95);
  const back = buildWall(4.4); back.position.set(0, 0, -1.6); back.scale.set(1, 1.9, 1.6); g.add(back);
  for (const sx of [-1, 1]) { const w = buildWall(3.2); w.position.set(sx * 2, 0, 0); w.rotation.y = Math.PI / 2; w.scale.set(1, 1.9, 1.6); g.add(w); }
  for (let i = 0; i < 6; i++) add(g, rockGeo(1200 + i, 1.0, 0.12, 0.85, 1, 0.3), mat, [-1.7 + (i % 3) * 1.7, 1.68 + (i % 2) * 0.05, -1.0 + Math.floor(i / 3) * 1.6], [0.04 * (i % 2 ? 1 : -1), i * 0.7, 0]);
  return bakeStatic(g);
}

const FARM_HOUSE: HouseOpts = { seed: 12, w: 6.6, d: 4.6, h: 2.8 }; // plinth matches the farm's collider
const HUT_HOUSE: HouseOpts = { seed: 33, walls: "stone", w: 4.4, d: 3.6, h: 2.3, pitch: 0.5, shutter: "#7A4A36", flags: true };
/** yaw that turns a lab model's face (-Z) toward the trail's outer side at trail index i */
const facingOut = (i: number) => { const o = outward(i); return Math.atan2(o.x, o.z) + Math.PI; };

export function KettlePlaces() {
  // houses are solid
  useFixedColliders((r) => [
    r.ColliderDesc.cuboid(3.6, 2, 2.6).setTranslation(FARM.x, FARM.y + 1.4, FARM.z).setRotation({ x: 0, y: Math.sin(FARM.yaw / 2), z: 0, w: Math.cos(FARM.yaw / 2) }),
    r.ColliderDesc.cuboid((HUT_HOUSE.w! + 0.5) / 2, 2, (HUT_HOUSE.d! + 0.5) / 2).setTranslation(HUT.x, HUT.h + 1.4, HUT.z).setRotation({ x: 0, y: Math.sin(HUT.yaw / 2), z: 0, w: Math.cos(HUT.yaw / 2) }),
  ], []);
  const hutY = kettleGround.height(HUT.x, HUT.z);
  return (
    <>
      {/* the farm on the first turn, and its traveller by the track */}
      <House x={FARM.x} y={FARM.y} z={FARM.z} yaw={FARM.yaw} opts={FARM_HOUSE} />
      <Person x={TRAVELER.x} y={TRAVELER.y} z={TRAVELER.z} yaw={facingOut(TRAVELER.i)} kind="traveler" wave />
      {/* the stone shelter in the cloud band */}
      <primitive object={useMemo(shelterModel, [])} position={[SHELTER.x, SHELTER.y - 0.1, SHELTER.z]} rotation-y={SHELTER.yaw} />
      {/* the hut, its keeper, and the lanterns */}
      <House x={HUT.x} y={hutY} z={HUT.z} yaw={HUT.yaw} opts={HUT_HOUSE} />
      <Person x={HUT.x - Math.sin(HUT.yaw) * 3.4} y={hutY} z={HUT.z - Math.cos(HUT.yaw) * 3.4} yaw={HUT.yaw} kind="keeper" />
      <Lanterns />
      <BellPoles />
      <Flags />
      {CAIRNS.map((c, k) => <Cairn key={k} x={c.x} y={c.y - 0.05} z={c.z} n={5 + (k % 2)} r0={0.5} seed={k} />)}
      {CAMPS.map((c) => <Campfire key={c.name} x={c.x} y={c.y} z={c.z} />)}
    </>
  );
}

