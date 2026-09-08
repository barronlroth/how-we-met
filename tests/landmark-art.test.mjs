import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, Matrix3, PerspectiveCamera, Vector3, Raycaster, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURSE_LENGTH, halfWidth, pointAt } from '../florida/course.js';

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
  const trim = root.getObjectByName('FisheriesRestaurant_trim');
  const hit = (mesh, x) => new Raycaster(new Vector3(x, 4.1, 3.8), new Vector3(0, 0, -1), 0, 12).intersectObject(mesh)[0];
  for (const x of [-10.5, -6.4, -2.3, 1.8, 5.9, 10]) {
    assert.ok(hit(masonry, x)?.point.z < -1, `bay ${x}: open through front wall to interior`);
    const pier = hit(masonry, x + 1.78);
    const frame = hit(x < 10 ? trim : timber, x + (x < 10 ? 1.27 : 1.48));
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

test('near restaurant tile noses and inner frame stops are visible from the actual intro camera', () => {
  const root = scene.getObjectByName('FisheriesRestaurant').clone(true), s = COURSE_LENGTH - 24;
  const p = pointAt(s, halfWidth(s) + 6), start = pointAt(COURSE_LENGTH - 165, 4);
  root.position.set(p.x, .45, p.z); root.rotation.y = -p.heading - .35; root.scale.setScalar(1.45); root.updateMatrixWorld(true);
  const forward = new Vector3(Math.sin(start.heading), 0, -Math.cos(start.heading)), right = new Vector3(Math.cos(start.heading), 0, Math.sin(start.heading));
  const camera = new PerspectiveCamera(63, 1.5, .15, 6000);
  camera.position.set(start.x, 6, start.z).addScaledVector(forward, -9).addScaledVector(right, 3.8);
  camera.lookAt(new Vector3(start.x, -.8, start.z).addScaledVector(forward, 12));
  camera.setViewOffset(1536, 1024, -307.2, 0, 1536, 1024); camera.updateMatrixWorld();
  const at = point => {
    const world = root.localToWorld(new Vector3(...point)), direction = world.clone().sub(camera.position).normalize();
    const hit = new Raycaster(camera.position, direction).intersectObject(root, true)[0];
    return { hit, local: root.worldToLocal(hit.point.clone()), projected: world.project(camera) };
  };
  const step = 33.2 / 85, nose = at([0, 6.24, 12.44]), gap = at([step / 2, 6.24, 12.44]);
  assert.equal(nose.hit.object.material.name, 'LandmarkTerracotta', 'the clay nose is exposed instead of hidden behind fascia');
  const sunlight = new Vector3(.38, .84, .12).normalize();
  const normal = hit => hit.face.normal.clone().applyNormalMatrix(new Matrix3().getNormalMatrix(hit.object.matrixWorld));
  assert.ok(normal(nose.hit).y > .4 && normal(nose.hit).dot(sunlight) > .45, 'the exposed bevel catches the accepted sun instead of facing downward');
  assert.ok(nose.local.z > 12.42 && gap.local.z < 12.36, 'separate projecting noses leave recessed gaps between tiles');
  const next = at([step, 6.24, 12.44]);
  const pixels = Math.abs(next.projected.x - nose.projected.x) * 768;
  assert.ok(pixels >= 3 && pixels <= 6, `canopy ends are spaced ${pixels}px apart in the intro`);
  const frame = at([-11.77, 3.8, 2.4575]);
  assert.equal(frame.hit.object.material.name, 'LandmarkTrim', 'a pale inner stop separates the dark timber from the window recess');
  assert.ok(frame.local.z < 2.47 && frame.local.z > 2.45, 'the stop remains behind the unchanged masonry plane');
  const sill = at([-11.4, 1.80, 3.37]);
  assert.equal(sill.hit.object.material.name, 'LandmarkTrim');
  assert.ok(sill.local.z >= 3 && sill.local.z <= 3.4 && normal(sill.hit).dot(sunlight) > .5, 'a narrow lit sill bevel stays within the original frame bounds');
  const screen = point => {
    const p = root.localToWorld(point.clone()).project(camera);return new Vector3(p.x * 768, p.y * 512, 0);
  };
  const positions = root.getObjectByName('FisheriesRestaurant_terracotta').geometry.attributes.position;
  const lip = [], ends = [];
  for (let i = 0; i < positions.count; i++) {
    const p = new Vector3().fromBufferAttribute(positions, i);
    if (p.z < 12.4 || p.y < 5.9 || p.y > 6.3) continue;
    if (Math.abs(p.x) < .00001) lip.push(p);
    if (p.z > 12.5 && Math.abs(p.x) < step) ends.push(p.x);
  }
  lip.sort((a, b) => a.y - b.y);
  const lipPixels = screen(lip[0]).distanceTo(screen(lip.at(-1)));
  assert.ok(lipPixels >= 1.8 && lipPixels <= 2.2, `actual clay nose height is ${lipPixels}px`);
  const xs = [...new Set(ends.map(x => Math.round(x * 1000000) / 1000000))].sort((a, b) => a - b);
  const gaps = xs.slice(1).map((x, i) => ({ a: xs[i], b: x, width: x - xs[i] })).sort((a, b) => b.width - a.width);
  const gapPixels = screen(new Vector3(gaps[0].a, 6.17, 12.525)).distanceTo(screen(new Vector3(gaps[0].b, 6.17, 12.525)));
  assert.ok(gapPixels >= 1.5 && gapPixels <= 2, `actual side gaps occupy ${gapPixels}px`);
  for (const center of [-10.5, -6.4, -2.3, 1.8, 5.9]) {
    const inner = at([center - 1.27, 3.8, 2.4575]);
    const reveal = at([center - 1.48, 3.8, 2.8318605]);
    assert.equal(inner.hit.object.material.name, 'LandmarkTrim');
    assert.equal(reveal.hit.object.material.name, 'LandmarkTeak');
    assert.ok(reveal.local.z > inner.local.z + .25 && reveal.local.z < 3.15, 'the shaded return lies behind the mouth and ahead of the inner stop');
    const revealPixels = screen(new Vector3(center - 1.575, 3.8, 3.15)).distanceTo(screen(new Vector3(center - 1.36, 3.8, 2.4575)));
    const stopPixels = screen(new Vector3(center - 1.36, 3.8, 2.4575)).distanceTo(screen(new Vector3(center - 1.18, 3.8, 2.4575)));
    assert.ok(revealPixels >= 2.5 && revealPixels <= 4 && stopPixels >= 1.5 && stopPixels <= 2, `${center}: return ${revealPixels}px / inset stop ${stopPixels}px`);
  }
});

test('landmark material, sampler and embedded image payloads remain exactly preserved', () => {
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  const hash = data => createHash('sha256').update(data).digest('hex');
  const payload = {
    materials: document.materials, textures: document.textures, samplers: document.samplers,
    images: document.images.map(image => {
      const view = document.bufferViews[image.bufferView];
      return { name: image.name, mimeType: image.mimeType, sha: hash(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength)) };
    }),
  };
  assert.equal(hash(JSON.stringify(payload)), '222fa93a5eda7841062d3015b6a33eb71e73080cbf0b506469251a2079a94d80');
});
