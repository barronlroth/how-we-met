# Florida implementation direction

The user approved the cute 3D Intracoastal racer and delegated how to build it. Desktop comes first. All four motifs are approved: Cafecito Boost, Flamingo Floatie, SPF 1000, and an air horn. No dedicated dodge button is needed in this version.

## Experience

A three-minute point-to-point race with a chase camera, easy automatic throttle, steering and braking, optional boost and horn, and a finish beneath the 17th Street bridge. Best time is stored on this browser. There are no accounts or online leaderboard claims. Toronto remains playable and its ending leads into Florida; the homepage also offers direct Florida entry.

## First viewport

The actual 3D airboat and waterfront fill the screen. An unobtrusive start overlay names the race and explains the four keyboard actions. Once racing, the scenery dominates: mansions and palms, turquoise animated water, tube floaters, alligators, ramps, and a recognizable bridge/Fisheries finish. The generated concept in docs/concepts is the art reference; runtime geometry is authored for the game. No generated screenshot substitutes for gameplay.

## Signature interaction

The hull slides sideways, rolls into turns, and pitches over wakes; its rear fan spins and a foamy wake follows its actual motion. Nina leans, points, and cheers. The inflatable flamingo appears around the boat and visibly deflates after absorbing one collision. SPF creates a temporary slippery sheen and soft glancing collisions. Coffee fuels a burst of speed. The horn makes obstacles scatter or dive.

## Art grammar

Warm sun, vivid teal water, cream stucco, terracotta roofs, coral boat fittings, generous palm silhouettes, and clear clean faceted forms. The water uses animated geometry and a dedicated shader. Model the couple, boat, houses, marina, bridge, pickups, gators, and floaters as real 3D forms. UI uses self-hosted Bungee and a readable sans with cream/navy/coral colors, high-contrast controls, visible keyboard focus, and tabular timing.

## Design workflow

Code-led for this real-time 3D artifact, as an implementation decision delegated by the user. The pinned game concept takes precedence over unrelated visual-world challengers from Impeccable seed 7b068f1e. Their useful craft disciplines are legible instruments, motion expressed through wakes, and a coherent typographic hierarchy; their textile, strobing, and night-flight identities do not match the approved tropical daytime world.

## Verification

Exercise race completion and restart, pause and resume, pickups, both protective effects, horn, collisions, ramps, storage failure handling, Toronto transition, and WebGL failure messaging. Inspect desktop at normal and compact sizes and confirm mobile receives an honest desktop-controls message. Review the actual runtime screenshots independently before deploying to the existing How We Met site.
