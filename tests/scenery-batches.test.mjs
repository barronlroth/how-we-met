import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {batchScenery} from '../florida/scenery-batches.js';

const geometry = new T.BoxGeometry(1, 1, 1), material = new T.MeshStandardMaterial();
function chunk(s, positions, mat = material) {
  const group = new T.Group(), mesh = new T.InstancedMesh(geometry, mat, positions.length);
  positions.forEach((p, i) => mesh.setMatrixAt(i, new T.Matrix4().makeTranslation(...p)));
  group.add(mesh); group.userData.s = s; return group;
}
test('fallback retains original chunks, world transforms and AO/distance visibility on restart', () => {
  const chunks = [chunk(0, [[1, 2, 3]]), chunk(200, [[4, 5, 6]]), chunk(900, [[7, 8, 9]])];
  const batch = batchScenery(chunks), matrix = new T.Matrix4();
  assert.deepEqual(batch.root.children, chunks);
  batch.root.children[1].children[0].getMatrixAt(0, matrix);
  assert.deepEqual(new T.Vector3().setFromMatrixPosition(matrix).toArray(), [4, 5, 6]);
  batch.update(0);
  assert.deepEqual(chunks.map(c => c.visible), [true, true, false]);
  batch.setAO(true);
  assert.deepEqual(chunks.map(c => c.visible), [true, false, false]);
  batch.setAO(false);
  assert.deepEqual(chunks.map(c => c.visible), [true, true, false]);
  batch.update(900);
  assert.deepEqual(chunks.map(c => c.visible), [false, false, true]);
  batch.update(0);
  assert.deepEqual(chunks.map(c => c.visible), [true, true, false]);
});

test('multi-draw shares geometry, preserves transforms and changes only region visibility for AO', () => {
  const batch = batchScenery([chunk(0, [[1, 2, 3]]), chunk(200, [[4, 5, 6]]), chunk(900, [[7, 8, 9]])], {multiDraw: true});
  assert.equal(batch.root.children.length, 1);
  const mesh = batch.root.children[0], matrix = new T.Matrix4();
  assert.ok(mesh.isBatchedMesh);
  assert.equal(mesh.getGeometryIdAt(0), mesh.getGeometryIdAt(1));
  mesh.getMatrixAt(1, matrix);
  assert.deepEqual(new T.Vector3().setFromMatrixPosition(matrix).toArray(), [4, 5, 6]);
  batch.update(0);
  assert.deepEqual([0, 1, 2].map(id => mesh.getVisibleAt(id)), [true, true, false]);
  batch.setAO(true);
  assert.deepEqual([0, 1, 2].map(id => mesh.getVisibleAt(id)), [true, false, false]);
  batch.setAO(false);
  assert.deepEqual([0, 1, 2].map(id => mesh.getVisibleAt(id)), [true, true, false]);
  batch.update(900);
  assert.deepEqual([0, 1, 2].map(id => mesh.getVisibleAt(id)), [false, false, true]);
  assert.ok(mesh.perObjectFrustumCulled && mesh.castShadow);
});
