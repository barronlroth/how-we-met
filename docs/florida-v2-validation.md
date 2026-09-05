# Florida V2 validation

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
