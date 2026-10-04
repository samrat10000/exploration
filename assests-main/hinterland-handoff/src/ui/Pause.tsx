import { useStore } from "../state/store";
import { Layer } from "./Layer";

export function Pause() {
  const on = useStore((s) => s.phase === "paused" && !s.settingsOpen);
  const { resume, openSettings, toTitle } = useStore.getState();
  return (
    <Layer on={on} id="pause" label="Paused" focus>
      <section className="stack">
        <h2>Paused</h2>
        <nav className="nav">
          <button onClick={resume}>Resume</button>
          <button onClick={() => openSettings("pause")}>Settings</button>
          <button onClick={toTitle}>Return to title</button>
        </nav>
      </section>
    </Layer>
  );
}
