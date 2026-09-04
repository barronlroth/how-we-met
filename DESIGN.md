---
name: "How We Met — Florida"
description: "The visual system for the Intracoastal Run chapter and its homepage link."
colors: {"navy":"#103b48"}
typography: {"display":{"fontFamily":"Bungee, sans-serif","fontSize":"clamp(40px, 5.6vw, 82px)","fontWeight":400,"lineHeight":1.12,"letterSpacing":"-.025em"}}
rounded: {"keycap":"4px"}
spacing: {"tight":"4px"}
components: {"button-primary":{"backgroundColor":"{colors.yellow}","textColor":"{colors.navy}","typography":"{typography.action}","rounded":"{rounded.action}","padding":"15px 27px"}}
---

# Design System: How We Met — Florida

## Overview

**Creative North Star: "A Florida Postcard in Motion"**

Florida is a sunny, playful 3D place to race through with Barron and Nina. Faceted characters, warm waterfront buildings, palm silhouettes, and animated turquoise water carry the experience. The interface is a small set of arcade instruments: substantial type, clear controls, and room to see the course.

This record applies to florida/ and the Florida chapter link on the homepage. Its descriptive language follows the user-approved cute 3D Intracoastal brief. Toronto keeps its pixel art, Press Start 2P, and Quicksand; Florida's tokens are not global Toronto rules.

**Key Characteristics:**

- Original low-poly geometry with warm daylight and visible material facets.
- Cream and navy instruments, yellow actions, and coral accents.
- Motion expressed through steering, wakes, the fan, and the couple.
- A finish composition that includes the couple, bridge, and Fisheries.

**The Chapter Boundary Rule.** Extend these tokens within Florida; retain the homepage's Quicksand for its chapter link.

Baseline: implementation commit `0bf4f2a`, reviewed September 4, 2026. Sources: [CSS](florida/style.css), [markup](florida/index.html), [art](florida/art.js), [world](florida/world.js), and [runtime](florida/main.js). Direction: [florida-direction.md](docs/florida-direction.md). Captures: `.impeccable/review/{desktop,user-989,mobile,gameplay,finish,finish-989}.png`.

## Colors

The frontmatter preserves exact reusable values. UI and model colors are separate palettes. Yellow identifies actions, focus, gold pace, best times, and Cafecito fuel. Coral marks progress and boat details; pink identifies the floatie. Cream text sits on dense navy instruments and dialogs. Model cream, coral, teal, terracotta, palm leaf, and wood establish the waterfront. Medal colors accompany written names. Chapter colors apply only to the homepage link.

**The Moving Background Rule.** Keep the race clock and sector label on their navy instrument plates. Text shadows alone do not replace these surfaces.

Water and sky are shader-driven; preserve their definitions in `world.js`. Sidecar tonal ramps are derived preview strips, not runtime tokens.

## Typography

Self-hosted Bungee supplies the arcade titles and numbers; Nunito supplies sentences, captions, and controls. Bungee is declared at weight 400; Nunito's regular and bold files serve the CSS weight ranges. Timing uses tabular figures. Desktop result time is 48px, speed 46px, result heading 28px, and centered dialog heading 30px. The homepage chapter title stays in Quicksand.

**The Instrument Type Rule.** Use Bungee for short race titles and numbers; use Nunito for sentences, controls, and captions.

## Layout

The canvas fills the viewport; overlays sit at its edges. The desktop topbar uses 24px top and 32px side insets. The introduction starts at 22% top and 6.3% left with a 560px measure and a left-to-right shade. That shade disappears during racing. Sector is upper left, clock upper right, progress right, and boost/status/speed along the bottom. Nina's caption sits above them.

At widths of 761px and above, the 390px result panel moves left; other dialogs center. At 760px and below, side insets become 18px, tool labels hide, instruments shrink, and the keyboard-only phone note appears. Coarse pointers also hide the key guide. Heights of 720px and below compress panels vertically. The homepage link stacks at 600px. Responsive layout does not supply touch steering.

**The Arrival Rule.** Keep the couple, the 17th Street bridge, and Fisheries visible together beside the desktop result panel, including the reviewed 989px viewport.

## Elevation & Depth

Real geometry, warm directional light, hemisphere fill, cast shadows, and fog provide world depth. Most materials use flat shading and roughness 0.8; SPF temporarily makes the hull glossy. Soft action/caption shadows and broad dialog shadows support the UI; exact values are in the sidecar.

Camera follow eases; boost expands the normal 58° field of view toward 65°. Steering rolls the hull and Nina. Wakes follow boat travel; pickups bob and rotate, the fan spins, and the floatie deflates after a hit. Reduced motion removes CSS transitions, flashes, shake, boost FOV expansion, and hull bob/roll/pitch. Water, fan, pickups, some character motion, and camera following continue.

## Shapes

Visible facets, boxes, low-sided pipes, sculpted palm fronds, and rounded volumes define the 3D world. UI uses compact keycaps, gently rounded actions/instruments, broader dialog corners, and pill medals. Outline icons accompany sound, pause, navigation, and coffee; progress uses a cream path, coral dot, and yellow flag.

## Components

Primary actions use yellow/navy, a 178px minimum width, a 2px hover lift, and a 1px pressed offset; loading reduces opacity. Tools use compact navy buttons; secondary actions underline on hover. All links and buttons share a 3px yellow focus ring with a 5px offset.

Race instruments remain concise. The Cafecito fill turns cream while boosting; labeled floatie, SPF, and horn states show remaining hit/time information. Nina's short caption uses a polite live region. Pause and result dialogs contain tab navigation; replay receives finish focus. Results show a named medal, time, browser-local best, and three stats. Medal thresholds remain owned by `MEDAL_TIMES` in `core.js`.

The homepage link uses Quicksand and a yellow action phrase, with teal hover and the shared focus ring. Retain the keyboard-only phone note and actionable WebGL failure path. The sidecar includes five representative components.

[Asset provenance](florida/assets/README.md): runtime geometry and GLSL are original; audio is synthesized in `florida/audio.js`. The [concept image](docs/concepts/florida-intracoastal-run-v1.png) and [prompt](docs/concepts/florida-intracoastal-run-v1.prompt.md) are planning references. Font licenses: [Bungee](florida/assets/Bungee-OFL.txt), [Nunito](florida/assets/Nunito-OFL.txt).

## Do's and Don'ts

**Do:**

- Keep the couple, course, hazards, and arrival landmarks readable.
- Build Florida scenery and characters as coherent, faceted 3D forms.
- Pair color-coded states with text, visible geometry, or both.
- Preserve keyboard focus, pause behavior, and the honest phone-controls message.
- Use the approved surface brief and current runtime as visual evidence.

**Don't:**

- Apply Florida's fonts, palette, or 3D art rules to Toronto.
- Replace live gameplay or the world background with the concept image.
- Remove the navy backing from the race clock or sector label.
- Describe responsive layouts as shipped touch controls.
- Hide the couple or either arrival landmark behind the desktop result panel.
