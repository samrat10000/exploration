// Garage: side elevations of the vehicles (the proportions the 3D models follow) and their paints.
import { useState } from "react";
import { useStore } from "../state/store";
import { PAINTS, PAINT_NAMES, ownedPaints } from "../game/vehicle/paints";
import { CHARMS, HORNS, RACKS, TYRES, earned, modsOf, setMod } from "../game/vehicle/mods";

type V = "rover" | "mule";

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (<><circle cx={x} cy={y} r={r} fill="#2B2925" /><circle cx={x} cy={y} r={r * 0.48} fill="#9C978C" /><circle cx={x} cy={y} r={r * 0.14} fill="#2B2925" /></>);
}

function Mule({ c }: { c: string }) {
  return (
    <>
      <ellipse cx={260} cy={262} rx={200} ry={9} fill="#2F2B24" opacity={0.12} />
      <rect x={210} y={150} width={240} height={62} fill="#8A6A45" rx={3} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={210} y={150 + i * 16} width={240} height={3} fill="#6B5034" />)}
      <rect x={206} y={118} width={6} height={94} fill="#6B5034" /><rect x={446} y={118} width={6} height={94} fill="#6B5034" />
      <rect x={206} y={118} width={246} height={5} fill="#6B5034" />
      {[[226, 96, 70, 54], [302, 104, 60, 46], [368, 92, 66, 58], [262, 58, 58, 40]].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#C4A16C" stroke="#7C5F3A" strokeWidth={2} />
          <path d={`M${x + 4} ${y + 4} L${x + w - 4} ${y + h - 4} M${x + w - 4} ${y + 4} L${x + 4} ${y + h - 4}`} stroke="#9A7C50" strokeWidth={1.5} />
        </g>
      ))}
      <path d="M212 120 Q300 70 452 118" fill="none" stroke="#D9C9A0" strokeWidth={2} />
      <rect x={120} y={208} width={330} height={12} fill="#3A3631" />
      <path d="M70 214 L70 128 Q72 82 120 74 L196 70 Q214 70 214 90 L214 214 Z" fill={c} />
      <path d="M66 80 Q120 56 218 64 L218 74 Q120 66 66 90 Z" fill="#E6DCC4" />
      <path d="M86 132 Q90 96 124 90 L150 88 L150 132 Z" fill="#BFD2D3" stroke="#2F2B24" strokeOpacity={0.3} />
      <rect x={160} y={88} width={42} height={62} fill="#BFD2D3" stroke="#2F2B24" strokeOpacity={0.3} />
      <rect x={70} y={176} width={144} height={6} fill="#000" opacity={0.12} />
      <circle cx={66} cy={160} r={11} fill="#FFF1CF" stroke="#2F2B24" strokeWidth={2} />
      <path d="M150 70 L150 52" stroke="#2F2B24" strokeWidth={1.5} /><circle cx={150} cy={50} r={4} fill="#D8B24A" />
      <rect x={428} y={214} width={8} height={30} fill="#2B2925" />
      <Wheel x={104} y={236} r={28} /><Wheel x={380} y={236} r={28} />
    </>
  );
}

function Rover({ c, lantern }: { c: string; lantern: boolean }) {
  return (
    <>
      <ellipse cx={260} cy={262} rx={210} ry={9} fill="#2F2B24" opacity={0.12} />
      <rect x={52} y={150} width={410} height={66} rx={6} fill={c} />
      <rect x={48} y={206} width={418} height={18} rx={4} fill="#2A2E31" />
      <path d="M170 150 L186 82 L414 82 L424 150 Z" fill="#24313A" />
      <rect x={180} y={74} width={250} height={10} fill={c} />
      <rect x={290} y={84} width={10} height={66} fill={c} />
      <rect x={196} y={58} width={230} height={5} fill="#8E908C" /><rect x={250} y={38} width={120} height={22} fill="#2A2E31" />
      {lantern && <><rect x={392} y={30} width={14} height={24} fill="#FFE1A8" stroke="#2F2B24" strokeWidth={1.2} /><path d="M390 30 h18" stroke="#2F2B24" strokeWidth={2} /></>}
      <rect x={52} y={164} width={10} height={12} fill="#FFF1CF" />
      <circle cx={470} cy={168} r={30} fill="#2B2925" />
      <Wheel x={132} y={230} r={40} /><Wheel x={384} y={230} r={40} />
    </>
  );
}

export function AtlasGarage({ on }: { on: boolean }) {
  const paint = useStore((s) => s.paint), rewards = useStore((s) => s.rewards), done = useStore((s) => s.done);
  const muleKnown = done.includes("overlook");
  const [veh, setVeh] = useState<V>("rover");
  const owned = ownedPaints(veh, rewards), c = PAINTS[veh][paint[veh]];
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
  const lantern = rewards.includes("rover-roof-lantern");
  return (
    <section className={`view${on ? " on" : ""}`} aria-label="Garage">
      <div className="stage">
        <svg viewBox="0 0 520 300" aria-label={veh === "mule" ? "The Mule" : "The Rover"}>
          {veh === "mule" ? <Mule c={c} /> : <Rover c={c} lantern={lantern} />}
        </svg>
        <div className="mods">
          <div className="vpick">
            <button aria-pressed={veh === "rover"} onClick={() => setVeh("rover")}>Rover</button>
            <button aria-pressed={veh === "mule"} disabled={!muleKnown} onClick={() => setVeh("mule")}>{muleKnown ? "Mule" : "Not found yet"}</button>
            {["Tortoise", "The Loaf", "Sky Mule", "Snowcat"].map((n) => <button key={n} disabled>Not found yet</button>)}
          </div>
          <h2>{veh === "mule" ? "The Mule" : "The Rover"}</h2>
          <p className="line">{veh === "mule" ? "Three wheels, a wooden rack and no hurry. Go slow on the corners." : "Steady on almost anything. The one you started with."}</p>
          <dl>
            <dt>Paint</dt>
            <dd>
              <div className="swatches">
                {PAINTS[veh].map((hex, i) => {
                  const ok = owned.has(i);
                  return (
                    <button key={hex} style={{ background: hex }} className={ok ? "" : "lock"} aria-pressed={paint[veh] === i}
                      aria-label={ok ? PAINT_NAMES[veh][i] : "Earned on a later journey"} title={ok ? PAINT_NAMES[veh][i] : "Earned on a later journey"}
                      onClick={ok ? () => useStore.getState().setPaint(veh, i) : undefined} />
                  );
                })}
              </div>
            </dd>
            {veh === "mule" ? (
              <>{mods}</>
            ) : (
              <>{mods}</>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}
