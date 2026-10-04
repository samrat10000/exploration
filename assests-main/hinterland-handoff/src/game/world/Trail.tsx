// Worn wheel ruts: the hidden old track (with the cairns someone left along it; nothing points
// at it, you notice it or you don't) and the open route from the valley toward the ridge light.
import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { hash } from "../../utils/noise";
import { TRAIL, height } from "./height";
import { ROUTE } from "./ground";
import { Cairn } from "./Overlook";

const ACROSS = [-2.4, -1.5, -0.8, 0, 0.8, 1.5, 2.4];
const ALPHA = [0, 0.75, 0.9, 0.8, 0.9, 0.75, 0];
const DIRT = new Color("#7E6A4E"), RUT = new Color("#5E4E3A"), MID = new Color("#6F7444");

type P = { x: number; z: number };

function ribbon(line: P[], strength: number, fade: number) {
  // resample the polyline every metre
  const pts: P[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], b = line[i + 1], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let k = 0; k < n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
  }
  pts.push(line[line.length - 1]);
  const pos: number[] = [], col: number[] = [], idx: number[] = [], C = ACROSS.length, c = new Color();
  pts.forEach((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
    const dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    // fade the ends so the track starts and stops softly
    const end = Math.min(1, i / fade, (pts.length - 1 - i) / fade) * strength;
    ACROSS.forEach((off, j) => {
      const x = p.x + nx * off, z = p.z + nz * off;
      pos.push(x, height(x, z) + 0.14, z);
      c.copy(j === 2 || j === 4 ? RUT : j === 3 ? MID : DIRT).multiplyScalar(0.92 + hash(i, j) * 0.16);
      col.push(c.r, c.g, c.b, ALPHA[j] * end * (0.8 + hash(i * 1.7, j) * 0.2));
    });
    if (i < pts.length - 1) for (let j = 0; j < C - 1; j++) {
      const a = i * C + j, b = a + C;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Cairns beside the track: at the mouth, at each bend, and on the tarn shore. */
const CAIRNS = [0, 2, 4, TRAIL.length - 1].map((i, k) => {
  const p = TRAIL[i], q = TRAIL[Math.min(i + 1, TRAIL.length - 1)], o = TRAIL[Math.max(i - 1, 0)];
  const dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz), side = k % 2 ? 3.4 : -3.4;
  const x = p.x - (dz / l) * side, z = p.z + (dx / l) * side;
  return { x, z, y: height(x, z), n: 3 + (k % 2) };
});

export function Trail() {
  const trail = useMemo(() => ribbon(TRAIL, 1, 6), []);
  const route = useMemo(() => ribbon([{ x: ROUTE.ax, z: ROUTE.az }, { x: ROUTE.bx, z: ROUTE.bz }], 0.55, 30), []);
  useEffect(() => () => { trail.dispose(); route.dispose(); }, [trail, route]);
  return (
    <group>
      {[trail, route].map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow renderOrder={1}>
          <meshStandardMaterial vertexColors transparent depthWrite={false} roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ))}
      {CAIRNS.map((c, k) => <Cairn key={k} x={c.x} y={c.y - 0.05} z={c.z} n={c.n} r0={0.45} seed={k} />)}
    </group>
  );
}
