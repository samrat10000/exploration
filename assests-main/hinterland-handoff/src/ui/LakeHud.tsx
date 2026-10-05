// Lake of Islands HUD: nine envelope glyphs bottom-left (lit once that island has its post) and the hold ring at a jetty.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";

export function LakeHud() {
  const [, tick] = useState(0), on = useStore((s) => s.region === "lake" && s.phase === "play" && s.vehicle === "boat" && !s.cinema);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 120); return () => clearInterval(id); }, []);
  if (!on) return null;
  const l = live.lake, ring = 2 * Math.PI * 9;
  return (
    <>
      <div id="lanterns" aria-hidden="true" className="post">{Array.from({ length: 9 }, (_, i) => <i key={i} className={l.done[i] ? "lit" : ""} />)}</div>
      {l.prompt && (
        <div id="holdt">
          <svg viewBox="0 0 24 24" width="30" height="30"><circle cx="12" cy="12" r="9" fill="none" stroke="rgba(244,239,229,.3)" strokeWidth="1.5" /><circle cx="12" cy="12" r="9" fill="none" stroke="#E9C47E" strokeWidth="1.5" strokeDasharray={`${ring * l.hold} ${ring}`} transform="rotate(-90 12 12)" /><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#F4EFE5">E</text></svg>
          <span>Hold to hand over the post</span>
        </div>
      )}
    </>
  );
}
