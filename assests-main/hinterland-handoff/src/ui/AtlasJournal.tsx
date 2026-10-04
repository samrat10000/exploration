// Journal: a card for every place you've found, drawn in the light you found it in.
import { useStore } from "../state/store";
import { PLACES, placesIn } from "../game/exploration/discoveries";
import { JOURNEYS, atlasState } from "../game/journeys/journeys";
import { HUTS } from "../game/rounds/rounds";

/** sky gradient + a name for the time of day a card was found in */
function light(tod: number): { sky: [string, string]; name: string } {
  if (tod < 0.5) return { sky: ["#8E9BC0", "#F0BFA4"], name: "Dawn" };
  if (tod < 1.5) return { sky: ["#B9D0DE", "#E7EEF0"], name: "Morning" };
  if (tod < 2.3) return { sky: ["#9FC1DC", "#F1D7A8"], name: "Late morning" };
  if (tod < 2.75) return { sky: ["#A9BED6", "#F2D2A2"], name: "Afternoon" };
  return { sky: ["#E9A86A", "#F7D9A0"], name: "Golden hour" };
}

export function AtlasJournal({ on }: { on: boolean }) {
  const postcards = useStore((s) => s.postcards), found = useStore((s) => s.found), done = useStore((s) => s.done);
  const regions = [...new Set(JOURNEYS.filter((j) => j.region && atlasState(j.id, done) !== "locked").map((j) => j.region!))];
  const stamps = (useStore((s) => s.extra.stamps) as Record<string, string[]> | undefined) ?? {};
  const missing = regions.flatMap((r) => placesIn(r)).filter((id) => !found.includes(id)).length;
  return (
    <section className={`view${on ? " on" : ""}`} aria-label="Journal">
      <div className="grid">
        {postcards.filter((p) => p.id in PLACES).map((p, i) => {
          const place = PLACES[p.id as keyof typeof PLACES], l = light(p.tod);
          return (
            <figure className="card" key={p.id}>
              <svg className="ph" viewBox="0 0 160 120">
                <defs><linearGradient id={`s${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={l.sky[0]} /><stop offset="1" stopColor={l.sky[1]} /></linearGradient></defs>
                <rect width="160" height="120" fill={`url(#s${i})`} />
                <path d="M0 80 L40 44 L62 62 L92 30 L130 70 L160 56 L160 120 L0 120Z" fill="#8C8FA0" opacity=".55" />
                <path d="M0 96 Q60 78 160 92 L160 120 L0 120Z" fill={place.ground} />
              </svg>
              <p>{place.name}</p>
              <small>{l.name}</small>
            </figure>
          );
        })}
        {Array.from({ length: missing }, (_, i) => <div className="card empty" key={`e${i}`}>Not found yet</div>)}
        <h3 className="stamps">Stamps<small>Every hut you've helped, and the season you visited.</small></h3>
        {HUTS.map((h) => stamps[h.id]?.length
          ? <figure className="card stampcard" key={h.id}>{stamps[h.id].map((se, k) => <div className="stamp" key={se} style={{ color: h.colour, borderColor: h.colour, marginLeft: k ? -50 : 0, transform: `rotate(${k * 9 - 4}deg)` }}>{h.name.toUpperCase()}<br />{h.emblem}<br />{se}</div>)}</figure>
          : <div className="card empty" key={h.id}>?</div>)}
      </div>
    </section>
  );
}
