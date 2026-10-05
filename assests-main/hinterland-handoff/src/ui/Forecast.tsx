// Forecast (screens.html → Forecast): after helping the weather station, sleeping at camp offers
// tomorrow's weather as four plain-text choices. Arrows pick, Enter confirms. Clear and Mist change the
// fog; Mist, Rain and First snow arrive slowly as real weather (Weather.tsx).
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";

export const FORECASTS = [["clear", "Clear", "sun all day"], ["mist", "Mist", "mornings in cloud"], ["rain", "Rain", "soft, then a rainbow"], ["snow", "First snow", "high ground only"]] as const;
/** fog multiplier a forecast asks of the sky */
export const forecastFog = (f: unknown) => (f === "clear" ? 0.8 : 1);

export function Forecast() {
  const [, tick] = useState(0), [sel, setSel] = useState(2);
  const open = live.camp.forecast;
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 150); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") setSel((n) => Math.max(0, n - 1));
      else if (e.code === "ArrowRight") setSel((n) => Math.min(3, n + 1));
      else if (e.code === "Enter") { useStore.getState().setExtra("forecast", FORECASTS[sel][0]); live.camp.forecast = false; }
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    addEventListener("keydown", key, true);
    return () => removeEventListener("keydown", key, true);
  }, [open, sel]);
  if (!open) return null;
  return (
    <div id="forecast" role="menu" aria-label="Tomorrow's weather">
      {FORECASTS.map(([id, name, sub], i) => (
        <button key={id} className={i === sel ? "sel" : ""} onMouseEnter={() => setSel(i)} onClick={() => { useStore.getState().setExtra("forecast", id); live.camp.forecast = false; }}>
          <span className="serif">{name}</span><small>{sub}</small>{i === sel && <i />}
        </button>
      ))}
    </div>
  );
}
