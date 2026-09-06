# How We Met

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

A personal wedding game about Barron and Nina. The existing Toronto chapter is a small pixel-art platformer. The next chapter should make a substantial jump in ambition with an enjoyable 3D Florida boat race.

## Operating Context

The standalone game lives in this repository and deploys to the existing How We Met Vercel project. Toronto ends with dialogue and a transition into the playable Florida chapter at `/florida/`. The homepage also offers direct Florida entry.

## Capabilities and Constraints

Confirmed in the September 4, 2026 design conversation:

- Florida can have a completely different presentation and game loop from Toronto.
- Drive an airboat with Barron and Nina aboard through a stylized Fort Lauderdale Intracoastal Waterway.
- The driving reference is the enjoyable classic watercraft arcade racer the user remembers as Wave Runner; Wave Race is an adjacent reference to confirm, not a settled identification.
- Dodge alligators and comic Florida men floating in tubes.
- Include power-ups, ramps, waterfront mansions, and a finish at the 17th Street Causeway Bridge, with 15th Street Fisheries on the right on approach.
- Nina rides at the front and points things out; Barron drives. The September 5 selected animated-feature concept supersedes the earlier blocky/bikini direction: adult, rounded faces; Barron in a sage linen shirt and teal shorts; Nina in a coral crew-neck T-shirt and cream shorts. Preserve their distinctive curls/waves, green or hazel eyes, smiles, and jewelry. Character authority: `docs/concepts/florida-couple-approved-v4.png`.
- Produce the art needed for the game as part of the work.
- Three.js is the proposed rendering technology, suggested by the user.

The user subsequently approved desktop first, racing as the core activity, Cafecito Boost, Flamingo Floatie, SPF 1000, and an optional air horn. They delegated the implementation approach and authorized publishing on the existing How We Met site. The user subsequently requested mobile support on September 5, then replaced the optional horn direction with visible shooting; a separate dodge action remains later work. The first implementation is an automatically accelerating, point-to-point race with keyboard or touch steering/braking, medals, and a best time stored in the current browser.

## Brand Commitments

Keep the game personal to Barron and Nina. Florida should be cute, playful, and visibly 3D, with rounded animated-film characters informed by supplied likeness photos, alongside recognizable Fort Lauderdale landmarks. The user expressly wants this chapter to exceed the simple Toronto prototype in ambition.

## Evidence on Hand

- Existing Toronto game: `game.js`, `index.html`, and `embed.html`.
- Existing pixel character references: `assets/portraits/barron-portrait-2.jpg` and `assets/portraits/nina-portrait-2.jpg`. These are stylized likeness references, not photographs or exact 3D models.
- The Fisheries' official site places the restaurant at 1900 SE 15th Street in Lauderdale Marina, just north of the 17th Street bridge: https://www.15streetfisheries.com/ . Checked September 4, 2026.

## Product Principles

- Make steering, speed, and readable hazards enjoyable before adding more systems.
- Express the couple and place through characters, landmarks, and small reactions.
- Treat proposed mechanics and generated concepts as proposals until selected; do not present concept art as a running game.

## September 4 waterfront rebuild

The user rejected the first Florida build as too linear, visually weak, sparse beyond houses, and lacking speed. They explicitly made the original generated concept the visual target and requested research of the real Fort Lauderdale Intracoastal. The replacement has a curved four-kilometre course, two navigable island splits, three competitors, heading-based steering, drift rewards, slipstream, close-call combos, yacht collisions and crossing water taxis. The concept remains a target, not evidence of actual runtime fidelity. The course compresses and art-directs the place rather than reproducing a street map.

Character correction, September 5: Nina has blonde hair. Use golden blonde waves, superseding the brown hair in the selected illustration.


## September 5 mobile support

The user requested: “build mobile support now please.” Florida supports touch driving in portrait and landscape, with a left analog steering pad, pull-down braking/drift, and right Cafecito, Drift, and SOAK controls (the later shooting update replaces Horn). Multiple pointers can be held independently. Coarse input defaults to touch controls and Smooth graphics; players can select Keyboard/Touch and Smooth/Detailed on entry or pause, with browser-local preferences. Keyboard input continues to work in touch mode. Explicit control preferences take priority over automatic detection.

Preserve the selected blonde-haired couple and waterfront assets in both quality modes. Smooth caps DPR at 1, uses two-sample anti-aliasing and 1024px shadows, and skips screen-space ambient occlusion. Detailed preserves the prior 1.25 DPR cap, four samples, 2048px shadows, and ambient occlusion. Rotation, app backgrounding, and lost focus clear input and pause active races. No orientation lock or device-motion permission is required. Phone hardware performance remains a separate validation step from desktop browser viewport tests.


## September 5 shooting and character shape correction

The user rejected the horn attack and requested something the boat can shoot. The current action is a deck-mounted water blaster: hold Space or the touch SOAK button and steer the boat to aim. Visible shots travel forward and splash on contact. A direct hit briefly displaces a tube rider or makes a gator duck; this replaces the horn's area effect. Racing, drift, Cafecito, and the existing protection pickups remain the core loop.

The user separately rejected the character geometry: the face texture looked good, but the shapes distorted the result. Preserve the selected animated-feature art and facial atlas while correcting the actual head, face UV, body, hair, clothing, and hand geometry. Nina remains blonde. The correction targets the long lower faces, disproportionate heads and necks, rope-like hair, detached-looking sleeves, blocky shorts, and simple wrist ends. Compare the resulting meshes in front/three-quarter authoring renders and in the browser; good texture art alone does not satisfy this request.


## Rival water-shot hits

The user accepted the updated character look and requested that competing boats can also be shot. Direct water hits briefly slow and rock rival racers, creating an overtaking opportunity. Rivals keep racing, recover naturally, and have a short protection window so held fire cannot continuously stack slowdown. Existing Space/SOAK controls, characters, course, and power-ups are preserved.
