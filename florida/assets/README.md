# Florida assets

The hero airboat and couple use original Blender-authored geometry and PBR materials in `models/airboat-couple-v4.glb`, built by `../../scripts/build-florida-hero.py` and `../../scripts/florida_characters.py`, and loaded by `../hero-art.js`. The GLB is 1,710,764 bytes, with 38 Blender mesh objects, 40 glTF primitives, 63,476 triangles, and 25 exported materials. Fixed geometry is merged by material within articulation nodes; the hull, fan, Barron, Nina, heads, and pointing arm retain their runtime pivots.

The user-selected animated-feature concept guides separate adult head profiles, dark curls, long wavy blonde hair, smiling faces, sage/teal clothing for Barron, and coral T-shirt/cream shorts for Nina. A purpose-painted generated facial atlas supplies brows, eyes, cheeks, smile and stubble on the sculpted heads. Its original PNG and exact prompt are preserved in `../../art/characters/`. Blender embeds a compact shared 1024×512 JPEG atlas in the GLB. This is new game texture art, not a supplied photograph or a pasted scene image. Original likeness photographs are not shipped. Geometry creates the cheeks, nose, chin, glossy eye surfaces, hair volumes, clothing, limbs and boat. Facial expressions are currently fixed; this asset does not have a facial animation rig.

The deck retains modeled caulking, staggered plank joints, and fasteners. Build report and `.blend` source are in ignored `../../artifacts/florida-characters-v4/`; close authoring renders are separate from browser screenshots and performance evidence. The previous v3 GLB is retained for rollback.

Other boats, people, hazards, architecture, vegetation, pickups, wake effects, and landmarks remain original procedural 3D models in `../art.js`, `../detail-art.js`, `../premium-art.js`, `../effects.js`, and `../world.js`. `../hero-art.js` also adds the code-authored nameplate and Flamingo Floatie to the hero. The water builds on Three.js Water with original procedural normals and color adjustments; the sky uses an original gradient shader. Sound effects and the short marimba-style loop are synthesized in `../audio.js`.

Fonts are self-hosted Google Fonts downloads under the SIL Open Font License; the licenses are included here:

- Bungee by David Jonathan Ross: https://fonts.google.com/specimen/Bungee
- Nunito by Vernon Adams, Cyreal, and Jacques Le Bailly: https://fonts.google.com/specimen/Nunito

The generated planning image and its exact prompt are under `docs/concepts/`. That image is not used as a fake game screenshot or as the world background.

`teak-v2.png` is an original generated deck material, used on yachts and docks. Its exact generation prompt is in `teak-v2.prompt.md`. The new hero airboat uses the authored solid materials and modeled plank seams described above. Real waterfront reference photographs guided density and architecture but are not shipped.

`../materials.js` creates the stucco, terracotta, foliage and upholstery texture set deterministically in native canvas code. The water normal map is computed from a seeded periodic height field. These are original procedural materials rather than downloaded photo assets.
