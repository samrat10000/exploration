// Thin ice (screens.html → Thin ice): frosty screen edges and hairline cracks drawing in from the corners as you pass 6 m/s on the
// frozen lake, melting back when you ease off. No text, ever. The ice never breaks.
import { useEffect, useState } from "react";
import { live } from "../state/live";

export function IceFrost() {
  const [v, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set(live.ice), 80); return () => clearInterval(id); }, []);
  if (v < 0.02) return null;
  return (
    <div className="frost" style={{ opacity: Math.min(1, v * 1.2) }} aria-hidden="true">
      <svg viewBox="0 0 100 56" preserveAspectRatio="none"><path d="M0 50 L6 46 L9 48 L14 43 M0 8 L5 11 L7 9 L12 13 M100 48 L94 45 L91 47 L86 42 M100 6 L95 10 L92 8" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".25" /></svg>
    </div>
  );
}
