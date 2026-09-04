export const COURSE_LENGTH = 3600;
export const CHECKPOINTS = [700, 1400, 2200, 2900];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const center = s => Math.sin(s / 330) * 35 + Math.sin(s / 710) * 48;
export const tangent = s => Math.cos(s / 330) * 35 / 330 + Math.cos(s / 710) * 48 / 710;
export const halfWidth = s => 35 + 8 * (0.5 + 0.5 * Math.sin(s / 520)) + (s > 2950 ? (s - 2950) / 90 : 0);
export const sector = s => s < 1050 ? 'THE ISLES' : s < 2550 ? 'THE INTRACOASTAL' : 'THE BRIDGE RUN';
export const MEDAL_TIMES = Object.freeze({ gold: 145, silver: 175 });
export const medal = time => time <= MEDAL_TIMES.gold ? 'GOLD' : time <= MEDAL_TIMES.silver ? 'SILVER' : 'BRONZE';
export const formatTime = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;

export function courseObjects() {
  const objects = [];
  let seed = 271828;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let s = 175, i = 0; s < 3490; s += 90 + rand() * 45, i++) {
    const x = (rand() - 0.5) * 51;
    objects.push({ id: `hazard-${i}`, type: i % 3 === 0 ? 'gator' : 'floater', s, x, drift: rand() * 6.28, radius: i % 3 === 0 ? 2.6 : 2.4 });
    if (i > 4 && i % 4 === 0) objects.push({ id: `extra-${i}`, type: 'floater', s: s + 16, x: -x * 0.7, drift: rand() * 6.28, radius: 2.5 });
  }
  for (let s = 95, i = 0; s < 3520; s += 145, i++) {
    const type = i % 5 === 1 ? 'flamingo' : i % 5 === 3 ? 'sunscreen' : 'coffee';
    objects.push({ id: `pickup-${i}`, type, s, x: [0, 11, -12, 6, -6, 16][i % 6], radius: 3.8 });
  }
  for (let s = 390, i = 0; s < 3300; s += 425, i++) objects.push({ id: `ramp-${i}`, type: 'ramp', s, x: [-15, 13, -8, 17, 0, -16, 10][i], radius: 4.7 });
  for (const [i, s] of [980, 1820, 2690].entries()) objects.push({ id: `wake-${i}`, type: 'wake', s, x: [-5, 8, -3][i], radius: 13 });
  return objects.sort((a, b) => a.s - b.s);
}

export function createRace() {
  return { status: 'ready', s: 0, x: 0, vx: 0, speed: 0, elapsed: 0, y: 0, vy: 0, boost: 0.4, boosting: false, flamingo: false, sunscreen: 0, immunity: 0, hornCooldown: 0, hornFlash: 0, checkpoint: 0, hits: 0, jumps: 0, nearMisses: 0, pickups: 0, events: [], objects: courseObjects().map(o => ({ ...o, consumed: false, passed: false, scared: 0 })), lastCallout: -10, endMedal: null };
}

export function objectX(object, time) {
  if (!['gator', 'floater'].includes(object.type)) return object.x;
  return object.x + Math.sin(time * (object.type === 'gator' ? 0.7 : 0.3) + object.drift) * (object.type === 'gator' ? 5 : 2.8);
}

export function hit(race, side = 1) {
  if (race.immunity > 0 || race.y > 1.5) return;
  race.immunity = 1.3;
  if (race.sunscreen > 0) {
    race.events.push({ type: 'glance', text: 'SPF 1000. Untouchable.' });
    race.vx += side * 4;
  } else if (race.flamingo) {
    race.flamingo = false;
    race.events.push({ type: 'bounce', text: 'Worth every imaginary dollar.' });
    race.vy = 3.5;
    race.y = 0.1;
  } else {
    race.hits++;
    race.speed *= 0.48;
    race.vx = side * 7;
    race.events.push({ type: 'hit', text: ['That is absolutely a Florida man.', 'Eyes on the water, babe.', 'We meant to do that.'][race.hits % 3] });
  }
}

export function horn(race) {
  if (race.status !== 'racing' || race.hornCooldown > 0) return false;
  race.hornCooldown = 4.5;
  race.hornFlash = 1.1;
  let count = 0;
  for (const o of race.objects) {
    if (['gator', 'floater'].includes(o.type) && o.s > race.s - 5 && o.s < race.s + 80 && Math.abs(objectX(o, race.elapsed) - race.x) < 19) { o.scared = 4; count++; }
  }
  race.events.push({ type: 'horn', text: count ? 'Coming through, gentlemen!' : 'Subtle. Very subtle.' });
  return true;
}

export function stepRace(race, input, dt) {
  if (race.status !== 'racing') return;
  dt = clamp(dt, 0, 1 / 30);
  race.elapsed += dt;
  for (const field of ['sunscreen', 'immunity', 'hornCooldown', 'hornFlash']) race[field] = Math.max(0, race[field] - dt);
  race.boosting = !!input.boost && race.boost > 0.005 && !input.brake;
  if (race.boosting) { race.boost = Math.max(0, race.boost - dt * 0.16); if (race.boost < 0.005) race.boost = 0; }
  const targetSpeed = input.brake ? 9 : race.boosting ? 34 : 22.8;
  race.speed += (targetSpeed - race.speed) * (1 - Math.exp(-dt * (input.brake ? 3 : 1.25)));
  race.vx += ((input.steer || 0) * (race.boosting ? 19 : 16) - race.vx) * (1 - Math.exp(-dt * (race.sunscreen ? 3.5 : 5.5)));
  race.x += race.vx * dt;
  const previousS = race.s;
  race.s = Math.min(COURSE_LENGTH, race.s + race.speed * dt);
  if (race.y > 0 || race.vy > 0) {
    race.vy -= 17 * dt;
    race.y += race.vy * dt;
    if (race.y <= 0) { race.y = 0; race.vy = 0; race.events.push({ type: 'land' }); }
  }
  const edge = halfWidth(race.s) - 3.2;
  if (Math.abs(race.x) > edge) {
    const side = -Math.sign(race.x);
    race.x = clamp(race.x, -edge, edge);
    hit(race, side);
    race.vx = side * Math.abs(race.vx) * 0.3;
  }
  for (const o of race.objects) {
    o.scared = Math.max(0, o.scared - dt);
    if (o.consumed || o.passed || o.s > race.s + 100 || o.s < previousS - 15) continue;
    const dx = Math.abs(objectX(o, race.elapsed) - race.x);
    const dz = o.s - race.s;
    const inRange = dz < 3.4 && dz > -4;
    if (['coffee', 'flamingo', 'sunscreen'].includes(o.type) && inRange && dx < o.radius + 1 && race.y < 5) {
      o.consumed = true; race.pickups++;
      if (o.type === 'coffee') { race.boost = Math.min(1, race.boost + 0.52); race.events.push({ type: 'coffee', text: 'Cafecito! Hold Shift and send it.' }); }
      if (o.type === 'flamingo') { race.flamingo = true; race.events.push({ type: 'flamingo', text: 'A little emotional support flamingo.' }); }
      if (o.type === 'sunscreen') { race.sunscreen = 8; race.events.push({ type: 'sunscreen', text: 'SPF one thousand. Slip right past them.' }); }
    } else if (['ramp', 'wake'].includes(o.type) && inRange && dx < o.radius && race.y < 0.25 && race.speed > 12) {
      o.passed = true; race.vy = o.type === 'wake' ? 4.3 : race.boosting ? 11.2 : 8.8; race.y = 0.2; race.jumps++;
      race.events.push({ type: 'jump', text: ['We are absolutely flying!', 'Again. Do that again.', 'Okay, that was cute.'][race.jumps % 3] });
    } else if (['gator', 'floater'].includes(o.type) && !o.scared) {
      if (inRange && dx < o.radius + 1.3 && race.y < 1.6) { hit(race, Math.sign(race.x - objectX(o, race.elapsed)) || 1); o.passed = true; }
      else if (dz < -4 && !o.passed) {
        o.passed = true;
        if (dx < o.radius + 4 && race.y < 1.5) { race.nearMisses++; race.boost = Math.min(1, race.boost + 0.09); race.events.push({ type: 'near', text: 'Close shave. More cafecito.' }); }
      }
    }
  }
  if (race.checkpoint < CHECKPOINTS.length && race.s >= CHECKPOINTS[race.checkpoint]) {
    race.checkpoint++; race.events.push({ type: 'checkpoint', text: `${race.checkpoint}/${CHECKPOINTS.length} CHECKPOINTS` });
  }
  if (race.s >= COURSE_LENGTH) { race.status = 'finished'; race.endMedal = medal(race.elapsed); race.events.push({ type: 'finish', text: 'Table for two. You made it.' }); }
}

export function loadBest(storage) {
  try { const n = Number(storage.getItem('howwemet_florida_best_v1')); return Number.isFinite(n) && n > 0 ? n : null; } catch { return null; }
}
export function saveBest(storage, seconds) {
  const best = loadBest(storage);
  if (!Number.isFinite(seconds) || seconds <= 0) return best;
  const next = best === null ? seconds : Math.min(best, seconds);
  try { storage.setItem('howwemet_florida_best_v1', String(next)); } catch { /* Race stays playable when storage is unavailable. */ }
  return next;
}
