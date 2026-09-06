import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/waterfront-v1.glb', import.meta.url));
const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const { scene } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
const expected = {
  WaterfrontResidence: { width: [35, 40], height: [10, 15], depth: [26, 30], triangles: 6500 },
  MarinaHotel: { width: [40, 44], height: [85, 93], depth: [32, 36], triangles: 18000 },
  SkylineTower: { width: [27, 31], height: [100, 110], depth: [24, 28], triangles: 9000 },
  WaterfrontClub: { width: [31, 38], height: [9, 13], depth: [25, 29], triangles: 9500 },
  SkylineFar: { width: [29, 31], height: [77, 81], depth: [24, 26], triangles: 350 },
  CanopyCluster: { width: [28, 32], height: [13, 15], depth: [23, 26], triangles: 650 },
};

test('Blender waterfront templates use metre-scale Y-up placement and finite reusable geometry', () => {
  for (const [name, limits] of Object.entries(expected)) {
    const asset = scene.getObjectByName(name);
    assert.ok(asset, name);
    const bounds = new Box3().setFromObject(asset);
    const size = bounds.getSize(new Vector3());
    for (const [axis, range] of [['x', limits.width], ['y', limits.height], ['z', limits.depth]]) {
      assert.ok(size[axis] >= range[0] && size[axis] <= range[1], `${name} ${axis}: ${size[axis]}`);
    }
    assert.ok(Math.abs(bounds.min.y) < .01, `${name} sits on y=0`);
    let triangles = 0;
    asset.traverse(object => {
      if (!object.isMesh) return;
      const positions = object.geometry.attributes.position.array;
      const normals = object.geometry.attributes.normal.array;
      assert.ok(positions.every(Number.isFinite), `${name} positions`);
      assert.ok(normals.every(Number.isFinite), `${name} normals`);
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    });
    assert.ok(triangles <= limits.triangles, `${name}: ${triangles} triangles`);
    const copy = asset.clone(true);
    assert.notEqual(copy, asset);
    assert.equal(copy.children[0].geometry, asset.children[0].geometry, 'instances share geometry');
    assert.equal(copy.children[0].material, asset.children[0].material, 'instances share material');
  }
});

test('waterfront kit stays compact with opaque shared materials and cheap horizon templates', () => {
  assert.ok(bytes.length < 2100000, `${bytes.length} bytes`);
  assert.equal(document.images?.length ?? 0, 0, 'no texture or transparency overhead');
  assert.equal(document.materials.length, 12);
  for (const material of document.materials) assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
  let triangles = 0;
  scene.traverse(object => {
    if (!object.isMesh) return;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    assert.equal(object.material.transparent, false);
  });
  assert.ok(triangles < 42000, `${triangles} triangles`);
  assert.equal(scene.getObjectByName('SkylineFar').children.length, 3);
  assert.equal(scene.getObjectByName('CanopyCluster').children.length, 3);
});
