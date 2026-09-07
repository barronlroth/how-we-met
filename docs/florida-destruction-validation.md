# Florida shootable destruction — September 7, 2026

The user requested that shooting destroy objects. This supersedes the earlier temporary-soak response while preserving the dense five-district scene, current Blender exports, couple, and Space/SOAK controls.

## Behavior

Each direct projectile hit removes one health point. The nearest eligible target blocks the shot; subsequent shots can pass its position once it is cleared.

| Target | Hits to clear | Final response |
| --- | ---: | --- |
| Tube rider | 1 | Tube pieces and spray; target leaves the race |
| Gator | 2 | Water-only splash; gator leaves the course |
| Rival racer | 3 | Boat pieces and spray; rival stops racing |
| Water taxi | 4 | Boat pieces and spray; crossing stops |
| Moored boat | 4 | Batched hull disappears with pieces and spray |
| Departing yacht | 6 | Yacht disappears with pieces and spray |

Damaged nearby targets receive a camera-facing health bar. It flashes white on damage, then shows yellow or coral as health drops. Undamaged, cleared, and distant targets have no marker. Rival slowdown still lasts 1.8 seconds with a 2.8-second recovery window, but damage applies throughout that window.

Cleared targets no longer collide, block shots, supply near-miss rewards, or influence drafting. Eliminated rivals stop progressing and are excluded from ranking. The cleared departing yacht no longer diverts the demo driver or other traffic. SPLASHDOWN! confirms destruction; the finish panel records targets cleared in place of the former bump statistic. Replay restores full health, all hidden hulls, and the count. Pause freezes damage timers and breakup animation; finish clears transient effects while preserving the result.

Buildings, bridges, docks, landmarks, banks, pickups, ramps, and wakes are not destructible. This is cartoon water-blaster feedback: boats and tubes shed colored pieces, while gators receive only water effects.

## Rendering and checks

`destruction-effects.js` uses three fixed instanced pools: 64 panels, 64 planks, and 40 tube fragments, for a maximum of 168 pieces. Pieces float briefly and disappear within 2.75 seconds; repeated destruction reuses slots. Spray and expanding rings reuse the existing pools. Reduced motion reduces emission and travel and removes tumbling and the added camera shake. No Blender asset, light, or shadow pass was added. Health markers use two shared instanced meshes for at most 32 damaged nearby targets.

`npm test` passes all 80 tests; the production build succeeds (784.5 KB bundled JavaScript), and the diff check is clean. The simulation tests cover durability, repeated hits during soak/scare effects, first-hit blocking, single destruction credit, collision removal, destroyed-rival ranking/drafting, departing-yacht avoidance, pickup exclusions, pause, finish, and replay. Effects tests check fixed buffer reuse under repeated destruction, expiry, pause/reset, and reduced motion. Both scenery batching paths test target hiding, persistence through culling, and restoration on replay.

Controlled browser fixtures exercised all six target types through the actual simulation, events, and renderer. They verified health markers, a rival elimination changing rank from second to first, removal of a moored hull, and restoration on replay. A temporary local QA harness freezes the scene after impact for inspection; these are controlled fixtures, not ordinary race screenshots.

Evidence in ignored `.impeccable/destruction/`: `mooring-destroyed.png`, `mooring-reset.png`, `rival-health-final.png`, `rival-destroyed.png`, `tube-popped.png`, `gator-defeated.png`, `taxi-destroyed.png`, and `departing-yacht-destroyed.png`.

A full-route Safari run used the production renderer and real pilot physics with held fire added by the local QA harness. It finished in **1:23.39**, with twelve jumps, zero close calls, 343 shots, 171 damaging hits, and 64 targets cleared. The normal production demo still does not fire automatically. This run used 1324×850, Detailed graphics, fixed DPR 1.25; evidence is `held-fire-performance.txt` and `held-fire-finish.png` in the same directory.

| District | Average FPS | p95 frame interval | Draw calls | Rendered triangles |
| --- | ---: | ---: | ---: | ---: |
| New River | 38.5 | 32ms | 1,250 | 2.12M |
| Superyacht Marina | 41.1 | 28ms | 1,155 | 2.05M |
| Mangrove Cut | 40.6 | 28ms | 1,122 | 2.19M |
| Party Cove | 36.7 | 31ms | 1,158 | 2.86M |
| The Bridge Run | 40.9 | 28ms | 781 | 2.40M |

The preceding density build’s no-fire run ranged from 36.8–41.5 FPS on the same Safari settings. Held fire changes both effects and scene occupancy by removing targets, so this comparison does not isolate the cost of destruction or establish unchanged performance. No physical-phone session was performed, and these results do not establish a universal frame rate or a 5% performance-cost guarantee.
