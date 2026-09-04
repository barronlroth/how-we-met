import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, hit, horn, objectX, halfWidth, COURSE_LENGTH, CHECKPOINTS, loadBest, saveBest, medal } from '../florida/core.js';

function playing(){const r=createRace();r.status='racing';return r}
function advance(r,seconds,input={}){for(let i=0;i<seconds*120;i++)stepRace(r,input,1/120)}
function isolated(){const r=playing();r.objects=[];return r}

test('a normal uninterrupted race reaches the finish with all checkpoints and a medal',()=>{
  const r=playing();advance(r,260);
  assert.equal(r.status,'finished');assert.equal(r.s,COURSE_LENGTH);assert.equal(r.checkpoint,CHECKPOINTS.length);
  assert.ok(r.elapsed>140&&r.elapsed<220);assert.equal(r.endMedal,'SILVER');
  const elapsed=r.elapsed;advance(r,20);assert.equal(r.elapsed,elapsed);
});
test('gold requires active driving and is attainable by steering toward coffee and around hazards',()=>{
  const boostOnly=playing();advance(boostOnly,260,{boost:true});assert.notEqual(boostOnly.endMedal,'GOLD');
  const r=playing();
  for(let i=0;i<260*120&&r.status==='racing';i++){
    const coffee=r.objects.find(o=>o.type==='coffee'&&!o.consumed&&o.s>r.s+2&&o.s<r.s+170);
    let target=coffee?.x??0;
    const hazard=r.objects.find(o=>['gator','floater'].includes(o.type)&&!o.passed&&o.s>r.s&&o.s<r.s+36&&Math.abs(objectX(o,r.elapsed)-r.x)<6);
    if(hazard)target=objectX(hazard,r.elapsed)+(r.x>objectX(hazard,r.elapsed)?8:-8);
    stepRace(r,{boost:true,steer:Math.max(-1,Math.min(1,(target-r.x)*.5-r.vx*.16))},1/120);
  }
  assert.equal(r.status,'finished');assert.equal(r.endMedal,'GOLD');assert.ok(r.pickups>10);
});
test('steering and braking change the drive, while banks contain the boat',()=>{
  const r=isolated();advance(r,3,{steer:1});assert.ok(r.x>20);
  advance(r,3,{steer:-1});assert.ok(r.x<5);
  const before=r.speed;advance(r,2,{brake:true});assert.ok(r.speed<before*.65);
  advance(r,20,{steer:1});assert.ok(r.x<=halfWidth(r.s)-3.19);
});
test('Cafecito is collected once, fuels acceleration, and runs out',()=>{
  const r=isolated();r.s=94;r.speed=20;r.boost=0;r.objects=[{id:'coffee',type:'coffee',x:0,s:95,radius:3.8}];
  advance(r,.1);assert.equal(r.pickups,1);assert.equal(r.boost,.52);assert.equal(r.objects[0].consumed,true);
  advance(r,2,{boost:true});assert.ok(r.speed>30);advance(r,5,{boost:true});assert.equal(r.boost,0);assert.equal(r.pickups,1);
});
test('Flamingo absorbs exactly one hit and a fresh unprotected hit slows the boat',()=>{
  const r=isolated();r.speed=22;r.flamingo=true;hit(r);assert.equal(r.flamingo,false);assert.equal(r.speed,22);assert.equal(r.hits,0);
  advance(r,2);r.speed=22;hit(r);assert.equal(r.hits,1);assert.ok(r.speed<12);
});
test('SPF protects for its duration without consuming the flamingo',()=>{
  const r=isolated();r.speed=22;r.sunscreen=8;r.flamingo=true;hit(r);
  assert.equal(r.hits,0);assert.equal(r.speed,22);assert.equal(r.flamingo,true);
  advance(r,9);assert.equal(r.sunscreen,0);r.immunity=0;hit(r);assert.equal(r.flamingo,false);
});
test('horn scatters hazards ahead and enforces its cooldown',()=>{
  const r=isolated();r.objects=[{id:'gator',type:'gator',s:30,x:0,drift:0,scared:0}];
  assert.equal(horn(r),true);assert.equal(r.objects[0].scared,4);assert.equal(horn(r),false);
  advance(r,5);assert.equal(horn(r),true);
});
test('ramps launch and land once, and airborne boats clear hazards',()=>{
  const r=isolated();r.s=390;r.speed=22;r.objects=[{id:'ramp',type:'ramp',s:390,x:0,radius:4.7}];
  advance(r,.1);assert.equal(r.jumps,1);assert.ok(r.y>0);
  r.y=2;r.vy=1;hit(r);assert.equal(r.hits,0);
  advance(r,2);assert.equal(r.y,0);assert.equal(r.jumps,1);assert.ok(r.events.some(e=>e.type==='land'));
});
test('pause freezes every gameplay timer and reset clears all progress',()=>{
  const r=playing();advance(r,4);r.status='paused';r.sunscreen=8;const snapshot=JSON.stringify(r);advance(r,4,{steer:1,boost:true});assert.equal(JSON.stringify(r),snapshot);
  const fresh=createRace();assert.equal(fresh.s,0);assert.equal(fresh.elapsed,0);assert.equal(fresh.hits,0);assert.equal(fresh.flamingo,false);assert.ok(fresh.objects.every(o=>!o.consumed&&!o.passed));
});
test('stored best times reject corrupt data, retain the faster run, and tolerate blocked storage',()=>{
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(loadBest(storage),null);saveBest(storage,172);saveBest(storage,190);assert.equal(loadBest(storage),172);saveBest(storage,155);assert.equal(loadBest(storage),155);
  storage.setItem('howwemet_florida_best_v1','garbage');assert.equal(loadBest(storage),null);
  const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};assert.equal(loadBest(blocked),null);assert.equal(saveBest(blocked,170),170);
  assert.equal(medal(145),'GOLD');assert.equal(medal(175),'SILVER');assert.equal(medal(176),'BRONZE');
});
