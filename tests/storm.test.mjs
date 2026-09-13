import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {COURSE_LENGTH} from '../florida/course.js';
import {makeStorm,stormStrength} from '../florida/storm.js';

function fixture(reducedMotion=false){
  const scene=new T.Scene();scene.fog=new T.Fog(0xb9d0dc,650,2350);scene.environmentIntensity=.3;
  const sunshine=new T.DirectionalLight(0xffecd1,5.2),ambient=new T.HemisphereLight(0xd7e8ff,0x555844,.42);
  const camera=new T.PerspectiveCamera();camera.position.set(25,6,-900);
  const storm=makeStorm(scene,{sunshine,ambient,reducedMotion}),rain=scene.getObjectByName('Mangrove squall rain');
  return {scene,sunshine,ambient,camera,storm,rain};
}
test('squall is bounded to mangroves with continuous ramps and clear race endpoints',()=>{
  for(const p of [0,.2,.43,.64,.8,1])assert.equal(stormStrength(p*COURSE_LENGTH),0);
  assert.equal(stormStrength(.53*COURSE_LENGTH),1);
  let previous=0;
  for(let p=.435;p<.48;p+=.0001){const next=stormStrength(p*COURSE_LENGTH);assert.ok(next>=previous&&next-previous<.004);previous=next}
  previous=1;
  for(let p=.585;p<.64;p+=.0001){const next=stormStrength(p*COURSE_LENGTH);assert.ok(next<=previous&&previous-next<.004);previous=next}
});
test('paused rain holds time and anchor; restart and staged scene restore exact sunshine',()=>{
  const {scene,sunshine,ambient,camera,storm,rain}=fixture(),fog=scene.fog.color.clone();
  assert.match(storm.update(.53*COURSE_LENGTH,.016,camera),/Classic Florida/);
  assert.equal(storm.update(.53*COURSE_LENGTH,.016,camera),undefined);
  assert.equal(storm.strength,1);assert.equal(rain.visible,true);assert.ok(sunshine.intensity<2);
  const clock=rain.material.uniforms.time.value,anchor=rain.material.uniforms.anchor.value.clone();camera.position.x+=5;
  storm.update(.53*COURSE_LENGTH,5,camera,true,true);
  assert.equal(rain.material.uniforms.time.value,clock);assert.ok(rain.material.uniforms.anchor.value.equals(anchor));
  storm.update(.53*COURSE_LENGTH,.016,camera,false);
  assert.equal(storm.strength,0);assert.equal(rain.visible,false);assert.ok(scene.fog.color.equals(fog));assert.equal(sunshine.intensity,5.2);assert.equal(ambient.intensity,.42);
  storm.update(.53*COURSE_LENGTH,.016,camera);storm.reset();
  assert.equal(rain.material.uniforms.time.value,0);assert.equal(storm.strength,0);assert.equal(scene.fog.near,650);assert.equal(scene.fog.far,2350);
  assert.match(storm.update(.53*COURSE_LENGTH,.016,camera),/Classic Florida/);
});
test('rain has a fixed GPU buffer, scales by quality, and stays out of reflection/AO/shadows',()=>{
  const {camera,storm,rain}=fixture();
  storm.setQuality('detailed');assert.equal(rain.geometry.drawRange.count,2400);
  storm.setQuality('smooth');assert.equal(rain.geometry.drawRange.count,1200);
  assert.equal(rain.layers.test(new T.Camera().layers),false);assert.equal(rain.castShadow,false);assert.equal(rain.material.depthWrite,false);
  const positions=rain.geometry.attributes.position,version=positions.version;
  storm.update(.53*COURSE_LENGTH,.016,camera);storm.setAO(true);assert.equal(rain.visible,false);storm.setAO(false);assert.equal(rain.visible,true);
  for(let i=0;i<300;i++)storm.update(.53*COURSE_LENGTH,.016,camera);
  assert.equal(positions.version,version);assert.equal(rain.geometry.attributes.position,positions);
  storm.update(COURSE_LENGTH,.016,camera);storm.setAO(true);storm.setAO(false);assert.equal(rain.visible,false);
  const reduced=fixture(true);reduced.storm.setQuality('detailed');assert.equal(reduced.rain.geometry.drawRange.count,720);
});
