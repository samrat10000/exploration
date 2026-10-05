// Ambient clouds: cozy puff cumulus (CozyClouds.tsx) drifting slowly across the sky. The first 8 sit low,
// tucked below the northern peaks; the rest float high, never on the flight line.
import { useMemo } from "react";
import { useStore } from "../../state/store";
import { hash } from "../../utils/noise";
import { CloudSet, makeCloudSet } from "./CozyClouds";

const WRAP = 1800;

export function Clouds() {
  const quality = useStore((s) => s.settings.quality);
  const set = useMemo(() => {
    const s = makeCloudSet(), n = quality === "low" ? 22 : 34;
    for (let i = 0; i < n; i++) {
      const low = i < 8, ang = hash(i, 9) * Math.PI * 2, rad = low ? 160 + hash(i, 2) * 80 : 380 + hash(i, 3) * 500;
      // x is folded into one wrap period so the drifting field repeats without a seam
      const x = ((Math.cos(ang) * rad + WRAP / 2) % WRAP + WRAP) % WRAP - WRAP / 2;
      s.cumulus(x, low ? 44 + hash(i, 4) * 18 : 130 + hash(i, 5) * 180, low ? -150 - hash(i, 6) * 90 : Math.sin(ang) * rad - 150, low ? 28 + hash(i, 7) * 22 : 55 + hash(i, 8) * 70, i + 1);
    }
    return s;
  }, [quality]);
  return <CloudSet set={set} drift={2.2} wrap={WRAP} />;
}
