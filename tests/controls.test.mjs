import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTouchState, drivingInput, bindTouchControls } from '../florida/controls.js';
import { graphicsProfile } from '../florida/graphics.js';
import { createRace, stepRace, fireWater } from '../florida/core.js';

const pad = { x: 100, y: 100, radius: 50 };
test('steering is analog, has a center dead zone, and clamps outside its pad', () => {
  const input = createTouchState(); input.begin(1, 'steer', pad);
  input.move(1, 103, 100); assert.equal(input.state.steer, 0);
  input.move(1, 127.5, 100); assert.ok(Math.abs(input.state.steer - .5) < .00001);
  input.move(1, -500, 100); assert.equal(input.state.steer, -1);
  input.move(1, 500, 100); assert.equal(input.state.steer, 1);
  input.end(1); assert.equal(input.state.steer, 0);
});

test('multiple fingers retain independent ownership when one is released', () => {
  const input = createTouchState();
  input.begin(1, 'steer', pad); input.move(1, 150, 100);
  input.begin(2, 'boost'); input.begin(3, 'brake');
  assert.deepEqual(drivingInput(new Set(), input.state), { steer: 1, boost: true, brake: true, fire: false });
  assert.equal(input.begin(4, 'steer', pad), false);
  input.move(4, 50, 100); assert.equal(input.state.steer, 1);
  input.end(2); assert.equal(input.state.boost, false); assert.equal(input.state.brake, true);
  input.end(1); assert.equal(input.state.steer, 0); assert.equal(input.state.brake, true);
  input.end(3); assert.equal(input.state.brake, false);
});

test('pull-down drift uses hysteresis and can be combined with cafecito', () => {
  const input = createTouchState(); input.begin(1, 'steer', pad); input.begin(2, 'boost');
  input.move(1, 130, 129); assert.equal(input.state.brake, true);
  input.move(1, 130, 118); assert.equal(input.state.brake, true);
  input.move(1, 130, 110); assert.equal(input.state.brake, false);
  assert.equal(input.state.boost, true);
  input.end(1); assert.equal(input.state.boost, true);
});

test('duplicate fingers and unrelated release events cannot clear another held action', () => {
  const input = createTouchState();
  assert.equal(input.begin(1, 'boost'), true); assert.equal(input.begin(1, 'brake'), false);
  input.begin(2, 'boost'); input.end(1); input.end(99);
  assert.equal(input.state.boost, true);
  input.end(2); assert.equal(input.state.boost, false);
});

test('reset discards fingers and ignores late events after pause, restart, or rotation', () => {
  const input = createTouchState();
  input.begin(1, 'steer', pad); input.move(1, 150, 140); input.begin(2, 'boost');
  input.reset(); input.move(1, 150, 150); input.end(2);
  assert.deepEqual(drivingInput(new Set(), input.state), { steer: 0, brake: false, boost: false, fire: false });
  assert.equal(input.begin(3, 'steer', pad), true);
});

test('keyboard keeps working alongside touch without doubling steering', () => {
  assert.deepEqual(drivingInput(new Set(['ArrowLeft', 'ShiftRight']), { steer: .6, brake: true, boost: false }), { steer: -1, brake: true, boost: true, fire: false });
  assert.equal(drivingInput(new Set(), { steer: .6, brake: false, boost: false }).steer, .6);
});

test('touch inputs drive the real simulation, replenish cafecito on drift release, and respect water shot cooldown', () => {
  const input = createTouchState(), race = createRace(); race.status = 'racing'; race.speed = 28;
  input.begin(1, 'steer', pad); input.move(1, 130, 135);
  for (let i = 0; i < 60; i++) stepRace(race, drivingInput(new Set(), input.state), 1 / 120);
  assert.equal(race.drifting, true); assert.ok(race.turn > .2);
  const boost = race.boost;
  input.move(1, 130, 100); stepRace(race, drivingInput(new Set(), input.state), 1 / 120);
  assert.equal(race.drifting, false); assert.ok(race.boost > boost);
  input.begin(2, 'boost'); stepRace(race, drivingInput(new Set(), input.state), 1 / 120);
  assert.equal(race.boosting, true);
  assert.equal(fireWater(race), true); assert.equal(fireWater(race), false);
});

// Exercise event binding itself: capture, bubbling release, pointercancel, and
// lost capture are browser contracts rather than simulation behavior.
class Control extends EventTarget {
  constructor(action) { super(); this.dataset = { control: action }; this.capture = new Set(); this.style = { setProperty() {} }; this.classes = new Map(); this.classList = { toggle: (key, value) => this.classes.set(key, value) }; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 144, height: 120 }; }
  setPointerCapture(id) { this.capture.add(id); }
  hasPointerCapture(id) { return this.capture.has(id); }
  releasePointerCapture(id) { this.capture.delete(id); this.dispatchEvent(event('lostpointercapture', { pointerId: id })); }
}
function event(type, props) { return Object.assign(new Event(type, { cancelable: true }), props); }
function controlsFixture() {
  const win = new EventTarget(), elements = ['steer', 'brake', 'boost', 'fire'].map(name => new Control(name));
  const root = { ownerDocument: { defaultView: win }, querySelector: () => elements[0], querySelectorAll: () => elements.slice(1) };
  let active = true, shots = 0;
  const controls = bindTouchControls(root, { active: () => active, onFire: () => shots++ });
  const down = (element, id) => element.dispatchEvent(event('pointerdown', { pointerId: id, pointerType: 'touch', clientX: 110, clientY: 60 }));
  return { win, elements, controls, down, deactivate: () => { active = false; }, shots: () => shots };
}
test('DOM binding captures each finger, cancels independently, and resets captures safely', () => {
  const f = controlsFixture(), [steer, , boost, fireButton] = f.elements;
  f.down(steer, 1); f.down(boost, 2); f.down(fireButton, 3);
  assert.equal(f.shots(), 1); assert.equal(f.controls.state.fire, true); assert.equal(f.controls.state.boost, true); assert.ok(f.controls.state.steer > .5);
  f.win.dispatchEvent(event('pointercancel', { pointerId: 1 }));
  assert.equal(f.controls.state.steer, 0); assert.equal(f.controls.state.boost, true);
  assert.equal(steer.hasPointerCapture(1), false);
  boost.releasePointerCapture(2); assert.equal(f.controls.state.boost, false);
  f.down(boost, 4); f.controls.reset();
  assert.equal(boost.hasPointerCapture(4), false); assert.equal(fireButton.hasPointerCapture(3), false);
  assert.equal(f.controls.state.boost, false); assert.equal(f.controls.state.fire, false);
  f.deactivate(); f.down(boost, 5); assert.equal(f.controls.state.boost, false);
});
test('keyboard activation of a focused touch button is held, releases on blur, and does not leak to global shortcuts', () => {
  const f = controlsFixture(), boost = f.elements[2];
  const key = event('keydown', { code: 'Space', repeat: false }); boost.dispatchEvent(key);
  assert.equal(key.defaultPrevented, true); assert.equal(f.controls.state.boost, true);
  boost.dispatchEvent(event('blur', {})); assert.equal(f.controls.state.boost, false);
});

test('smooth graphics caps pixel cost while detailed preserves the existing profile', () => {
  assert.deepEqual(graphicsProfile('smooth', 3), { pixelRatio: 1, samples: 2, shadowSize: 1024, ao: false });
  assert.deepEqual(graphicsProfile('detailed', 2), { pixelRatio: 1.25, samples: 4, shadowSize: 2048, ao: true });
  assert.equal(graphicsProfile('smooth', .8).pixelRatio, .8);
});

test('holding the touch blaster fires repeatedly while steering; cancellation and reset stop new shots', () => {
  const f = controlsFixture(), [steer, , , fireButton] = f.elements;
  const race = createRace(); race.status = 'racing'; race.objects = []; race.rivals = [];
  f.down(steer, 1); f.down(fireButton, 2);
  for (let i = 0; i < 90; i++) stepRace(race, drivingInput(new Set(), f.controls.state), 1 / 120);
  assert.ok(race.nextShotId >= 3); assert.ok(race.turn > 0);
  f.win.dispatchEvent(event('pointercancel', { pointerId: 2 }));
  const fired = race.nextShotId;
  for (let i = 0; i < 60; i++) stepRace(race, drivingInput(new Set(), f.controls.state), 1 / 120);
  assert.equal(race.nextShotId, fired); assert.ok(f.controls.state.steer > 0);
  f.down(fireButton, 3); f.controls.reset();
  assert.equal(f.controls.state.fire, false); assert.equal(fireButton.hasPointerCapture(3), false);
});
test('keyboard and assistive activation of SOAK respect inactive controls and release on focus loss', () => {
  const f = controlsFixture(), fireButton = f.elements[3];
  fireButton.dispatchEvent(event('click', { detail: 0 })); assert.equal(f.shots(), 1);
  fireButton.dispatchEvent(event('keydown', { code: 'Space', repeat: false }));
  assert.equal(f.controls.state.fire, true); assert.equal(f.shots(), 2);
  fireButton.dispatchEvent(event('keydown', { code: 'Space', repeat: true })); assert.equal(f.shots(), 2);
  fireButton.dispatchEvent(event('blur', {})); assert.equal(f.controls.state.fire, false);
  f.deactivate(); fireButton.dispatchEvent(event('click', { detail: 0 })); assert.equal(f.shots(), 2);
});

test('focused SOAK key release can bubble to clear a Space press that began on the canvas', () => {
  const f = controlsFixture(), fireButton = f.elements[3];
  fireButton.dispatchEvent(event('keydown', { code: 'Space', repeat: false }));
  const release = event('keyup', { code: 'Space' });fireButton.dispatchEvent(release);
  assert.equal(release.defaultPrevented, true);assert.equal(release.cancelBubble, false);
  assert.equal(f.controls.state.fire, false);
});
