// Frame cap (Settings → Graphics): 30 or 60 fps, or unlimited. While capped the canvas renders on demand and this
// asks for a frame at the chosen rate.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useStore } from "../state/store";

export function FrameCap() {
  const cap = useStore((s) => s.settings.fpsCap), invalidate = useThree((s) => s.invalidate), setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    if (cap === "off") { setFrameloop("always"); return; }
    setFrameloop("demand");
    const interval = 1000 / +cap;
    let next = 0, id = 0, n = 0;
    // an accumulator, so the average rate lands on the cap whatever the display's refresh rate
    const loop = (t: number) => { id = requestAnimationFrame(loop); if (t >= next) { next = Math.max(next + interval, t - interval); invalidate(); (window as unknown as { __adv?: number }).__adv = ++n; } };
    id = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(id); setFrameloop("always"); };
  }, [cap, invalidate, setFrameloop]);
  return null;
}
