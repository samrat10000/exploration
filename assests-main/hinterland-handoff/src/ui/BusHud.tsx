// Bus HUD (screens.html → "Bus stops + passengers"): a paper ticket with the next stop (top-left),
// seat dots (bottom-left), one line at a time from the passengers, and the hold-E ring at a stop.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";

export function BusHud() {
  const [, tick] = useState(0);
  const playing = useStore((s) => s.phase === "play" && !s.cinema);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 150); return () => clearInterval(id); }, []);
  const b = live.bus;
  if (!b.on || !playing) return null;
  const ring = 2 * Math.PI * 9;
  return (
    <>
      <div id="ticket"><small>Next stop</small><b>{b.next}</b>{b.then.length > 0 && <small>then {b.then.join(" · ")}</small>}</div>
      <div id="seats">{Array.from({ length: 12 }, (_, k) => <i key={k} className={k < b.seats.length ? "full" : ""} />)}</div>
      <p id="busline" className={b.lineT > 0 ? "on" : ""}>{b.line}</p>
      {b.prompt && (
        <div id="holdt">
          <svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(244,239,229,.3)" strokeWidth="1.5" /><circle cx="12" cy="12" r="9" fill="none" stroke="#E9C47E" strokeWidth="1.5" strokeDasharray={`${ring * b.hold} ${ring}`} transform="rotate(-90 12 12)" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#F4EFE5">E</text></svg>
          <span>Hold E to open the doors</span>
        </div>
      )}
    </>
  );
}
