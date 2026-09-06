import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,stepRace,fireWater,RIVAL_SOAK,frameAt,COURSE_LENGTH} from '../florida/core.js';

const tick=1/120;
function playing(){const race=createRace();Object.assign(race,{status:'racing',s:3700,heading:frameAt(3700).heading,objects:[],rivals:[]});return race}
function rival(s=3714,x=1.2,speed=34,pace=40){return{s,x,speed,pace,lane:0,heading:frameAt(s).heading,soaked:0,soakImmunity:0}}
function obstacle(s,type='floater'){return{id:`${type}-${s}`,s,x:1.2,type,radius:type==='taxi'?5:2.3,drift:0,scared:0}}
function advance(r,seconds){for(let i=0;i<Math.round(seconds/tick);i++)stepRace(r,{},tick)}
function fastShot(r){assert.equal(fireWater(r),true);const shot=r.shots.at(-1),scale=2500/Math.hypot(shot.vx,shot.vz);shot.vx*=scale;shot.vz*=scale}

test('an aimed water shot catches a moving rival and slows it without removing or teleporting it',()=>{
 const race=playing(),boat=rival();race.rivals=[boat];
 const healthy=structuredClone(race),startS=boat.s;
 assert.equal(fireWater(race),true);assert.equal(boat.soaked,0);
 for(let i=0;i<90&&!boat.soaked;i++){
  const before=boat.s;stepRace(race,{},tick);stepRace(healthy,{},tick);
  assert.ok(boat.s>=before&&boat.s-before<1,'the competing boat keeps moving continuously');
 }
 assert.ok(boat.s>startS);assert.ok(boat.soaked>0&&boat.soaked<=RIVAL_SOAK.duration);
 assert.ok(boat.soakImmunity>boat.soaked&&boat.soakImmunity<=RIVAL_SOAK.immunity);
 assert.ok(boat.speed<healthy.rivals[0].speed*.7,'the impact makes an immediate racing difference');
 assert.equal(race.rivals.length,1);assert.equal(race.rivals[0],boat);
 assert.equal(race.soaked,1);assert.ok(race.soakFlash>0);assert.equal(race.shots.length,0);
 const splash=race.events.find(e=>e.type==='splash'&&e.rival);
 assert.equal(splash?.hit,true);assert.ok(splash.text?.length>0);
});

test('water misses rivals outside the firing line or above their hull',()=>{
 for(const [x,y] of [[18,0],[1.2,8]]){
  const race=playing(),boat=rival(3714,x);race.rivals=[boat];race.y=y;
  fastShot(race);advance(race,.1);
  assert.equal(boat.soaked,0);assert.equal(boat.soakImmunity,0);assert.equal(race.soaked,0);
  assert.equal(race.events.some(e=>e.type==='splash'&&e.rival),false);
 }
});

test('a nearer swimmer or traffic boat blocks a shot from reaching a competing boat',()=>{
 for(const type of ['floater','taxi']){
  const race=playing(),boat=rival(3718,1.2,0,0),blocker=obstacle(3710,type);
  race.rivals=[boat];race.objects=[blocker];fastShot(race);stepRace(race,{},tick);
  assert.equal(race.shots.length,0);assert.equal(boat.soaked,0);assert.equal(boat.soakImmunity,0);
  assert.equal(race.soaked,type==='floater'?1:0);assert.equal(race.events.some(e=>e.rival),false);
  assert.equal(blocker.scared>0,type==='floater');
 }
});

test('the closest competing boat blocks farther rivals and course hazards in the same swept step',()=>{
 const race=playing(),near=rival(3710,1.2,0,0),far=rival(3718,1.2,0,0),floater=obstacle(3716);
 race.rivals=[far,near];race.objects=[floater];fastShot(race);stepRace(race,{},tick);
 assert.ok(near.soaked>0);assert.equal(far.soaked,0);assert.equal(floater.scared,0);
 assert.equal(race.soaked,1);assert.equal(race.shots.length,0);
 assert.equal(race.events.filter(e=>e.type==='splash'&&e.rival&&e.hit).length,1);
});

test('repeated hits during immunity splash without refreshing the penalty or stacking slowdown',()=>{
 const race=playing(),boat=rival();race.rivals=[boat];fastShot(race);stepRace(race,{},tick);
 assert.ok(boat.soaked>0);advance(race,.3);
 // Put the next real shot behind the moving boat; compare the same simulation
 // tick without that shot to distinguish immunity from ordinary acceleration.
 race.s=boat.s-12;race.x=boat.x-1.2;race.heading=frameAt(race.s).heading;
 const control=structuredClone(race),beforeSoaked=boat.soaked,beforeImmunity=boat.soakImmunity;
 const priorSplashes=race.events.filter(e=>e.type==='splash').length;
 fastShot(race);stepRace(race,{},tick);stepRace(control,{},tick);
 assert.equal(race.shots.length,0);assert.equal(race.soaked,1);
 assert.ok(boat.soaked<beforeSoaked);assert.ok(boat.soakImmunity<beforeImmunity);
 assert.ok(Math.abs(boat.speed-control.rivals[0].speed)<1e-10,'another impact cannot multiply the slowdown again');
 assert.equal(race.events.filter(e=>e.type==='splash').length,priorSplashes+1);
});

test('the recovery window prevents another penalty until immunity expires',()=>{
 const race=playing(),boat=rival();race.rivals=[boat];fastShot(race);stepRace(race,{},tick);
 advance(race,RIVAL_SOAK.duration+.1);
 assert.equal(boat.soaked,0);assert.ok(boat.soakImmunity>0);
 const shootBehind=()=>{race.s=boat.s-12;race.x=boat.x-1.2;race.heading=frameAt(race.s).heading;fastShot(race);stepRace(race,{},tick)};
 shootBehind();assert.equal(race.shots.length,0);assert.equal(boat.soaked,0);assert.equal(race.soaked,1);
 advance(race,RIVAL_SOAK.immunity-RIVAL_SOAK.duration+.1);assert.equal(boat.soakImmunity,0);
 shootBehind();assert.ok(boat.soaked>0);assert.equal(race.soaked,2);assert.equal(race.shots.length,0);
});

test('soaked rivals remain slower briefly, then resume normal racing pace',()=>{
 const race=playing(),boat=rival(3714,1.2,40,40);race.rivals=[boat];
 const healthy=structuredClone(race);fastShot(race);stepRace(race,{},tick);stepRace(healthy,{},tick);
 advance(race,1);advance(healthy,1);
 const penalizedSpeed=boat.speed;
 assert.ok(boat.soaked>0);assert.ok(penalizedSpeed<healthy.rivals[0].speed*.75);
 advance(race,4);advance(healthy,4);
 assert.equal(boat.soaked,0);assert.equal(boat.soakImmunity,0);
 assert.ok(boat.speed>penalizedSpeed+8);assert.ok(boat.speed>healthy.rivals[0].speed*.85);
 assert.equal(race.rivals.length,1);assert.equal(race.rivals[0],boat);
});

test('pause freezes rival penalties, and finish or a new race clears their transient state',()=>{
 const race=playing(),boat=rival();race.rivals=[boat];fastShot(race);stepRace(race,{},tick);
 assert.ok(boat.soaked>0);race.status='paused';const snapshot=JSON.stringify(race);
 advance(race,3);assert.equal(JSON.stringify(race),snapshot);
 const fresh=createRace();assert.equal(fresh.soaked,0);
 assert.ok(fresh.rivals.every(v=>v.soaked===0&&v.soakImmunity===0));
 race.status='racing';race.s=COURSE_LENGTH-.01;race.heading=frameAt(race.s).heading;race.speed=40;
 stepRace(race,{},tick);assert.equal(race.status,'finished');assert.equal(race.shots.length,0);
 assert.equal(boat.soaked,0);assert.equal(boat.soakImmunity,0);
});
