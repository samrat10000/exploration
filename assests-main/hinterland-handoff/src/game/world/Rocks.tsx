// Rock groups (assets.html → ROCKS, 12 seeded shapes): each boulder with two medium rocks and a scatter
// of pebbles, grass tufts at their feet (ART §2.4). Static, merged per map cell. Rocks over 1.1 are solid.
import { useMemo } from "react";
import { Group } from "three";
import { hash } from "../../utils/noise";
import { VC, add, mergedAt, place } from "../art/kit";
import { useFixedColliders } from "./colliders";
import { addTufts } from "./flora/grass";
import { height, waterLevel, type Prop } from "./height";
import { rockGeo } from "./props/rocks";
import { rockList } from "./props";

const SHAPES = 12;
let shapes: Group[] | null = null;
const rockShapes = () => (shapes ??= Array.from({ length: SHAPES }, (_, v) => { const g = new Group(); add(g, rockGeo(v + 1, 1, 0.7, 0.9, 2), VC(0.95)); return g; }));
let pebble: Group | null = null, tuft: Group | null = null;
const pebbleModel = () => { if (!pebble) { pebble = new Group(); add(pebble, rockGeo(40, 1, 0.6, 0.8, 1), VC(0.95)); } return pebble; };
const tuftModel = () => { if (!tuft) { tuft = new Group(); addTufts(tuft, 3, 0, 0.3, 41); } return tuft; };

/** grass only grows on dry ground */
const dry = (x: number, z: number) => height(x, z) > waterLevel(x, z) + 0.15;

/** Expand placements into groups: the given rocks plus two medium rocks and pebbles round the big ones. */
export function rockGroups(list: Prop[], free: (x: number, z: number) => boolean = () => true) {
  const rocks: Prop[] = [], pebbles: Prop[] = [];
  list.forEach((r, i) => {
    rocks.push(r);
    if (r.s < 0.9) return;
    for (let k = 0; k < 2; k++) {
      const a = hash(i, 50 + k) * 6.28, d = r.s * (1.1 + hash(i, 52 + k) * 0.5), x = r.x + Math.cos(a) * d, z = r.z + Math.sin(a) * d;
      if (free(x, z)) rocks.push({ x, y: height(x, z), z, s: r.s * (0.4 + hash(i, 54 + k) * 0.2) });
    }
    for (let k = 0; k < 4 + Math.floor(hash(i, 56) * 5); k++) {
      const a = hash(i, 60 + k) * 6.28, d = r.s * (1.2 + hash(i, 70 + k) * 1.1), x = r.x + Math.cos(a) * d, z = r.z + Math.sin(a) * d;
      if (free(x, z)) pebbles.push({ x, y: height(x, z), z, s: 0.1 + hash(i, 80 + k) * 0.16 });
    }
  });
  return { rocks, pebbles };
}

/** `free`: where a group may spread (keeps the extra rocks and pebbles off roads). */
export function Rocks({ list = rockList(), free }: { list?: Prop[]; free?: (x: number, z: number) => boolean }) {
  const { group, solid } = useMemo(() => {
    const { rocks, pebbles } = rockGroups(list, free);
    const group = mergedAt([
      // half-buried: the flat base sits a little below the ground
      ...rocks.map((r, i) => ({ model: rockShapes()[Math.floor(hash(i, 11) * SHAPES)], m: place(r.x, r.y - r.s * 0.12, r.z, hash(i, 2) * 6.28, r.s, [(hash(i, 1) - 0.5) * 0.2, (hash(i, 3) - 0.5) * 0.2]) })),
      ...pebbles.map((p, i) => ({ model: pebbleModel(), m: place(p.x, p.y - p.s * 0.1, p.z, hash(i, 4) * 6.28, p.s) })),
      // grass tufts hug the bases (ART §2.3)
      ...rocks.filter((r) => r.s > 0.5 && dry(r.x + r.s * 0.7, r.z)).map((r, i) => ({ model: tuftModel(), m: place(r.x + r.s * 0.7, height(r.x + r.s * 0.7, r.z), r.z, hash(i, 5) * 6.28) })),
      ...pebbles.filter((p, i) => i % 2 === 0 && dry(p.x + 0.15, p.z)).map((p, i) => ({ model: tuftModel(), m: place(p.x + 0.15, p.y, p.z, hash(i, 6) * 6.28, 0.8) })),
    ]);
    return { group, solid: rocks.filter((p) => p.s > 1.1) };
  }, [list, free]);

  useFixedColliders((r) => solid.map((p) => r.ColliderDesc.ball(p.s * 0.8).setTranslation(p.x, p.y - p.s * 0.25, p.z).setFriction(0.4)), [solid]);

  return <primitive object={group} />;
}
