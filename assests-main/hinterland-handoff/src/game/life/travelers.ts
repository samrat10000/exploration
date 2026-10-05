// Travelers (JOURNEYS §1.7, screens → Traveler line): stop within 6 m and one line appears above their head: it fades
// in once you've been still for 0.6 s, holds 4 s + 0.06 s per character, then goes. Drive off and it leaves at once.
// 2–4 lines each; later lines unlock after journeys. The line each traveler is up to is remembered in the save (extra.lineIdx),
// so every stop is a new line. They never give quests and never block the trail.
import { useStore } from "../../state/store";

type Store = ReturnType<typeof useStore.getState>;
export interface Line { text: string; need?: (s: Store) => boolean }
export interface Traveler { id: string; x: number; y: number; z: number; lines: Line[] }

const doneJ = (id: string) => (s: Store) => (s.done as string[]).includes(id);
const found = (id: string) => (s: Store) => (s.found as string[]).includes(id);
const planted = (s: Store) => ((s.extra.garden as unknown[] | undefined)?.length ?? 0) > 0;
const stamped = (s: Store) => Object.keys((s.extra.stamps as object | undefined) ?? {}).length > 0;

export const LINES: Record<string, Line[]> = {
  farm: [
    { text: "Mind the corners with a full rack." },
    { text: "You made it up with the crates!", need: doneJ("longway") },
    { text: "The keeper hums when the lanterns are lit.", need: doneJ("longway") },
    { text: "Heard you've been doing the hut rounds down in the valley.", need: stamped },
  ],
  riverbend: [
    { text: "The river never hurries. Neither do I." },
    { text: "Highfall is loud this time of year.", need: found("falls") },
    { text: "They say you can see the whole valley from the ridge.", need: doneJ("overlook") },
  ],
  gate: [
    { text: "The gate's open. It always is." },
    { text: "Somebody planted flowers by the road. Lovely.", need: planted },
    { text: "Rain's good for the meadow. Not for the road.", need: found("overlook") },
  ],
  fisher: [
    { text: "Nothing's biting. That's the best part." },
    { text: "The tide pools have a whole town in them." },
    { text: "Wait for the sunset. It's worth the wait." },
  ],
  owl: [
    { text: "Hoo." },
    { text: "Whoo-hoo. Not many come this late." },
    { text: "The lights will take you the rest of the way." },
  ],
  deer: [
    { text: "(She watches you, and doesn't mind.)" },
    { text: "(She flicks an ear toward the glade.)" },
  ],
  lane: [
    { text: "Mind the mist near the pool." },
    { text: "That tarn up the slope: have you found it yet?", need: (s) => !(s.found as string[]).includes("tarn") },
    { text: "Everything you crossed, and everything you haven't.", need: doneJ("overlook") },
  ],
};

const st = new Map<string, { still: number; shownAt: number; spoke: boolean; away: number; text: string }>();

/**
 * One call per frame with the travelers of this region. Returns the speech label to show (or null).
 * `now` = seconds on the live clock.
 */
export function speak(list: Traveler[], car: { x: number; z: number; speed: number }, dt: number, now: number) {
  const s = useStore.getState();
  if (!s.settings.travelerLines) return null;
  let out: { text: string; x: number; y: number; z: number } | null = null;
  for (const t of list) {
    const e = st.get(t.id) ?? { still: 0, shownAt: -99, spoke: false, away: 99, text: "" };
    st.set(t.id, e);
    const near = Math.hypot(car.x - t.x, car.z - t.z) < 6.5, quiet = Math.abs(car.speed) < 0.8;
    if (!near) { e.still = 0; e.away += dt; if (e.away > 2) e.spoke = false; continue; }
    e.away = 0;
    if (!quiet) { e.still = 0; e.shownAt = -99; continue; } // drive off and the line leaves at once
    e.still += dt;
    if (e.still > 0.6 && !e.spoke) {
      const unlocked = t.lines.filter((l) => !l.need || l.need(s));
      if (!unlocked.length) continue;
      const idx = (s.extra.lineIdx as Record<string, number> | undefined) ?? {}, n = idx[t.id] ?? 0;
      e.spoke = true; e.shownAt = now; e.text = unlocked[n % unlocked.length].text;
      s.setExtra("lineIdx", { ...idx, [t.id]: n + 1 }); // the next stop gets the next line
    }
    if (e.spoke && now - e.shownAt < 4 + 0.06 * e.text.length) out = { text: e.text, x: t.x, y: t.y, z: t.z };
  }
  return out;
}
