// Hut Rounds HUD (screens.html → order slips, Hut visit, Stamp passport): paper slips top-left (hidden
// while driving fast, back when stopped or on Tab), the load / hand-over ring, one note line, and the
// hut visit: keeper speech, Given → Received, and the stamp pressing down.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { HUTS, bagText, count, type Bag } from "../game/rounds/rounds";

export function RoundsHud() {
  const [, tick] = useState(0), [tab, setTab] = useState(false);
  const playing = useStore((s) => s.phase === "play");
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 120);
    const d = (e: KeyboardEvent) => { if (e.code === "Tab") { e.preventDefault(); setTab(true); } }, u = (e: KeyboardEvent) => { if (e.code === "Tab") setTab(false); };
    addEventListener("keydown", d); addEventListener("keyup", u);
    return () => { clearInterval(id); removeEventListener("keydown", d); removeEventListener("keyup", u); };
  }, []);
  const r = live.rounds;
  if (!r.on || !playing) return null;
  const fast = Math.abs(live.car.speed) > 4 && !tab;
  // up to 4 slips: undelivered first; a delivered one stays struck through for 2 s, then slides away
  const slips = HUTS.filter((h) => !r.delivered.includes(h.id) || live.clock - (r.doneAt[h.id] ?? -9) < 2.6).slice(0, 4);
  const ring = 2 * Math.PI * 9, carried = r.carried as Bag, v = r.visit;
  return (
    <>
      <div id="slips" className={fast || v ? "away" : ""}>
        {slips.map((h) => <div key={h.id} className={`slip${r.delivered.includes(h.id) ? " done" : ""}`}><b>{h.name}</b>{bagText(h.order)}</div>)}
        {count(carried) > 0 && <small>Carrying {bagText(carried)}</small>}
      </div>
      <p id="busline" className={r.noteT > 0 && !v ? "on" : ""}>{r.note}</p>
      {r.prompt && (
        <div id="holdt">
          <svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(244,239,229,.3)" strokeWidth="1.5" /><circle cx="12" cy="12" r="9" fill="none" stroke="#E9C47E" strokeWidth="1.5" strokeDasharray={`${ring * r.hold} ${ring}`} transform="rotate(-90 12 12)" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#F4EFE5">E</text></svg>
          <span>{r.prompt === "load" ? "Hold E to load the crates" : "Hold E to hand over the order"}</span>
        </div>
      )}
      {v && (
        <>
          <div id="visit"><small>{v.keeper}, {v.name.toLowerCase()}</small><p>{v.line}</p></div>
          <div id="swap"><div><small>Given</small><span>{v.given}</span></div><i>→</i><div><small>Received</small><span>{v.received}</span></div></div>
          <div id="stampcard" className={v.t > 2 && v.t < 6 ? "in" : ""}><div className="stamp" style={{ color: v.colour, borderColor: v.colour }}>{v.name.toUpperCase()}<br />{v.emblem}<br />{v.stamp}</div></div>
        </>
      )}
    </>
  );
}
