import test from 'node:test';
import assert from 'node:assert/strict';
import {createRace,stepRace,fireWater,pilotInput,DESTRUCTION,frameAt,pointAt,objectX,COURSE_LENGTH} from '../florida/core.js';

const tick=1/120,limits={floater:1,gator:2,rival:3,taxi:4,mooring:4,yacht:6};
function playing(s=3700){const r=createRace();Object.assign(r,{status:'racing',s,heading:frameAt(s).heading,objects:[],rivals:[]});return r}
function target(type,s=3718,x=1.2){return{id:`test-${type}`,type,s,x,radius:type==='gator'?2.8:2.3,halfLength:5,scale:1,yaw:0,drift:0,scared:0,departureAt:-500000,departureDuration:1000000,...(type==='rival'?{speed:0,pace:0,lane:0,heading:frameAt(s).heading,soaked:0,soakImmunity:0}:{})}}
function add(r,o){(o.type==='rival'?r.rivals:r.objects).push(o);return o}
function launch(r,count=1){for(let i=0;i<count;i++){r.fireCooldown=0;assert.equal(fireWater(r),true);const shot=r.shots.at(-1),scale=5000/Math.hypot(shot.vx,shot.vz);shot.vx*=scale;shot.vz*=scale}}
function shoot(r,o,count=1){r.s=o.s-18;r.x=(o.type==='rival'?o.x:objectX(o,r.elapsed+tick))-1.2;r.heading=frameAt(r.s).heading;r.speed=0;launch(r,count);stepRace(r,{},tick)}
function advance(r,seconds){for(let i=0;i<Math.round(seconds/tick);i++)stepRace(r,{},tick)}

test('new races give every destructible target its intended durability and stable identity',()=>{
 assert.equal(Object.isFrozen(DESTRUCTION),true);assert.deepEqual(DESTRUCTION,limits);
 const r=createRace();assert.equal(r.destroyed,0);assert.equal(r.destructionFlash,0);
 assert.deepEqual(r.rivals.map(v=>v.id),['rival-0','rival-1','rival-2']);
 for(const o of [...r.objects,...r.rivals]){
  const durability=o.pace!==undefined?limits.rival:limits[o.type];if(!durability)continue;
  assert.equal(o.hp,durability,o.id);assert.equal(o.maxHp,durability,o.id);assert.equal(o.damageFlash,0);assert.equal(o.destroyed,false);
 }
});

test('each target needs its specified number of direct hits, including while already scared or soaked',()=>{
 for(const [type,hp]of Object.entries(limits)){
  const r=playing(),o=add(r,target(type));let center;
  for(let hit=1;hit<=hp;hit++){
   center=pointAt(o.s,type==='rival'?o.x:objectX(o,r.elapsed+tick));shoot(r,o);
   assert.equal(o.maxHp,hp,type);assert.equal(o.hp,hp-hit,`${type}, hit ${hit}`);
   assert.equal(o.destroyed,hit===hp,type);assert.equal(r.destroyed,hit===hp?1:0,type);
   if(hit<hp)assert.ok(o.damageFlash>0,type);
  }
  const events=r.events.filter(e=>e.type==='destroy');assert.equal(events.length,1,type);
  const event=events[0];assert.equal(event.targetId,o.id);assert.equal(event.targetType,type);
  assert.ok(Number.isFinite(event.x)&&Number.isFinite(event.y)&&Number.isFinite(event.z));
  assert.ok(Math.hypot(event.x-center.x,event.z-center.z)<.2,'debris originates at the target centre');
  assert.ok(r.destructionFlash>0);assert.equal(type==='rival'?r.rivals[0]:r.objects[0],o,'keep the record for stable rendering identity');
  if(type!=='rival')assert.equal(objectX(o,r.elapsed+10),objectX(o,r.elapsed),'destroyed traffic stays at its destruction position');
 }
});

test('a hull blocks each shot until it is destroyed, then a later shot can reach the target behind it',()=>{
 const r=playing(),hull=target('mooring',3714),behind=target('floater',3727);r.objects=[behind,hull];
 for(let hit=1;hit<=limits.mooring;hit++){
  r.s=3700;r.x=0;r.heading=frameAt(r.s).heading;r.speed=0;launch(r);stepRace(r,{},tick);
  assert.equal(hull.hp,limits.mooring-hit);assert.equal(behind.destroyed??false,false);assert.equal(behind.hp??1,1);
  assert.equal(r.shots.length,0,'even the lethal shot is consumed by the front hull');
 }
 launch(r);stepRace(r,{},tick);assert.equal(behind.destroyed,true);assert.equal(r.destroyed,2);assert.equal(r.objects.length,2);
});

test('simultaneous projectiles destroy each target once and never award duplicate destruction',()=>{
 const r=playing(),hull={...target('mooring',3714),hp:1,maxHp:4,damageFlash:0,destroyed:false},behind=target('floater',3727);r.objects=[behind,hull];
 launch(r,3);stepRace(r,{},tick);
 assert.equal(hull.hp,0);assert.equal(behind.hp,0);assert.equal(r.destroyed,2);
 for(const id of [hull.id,behind.id])assert.equal(r.events.filter(e=>e.type==='destroy'&&e.targetId===id).length,1);
 const count=r.events.filter(e=>e.type==='destroy').length;launch(r,3);advance(r,.2);
 assert.equal(r.destroyed,2);assert.equal(r.events.filter(e=>e.type==='destroy').length,count);
});

test('destroyed swimmers, gators, boats and rivals leave no invisible collision or near-miss reward',()=>{
 for(const [type,hp]of Object.entries(limits)){
  const r=playing(),o=add(r,target(type));for(let i=0;i<hp;i++)shoot(r,o);
  assert.equal(o.destroyed,true,type);r.s=o.s-.01;r.x=type==='rival'?o.x:objectX(o,r.elapsed+tick);r.heading=frameAt(r.s).heading;r.speed=40;r.immunity=0;r.events=[];
  const s=r.s;stepRace(r,{},tick);assert.equal(r.hits,0,type);assert.ok(r.s>s,type);assert.ok(r.speed>35,type);
  assert.equal(r.events.some(e=>['hit','glance','bounce','near'].includes(e.type)),false,type);assert.equal(r.nearMisses,0,type);
 }
});

test('destroyed rivals stop progressing and no longer influence place, drafting or player contact',()=>{
 const r=playing(),dead={...target('rival',3718,0),hp:0,maxHp:3,destroyed:true,speed:0},live={...target('rival',3690,15),id:'live-rival',speed:30,pace:40};r.rivals=[dead,live];
 const pose=[dead.s,dead.x,dead.heading];stepRace(r,{},tick);
 assert.equal(r.rank,1);assert.equal(r.drafting,false);assert.deepEqual([dead.s,dead.x,dead.heading],pose);assert.equal(dead.speed,0);assert.ok(live.s>3690);
 r.s=dead.s;r.x=dead.x;r.heading=frameAt(r.s).heading;r.immunity=0;stepRace(r,{},tick);assert.equal(r.hits,0);
});

test('a destroyed departing yacht no longer diverts the player pilot or competing traffic',()=>{
 const r=createRace(),yacht=r.objects.find(o=>o.type==='yacht');Object.assign(r,{status:'racing',elapsed:24,s:yacht.s-100,speed:38,heading:frameAt(yacht.s-100).heading});
 r.objects=[{...yacht,hp:0,destroyed:true}];r.rivals=[{...target('rival',r.s+10,0),pace:40,speed:38}];
 const clear=structuredClone(r);clear.objects=[];assert.deepEqual(pilotInput(r),pilotInput(clear));
 advance(r,.5);advance(clear,.5);assert.deepEqual(r.rivals,clear.rivals);
});

test('shots leave coffee, shields and ramps intact while reaching a destructible target behind them',()=>{
 const r=playing(),behind=target('floater',3727);r.objects=['coffee','flamingo','sunscreen','ramp'].map((type,i)=>({id:type,type,s:3707+i*2,x:1.2,radius:4,scared:0,consumed:false,passed:false}));r.objects.push(behind);
 launch(r);stepRace(r,{},tick);assert.equal(behind.destroyed,true);assert.equal(r.destroyed,1);assert.equal(r.pickups,0);
 for(const o of r.objects.slice(0,-1)){assert.equal(o.consumed,false);assert.equal(o.passed,false);assert.equal(o.destroyed,undefined)}
});

test('pause freezes destruction and damage timers, while restart restores full health and a clean score',()=>{
 const r=playing(),boat=add(r,target('rival'));shoot(r,boat);const swimmer=add(r,target('floater',3730,15));shoot(r,swimmer);
 assert.equal(r.destroyed,1);assert.ok(boat.hp<boat.maxHp);r.status='paused';const before=JSON.stringify(r);advance(r,3);assert.equal(JSON.stringify(r),before);
 assert.equal(fireWater(r),false);const fresh=createRace();assert.equal(fresh.destroyed,0);assert.equal(fresh.destructionFlash,0);
 for(const o of [...fresh.objects,...fresh.rivals])if(o.maxHp){assert.equal(o.hp,o.maxHp);assert.equal(o.destroyed,false);assert.equal(o.damageFlash,0)}
});

test('finishing clears transient damage effects but preserves destroyed records, hull health and score',()=>{
 const r=playing(),boat=add(r,target('rival')),gator=add(r,target('gator',3735,17)),swimmer=add(r,target('floater',3730,-17));
 shoot(r,boat);shoot(r,gator);shoot(r,swimmer);assert.equal(r.destroyed,1);
 r.s=COURSE_LENGTH-.01;r.x=0;r.heading=frameAt(r.s).heading;r.speed=40;stepRace(r,{},tick);
 assert.equal(r.status,'finished');assert.equal(r.destructionFlash,0);assert.equal(r.shots.length,0);assert.equal(r.destroyed,1);
 assert.equal(boat.hp,2);assert.equal(gator.hp,1);assert.equal(swimmer.hp,0);assert.equal(swimmer.destroyed,true);
 for(const o of [boat,gator,swimmer])assert.equal(o.damageFlash,0);
 assert.equal(gator.scared,0);assert.equal(boat.soaked,0);assert.equal(boat.soakImmunity,0);
});
