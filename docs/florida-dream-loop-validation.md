# Florida Dream Loop — work in progress

The approved visual target is `.dream-loop/concept.png`. The latest independently evaluated frame, round seven, scored **6.6/10 and passed Tier 2**. The 8/10 visual target remains open. The latest default-quality race averaged 56.4–59.9 FPS by district; materials and consistent performance remain under refinement. Branch: `codex/florida-dream-loop`; production acceptance and deployment are pending.

## Visual reviews

| Round | Score | Highest complete gate | Main remaining issue |
| --- | ---: | --- | --- |
| 1 | 2.8 | None | Foreground/midground yacht placement, restaurant scale, distant channel |
| 2 | 4.2 | Shape/layout | Lighting, sky, water contrast |
| 3 | 5.3 | Lighting/color | Water surface definition, sculpt/material detail in hero and waterfront |
| 4 | 5.7 | Lighting/color | Soft wave faces, hair volume, balcony depth and palm crowns |
| 5 | 5.9 | Lighting/color | Repeating water bands, cordlike hair, uniform glazing and palm detail |
| 6 | 6.2 | Lighting/color | Left reflection bands, smooth cloth/bolsters, shallow openings |
| 7 | 6.6 | Lighting/color | Foreground wave relief, cloth/upholstery form, architecture/palm separation |

Each fresh reviewer compares the approved concept, current live screenshot, previous screenshot, and previous verdict. The latest accepted layout retains the hero boat, three individually staged yachts, bridge, restaurant, and distant channel. Round three passed the overall sky, exposure, palette, and shadow separation. Later work preserves those decisions. Evidence and full directives are under ignored `.dream-loop/candidate-01.png` through `candidate-07.png` and `verdict-01.md` through `verdict-07.md`.

Rounds three through seven were captured in the in-app browser at the exact concept dimensions, 1536×1024. Earlier native Safari captures included browser chrome and a roughly 4% aspect difference, which the reviewers excluded. The in-app browser allows WebGL checks while the Mac desktop is locked.

## Measured performance

The historical runs below use the real no-fire demo, Detailed graphics, DPR 1.25, and multi-draw. The first five racing seconds are excluded. Results from different browser engines and viewport sizes are reported separately.

| District | Safari round 1, 1324×850 | Safari round 2, 1324×850 | In-app round 3, 1536×1024 |
| --- | ---: | ---: | ---: |
| New River | 36.4 FPS | 45.7 FPS | 46.6 FPS |
| Marina | 36.0 FPS | 47.8 FPS | 47.6 FPS |
| Mangrove | 32.0 FPS | 45.1 FPS | 44.6 FPS |
| Cove | 33.3 FPS | 41.3 FPS | 44.4 FPS |
| Bridge | 37.7 FPS | 48.8 FPS | 49.1 FPS |

Safari round two followed indexed scenery batching, AO/output fusion, removal of redundant canvas multisampling, and foliage masking in the AO pass. It improved district FPS by 25–41% over the same-size Safari baseline. The run finished in 1:25.11 with thirteen jumps and six close calls. Detailed timings are in `.dream-loop/benchmark-02.md`.

In-app round three finished in 1:25.12 with thirteen jumps and seven close calls. Its district p95 frame intervals were 33.4–34.2 ms, and rendered triangles ranged from 2.91M to 3.99M. That run precedes the Fourier wave cache, new villas, latest hero/palms, and restoration of vertex sharing after surface UV projection. Evidence is `.dream-loop/benchmark-03.txt` and `.png`; these are not measurements of round four.

Round-four quality comparisons use the same 1536×1024 in-app browser, scene density, assets and no-fire demo. Only DPR and composer sample count differ. No Blender export or authoring render ran during measurement. The default remains DPR capped at 1.25 with four samples; these lower-cost profiles are measured candidates, not a claimed 60 FPS result.

| District | DPR 1.25 / AA 4 | DPR 1.25 / AA 2 | DPR 1 / AA 4 | DPR 1 / AA 2 |
| --- | ---: | ---: | ---: | ---: |
| New River | 46.7 | 52.8 | 53.9 | 57.2 |
| Marina | 47.6 | 53.1 | 53.6 | 58.2 |
| Mangrove | 44.8 | 54.6 | 51.3 | 55.6 |
| Cove | 44.7 | 49.7 | 50.0 | 46.6 |
| Bridge | 48.2 | 54.5 | 54.8 | 58.5 |

Units are average FPS after warm-up. The native-resolution/two-sample Cove run had a mid-run slowdown; its lower average should not be dismissed or generalized as a stable 60 FPS profile. All runs completed in 1:25.07–1:25.11. Full timings and screenshots are `.dream-loop/benchmark-04-aa4`, `benchmark-04-aa2`, `benchmark-04-dpr1-aa4`, and `benchmark-04-dpr1-aa2` (`.txt`/`.png`). These precede round-five displacement geometry and revised assets.

## Round-five continuous-fire validation

The local development fixture replaces only the demo input expression with the same pilot input plus `fire: true`. It runs the actual simulation, renderer and effects, and visibly identifies itself as local QA. The production demo does not fire automatically; `npm run build` removes the fixture from `dist`.

At 1536×1024, Detailed, DPR 1.25 and four samples, the full run finished in **1:23.41**, with **345 shots, 148 hits and 45 targets cleared**, twelve jumps and one close call. The final live shot count was zero. District averages were 45.9 / 45.4 / 41.9 / 41.8 / 45.5 FPS; render times were 18.0 / 18.2 / 19.0 / 18.9 / 14.3 ms. Blender was idle throughout. Browser logs contained no errors or warnings. Evidence: `.dream-loop/held-fire-05.txt` and `.png`. This verifies continuous fire and completion; it does not meet the 60 FPS target.

## Round-six default-quality performance

After creating a fresh in-app browser tab, the default Detailed profile (1536×1024, DPR 1.25, AA 4) measured **60.0 FPS in all five districts**, with p95 frame intervals of 18.0–18.3 ms. The run finished in 1:24.92 with fourteen jumps and seven close calls. A separate DPR 1 / AA 2 run also reached 60.0 FPS in every district. Density and default quality were unchanged. These fresh-tab results differ from the older runs above; the cause of that difference has not been isolated.

A local instrumented fixture measured CPU render submission at 10.7–12.3 ms and asynchronous GPU timer samples at 15.8–20.2 ms across districts. GPU query time and requestAnimationFrame interval are different measurements and should not be equated. No Blender work ran during measurement. Evidence: `.dream-loop/benchmark-06-detailed-profile.txt`/`.png` and `benchmark-06-dpr1-aa2.txt`/`.png`.

## Round-seven final default-quality race

The real no-fire demo completed in **1:25.09**, with thirteen jumps and seven close calls. At 1536×1024, Detailed, DPR 1.25 and AA 4, district results were:

| District | FPS | p95 frame interval | CPU render time | Draws | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| New River | 58.7 | 18.0 ms | 13.1 ms | 1,416 | 3.80 M |
| Marina | 59.6 | 17.9 ms | 12.6 ms | 1,304 | 3.97 M |
| Mangrove | 59.9 | 17.7 ms | 11.8 ms | 1,172 | 4.38 M |
| Cove | 56.4 | 33.3 ms | 14.1 ms | 1,358 | 5.08 M |
| Bridge | 59.0 | 18.3 ms | 10.5 ms | 863 | 4.75 M |

Blender was idle; browser error/warning logs were empty. These are the latest measurements and qualify the earlier 60.0 FPS result: consistent 60 FPS is not yet established, especially in Party Cove. Evidence: `.dream-loop/benchmark-07-detailed.txt` and `.png`.

## Integrated round-seven surface work

- The yacht is a Blender model with a continuous hull, wrapped glazing, open flybridge, rails and upholstery. Its local collision envelope remains inside the former procedural yacht. Racing uses the original mooring transforms and destruction metadata; the entry/finish view composes three separate decorative berths.
- The hero has layered blonde hair, warm strand channels, directional garment folds and hems, tailored cushions, plank seams, and refined console/cage fittings. Approved face/eye geometry, UVs, embedded facial images, and articulated pivots remain preserved by the existing checks. Round seven adds broad sleeve/shorts folds, firmer rectangular seat panels and depressed occupied pads. The cannon has two stepped joints and participates in scene shadows; its muzzle position is unchanged.
- Four Blender villa variants replace the procedural houses. The visible Villa0 has 0.40 m shaded returns, glazing at 0.42 m, inset side frames and curtains; roofs have overlapping curved tiles. The restaurant now has 0.87 m openings, inner frames, occupied interiors and modeled tile ends. Bridge geometry and navigation clearance are unchanged. The round-five tower kit has 1.70 m glazing setbacks, 0.70 m balcony plates, slimmer apartment fins and open rails. New palms have bowed spines, asymmetric drooping leaflet panels, and varied crown shading, while the other vegetation geometry is unchanged.
- Visible sky and rough water reflections share the same direct panorama sampling. The source is the original generated v2 sky; sharper cloud groups no longer depend on the filtered environment cubemap.
- Water now blends two precomputed wind-wave bands and original generated micro-ripple detail. The offline Fourier implementation follows the spectrum, phase evolution, and choppy-displacement formulation in [Jerry Tessendorf’s *Simulating Ocean Water*](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf). Its normal cache contains two 128×128 bands and 64 frames per band, looping exactly every four seconds. The browser interpolates the cache and runs no CPU Fourier transform during play. Round five adds an accompanying 4 MiB displacement cache to drive the near-camera water mesh, with a flat apron preserving the horizon. The foam shader samples that same surface, including horizontal chop, so the generated patches follow wave height instead of floating on a fixed plane. The hull-contact ribbon is derived from the actual lower hull and follows that same displaced surface. Round six accepted the continuous foam contact and longer reflections; additional material detail remains under review.
- Round seven fixes a concrete reflection-camera defect: Water flips the horizontal camera basis but originally retained the same off-axis lens shift. The missing left strip was stretched by texture edge clamping into long parallel bands. Reflecting the lens shift restores the complete shoreline/yacht view. A depth-trace experiment was rejected for noise and cost; the final correction uses the existing reflection pass without an extra depth texture.
- Surface UV projection now restores exact shared vertices afterward. Rendered triangle corners, hard normals and UV seams remain intact. Alpha-tested foliage stays excluded from the unmasked SSAO normal override and is restored afterward; beauty, reflection and sun-shadow leaves remain.

The latest integrated checkpoint passes **128 tests**, including an independent direct-Fourier-sum check, the periodic real-height-field check, normal/displacement-cache integrity, water-mesh coverage and winding, hull-contact geometry, off-axis reflection coverage and state restoration, collision/muzzle alignment, asset geometry and input/destruction regressions. The build and `git diff --check` pass. These checks verify implementation contracts; they do not establish visual target equivalence.

## Responsive checks and remaining verification

The in-app browser entry screen was inspected at 390×844, 320×568, and 844×390 using Touch controls. Portrait camera framing now shows the waterfront and keeps the boat between the title and actions; the small-phone variant fits above the controls. Landscape uses a closer dedicated camera and larger hero. Round-seven desktop entry, complete no-fire race and independent review are recorded above. Final responsive rechecks and continuous-fire checks with these exact assets remain pending. No physical-phone performance measurement has been made.

Rebuild commands include `npm run blender:hero`, `blender:waterfront`, `blender:vegetation`, `blender:landmarks`, `blender:yacht`, `blender:villas`, and `npm run art:water`. Authoring proofs live under ignored `artifacts/`. Generated raster sources retain prompt sidecars under `florida/assets/textures/`; the wave cache retains its numerical settings and SHA-256 manifest. Earlier [destruction](florida-destruction-validation.md), [density correction](florida-density-rescue-validation.md), and [district](florida-districts-validation.md) reports describe earlier completed releases.
