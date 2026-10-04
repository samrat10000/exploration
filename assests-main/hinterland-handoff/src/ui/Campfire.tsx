// A line spoken by someone in the world, and the quiet choices you get sitting at a campfire.
import { useEffect, useState } from "react";
import { live } from "../state/live";
import { useStore } from "../state/store";
import { Layer } from "./Layer";

/** Speech above a person (positioned every frame by the camera rig). Jost 300, fading in. */
export function WorldLabel() {
  const label = useStore((s) => s.label);
  const [text, setText] = useState("");
  useEffect(() => { if (label) setText(label.text); }, [label]);
  return <div id="label" className={label ? "on" : ""} aria-live="polite">{text}</div>;
}

export function CampfireMenu() {
  const sitting = useStore((s) => s.sitting), camping = useStore((s) => s.camping);
  const waiting = useStore((s) => s.waitRequested);
  const [golden, setGolden] = useState(false);
  useEffect(() => { if (sitting) setGolden(live.env.tod < 2.75); }, [sitting]);
  const stand = () => useStore.setState({ sitting: false, waitRequested: false });
  return (
    <Layer on={sitting && !camping} id="campfire" className="stack" label="Campfire" focus>
      <p className="tagline">The fire ticks and settles. Nobody is in a hurry.</p>
      <nav className="nav">
        {golden && !waiting && <button onClick={() => { useStore.setState({ waitRequested: true }); setGolden(false); }}>Wait until golden hour</button>}
        <button onClick={stand}>Get up</button>
      </nav>
    </Layer>
  );
}
