// Sky dome, sun, hemisphere light and fog, all driven by time of day.
import { forecastFog } from "../../ui/Forecast";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BackSide, Color, DirectionalLight, FogExp2, HemisphereLight, Mesh, ShaderMaterial } from "three";
import { live } from "../../state/live";
import { QUALITY, useStore } from "../../state/store";
import { damp } from "../../utils/noise";
import { updateGlow } from "../art/kit";
import { U } from "../shaders";
import { TOD, applyTimeOfDay, zenith } from "./timeOfDay";
import { fogAt, journey } from "../journeys/journeys";

/** smoothed weather values, shared with anything that wants to react to fog */
export const weather = { fog: 1 };
const GREY = new Color();
const STARS = { value: 0 };

// three >= r155 uses physically based light units; the prototype (r128) used legacy units.
// Multiplying by PI gives the same brightness on standard materials.
const LEGACY = Math.PI;

export function Sky() {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null!);
  const hemi = useRef<HemisphereLight>(null!);
  const quality = useStore((s) => s.settings.quality);

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide, depthWrite: false, fog: false, toneMapped: false,
        uniforms: { uZen: { value: zenith }, uHor: U.uSky, uSunC: U.uSunC, uSunDir: U.uSunDir, uStars: STARS, uTime: U.uTime },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir; uniform vec3 uZen, uHor, uSunC, uSunDir; uniform float uStars, uTime;
          float hh(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
          float nn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
            return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z); }
          void main(){
            vec3 d = normalize(vDir); float y = d.y;
            vec3 col = mix(uHor, uZen, pow(smoothstep(0.0, 0.65, y), 0.75));
            col = mix(col, uHor*0.92, smoothstep(0.0, -0.2, y));
            float s = max(dot(d, uSunDir), 0.0);
            col += uSunC*(pow(s, 6.0)*0.22 + pow(s, 48.0)*0.45);
            col += uSunC*pow(s, 2.5)*0.14*(1.0 - smoothstep(0.0, 0.35, y));
            float day = 1.0 - uStars;
            col = mix(col, vec3(1.0, 0.97, 0.9)*1.6, smoothstep(0.99935, 0.99975, s)*day);
            // night: moon disc + glow, twinkling stars, a soft Milky Way band
            col += vec3(0.85, 0.9, 1.0)*(smoothstep(0.99955, 0.9998, s)*1.6 + pow(s, 40.0)*0.25)*uStars;
            if (uStars > 0.01 && y > -0.02){
              vec3 q = d*240.0; float st = step(0.9965, hh(floor(q)))*(0.55 + 0.45*sin(uTime*2.0 + hh(floor(q))*40.0));
              vec3 band = normalize(vec3(0.3, 0.75, -0.6));
              float mw = exp(-pow(dot(d, band)*4.0, 2.0))*(0.6 + 0.6*nn(d*6.0) + 0.3*nn(d*18.0));
              col += (vec3(st) + vec3(0.55, 0.6, 0.8)*mw*0.22)*uStars*smoothstep(-0.02, 0.15, y);
            }
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    []
  );

  // fog object lives on the scene so standard materials pick it up
  useEffect(() => {
    scene.fog = new FogExp2(0xbfd0da, QUALITY[quality].fog);
    return () => { scene.fog = null; };
  }, [scene, quality]);

  // shadow quality
  useEffect(() => {
    const l = sun.current, size = QUALITY[quality].shadow;
    l.castShadow = size > 0;
    if (size && l.shadow.mapSize.x !== size) {
      l.shadow.mapSize.set(size, size);
      l.shadow.map?.dispose();
      (l.shadow as { map: unknown }).map = null;
    }
  }, [quality]);

  useEffect(() => {
    const l = sun.current, c = l.shadow.camera;
    c.left = -55; c.right = 55; c.top = 55; c.bottom = -55; c.near = 1; c.far = 400;
    c.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.5;
    scene.add(l.target);
    return () => { scene.remove(l.target); };
  }, [scene]);

  const dome = useRef<Mesh>(null!);
  useFrame(({ camera }, dt) => {
    const st = useStore.getState(), env = live.env, phase = st.phase, clock = live.clock;
    // menu breathes around golden hour; a journey's light follows its progress (set by the
    // Director); wandering warms slowly with the clock
    if (phase === "menu" || phase === "loading" || phase === "exit") {
      env.tod += (TOD.menu + 0.08 * Math.sin(clock * 0.02) - env.tod) * damp(0.5, dt);
    } else if (phase === "play" || phase === "intro" || phase === "ending") {
      if (phase === "play" && st.mode === "wander") env.todTarget = Math.min(TOD.playMax, env.todTarget + dt / TOD.warmSeconds);
      env.tod += (env.todTarget - env.tod) * damp(0.6, dt);
    }
    if (live.dev.tod !== null) env.tod = env.todTarget = live.dev.tod;
    applyTimeOfDay(env.tod);
    STARS.value = env.stars;
    updateGlow(env.tod);

    const l = sun.current, h = hemi.current, car = live.car;
    l.color.copy(env.sunC);
    l.intensity = env.sunI * LEGACY * (1 - live.wx.dark * 0.7);
    l.position.set(car.x + env.sunDir.x * 160, car.y + env.sunDir.y * 160, car.z + env.sunDir.z * 160);
    l.target.position.set(car.x, car.y, car.z);
    h.color.copy(env.hemiSky);
    h.groundColor.copy(env.hemiGround);
    h.intensity = env.hemiI * LEGACY * (1 - live.wx.dark * 0.3);

    const fog = scene.fog as FogExp2 | null;
    if (fog) {
      const wx = live.wx;
      fog.color.copy(env.fogC).lerp(GREY.set(0.5, 0.54, 0.6).multiplyScalar(0.35 + 0.65 * (1 - env.stars) * 0.9), Math.max(wx.rain * 0.7, wx.mist * 0.55, wx.snow * 0.6));
      // journey weather: fog keyed to route progress (the menu keeps the plain preset)
      const dw = live.dev.weather;
      const w = dw ? (dw === "fog" ? 16 : dw === "snow" ? 0.75 : 1)
        : phase === "menu" || phase === "loading" || st.mode === "wander" ? 1 : fogAt(journey(st.journey).weather, st.progress);
      weather.fog += (w * (dw ? 1 : forecastFog(st.extra.forecast)) - weather.fog) * damp(0.8, dt);
      fog.density = QUALITY[st.settings.quality].fog * weather.fog * (1 + wx.rain * 2.2 + wx.mist * 4.5 + wx.snow * 2.8);
    }
    U.uFogC.value.copy(env.fogC);
    U.uFogD.value = fog ? fog.density : 0.0028;
    U.uSunC.value.copy(env.sunC);
    U.uSunDir.value.copy(env.sunDir);
    U.uSky.value.copy(env.horC);
    U.uTime.value = clock;

    dome.current.position.copy(camera.position);
  });

  return (
    <>
      <mesh ref={dome} material={mat} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[1500, 32, 16]} />
      </mesh>
      <directionalLight ref={sun} />
      <hemisphereLight ref={hemi} />
    </>
  );
}
