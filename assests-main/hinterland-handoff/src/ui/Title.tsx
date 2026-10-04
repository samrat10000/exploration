// Title screen over the living world: Continue · Journeys · Settings · Exit.
import { useStore } from "../state/store";
import { journey } from "../game/journeys/journeys";
import { Layer } from "./Layer";

export function Title() {
  const on = useStore((s) => s.phase === "menu" && !s.settingsOpen && !s.atlasOpen && !s.starting && !s.veil);
  const session = useStore((s) => s.save?.session ?? null);
  const { continueGame, openAtlas, openSettings, exit } = useStore.getState();
  const meta = session ? (session.mode === "wander" ? `wandering, ${journey(session.journey).title}` : journey(session.journey).title) : "";
  return (
    <Layer on={on} id="menu" className="stack" label="Main menu" focus>
      <h1 className="title">Hinterland</h1>
      <p className="tagline">A slow drive into the high country.</p>
      <nav className="nav">
        <button hidden={!session} onClick={continueGame}>
          Continue{meta && <span className="meta">{meta}</span>}
        </button>
        <button onClick={openAtlas}>Journeys</button>
        <button onClick={() => openSettings("menu")}>Settings</button>
        <button onClick={exit}>Exit</button>
      </nav>
    </Layer>
  );
}
