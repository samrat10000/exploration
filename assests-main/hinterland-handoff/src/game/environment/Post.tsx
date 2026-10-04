// Lighting + post-processing (ART §3): N8AO, bloom, ACES tone mapping with golden-hour exposure, a
// shadows-to-blue / highlights-to-cream grade with a light S-curve, vignette, SMAA. Low skips it all
// (native tone mapping). Every value lives in live.post so the dev panel can change it.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { BlendFunction, Effect, ToneMappingMode } from "postprocessing";
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { Color, Uniform } from "three";
import { live } from "../../state/live";
import { useStore } from "../../state/store";
import { clamp } from "../../utils/noise";

class ExposureFx extends Effect {
  constructor() { super("Exposure", "uniform float uExposure; void mainImage(const in vec4 c, const in vec2 uv, out vec4 o){ o = vec4(c.rgb*uExposure, c.a); }", { uniforms: new Map([["uExposure", new Uniform(1)]]) }); }
}
class GradeFx extends Effect {
  constructor() {
    super("Grade", /* glsl */ `
      uniform vec3 uLift, uHi; uniform float uSat, uCon;
      void mainImage(const in vec4 c, const in vec2 uv, out vec4 o){
        vec3 col = c.rgb; float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col += (uLift - col) * (1.0 - smoothstep(0.0, 0.5, l)) * 0.12;
        col += (uHi - col) * smoothstep(0.55, 1.0, l) * 0.10;
        col = mix(vec3(l), col, uSat);
        col = mix(col, col*col*(3.0 - 2.0*col), uCon);
        o = vec4(col, c.a);
      }`, { uniforms: new Map<string, Uniform>([["uLift", new Uniform(new Color("#2B3B4F"))], ["uHi", new Uniform(new Color("#FFE8C8"))], ["uSat", new Uniform(0.92)], ["uCon", new Uniform(0.45)]]) });
  }
}

export function Post() {
  const quality = useStore((s) => s.settings.quality);
  const exposure = useMemo(() => new ExposureFx(), []), grade = useMemo(() => new GradeFx(), []);
  const bloom = useRef<{ intensity: number }>(null), vig = useRef<{ darkness: number }>(null);
  const ao = useRef<{ configuration: { intensity: number; aoRadius: number } }>(null);
  const [on, setOn] = useState(true);
  useEffect(() => () => { exposure.dispose(); grade.dispose(); }, [exposure, grade]);
  useFrame(() => {
    const p = live.post;
    if (on !== p.on) setOn(p.on);
    // golden hour is 8% brighter (ART §3)
    (exposure.uniforms.get("uExposure") as Uniform).value = p.exposure * (1 + 0.08 * clamp((live.env.tod - 2) / 0.85, 0, 1));
    (grade.uniforms.get("uSat") as Uniform).value = p.sat;
    if (bloom.current) bloom.current.intensity = p.bloom;
    if (vig.current) vig.current.darkness = p.vignette;
    if (ao.current) { ao.current.configuration.intensity = p.ao; ao.current.configuration.aoRadius = p.aoRadius; }
  });
  if (quality === "low" || !on) return null;
  const hi = quality === "high" || quality === "ultra";
  return (
    <EffectComposer multisampling={hi ? 4 : 0} enableNormalPass={false}>
      <Bloom ref={bloom as never} intensity={live.post.bloom} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette ref={vig as never} darkness={live.post.vignette} offset={0.35} blendFunction={BlendFunction.NORMAL} />
      <SMAA />
    </EffectComposer>
  );
}
