# TIME — day, golden hour, night (and dawn)
_Working reference: `makeTOD()` in `reference/src/kit/time.js` (sky shader incl. cirrus, stars, Milky Way). Press 1–4 in either demo to switch live. Port as `src/game/environment/timeOfDay.ts`._

## 1. The four presets (everything else is a smooth blend between them)
| | Dawn | Day | Golden hour | Night |
|---|---|---|---|---|
| Sky top / horizon | `#4A5F8E` / `#F3B49A` | `#3D79C4` / `#CFE3EE` | `#5E77A6` / `#F2C18E` | `#050A18` / `#1B2846` |
| Sun (night: moon) | `#FFB48C` ×1.15, low east | `#FFF4E2` ×2.0, high | `#FFC27A` ×1.9, low west | moon `#A9BCF0` ×0.42 |
| Hemisphere sky / ground | `#9DB0D0` / `#5A4A48` | `#BBD3EA` / `#5A5644` | `#C9D4EA` / `#8A6A58` | `#34477A` / `#141420` |
| Fog | `#E2BBA8` | `#C6DAE6` | `#E9C7A4` | `#152038` |
| Exposure | 1.0 | 1.0 | 1.08 | 1.3 (lifted so night stays readable) |
| Stars / Milky Way | faint | off | off | on: twinkling stars + a soft Milky Way band |
| Lamps (windows, lanterns, string lights) | 55% | off (12% residual) | 45% | 100% |

- **Transitions:** every value eases toward its target at k = 1.1/s, so a switch takes about 3–4 s. Nothing snaps.
- **What drives time:**
  - Journeys: route progress (JOURNEYS §1.1).
  - Free roam: a slow real clock, one full day = 40 min.
  - Campfires: "wait until…".
  - Photo mode: a ±1.5 h nudge.
  - Dev panel: a slider.

## 2. Element by element
| Element | Dawn | Day | Golden | Night |
|---|---|---|---|---|
| Clouds | peach undersides | white | warm gold | blue-silver, 32% brightness (tint = horizon → white × light) |
| Cloud sea | pink-lit | bright | glowing amber | moonlit silver |
| Water | pastel reflection | blue + sun glint | gold glint | dark with a moon glint (`uNight`) |
| Snow | pink | white | apricot | pale blue |
| Flowers | colours muted | full colour | warm, saturated | dark shapes; fireflies take over |
| Grass wind | calm | gusty | calm | very calm |
| Windows + lanterns | warm | off | warm | full glow + halo (in game: emissive + bloom) |
| Fireflies | – | – | first ones (35%) | full (makeFireflies) |
| Butterflies / birds | birds wake | butterflies + birdsong | swallows | crickets instead |
| Sky lanterns | – | – | – | released from camps and villages, rising slowly for 40–80 s |
| Fireworks | – | – | – | village festivals only (makeFireworks), boom delayed by distance |
| Balloons | inflating on fields | floating | best light | burners glow orange in the dark |
| Dragons | mist trails | bright scales | glinting gold | the pearl glows, eyes glow |
| Vehicle lights | on | off | on | headlights + real spotlights (ART §3) |
| Storms | – | grey | bruised purple | lightning lights whole clouds (bolt light 6 for 0.12 s) |

## 3. Night must feel safe and magical, not dark
- Exposure lift + blue hemisphere so silhouettes always read.
- Every place the player is likely to stop at night has warm light: camps, huts, villages, stupas.
- Sound swaps: crickets, distant music from villages, quieter wind.
- Never fully black: the minimum sky brightness is the horizon colour.
