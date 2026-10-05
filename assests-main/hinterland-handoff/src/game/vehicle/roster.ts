// Every vehicle the player can drive, with the line the Garage shows. UNLOCK_ALL: for now every vehicle and every journey is open
// (set false to go back to earning them).
import type { VehicleId } from "../journeys/journeys";
export const UNLOCK_ALL = true;
export const ROSTER: { id: VehicleId; name: string; line: string }[] = [
  { id: "rover", name: "Rover", line: "Steady on almost anything. The one you started with." },
  { id: "mule", name: "Mule", line: "Three wheels, a wooden rack and no hurry. Go slow on the corners." },
  { id: "tortoise", name: "Tortoise", line: "Slow, round and homely. Makes camp anywhere flat." },
  { id: "bus", name: "The Loaf", line: "Long, gentle and full of people. Takes its time at every stop." },
  { id: "snowcat", name: "Snowcat", line: "Tracks, a sled and no fear of snow." },
  { id: "skymule", name: "Sky Mule", line: "The Mule with its wings out. Starts in the air." },
  { id: "glider", name: "Rover glider", line: "The Rover under a wide wing. Rising air only. Starts in the air." },
  { id: "boat", name: "Rover boat", line: "The Rover afloat. Best near water; it keeps to deep water." },
];
