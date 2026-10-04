// The bus route (JOURNEYS §1.14): stops along a route. Pull into a stop and hold E: the doors open,
// riders for this stop get off, the waiting ones board. A rider rings the bell before their stop;
// missing it is fine (they laugh and walk back). Comfort is never a score, only reactions.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { hash } from "../../utils/noise";
import { audio } from "../audio/audio";
import { bakeStatic } from "../art/kit";
import { input } from "../vehicle/input";
import type { RegionId } from "../journeys/journeys";
import { ROUTE } from "./ground";
import { POOL, START, height } from "./height";
import { buildBusStop } from "./props/busStop";

export interface Stop { name: string; x: number; z: number; yaw: number }
const MID = { x: (ROUTE.ax + ROUTE.bx) / 2, z: (ROUTE.az + ROUTE.bz) / 2 };
/** Route stops per region (the valley holds the sandbox loop; J10 brings its own). */
export const STOPS: Record<RegionId, Stop[]> = {
  valley: [
    { name: "Riverbend", x: START.x + 9, z: START.z - 14, yaw: 0.4 },
    { name: "Meadow Gate", x: MID.x + 14, z: MID.z, yaw: -1.2 },
    { name: "Highfall Lane", x: POOL.x + 34, z: POOL.z + 30, yaw: 2.2 },
  ],
  kettle: [],
};

const SEATS = 12, OPEN = 0.6, STEP = 0.6;
const say = (line: string) => { live.bus.line = line; live.bus.lineT = 5; };

export function BusRoute() {
  const region = useStore((s) => s.region), stops = STOPS[region];
  const models = useMemo(() => stops.map(() => bakeStatic(buildBusStop())), [stops]);
  const st = useRef({ waiting: [3, 2, 4], refill: [0, 0, 0], last: -1, at: -1, hold: 0, doors: -1, timer: 0, rung: new Set<number>(), passed: new Set<number>(), steadyT: 0, calmT: 0, humT: 0 }).current;

  useFrame((_, dt) => {
    const s = useStore.getState(), on = live.vehicle === "bus" && s.phase === "play";
    live.bus.on = on && stops.length > 0;
    live.bus.lineT = Math.max(0, live.bus.lineT - dt);
    if (!live.bus.on) { live.bus.prompt = false; return; }
    const car = live.car, seats = live.bus.seats, n = stops.length;
    // emptied stops fill up again after a while
    stops.forEach((_, i) => { if (!st.waiting[i] && (st.refill[i] = (st.refill[i] ?? 0) + dt) > 60) { st.waiting[i] = 1 + Math.floor(hash(i, live.clock) * 3); st.refill[i] = 0; } });
    const dist = stops.map((p) => Math.hypot(car.x - p.x, car.z - p.z));
    st.at = dist.findIndex((d) => d < 9);
    const stopped = Math.abs(car.speed) < 1;

    // doors: open, let off, let on, close
    if (st.doors >= 0) {
      st.timer += dt;
      if (st.timer > STEP) {
        st.timer = 0;
        const off = seats.findIndex((d) => d === st.doors || d === -1);
        if (off >= 0) { const missed = seats[off] === -1; seats.splice(off, 1); if (missed) say("They laugh and walk back down the road."); }
        else if ((st.waiting[st.doors] ?? 0) > 0 && seats.length < SEATS) {
          st.waiting[st.doors]--;
          let dest = Math.floor(hash(seats.length * 7.3 + st.doors * 13.1, Math.floor(live.clock * 10) * 0.37) * (n - 1)); if (dest >= st.doors) dest++;
          seats.push(dest);
        } else {
          st.last = st.doors; st.doors = -1;
          st.rung.clear(); st.passed.clear();
          say(seats.length ? `Doors close. Next stop: ${stops[(st.last + 1) % n].name}.` : "Doors close. Nobody aboard for now.");
        }
      }
    } else if (st.at >= 0 && stopped) {
      live.bus.prompt = true;
      st.hold = input.action ? st.hold + dt : 0;
      if (st.hold >= OPEN) { st.doors = st.at; st.timer = 0; st.hold = 0; live.bus.prompt = false; }
    } else { live.bus.prompt = false; st.hold = 0; }
    live.bus.hold = Math.min(1, st.hold / OPEN);

    // the bell: someone wants this stop; drive past it and they get off at the next door and walk back
    for (let i = 0; i < n; i++) {
      const wants = seats.includes(i);
      if (wants && dist[i] < 90 && !st.rung.has(i) && st.doors < 0) { st.rung.add(i); audio.bell(car.x, car.y + 2.5, car.z); say("Ding! Next stop, please."); }
      if (wants && dist[i] < 25) st.passed.add(i);
      if (wants && st.passed.has(i) && dist[i] > 70 && st.doors < 0) {
        for (let k = 0; k < seats.length; k++) if (seats[k] === i) seats[k] = -1;
        st.passed.delete(i);
      }
    }

    // comfort: no score, only reactions
    st.steadyT -= dt; st.humT -= dt;
    const rough = Math.abs(live.latAccel) > 4.5 || Math.abs(car.accel) > 7;
    if (seats.length && rough && st.steadyT <= 0) { say(hash(live.clock, 1) < 0.5 ? "Steady!" : "A chicken flaps somewhere at the back."); st.steadyT = 10; st.calmT = 0; }
    st.calmT = rough ? 0 : st.calmT + dt;
    if (seats.length && st.calmT > 40 && st.humT <= 0) { say("Someone hums a tune at the back."); st.humT = 70; st.calmT = 0; }

    // the ticket: the next stop and the ones after
    const next = (st.last + 1 + n) % n;
    live.bus.next = stops[next].name;
    live.bus.then = [1, 2].map((k) => stops[(next + k) % n].name).filter((nm) => nm !== live.bus.next);
  });

  return <>{stops.map((p, i) => <primitive key={i} object={models[i]} position={[p.x, height(p.x, p.z) - 0.05, p.z]} rotation-y={p.yaw} />)}</>;
}
