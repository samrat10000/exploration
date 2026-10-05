// An ink sketch of the region, drawn on the paper loading board (screens.html -> Loading a region). One small SVG of hand-drawn lines per
// place: peaks, water, dunes or trees. Names match store.ts REGION_NAME.
const PEAKS = "M10 120 L60 60 L90 90 L150 20 L210 100 L250 70 L310 120 M150 20 L140 40 M40 130 H290";
const WAVES = "M10 100 q20 -14 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 M30 120 q20 -12 40 0 t40 0 t40 0 t40 0 t40 0 M20 80 q15 -10 30 0 t30 0 t30 0";
const DUNES = "M5 125 Q60 70 120 110 Q180 60 240 105 Q280 85 315 120 M40 135 H290 M150 40 a14 14 0 1 0 0.1 0";
const TREES = "M40 125 l16 -50 l16 50 z M90 125 l20 -70 l20 70 z M150 125 l14 -44 l14 44 z M210 125 l22 -76 l22 76 z M262 125 l12 -40 l12 40 z M10 128 H310";
const COAST = "M10 90 Q80 70 150 95 T310 80 M10 112 q20 -10 40 0 t40 0 t40 0 M170 110 q20 -10 40 0 t40 0 t40 0 M160 95 Q200 60 250 50 L310 50 M20 128 H300";
const SKETCH: Record<string, string> = {
  "The valley": PEAKS, "Kettle Peak": "M20 128 L160 14 L300 128 M60 110 Q160 130 250 96 Q120 86 200 72 Q130 62 188 50 M10 132 H310", "The Boulder Garden": "M10 128 H310 M30 128 q10 -40 40 -40 t40 40 M120 128 q8 -56 44 -56 t44 56 M230 128 q8 -34 30 -34 t30 34 M10 20 L40 100 M310 20 L280 100",
  "Lantern River": WAVES + " M120 20 v20 M118 40 h4 v10 h-4 z", "The Old Forest": TREES, "Lake of Islands": WAVES + " M60 80 q10 -16 24 0 M200 70 q10 -16 24 0", "The High Pass": PEAKS + " M30 40 l4 8 l4 -8 M250 30 l4 8 l4 -8 M110 52 l4 8 l4 -8",
  "Sky Road": "M10 110 Q80 100 140 70 T310 30 M20 130 q20 -20 50 -10 q20 -22 50 -8 M200 110 q30 -16 60 0 M100 30 q10 -10 20 0 q10 -10 20 0", "The Salt Mirror": DUNES, "Slow Coast": COAST, "The Lighthouse": COAST + " M230 50 v-34 M224 16 h12 M226 50 h8",
  "Valley of Flowers": PEAKS + " M60 134 q4 -12 8 0 M110 134 q4 -12 8 0 M170 134 q4 -12 8 0 M230 134 q4 -12 8 0",
};
export function InkSketch({ name }: { name: string }) {
  const d = SKETCH[name];
  if (!d) return null;
  return (
    <svg className="ink" viewBox="0 0 320 150" aria-hidden="true">
      <path d={d} fill="none" stroke="#2F2B24" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
    </svg>
  );
}
