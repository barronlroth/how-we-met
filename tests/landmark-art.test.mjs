import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
  assert.equal(document.materials.length, 12);
  assert.equal(document.meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0), 21);
  assert.equal(document.images.length, 8, 'four embedded albedo and tangent-normal tiles');
  for (const image of document.images) {
    assert.equal(image.uri, undefined);
    assert.ok(document.bufferViews[image.bufferView].byteLength < 550000);
  }
  let triangles = 0;
  scene.traverse(object => {
    if (object.isMesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  assert.ok(triangles < 72000, `${triangles} triangles`);
  for (const material of document.materials) assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
});


test('restaurant openings have real wall depth, separate inner frames, and unchanged outer bounds', () => {
  const root = scene.getObjectByName('FisheriesRestaurant');
  const bounds = new Box3().setFromObject(root);
  assert.deepEqual(bounds.min.toArray(), [-17.5, 0, -15.506402969360352]);
  assert.deepEqual(bounds.max.toArray(), [17.5, 15.350000381469727, 17.228254318237305]);
  const masonry = root.getObjectByName('FisheriesRestaurant_stucco');
  const timber = root.getObjectByName('FisheriesRestaurant_teak');
  const hit = (mesh, x) => new Raycaster(new Vector3(x, 4.1, 3.8), new Vector3(0, 0, -1), 0, 12).intersectObject(mesh)[0];
  for (const x of [-10.5, -6.4, -2.3, 1.8, 5.9, 10]) {
    assert.ok(hit(masonry, x)?.point.z < -1, `bay ${x}: open through front wall to interior`);
    const pier = hit(masonry, x + 1.78);
    const frame = hit(timber, x + 1.48);
    assert.ok(pier && frame && pier.point.z - frame.point.z > .65, `bay ${x}: recessed inner frame behind masonry reveal`);
  }
});

test('restaurant refinement leaves all bridge surface geometry exactly unchanged', () => {
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  const hash = data => createHash('sha256').update(data).digest('hex');
  const root = document.nodes.find(node => node.name === 'BridgeCauseway');
  const meshes = root.children.map(child => {
    const node = document.nodes[child];
    const parts = document.meshes[node.mesh].primitives.map(primitive => {
      const attributes = {};
      for (const [key, index] of Object.entries({ ...primitive.attributes, index: primitive.indices })) {
        const accessor = document.accessors[index];
        const view = document.bufferViews[accessor.bufferView];
        const data = binary.subarray((view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), (view.byteOffset ?? 0) + view.byteLength);
        attributes[key] = { type: accessor.type, count: accessor.count, componentType: accessor.componentType, sha: hash(data) };
      }
      return attributes;
    });
    return { name: node.name, parts };
  });
  assert.equal(hash(JSON.stringify(meshes)), 'e88c77bd03a8056955545264283a376426a5ea802a88a23b6a512f1aafdafea5');
});

test('Fisheries sign retains every original letter surface and UV', () => {
  const geometry = scene.getObjectByName('FisheriesRestaurant_navy').geometry;
  const { position, normal, uv } = geometry.attributes;
  const index = geometry.index;
  const triangles = [];
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (!ids.every(id => position.getY(id) > 6.4 && position.getY(id) < 7.7 && position.getZ(id) > 12.43 && position.getZ(id) < 12.60)) continue;
    triangles.push(ids.map(id => [position.getX(id), position.getY(id), position.getZ(id), normal.getX(id), normal.getY(id), normal.getZ(id), uv.getX(id), uv.getY(id)].join(',')).sort().join(';'));
  }
  assert.equal(triangles.length, 4589);
  assert.equal(createHash('sha256').update(triangles.sort().join('\n')).digest('hex'), 'a43e764ba65aad64e49925e81498923dae021b6ece5c69403bfe686ebfa5f1fd');
});
