# Florida districts and Nina banter — September 5, 2026

> Historical record of the initial five-district release (`4cb0724`). The subsequent [density correction](florida-density-rescue-validation.md) supersedes its scenery counts, asset provenance, and current performance results.

The user requested all five proposed environments and fictional Nina quotes about Miles, Brauser, Josh, Clark, and Dewey. This release changes the course composition, traffic, and commentary while preserving the approved couple, airboat, keyboard/touch controls, and water blaster.

## Built environments

The 4,029m route is a compressed Fort Lauderdale highlight reel. Its places are rearranged for racing rather than reproducing a literal geographic route. The existing curved centerline remains; widths and scenery change by district.

| Progress | District | Visible composition and driving change |
| --- | --- | --- |
| 0–21% | New River | Restaurants, striped awnings, cafe decks, promenade furniture, crowds, towers, and a small raised bridge frame the narrow urban bends. |
| 21–44% | Superyacht Marina | Large yachts, sail masts and rigging, piers, a yacht club, service sheds, and lifting gantries surround a wider channel and the marina island split. A departing yacht crosses the racing route. |
| 44–63% | Mangrove Cut | Curved roots and trunks, layered canopies, boardwalks, rooted island banks, and pelicans replace the built waterfront. Yellow markers and extra Cafecito identify the alternate side of the mangrove island. |
| 63–80% | Party Cove | Broad water opens between sandy banks, umbrellas, crowded bar decks, rafted boats, and beached pontoons on slipways. Staggered tube riders and a moving taxi form a crossing with open gaps. |
| 80–100% | The Bridge Run | Larger homes, towers, promenade planting, and dining terraces lead to the 17th Street Causeway Bridge. Fisheries remains on the right, with a fuller deck and crowd. |

The water tint eases between district colors. These are native Three.js models and material changes, not a concept image behind the boat. The kit reuses opaque materials and baked geometry; shoreline instances use the existing regional batching and reflection culling. No additional render pass or light was added. The checked-in `airboat-couple-v5.glb` is unchanged.

The art direction draws from the New River/Intracoastal mix of waterfront activity described by [Visit Lauderdale’s Water Taxi guide](https://www.visitlauderdale.com/plan-your-vacation/transportation/water-taxi/), its [yachting guide](https://www.visitlauderdale.com/yachting/), and the coastal vegetation of [Hugh Taylor Birch State Park](https://www.floridastateparks.org/HughTaylorBirch). Real reference photographs are not shipped with the game.

## Race and commentary behavior

`course.js` is the shared authority for five districts, checkpoints, both island branches, and 67 moored sport boats, superyachts, and sailboats. The renderer uses the same hull model, position, scale, and yaw as the simulation. The moving departure uses its full transverse hull for player contact and shot blocking. Water cannot shoot through its bow to a swimmer behind it; hitting it does not remove or slow the yacht. Rivals and the demo driver predict its crossing position and steer around it. Berth collisions resolve into open water instead of trapping the player against the bank.

`nina-lines.js` contains 25 explicitly fictional jokes, five per friend. A run offers at most one turn per friend, with the selection rotating over five replays. The first opportunity is after ten racing seconds, with at least thirteen seconds between delivered jokes. Checkpoint and collision calls take priority, followed by 1.5 seconds of breathing room. Routine reward chatter yields to an active joke. Paused, ready, countdown, and finished states do not consume lines; a delay never releases a burst of queued captions. A busy race can end before every friend gets a turn.

Examples include “Miles would miss this turn and blame Apple Maps,” “Brauser would ask if the alligator knows the owner,” and “Dewey would wave at the alligator like they went to college.” These are authored game banter, not quotes or claims sourced from the friends.

## Verification

`npm test` passes all 61 tests and `npm run build` passes. New coverage checks district boundaries, both branch clearances, hull transforms, the moving yacht’s escape gap, bow-level shot blocking, player collision, berth recovery, the staggered cove crossing, and banter scheduling/reset/rotation. Six complete races at 30, 60, and 120Hz, with and without held fire, finish first with all four checkpoints and gold in approximately 83.6–84.8 seconds. Rival avoidance also passed 72 sampled soak scenarios. Existing touch event-handler, weapon, hero-budget, and batching checks remain in the suite.

The geometry construction check in ignored `.impeccable/districts/world-geometry.json` found zero invalid position values across 9,619 instances, 869 unique geometries, and 165 unique materials. These are construction inventory counts, not per-frame draw counts or browser performance measurements.

Native Safari completed the exact final build at 1324×850, Detailed graphics, fixed DPR 1.25. The full demo finished in 1:24.15 with twelve jumps, three close calls, and five bumps. Its profiler excludes the first five racing seconds and records only while the document is visible.

| Final district | Average FPS | p95 frame interval | Average rendered triangles |
| --- | ---: | ---: | ---: |
| New River | 43.8 | 27ms | 1.45M |
| Superyacht Marina | 42.4 | 27ms | 1.46M |
| Mangrove Cut | 42.3 | 27ms | 1.50M |
| Party Cove | 43.7 | 26ms | 1.46M |
| The Bridge Run | 44.6 | 26ms | 1.66M |

The preceding build on the same Safari viewport and settings ranged from 31.2–32.3 FPS, with 34–38ms p95 frame intervals and 3.40–3.63M rendered triangles across its four sectors. Sector boundaries changed, so individual old/new sector rows are not identical slices. This is a same-host, same-settings full-route comparison, not a universal speedup guarantee. The final profile is recorded in `.impeccable/districts/final-performance.txt`; the preceding profile is `before-performance.txt`. The intermediate candidate profile remains `candidate-performance.txt`.

The visible route review captured `new-river.png`, `marina.png`, `mangrove-entry.png`, `party-cove-entry.png`, and `bridge-finale.png` in that evidence directory. Entry, earlier candidate finish, and additional route captures are retained there with their own filenames. The final review found no further actionable issue in the scoped environment/traffic pass.

No new mobile viewport session or physical-phone playtest was performed for this release. Existing touch controls are covered by automated event-handler checks and the earlier [mobile validation](florida-mobile-validation.md), which remains separate from this desktop Safari evidence. Blender is not needed to play or build the web game; the district expansion uses code-authored scenery and consumes the existing hero GLB.
