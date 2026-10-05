// Make camp menu (screens.html → "Make camp (Tortoise)"): four plain-text choices around "Camp · Saved".
// Arrow keys pick by direction, Enter confirms, Esc packs up. Take a photo opens photo mode.
// At night, Fireworks (F) starts a show over the most open view; the menu steps aside and the camera frames the van and the sky.
import { useEffect, useRef, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { height } from "../game/world/height";

type Dir = "up" | "right" | "down" | "left" | "mid";
const OPTIONS: { dir: Dir; label: string; act: () => void }[] = [
  { dir: "up", label: "Light the lantern", act: () => { live.camp.lantern = !live.camp.lantern; say(live.camp.lantern ? "The lantern glows. Moths find it at once." : "The lantern goes out."); } },
  { dir: "right", label: "Cook something", act: () => { live.camp.cookT = 8; say("Something sizzles in the pan."); } },
  { dir: "down", label: "Sleep until morning", act: () => sleep() },
  { dir: "mid", label: "Fireworks", act: fireworks },
  { dir: "left", label: "Take a photo", act: () => dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP" })) }, // you stay at camp; the menu comes back when the camera is put away
];
// the direction with the lowest skyline from the van, so the hills never hide the bursts
function openest() {
  const c = live.car;
  let best = 0, bestTan = Infinity;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
    let tan = -Infinity;
    for (let d = 14; d <= 150; d += 8) tan = Math.max(tan, (height(c.x + dx * d, c.z + dz * d) - c.y - 2) / d);
    if (tan < bestTan - 0.01) { bestTan = tan; best = a; }
  }
  return { dx: Math.sin(best), dz: Math.cos(best) };
}
function fireworks() {
  const c = live.camp, car = live.car;
  if (c.fw) { live.fireworks?.show(null); c.fw = null; say("The last sparks drift down."); return; }
  if (live.env.stars < 0.5) { say("Fireworks need the dark. Wait for nightfall, or pick Night in Settings."); return; }
  const d = openest(), D = 66, x = car.x + d.dx * D, z = car.z + d.dz * D;
  c.fw = d; c.fwMenu = false; c.lantern = true;
  live.fireworks?.show({ x, y: Math.max(height(x, z), car.y - 25), z }, 34, 40);
  say("Fireworks. Drag to look, scroll to come closer. Enter for the menu.");
}
function say(line: string) { live.camp.line = line; live.camp.lineT = 4; }
function sleep() {
  useStore.setState({ fade: true });
  setTimeout(() => {
    live.env.tod = live.env.todTarget = 1; // morning
    live.camp.lantern = false;
    if (live.camp.fw) { live.fireworks?.show(null); live.camp.fw = null; }
    useStore.setState({ fade: false });
    say("Morning. Birdsong.");
    if (useStore.getState().extra["gift-forecast"]) live.camp.forecast = true;
  }, 1600);
}

export function CampMenu() {
  const on = useStore((s) => s.camping && s.sitting && !s.photo);
  const [sel, setSel] = useState<Dir>("up");
  const [, tick] = useState(0);
  const refs = useRef<Record<Dir, HTMLButtonElement | null>>({ up: null, right: null, down: null, left: null, mid: null });
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!on) return;
    refs.current[sel]?.focus();
    const key = (e: KeyboardEvent) => {
      const c = live.camp;
      if (e.code === "KeyF" && !e.repeat) { e.preventDefault(); fireworks(); tick((n) => n + 1); return; }
      // while the show runs the menu steps aside; Enter or an arrow brings it back
      if (c.fw && !c.fwMenu) { if (e.code === "Enter" || e.code.startsWith("Arrow")) { e.preventDefault(); c.fwMenu = true; tick((n) => n + 1); } return; }
      const d = ({ ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left" } as Record<string, Dir>)[e.code];
      if (d) { e.preventDefault(); setSel(d); refs.current[d]?.focus(); }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [on, sel]);
  const c = live.camp, show = on && (!c.fw || c.fwMenu), night = live.env.stars >= 0.5;
  return (
    <>
      {show && (
        <div id="camp" role="menu" aria-label="Camp">
          <p className="centre"><span className="serif">Camp</span><small>Saved</small></p>
          {OPTIONS.map((o) => (
            <button key={o.dir} ref={(el) => { refs.current[o.dir] = el; }} className={`opt ${o.dir}${sel === o.dir ? " sel" : ""}`} onMouseEnter={() => setSel(o.dir)} onClick={o.act} disabled={o.dir === "mid" && !night && !c.fw}>{o.dir === "mid" ? <>{c.fw ? "Stop the fireworks" : night ? "Fireworks" : "Fireworks after dark"} <kbd>F</kbd></> : o.label}</button>
          ))}
        </div>
      )}
      <p id="campline" className={c.lineT > 0 ? "on" : ""}>{c.line}</p>
      {c.prompt && !on && <div id="holdt"><span>Hold E to make camp</span></div>}
    </>
  );
}
