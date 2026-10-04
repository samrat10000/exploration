// Settings: quality, three volumes, camera motion. Every change is saved immediately.
import { useStore, type Quality, type Settings as S } from "../state/store";
import { Layer } from "./Layer";

const QUALITIES: [Quality, string][] = [["low", "Low"], ["medium", "Medium"], ["high", "High"], ["ultra", "Ultra"]];
const VOLUMES: [keyof Pick<S, "master" | "amb" | "eng">, string][] = [["master", "Master volume"], ["amb", "Nature"], ["eng", "Engine"]];

export function Settings() {
  const on = useStore((s) => s.settingsOpen);
  const settings = useStore((s) => s.settings);
  const { setSettings, closeSettings } = useStore.getState();
  return (
    <Layer on={on} id="settings" className="stack" label="Settings" focus>
      <h2>Settings</h2>
      <div className="row">
        <div className="lbl"><span>Graphics quality</span></div>
        <div className="seg">
          {QUALITIES.map(([q, label]) => (
            <button key={q} aria-pressed={settings.quality === q} onClick={() => setSettings({ quality: q })}>{label}</button>
          ))}
        </div>
        <div className="hint">Changes shadows, grass density and how far you can see.</div>
      </div>
      {VOLUMES.map(([k, label]) => (
        <div className="row" key={k}>
          <div className="lbl"><span>{label}</span><span>{settings[k]}</span></div>
          <input type="range" min={0} max={100} value={settings[k]} aria-label={label} onChange={(e) => setSettings({ [k]: +e.target.value })} />
        </div>
      ))}
      <div className="row">
        <div className="lbl"><span>Camera motion</span></div>
        <div className="seg">
          <button aria-pressed={settings.motion === "full"} onClick={() => setSettings({ motion: "full" })}>Full</button>
          <button aria-pressed={settings.motion === "calm"} onClick={() => setSettings({ motion: "calm" })}>Calm</button>
        </div>
        <div className="hint">Calm removes camera shake and speed zoom.</div>
      </div>
      <button className="back" onClick={closeSettings}>Back</button>
    </Layer>
  );
}
