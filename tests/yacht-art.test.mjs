import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Raycaster, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/superyacht-v1.glb', import.meta.url));
const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const loader = new GLTFLoader();
loader.register(() => ({ name: 'NODE_TEXTURE_PLACEHOLDER', loadTexture: () => Promise.resolve(new Texture()) }));
const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);
const root = scene.getObjectByName('Superyacht');

test('replacement yacht fits the unchanged local collision envelope and faces -Z', () => {
  assert.ok(root);
  const bounds = new Box3().setFromObject(root);
  const min = [-3.6800001, -.3000001, -15.401354];
  const max = [3.6800001, 8, 10.82];
  for (const [i, axis] of ['x', 'y', 'z'].entries()) {
    assert.ok(bounds.min[axis] >= min[i], `minimum ${axis}: ${bounds.min[axis]}`);
    assert.ok(bounds.max[axis] <= max[i], `maximum ${axis}: ${bounds.max[axis]}`);
  }
  assert.ok(bounds.getSize(new Vector3()).z > 25.5, 'full original yacht length');
  const hull = root.getObjectByName('Superyacht_Fiberglass');
  const widthAt = z => {
    const hits = new Raycaster(new Vector3(5, 1.48, z), new Vector3(-1, 0, 0), 0, 10).intersectObject(hull);
    assert.ok(hits.length, `hull at ${z}`);
    return hits[0].point.x;
  };
  assert.ok(widthAt(-13.5) < widthAt(5) * .55, 'pointed bow is on negative Z');
});

test('shared yacht meshes and embedded materials remain within repeated-scenery budget', () => {
  assert.ok(bytes.length <= 1000000, `${bytes.length} bytes`);
  assert.ok(document.materials.length <= 6);
  assert.equal(document.images.length, 2, 'compact original teak and woven linen textures');
  assert.ok(document.images.every(image => image.bufferView !== undefined && image.uri === undefined));
  let triangles = 0, draws = 0;
  root.traverse(object => {
    if (!object.isMesh) return;
    draws++;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    for (const key of ['position', 'normal', 'uv']) {
      assert.ok(object.geometry.attributes[key]?.array.every(Number.isFinite), key);
    }
    assert.equal(object.material.transparent, false);
  });
  assert.ok(triangles <= 4000, `${triangles} triangles`);
  assert.ok(draws <= 6, `${draws} draw primitives`);
  const copy = root.clone(true);
  assert.notEqual(copy, root);
  for (let i = 0; i < root.children.length; i++) {
    assert.equal(copy.children[i].geometry, root.children[i].geometry);
    assert.equal(copy.children[i].material, root.children[i].material);
  }
});

test('flybridge windshield leaves the helm open above its deck', () => {
  const glazing = root.getObjectByName('Superyacht_Glazing');
  const ray = new Raycaster(new Vector3(0, 5.4, -2.5), new Vector3(0, -1, 0), 0, .9);
  assert.equal(ray.intersectObject(glazing).length, 0, 'no opaque glazed cap closes the flybridge');
});
