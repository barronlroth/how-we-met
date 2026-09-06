# Florida assets

The hero airboat and couple use original Blender-authored geometry and PBR materials in `models/airboat-couple-v5.glb`, built by `../../scripts/build-florida-hero.py` and `../../scripts/florida_characters.py`, and loaded by `../hero-art.js`. The final GLB is 1,647,344 bytes, with 38 Blender mesh objects, 40 glTF primitives, 64,012 triangles, and 25 exported materials. Fixed geometry is merged by material within articulation nodes; the hull, fan, Barron, Nina, heads, and pointing arm retain their runtime pivots. Relative to v4, the export is 3.7% smaller, has 0.8% more triangles, and keeps the same primitive and material counts. These asset counts do not establish a browser frame-rate change.

The user-selected animated-feature concept guides the adult couple, dark curls, long wavy blonde hair, smiling faces, sage/teal clothing for Barron, and coral T-shirt/cream shorts for Nina. After rejecting the earlier model shapes, the user approved retaining the facial texture. The v5 model therefore uses the same generated facial atlas with corrected, nearly uniform UV placement, smaller heads, shorter lower faces, wider jaws and cheeks, integrated facial relief, and convex almond eye lenses. Shaped curls and broad tapered blonde waves replace the previous hair forms. Continuous shirts and shorts, tapered arms and legs, and modeled palms, thumbs and fingers replace disconnected or block-like body forms. Nina remains blonde.

The atlas's original PNG and exact prompt are preserved in `../../art/characters/`. Blender embeds one shared 1024×512 JPEG atlas in the GLB. This is generated game texture art; original likeness photographs are not shipped. Geometry creates the cheeks, nose, chin, glossy eye surfaces, hair volumes, clothing, limbs and boat. Facial expressions are fixed; this asset does not have a facial animation rig. No new raster art was generated for the v5 shape correction.

The deck retains modeled caulking, staggered plank joints, and fasteners. Build report, `.blend` source and authoring renders are in ignored `../../artifacts/florida-characters-v5/`. The front and three-quarter character renders isolate the actual modeled couple; complete-boat views show the seated result. These are separate from browser screenshots and performance evidence in [shape and shooting validation](../../docs/florida-shape-shooting-validation.md). Earlier v3 and v4 GLBs are retained as historical/rollback assets. The browser requests v5.

Other boats, people, hazards, architecture, vegetation, pickups, wake effects, and landmarks remain original procedural 3D models in `../art.js`, `../detail-art.js`, `../premium-art.js`, `../effects.js`, and `../world.js`. `../hero-art.js` also adds the code-authored nameplate and Flamingo Floatie to the hero. The deck water cannon, instanced cyan droplets and pale cores, impact rings, and spray are code-authored in `../effects.js`; the cannon is separate from the hero GLB and adds no light or shadow caster. The water builds on Three.js Water with original procedural normals and color adjustments; the sky uses an original gradient shader. Sound effects and the short marimba-style loop are synthesized in `../audio.js`.

Fonts are self-hosted Google Fonts downloads under the SIL Open Font License; the licenses are included here:

- Bungee by David Jonathan Ross: https://fonts.google.com/specimen/Bungee
- Nunito by Vernon Adams, Cyreal, and Jacques Le Bailly: https://fonts.google.com/specimen/Nunito

The generated planning image and its exact prompt are under `docs/concepts/`. That image is not used as a fake game screenshot or as the world background.

`teak-v2.png` is an original generated deck material, used on yachts and docks. Its exact generation prompt is in `teak-v2.prompt.md`. The new hero airboat uses the authored solid materials and modeled plank seams described above. Real waterfront reference photographs guided density and architecture but are not shipped.

`../materials.js` creates the stucco, terracotta, foliage and upholstery texture set deterministically in native canvas code. The water normal map is computed from a seeded periodic height field. These are original procedural materials rather than downloaded photo assets.
