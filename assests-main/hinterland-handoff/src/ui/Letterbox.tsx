// Cinematic bars + the black veil. Bars belong to cinematic moments only (title, intro, discovery).
import { useEffect } from "react";
import { useStore } from "../state/store";
import { journey } from "../game/journeys/journeys";
import { InkSketch } from "./InkSketch";
import { Layer } from "./Layer";

export function Letterbox() {
  const cinema = useStore((s) => s.cinema);
  const veil = useStore((s) => s.veil);
  const veilText = useStore((s) => s.veilText);
  const line = useStore((s) => journey(s.journey).line);
  useEffect(() => { document.body.classList.toggle("cinema", cinema); }, [cinema]);
  return (
    <>
      <div className="bar top" />
      <div className="bar bottom" />
      <Layer on={veil} id="veil" className={veilText ? "paper" : ""}><p>{veilText}</p>{veilText && <><InkSketch name={veilText} /><small>{line}</small><i className="hair" /></>}</Layer>
    </>
  );
}
