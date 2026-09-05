---
name: "How We Met — Florida V2"
description: "The built Intracoastal Run visual system; Toronto retains its existing identity."
colors: {"navy": "#103b48", "cream": "#fff9e9", "yellow": "#ffdc57", "action-hover": "#ffe993", "aqua": "#59f1e3", "coral": "#f48163", "clock": "#103b48cc", "sector": "#103b48c7", "panel": "#103b48ed", "caption": "#103b48dc", "tool": "#123e4be0", "tool-hover": "#24626b", "silver": "#d8e9e7", "bronze": "#e6b389", "chapter-bg": "#174e58", "chapter-hover": "#1c626a", "chapter-text": "#fff7df", "chapter-yellow": "#ffdf64"}
typography: {"display": {"fontFamily": "Bungee, sans-serif", "fontSize": "clamp(35px, 4.1vw, 64px)", "fontWeight": 400, "lineHeight": 1.06, "letterSpacing": "-.025em"}, "eyebrow": {"fontFamily": "Bungee, sans-serif", "fontSize": "22px", "letterSpacing": ".01em"}, "headline": {"fontFamily": "Bungee, sans-serif", "fontSize": "21px", "fontWeight": 400, "lineHeight": 1.2}, "body": {"fontFamily": "Nunito, sans-serif", "fontSize": "15px", "lineHeight": 1.5}, "action": {"fontFamily": "Nunito, sans-serif", "fontSize": "18px", "fontWeight": 1000}, "clock": {"fontFamily": "Bungee, sans-serif", "fontSize": "37px", "lineHeight": 1.2}, "caption": {"fontFamily": "Nunito, sans-serif", "fontSize": "14px", "fontWeight": 900, "lineHeight": 1.4}, "chapter-title": {"fontFamily": "Quicksand, system-ui, sans-serif", "fontSize": "24px", "fontWeight": 700}}
rounded: {"keycap": "3px", "tool": "8px", "action": "9px", "panel": "14px", "medal": "22px"}
spacing: {"key-gap": "4px", "tool-gap": "8px", "panel": "30px"}
components: {"button-primary": {"backgroundColor": "{colors.yellow}", "textColor": "{colors.navy}", "typography": "{typography.action}", "rounded": "{rounded.action}", "padding": "15px 28px"}, "button-primary-hover": {"backgroundColor": "{colors.action-hover}"}, "button-tool": {"backgroundColor": "{colors.tool}", "textColor": "{colors.cream}", "rounded": "{rounded.tool}", "padding": "8px 13px"}, "button-text": {"backgroundColor": "transparent", "textColor": "{colors.cream}", "padding": "6px 0"}, "race-clock": {"backgroundColor": "{colors.clock}", "textColor": "{colors.cream}", "typography": "{typography.clock}", "rounded": "{rounded.action}", "padding": "7px 13px"}, "nina-caption": {"backgroundColor": "{colors.caption}", "textColor": "{colors.cream}", "typography": "{typography.caption}", "rounded": "{rounded.tool}", "padding": "9px 15px"}, "finish-panel": {"backgroundColor": "{colors.panel}", "textColor": "{colors.cream}", "rounded": "{rounded.panel}", "padding": "26px", "width": "330px"}, "cafecito-gauge": {"width": "190px", "height": "135px"}, "chapter-link": {"backgroundColor": "{colors.chapter-bg}", "textColor": "{colors.chapter-text}", "rounded": "{rounded.panel}", "padding": "24px 28px"}}
---

# Design System: How We Met — Florida V2

## Overview

**Creative North Star: "A Florida Postcard in Motion"**

Florida is a playful miniature waterfront with a detailed cream, coral, and teal airboat, blocky characters, layered planting, yachts, balconies, and reflective turquoise water. Broad curves and soft material highlights now coexist with the characters’ visible facets. Sparse arcade instruments leave the course and couple primary.

This record captures the built Florida V2 world and its homepage link. The user pinned the original generated concept as the visual target; it remains a reference, not runtime imagery or proof of equivalent fidelity. Toronto retains its pixel art, Press Start 2P, Quicksand, and existing palette.

**Key Characteristics:**

- Shaped hull, visible teak, separate upholstered seats, and an exposed fan and engine.
- Dense moorings, planted banks, villas, condos, branching channels, and active boat traffic.
- Cream and navy instruments, yellow actions, and an aqua Cafecito gauge.
- Close couple framing at entry and finish, with bridge and Fisheries visible on desktop.

**The Chapter Boundary Rule.** Extend these tokens within Florida; retain Toronto’s visual system and the homepage link’s Quicksand.

Recorded September 4, 2026 from [CSS](florida/style.css), [markup](florida/index.html), [runtime](florida/main.js), [scene art](florida/premium-art.js), [materials](florida/materials.js), [world](florida/world.js), and [effects](florida/effects.js). Direction: [waterfront V2](docs/concepts/florida-waterfront-v2.direction.md). Captures: `.impeccable/review/{desktop,user-989,racing,finish,mobile,concept-size}.png`. The review closed the water/light, wake, and entry-composition fixes with **ship at that fix-list scope only**. Active gameplay was measured at approximately 33 FPS at 1440 × 900; this is not a 60 FPS claim.

## Colors

The frontmatter owns reusable UI values; `materials.js`, `art.js`, and `world.js` own scene colors. Sidecar tonal ramps are derived panel previews, not runtime tokens.

- **Primary:** warm yellow identifies actions, focus, gold targets, best times, and race callouts. Aqua fills the curved Cafecito gauge; it turns pale cream during boost.
- **Secondary:** coral marks the map position and impact frame. Pink distinguishes Flamingo protection; Nina’s speaker label is coral.
- **Neutral:** cream text sits against translucent navy instruments and panels. Silver and bronze accompany written medal labels. The homepage link keeps its separate teal, cream, and yellow values.

**The Moving Background Rule.** Keep the clock and sector label on their navy plates so the animated world cannot erase them.

## Typography

Self-hosted Bungee supplies slanted arcade titles, timing, rank, and speed; Nunito supplies sentences, captions, and controls. Bungee is declared at weight 400; Nunito’s regular and bold files serve the CSS weight ranges. Timers use tabular figures. The title lockup skews −4° and has a navy outline-like text shadow; FLORIDA is the user-approved eyebrow.

The desktop race clock is 37px, position 52px, speed 38px, result time 43px, result title 25px, and centered dialog title 27px. The title wraps at 1000px and below. The homepage chapter title remains Quicksand.

**The Instrument Type Rule.** Use Bungee for short race titles and numbers; use Nunito for sentences, controls, and captions.

## Layout

A viewport-filling canvas sits behind fixed overlays. The desktop topbar is 20px from the top and 30px from each side. Entry separates the upper-left title (13% top, 4.5% left) from lower-left actions (6% bottom), leaving the large airboat and couple in the foreground. A light directional shade fades during racing. Entry and finish stage the boat near the destination; their camera composition is separate from the chase camera.

During racing, sector/checkpoints occupy the upper left, clock the upper right, the actual course map the right edge, and rank, item states, speed, and Cafecito the bottom. Nina’s caption sits above the lower instruments. The map includes both island branches. The finish panel sits at 3% left with a 330px width, keeping the couple, bridge, and Fisheries visible beside it in the reviewed desktop capture.

At 1000px and below, title and result widths tighten; at 760px and below, edge insets shrink, speed hides, controls scale down, and the result panel centers. At 600px and below, the title moves higher. Heights of 740px and below compress spacing. The camera separately adjusts below 1100px and 600px. Small screens show “Made for a keyboard. Phone controls come later.” Coarse pointers also hide the key guide. The homepage link stacks at 600px. Phone layout is a presentation fallback; steering remains keyboard-only.

## Elevation & Depth

The world uses cast shadows, warm directional light, hemisphere fill, atmospheric fog, reflective Three.js water, and nearby screen-space contact shading. Boat surfaces distinguish teak, upholstery, rubber, metal, glass, and painted hull. Generic art materials use smooth shading with roughness 0.62; the crafted material set varies by surface. Preserve these differences instead of restoring V1’s blanket flat shading.

Water combines seeded periodic normal detail, broad color variation, reflections, and localized crest highlights. The wake is broken, fading foam with transparent edges and spray; it trails the boat’s actual heading. Dense planted yards, docks, balconies, and moored boats supply overlapping depth. UI lift is limited to the primary action and modal panels; exact shadows are in the sidecar.

The camera eases into a 63° staged view, 68° race view, or 84° boosted view. Steering banks the hull; speed adds slight vibration and peripheral streaks. Reduced motion removes CSS transitions, streaks, flash, camera vibration/shake, boost FOV expansion, hull bob/roll/pitch, and Nina’s body roll. Water, fan, wakes, pickups, some character motion, and camera following continue.

## Shapes

The airboat has a curved, beveled hull, thin rails, separate seats, and a detailed fan cage. Architecture combines recessed balconies, pitched roofs, flat terraces, and repeated verticals; foliage and characters keep a stylized miniature silhouette. UI uses small keycaps, rounded tools and actions, wider panel corners, and pill medals. Outline icons and the semicircular coffee gauge retain an arcade instrument character.

## Components

- **Actions and tools:** yellow primary controls have a 180px minimum width, 2px hover lift and 2px pressed offset; disabled controls reduce opacity. Navy sound/pause controls include outline icons. Text actions underline on hover. Buttons and links use a 3px yellow focus ring with a 5px offset.
- **Race instruments:** short labels, tabular timing, rank out of four, real course progress, and a curved Cafecito meter. Item chips show Flamingo protection, SPF time, and horn cooldown. Drift, slipstream, close-call, and boost callouts occupy the left side.
- **Nina caption:** compact navy backing, a coral speaker label, and a polite live region; the runtime fades short comments.
- **Dialogs:** pause and finish trap tab navigation; resume restores focus and finish focuses replay. Results show rank/medal, time, browser-local best, jumps, close calls, and bumps. Demo completion uses its own copy and does not save records. Thresholds remain in `MEDAL_TIMES` in `core.js`.
- **Entry and fallback:** Start race and Watch a run share the entry scene; the demo offers Take the wheel. Preserve the keyboard notice and actionable graphics-failure panel. The homepage chapter link retains Quicksand and its original styling.

[Asset provenance](florida/assets/README.md): models are code-authored. [Generated teak](florida/assets/teak-v2.png) is used on the airboat, yachts, and docks, with its [exact prompt](florida/assets/teak-v2.prompt.md). Stucco, roof, foliage, and cloth detail are deterministic native-canvas textures; wake foam is also native canvas. Water normals are procedural. Real reference photos are not shipped. The explicitly pinned [original concept](docs/concepts/florida-intracoastal-run-v1.png) remains a visual target. Audio is synthesized; self-hosted fonts include [Bungee](florida/assets/Bungee-OFL.txt) and [Nunito](florida/assets/Nunito-OFL.txt) licenses.

## Do's and Don'ts

**Do:**

- Do preserve the couple, readable hazards, curved course, and desktop arrival landmarks.
- Do extend the built shaped geometry and material detail when adding Florida scenery.
- Do keep the user-approved FLORIDA eyebrow and original concept reference.
- Do pair color-coded states with text or recognizable geometry.
- Do preserve keyboard focus, pause behavior, and the explicit phone-controls notice.

**Don't:**

- Don’t apply Florida’s fonts, palette, or 3D art rules to Toronto.
- Don’t substitute the concept image for the playable world or a runtime screenshot.
- Don’t describe code-authored models or native-canvas materials as externally generated assets.
- Don’t describe responsive layout as touch steering or reduced motion as a static scene.
- Don’t expand the closed three-fix review into a full design or 60 FPS certification.
