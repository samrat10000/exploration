// Everything inside the canvas. Shared systems stay mounted; the region's scene swaps behind a black cut.
import { Suspense, lazy } from "react";
import { Physics } from "@react-three/rapier";
import { useStore } from "../state/store";
import { CameraRig } from "./camera/CameraRig";
import { Director } from "./Director";
import { Birds } from "./environment/Birds";
import { Clouds } from "./environment/Clouds";
import { Sky } from "./environment/Sky";
import { T } from "./vehicle/tuning";
import { Mule } from "./vehicle/Mule";
import { Boat } from "./vehicle/Boat";
import { Bus } from "./vehicle/Bus";
import { Slipways } from "./world/Slipways";
import { Anchors } from "./world/Anchors";
import { WinchHud } from "./vehicle/winch/WinchHud";
import { Rover } from "./vehicle/Rover";
import { Snowcat } from "./vehicle/Snowcat";
import { Tortoise } from "./vehicle/Tortoise";
import { BusRoute } from "./world/BusRoute";
import { SkyMule } from "./vehicle/SkyMule";
import { SkyPlaces } from "./world/SkyPlaces";
import { SkyHazards } from "./world/SkyHazards";
import { HutRounds } from "./world/HutRounds";
import { KettleRegion } from "./world/kettle/KettleRegion";
import { Flowers } from "./world/Flowers";
import { Grass } from "./world/Grass";
import { Overlook } from "./world/Overlook";
import { driftList, flowerOk, rockFree } from "./world/props";
import { Rocks } from "./world/Rocks";
import { Terrain } from "./world/Terrain";
import { Trail } from "./world/Trail";
import { Vegetation } from "./world/Vegetation";
import { Water } from "./world/Water";
import { Waterfall } from "./world/Waterfall";

const DevScene = import.meta.env.DEV ? lazy(() => import("./DevScene")) : null;

/** The first valley (J1). Physics-bearing parts live inside <Physics>. */
function ValleyPhysics() {
  return (
    <>
      <Terrain />
      <Vegetation />
      <Rocks free={rockFree} />
    </>
  );
}
function ValleyScene() {
  return (
    <>
      <Grass />
      <Flowers drifts={driftList()} ok={flowerOk} />
      <Water />
      <Waterfall />
      <Trail />
      <Overlook />
      <Birds />
    </>
  );
}

export function World() {
  const paused = useStore((s) => s.phase === "paused" || s.phase === "exit");
  const vehicle = useStore((s) => s.vehicle);
  const region = useStore((s) => s.region);
  return (
    <>
      <Director />
      <Sky />
      <Clouds />
      <Physics gravity={[0, -T.gravity, 0]} paused={paused} updatePriority={-50} timeStep={1 / 60}>
        {region === "kettle" ? <KettleRegion key="kettle" /> : <ValleyPhysics key="valley" />}
        {vehicle === "mule" ? <Mule key={`mule-${region}`} /> : vehicle === "bus" ? <Bus key={`bus-${region}`} /> : vehicle === "boat" ? <Boat key={`boat-${region}`} /> : vehicle === "tortoise" ? <Tortoise key={`tortoise-${region}`} /> : vehicle === "snowcat" ? <Snowcat key={`snowcat-${region}`} /> : vehicle === "skymule" || vehicle === "glider" ? <SkyMule key={`${vehicle}-${region}`} kind={vehicle} /> : <Rover key={`rover-${region}`} />}
        <Anchors key={`anchors-${region}`} />
        {DevScene && <Suspense fallback={null}><DevScene /></Suspense>}
      </Physics>
      {region === "valley" && <ValleyScene key="valley-scene" />}
      <SkyPlaces key={`sky-${region}`} />
      <SkyHazards key={`hazards-${region}`} />
      <BusRoute key={`bus-${region}`} />
      <HutRounds key={`rounds-${region}`} />
      <Slipways key={`slip-${region}`} />
      <WinchHud />
      <CameraRig />
    </>
  );
}
