// Valley travelers: the person at each bus stop speaks to you when you stop beside them (any vehicle).
// Kettle's farm traveler is handled by KettleBeats (it shares the label with the campfire prompt).
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { STOPS } from "../world/BusRoute";
import { height } from "../world/height";
import { LINES, speak, type Traveler } from "./travelers";

const IDS = ["riverbend", "gate", "lane"];

export function TravelerLines() {
  const region = useStore((s) => s.region);
  const list = useMemo<Traveler[]>(() => region !== "valley" ? [] : STOPS.valley.slice(0, 3).map((p, i) => ({ id: IDS[i], x: p.x, y: height(p.x, p.z) + 2.3, z: p.z, lines: LINES[IDS[i]] })), [region]);
  useFrame((_, dt) => {
    if (!list.length) return;
    const s = useStore.getState(), playing = s.phase === "play" && !s.photo && !s.sitting;
    const label = playing && live.vehicle !== "skymule" && live.vehicle !== "glider" ? speak(list, live.car, dt, live.clock) : null;
    if (label?.text !== s.label?.text) useStore.setState({ label });
  });
  return null;
}
