# Florida character shapes and water blaster — September 5, 2026

## Requested correction

The user disliked the horn attack and asked for visible shooting. They also rejected the character shapes while approving the facial texture. This pass changes the weapon and the actual character mesh, preserving the approved animated-feature direction, source facial atlas, selected outfits, and Nina’s blonde hair. Earlier art and mobile validation documents remain historical records of those builds.

## Delivered behavior

Hold Space or the touch SOAK button to fire the deck-mounted water blaster. Steer the boat to aim; each cyan water shot keeps its launch heading rather than following a bend or seeking a target. Shots repeat every 0.24 seconds, live for at most 1.3 seconds, and include some of the boat’s forward speed. A direct hit briefly displaces a tube rider or makes a gator duck, with spray and an expanding ring. The affected hazard returns after four seconds. This replaces the horn’s area effect.

Swept collision selects the first struck eligible object, even between simulation ticks. Water taxis and moored boats stop shots without being removed; pickups are neither collected nor destroyed by water. Shots splash at canal banks/islands or at the end of their lifetime. Pause freezes the simulation, releasing fire stops new emissions, and race restart/finish clears projectile state. Existing touch pointer ownership, keyboard merging, native settings keys and pause behavior remain in place.

The cannon has three small meshes and no new light or shadow caster. Cyan droplets and white cores use two bounded instanced meshes; impacts reuse eight rings and the existing spray pool. The fire/refill state appears inside SOAK on touch and in the keyboard SOAK chip. Sound remains opt-in.

## Character construction

The v5 model preserves `art/characters/couple-face-atlas-v4.png` and its skin-color sampling record. The earlier face mapping stretched the nose-to-mouth span roughly 2.5 times more than the eye region. The new mapping uses a near-uniform scale and aligns the sculpted nose, mouth, cheeks, sockets and shallow convex almond eye surfaces with the atlas landmarks.

Heads are smaller and seated lower into their necks, with shorter lower faces and broader cheek/jaw planes. Directional curls with varied, smaller forelocks replace Barron’s earlier hair volumes. Nina’s mantle wraps the crown more closely, and her blonde waves have deeper rounded cross-sections, tapered ends, integrated relief, and overlapping S-shaped locks instead of raised stripe rods. Shirts join shoulder/sleeve volumes and shorts join hips/seated thighs into continuous surfaces. Tapered limbs end in palms, thumbs, fingers, and shaped feet. The Fan, Barron, Nina, head and pointing-arm articulation boundaries remain intact. Expressions remain painted and fixed; no facial animation rig was added.

`npm run blender:hero` builds the checked-in v5 GLB from `scripts/build-florida-hero.py` and `scripts/florida_characters.py`. Ignored `artifacts/florida-characters-v5/` contains the final report, editable `.blend`, `characters-front.png`, `characters-three-quarter.png`, `couple-close.png`, `hero-front.png`, and `hero-rear.png`. These are renders of the actual modeled geometry; they use authoring lights and are not browser screenshots.

## Asset budget and automated checks

| Hero asset | v4 | v5 | Change |
| --- | ---: | ---: | ---: |
| GLB bytes | 1,710,764 | 1,647,344 | −3.7% |
| Triangles | 63,476 | 64,012 | +0.8% |
| Blender mesh objects | 38 | 38 | unchanged |
| glTF primitives | 40 | 40 | unchanged |
| Exported materials | 25 | 25 | unchanged |
| Embedded image | 1 JPEG, 1024×512 | 1 JPEG, 1024×512 | unchanged |

The existing hero limits remain 42 runtime meshes, fewer than 65,000 triangles, at most 25 materials and fewer than 1.8 MB, with one embedded JPEG under 150 KB and no external textures. The GLTFLoader test also validates articulation nodes, negative-Z forward orientation, and the collision/camera envelope. The code-authored cannon and water effects are outside these GLB counts.

`npm run build` succeeds for Toronto and Florida. Normal web builds consume the checked-in GLB and do not invoke Blender.

`npm test`: 37 passing tests. Shooting cases cover travel before impact, aimed versus untouched hazards, launch trajectory after steering, held cadence and bounded lifetime, release, swept first-hit ordering, boat blocking, pickup exclusion, hazard recovery, bank impacts, pause/restart/finish, and cannon/launch transform agreement. Touch tests exercise real event handlers, multiple pointer ownership, cancellation/lost capture, keyboard merging, and fire cooldown. Existing race, rendering-profile, batching and hero tests remain in the suite.

## Browser verification and limits

Native Safari on this Mac exercised the water-shot build at 1324×850, Detailed graphics, DPR 1.25. A visible shot was captured during a race, and the candidate completed the demo in 1:25.53. Evidence lives in ignored `.impeccable/shapes-shooting/`: `desktop.png`, `water-shot.png`, `baseline.png`, `baseline.txt`, and `candidate.txt`. The demo does not write a best time.

The matched v4 baseline averaged 33.5 FPS in Las Olas Isles and 32.8 FPS in Bahia Mar, with p95 frame intervals of 34.0ms in each. The candidate averaged 33.6 and 32.7 FPS in those same complete sectors, also at 34.0ms p95. These differences are about ±0.3%, with no clear regression in that comparison. The candidate’s full-route sector averages were 33.6, 32.7, 32.2 and 33.0 FPS. The baseline capture ended before a complete full-route comparison, so only the first two complete sectors are directly compared.

That Safari candidate used an intermediate v5 export of 1,671,616 bytes and 64,802 triangles. The final checked-in asset is the 1,647,344-byte / 64,012-triangle export in the table above. It adds the final hair corrections and garment decimation; the gameplay JavaScript is unchanged from the Safari check. All five authoring renders were regenerated for the final mesh, the GLTFLoader/budget tests passed, and the production build passed. The Mac locked before a final browser reload, preventing a fresh final-mesh screenshot, final-mesh FPS measurement, and manual SOAK touch-button check. Earlier candidate screenshots are therefore not presented as captures of the exact final asset.

The fresh finish review accepted the three scored hair corrections—Nina’s crown coverage and volumetric locks, and Barron’s forelock shapes—with no material regressions found in that scoped review. This records resolution of those defects, not equality with the generated concept or a user approval of the final likeness.

No physical mobile hardware was connected. Multiple touch pointers are covered by event-handler tests, not a physical multi-finger play session. Desktop Safari measurements, authoring renders, and the smaller final asset do not establish phone performance, universal 60 FPS, or the user’s approximate 5% performance-loss target for the exact final build.
