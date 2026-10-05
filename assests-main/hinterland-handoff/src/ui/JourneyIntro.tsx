// Journey intro (screens.html → Journey intro): kicker, title, line, meta fade in one after another over the
// letterboxed glide, then all go out together before control returns.
import { useStore } from "../state/store";
import { journey } from "../game/journeys/journeys";

export function JourneyIntro() {
  const on = useStore((s) => s.phase === "intro" && s.mode === "journey");
  const j = journey(useStore((s) => s.journey));
  return (
    <div id="intro" className={on ? "on" : ""} aria-hidden={!on}>
      <p className="k">Journey {j.n}</p>
      <h1>{j.title}</h1>
      <p className="l">{j.line}</p>
      <p className="m">{j.veh} · {j.len}</p>
    </div>
  );
}
