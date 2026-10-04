// The Atlas: a hand-inked map of the journeys, the Garage and the Journal (reference/atlas.html).
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useStore } from "../state/store";
import { JOURNEYS, atlasState, type Journey } from "../game/journeys/journeys";
import { placesIn } from "../game/exploration/discoveries";
import { Layer } from "./Layer";
import { AtlasGarage } from "./AtlasGarage";
import { AtlasJournal } from "./AtlasJournal";
import "./atlas.css";

type Tab = "map" | "garage" | "journal";
const INK = "#2F2B24", SUN = "#B5843A";

/* hand-placed ground features (same as the reference) */
const PEAKS = [[120, 300], [175, 230], [205, 190], [420, 170], [455, 120], [520, 90], [600, 95], [650, 150], [700, 120], [640, 60], [540, 40], [260, 140]];
const forest = (cx: number, cy: number, n: number, r: number) =>
  Array.from({ length: n }, (_, i) => { const a = i * 2.39, d = Math.sqrt(i / n) * r; return [cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d]; });
const TREES = [...forest(600, 330, 36, 46), ...forest(200, 420, 14, 30), ...forest(410, 410, 12, 24)];

/** A gently bowed dotted leg between two places. */
function leg(a: Journey, b: Journey) {
  const mx = (a.atlas.x + b.atlas.x) / 2, my = (a.atlas.y + b.atlas.y) / 2, dx = b.atlas.x - a.atlas.x, dy = b.atlas.y - a.atlas.y;
  const k = 0.18, cx = mx - dy * k, cy = my + dx * k;
  return { d: `M${a.atlas.x} ${a.atlas.y} Q${cx} ${cy} ${b.atlas.x} ${b.atlas.y}`, len: Math.hypot(dx, dy) * 1.08 };
}

function MapView({ on }: { on: boolean }) {
  const done = useStore((s) => s.done), found = useStore((s) => s.found), justFinished = useStore((s) => s.justFinished);
  const { startJourney } = useStore.getState();
  const states = JOURNEYS.map((j) => atlasState(j.id, done));
  const firstSel = Math.max(0, states.indexOf("next"));
  const [sel, setSel] = useState(firstSel);
  const [shown, setShown] = useState(firstSel);
  const [out, setOut] = useState(false);
  const nodes = useRef<(SVGGElement | null)[]>([]);
  const beginRef = useRef<HTMLButtonElement>(null);

  // re-centre on the next journey whenever the Atlas opens
  useEffect(() => {
    if (!on) return;
    setSel(firstSel); setShown(firstSel);
    const t = setTimeout(() => beginRef.current?.focus({ preventScroll: true }), 950);
    return () => clearTimeout(t);
  }, [on, firstSel]);
  useEffect(() => {
    if (sel === shown) return;
    setOut(true);
    const t = setTimeout(() => { setShown(sel); setOut(false); }, 300);
    return () => clearTimeout(t);
  }, [sel, shown]);

  const select = (i: number) => setSel(i);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (sel + (e.key === "ArrowRight" ? 1 : -1) + JOURNEYS.length) % JOURNEYS.length;
    setSel(n);
    nodes.current[n]?.focus();
  };

  const p = JOURNEYS[shown], st = states[shown], locked = st === "locked";
  const places = p.region ? placesIn(p.region) : [];
  const got = places.filter((id) => found.includes(id)).length;

  return (
    <section className={`view${on ? " on" : ""}`} aria-label="Map" onKeyDown={onKey}>
      <svg className="chart" viewBox="0 0 1000 620" preserveAspectRatio="xMaxYMid meet">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeOpacity=".18" strokeWidth="1" /></pattern>
          <symbol id="peak" viewBox="-20 -24 40 26" overflow="visible"><path d="M-18 0 L-4 -20 L2 -12 L6 -17 L18 0" fill="none" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" /><path d="M-4 -20 L-2 0 M6 -17 L7 0" stroke={INK} strokeOpacity=".35" strokeWidth=".8" /></symbol>
          <symbol id="tree" viewBox="-5 -12 10 13" overflow="visible"><path d="M0 -11 L4 -2 L-4 -2 Z M0 -2 V1" fill="none" stroke={INK} strokeOpacity=".55" strokeWidth=".9" strokeLinejoin="round" /></symbol>
        </defs>
        <g>
          {PEAKS.map(([x, y], i) => <use key={i} href="#peak" x={x - 20} y={y - 20} width={40} height={26} opacity={0.55 + (i % 3) * 0.15} />)}
          {TREES.map(([x, y], i) => <use key={i} href="#tree" x={x - 5} y={y - 12} width={10} height={13} />)}
          <path d="M60 560 Q160 520 240 560 T420 560" fill="none" stroke={INK} strokeOpacity=".18" />
        </g>
        {/* sea and coast */}
        <path d="M1000 0 L850 0 C 830 70 880 120 850 180 C 820 240 900 280 880 340 C 860 420 930 470 900 560 L 890 620 L1000 620 Z" fill="#9DB3B0" fillOpacity=".38" />
        <path d="M850 0 C 830 70 880 120 850 180 C 820 240 900 280 880 340 C 860 420 930 470 900 560 L 890 620" fill="none" stroke={INK} strokeWidth="1.3" />
        <g stroke={INK} strokeOpacity=".28" fill="none" strokeWidth=".9">
          <path d="M900 90 q8 -4 16 0 t16 0" /><path d="M930 200 q8 -4 16 0 t16 0" /><path d="M945 330 q8 -4 16 0 t16 0" /><path d="M935 480 q8 -4 16 0 t16 0" />
        </g>
        {/* river */}
        <path d="M520 150 C 500 220 430 250 450 320 C 470 380 420 420 470 470 C 520 520 640 500 700 540 C 760 580 860 560 895 575" fill="none" stroke="#6E8F93" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M520 150 C 500 220 430 250 450 320 C 470 380 420 420 470 470 C 520 520 640 500 700 540 C 760 580 860 560 895 575" fill="none" stroke={INK} strokeOpacity=".5" strokeWidth=".7" strokeDasharray="1 5" />
        <ellipse cx="505" cy="485" rx="34" ry="16" fill="#9DB3B0" fillOpacity=".5" stroke={INK} strokeWidth="1" />
        {/* salt flat */}
        <ellipse cx="750" cy="420" rx="85" ry="38" fill="url(#hatch)" stroke={INK} strokeOpacity=".4" strokeDasharray="3 4" />
        <g fill="none" stroke={INK} strokeOpacity=".35" strokeWidth=".9"><path d="M650 470 q10 -8 20 0 q10 8 20 0" /><path d="M690 485 q10 -8 20 0 q10 8 20 0" /></g>
        {/* the spiral mountain */}
        <g transform="translate(330 235)">
          <path d="M-70 40 L0 -62 L70 40" fill="url(#hatch)" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M-58 32 Q0 46 52 26 Q20 14 -40 18 Q-8 4 34 4 Q10 -10 -22 -8 Q0 -22 18 -24 Q6 -36 -6 -40" fill="none" stroke={SUN} strokeWidth="1.4" strokeDasharray="2 3" />
          <path d="M-6 -48 L-2 -56 L2 -48 Z" fill={INK} />
        </g>
        {/* route: legs out of finished places are inked; the rest stays faint */}
        {JOURNEYS.slice(0, -1).map((a, i) => {
          const { d, len } = leg(a, JOURNEYS[i + 1]), inked = states[i] === "done", fresh = inked && justFinished === a.id && on;
          if (!inked) return <path key={i} d={d} fill="none" stroke={INK} strokeOpacity=".28" strokeWidth="1.2" strokeDasharray="1 7" strokeLinecap="round" />;
          return (
            <g key={i}>
              {fresh && <mask id={`reveal${i}`}><path d={d} fill="none" stroke="#fff" strokeWidth="6" strokeDasharray={len} className="drawon" style={{ ["--len" as string]: len } as CSSProperties} /></mask>}
              <path d={d} fill="none" stroke={INK} strokeWidth="1.6" strokeDasharray="1 7" strokeLinecap="round" mask={fresh ? `url(#reveal${i})` : undefined} />
            </g>
          );
        })}
        <g>
          {JOURNEYS.map((j, i) => {
            const s = states[i];
            return (
              <g key={j.id} ref={(el) => { nodes.current[i] = el; }} className={`place ${s}${sel === i ? " sel" : ""}`} tabIndex={0} role="button"
                aria-label={s === "locked" ? "Beyond the ridge" : j.title} transform={`translate(${j.atlas.x} ${j.atlas.y})`}
                onClick={() => select(i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(i); setTimeout(() => beginRef.current?.focus(), 320); } }}>
                {s === "next" && <circle r={9} fill="none" stroke={SUN} strokeWidth={1.2} className="pulse" />}
                <circle r={14} fill="transparent" stroke="transparent" className="ring" />
                {s === "done" && (
                  <>
                    <circle r={6} fill={INK} className="dot" />
                    <g transform="translate(10 -10)" stroke={SUN} strokeWidth={1}>
                      {Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return <line key={k} x1={Math.cos(a) * 4} y1={Math.sin(a) * 4} x2={Math.cos(a) * 7} y2={Math.sin(a) * 7} />; })}
                    </g>
                  </>
                )}
                {s === "next" && <circle r={6} fill="#ECE3CF" stroke={INK} strokeWidth={1.6} className="dot" />}
                {s === "locked" && <circle r={4} fill="none" stroke={INK} strokeOpacity={0.35} strokeDasharray="2 2" className="dot" />}
                <text x={14} y={j.atlas.y < 160 ? 24 : -14}>{s === "locked" ? "Beyond the ridge" : j.title}</text>
              </g>
            );
          })}
        </g>
        {/* compass */}
        <g transform="translate(110 120)" stroke={INK} fill="none" strokeWidth="1">
          <circle r="26" strokeOpacity=".4" /><path d="M0 -34 L5 0 L0 34 L-5 0 Z" fill={INK} fillOpacity=".12" /><path d="M-34 0 H34" strokeOpacity=".4" />
          <text y="-40" textAnchor="middle" fontFamily="Marcellus,serif" fontSize="13" fill={INK} stroke="none">N</text>
        </g>
      </svg>

      <aside className={`panel swap${out ? " out" : ""}`} aria-live="polite">
        <p className="kicker">Journey {p.n}{st === "done" ? ", finished" : ""}</p>
        <h2>{locked ? "Beyond the ridge" : p.title}</h2>
        <p className="line">{locked ? `Finish ${JOURNEYS[shown - 1]?.title ?? "the last journey"} to see what's out here.` : p.line}</p>
        {!locked && (
          <div className="facts">
            <div><span>Vehicle</span>{p.veh}</div>
            <div><span>Length</span>{p.len}</div>
            {places.length > 0 && (
              <div><span>Places found</span><span className="cards">{places.map((_, k) => <i key={k} className={k < got ? "got" : ""} />)}</span></div>
            )}
          </div>
        )}
        <div className="nav">
          <button ref={beginRef} hidden={locked} disabled={!p.playable} onClick={() => startJourney(p.id, "journey")}>
            {!p.playable ? `${p.title} is still being made` : st === "done" ? "Drive it again" : "Begin"}
          </button>
          <button hidden={st !== "done" || !p.playable} onClick={() => startJourney(p.id, "wander")}>Wander here</button>
        </div>
      </aside>
    </section>
  );
}

export function Atlas() {
  const on = useStore((s) => s.atlasOpen && s.phase === "menu" && !s.starting);
  const [tab, setTab] = useState<Tab>("map");
  useEffect(() => { if (on) setTab("map"); }, [on]);
  const tabs = useMemo(() => [["map", "Map"], ["garage", "Garage"], ["journal", "Journal"]] as [Tab, string][], []);
  return (
    <Layer on={on} id="atlas" label="Atlas">
      <main className="sheet">
        <svg className="grain" aria-hidden="true">
          <filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={3} seed={4} /><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .36  0 0 0 0 .22  0 0 0 .35 0" /></filter>
          <rect width="100%" height="100%" filter="url(#g)" />
        </svg>
        <header>
          <h1>Atlas</h1>
          <nav className="tabs" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
          <span className="esc"><button onClick={() => useStore.getState().closeAtlas()}>Esc to return</button></span>
        </header>
        <MapView on={on && tab === "map"} />
        <AtlasGarage on={on && tab === "garage"} />
        <AtlasJournal on={on && tab === "journal"} />
      </main>
    </Layer>
  );
}

