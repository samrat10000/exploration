// Instanced pines (assets.html → PINE, 3 seeded variants, swaying in the wind) + their colliders.
import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Group, InstancedMesh, Material, Mesh, SphereGeometry, type Matrix4 } from "three";
import { hash } from "../../utils/noise";
import { cullByDistance, instanced, place } from "../art/kit";
import { U } from "../shaders";
import { useFixedColliders } from "./colliders";
import { buildPine } from "./flora/pine";
import { buildBlossom } from "./flora/blossom";
import { addTufts } from "./flora/grass";
import { blossomList, treeList, type Prop } from "./props";

/** Bend with height (y²), phase from where the instance stands: the whole tree sways together. */
export function swaying(m: Material, amount = 0.0055) {
  const c = m.clone();
  c.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x*0.13 + instanceMatrix[3].z*0.11;
        float sw = sin(uTime*1.1 + ph)*0.6 + sin(uTime*2.3 + ph*1.7)*0.25;
        float k = position.y*position.y*${amount.toFixed(5)};
        transformed.x += sw*k; transformed.z += sw*k*0.6;
      #endif`
    );
  };
  return c;
}

const VARIANTS = 3;
let pineModels: Group[] | null = null;
const pines = () => (pineModels ??= Array.from({ length: VARIANTS }, (_, i) => buildPine(11 + i * 7, 8)));

/** Instanced pines from a placement list; trees passing `collide` get a trunk collider. */
export function Pines({ trees, collide = () => true }: { trees: Prop[]; collide?: (p: Prop) => boolean }) {
  const group = useMemo(() => {
    const g = new Group(), fresh = new Color("#C8E0A0");
    for (let v = 0; v < VARIANTS; v++) {
      const list = trees.map((p, gi) => ({ p, gi })).filter(({ gi }) => Math.floor(hash(gi, 9) * VARIANTS) === v);
      const mats: Matrix4[] = list.map(({ p, gi }) => place(p.x, p.y - 0.2, p.z, hash(gi, 3) * 6.28, [p.s, p.s * (0.9 + hash(gi, 4) * 0.35), p.s]));
      // a little tone per tree; saplings fresher
      const inst = instanced(pines()[v], mats, {
        patch: (m) => swaying(m),
        tint: (i, c) => { c.setScalar(0.86 + hash(list[i].gi, 6) * 0.26); if (list[i].p.s < 0.6) c.lerp(fresh, 0.35); },
      });
      g.add(inst);
    }
    return g;
  }, [trees]);

  // trunk + lower canopy as a cylinder: the rover brushes the branches and stops at the trunk
  useFixedColliders((r) => trees.filter(collide).map((p) => r.ColliderDesc.cylinder(2 * p.s, 0.55 * p.s).setTranslation(p.x, p.y + 1.5 * p.s, p.z).setFriction(0.3)), [trees]);

  return <primitive object={group} />;
}

const blossomModels: Partial<Record<"apple" | "pink", { near: Group; far: Group }[]>> = {};
const LOD_NEAR = 110;
/** Apple or blossom trees (assets.html → BLOSSOM), 3 seeded variants, instanced, with trunk colliders.
 *  Past ~110 m only the canopy and trunk draw (no flowers, fruit or petals). */
export function BlossomTrees({ trees, kind }: { trees: Prop[]; kind: "apple" | "pink" }) {
  const camera = useThree((st) => st.camera);
  const { near, far } = useMemo(() => {
    const models = (blossomModels[kind] ??= (kind === "apple" ? [8, 15, 23] : [3, 12, 27]).map((seed) => {
      const nearM = buildBlossom(seed, kind, true); addTufts(nearM, 10, 0.4, 1.6, seed);
      const farM = buildBlossom(seed, kind, true);
      farM.children.filter((c) => (c as InstancedMesh).isInstancedMesh || ((c as Mesh).geometry as SphereGeometry).type === "SphereGeometry").forEach((c) => farM.remove(c));
      return { near: nearM, far: farM };
    }));
    const near = new Group(), far = new Group();
    models.forEach((m, v) => {
      const mine = trees.map((t, gi) => ({ t, gi })).filter(({ gi }) => Math.floor(hash(gi, 5) * 3) === v);
      const mats = mine.map(({ t, gi }) => place(t.x, t.y - 0.05, t.z, hash(gi, 2) * 6.28, [t.s, t.s * (0.85 + hash(gi, 3) * 0.3), t.s], [(hash(gi, 6) - 0.5) * 0.06, (hash(gi, 7) - 0.5) * 0.06]));
      near.add(instanced(m.near, mats, { cell: 48 }));
      far.add(instanced(m.far, mats, { cell: 48 }));
    });
    return { near, far };
  }, [trees, kind]);
  useFrame(() => { cullByDistance(near, camera.position, LOD_NEAR); cullByDistance(far, camera.position, Infinity, LOD_NEAR); });
  useFixedColliders((r) => trees.map((t) => r.ColliderDesc.cylinder(1, 0.3 * t.s).setTranslation(t.x, t.y + 1, t.z)), [trees]);
  return <><primitive object={near} /><primitive object={far} /></>;
}

export function Vegetation() {
  return (
    <>
      <Pines trees={treeList()} />
      <BlossomTrees trees={blossomList()} kind="pink" />
    </>
  );
}
