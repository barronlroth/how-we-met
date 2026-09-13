# Florida storm and character motion QA

Base: `f0db43a4b4fa442fbb344bc6949f25404704af6f`.
Measured on September 13, 2026, in Chrome on this Mac. These are desktop
measurements, not proof of performance on a physical phone.

## Baseline

Full built-in demo route, 1157 × 908 CSS pixels, Detailed, DPR 1.25, 4× AA.
The game's F2 profiler excludes the first five race seconds.

| District | FPS | p95 frame time | Mean render submission |
| --- | ---: | ---: | ---: |
| New River | 59.9 | 16.8 ms | 9.5 ms |
| Superyacht Marina | 60.0 | 16.8 ms | 9.3 ms |
| Mangrove Cut | 60.0 | 16.8 ms | 8.9 ms |
| Party Cove | 60.0 | 17.1 ms | 10.1 ms |
| The Bridge Run | 60.0 | 16.9 ms | 8.9 ms |

Demo finished in 1:25.10, with 13 jumps and seven close calls. Baseline tests:
161 passed; build passed. Browser measurements include the existing soundtrack.

## Combined implementation

Same browser viewport and settings as baseline, full demo route:

| District | FPS | p95 frame time | Mean render submission |
| --- | ---: | ---: | ---: |
| New River | 59.9 | 16.8 ms | 9.8 ms |
| Superyacht Marina | 59.8 | 16.8 ms | 9.9 ms |
| Mangrove Cut (storm) | 60.0 | 17.4 ms | 9.7 ms |
| Party Cove | 60.0 | 16.8 ms | 9.7 ms |
| The Bridge Run | 60.0 | 17.1 ms | 9.1 ms |

Demo finished in 1:24.93, with 14 jumps and seven close calls. Variable frame
steps produce small route differences; this is a comparable full-route check,
not a frame-identical replay. All 166 tests and the combined build passed.
Browser console reported no warnings or errors after the full run.

Visual inspection: overcast sky and windblown rain are clearly visible in the
mangroves. Water darkens, and the boat, buoys, HUD, and route remain legible.
Character poses remain attached to the boat through the run. Sunshine returns
after the storm. The animation adds no meshes or materials; rain uses one fixed
buffer and one main-view draw, excluded from reflection, AO, and shadow passes.

## Continuous-fire stress run

Same desktop settings, with `?benchmarkDpr=1.25&benchmarkFire=1`, **Watch a run**,
and F2 enabled. The demo uses the normal held-fire simulation path.

| District | FPS | p95 frame time | Mean render submission |
| --- | ---: | ---: | ---: |
| New River | 59.6 | 17.0 ms | 10.4 ms |
| Superyacht Marina | 59.9 | 16.8 ms | 9.5 ms |
| Mangrove Cut (storm) | 60.0 | 16.8 ms | 9.3 ms |
| Party Cove | 60.0 | 16.8 ms | 9.5 ms |
| The Bridge Run | 60.0 | 16.8 ms | 8.8 ms |

Finished in 1:22.96: 344 shots, 138 hits, 33 targets destroyed, 12 jumps.
No browser warnings or errors. No build/test processes ran during this run.

## Phone-size layout and lifecycle

Chrome viewport 390 × 844, Touch controls, Smooth, DPR 1, 2× AA. Storm, course,
and HUD remained legible. Mangrove Cut averaged 60.0 FPS (p95 16.8 ms). The
partial run recorded New River 60.0 and Marina 58.2 FPS; a build/test process
overlapped this layout check, so it is not an isolated performance comparison.
This was desktop rendering at phone dimensions, not physical-phone testing.

Paused during peak storm at 0:49.54: timer held and audio element reported
paused. Start over reset distance/time and visibly restored sunny weather.
Unit tests independently verify frozen rain time/anchor and character poses,
exact reset values, bounded rain buffers, and quality/reduced-motion settings.
Temporary viewport and input/graphics overrides were restored afterward.

The approximately 60 FPS target held in the measured desktop runs, including
continuous fire in the storm. This does not establish universal 60 FPS or
physical-phone performance. No production deployment performed.
