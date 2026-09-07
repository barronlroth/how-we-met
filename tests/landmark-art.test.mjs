import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Vector3, Raycaster, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/landmarks-v1.glb', import.meta.url));
const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const loader = new GLTFLoader();
// Node tests inspect the real geometry and embedded image records without a DOM.
loader.register(() => ({name:'NODE_BITMAP_PLACEHOLDER',loadTexture:() => Promise.resolve(new Texture())}));
const { scene } = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
scene.updateMatrixWorld(true);

test('Blender landmarks retain game-scale dimensions, UVs, normals and shared resources', () => {
  for (const [name, expected] of [
    ['BridgeCauseway', { x: [189, 191], y: [25, 26], z: [19, 22] }],
    ['FisheriesRestaurant', { x: [34, 36], y: [15, 16], z: [32, 34] }],
  ]) {
    const root = scene.getObjectByName(name);
    assert.ok(root, name);
    const bounds = new Box3().setFromObject(root);
    const size = bounds.getSize(new Vector3());
    assert.ok(Math.abs(bounds.min.y) < .01, `${name} rests on y=0`);
    for (const axis of ['x', 'y', 'z']) assert.ok(size[axis] >= expected[axis][0] && size[axis] <= expected[axis][1], `${name} ${axis}: ${size[axis]}`);
    root.traverse(object => {
      if (!object.isMesh) return;
      for (const key of ['position', 'normal', 'uv']) {
        assert.ok(object.geometry.attributes[key]?.array.every(Number.isFinite), `${name} ${key}`);
      }
      assert.equal(object.material.transparent, false);
    });
    const copy = root.clone(true);
    assert.notEqual(copy, root);
    assert.equal(copy.children[0].geometry, root.children[0].geometry);
    assert.equal(copy.children[0].material, root.children[0].material);
    assert.ok(root.children.length <= 12, 'details are merged by material');
  }
});

test('causeway leaves the central navigation channel open and carries its road overhead', () => {
  const bridge = scene.getObjectByName('BridgeCauseway');
  for (const x of [-24, -12, 0, 12, 24]) {
    for (const y of [1, 5, 10, 14]) {
      const ray = new Raycaster(new Vector3(x, y, 35), new Vector3(0, 0, -1), 0, 70);
      assert.equal(ray.intersectObject(bridge, true).length, 0, `clear passage x=${x}, y=${y}`);
    }
  }
  for (const x of [-80, -45, 0, 45, 80]) {
    const ray = new Raycaster(new Vector3(x, 30, 0), new Vector3(0, -1, 0), 0, 15);
    const hits = ray.intersectObject(bridge, true);
    assert.ok(hits.length > 0, `road exists at x=${x}`);
    assert.ok(hits[0].point.y > 18 && hits[0].point.y < 19, 'road is elevated');
  }
});

test('landmark kit stays within the browser geometry and material budget', () => {
  assert.ok(bytes.length < 5800000, `${bytes.length} bytes`);
  assert.ok(document.materials.length <= 12);
  assert.equal(document.images.length, 8, 'four embedded albedo and tangent-normal tiles');
  for (const image of document.images) {
    assert.equal(image.uri, undefined);
    assert.ok(document.bufferViews[image.bufferView].byteLength < 550000);
  }
  let triangles = 0;
  scene.traverse(object => {
    if (object.isMesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  assert.ok(triangles < 80000, `${triangles} triangles`);
  for (const material of document.materials) assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
});
