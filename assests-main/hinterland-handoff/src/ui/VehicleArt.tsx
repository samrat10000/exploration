// Garage pictures: flat side-on drawings of each vehicle (Rover and Mule from reference/ui/atlas.html, the rest drawn in the same style).
import type { ReactNode } from "react";
import type { VehicleId } from "../game/journeys/journeys";

const Wheel = ({ x, y, r }: { x: number; y: number; r: number }) => <><circle cx={x} cy={y} r={r} fill="#2B2925" /><circle cx={x} cy={y} r={r * 0.48} fill="#9C978C" /><circle cx={x} cy={y} r={r * 0.14} fill="#2B2925" /></>;
const Shadow = ({ rx = 205 }: { rx?: number }) => <ellipse cx={260} cy={262} rx={rx} ry={9} fill="#2F2B24" opacity={0.12} />;
const GL = "#BFD2D3";

const Mule = ({ c }: { c: string }) => (
  <>
    <Shadow /><rect x={210} y={150} width={240} height={62} fill="#8A6A45" rx={3} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={210} y={150 + i * 16} width={240} height={3} fill="#6B5034" />)}
    <rect x={206} y={118} width={6} height={94} fill="#6B5034" /><rect x={446} y={118} width={6} height={94} fill="#6B5034" /><rect x={206} y={118} width={246} height={5} fill="#6B5034" />
    {[[226, 96, 70, 54], [302, 104, 60, 46], [368, 92, 66, 58], [262, 58, 58, 40]].map(([x, y, w, h]) => <g key={x}><rect x={x} y={y} width={w} height={h} fill="#C4A16C" stroke="#7C5F3A" strokeWidth={2} /><path d={`M${x + 4} ${y + 4} L${x + w - 4} ${y + h - 4} M${x + w - 4} ${y + 4} L${x + 4} ${y + h - 4}`} stroke="#9A7C50" strokeWidth={1.5} /></g>)}
    <path d="M212 120 Q300 70 452 118" fill="none" stroke="#D9C9A0" strokeWidth={2} /><rect x={120} y={208} width={330} height={12} fill="#3A3631" />
    <path d="M70 214 L70 128 Q72 82 120 74 L196 70 Q214 70 214 90 L214 214 Z" fill={c} /><path d="M66 80 Q120 56 218 64 L218 74 Q120 66 66 90 Z" fill="#E6DCC4" />
    <path d="M86 132 Q90 96 124 90 L150 88 L150 132 Z" fill={GL} /><rect x={160} y={88} width={42} height={62} fill={GL} /><circle cx={66} cy={160} r={11} fill="#FFF1CF" stroke="#2F2B24" strokeWidth={2} />
    <rect x={428} y={214} width={8} height={30} fill="#2B2925" /><Wheel x={104} y={236} r={28} /><Wheel x={380} y={236} r={28} />
  </>
);
const Rover = ({ c, kit }: { c: string; kit?: ReactNode }) => (
  <>
    <Shadow rx={210} /><rect x={52} y={150} width={410} height={66} rx={6} fill={c} /><rect x={48} y={206} width={418} height={18} rx={4} fill="#2A2E31" />
    <path d="M170 150 L186 82 L414 82 L424 150 Z" fill="#24313A" /><rect x={180} y={74} width={250} height={10} fill={c} /><rect x={290} y={84} width={10} height={66} fill={c} />
    <rect x={196} y={58} width={230} height={5} fill="#8E908C" /><rect x={250} y={38} width={120} height={22} fill="#2A2E31" /><rect x={52} y={164} width={10} height={12} fill="#FFF1CF" />
    <circle cx={470} cy={168} r={30} fill="#2B2925" /><Wheel x={132} y={230} r={40} /><Wheel x={384} y={230} r={40} />{kit}
  </>
);
const wing = <><path d="M60 30 Q260 -10 470 30 L450 44 Q260 14 80 44 Z" fill="#E9DCC0" stroke="#8A7A55" strokeWidth={2} /><path d="M200 40 L240 74 M330 40 L300 74" stroke="#6B5034" strokeWidth={3} /></>;

const ART: Record<VehicleId, (c: string) => ReactNode> = {
  rover: (c) => <Rover c={c} />,
  mule: (c) => <Mule c={c} />,
  glider: (c) => <Rover c={c} kit={wing} />,
  skymule: (c) => <><Mule c={c} /><g transform="translate(0,-8)">{wing}</g></>,
  boat: (c) => <><Shadow rx={220} /><path d="M30 190 L490 190 Q470 250 400 252 L120 252 Q50 246 30 190 Z" fill="#2A2E31" /><path d="M60 190 L470 190" stroke="#E9C47E" strokeWidth={4} /><Rover c={c} kit={<rect x={0} y={236} width={520} height={10} fill="#7FB0C4" opacity={0.7} />} /></>,
  tortoise: (c) => <><Shadow rx={170} /><path d="M90 226 Q100 80 260 76 Q420 80 430 226 Z" fill={c} /><path d="M150 130 Q260 90 370 130 M130 180 Q260 150 390 180" fill="none" stroke="#00000030" strokeWidth={3} /><circle cx={260} cy={150} r={26} fill={GL} stroke="#2F2B24" strokeOpacity={0.3} /><rect x={80} y={216} width={360} height={16} rx={6} fill="#3A3631" /><circle cx={440} cy={190} r={9} fill="#FFF1CF" /><Wheel x={140} y={238} r={26} /><Wheel x={380} y={238} r={26} /></>,
  bus: (c) => <><Shadow rx={230} /><rect x={30} y={90} width={460} height={130} rx={26} fill={c} /><rect x={30} y={170} width={460} height={14} fill="#E6DCC4" />{[60, 140, 220, 300, 380].map((x) => <rect key={x} x={x} y={108} width={62} height={46} rx={6} fill={GL} />)}<rect x={440} y={108} width={40} height={60} rx={6} fill={GL} /><circle cx={486} cy={196} r={8} fill="#FFF1CF" /><rect x={90} y={72} width={260} height={18} rx={4} fill="#8A6A45" /><rect x={26} y={216} width={468} height={12} fill="#2A2E31" /><Wheel x={120} y={234} r={30} /><Wheel x={400} y={234} r={30} /></>,
  snowcat: (c) => <><Shadow rx={220} /><rect x={90} y={96} width={250} height={110} rx={14} fill={c} /><path d="M340 206 L340 140 L440 170 L440 206 Z" fill={c} /><rect x={110} y={110} width={150} height={52} rx={6} fill={GL} /><rect x={70} y={80} width={290} height={10} fill="#2A2E31" /><circle cx={436} cy={176} r={8} fill="#FFF1CF" />{[0, 1].map((i) => <rect key={i} x={30} y={206 + i * 0} width={430} height={44} rx={22} fill="#2B2925" />)}{[70, 130, 190, 250, 310, 370, 430].map((x) => <circle key={x} cx={x} cy={228} r={12} fill="#9C978C" />)}<rect x={440} y={210} width={70} height={14} rx={4} fill="#8A6A45" /></>,
};

export function VehicleArt({ id, color }: { id: VehicleId; color: string }) {
  return <svg viewBox="0 0 520 300" role="img" aria-label="Vehicle" style={{ width: "100%", maxHeight: 300 }}>{ART[id](color)}</svg>;
}
