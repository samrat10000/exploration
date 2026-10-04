// Places worth finding. No markers, no checklist: you arrive, the world names the place, that's all.
import { POOL, TARN, VP } from "../world/height";
import type { RegionId } from "../journeys/journeys";

export const PLACES = {
  falls: { name: "Highfall", line: "The river begins here, all at once.", region: "valley", ground: "#4F6B46" },
  overlook: { name: "The Overlook", line: "Everything you crossed, and everything you haven't.", region: "valley", ground: "#5E7A3A" },
  tarn: { name: "The Tarn", line: "Where the river rests before it falls.", region: "valley", ground: "#4A5B3C" },
} as const satisfies Record<string, { name: string; line: string; region: RegionId; ground: string }>;

export type PlaceId = keyof typeof PLACES;

export const placesIn = (r: RegionId) => (Object.keys(PLACES) as PlaceId[]).filter((id) => PLACES[id].region === r);

/** Which valley place (if any) the rover is in right now. */
export function placeAt(x: number, z: number, speed: number, y: number): PlaceId | null {
  if (Math.hypot(x - POOL.x, z - POOL.z) < 26 && y < 20) return "falls";
  if (Math.hypot(x - VP.x, z - VP.z) < 11 && Math.abs(speed) < 3) return "overlook";
  if (Math.hypot(x - TARN.x, z - TARN.z) < TARN.radius + 7 && y > TARN.level - 3) return "tarn";
  return null;
}
