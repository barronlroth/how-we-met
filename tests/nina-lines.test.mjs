import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNinaBanter, FRIEND_LINES } from '../florida/nina-lines.js';

test('a normal race gives each friend one readable turn, with breathing room', () => {
 const banter = createNinaBanter(), delivered = [];
 for (let elapsed = 0; elapsed <= 90; elapsed += .5) {
  const line = banter.next({ status: 'racing', elapsed });
  if (line) delivered.push({ ...line, elapsed });
 }
 assert.deepEqual(delivered.map(line => line.friend), ['Miles', 'Brauser', 'Josh', 'Clark', 'Dewey']);
 assert.ok(delivered.every(line => line.duration >= 4.2 && line.text.includes(line.friend)));
 assert.ok(delivered.every((line, i) => !i || line.elapsed - delivered[i-1].elapsed >= 13));
});

test('race instructions postpone banter without dropping a friend or bursting queued lines', () => {
 const banter = createNinaBanter();
 assert.equal(banter.next({ status: 'racing', elapsed: 9 }), null);
 assert.equal(banter.next({ status: 'racing', elapsed: 10, captionBusy: true }), null);
 assert.equal(banter.next({ status: 'racing', elapsed: 29, captionBusy: true }), null);
 assert.equal(banter.next({ status: 'racing', elapsed: 30 }).friend, 'Miles');
 assert.equal(banter.next({ status: 'racing', elapsed: 30.01 }), null);
 assert.equal(banter.next({ status: 'racing', elapsed: 43 }).friend, 'Brauser');
});

test('ready, countdown, paused and finished states never consume a joke', () => {
 const banter = createNinaBanter();
 for (const status of ['ready', 'countdown', 'paused', 'finished']) assert.equal(banter.next({ status, elapsed: 50 }), null);
 assert.equal(banter.next({ status: 'racing', elapsed: 50 }).friend, 'Miles');
});

test('replays rotate through all 25 jokes and restart the timing', () => {
 const seen = new Set();
 for (let rotation = 0; rotation < 5; rotation++) {
  const banter = createNinaBanter(rotation);
  assert.equal(banter.next({ status: 'racing', elapsed: 0 }), null);
  for (const elapsed of [10, 23, 36, 49, 62]) seen.add(banter.next({ status: 'racing', elapsed }).text);
 }
 assert.equal(seen.size, 25);
 for (const lines of Object.values(FRIEND_LINES)) assert.ok(lines.every(text => text.length <= 90));
 assert.equal(createNinaBanter(5).next({ status: 'racing', elapsed: 10 }).text, FRIEND_LINES.Miles[0]);
});
