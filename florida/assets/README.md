# Florida assets

The boat, people, hazards, architecture, vegetation, pickups, wake effects, and landmarks are original procedural 3D models in `../art.js`, `../detail-art.js`, `../premium-art.js`, `../effects.js`, and `../world.js`. The water builds on Three.js Water with original procedural normals and color adjustments; the sky uses an original gradient shader. Sound effects and the short marimba-style loop are synthesized in `../audio.js`.

Fonts are self-hosted Google Fonts downloads under the SIL Open Font License; the licenses are included here:

- Bungee by David Jonathan Ross: https://fonts.google.com/specimen/Bungee
- Nunito by Vernon Adams, Cyreal, and Jacques Le Bailly: https://fonts.google.com/specimen/Nunito

The generated planning image and its exact prompt are under `docs/concepts/`. That image is not used as a fake game screenshot or as the world background.

`teak-v2.png` is an original generated deck material, used on the airboat, yachts and docks. Its exact generation prompt is in `teak-v2.prompt.md`. Real waterfront reference photographs guided density and architecture but are not shipped.

`../materials.js` creates the stucco, terracotta, foliage and upholstery texture set deterministically in native canvas code. The water normal map is computed from a seeded periodic height field. These are original procedural materials rather than downloaded photo assets.
