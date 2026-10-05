// Hut Rounds in the world (JOURNEYS §1.11): a depot pad and five huts with keepers. Stop on the loading
// pad and hold E: the Mule is loaded with what the huts still need (up to 6). Stop at a hut and hold E to
// hand over its order: keeper line, Given → Received, a stamp for the season. Gifts chain to other huts.
// (Mule only. Crates on the rack are not tied to this inventory yet.)
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { bakeStatic, box, cyl, M, add } from "../art/kit";
import { buildPerson } from "../life/person";
import { HUTS, DEPOT, LINE2, SEASONS, bagText, count, loadPlan, missing, CAPACITY, type Bag, type Hut } from "../rounds/rounds";
import { input } from "../vehicle/input";
import { height } from "./height";
import { HUT_FRONT, buildHut } from "./props/huts";

const HOLD = 1.0, LOAD = 2.0;
const front = (x: number, z: number, yaw: number, f: number) => ({ x: x - Math.sin(yaw) * f, z: z - Math.cos(yaw) * f });

/** Loading pad: a stone apron, a crate stack, a crane post and a sign. */
function buildDepot() {
  const g = new Group(), wood = M("#7A5A3E", 0.85);
  add(g, box(7, 0.14, 5), M("#8E887E", 0.95), [0, 0.02, 0]);
  for (let i = 0; i < 6; i++) add(g, box(0.9, 0.7, 0.9), M(i % 2 ? "#9A7A55" : "#8A6B48", 0.85), [-2.6 + (i % 3) * 1.0, 0.4 + Math.floor(i / 3) * 0.7, 1.4]);
  add(g, cyl(0.12, 0.14, 4.2, 8), wood, [2.8, 2.1, 1.6]); add(g, box(2.6, 0.14, 0.14), wood, [1.6, 4.1, 1.6]); add(g, cyl(0.015, 0.015, 1.6, 4), M("#3A342C", 0.6), [0.5, 3.3, 1.6]);
  add(g, box(1.5, 0.45, 0.06), M("#E9DFC9", 0.8), [-2.9, 1.6, -1.6]); add(g, cyl(0.05, 0.05, 1.6, 6), wood, [-2.9, 0.8, -1.65]);
  return g;
}

export function HutRounds() {
  const region = useStore((s) => s.region);
  const items = useMemo(() => {
    if (region !== "valley") return [];
    const out: { hut?: Hut; g: Group; x: number; z: number; yaw: number; fx: number; fz: number }[] = [];
    const place = (g: Group, x: number, z: number, yaw: number, f: number, hut?: Hut) => {
      const y = height(x, z), fr = front(x, z, yaw, f);
      g.position.set(x, y, z); g.rotation.y = yaw;
      out.push({ hut, g, x, z, yaw, fx: fr.x, fz: fr.z });
    };
    place(bakeStatic(buildDepot()), DEPOT.x, DEPOT.z, DEPOT.yaw, 0);
    for (const h of HUTS) {
      const root = new Group(), model = bakeStatic(buildHut(h.kind)); root.add(model);
      const keeper = buildPerson("keeper"); keeper.position.set(0.9, 0.35, -HUT_FRONT(h.kind) + 1.1); keeper.rotation.y = Math.PI; root.add(keeper);
      place(root, h.x, h.z, h.yaw, HUT_FRONT(h.kind) + 2.5, h);
    }
    return out;
  }, [region]);
  const st = useRef({ hold: 0, visited: new Set<string>() }).current;

  useFrame((_, dt) => {
    const r = live.rounds, s = useStore.getState();
    r.on = region === "valley" && live.vehicle === "mule" && s.phase === "play";
    r.noteT = Math.max(0, r.noteT - dt);
    if (r.visit) { r.visit.t += dt; if (r.visit.t > 7) { r.visit = null; useStore.setState({ cinema: false }); } }
    if (!r.on) { r.prompt = ""; r.hold = 0; return; }
    const car = live.car, stopped = Math.abs(car.speed) < 1 && !r.visit;
    const near = items.find((o) => Math.hypot(car.x - o.fx, car.z - o.fz) < 7);
    const delivered = new Set(r.delivered);
    r.prompt = "";
    if (near && stopped) {
      if (!near.hut) { if (count(Object.assign({}, r.carried)) < CAPACITY && count(loadPlan(r.carried, delivered)) > 0) r.prompt = "load"; }
      else if (!delivered.has(near.hut.id)) r.prompt = "hand";
    }
    const need = r.prompt === "load" ? LOAD : HOLD;
    st.hold = r.prompt && input.action ? st.hold + dt : 0;
    r.hold = Math.min(1, st.hold / need);
    if (st.hold < need || !near) return;
    st.hold = 0;
    if (r.prompt === "load") {
      const plan = loadPlan(r.carried, delivered);
      for (const [i, n] of Object.entries(plan)) r.carried[i] = (r.carried[i] ?? 0) + (n ?? 0);
      r.note = "Loaded: " + bagText(plan as Bag); r.noteT = 5;
    } else if (near.hut) {
      const h = near.hut, miss = missing(h, r.carried);
      if (count(miss) > 0) { r.note = `${h.keeper} is still waiting on ${bagText(miss)}.`; r.noteT = 5; return; }
      for (const [i, n] of Object.entries(h.order)) r.carried[i] -= n as number;
      for (const [i, n] of Object.entries(h.gift)) r.carried[i] = (r.carried[i] ?? 0) + (n as number);
      r.delivered.push(h.id); r.doneAt[h.id] = live.clock;
      const day = (s.extra.roundDay as number | undefined) ?? 0, season = SEASONS[day % 4];
      const stamps = { ...((s.extra.stamps as Record<string, string[]> | undefined) ?? {}) };
      stamps[h.id] = [...new Set([...(stamps[h.id] ?? []), season])];
      s.setExtra("stamps", stamps);
      if (h.unlock) s.setExtra("gift-" + h.unlock, true);
      r.visit = { hut: h.id, name: h.name, keeper: h.keeper, line: (stamps[h.id]?.length ?? 0) > 1 ? LINE2[h.id] : h.line, given: bagText(h.order), received: h.giftText, stamp: season, emblem: h.emblem, colour: h.colour, t: 0 };
      useStore.setState({ cinema: true });
      if (!st.visited.has(h.id)) { st.visited.add(h.id); live.moment = { x: near.x, y: height(near.x, near.z) + 2, z: near.z, t: 0, dur: 5 }; }
      const journey = s.mode === "journey" && s.journey === "hutrounds";
      if (journey) s.setProgress(r.delivered.length / HUTS.length);
      // the whole round done: in the journey, the ridge lights up and it ends; otherwise a new day's orders and a new season's stamps
      if (r.delivered.length === HUTS.length && journey) {
        setTimeout(() => { s.setExtra("endingLine", "The ridge knows your engine now."); s.finishJourney(); }, 7500);
      } else if (r.delivered.length === HUTS.length) {
        setTimeout(() => { r.delivered = []; r.doneAt = {}; s.setExtra("roundDay", day + 1); r.note = "New orders have come in for tomorrow."; r.noteT = 6; }, 8000);
      }
    }
  });

  return <>{items.map((o, i) => <primitive key={i} object={o.g} />)}</>;
}
