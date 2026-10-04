// A journey's quiet ending: what happened, what you earned, and where to go next.
import { useStore } from "../state/store";
import { journey } from "../game/journeys/journeys";
import { rewardLine } from "../game/vehicle/paints";
import { Layer } from "./Layer";

export function EndScreen() {
  const on = useStore((s) => s.phase === "ending");
  const id = useStore((s) => s.journey);
  const ending = useStore((s) => s.extra.endingLine as string | undefined);
  const j = journey(id);
  const earned = j.reward.map(rewardLine);
  const { endChoice } = useStore.getState();
  return (
    <Layer on={on} id="ending" className="stack" label="Journey finished" focus>
      <p className="kicker">Journey {j.n}, finished</p>
      <h2 className="title">{j.title}</h2>
      <p className="tagline">
        {ending ?? j.endLine}
        {earned.length > 0 && <><br />New in the Garage: {earned.join(" and ")}.</>}
      </p>
      <nav className="nav">
        <button onClick={() => endChoice("atlas")}>Back to the Atlas</button>
        <button onClick={() => endChoice("stay")}>Stay a while</button>
      </nav>
    </Layer>
  );
}
