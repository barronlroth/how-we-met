# Florida V2 validation

Mobile support was subsequently added on September 5. The keyboard-only/phone-fallback statements below describe earlier art passes; current controls and validation are in [mobile validation](florida-mobile-validation.md).

The winding 4 km course, island choices, physical moorings, three rivals, drift reward, cafecito, protection, horn, jumps, pause/reset, and separate V2 local records pass 11 automated tests. The browser demo exercised the actual physics through all four checkpoints and finished in 1:25.48. Demo runs do not save best times.

The V2 visual-review captures cover 1440×900, 1672×941, 989×903, 390×844, active racing and arrival. The finish reviewer scored the listed water/lighting, wake and entry-composition fixes resolved. This is not a claim of exact equality to the generated concept or a frame-pacing benchmark.

Before the performance pass, the local in-app browser reported about 33 FPS in one active 1440×900 racing sample; the frame counter counted 3,653 draws and 6.7 million triangles across all rendering passes. The arrival sample reported 43 FPS. These are scene-specific observations, not cross-device guarantees. A steady 60 FPS remains a performance goal. Palm geometry was reduced from 7,228 to 2,928 triangles per asset without removing trees. The performance pass below addresses draw submission and per-pass visibility; slower hardware still needs separate testing.

Generated raster provenance scan: one raster, zero missing records. The desktop entry and phone notice make keyboard-only control scope explicit. Toronto source is unchanged.

## Rendering performance pass

The shoreline now shares material batches across course chunks on browsers with `WEBGL_multi_draw`. Each rendering camera culls individual objects, including reflected and shadow views. Other WebGL 2 browsers retain the original chunk renderer; alternative pooling needs separate browser measurements before adoption. The existing models, course, driving rules, water, and camera tuning remain in place. Hidden pages skip rendering and pause the race with engine/wind audio silenced. Detailed profiling is local, opt-in with F2, and has no network telemetry.

Measured in Codex's WebGL-capable in-app browser on this Mac, at **1440×900 CSS pixels and renderer DPR 1.25** (1800×1125 render pixels), using the real Watch a run pilot. Both runs exclude the first five racing seconds. Counts include all passes. CPU render time measures the composer call, not a GPU timer.

| Sector | Before FPS | After FPS | Before / after draws | Before / after triangles | Before / after CPU render |
| --- | ---: | ---: | ---: | ---: | ---: |
| Las Olas Isles | 37.5 | 50.3 | 2,944 / 1,593 | 5.67M / 3.74M | 17.1 / 13.1 ms |
| Bahia Mar | 36.2 | 54.7 | 3,003 / 1,419 | 6.07M / 3.93M | 15.2 / 10.8 ms |
| Lake Sylvia | 36.3 | 49.9 | 2,852 / 1,237 | 6.14M / 3.97M | 10.8 / 7.6 ms |
| Bridge Run | 37.9 | 51.9 | 2,362 / 804 | 5.56M / 3.71M | 10.2 / 6.7 ms |

That is 34–51% higher sector-average FPS, 46–66% fewer draw submissions, and 33–35% fewer rendered triangles at the same resolution. The after-run p95 frame intervals remain 33.3–33.4 ms: average FPS improved, but this is not a steady 60 FPS result. At DPR 1, both the original and optimized renderers reached approximately 60 FPS; do not attribute that lower-resolution result to batching. Runtime and host load vary, and the demo follows real frame-stepped physics, so counts are not identical-position microbenchmarks. Browser measurements above cover the multi-draw path; fallback correctness is unit-tested, without a cross-browser FPS claim.

The optimized demo finished all four checkpoints in **1:25.42**, with 13 jumps, 7 close calls, and 8 bumps. The browser console reported no errors or warnings. The 13 automated tests cover the 11 race behaviors plus batching transforms, distance transitions, restart, retained fallback chunks, per-object culling configuration, and AO restoration. The build passes and Toronto source is unchanged. Original detailed runs and captures are local under `.impeccable/performance/`.

To reproduce, fix the viewport at 1440×900, open `/florida/?benchmarkDpr=1.25`, enable F2, then Watch a run. Let the entire route finish without switching tabs. The override accepts only 1 or 1.25; ordinary play retains the device-density cap of 1.25. Start a new race to clear samples.

## Blender character and airboat art pass

The player boat now loads an original Blender-authored GLB with rounded, seated characters, separate facial features, modeled curls and highlighted hair, jewelry, clothing, a shaped hull, deck seams, upholstery, machinery and fittings. The user-supplied portraits informed this stylization; neither source portrait is included in the export or public assets. The boat retains the fan, pointing-arm, rider and protection animation connections. Feathered palm leaflets replace solid fronds, water crest contrast is reduced, and the destination buildings gain small modeled details. Course, controls, physics and Toronto source remain unchanged.

The exported asset is **1,693,696 bytes, 40 mesh objects, 61,734 triangles and 23 shared materials**, with no textures or external dependencies. The authoring script creates 24 materials; one is unused in the export. Fixed geometry is joined by material within each articulated group. The new loader adds approximately 64 KB to the minified JavaScript bundle (744 KB total, before transfer compression). Blender does not run in the browser. Palm simplification offsets part of the new hero geometry; the final route renders roughly 6–10% fewer triangles than the previous art at comparable sections.

Two local comparisons used the same browser, Mac, 1440×900 CSS viewport, DPR 1.25, renderer settings, full real-physics demo and five-second warm-up exclusion. The unchanged baseline was frozen before this art pass. The final adjacent comparison is:

| Sector | Previous art FPS | Final art FPS | Previous / final p95 frame interval | Previous / final CPU render | Previous / final draws | Previous / final triangles |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Las Olas Isles | 53.1 | 59.2 | 33.3 / 18.4 ms | 10.8 / 9.4 ms | 1,604 / 1,623 | 3.77M / 3.54M |
| Bahia Mar | 56.1 | 60.0 | 33.3 / 18.3 ms | 10.5 / 8.7 ms | 1,423 / 1,454 | 3.94M / 3.54M |
| Lake Sylvia | 60.0 | 58.0 | 18.1 / 18.6 ms | 8.2 / 8.8 ms | 1,240 / 1,269 | 4.01M / 3.68M |
| Bridge Run | 60.0 | 54.0 | 18.0 / 33.3 ms | 7.3 / 7.2 ms | 801 / 833 | 3.72M / 3.39M |

The unweighted mean of the four sector FPS values is 57.3 before and 57.8 after (+0.9%). An earlier comparison, before a small collar/hair refinement, averaged 51.325 before and 49.675 after (−3.2%). Both aggregate comparisons fall inside the user's approximate 5% performance-loss target. This is **not a guarantee of less than 5% loss in each section**: the final Bridge Run sample is 10% slower, and the earlier Bahia Mar sample was 9.4% slower. Host timing and real frame-stepped trajectories vary; the mixed results do not establish an overall speedup caused by the artwork. These are arithmetic means of sector averages, not a separately measured time-weighted whole-run FPS. Other devices and browsers remain unmeasured.

The final art demo completed all checkpoints in **1:28.11**, with 13 jumps, 6 close calls and 12 bumps. All **15 automated tests** pass: the previous 13 plus GLB load/articulation/coordinate-envelope checks and geometry/material/file-size budgets. Production build passes. A manual player start, horn cooldown, pause and resume were checked; the browser reported no errors or warnings. Desktop entry (1440×900), the user's narrower desktop layout (989×903), phone fallback (390×844), racing and finish captures were inspected. Phone steering remains deferred. Authoring renders show facial construction; rear-facing gameplay captures verify the silhouette and materials in the browser, rather than close facial likeness.

Local review evidence is in `.impeccable/art-review/`: `baseline.txt` / `after.txt` for the first pair, `final-baseline.txt` / `final-performance.txt` for the final pair, plus the five captures and independent review. The original concept remains an art target; these checks do not claim equivalent cinematic lighting or fidelity. The shipping-raster provenance scan still reports one raster and zero missing records.

## Selected animated-feature characters — September 5, 2026

The user selected `docs/concepts/florida-couple-approved-v4.png` after rejecting the first Blender character pass. The replacement is authored in `scripts/florida_characters.py` and assembled/exported by `scripts/build-florida-hero.py`. It has separate sculpted head profiles, a generated facial albedo atlas, glossy eye surfaces, irregular curls, a continuous wavy hair mantle, and the selected sage/teal and coral/cream outfits. The facial expressions are fixed; this is not a facial animation rig. Both the close authoring renders and browser views remain necessary to judge the adaptation against the concept.

The GLB is **1,710,764 bytes** (+1.0% over v3), with **63,476 triangles**, **38 Blender mesh objects / 40 glTF primitives**, and **25 exported materials**. One **1024×512 JPEG facial atlas** is embedded and shared between the faces and eye surfaces. The original PNG and exact generation prompt are in `art/characters/`; neither original supplied photograph is embedded. Geometry and asset size remain below the prior 65,000-triangle, 42-mesh, 1.8 MB limits. The material budget increases from 24 to 25 to support the facial paint and glossy eyes; it is an implementation guardrail, while measured race performance is the user's acceptance target.

The current-session v3 baseline was frozen before edits at `5d9f206`. Both runs use the actual Watch a run pilot in the same WebGL-capable Codex browser at **1440×900, DPR 1.25**, excluding the first five race seconds. No Blender rendering ran concurrently with either measurement.

| Sector | v3 baseline FPS | Rebuilt characters FPS | Baseline / rebuilt p95 | Baseline / rebuilt CPU render |
| --- | ---: | ---: | ---: | ---: |
| Las Olas Isles | 46.2 | 53.1 | 33.4 / 33.4 ms | 15.4 / 12.2 ms |
| Bahia Mar | 46.0 | 55.7 | 33.4 / 33.3 ms | 13.0 / 11.5 ms |
| Lake Sylvia | 46.1 | 55.3 | 33.4 / 33.3 ms | 8.6 / 8.1 ms |
| Bridge Run | 48.8 | 60.0 | 33.4 / 17.8 ms | 7.6 / 7.7 ms |

No sector-average FPS regression was observed in this pair, within the requested approximate 5% loss target. The unweighted sector means are 46.775 and 56.025 FPS; host load and frame-stepped trajectories vary, so the difference does not prove a speedup caused by the artwork. The p95 intervals still reach 33 ms, and other devices are unmeasured. The run finished all four checkpoints in **1:25.59**, with 13 jumps, 5 close calls and 8 bumps. Raw results: `.impeccable/characters-v4/baseline.txt` and `final-performance.txt`.

Entry and arrival turn the boat toward the camera. A short-range, shadow-free portrait fill light exists only in those staged views; it is hidden in racing. The race camera, physics, course, controls and Toronto source remain unchanged. Desktop 1440×900, narrow 989×903, phone fallback 390×844, racing and finish captures are in `.impeccable/characters-v4/`. Authoring renders are in `artifacts/florida-characters-v4/` and are not substitutes for browser evidence.

All **15 tests** and the production build pass. The GLB tests check articulation, world-axis envelope, geometry/material/download budgets, valid UVs on textured surfaces, and one compact embedded JPEG with no external texture dependency. Node uses a bitmap placeholder in GLTFLoader solely for the absent browser image decoder; the real browser verifies image decoding and appearance. No browser warnings/errors were recorded. Raster provenance scan covers generated teak, both concepts and the facial atlas: **4 rasters, 0 missing**. The design detector's single advisory is the pre-existing one-use nameplate color `#1c6566`; it is not a new UI token or a change from this pass.

The final reviewed fixes make Nina **blonde**, per the user's correction; broaden her rolling waves, replace puffed sleeves with sloping open cuffs, and sample separate exposed-skin colors from the facial atlas. Final asset counts above reflect those fixes. A final full-route run of this exact asset reached **60.0 FPS in all four sectors**, with p95 frame intervals of **18.2 / 18.2 / 18.1 / 18.2 ms** and CPU render means of **9.0 / 8.7 / 8.5 / 7.3 ms**. It finished in **1:25.52**, with 13 jumps, 6 close calls and 8 bumps. Raw results are `.impeccable/characters-v4/final-blonde-performance.txt`. The earlier textured-character pair is retained above to show observed variation rather than imply every run is locked to 60 FPS. Both measurements meet the approximate 5% loss target against the frozen current-session baseline.

Independent review: after one character rebuild and the listed hair/sleeve/skin/documentation fixes, the reviewer scored all four fixes **resolved**, with disposition **ship** at that fix-list scope. This does not claim exact cinematic equivalence to the selected concept. Review and verdict: `.impeccable/characters-v4/review.md` and `verdict.md`. Fresh documentation records the final built asset. The exported world-space envelope is 3.360×3.604×6.973 game units; the height test permits 3.65 to accommodate the rounded hair silhouette.
