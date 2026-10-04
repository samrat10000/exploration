// Crates on the rack: a quiet row of glyphs, bottom-left. It brightens for 3 s when one shifts or falls.
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Layer } from "./Layer";

export function CargoHud() {
  const crates = useStore((s) => s.crates);
  const changed = useStore((s) => s.cratesChanged);
  const playing = useStore((s) => s.phase === "play" || s.phase === "paused");
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (!changed) return;
    setLit(true);
    const t = setTimeout(() => setLit(false), 3000);
    return () => clearTimeout(t);
  }, [changed]);
  return (
    <Layer on={!!crates && playing} id="cargo" className={lit ? "lit" : ""} label="Crates">
      {crates?.map((c, i) => <i key={i} className={c} />)}
    </Layer>
  );
}

/** No-fail recovery: the screen dips to 40% black while the vehicle is set back. No text. */
export function RecoveryFade() {
  const on = useStore((s) => s.fade);
  return <div id="fade" className={on ? "on" : ""} aria-hidden="true" />;
}
