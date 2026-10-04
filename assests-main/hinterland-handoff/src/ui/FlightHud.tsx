// Flight HUD (screens.html → Flight HUD, Transformation, Landing approach): an altitude ribbon on the
// left edge, three puff dots, the hold-T ring, and a few one-time words. No gauges, no numbers.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";

let slowHintShown = false;

export function FlightHud() {
  const [, tick] = useState(0);
  const playing = useStore((s) => s.phase === "play" && !s.cinema);
  useEffect(() => {
    let id = 0;
    const f = () => { tick((n) => n + 1); id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, []);
  const fl = live.flight, s = useStore.getState();
  const seen = (s.extra.risingSeen as number | undefined) ?? 0, landed = (s.extra.landingsSeen as number | undefined) ?? 0;
  // "rising air" names it the first two times only; the slow hint once a session
  const showRising = fl.on && fl.rising > 1 && seen <= 2;
  const showSlow = fl.on && fl.slowT > 3 && !slowHintShown;
  if (showSlow) setTimeout(() => { slowHintShown = true; }, 4000);
  const PROMPTS = { unfold: "Hold T to unfold the wings", fold: "Hold T to fold the wings away", boat: "Hold T to float the Rover", ashore: "Hold T to drive ashore" };
  const prompt = fl.prompt && playing ? PROMPTS[fl.prompt] : "";
  const ring = 2 * Math.PI * 9;
  return (
    <>
      {fl.on && playing && (
        <div id="flight" aria-hidden="true">
          <div className="ribbon">
            {fl.goal01 >= 0 && <i className="goal" style={{ bottom: `${fl.goal01 * 100}%` }} />}
            {fl.band && <i className="storm" style={{ bottom: `${fl.band[0] * 100}%`, height: `${(fl.band[1] - fl.band[0]) * 100}%` }}><small>storm</small></i>}
            <i className="you" style={{ bottom: `${fl.alt01 * 100}%` }} />
            {showRising && <span className="rising" style={{ bottom: `${fl.alt01 * 100}%` }}>rising air</span>}
          </div>
          {fl.puffs >= 0 && <div className="puffs">{[0, 1, 2].map((k) => <i key={k} className={k < fl.puffs ? "full" : ""} />)}</div>}
        </div>
      )}
      {fl.on && playing && fl.storm > 0.02 && <div className="stormfx" style={{ opacity: fl.storm }}><div className="rainfx" /></div>}
      {fl.on && fl.flash > 0.01 && <div className="bolt" style={{ opacity: fl.flash * 0.7 }} />}
      {fl.on && fl.hit > 0.01 && playing && <div className="birdhit" style={{ opacity: fl.hit }} />}
      {fl.on && fl.warn > 0 && playing && <p id="weathernote" style={{ opacity: Math.min(1, fl.warn) }}>Weather coming in</p>}
      {showSlow && playing && <p id="flighthint">Nose down to pick up speed</p>}
      {fl.on && fl.nearLanding && landed < 2 && playing && <p id="flighthint">Touch down inside the ring of light</p>}
      {prompt && (
        <div id="holdt">
          <svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(244,239,229,.3)" strokeWidth="1.5" /><circle cx="12" cy="12" r="9" fill="none" stroke="#E9C47E" strokeWidth="1.5" strokeDasharray={`${ring * fl.hold} ${ring}`} transform="rotate(-90 12 12)" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#F4EFE5">T</text></svg>
          <span>{prompt}</span>
        </div>
      )}
    </>
  );
}
