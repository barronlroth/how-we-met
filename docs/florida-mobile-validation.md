# Florida mobile support — September 5, 2026

## Delivered behavior

- Analog left-thumb steering; pull down to brake/drift. Separate right-thumb Drift, Horn, and Cafecito buttons remain available.
- Independent pointer capture supports steering, braking and boost simultaneously. Releasing or cancelling one finger preserves other held inputs. Losing capture, pausing, restarting, finishing, switching controls, leaving the app or rotating clears held input. Active races pause on blur, backgrounding and orientation changes.
- Touch input defaults from coarse-pointer capability, with hybrid-device touch detection when no explicit control preference exists. Entry and pause selectors offer Touch/Keyboard and Smooth/Detailed. Choices persist in local storage, with a safe fallback when storage is blocked. Keyboard steering remains available in touch mode.
- Portrait chase camera centers the boat, pulls back and raises the view. Landscape retains the established racing camera. Thumb controls, captions, rank/speed and map adapt to the available space. CSS safe areas and `viewport-fit=cover` protect notches and home indicators; short dialogs can scroll.
- Smooth preserves geometry, textures and water, but caps DPR at 1, uses 2-sample anti-aliasing, 1024px shadows and no screen-space ambient occlusion. Detailed preserves the earlier 1.25 DPR cap, 4 samples, 2048px shadows and ambient occlusion. Neither setting alters physics, hazards, course or rewards.

## Automated checks

`npm test`: 25 passing tests, including 10 new mobile input/graphics cases. Tests cover analog range and dead zone, simultaneous fingers and independent release, pull-down brake hysteresis, duplicate pointers, reset with late events, hybrid keyboard input, real simulation drift reward/boost/horn, actual DOM-binding event handlers through an EventTarget fixture, lost capture/cancel, and graphics profiles. The previous hero budgets, course, race mechanics, storage and scenery batching tests still pass.

`npm run build`: Toronto and Florida both build. No new raster assets, geometry, libraries, network services, motion-sensor permissions or dependencies were added.

## Browser evidence

CUA reviewed 1280×720 desktop, 390×844 portrait, 320×568 small portrait, 844×390 landscape, and 768×1024 tablet layouts. Entry, touch driving, pause/settings, restart and finish were inspected. Browser pointer drag changed steering; tapping Horn showed its cooldown. Desktop Space still honked and Escape paused. Smooth/Detailed and Keyboard/Touch were switched through the real selectors. The measured full demo completed at 1:25.48 with 13 jumps, 5 close calls and 8 bumps. A second full run after the compact-layout corrections completed at 1:24.94 with 12 jumps, 5 close calls and 6 bumps; its landscape finish shows both replay and return actions without scrolling. The demo is labeled and does not write a best time.

At 844×390, DPR 1, Smooth, the desktop host's WebGL browser averaged 60 FPS in all four sectors; p95 frame intervals were approximately 17.5–18.2ms. Full measurements are in ignored `.impeccable/mobile/landscape-performance.txt`; screenshots and review evidence are in the same directory. These figures are desktop-host viewport measurements, not iPhone/Android performance claims. They do not measure battery use, thermal throttling, Safari browser chrome/notch behavior, or physical multi-finger play. No physical mobile hardware was connected for this pass.

The detector ran once on the changed targets. Its warnings concern static-root contrast assumptions and incumbent colored shadows; they are retained in the evidence packet rather than described as a clean accessibility scan. New action text uses cream on navy or navy on yellow/aqua, with large controls and visible focus. The existing FLORIDA eyebrow and lettering outlines remain intentional.


## Final review corrections

The fresh finish review requested native-menu shortcut ownership and larger touch microcopy. Native selects now keep Enter/Escape and editing keys; Enter/Space on buttons and links retain native activation, while the dialog Tab trap and canvas driving shortcuts still work. CUA confirmed Enter/Escape on entry settings did not start a race, Escape on pause settings kept the dialog open, Tab from the final select focused Keep cruising, and canvas Space/Escape still honked/paused. All newly added touch instructions and HUD labels are at least 11px, including the short-landscape boost instruction. Portrait, small-portrait, and landscape racing captures were refreshed after the changes; 25 tests and the production build still pass.

The finish reviewer scored both requested corrections as resolved with no regressions observed and returned `ship` for those fixes. Review files are `.impeccable/mobile/review.md` and `verdict.md`.
