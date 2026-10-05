// The finale's credits (J14): place names drifting up one at a time at the lower left while you glide, then a last thank-you.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { JOURNEYS } from "../game/journeys/journeys";

const LINES = [...JOURNEYS.filter((j) => j.id !== "above").map((j) => j.title), "Thank you for driving slowly."];

export function Credits() {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(id); }, []);
  const c = live.credits;
  if (!c.on) return null;
  const SPAN = 7, i = Math.floor(c.t / SPAN), u = (c.t % SPAN) / SPAN, line = LINES[Math.min(i, LINES.length - 1)];
  if (i >= LINES.length + 1) return null;
  const a = Math.min(1, u * 4, (1 - u) * 4);
  return <p id="credits" style={{ opacity: a, transform: `translateY(${(0.5 - u) * 36}px)` }}>{line}</p>;
}
