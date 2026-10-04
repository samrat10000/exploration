// The Overlook: a cairn, a flag, and the lantern that is the light on the ridge.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, Group, Mesh, PlaneGeometry, Sprite } from "three";
import { hash } from "../../utils/noise";
import { VC, add, bakeStatic } from "../art/kit";
import { rockGeo } from "./props/rocks";
import { live } from "../../state/live";
import { glowTexture } from "../environment/textures";
import { VP } from "./height";


/** A stack of flat stones (lab rock shapes), each resting on the one below. */
export function Cairn({ x, y, z, n, r0, seed = 0 }: { x: number; y: number; z: number; n: number; r0: number; seed?: number }) {
  const model = useMemo(() => {
    const g = new Group(), mat = VC(0.95);
    let top = 0;
    for (let i = 0; i < n; i++) {
      const r = r0 * (1 - (i / n) * 0.6), hh = r * 0.32;
      add(g, rockGeo(950 + seed * 13 + i, r, hh, r * 0.85, 1, 0.45), mat, [(hash(i, seed) - 0.5) * r * 0.15, top + hh * 0.7, 0], [0, i * 1.3 + seed, 0]);
      top += hh * 1.25;
    }
    return bakeStatic(g);
  }, [n, r0, seed]);
  return <primitive object={model} position={[x, y, z]} />;
}

export function Overlook() {
  const flagGeo = useMemo(() => new PlaneGeometry(2.2, 0.9, 10, 3).translate(1.1, 0, 0), []);
  const base = useMemo(() => Float32Array.from(flagGeo.attributes.position.array), [flagGeo]);
  const glowTex = useMemo(() => glowTexture(), []);
  useEffect(() => () => { flagGeo.dispose(); glowTex.dispose(); }, [flagGeo, glowTex]);
  const glow = useRef<Sprite>(null!);
  const flag = useRef<Mesh>(null!);

  useFrame(() => {
    const clock = live.clock, fp = flagGeo.attributes.position;
    for (let i = 0; i < fp.count; i++) {
      const x = base[i * 3];
      fp.setZ(i, Math.sin(x * 2.4 - clock * 4.2) * 0.16 * x + Math.sin(clock * 1.3) * 0.05 * x);
    }
    fp.needsUpdate = true;
    flagGeo.computeVertexNormals();
    glow.current.material.opacity = 0.8 + 0.2 * Math.sin(clock * 2.1);
  });

  const lamp: [number, number, number] = [VP.x + 2, VP.h + 5.1, VP.z - 2];
  return (
    <group>
      <Cairn x={VP.x - 3} y={VP.h - 0.1} z={VP.z - 1.5} n={7} r0={0.75} />
      <mesh castShadow position={[VP.x + 2, VP.h + 2.5, VP.z - 2]}>
        <cylinderGeometry args={[0.06, 0.08, 5, 6]} />
        <meshStandardMaterial color="#5A4634" roughness={1} />
      </mesh>
      <sprite ref={glow} position={lamp} scale={5}>
        <spriteMaterial map={glowTex} color={0xffd9a0} transparent depthWrite={false} fog={false} blending={AdditiveBlending} />
      </sprite>
      <mesh position={lamp}>
        <boxGeometry args={[0.32, 0.42, 0.32]} />
        <meshStandardMaterial color="#FFE1A8" emissive="#FFC874" emissiveIntensity={2} />
      </mesh>
      <mesh ref={flag} geometry={flagGeo} castShadow position={[VP.x + 2, VP.h + 4.3, VP.z - 2]}>
        <meshStandardMaterial color="#B4553C" roughness={0.9} side={DoubleSide} />
      </mesh>
    </group>
  );
}
