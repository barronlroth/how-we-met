import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene, PerspectiveCamera, Matrix4, Vector3} from 'three';
import {makeTargetHealth} from '../florida/target-health.js';

test('health markers show only damaged live targets, empty on finish, and reuse a bounded pair of meshes', () => {
  const scene = new Scene(), camera = new PerspectiveCamera(), health = makeTargetHealth(scene);
  const target = {type:'mooring',s:100,x:5,hp:2,maxHp:4,damageFlash:0};
  const race = {status:'racing',s:80,elapsed:0,objects:[target,{...target,hp:4},{...target,destroyed:true},{...target,s:400}],rivals:[]};
  health.update(race,camera);
  const [back,fill] = scene.children;
  assert.equal(back.count,1); assert.equal(fill.count,1);
  const matrix = new Matrix4(); fill.getMatrixAt(0,matrix);
  assert.ok(Math.abs(new Vector3().setFromMatrixScale(matrix).x-3.2)<1e-6);
  target.destroyed=true; health.update(race,camera); assert.equal(fill.count,0);
  race.objects=Array.from({length:80},()=>({...target,destroyed:false}));
  health.update(race,camera); assert.equal(fill.count,32); assert.equal(scene.children.length,2);
  race.status='finished'; health.update(race,camera); assert.equal(fill.count,0); assert.equal(back.count,0);
});
