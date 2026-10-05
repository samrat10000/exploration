import { patchGround } from "../shaders";
// Terrain mesh (vertex-coloured) + the matching Rapier heightfield.
import { useEffect, useMemo } from "react";
import { BufferAttribute, PlaneGeometry } from "three";
import { QUALITY, useStore } from "../../state/store";
import { GRID, activeGround, height, heightGrid, waterLevel } from "./height";
import { groundAt } from "./ground";
import { useFixedColliders } from "./colliders";

function buildGeometry(seg: number) {
  const SIZE = GRID.size;
  const g = new PlaneGeometry(SIZE, SIZE, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();
  const nrm = g.attributes.normal, cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = groundAt(pos.getX(i), pos.getZ(i), pos.getY(i), nrm.getY(i)).color;
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new BufferAttribute(cols, 3));
  return g;
}

export function Terrain() {
  const seg = QUALITY[useStore((s) => s.settings.quality)].terrainSeg;
  const geometry = useMemo(() => buildGeometry(seg), [seg]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFixedColliders((rapier) => {
    // Rapier wants column-major heights (row = z, column = x); our grid is row-major. Verified
    // with a raycast test against known slopes. Water gets its ford floor here.
    const g = heightGrid(), { size, seg: n } = GRID, W = n + 1, step = size / n;
    const h = new Float32Array(W * W);
    for (let r = 0; r < W; r++)
      for (let c = 0; c < W; c++) {
        const x = -size / 2 + c * step, z = -size / 2 + r * step;
        // water fords and bridge decks are solid for the chassis too
        const deck = activeGround().deck;
        h[r + c * W] = Math.max(g[r * W + c], waterLevel(x, z) - 1.05, deck ? deck(x, z) : -Infinity);
      }
    return [rapier.ColliderDesc.heightfield(n, n, h, { x: size, y: 1, z: size }).setFriction(0.7)];
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0} onBeforeCompile={patchGround} />
    </mesh>
  );
}

