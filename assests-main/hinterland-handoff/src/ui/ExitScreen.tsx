import { useStore } from "../state/store";
import { Layer } from "./Layer";

export function ExitScreen() {
  const on = useStore((s) => s.phase === "exit");
  return (
    <Layer on={on} id="exit" focus>
      <div>
        <p className="big">Your journey is saved.</p>
        <p className="small">You can close this tab whenever you like.</p>
        <button className="back" onClick={() => useStore.getState().toMenu()}>Back to the title</button>
      </div>
    </Layer>
  );
}
