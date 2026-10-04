// Winch aim (screens.html → "Grapple winch: aim"), drawn from inside the canvas so it can project
// world points: while aiming, every anchor ring in view gets a dim dashed ring, the snapped target a
// solid sun ring with its distance, and a dotted arc previews the hook's flight. Plain DOM over the canvas.
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { live } from "../../../state/live";
import { useStore } from "../../../state/store";
import { ANCHORS } from "../../world/Anchors";

const _p = new Vector3(), _q = new Vector3();

export function WinchHud() {
  const camera = useThree((s) => s.camera);
  const el = useMemo(() => { const d = document.createElement("div"); d.id = "winch"; return d; }, []);
  useEffect(() => { document.body.appendChild(el); return () => { el.remove(); }; }, [el]);

  useFrame(() => {
    const w = live.winch, region = useStore.getState().region, anchors = ANCHORS[region], car = live.car;
    if (!w.aiming || w.state !== "idle" || live.vehicle !== "rover") { if (el.innerHTML) el.innerHTML = ""; return; }
    const W = innerWidth, H = innerHeight, toScreen = (v: Vector3) => { _p.copy(v).project(camera); return { x: ((_p.x + 1) / 2) * W, y: ((1 - _p.y) / 2) * H, ok: _p.z < 1 }; };
    let html = "";
    anchors.forEach((a, i) => {
      const s = toScreen(a.ring);
      if (!s.ok) return;
      const locked = i === w.target, d = Math.hypot(a.ring.x - car.x, a.ring.z - car.z);
      html += `<i class="ring${locked ? " lock" : ""}" style="left:${s.x}px;top:${s.y}px"></i>`;
      if (locked) {
        html += `<span class="dist" style="left:${s.x}px;top:${s.y + 44}px">${Math.round(d)} m</span>`;
        // the throw: a dotted arc from the winch to the ring
        let path = "";
        for (let k = 0; k <= 16; k++) {
          const t = k / 16;
          _q.set(car.x - Math.sin(car.yaw) * 2.5, car.y + 0.7, car.z - Math.cos(car.yaw) * 2.5).lerp(a.ring, t);
          _q.y += Math.sin(t * Math.PI) * 2.2;
          const p = toScreen(_q);
          path += `${k ? "L" : "M"}${p.x.toFixed(0)} ${p.y.toFixed(0)} `;
        }
        html += `<svg width="${W}" height="${H}"><path d="${path}" fill="none" stroke="rgba(233,196,126,.8)" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/></svg>`;
      }
    });
    if (w.target < 0) html += `<p class="hint">No ring in reach</p>`;
    el.innerHTML = html;
  });
  return null;
}
