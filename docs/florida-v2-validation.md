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
