# Florida waterfront rebuild

Mode: Experience. The original generated image (`florida-intracoastal-run-v1.png`) is the explicit visual target. The user rejected V1 as linear, sparse, slow feeling and insufficiently detailed. This rebuild must earn a visibly larger fidelity step, retaining the miniature arcade character, warm sunlight, turquoise water, close couple framing, foamy wakes, yachts, palms and recognizable bridge/Fisheries arrival. Code-generated geometry is the playable medium; the concept is a fidelity reference, not a raster backdrop.

The route is an art-directed, compressed Fort Lauderdale, not a geographic survey. Real references: Visit Lauderdale's boating guide (https://www.visitlauderdale.com/things-to-do/sports-recreation/boating/), Bahia Mar marina aerial (https://marinas.com/view/marina/16c5jlm_Marina_Village_at_Bahia_Mar__Fort_Lauderdale_FL_United_States), Isle of Venice gallery (https://www.isleofveniceresidences.com/gallery), and Fisheries (https://www.15streetfisheries.com/). Their lessons are dense moorings, seawalls, layered canopy, condo balconies, branching canals and active boating traffic. Reference photos are not shipped assets.

Signature interaction: carve a heading through sweeping bends; brake and steer to bank a drift reward, then release and use cafecito to accelerate into the next straight. Two island splits create actual navigable choices. Three rival boats provide a race, slipstream adds boost, and close calls create combos. Yellow water taxis cross the route. Moored yachts, banks and islands are physical obstacles. Desktop keyboard first, phone explicitly deferred. Demo runs exercise actual driving physics and cannot save records.

First viewport: the couple's detailed cream/coral/teal airboat above reflective water, rich planted waterfront, and a recognizable destination. Sparse arcade type and controls leave the 3D world primary. Racing HUD has rank, timer, curved coffee meter and the actual course map. Finish keeps the destination visible. Reduced motion suppresses decorative vibration and speed streaks; pause/focus behavior remains usable. Toronto is unchanged.

The scene-art rebuild replaces the first V2 boat and houses with `premium-art.js` and a coherent material set in `materials.js`: shaped hull, visible teak, individually upholstered seats, reduced fan cage, recessed balconies, several villa and yacht profiles. Foliage, stucco, roof and cloth detail is generated deterministically in native canvas code. Water normals use a seeded, periodic multiscale height field. Screen-space contact shading is restricted to nearby geometry for performance.

## Direction contract

THESIS: An animated Florida postcard, anchored by recognizable, expressive versions of Barron and Nina aboard a crafted airboat.

OWN-WORLD: Cream hull, coral tubing, teal mechanics, golden teak, warm skin, dark curls and golden blonde hair; the approved concept remains the art target.

STORY: Race through an inhabited waterfront toward dinner at Fisheries.

FIRST VIEWPORT: Preserve the playable scene and sparse title/actions; sharpen the foreground couple, boat materials and water, with the bridge and restaurant readable behind.

FORM: Refine the established 3D world, code-led; user-selected rounded animated-film characters, supplied likeness photos, and a 5% performance-loss target. No new concept tournament.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Approved character direction — September 5, 2026

The user rejected the first Blender characters, reviewed five generated styles and selected `florida-couple-approved-v4.png`: the final animated-feature interpretation of their supplied portraits. This is the explicit character reference; the broader waterfront remains the established world.

THESIS: An expressive adult animated-film couple, recognizably specific to Barron and Nina, aboard the existing detailed airboat.

OWN-WORLD: Sculpted dark spiral curls, broad highlighted waves with a center part, large green/hazel eyes with modeled lids, warm dimensional cheeks and jaws, asymmetrical smiles and Nina's visible teeth. Barron wears a sage linen shirt, teal shorts, chain and stud; Nina wears the selected coral crew-neck T-shirt, cream linen shorts and hoops.

FIRST VIEWPORT: Turn the staged airboat toward the existing entry/finish camera so faces are visible, retaining the bridge and Fisheries backdrop. Preserve the driving camera, physics, course and controls during racing.

FORM: Author genuine 3D geometry and glTF materials in Blender; the reference is not a billboard or replacement background; a separately generated diffuse facial atlas is UV-mapped onto full sculpted heads. Preserve the fan and pointing-arm articulation. Keep the model near its existing geometry/material budget and measure a matched full-route comparison against the previous character asset at 1440×900, DPR 1.25; target no more than roughly 5% average FPS loss and disclose section variation.

FIDELITY: The concept controls proportions, facial appeal, hair form and clothing. Review close authoring renders plus real browser entry/race/finish images; a studio render alone cannot establish the game's likeness or fidelity.

Character reconstruction: separate head profiles, continuous sculpted cheeks/nose/chin, purpose-painted facial albedo with green/hazel eyes and individual teeth, glossy eye surfaces, overlapping curl masses, a broad continuous wavy hair mantle, and seated tailored clothing. The generated facial texture is newly painted game art, not either supplied photograph or a crop of the reference concept. Source and exact prompt are in `art/characters/`; one 1024×512 JPEG atlas is embedded in the GLB.

User correction during this pass: Nina is blonde. This supersedes the brown hair in the selected concept. Use warm golden blonde masses, lighter highlights, broad shoulder-level waves and curled ends; retain the selected facial identity and outfit.
