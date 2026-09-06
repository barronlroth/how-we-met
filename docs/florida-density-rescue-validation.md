# Florida waterfront density correction — September 5, 2026

The first five-district release (`4cb0724`) made the surroundings too sparse. This correction restores occupied banks and a continuous horizon while keeping all five districts, both island routes, departing yacht, cove crossing, Nina banter, controls, and approved hero art.

## What changed

Physical moorings increase from 67 in the sparse district build to 167. The older four-sector course (`be204ed`) had 285, but repeated the same bank composition throughout. The corrected layout places more frequent berths in New River, Party Cove, and the bridge approach, retains the superyacht marina, and keeps the mangrove bank free of moorings. Visible hull transforms remain shared with collision and water-shot blocking.

Narrower water brings the scenery closer to the racing boat. Party Cove now uses half-widths of roughly 50–58m instead of reaching 85m; the bridge approach narrows toward 39m instead of 54m. Extra room remains around the departing yacht basin and island branches. Close palms and hedges, second rows of homes, and three overlapping forest bands replace the exposed ground behind the waterfront. Restaurants are placed against their actual modeled front edges. The horizon uses varied tower heights and deeper forest, and broad sculpted cumulus clouds have shaded undersides and a soft sky sun glow.

## Blender asset and rendering

The new `waterfront-v1.glb` is built by `scripts/build-florida-waterfront.py` and loaded through `waterfront-art.js`. It contains original geometry, twelve shared opaque PBR materials, and no textures, skinning, or animations.

| Root | Geometry | Triangles |
| --- | --- | ---: |
| WaterfrontResidence | Staggered residence, pool, pergola, terraces, furniture, and planting | 5,756 |
| MarinaHotel | Rounded hotel, balcony ribbons, podium amenities, and roof detail | 16,736 |
| SkylineTower | Stepped tower with recessed glazing and repeated facade detail | 8,360 |
| WaterfrontClub | Dining deck, bar, pergolas, rooftop terrace, people, and planting | 8,548 |
| SkylineFar | Simplified distant tower | 288 |
| CanopyCluster | Low-cost overlapping canopy volume | 548 |
| **Total** | **1,880,460 bytes; twelve shared materials** | **40,236** |

`npm run blender:waterfront` regenerates the export and authoring evidence. The editable `.blend`, JSON inventory, four building renders, and contact sheet are in ignored `artifacts/florida-waterfront-v1/`. These authoring images are separate from game screenshots. The accepted `airboat-couple-v5.glb` is unchanged.

Repeated copies share geometry/materials and use the existing batching path. Foreground regions cull at 670m of course progress and limit contact shading to 95m. A separate inexpensive horizon stays visible to 1700m and skips contact shading and shadow casting/receiving. The fallback chunk renderer follows the same rules when multi-draw is unavailable. This extends visible depth without keeping the full foreground detail active across the entire route. No new light or rendering pass was added; normal web builds and browser play consume GLBs without running Blender.

## Verification and measured cost

All 64 tests pass and the production build succeeds. The new GLB tests cover the six roots, metre-scale dimensions, Y-up placement, finite vertices/normals, shared clone resources, opaque materials, absent texture images, and budgets. Course checks cover the reduced widths, restored mooring density, both branch clearances, departing-yacht avoidance and collision, and complete gold runs with and without held fire at 30, 60, and 120Hz. Batching tests cover the separate distant visibility and shading policy.

The exact final build completed a full native Safari demo at 1324×850, Detailed graphics, fixed DPR 1.25: **1:25.11**, thirteen jumps, seven close calls, and five bumps. The profiler records only while visible and excludes the first five racing seconds.

| District | Average FPS | p95 frame interval | Average rendered triangles |
| --- | ---: | ---: | ---: |
| New River | 39.9 | 30ms | 2.17M |
| Superyacht Marina | 41.5 | 29ms | 2.07M |
| Mangrove Cut | 39.8 | 29ms | 2.19M |
| Party Cove | 36.8 | 30ms | 2.86M |
| The Bridge Run | 41.2 | 28ms | 2.37M |

This is slower than the sparse five-district build’s 42.3–44.6 FPS, reflecting the restored density, but faster than the older four-sector build’s 31.2–32.3 FPS in the same Safari viewport/settings. The older course uses different sector boundaries, so its individual sectors are not exact matching slices. No result here establishes a universal frame rate, a 5% performance-cost target, or physical-phone performance. This full browser demo did not fire water shots; held-fire behavior is covered by the simulation tests.

Final browser evidence is in ignored `.impeccable/density-rescue/`: `final-entry.png`, `final-1.png` (marina around 22 seconds), `final-2.png` (marina around 38 seconds), `final-3.png` (cove around 55 seconds), `final-4.png` (finish), and `final-performance.txt`. The independent final visual review passed with no blocking defect in this scoped density correction. No new mobile viewport or physical-phone session was performed. The [initial district validation](florida-districts-validation.md) remains a historical record of the preceding sparse build.
