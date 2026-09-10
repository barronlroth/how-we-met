# Florida chiptune soundtrack

The full 5:49 arrangement from the completed chiptune task replaces the generated
marimba melody. Its MP3 is copied unchanged; file provenance and checksum are in
[`florida/assets/audio/README.md`](../florida/assets/audio/README.md).

The existing Sound on control starts the streamed track and Web Audio effects.
Music loops through the menu, race and finish screen without restarting between
runs. Muting, pausing and hiding the page pause the media element. Returning to a
paused race stays silent until the player resumes. Music has a separate half-gain
input to the master bus so the existing event effects remain distinct.

Validation on September 10, 2026:

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
