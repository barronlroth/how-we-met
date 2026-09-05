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
- Nina rides at the front, points things out, and wears a bikini; Barron is a small blocky 3D version of himself at the controls.
- Produce the art needed for the game as part of the work.
- Three.js is the proposed rendering technology, suggested by the user.

The user subsequently approved desktop first, racing as the core activity, Cafecito Boost, Flamingo Floatie, SPF 1000, and an optional air horn. They delegated the implementation approach and authorized publishing on the existing How We Met site. Phone controls and a separate dodge action are later work. The first implementation is an automatically accelerating, point-to-point race with keyboard steering/braking, medals, and a best time stored in the current browser.

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
