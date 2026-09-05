# Florida assets

The hero airboat and couple are original Blender-authored geometry and PBR materials in `models/airboat-couple-v3.glb`, built by `../../scripts/build-florida-hero.py` and loaded by `../hero-art.js`. The GLB is 1,693,696 bytes, with 40 mesh objects, 61,734 triangles, and 23 exported materials; the authoring source defines 24 materials. Fixed geometry is merged by material within articulation nodes; the hull, fan, Barron, Nina, and pointing arm remain available to the runtime. Headless Blender is the authoring tool; Three.js renders the playable scene.

User-supplied likeness photos informed the rounded faces, short dark curls, and long highlighted brown hair. The model is a stylized interpretation. The GLB contains no textures or embedded portrait images, and the reference photos are not shipped. Its deck has authored solid teak-colored materials, modeled caulking, staggered plank joints, and fasteners. The build report and separate authoring renders are in `../../artifacts/florida-hero/`; those renders are authoring evidence, not browser screenshots or performance evidence.

Other boats, people, hazards, architecture, vegetation, pickups, wake effects, and landmarks remain original procedural 3D models in `../art.js`, `../detail-art.js`, `../premium-art.js`, `../effects.js`, and `../world.js`. `../hero-art.js` also adds the code-authored nameplate and Flamingo Floatie to the hero. The water builds on Three.js Water with original procedural normals and color adjustments; the sky uses an original gradient shader. Sound effects and the short marimba-style loop are synthesized in `../audio.js`.

Fonts are self-hosted Google Fonts downloads under the SIL Open Font License; the licenses are included here:

- Bungee by David Jonathan Ross: https://fonts.google.com/specimen/Bungee
- Nunito by Vernon Adams, Cyreal, and Jacques Le Bailly: https://fonts.google.com/specimen/Nunito

The generated planning image and its exact prompt are under `docs/concepts/`. That image is not used as a fake game screenshot or as the world background.

`teak-v2.png` is an original generated deck material, used on yachts and docks. Its exact generation prompt is in `teak-v2.prompt.md`. The new hero airboat uses the authored solid materials and modeled plank seams described above. Real waterfront reference photographs guided density and architecture but are not shipped.

`../materials.js` creates the stucco, terracotta, foliage and upholstery texture set deterministically in native canvas code. The water normal map is computed from a seeded periodic height field. These are original procedural materials rather than downloaded photo assets.
