# Florida chiptune soundtrack

The full 5:49 arrangement from the completed chiptune task replaces the generated
marimba melody. Its MP3 is copied unchanged; file provenance and checksum are in
[`florida/assets/audio/README.md`](../florida/assets/audio/README.md).

Sound defaults on. The first click, tap or keypress starts the streamed track and
Web Audio effects. The existing sound control can mute before that first gesture
without any playback, and subsequent gestures respect the player's mute choice.
Music loops through the menu, race and finish screen without restarting between
runs. Muting, pausing and hiding the page pause the media element. Returning to a
paused race stays silent until the player resumes. Music has a separate half-gain
input to the master bus so the existing event effects remain distinct.

Initial integration validation on September 10, 2026:

- All 159 tests pass and the production build succeeds. New tests cover opt-in
  playback, preserved position, pause/unmute behavior, late AudioContext resume
  after muting, and interrupted playback without retries on every frame.
- The real browser reported no loaded audio data before enabling sound, then
  decoded and played the 348.943673-second track with looping enabled.
- The track continued into a race, stopped at 38.307120 seconds on pause, held
  that position while paused, and continued from 38.441697 seconds on resume.
- Mute/unmute during racing and a water shot during playback produced no media,
  console or runtime errors.
- A second in-app tab did not hide the first document, so that action was not a
  browser verification of the visibility handler. The handler explicitly pauses
  music for a hidden document and preserves the game's existing pause behavior.

Local browser evidence is `.dream-loop/audio-local-browser.json`; the full test
output is `.dream-loop/audio-release-tests.txt`.

## Default sound on

The sound button initially reads Sound on with `aria-pressed="true"`. The audio
graph remains uninitialized until a trusted input event; this follows the
browser's [media and Web Audio activation rules](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
Click, pointer release and keyboard input can activate playback. Sound-button
events are excluded from that automatic path so the first click can mute cleanly.

All 161 tests pass. The browser verified music starts with Start race or Enter
without using the sound toggle. Muting first and then starting a race kept the
track paused at zero seconds. No browser errors or warnings were reported.
Evidence: `.dream-loop/default-sound-tests.txt` and
`.dream-loop/default-sound-browser.json`.
