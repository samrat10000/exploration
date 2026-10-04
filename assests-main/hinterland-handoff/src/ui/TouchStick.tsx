// Left-half drag stick for touch screens.
import { useRef, useState, type PointerEvent } from "react";
import { isTouch, useStore } from "../state/store";
import { touch } from "../game/vehicle/input";
import { clamp } from "../utils/noise";
import { Layer } from "./Layer";

export function TouchStick() {
  const on = useStore((s) => s.phase === "play") && isTouch;
  const st = useRef({ id: -1, x0: 0, y0: 0 }).current;
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    st.id = e.pointerId; st.x0 = e.clientX; st.y0 = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
    setStick({ x: st.x0, y: st.y0, dx: 0, dy: 0 });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== st.id) return;
    const dx = clamp((e.clientX - st.x0) / 50, -1, 1), dy = clamp((e.clientY - st.y0) / 50, -1, 1);
    touch.steer = -dx;
    touch.throttle = -dy;
    setStick({ x: st.x0, y: st.y0, dx, dy });
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== st.id) return;
    st.id = -1;
    touch.steer = touch.throttle = 0;
    setStick(null);
  };

  return (
    <>
      <Layer on={on} id="touch">
        <div style={{ position: "absolute", inset: 0 }} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
      </Layer>
      <div id="stick" className={stick ? "on" : ""} style={stick ? { left: stick.x, top: stick.y } : undefined}>
        <i style={stick ? { transform: `translate(${stick.dx * 36}px,${stick.dy * 36}px)` } : undefined} />
      </div>
    </>
  );
}
