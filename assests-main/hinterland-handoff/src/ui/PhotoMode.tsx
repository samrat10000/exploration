// Photo mode (P): the world keeps moving, the vehicle holds still, the HUD goes away. Drag orbits, wheel
// dollies (within 12 m), a lens, a time nudge (local to photo mode). Enter / Take: a white flash, then the
// photo becomes a paper postcard. Saved to IndexedDB; the Journal reads it.
import { useEffect, useRef, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { clamp } from "../utils/noise";
import { LENSES, capture, savePhoto } from "../game/photo";
import { PLACES, placeAt } from "../game/exploration/discoveries";

const REGION: Record<string, string> = { valley: "The valley", kettle: "Kettle Peak" };
const lightName = (t: number) => (t < 0.5 ? "dawn" : t < 1.5 ? "morning" : t < 2.3 ? "late morning" : t < 2.75 ? "afternoon" : "golden hour");

export function PhotoMode() {
  const on = useStore((s) => s.photo), [, tick] = useState(0);
  const [card, setCard] = useState<{ url: string; name: string; t: number } | null>(null), [flash, setFlash] = useState(false), [hide, setHide] = useState(false);
  const base = useRef(0);
  const p = live.photo;

  const enter = () => {
    const s = useStore.getState();
    if (s.phase !== "play" || s.photo || s.cutscene || live.flight.on) return;
    base.current = live.env.todTarget; p.yaw = live.car.yaw + 0.5; p.pitch = 0.22; p.dist = 8; p.nudge = 0;
    useStore.setState({ photo: true });
  };
  const exit = () => { live.env.todTarget = base.current; useStore.setState({ photo: false }); };
  const take = () => {
    const canvas = document.querySelector<HTMLCanvasElement>("#world canvas");
    if (!canvas || hide) return;
    setHide(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const url = capture(canvas), s = useStore.getState(), car = live.car, place = placeAt(car.x, car.z, 0, car.y);
      const name = place ? PLACES[place].name : `${REGION[s.region]}, ${lightName(live.env.tod)}`;
      setHide(false); setFlash(true); setTimeout(() => setFlash(false), 250);
      void savePhoto({ id: Date.now(), name, url, t: Date.now() });
      setCard({ url, name, t: Date.now() });
      setTimeout(() => setCard(null), 3600);
    }));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const photo = useStore.getState().photo;
      if (e.code === "KeyP" && !e.repeat) { e.preventDefault(); if (photo) exit(); else enter(); }
      else if (photo) {
        if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); take(); }
        else if (e.code === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); exit(); }
      }
    };
    addEventListener("keydown", key, true);
    return () => removeEventListener("keydown", key, true);
  });
  useEffect(() => {
    if (!on) return;
    document.body.classList.add("photo");
    const el = document.getElementById("world")!;
    let drag = false, lx = 0, ly = 0;
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; };
    const move = (e: PointerEvent) => { if (!drag) return; p.yaw -= (e.clientX - lx) * 0.006; p.pitch = clamp(p.pitch + (e.clientY - ly) * 0.004, -0.1, 1.2); lx = e.clientX; ly = e.clientY; };
    const up = () => { drag = false; };
    const wheel = (e: WheelEvent) => { p.dist = clamp(p.dist + e.deltaY * 0.01, 2.5, 12); };
    el.addEventListener("pointerdown", down, true); addEventListener("pointermove", move); addEventListener("pointerup", up); el.addEventListener("wheel", wheel);
    return () => { document.body.classList.remove("photo"); el.removeEventListener("pointerdown", down, true); removeEventListener("pointermove", move); removeEventListener("pointerup", up); el.removeEventListener("wheel", wheel); };
  }, [on, p]);

  const nudge = (d: number) => { p.nudge = clamp(p.nudge + d, -0.45, 0.45); live.env.todTarget = clamp(base.current + p.nudge, 0, 5); tick((n) => n + 1); };
  return (
    <div className="photoui">
      {on && !hide && (
        <>
          <div className="thirds" /><i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          <div className="pbar">
            <button onClick={() => { p.lens = (p.lens + 1) % LENSES.length; tick((n) => n + 1); }}>Lens <b>{LENSES[p.lens][0]}</b></button>
            <span>Time <button aria-label="Earlier" onClick={() => nudge(-0.15)}>−</button><b>{p.nudge === 0 ? "now" : `${p.nudge > 0 ? "+" : ""}${(p.nudge / 0.3).toFixed(1)} h`}</b><button aria-label="Later" onClick={() => nudge(0.15)}>+</button></span>
            <button className="take" onClick={take}>Take</button>
            <button onClick={exit}>Done</button>
          </div>
          <p className="phelp">Drag to orbit · scroll to move closer · Enter to take · P to leave</p>
        </>
      )}
      {flash && <div className="flash" />}
      {card && <div className="postcard" key={card.t}><img src={card.url} alt="" /><b>{card.name}</b><small>Saved to the journal</small></div>}
    </div>
  );
}
