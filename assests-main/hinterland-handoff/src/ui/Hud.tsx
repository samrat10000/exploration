// The whole HUD: one objective line that fades while you drive, and key hints that leave on their own.
import { useStore } from "../state/store";
import { WANDER_LINE, journey } from "../game/journeys/journeys";
import { Layer } from "./Layer";

export function Hud() {
  const playing = useStore((s) => s.phase === "play" && !s.sitting && !s.cutscene);
  const mode = useStore((s) => s.objMode);
  const line = useStore((s) => (s.mode === "journey" ? journey(s.journey).objective : WANDER_LINE[s.region]));
  const hints = useStore((s) => s.hints && s.phase === "play");
  const cargo = useStore((s) => !!s.crates);
  return (
    <>
      <Layer on={playing} id="scrim" />
      <Layer on={playing} id="objective" className={mode === "fresh" ? "" : mode} role="status">
        {line}
      </Layer>
      <Layer on={hints} id="keys">
        <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</div>
        <div><kbd>Space</kbd> brake</div>
        {cargo && <div>hold <kbd>E</kbd> beside a fallen crate</div>}
        <div>drag to look around</div>
        {cargo ? <div><kbd>H</kbd> horn &nbsp;<kbd>Esc</kbd> pause</div> : <div><kbd>H</kbd> hide hints &nbsp;<kbd>Esc</kbd> pause</div>}
      </Layer>
    </>
  );
}
