# Florida Dream Loop — review checkpoint

The approved visual target is `.dream-loop/concept.png`. The latest independently evaluated frame, round eleven, scored **6.9/10 and passed Tier 2**. The 8/10 visual target remains unmet. After substantial changes to reflection handling, wave construction and normal resolution, the best score stayed at 6.9 for three consecutive rounds. The automatic loop is paused at its stall criterion for human art-direction review. The final default-quality race averaged **58.5–60.0 FPS** by district, and all **156 tests pass**. Branch: `codex/florida-dream-loop`; this checkpoint has not replaced production.

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
| 8 | 6.9 | Lighting/color | Foreground wave-face contrast, man's shirt and cushion-side shaping |
| 9 | 6.9 | Lighting/color | Foreground water's broad, rounded relief; clothing and cushions passed |
| 10 | 6.8 | Lighting/color | Foreground water too flat; middle ripple pattern still too regular |
| 11 | 6.9 | Lighting/color | Water's repeated loops and rounded trough boundaries; fine detail remains partial |

Each fresh reviewer compares the approved concept, current live screenshot, previous screenshot, and previous verdict. The latest accepted layout retains the hero boat, three individually staged yachts, bridge, restaurant, and distant channel. Round three passed the overall sky, exposure, palette, and shadow separation. Later work preserves those decisions. Evidence and full directives are under ignored `.dream-loop/candidate-01.png` through `candidate-11.png` and `verdict-01.md` through `verdict-11.md`.

Rounds three through eleven were captured in the in-app browser at the exact concept dimensions, 1536×1024. Earlier native Safari captures included browser chrome and a roughly 4% aspect difference, which the reviewers excluded. The in-app browser allows WebGL checks while the Mac desktop is locked.

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

Blender was idle; browser error/warning logs were empty. These measurements qualify the earlier 60.0 FPS result: consistent 60 FPS was not established, especially in Party Cove. Evidence: `.dream-loop/benchmark-07-detailed.txt` and `.png`.

## Integrated round-seven surface work

- The yacht is a Blender model with a continuous hull, wrapped glazing, open flybridge, rails and upholstery. Its local collision envelope remains inside the former procedural yacht. Racing uses the original mooring transforms and destruction metadata; the entry/finish view composes three separate decorative berths.
- The hero has layered blonde hair, warm strand channels, directional garment folds and hems, tailored cushions, plank seams, and refined console/cage fittings. Approved face/eye geometry, UVs, embedded facial images, and articulated pivots remain preserved by the existing checks. Round seven adds broad sleeve/shorts folds, firmer rectangular seat panels and depressed occupied pads. The cannon has two stepped joints and participates in scene shadows; its muzzle position is unchanged.
- Four Blender villa variants replace the procedural houses. The visible Villa0 has 0.40 m shaded returns, glazing at 0.42 m, inset side frames and curtains; roofs have overlapping curved tiles. The restaurant now has 0.87 m openings, inner frames, occupied interiors and modeled tile ends. Bridge geometry and navigation clearance are unchanged. The round-five tower kit has 1.70 m glazing setbacks, 0.70 m balcony plates, slimmer apartment fins and open rails. New palms have bowed spines, asymmetric drooping leaflet panels, and varied crown shading, while the other vegetation geometry is unchanged.
- Visible sky and rough water reflections share the same direct panorama sampling. The source is the original generated v2 sky; sharper cloud groups no longer depend on the filtered environment cubemap.
- Water now blends two precomputed wind-wave bands and original generated micro-ripple detail. The offline Fourier implementation follows the spectrum, phase evolution, and choppy-displacement formulation in [Jerry Tessendorf’s *Simulating Ocean Water*](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf). Its normal cache contains two 128×128 bands and 64 frames per band, looping exactly every four seconds. The browser interpolates the cache and runs no CPU Fourier transform during play. Round five adds an accompanying 4 MiB displacement cache to drive the near-camera water mesh, with a flat apron preserving the horizon. The foam shader samples that same surface, including horizontal chop, so the generated patches follow wave height instead of floating on a fixed plane. The hull-contact ribbon is derived from the actual lower hull and follows that same displaced surface. Round six accepted the continuous foam contact and longer reflections; additional material detail remains under review.
- Round seven fixes a concrete reflection-camera defect: Water flips the horizontal camera basis but originally retained the same off-axis lens shift. The missing left strip was stretched by texture edge clamping into long parallel bands. Reflecting the lens shift restores the complete shoreline/yacht view. A depth-trace experiment was rejected for noise and cost; the final correction uses the existing reflection pass without an extra depth texture.
- Surface UV projection now restores exact shared vertices afterward. Rendered triangle corners, hard normals and UV seams remain intact. Alpha-tested foliage stays excluded from the unmasked SSAO normal override and is restored afterward; beauty, reflection and sun-shadow leaves remain.

The round-seven checkpoint passed **132 tests**, including an independent direct-Fourier-sum check, the periodic real-height-field check, normal/displacement-cache integrity, water-mesh coverage and winding, hull-contact geometry, off-axis reflection coverage and state restoration, collision/muzzle alignment, asset geometry and input/destruction regressions. These checks verify implementation contracts; they do not establish visual target equivalence.

## Round-eight verification

The integrated round-eight capture and self-review are `.dream-loop/candidate-08.png` and `self-review-08.md`. The independent review scored 6.9/10. Architecture and palm construction passed the material gate; foreground wave faces, the man's shirt and cushion-side response remained blocking.

This pass addresses causes found in the actual camera/loader: subpixel tower rails, villa glass receiving the wrong environment intensity, smoothed cushion-side normals, isolated hair-root lobes, shallow positive-only cloth bumps, and downward palm winding that caused self-shadowing. Browser A/B proofs confirm the hero changes; actual projected tower measurements and palm-view checks are retained under ignored authoring artifacts.

Water's dominant foreground relief now uses a new generated source with broader asymmetric ridges. A low-pass removes source grain before constructing normals; the same heights displace the water and attached foam. Near/middle mesh regions keep this displacement out of the stretched horizon apron without adding triangles. The accepted reflection-camera correction remains intact. The source texture and its exact built-in-generation prompt are versioned together in `florida/assets/textures/intracoastal-height-v2.png` and `.prompt.md`.

The final round-eight no-fire race finished in **1:24.15**, with thirteen jumps and seven close calls. At default Detailed, 1536×1024, DPR 1.25 and AA 4, district FPS was **59.5 / 59.9 / 59.9 / 55.8 / 58.6**; p95 frame intervals were **18.4 / 18.3 / 18.1 / 33.3 / 18.6 ms**. Blender was idle. Evidence: `.dream-loop/benchmark-08-detailed.txt` and `.png`.

The round-eight local continuous-fire fixture finished in **1:23.41**, with **345 shots, 138 hits and 34 targets cleared**, twelve jumps and one close call. No projectiles remained live at completion; browser logs contained no errors or warnings. Asset authoring could overlap this functional check, so its timings are retained in `.dream-loop/held-fire-08.txt`/`.png` as context, not a controlled performance comparison. Production builds remove the fixture.

## Round-nine verification

The independent review retained 6.9/10. The man's broad shirt folds and firmer cushion sides passed the material gate, leaving water as the sole material blocker. Actual-loader A/B proofs and exported-asset checks preserve the approved character geometry, images and collision envelope. All 136 tests passed.

The frozen default-quality no-fire race finished in **1:25.10**, with fourteen jumps and seven close calls. At 1536×1024, Detailed, DPR 1.25 and AA 4, district FPS was **57.5 / 59.6 / 60.0 / 57.9 / 57.8**, with p95 intervals **18.7 / 18.4 / 18.5 / 18.7 / 18.7 ms**. CPU render time was **14.8 / 13.2 / 13.1 / 13.8 / 11.9 ms**. Evidence: `.dream-loop/benchmark-09-default.txt`/`.png`.

A local comparison enabling front-to-back sorting of opaque BatchedMesh instances slowed the same route to **56.6 / 57.9 / 54.7 / 51.5 / 55.2 FPS**. That change was rejected; production sorting remains limited to transparent materials. The normal build removes the comparison fixture. Evidence: `.dream-loop/benchmark-09-sorted.txt`/`.png`.

Entry layout was inspected at 390×844, 320×568 and 844×390 without document overflow. A real race at 390×844 also verified the visible Touch steering, Drift, SOAK and Cafecito controls. These are desktop browser layout checks, not phone-hardware performance measurements.

## Round-ten structural water and finishing pass

The new frame is `.dream-loop/candidate-10.png`; its surface-by-surface self-review is `self-review-10.md`. Independent evaluation scored **6.8/10**. The reviewer accepted the removal of oversized domes but found the foreground too flat and the middle ripple pattern too regular. Water remains the sole material-gate blocker. The source, build and all 144 tests pass, including seven numerical relief-field tests and reflection-mask state restoration after successful rendering, exceptions and AO bypass.

Water now uses wind waves as its main shape, with a smaller crossing band and subordinate original-image relief. `relief-field.js` removes DC, filters the source to coherent wavelets, applies bounded horizontal crest compression and derives normals from the full deformation Jacobian. The image source stays unchanged. Preparation runs once during loading; there is no CPU Fourier transform during gameplay. Geometry and foam use the same displacement, mip-filtered to the fine or middle mesh footprint. Vertex count and the flat horizon apron are unchanged.

The existing planar target records opaque shoreline coverage in alpha and transparent black for sky. Its premultiplied edge coverage blends with sky sampled along the wave normal's reflected ray. Ordinary spherical panorama sampling avoids the visible dome's angular cloud-framing transform. Background, clear color/alpha, sky opacity and camera/render state restore in `finally`; the previous off-axis reflection correction remains intact. This adds no reflection pass or depth texture. Physical water Fresnel and restrained image relief reduce the large teal puffs and regular pale loops found during the controlled comparisons; the judge still requires more varied spacing and foreground contrast.

The hero's small finishing pass rounds triangular shirt-fold endings, adds restrained collar/pocket/cuff seams and cushion piping, and resolves small cage attachment collars. The existing broad folds, cushion panels, faces, hair, images and proportions remain verified. Near villa and restaurant tile noses turn toward the existing sunlight, with small dark gaps and lit sill edges. Bridge, sign, navigation bounds, materials and embedded images remain preserved. Actual browser A/B and combined-frame inspection found no regressions in these localized changes.

The frozen no-fire race finished in **1:25.09**, with thirteen jumps and seven close calls. At 1536×1024, Detailed, DPR 1.25 and AA 4, district FPS was **58.5 / 59.8 / 59.7 / 55.4 / 58.6**; p95 frame intervals were **18.3 / 18.3 / 18.4 / 33.3 / 18.5 ms**, and CPU render time was **14.1 / 12.9 / 13.1 / 14.9 / 11.5 ms**. Blender was idle and browser error/warning logs were empty. Party Cove still falls short of consistent 60 FPS. Evidence: `.dream-loop/benchmark-10-default.txt`/`.png`.

## Round-eleven reconstruction and verification

The final frame and self-review are `.dream-loop/candidate-11.png` and `self-review-11.md`. The reviewer accepted the recovered dark-to-light foreground relief and reduced isolated curls, but still found repeated middle-distance loops and broad rounded troughs. Fine garment, fitting, eave and reveal details remain partial in the independent verdict, despite the improved measured visibility and actual-loader A/B evidence. The checkpoint is preserved for review; it is not presented as an 8/10 result.

The primary wind field now contains smooth periodic crossing-wave packets, with approximately 40% calm coverage and typical quiet patches about 0.6–1.5 m across. The complete modulated position field supplies its normals, including envelope derivatives. A subsequent check found that the 128-grid finite differences understated the same field's continuous slopes: 0.270 versus 0.396 RMS. The primary normal cache therefore reconstructs the existing physical Fourier modes at 512×512 and differentiates them analytically. No new height modes are added. The high-resolution check bounds horizontal compression across every frame, with minimum stretch 0.300005 and minimum Jacobian 0.262248; the displacement cache uses the matching correction. Cache sample origins align across resolutions.

The primary normal file is **41,991,547 bytes** (40.05 MiB), expanding to 64 MiB of exact RGBA8 data. Sub prediction reduces its transfer size 29.5% compared with plain deflate. Tests verify the compressed, predicted and decoded checksums. The browser uses native [zlib stream decompression](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream/DecompressionStream), then restores row prediction once during loading. Browsers without that API retain the original 128 primary cache. F2 reports the actual resolution; the reviewed and measured browser uses 512. This is still a substantial first-load asset, and physical-phone performance remains unmeasured.

Garment seams now lie above the final cloth surface instead of being occluded by it. Actual-loader A/B confirms the pocket/cuff lines, cushion welt and solid attachment faces; accepted faces, broad folds, panels and image payloads remain intact. Eave noses and inner frames have greater pixel coverage with all preserved bounds and glass planes verified. A real race also exposed untextured island ground: an original coastal atlas and sloped shoreline now sit inside the exact existing island outlines. Independent tests verify the original outline, all upward faces and attribute validity, and a labeled fixed-view fixture verifies the result in the real renderer. Race rules and plantings are unchanged.

The frozen no-fire race finished in **1:25.08**, with fourteen jumps and seven close calls. At Detailed, 1536×1024, DPR 1.25, AA 4 and 512 primary normals:

| District | FPS | p95 frame interval | CPU render time | Draws | Triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| New River | 59.0 | 18.6 ms | 12.8 ms | 1,421 | 3.78 M |
| Marina | 60.0 | 18.2 ms | 11.6 ms | 1,308 | 3.91 M |
| Mangrove | 60.0 | 18.3 ms | 12.0 ms | 1,171 | 4.43 M |
| Cove | 59.0 | 18.6 ms | 12.2 ms | 1,361 | 5.01 M |
| Bridge | 58.5 | 18.6 ms | 10.2 ms | 860 | 4.58 M |

Blender and asset-generation work were idle. The browser reported no errors or warnings. These are near-60 FPS district averages, not a claim that every frame takes 16.7 ms. Evidence: `.dream-loop/benchmark-11-default.txt`/`.png`. All 156 tests, the build and `git diff --check` pass.

The final continuous-fire fixture completed in **1:23.40**, with **345 shots, 139 hits and 35 targets cleared**, twelve jumps and one close call. No projectiles remained live at completion; browser logs were empty. With the same quality and viewport, district FPS was **58.5 / 60.0 / 60.0 / 55.6 / 58.3**; Party Cove's p95 frame interval was 33.3 ms. This verifies firing, destruction and full-course completion, but sustained heavy effects still fall short of consistent 60 FPS in Cove. Blender and authoring work were idle. Evidence: `.dream-loop/held-fire-11.txt`/`.png`. A normal build removes this local-only fixture.

## Responsive checks and remaining verification

The final round-eleven entry screen was inspected at 390×844, 320×568, and 844×390 using Touch controls. Document dimensions matched each viewport without overflow. Portrait camera framing shows the waterfront and keeps the boat between the title and actions; the small-phone variant fits above the controls. Landscape uses a closer dedicated camera and larger hero. A real race at 390×844 also confirmed visible steering, Drift, SOAK and Cafecito controls, with no browser errors or warnings. Evidence: `.dream-loop/responsive-11-390x844.png`, `responsive-11-320x568.png`, `responsive-11-844x390.png` and `responsive-11-active-touch.png`. These are desktop browser layout checks; no physical-phone performance measurement has been made. Final desktop no-fire and continuous-fire checks are recorded above.

Rebuild commands include `npm run blender:hero`, `blender:waterfront`, `blender:vegetation`, `blender:landmarks`, `blender:yacht`, `blender:villas`, and `npm run art:water`. Authoring proofs live under ignored `artifacts/`. Generated raster sources retain prompt sidecars under `florida/assets/textures/`; the wave cache retains its numerical settings and SHA-256 manifest. Earlier [destruction](florida-destruction-validation.md), [density correction](florida-density-rescue-validation.md), and [district](florida-districts-validation.md) reports describe earlier completed releases.
