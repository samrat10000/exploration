import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { Layer } from "./Layer";

export function DiscoveryCard() {
  const card = useStore((s) => (s.phase === "paused" ? null : s.card)); // never under the pause menu
  // keep the last text while the card fades out
  const [shown, setShown] = useState(card);
  useEffect(() => { if (card) setShown(card); }, [card]);
  return (
    <Layer on={!!card} id="found" role="status">
      <p className="name">{shown?.name}</p>
      <p className="line">{shown?.line}</p>
      <div className="rule" />
    </Layer>
  );
}
