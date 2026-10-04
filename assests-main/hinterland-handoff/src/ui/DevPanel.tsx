// Dev panel (F3), dev builds only (lazy-loaded): stats, journey beats + scrub, time and weather,
// vehicle + cargo tools, debug toggles. For checking work and setting up screenshots.
import { useEffect, useState, type ReactNode } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { mix } from "../utils/noise";
import { beats, poseAt, turnAt } from "../game/DevScene";
import { journey } from "../game/journeys/journeys";

const HOURS = [6, 9, 13, 17.5, 19.5]; // tod 0 dawn … 4 sunset, as a clock
const clockAt = (tod: number) => {
  const i = Math.min(3, Math.floor(tod)), h = mix(HOURS[i], HOURS[i + 1], tod - i);
  return `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
};

/** Move the vehicle to progress p on this region's route, with the journey's light for it. */
function goTo(p: number, pose = poseAt(useStore.getState().region, p)) {
  const s = useStore.getState();
  if (s.phase !== "play" || !live.teleport) return;
  p = Math.max(0, Math.min(1, p));
  live.teleport(pose.x, pose.z, pose.yaw);
  Object.assign(live.safe, pose);
  useStore.setState({ progress: p });
  if (s.mode === "journey" && live.dev.tod === null) {
    const j = journey(s.journey);
    live.env.tod = live.env.todTarget = Math.max(mix(j.tod.from, j.tod.to, p), s.todFloor);
  }
}

function toggle(k: "panel" | "freeCam" | "colliders" | "spline" | "triggers" | "slow" | "hideUi") {
  live.dev[k] = !live.dev[k];
  if (k === "hideUi") document.body.classList.toggle("dev-hide-ui", live.dev.hideUi);
}

const Chip = ({ on, onClick, children }: { on?: boolean; onClick(): void; children: ReactNode }) => (
  // never takes focus, so Space (brake) can't press it again
  <button className={on ? "chip on" : "chip"} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>{children}</button>
);

export default function DevPanel() {
  const [, tick] = useState(0);
  const s = useStore();
  const d = live.dev;

  useEffect(() => {
    const id = setInterval(() => { if (live.dev.panel) tick((n) => n + 1); }, 200);
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState();
      const k = e.code, on = live.dev.panel;
      if (k === "F3") toggle("panel");
      else if (k === "F4") toggle("freeCam");
      else if (k === "F6") toggle("hideUi");
      else if (!on || e.repeat) return;
      else if (k === "BracketLeft" || k === "BracketRight") goTo(st.progress + (k === "BracketLeft" ? -0.02 : 0.02));
      else if (k === "KeyT") live.dev.tod = ((live.dev.tod ?? live.env.tod) + 0.5) % 4.5;
      else if (/^Digit[1-7]$/.test(k)) { const b = beats(st.region)[+k.slice(5) - 1]; if (b) goTo(b.p, b.pose); }
      else return;
      e.preventDefault();
      tick((n) => n + 1);
    };
    addEventListener("keydown", onKey);
    return () => { clearInterval(id); removeEventListener("keydown", onKey); };
  }, []);

  if (!d.panel) return null;
  const st = d.stats, car = live.car, j = journey(s.journey), bs = beats(s.region), tod = live.env.tod;
  const re = () => tick((n) => n + 1);
  const crates = s.crates;
  return (
    <div id="dev">
      <h4>HINTERLAND · DEV</h4>
      <div className="row"><span>fps {st.fps.toFixed(0)}</span><span>frame {st.ms.toFixed(1)} ms</span><span>draws {st.calls}</span><span>tris {(st.tris / 1e6).toFixed(2)}M</span></div>

      <div className="sec">
        <div className="row"><span>journey</span><span>J{j.n} {j.id} · {s.mode}</span></div>
        <div className="row"><span>progress</span><span>{s.progress.toFixed(3)}{s.region === "kettle" ? ` · turn ${turnAt(s.progress)}` : ""}</span></div>
        <div className="bar" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); goTo((e.clientX - r.left) / r.width); re(); }}><i style={{ width: `${s.progress * 100}%` }} /></div>
        <div>{bs.map((b, i) => <Chip key={b.name} on={Math.abs(s.progress - b.p) < 0.01} onClick={() => { goTo(b.p, b.pose); re(); }}>{i + 1} {b.name}</Chip>)}</div>
      </div>

      <div className="sec">
        <div className="row"><span>time</span><span>{clockAt(tod)} · tod {tod.toFixed(2)}{d.tod === null ? " · auto" : ""}</span></div>
        <input type="range" min={0} max={4} step={0.01} value={tod} aria-label="Time of day"
          onChange={(e) => { d.tod = +e.target.value; re(); }} onPointerUp={(e) => e.currentTarget.blur()} />
        <div>
          <Chip on={d.tod === null} onClick={() => { d.tod = null; re(); }}>auto</Chip>
          {(["clear", "fog", "snow"] as const).map((w) => <Chip key={w} on={d.weather === w} onClick={() => { d.weather = d.weather === w ? null : w; re(); }}>{w === "fog" ? "fog band" : w}</Chip>)}
        </div>
      </div>

      <div className="sec">
        <div className="row"><span>post</span><Chip on={live.post.on} onClick={() => { live.post.on = !live.post.on; re(); }}>{live.post.on ? "on" : "off"}</Chip></div>
        {([["bloom", 0, 1.5, 0.01], ["ao", 0, 3, 0.05], ["vignette", 0, 0.8, 0.01], ["sat", 0.5, 1.2, 0.01], ["exposure", 0.6, 1.6, 0.01]] as const).map(([k, lo, hi, st]) => (
          <div className="row" key={k}><span>{k} {live.post[k].toFixed(2)}</span><input type="range" min={lo} max={hi} step={st} value={live.post[k]} aria-label={k} onChange={(e) => { live.post[k] = +e.target.value; re(); }} onPointerUp={(e) => e.currentTarget.blur()} /></div>
        ))}
      </div>

      <div className="sec">
        <div className="row"><span>vehicle</span><span>{s.vehicle} · {Math.abs(car.speed).toFixed(1)} m/s · lat {Math.abs(live.latAccel).toFixed(1)} m/s²</span></div>
        <div>
          {(["rover", "mule", "bus", "tortoise", "snowcat"] as const).map((v) => <Chip key={v} on={s.vehicle === v} onClick={() => { if (s.vehicle !== v) { live.spawnAt = { x: car.x, z: car.z, yaw: car.yaw }; useStore.setState({ vehicle: v }); } }}>{v}</Chip>)}
          <Chip on={s.vehicle === "skymule"} onClick={() => { live.flight.start = "air"; live.spawnAt = { x: car.x, z: car.z, yaw: car.yaw }; useStore.setState({ vehicle: "skymule" }); }}>sky mule (fly)</Chip>
          <Chip on={s.vehicle === "glider"} onClick={() => { live.flight.start = "air"; live.spawnAt = { x: car.x, z: car.z, yaw: car.yaw }; useStore.setState({ vehicle: "glider" }); }}>glider (fly)</Chip>
        </div>
        <div style={{ marginTop: 4 }}>
          {crates && <span className="chip">cargo {crates.filter((c) => c === "on").length}/{crates.length}</span>}
          <Chip onClick={() => live.cargoApi?.dropAll()}>drop all</Chip>
          <Chip onClick={() => live.cargoApi?.reloadAll()}>reload all</Chip>
          <Chip onClick={() => live.teleport?.(car.x, car.z, car.yaw)}>reset</Chip>
        </div>
      </div>

      <div className="sec">
        <Chip on={d.colliders} onClick={() => { toggle("colliders"); re(); }}>colliders</Chip>
        <Chip on={d.spline} onClick={() => { toggle("spline"); re(); }}>spline</Chip>
        <Chip on={d.triggers} onClick={() => { toggle("triggers"); re(); }}>triggers</Chip>
        <Chip on={d.freeCam} onClick={() => { toggle("freeCam"); re(); }}>free cam</Chip>
        <Chip on={d.hideUi} onClick={() => { toggle("hideUi"); re(); }}>hide UI</Chip>
        <Chip on={d.slow} onClick={() => { toggle("slow"); re(); }}>slow-mo</Chip>
      </div>
      <div className="sec dim">F3 panel · F4 free cam (WASD, Q/E, Shift, drag) · F6 hide UI · [ ] scrub · T time · 1–{bs.length} teleport</div>
    </div>
  );
}
