import { Component, Suspense, lazy, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PCFSoftShadowMap } from "three";
import { QUALITY, useStore } from "./state/store";
import { live } from "./state/live";
import { audio } from "./game/audio/audio";
import { World } from "./game/World";
import { touch } from "./game/vehicle/input";
import { TRAIL, progressOf, trailAt } from "./game/world/kettle/kettle";
import { Atlas } from "./ui/Atlas";
import { CampfireMenu, WorldLabel } from "./ui/Campfire";
import { BusHud } from "./ui/BusHud";
import { Post } from "./game/environment/Post";
import { RoundsHud } from "./ui/RoundsHud";
import { Forecast } from "./ui/Forecast";
import { CampMenu } from "./ui/CampMenu";
import { CargoHud, RecoveryFade } from "./ui/CargoHud";
import { DiscoveryCard } from "./ui/DiscoveryCard";
import { EndScreen } from "./ui/EndScreen";
import { ExitScreen } from "./ui/ExitScreen";
import { FlightHud } from "./ui/FlightHud";
import { Hud } from "./ui/Hud";
import { Letterbox } from "./ui/Letterbox";
import { Pause } from "./ui/Pause";
import { Settings } from "./ui/Settings";
import { Title } from "./ui/Title";
import { TouchStick } from "./ui/TouchStick";
import { useUiKeys } from "./ui/useUiKeys";

const DevPanel = import.meta.env.DEV ? lazy(() => import("./ui/DevPanel")) : null;

/** Shown instead of the game when WebGL can't start. */
class GlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div id="nogl" className="layer on">
        <p>This browser could not start WebGL. Turn on hardware acceleration in your browser settings, then reload the page.</p>
      </div>
    );
  }
}

/** Mounted once the world (and Rapier's WASM) is ready: lift the veil, then show the title. */
function Ready() {
  useEffect(() => {
    let t2 = 0;
    const t1 = window.setTimeout(() => {
      useStore.setState({ veil: false });
      t2 = window.setTimeout(() => useStore.getState().toMenu(), 900);
    }, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return null;
}

export default function App() {
  const quality = useStore((s) => s.settings.quality);
  useUiKeys();

  // browsers only allow audio after a gesture
  useEffect(() => {
    const unlock = () => audio.init(useStore.getState().settings);
    addEventListener("keydown", unlock);
    addEventListener("pointerdown", unlock, { once: true });
    if (import.meta.env.DEV) Object.assign(window, { __hl: { live, store: useStore, touch, trail: TRAIL, trailAt, progressOf } }); // playtest hook, dev only
    return () => { removeEventListener("keydown", unlock); removeEventListener("pointerdown", unlock); };
  }, []);

  return (
    <>
      <GlBoundary>
        <Canvas
          id="world"
          aria-label="A mountain valley with a parked expedition rover"
          shadows={{ type: PCFSoftShadowMap }}
          dpr={Math.min(window.devicePixelRatio || 1, QUALITY[quality].pr)}
          camera={{ fov: 55, near: 0.3, far: 1900 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => { gl.toneMappingExposure = 1.05; }}
        >
          <Suspense fallback={null}>
            <World />
            <Post />
            <Ready />
          </Suspense>
        </Canvas>
      </GlBoundary>
      <Letterbox />
      <Title />
      <Settings />
      <Pause />
      <Hud />
      <CargoHud />
      <FlightHud />
      <BusHud />
      <RoundsHud />
      <Forecast />
      <CampMenu />
      <WorldLabel />
      <CampfireMenu />
      <RecoveryFade />
      <DiscoveryCard />
      <EndScreen />
      <Atlas />
      <ExitScreen />
      <TouchStick />
      {DevPanel && <Suspense fallback={null}><DevPanel /></Suspense>}
    </>
  );
}
