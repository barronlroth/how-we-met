import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {makeWaterCannon} from '../florida/effects.js';
import {createRace,stepRace,fireWater,WATER_SHOT,frameAt,pointAt,objectX,COURSE_LENGTH} from '../florida/core.js';

function playing(s=3700){const race=createRace();Object.assign(race,{status:'racing',s,heading:frameAt(s).heading,objects:[],rivals:[]});return race}
function advance(r,seconds,input={}){for(let i=0;i<Math.round(seconds*120);i++)stepRace(r,input,1/120)}
function hazard(s,x=1.2,type='floater'){return{id:`${type}-${s}-${x}`,type,s,x,drift:0,radius:type==='gator'?2.8:2.3,scared:0}}

test('water shots visibly travel before impact and only soak an aimed hazard',()=>{
 const r=playing();r.objects=[hazard(3725),hazard(3725,15),hazard(3780)];
 assert.equal(fireWater(r),true);assert.equal(r.shots.length,1);
 assert.deepEqual(r.objects.map(o=>o.scared),[0,0,0]);
 advance(r,.35);assert.ok(r.objects[0].scared>3);assert.equal(r.objects[1].scared,0);assert.equal(r.objects[2].scared,0);
 assert.equal(r.soaked,1);assert.equal(r.shots.length,0);assert.ok(r.events.some(e=>e.type==='splash'&&e.hit));
 assert.equal(r.objects[0].consumed,undefined); // Tubes remain in the race.
});
test('a shot keeps its world trajectory after steering and later shots use the new heading',()=>{
 const r=playing(),heading=r.heading;fireWater(r);const first=r.shots[0],vx=first.vx,vz=first.vz,x=first.x,z=first.z;
 advance(r,.3,{steer:.7});assert.ok(r.heading>heading);
 assert.equal(first.vx,vx);assert.equal(first.vz,vz);assert.ok(Math.abs((first.x-x)*vz-(first.z-z)*vx)<1e-7);
 assert.equal(fireWater(r),true);const next=r.shots.at(-1);assert.notEqual(next.vx,vx);assert.ok(Math.abs(Math.atan2(next.vx,-next.vz)-r.heading)<1e-8);
});
test('holding fire repeats at the short cooldown, stays bounded, and release stops emissions',()=>{
 const r=playing();advance(r,2,{fire:true});assert.ok(r.nextShotId>=8&&r.nextShotId<=9);assert.ok(r.shots.length<=Math.ceil(WATER_SHOT.lifetime/WATER_SHOT.cooldown));
 assert.equal(fireWater(r),false);const count=r.nextShotId;advance(r,2);assert.equal(r.nextShotId,count);assert.equal(r.shots.length,0);assert.equal(r.fireCooldown,0);
});
test('swept collision catches a fast shot between ticks and chooses the first target regardless of array order',()=>{
 const r=playing(),near=hazard(3710,1.2),far=hazard(3716,1.2);r.objects=[far,near];fireWater(r);
 const shot=r.shots[0],speed=Math.hypot(shot.vx,shot.vz);shot.vx*=2500/speed;shot.vz*=2500/speed;
 stepRace(r,{},1/120);assert.ok(near.scared>0);assert.equal(far.scared,0);assert.equal(r.soaked,1);assert.equal(r.shots.length,0);
});
test('boats block shots without being removed and water does not collect power-ups',()=>{
 const r=playing(),boat={...hazard(3715,1.2,'taxi'),drift:0},behind=hazard(3727,1.2),coffee={...hazard(3710,1.2,'coffee'),radius:4};r.objects=[behind,boat,coffee];
 fireWater(r);advance(r,.2);assert.equal(r.soaked,0);assert.equal(behind.scared,0);assert.equal(boat.scared,0);assert.equal(r.pickups,0);assert.equal(r.shots.length,0);
 assert.ok(r.events.some(e=>e.type==='splash'&&!e.hit));
});
test('gators duck and tube knockback returns smoothly after a short recovery',()=>{
 const r=playing(),gator=hazard(3725,1.2,'gator');r.objects=[gator];fireWater(r);advance(r,.3);assert.ok(gator.scared>3);assert.equal(r.soaked,1);
 const floater=hazard(3725,0);floater.scared=2;floater.scaredSide=-1;assert.ok(objectX(floater,0)<-11);
 floater.scared=.0001;const returning=objectX(floater,0);floater.scared=0;assert.ok(Math.abs(returning-objectX(floater,0))<.002);
 advance(r,4);assert.equal(gator.scared,0);assert.equal(gator.consumed,undefined);
});
test('shots splash at the canal bank instead of flying through houses',()=>{
 const r=playing();r.heading+=Math.PI/2;fireWater(r);advance(r,.5);assert.equal(r.shots.length,0);assert.ok(r.events.some(e=>e.type==='splash'));assert.equal(r.soaked,0);
});
test('pause freezes shots and cooldown; restart and finish clear projectile state',()=>{
 const r=playing();fireWater(r);advance(r,.05);r.status='paused';const before=JSON.stringify(r);advance(r,1,{fire:true});assert.equal(JSON.stringify(r),before);assert.equal(fireWater(r),false);
 const fresh=createRace();assert.deepEqual(fresh.shots,[]);assert.equal(fresh.nextShotId,0);assert.equal(fresh.fireCooldown,0);assert.equal(fireWater(fresh),false);
 const finish=playing(COURSE_LENGTH-.01);finish.speed=40;fireWater(finish);stepRace(finish,{},1/120);assert.equal(finish.status,'finished');assert.deepEqual(finish.shots,[]);assert.equal(fireWater(finish),false);
});

test('cannon muzzle and projectile launch agree with the GLB negative-Z forward convention at every heading',()=>{
 for(const heading of [-2.8,-1.2,0,.75,2.4]){
  const r=playing();r.heading=heading;r.y=2.5;fireWater(r);
  const p=pointAt(r.s,r.x),boat=new Group();boat.position.set(p.x,r.y,p.z);boat.rotation.y=-heading;
  const cannon=makeWaterCannon(boat),muzzle=cannon.muzzle.getWorldPosition(new Vector3()),shot=r.shots[0];
  assert.ok(muzzle.distanceTo(new Vector3(shot.x,shot.y,shot.z))<1e-9);
  const forward=new Vector3(0,0,-1).applyQuaternion(boat.quaternion),velocity=new Vector3(shot.vx,0,shot.vz).normalize();
  assert.ok(forward.distanceTo(velocity)<1e-9);
 }
});
