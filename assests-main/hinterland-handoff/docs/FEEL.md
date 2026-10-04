# FEEL — how the world reacts to the vehicle
_Working reference: `reference/src/levels/valley.js` (view it in reference/demos/valley.html; press **F** in it to see the live suspension + surface readout). Port its numbers as the starting tuning; tune by feel; log changes in STATUS._

## 1. Suspension (every ground vehicle)
Four independent spring-damper wheels. This is what makes holes and stones feel real.
| Value | Rover | Mule | Bus (Loaf) | Tortoise | Snowcat |
|---|---|---|---|---|---|
| Rest length | 0.50 | 0.36 | 0.55 | 0.42 | 0.30 (bogies) |
| Travel ± | 0.26 | 0.18 | 0.20 | 0.22 | 0.12 |
| Spring k (per wheel, mass-normalised) | 28 | 34 | 22 | 26 | 60 |
| Damper c | 1.9 | 2.4 | 2.6 | 2.0 | 6 |
| Pitch / roll inertia | 2.4 / 1.05 | 1.6 / 0.6 | 6 / 2.2 | 2.0 / 0.9 | 4 / 3 |

- **Gravity** 13.7 (1.4 × real): snappy and readable.
- **Static sag** is about 0.12 m, so the wheels tuck into the arches when parked.
- **Bump stop:** beyond full travel the spring stiffness jumps to 400. You feel a firm "thunk" but the vehicle never bottoms through.
- **Damping ratio** is about 0.35. One visible rebound after a hole, then it settles. Bouncy, never wobbly.
- **Integration:** 4 substeps per frame, semi-implicit Euler. Attitude also blends toward the terrain tilt (k = 1.2/s) so it can never drift.
- **Rapier:** use a raycast vehicle with the same spring and damper values. Keep the visual wheel offset smoothed (k = 30).

## 2. Surfaces
| Surface | Max speed | Drag | Steering | Sound | Particles |
|---|---|---|---|---|---|
| Stone path | 18 | 0.22 | 100% | tyre rumble on stones | light dust above 6 m/s, warm by day / grey at night |
| Meadow (off path) | 13 | 0.5 | 100% | soft swish | petals in the flower colours, fluttering |
| Snow | 10 | 0.65 | 85% | crunch bursts (2.2 kHz, 80 ms) | white spray off the tyres + powder |
| Water (ford, puddle) | 6 | 1.8 | 90% | splash bursts (noise > 900 Hz) | splash arcs + mist + ripples |
| Mud (later) | 9 | 1.2 | 70% | squelch | brown flecks, darkened tyres |

Engine load rises by 0.2 in snow and water: you hear it working harder.

## 3. Water: splash, ripples, wake
- **Splash:** when a wheel is in water and the vehicle is above 1.2 m/s, emit up to `min(10, speed × 0.9)` droplets per wheel per frame.
  - Droplets fly up 2.2–5 m/s, outward 1.2–3.6 m/s, and carry 35% of the vehicle's velocity.
  - Life 0.7–1.2 s, gravity 9.8. They stop on the water surface.
- **Mist:** soft white puffs that grow from 0.5 to 2.1 over 1.2 s at 25% alpha.
- **Ripples:** a ring every 0.12 s per wet wheel, growing to 2.7 m over 0.7 s while fading from 50%.
- **Puddles:** potholes on the path hold water, so even a puddle splashes.
- **Water shader:** flows along the stream with foam at the banks, a Fresnel sky reflection, and a sun (or moon) glint.

## 4. Snow: real ruts
- **Snow layer:** a deformable grid (0.5 m cells) over the pass. Fresh depth is 0.30 m ± noise, tapering to nothing at the edges.
- **Pressure:** each wheel compacts the cells under its contact (radius 0.34 m) down to 0.05 m.
  - The ring just outside the tyre heaves up (+0.006 per frame, to 0.42 m max), so the ruts get raised edges.
  - Ruts stay for the whole session; driving back over them is smoother.
- **Sinking:** the wheel rides on the compacted top, so it visibly sinks a few cm, plus drag.
- **Normals:** recompute only when the snow changed (a dirty flag).
- **In game:** a larger tiled snow heightmap texture instead of a mesh, so the whole snowfield can take tracks (RT-based, same rules).

## 5. Bounce, thuds, camera
- **Holes and bumps:** potholes (−0.13 to −0.23 m, half of them puddles) and stones (+0.16 to +0.22 m) every 22–48 m along paths.
- **Landing thud:** low-pass noise at 160 Hz, volume = impact speed × 0.12, with a camera shake of the same size.
- **Camera bump:** compression above 0.2 m shakes the camera vertically by 0.18 × the excess, decaying at 6/s.
- **Body lean:** the chassis leans out of turns up to 0.03 rad at speed.

## 6. Plants part around you
Grass and flowers bend away from the vehicle inside 2.8 m. The push grows with plant height, and they also dip a little.

This is done in the vertex shader (after `instanceMatrix`) with a `uCar` uniform. Wind is a gust wave plus flutter. Port `meadowMat()` from levels/valley.js.

## 7. Per-vehicle character
- **Mule:** tips beyond 5.5 m/s² of lateral acceleration (JOURNEYS §2.1). The rack creaks as cargo shifts, and the crates rattle more over holes.
- **Bus:** slow body roll (high roll inertia), passengers react to bumps (JOURNEYS §1.14), the doors rattle, and the suspension "breathes" at idle.
- **Snowcat:** almost no bounce, deep track marks, pushes snow drifts, and snow sprays off the tracks when turning.
- **Tortoise:** soft and floaty. The roof tent and awning sway; the string lights swing on a pendulum.
- **Sky Mule** (in the air): see reference/src/levels/skyroad.js. Wing-tip flutter when slow, a bump with scattering birds, and turbulence in storms.
