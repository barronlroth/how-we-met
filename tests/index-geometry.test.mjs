import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry, BufferAttribute, BufferGeometry, Box3, Vector3} from 'three';
import {indexExactGeometry} from '../florida/index-geometry.js';

function expanded(geometry, name) {
  const attribute = geometry.attributes[name], result = [];
  const count = geometry.index?.count ?? attribute.count;
  for (let i = 0; i < count; i++) {
    const vertex = geometry.index ? geometry.index.getX(i) : i;
    for (let k = 0; k < attribute.itemSize; k++) result.push(attribute.array[vertex * attribute.itemSize + k]);
  }
  return result;
}

test('indexed baking retains every rendered corner, hard normal and UV seam', () => {
  const source = new BoxGeometry(4, 2, 6).toNonIndexed();
  source.computeBoundingBox(); source.computeBoundingSphere();
  const before = Object.fromEntries(Object.keys(source.attributes).map(name => [name, expanded(source, name)]));
  const result = indexExactGeometry(source);
  assert.equal(source.attributes.position.count, 36, 'input geometry is untouched');
  assert.equal(result.attributes.position.count, 24, 'six hard faces keep their own corners');
  assert.equal(result.index.count, 36);
  for (const [name, values] of Object.entries(before)) assert.deepEqual(expanded(result, name), values);
  assert.deepEqual(result.groups, source.groups);
  assert.deepEqual(result.boundingBox, new Box3(new Vector3(-2,-1,-3),new Vector3(2,1,3)));
  assert.equal(result.boundingSphere.radius, source.boundingSphere.radius);
});

test('exact indexing preserves normalized raw colors and nearly coincident vertices', () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,.9999999,0]),3));
  geometry.setAttribute('color', new BufferAttribute(new Uint8Array([255,64,2,4,5,6,7,8,9,255,64,2,4,5,6,7,8,9]),3,true));
  const result = indexExactGeometry(geometry);
  assert.equal(result.attributes.position.count, 4);
  assert.ok(result.attributes.color.normalized);
  assert.ok(result.attributes.color.array instanceof Uint8Array);
  assert.deepEqual(expanded(result,'position'), expanded(geometry,'position'));
  assert.deepEqual(expanded(result,'color'), expanded(geometry,'color'));
});

test('already indexed geometry remains shared without another allocation', () => {
  const source = new BoxGeometry(1,1,1);
  assert.equal(indexExactGeometry(source), source);
});
