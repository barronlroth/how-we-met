# Florida: Intracoastal Run

Design brief, September 4, 2026. The user approved the direction and delegated implementation. Current implementation decisions are recorded in `florida-direction.md`.

## The experience

Barron and Nina race their airboat south through a cute, compressed 3D Fort Lauderdale. Waterfront mansions, docks, palms, yachts, canal mouths, and widening water make the location readable at speed. The 17th Street Causeway Bridge becomes the finish landmark, with 15th Street Fisheries to the right immediately before it.

The reference is the joy of classic watercraft arcade racing: responsive steering with a little sideways slip, a chase camera, hull bobbing, a spinning rear fan, a broad foamy wake, and satisfying jumps and landings. Florida should feel like a distinct game chapter.

## Confirmed content

- An airboat carrying both Barron and Nina, rendered as cute blocky 3D adults.
- Barron drives; Nina rides at the front in a bikini and points things out.
- Alligators and Florida men in inner tubes are hazards.
- Power-ups, ramps, waterfront mansions, and the named finish landmarks.
- Art is part of the implementation scope.

## Proposed first race

One authored point-to-point course of roughly three minutes, with checkpoints and finish medals. The user selected racing, desktop first, and delegated the race implementation. Phone controls are deferred.

1. **Mansion canals:** broad introductory turns, clear buoy gates, and the first floaters; teach the weight and slip of the boat.
2. **The busy waterway:** yacht wakes, crossing tubes, alligators, and optional ramp lines; reward reading the water and choosing a route.
3. **The bridge approach:** widen the view, frame the bridge, pass Fisheries on the right, and cross the finish beneath the span.

Use recognizable geography with deliberate compression for racing. Exact street-by-street navigation is not a confirmed requirement.

## Ideas to react to

- **Nina as spotter:** point and lean toward approaching hazards and optional shortcuts; celebrate airtime and the finish. Short captioned reactions can add personality without obstructing the driving view.
- **Cafecito Boost:** a coffee pickup provides a short surge of speed.
- **Flamingo Floatie:** a pink inflatable appears around the hull, absorbs one collision with a bounce, then visibly deflates.
- **SPF 1000:** sunscreen makes the next several seconds slippery enough to glance off collisions.
- **Air Horn:** scatter nearby tube floaters in a comic, non-gory reaction.
- **Near-miss reward:** clean close passes refill a small amount of boost, encouraging confident lines.
- **Yacht-wake jumps:** smaller jumps available through steering, plus a few obvious optional ramps.

Select a small coherent set rather than implement every proposed system at once.

## Art and build intent

A full-screen 3D scene with a restrained arcade HUD. Bright turquoise water, pale stucco, coral accents, and warm tropical sunlight. The place and moving boat carry the screen; surrounding website chrome should recede during play.

Existing pixel portraits are initial likeness references. The final boat, characters, landmarks, scenery, hazards, and pickups need real game-ready geometry and animation. Generated concept art establishes a visual target; it is not a substitute for those assets or evidence of rendered gameplay.

The proposed renderer is Three.js, as suggested by the user. Preserve a way to reach Florida from the Toronto ending and a direct entry for development and replay. These integration details are implementation recommendations, not confirmed additional features.

## Later work

- Phone controls, if requested.
- A separate dodge action or a more extensive racing/combat mode, if requested.
- Further personal dialogue or character likeness adjustments after the user plays.

## Location source

The Fisheries' official site places the restaurant inside Lauderdale Marina at 1900 SE 15th Street, just north of the 17th Street bridge: https://www.15streetfisheries.com/ . Checked September 4, 2026. The right-hand placement is for the proposed southbound approach.
