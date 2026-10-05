// Slipways (JOURNEYS §2.3, used by J4 and J7): a plank ramp into the water with a mooring post.
// Stopped on one in the Rover, hold T: the Rover floats (Boat.tsx). Afloat beside one, hold T to go ashore.
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, TorusGeometry } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { hash } from "../../utils/noise";
import { C, M, VC, add, bakeStatic, box, cyl, h3, mixC, paintFaces } from "../art/kit";
import { input } from "../vehicle/input";
import type { RegionId } from "../journeys/journeys";
import { POOL, height, riverX, waterLevel } from "./height";
import { SLIPWAY } from "./river/river";
import { SLIPWAY as LAKE_SLIP } from "./lake/lake";

/** x, z: the water end of the ramp; yaw: facing out over the water (forward = -Z). */
export interface Slipway { x: number; z: number; yaw: number }
const bank = (z: number, side: number): Slipway => ({ x: riverX(z) + side * 7, z, yaw: Math.atan2(side, 0) });
export const SLIPWAYS: Record<RegionId, Slipway[]> = {
  valley: [bank(150, 1), bank(POOL.z + 40, -1)],
  kettle: [],
  gorge: [],
  river: [SLIPWAY],
  forest: [],
  lake: [LAKE_SLIP],
  pass: [],
  sky: [],
  salt: [],
  coast: [],
  light: [],
  flowers: [],
};
const HOLD = 1.2;

function slipModel() {
  const g = new Group(), tones = ["#7A5E40", "#86674A", "#6E5439"];
  // planks from the bank (+Z) down into the water (-Z)
  for (let k = 0; k < 14; k++) add(g, box(3.4, 0.08, 0.36), M(tones[k % 3], 0.9), [0, -k * 0.09, 4 - k * 0.42], [0.21, (hash(k, 2) - 0.5) * 0.04, 0]);
  for (const sx of [-1, 1]) add(g, box(0.12, 0.12, 6), M("#5A4632", 0.95), [sx * 1.6, -0.62, 1.2], [0.21, 0, 0]);
  const post = cyl(0.12, 0.14, 2.2, 8);
  add(g, paintFaces(post, (c) => mixC(C("#4E3A2B"), C("#7A6048"), (c.y + 1.1) / 2.2 * 0.6 + h3(c.x * 20, c.y * 20, 2) * 0.3)), VC(0.95), [2.1, 0.1, 0.6]);
  add(g, new TorusGeometry(0.1, 0.02, 6, 12), M("#5D5A55", 0.5, 0.7), [2.1, 0.9, 0.48]);
  return bakeStatic(g);
}

function SlipwayAt({ s }: { s: Slipway }) {
  const model = useMemo(slipModel, []);
  useFrame((_, dt) => {
    const st = useStore.getState(), car = live.car, d = Math.hypot(car.x - s.x, car.z - s.z);
    const here = st.phase === "play" && live.vehicle === "rover" && d < 6 && Math.abs(car.speed) < 0.8;
    if (here) {
      live.flight.prompt = "boat";
      live.flight.hold = input.wings ? Math.min(1, live.flight.hold + dt / HOLD) : 0;
      if (live.flight.hold >= 1) {
        live.flight.hold = 0; live.flight.prompt = "";
        live.spawnAt = { x: s.x, z: s.z, yaw: s.yaw };
        useStore.setState({ vehicle: "boat" });
      }
    } else if (live.flight.prompt === "boat" && live.vehicle === "rover" && d < 12) { live.flight.prompt = ""; live.flight.hold = 0; }
  });
  return <primitive object={model} position={[s.x, Math.max(height(s.x, s.z), waterLevel(s.x, s.z) > -50 ? waterLevel(s.x, s.z) + 0.05 : 0.6), s.z]} rotation-y={s.yaw} />;
}

export function Slipways() {
  const region = useStore((st) => st.region);
  return <>{SLIPWAYS[region].map((s, i) => <SlipwayAt key={i} s={s} />)}</>;
}
