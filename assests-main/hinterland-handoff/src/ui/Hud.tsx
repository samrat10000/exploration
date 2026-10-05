// The whole HUD: one objective line that fades while you drive, and key hints that leave on their own.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { WANDER_LINE, journey } from "../game/journeys/journeys";
import { Layer } from "./Layer";

const SEED_COL = ["#FBF8F2", "#F2C230", "#9A8AE0", "#E58AAE"];

export function Hud() {
  const playing = useStore((s) => s.phase === "play" && !s.sitting && !s.cutscene);
  const mode = useStore((s) => s.objMode);
  const line = useStore((s) => (s.mode === "journey" ? journey(s.journey).objective : WANDER_LINE[s.region]));
  const hints = useStore((s) => s.hints && s.phase === "play");
  const cargo = useStore((s) => !!s.crates);
  const horn = useStore((s) => ["mule", "bus", "tortoise", "snowcat", "boat"].includes(s.vehicle));
  const kettle = useStore((s) => s.region === "kettle" && s.mode === "journey");
  const progress = useStore((s) => s.progress);
  const pouch = (useStore((st) => st.extra.pouch) as number[] | undefined) ?? [];
  const [can, setCan] = useState(false);
  useEffect(() => { const id = setInterval(() => setCan(live.garden.can), 200); return () => clearInterval(id); }, []);
  const [still, setStill] = useState(false), [noteText, setNoteText] = useState(""), note = noteText !== "";
  useEffect(() => { const id = setInterval(() => { live.note.t = Math.max(0, live.note.t - 0.25); setNoteText(live.note.t > 0 ? live.note.text : ""); }, 250); return () => clearInterval(id); }, []);
  useEffect(() => { if (!kettle) return; const id = setInterval(() => setStill(live.car.still > 1.5), 300); return () => clearInterval(id); }, [kettle]);
  return (
    <>
      <Layer on={playing} id="scrim" />
      {pouch.length > 0 && playing && <div id="pouch"><span>seeds</span>{pouch.map((sp, i) => <i key={i} style={{ background: SEED_COL[sp] }} />)}</div>}
      {can && playing && <button id="plantprompt" onClick={() => dispatchEvent(new KeyboardEvent("keydown", { code: "KeyG" }))}><kbd>G</kbd> Plant a seed here</button>}
      <p id="note" className={playing && note ? "on" : ""}>{noteText}</p>
      <Layer on={playing && kettle && still} id="ascent"><i className="dot" style={{ bottom: `${22 + progress * 56}%` }} /></Layer>
      <Layer on={playing} id="objective" className={mode === "fresh" ? "" : mode} role="status">
        {line}
      </Layer>
      <Layer on={hints} id="keys">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</div>
        <div><kbd>Space</kbd> brake</div>
        {cargo && <div>hold <kbd>E</kbd> beside a fallen crate</div>}
        <div>drag to look around</div>
        {horn ? <div><kbd>H</kbd> horn &nbsp;<kbd>Esc</kbd> pause</div> : <div><kbd>H</kbd> hide hints &nbsp;<kbd>Esc</kbd> pause</div>}
      </Layer>
    </>
  );
}
