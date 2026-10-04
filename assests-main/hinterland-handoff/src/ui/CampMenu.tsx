// Make camp menu (screens.html → "Make camp (Tortoise)"): four plain-text choices around "Camp · Saved".
// Arrow keys pick by direction, Enter confirms, Esc packs up. Photo joins when photo mode exists (3.6).
import { useEffect, useRef, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";

type Dir = "up" | "right" | "down" | "left";
const OPTIONS: { dir: Dir; label: string; act: () => void }[] = [
  { dir: "up", label: "Light the lantern", act: () => { live.camp.lantern = !live.camp.lantern; say(live.camp.lantern ? "The lantern glows. Moths find it at once." : "The lantern goes out."); } },
  { dir: "right", label: "Cook something", act: () => { live.camp.cookT = 8; say("Something sizzles in the pan."); } },
  { dir: "down", label: "Sleep until morning", act: () => sleep() },
  { dir: "left", label: "Pack up", act: () => useStore.setState({ sitting: false }) },
];
function say(line: string) { live.camp.line = line; live.camp.lineT = 4; }
function sleep() {
  useStore.setState({ fade: true });
  setTimeout(() => {
    live.env.tod = live.env.todTarget = 1; // morning
    live.camp.lantern = false;
    useStore.setState({ fade: false });
    say("Morning. Birdsong.");
    if (useStore.getState().extra["gift-forecast"]) live.camp.forecast = true;
  }, 1600);
}

export function CampMenu() {
  const on = useStore((s) => s.camping && s.sitting);
  const [sel, setSel] = useState<Dir>("up");
  const [, tick] = useState(0);
  const refs = useRef<Record<Dir, HTMLButtonElement | null>>({ up: null, right: null, down: null, left: null });
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!on) return;
    refs.current[sel]?.focus();
    const key = (e: KeyboardEvent) => {
      const d = ({ ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" } as Record<string, Dir>)[e.code];
      if (d) { e.preventDefault(); setSel(d); refs.current[d]?.focus(); }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [on, sel]);
  const c = live.camp;
  return (
    <>
      {on && (
        <div id="camp" role="menu" aria-label="Camp">
          <p className="centre"><span className="serif">Camp</span><small>Saved</small></p>
          {OPTIONS.map((o) => (
            <button key={o.dir} ref={(el) => { refs.current[o.dir] = el; }} className={`opt ${o.dir}${sel === o.dir ? " sel" : ""}`} onMouseEnter={() => setSel(o.dir)} onClick={o.act}>{o.label}</button>
          ))}
        </div>
      )}
      <p id="campline" className={c.lineT > 0 ? "on" : ""}>{c.line}</p>
      {c.prompt && !on && <div id="holdt"><span>Hold E to make camp</span></div>}
    </>
  );
}
