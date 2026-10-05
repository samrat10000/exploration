// Garage: every vehicle as a flat side drawing, with paint (Rover, Mule) and mods. Pick one and it is the vehicle you drive next.
import { useStore } from "../state/store";
import { ROSTER, UNLOCK_ALL } from "../game/vehicle/roster";
import type { VehicleId } from "../game/journeys/journeys";
import { VehicleArt } from "./VehicleArt";
import { PAINTS, PAINT_NAMES, ownedPaints } from "../game/vehicle/paints";
import { CHARMS, HORNS, RACKS, TYRES, earned, modsOf, setMod } from "../game/vehicle/mods";

export function AtlasGarage({ on }: { on: boolean }) {
  const paint = useStore((s) => s.paint), rewards = useStore((s) => s.rewards), done = useStore((s) => s.done);
  const picked = useStore((st) => st.wanderVehicle), veh: VehicleId = picked ?? "rover", info = ROSTER.find((r) => r.id === veh)!;
  const setVeh = (v: VehicleId) => useStore.setState({ wanderVehicle: v === "rover" ? null : v });
  const paintable = veh === "rover" || veh === "mule", pk = paintable ? veh : "rover";
  const owned = ownedPaints(pk, rewards);
  void done;
  const m = modsOf(veh), tyre = TYRES[m.tyres];
  const note = tyre.grip === 1 && tyre.speed === 1 ? tyre.line : `${tyre.line} (grip ${tyre.grip > 1 ? "+" : "−"}${Math.round(Math.abs(tyre.grip - 1) * 100)}%, top speed ${tyre.speed > 1 ? "+" : "−"}${Math.round(Math.abs(tyre.speed - 1) * 100)}%)`;
  const mods = (
    <>
      <dt>Tyres</dt>
      <dd>
        <div className="opts">{Object.entries(TYRES).map(([k, t]) => { const ok = earned(t.need); return <button key={k} aria-pressed={m.tyres === k} disabled={!ok} title={ok ? t.line : "Earned on a journey"} onClick={() => setMod(veh, "tyres", k)}>{ok ? t.name : "Earned later"}</button>; })}</div>
        <small>{note}</small>
      </dd>
      <dt>Rack</dt>
      <dd><div className="opts">{Object.entries(RACKS).map(([k, r]) => { const ok = earned(r.need); return <button key={k} aria-pressed={m.rack === k} disabled={!ok} onClick={() => setMod(veh, "rack", k)}>{ok ? r.name : "Earned later"}</button>; })}</div></dd>
      <dt>Charm</dt>
      <dd><div className="opts">{Object.entries(CHARMS).map(([k, r]) => { const ok = earned(r.need); return <button key={k} aria-pressed={m.charm === k} disabled={!ok} onClick={() => setMod(veh, "charm", k)}>{ok ? r.name : "Earned later"}</button>; })}</div></dd>
      <dt>Horn</dt>
      <dd><div className="opts">{Object.entries(HORNS).map(([k, h]) => { const ok = earned(h.need); return <button key={k} aria-pressed={m.horn === k} disabled={!ok} onClick={() => setMod(veh, "horn", k)}>{ok ? h.name : "Earned later"}</button>; })}</div></dd>
    </>
  );
  return (
    <section className={`view${on ? " on" : ""}`} aria-label="Garage">
      <div className="stage">
        <div className="pic"><VehicleArt id={veh} color={PAINTS[pk][paint[pk]]} /></div>
        <div className="mods">
          <div className="vpick">
            {ROSTER.map((r) => <button key={r.id} aria-pressed={veh === r.id} disabled={!UNLOCK_ALL && r.id !== "rover" && !done.includes("overlook")} onClick={() => setVeh(r.id)}>{r.name}</button>)}
          </div>
          <h2>{info.name}</h2>
          <p className="line">{info.line}</p>
          <dl>
            {paintable && <><dt>Paint</dt>
            <dd>
              <div className="swatches">
                {PAINTS[pk].map((hex, i) => {
                  const ok = owned.has(i);
                  return (
                    <button key={hex} style={{ background: hex }} className={ok ? "" : "lock"} aria-pressed={paint[pk] === i}
                      aria-label={ok ? PAINT_NAMES[pk][i] : "Earned on a later journey"} title={ok ? PAINT_NAMES[pk][i] : "Earned on a later journey"}
                      onClick={ok ? () => useStore.getState().setPaint(pk, i) : undefined} />
                  );
                })}
              </div>
            </dd></>}
            {mods}
          </dl>
        </div>
      </div>
    </section>
  );
}
