import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Matrix4, Vector3, Quaternion } from 'three';
import { makeDestructionEffects, DEBRIS_CAPACITY } from '../florida/destruction-effects.js';

const event = { type: 'destroy', targetType: 'rival', x: 12, y: .5, z: -20, heading: .3, radius: 2, halfLength: 4 };
const meshes = scene => scene.getObjectByName('CartoonDestruction').children;

test('held fire recycles fixed debris buffers and expires all chunks without scene growth', () => {
  const scene = new Scene(), effects = makeDestructionEffects(scene), original = [...meshes(scene)];
  const buffers = original.map(mesh => [mesh.geometry, mesh.material, mesh.instanceMatrix.array, mesh.instanceColor.array]);
  for (let i = 0; i < 1200; i++) {
    effects.event({ ...event, targetType: i % 3 ? 'rival' : 'floater' });
    effects.update(1 / 120);
  }
  assert.equal(scene.children.length, 1);
  assert.equal(meshes(scene).length, 3);
  for (let i = 0; i < original.length; i++) {
    const mesh = meshes(scene)[i];
    assert.equal(mesh, original[i]);
    [mesh.geometry, mesh.material, mesh.instanceMatrix.array, mesh.instanceColor.array]
      .forEach((value, index) => assert.equal(value, buffers[i][index]));
    assert.ok(mesh.count <= Object.values(DEBRIS_CAPACITY)[i]);
    assert.ok(mesh.instanceMatrix.array.every(Number.isFinite));
    assert.equal(mesh.castShadow, false);
  }
  for (let i = 0; i < 180; i++) effects.update(1 / 60);
  assert.ok(meshes(scene).every(mesh => mesh.count === 0));
});

test('pause preserves debris poses and reset immediately clears every instance', () => {
  const scene = new Scene(), effects = makeDestructionEffects(scene);
  effects.event(event); effects.update(1 / 60);
  const matrices = meshes(scene).map(mesh => mesh.instanceMatrix.array.slice());
  const counts = meshes(scene).map(mesh => mesh.count);
  for (let i = 0; i < 200; i++) effects.update(0);
  for (let i = 0; i < matrices.length; i++) assert.deepEqual(meshes(scene)[i].instanceMatrix.array, matrices[i]);
  assert.deepEqual(meshes(scene).map(mesh => mesh.count), counts);
  effects.reset();
  assert.ok(meshes(scene).every(mesh => mesh.count === 0));
  effects.update(1 / 60);
  assert.ok(meshes(scene).every(mesh => mesh.count === 0));
});

test('gators only receive water effects and reduced motion removes tumbling', () => {
  const scene = new Scene(), effects = makeDestructionEffects(scene, { reducedMotion: true });
  effects.event({ ...event, targetType: 'gator' }); effects.update(1 / 60);
  assert.ok(meshes(scene).every(mesh => mesh.count === 0));
  effects.event(event); effects.update(1 / 60);
  assert.equal(meshes(scene).reduce((total, mesh) => total + mesh.count, 0), 9);
  const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3(), before = new Quaternion(), after = new Quaternion();
  meshes(scene)[0].getMatrixAt(0, matrix); matrix.decompose(position, before, scale);
  effects.update(1 / 60);
  meshes(scene)[0].getMatrixAt(0, matrix); matrix.decompose(position, after, scale);
  assert.ok(before.normalize().angleTo(after.normalize()) < .0001, 'reduced motion preserves piece orientation');
});
