# Florida Dream Loop — work in progress

The user approved `.dream-loop/concept.png` as the visual target on September 7. This worktree is an unfinished iteration toward that target. The first independent critic scored **2.8/10, Tier 0**; the goal has not been met. Later source and asset corrections are present locally, but the Mac is locked, preventing their next live Safari capture, performance measurement, and independent judge round. Development branch: `codex/florida-dream-loop`. Production acceptance and deployment remain pending.

## First evaluated pass

The critic in `.dream-loop/verdict-01.md` found four blocking composition differences: an oversized foreground yacht, a missing separate mid-left yacht, an undersized Fisheries grouping, and an empty distant channel. It also requested less regular water, warmer material lighting, more shaped hair/cloth detail, and stronger architectural/foliage surfaces. The airboat, couple, title, bridge, and broad shore placement already met its rough shape tolerance; that did not pass an entire tier.

The first automated checkpoint passed 90 tests. Its native Safari run used 1324×850, Detailed graphics, DPR 1.25, multi-draw enabled, and the real no-fire demo. It finished in 1:25.11 with thirteen jumps and seven close calls. The profiler excluded the first five racing seconds.

| District | FPS | p95 frame interval | Average draws | Rendered triangles |
| --- | ---: | ---: | ---: | ---: |
| New River | 36.4 | 32ms | 1,323 | 2.82M |
| Marina | 36.0 | 31ms | 1,193 | 3.06M |
| Mangrove | 32.0 | 34ms | 1,073 | 3.47M |
| Cove | 33.3 | 32ms | 1,225 | 3.76M |
| Bridge | 37.7 | 29ms | 727 | 3.38M |

Evidence is `.dream-loop/candidate-01.png`, `verdict-01.md`, and `benchmark-01.md`/`.png`. These measurements precede the indexed batching, AO/output fusion, final canvas anti-aliasing change, and latest water, sky, and hero refinements. They are not measurements of the current second pass.

## Current source corrections, awaiting live verification

- Three independently placed yachts now compose the staged entry/finish view. Racing restores the original collision-backed moorings through separate target visibility state; their transforms and destruction rules remain unchanged. Fisheries is larger and a distant harbor continues through the bridge opening.
- `water.js` loads the original generated Intracoastal height field, removes edge mismatch, filters grain, and derives linear normal/height data. Three differently oriented wave scales, rough sky reflection, and broken planar reflections replace the earlier banded surface. `sky.js` loads the generated v2 sky for the backdrop and environment lighting.
- Shared coastal material maps and facade divisions add relief, blue-gray glazing, and warmer structural surfaces to the existing waterfront kit. New Blender vegetation and landmark packs supply leaf/frond silhouettes and modeled bridge/Fisheries detail.
- The current v6 hero adds eight layered blonde locks, sculpted cloth folds, linen weave and facial contour normals, teak grain, and seating/fan detail. Approved face/eye vertices, UVs, facial albedo, and articulation pivots remain preserved; facial normals add light response rather than changing the face mesh.
- Indexed scenery retains the existing culling/destruction behavior. `postprocessing.js` moves the final AO multiply into the output pass before tone mapping, avoiding an extra beauty-buffer write and MSAA resolve. The canvas uses `antialias:false`, while geometry still renders with four samples in Detailed or two in Smooth. The optimization is implemented, but its second-pass FPS benefit is unmeasured.

| Current authored export | Bytes | Triangles | glTF primitives | Materials | Embedded textures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Hero v6 | 2,719,800 | 88,964 | 40 | 25 | 5 |
| Vegetation v1 | 2,829,492 | 15,174 | 14 | 3 | 1 |
| Landmarks v1 | 4,579,580 | 63,812 | 21 | 12 | 8 |

The asset reports and authoring views live under ignored `artifacts/florida-characters-v6/`, `artifacts/florida-vegetation-v1/`, and `artifacts/florida-landmarks-v1/`. Generated coastal, foliage, sky, and height-field sources retain exact prompt sidecars in `florida/assets/textures/`. Artifacts and export counts establish construction, not target equivalence.

The current integrated checkpoint passes all 101 tests, the production build succeeds with a 793.3 KB bundle, and `git diff --check` passes. This includes the final v6 crown export and the foliage AO regression fix. Local HTTP responses for the bundle, CSS, three new GLBs, sky, and water height image match the built bytes. Alpha-tested foliage is omitted from the unmasked SSAO normal pass and restored afterward; trunks, roots, beauty, reflection, and sun shadows remain. The second-pass Safari review and benchmark and next independent verdict remain pending. No physical-phone session or final mobile performance measurement has been performed. The earlier [destruction](florida-destruction-validation.md), [density correction](florida-density-rescue-validation.md), and [district](florida-districts-validation.md) reports describe historical completed builds, not this candidate.
