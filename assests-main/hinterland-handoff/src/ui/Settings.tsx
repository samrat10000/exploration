// Settings (screens.html → Settings complete): four columns of plain rows (Graphics, Sound, Controls, Comfort).
// Every change applies live and is saved immediately; nothing needs a restart.
import type { ReactNode } from "react";
import { audio } from "../game/audio/audio";
import { useStore, type Quality, type Settings as S } from "../state/store";
import { Layer } from "./Layer";

const QUALITIES: [Quality, string][] = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["ultra", "Ultra"]];
const VOLUMES: [keyof Pick<S, "master" | "amb" | "eng" | "music">, string][] = [["master", "Master"], ["amb", "Nature"], ["eng", "Engine"], ["music", "Music"]];

function Seg<T extends string | boolean>({ label, hint, value, opts, set }: { label: string; hint?: string; value: T; opts: [T, string][]; set: (v: T) => void }) {
  return (
    <div className="row">
      <div className="lbl"><span>{label}</span></div>
      <div className="seg">{opts.map(([v, t]) => <button key={String(v)} aria-pressed={value === v} onClick={() => set(v)}>{t}</button>)}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
function Slider({ label, k, min = 0, max = 100, unit = "", hint }: { label: string; k: keyof Pick<S, "master" | "amb" | "eng" | "music" | "resScale" | "camSens">; min?: number; max?: number; unit?: string; hint?: string }) {
  const settings = useStore((s) => s.settings), { setSettings } = useStore.getState();
  return (
    <div className="row">
      <div className="lbl"><span>{label}</span><span>{settings[k]}{unit}</span></div>
      <input type="range" min={min} max={max} value={settings[k]} aria-label={label} onChange={(e) => setSettings({ [k]: +e.target.value })} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
const Col = ({ title, children }: { title: string; children: ReactNode }) => <div className="col"><h3>{title}</h3>{children}</div>;

export function Settings() {
  const on = useStore((s) => s.settingsOpen);
  const settings = useStore((s) => s.settings);
  const { setSettings, closeSettings } = useStore.getState();
  return (
    <Layer on={on} id="settings" className="cols" label="Settings" focus>
      <h2>Settings</h2>
      <Col title="Graphics">
        <Seg label="Quality" hint="Shadows, grass density and view distance." value={settings.quality} opts={QUALITIES} set={(q) => setSettings({ quality: q })} />
        <Slider label="Resolution scale" k="resScale" min={50} max={100} unit="%" />
        <Seg label="Frame cap" value={settings.fpsCap} opts={[["30", "30"], ["60", "60"], ["off", "Unlimited"]]} set={(v) => setSettings({ fpsCap: v })} />
      </Col>
      <Col title="Sound">
        {VOLUMES.map(([k, label]) => <Slider key={k} label={label} k={k} />)}
        <Seg label="Music" hint="M turns it on or off anywhere." value={audio.musicOn()} opts={[[true, "On"], [false, "Off"]]} set={(v) => { if (v !== audio.musicOn()) audio.toggleMusic(); }} />
      </Col>
      <Col title="Controls">
        <Seg label="Actions" hint="Tap once and let the ring finish, or hold it yourself." value={settings.holdMode} opts={[["hold", "Hold"], ["tap", "Tap"]]} set={(v) => setSettings({ holdMode: v })} />
        <Seg label="Flight pitch" hint="Normal: W noses down. Inverted: W noses up." value={settings.invertPitch} opts={[[false, "Normal"], [true, "Inverted"]]} set={(v) => setSettings({ invertPitch: v })} />
        <Slider label="Camera sensitivity" k="camSens" min={50} max={150} unit="%" />
      </Col>
      <Col title="Comfort">
        <Seg label="Camera motion" hint="Calm removes camera shake and speed zoom." value={settings.motion} opts={[["full", "Full"], ["calm", "Calm"]]} set={(v) => setSettings({ motion: v })} />
        <Seg label="Text size" value={settings.textSize} opts={[["s", "S"], ["m", "M"], ["l", "L"]]} set={(v) => setSettings({ textSize: v })} />
        <Seg label="Traveler lines" value={settings.travelerLines} opts={[[true, "On"], [false, "Off"]]} set={(v) => setSettings({ travelerLines: v })} />
        <Seg label="Prompts" hint="Stronger text and darker backing." value={settings.contrast} opts={[[false, "Normal"], [true, "High contrast"]]} set={(v) => setSettings({ contrast: v })} />
      </Col>
      <button className="back" onClick={closeSettings}>Back</button>
    </Layer>
  );
}
