import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, PerspectiveCamera, Raycaster, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/villas-v1.glb', import.meta.url));
const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
scene.updateMatrixWorld(true);

const cases = [
  { width: 16, size: [[30, 30.5], [10.8, 11.2], [17.4, 17.8]], bay: 1.9125 },
  { width: 18, size: [[32, 32.5], [9.6, 9.8], [17.15, 17.4]], bay: 1.575 },
  { width: 20, size: [[34, 34.5], [14.3, 14.6], [17.4, 17.8]], bay: 1.608333333 },
  { width: 16, size: [[30.5, 31], [10.8, 11.2], [17.4, 17.8]], bay: 1.9125 },
];

test('four Blender villas preserve the former variant envelopes, ground and reusable resources', () => {
  for (const [variant, expected] of cases.entries()) {
    const root = scene.getObjectByName(`WaterfrontVilla${variant}`);
    assert.ok(root, `variant ${variant}`);
    const bounds = new Box3().setFromObject(root), size = bounds.getSize(new Vector3());
    assert.ok(Math.abs(bounds.min.y) < .001, 'each villa rests on y=0');
    for (const [index, axis] of ['x', 'y', 'z'].entries()) assert.ok(size[axis] >= expected.size[index][0] && size[axis] <= expected.size[index][1], `villa ${variant} ${axis}: ${size[axis]}`);
    assert.ok(bounds.max.z >= 9.9 && bounds.max.z <= 10.15, 'balcony remains the +Z waterfront edge');
    assert.ok(root.children.length <= 6);
    root.traverse(object => {
      if (!object.isMesh) return;
      assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(object.geometry.attributes.normal.array.every(Number.isFinite));
      assert.ok(object.geometry.attributes.uv.array.every(Number.isFinite), 'authored UVs support coherent curved roof surfaces');
      assert.equal(object.material.transparent, false);
    });
    const copy = root.clone(true);
    assert.notEqual(copy, root);
    for (let i = 0; i < root.children.length; i++) {
      assert.equal(copy.children[i].geometry, root.children[i].geometry);
      assert.equal(copy.children[i].material, root.children[i].material);
    }
  }
});

test('villa doors and side windows are real deep wall openings with glazing behind jambs', () => {
  for (const [variant, { width, bay }] of cases.entries()) {
    const root = scene.getObjectByName(`WaterfrontVilla${variant}`);
    const recess = variant === 0 ? .42 : .84;
    const front = (x, y) => new Raycaster(new Vector3(x, y, 30), new Vector3(0, 0, -1)).intersectObject(root, true)[0];
    for (const height of [2.1, 5.9]) {
      const window = front(bay + .35, height), pier = front(0, height);
      assert.equal(window?.object.material.name, 'VillaGlass', `villa ${variant} visible recessed pane`);
      assert.equal(pier?.object.material.name, 'VillaStucco', `villa ${variant} structural wall pier`);
      assert.ok(Math.abs(window.point.z - (6.5 - recess)) < .015, 'glazing sits behind the authored wall reveal');
      assert.ok(pier.point.z - window.point.z > recess - .02, 'there is no solid house box covering the window recess');
    }
    const left = new Raycaster(new Vector3(-35, 2.1, -3.65), new Vector3(1, 0, 0)).intersectObject(root, true)[0];
    assert.equal(left?.object.material.name, 'VillaGlass');
    assert.ok(Math.abs(left.point.x - (-width / 2 + recess)) < .015, 'side window depth matches the front');
  }
});

test('tiled variants have modeled curved tiles above their continuous roof surfaces', () => {
  for (const variant of [0, 2, 3]) {
    const root = scene.getObjectByName(`WaterfrontVilla${variant}`);
    const hits = new Raycaster(new Vector3(0, 25, 5.2), new Vector3(0, -1, 0)).intersectObject(root, true)
      .filter(hit => hit.object.material.name === 'VillaTerracotta');
    assert.ok(hits.length >= 2, `villa ${variant} has both clay caps and a sealed roof beneath`);
    assert.ok(hits[0].point.y - hits.at(-1).point.y > .1, `villa ${variant} tile has actual curved relief`);
  }
});

test('the intro-facing Villa0 side has outward inner frames, shaded returns and curtains behind its sash', () => {
  const root = scene.getObjectByName('WaterfrontVilla0');
  const sideAt = z => new Raycaster(new Vector3(-35, 5.9, z), new Vector3(1, 0, 0)).intersectObject(root, true)[0];
  const centerFrame = sideAt(-.5), edgeFrame = sideAt(-1.385), curtain = sideAt(-1.18), glass = sideAt(-.2);
  for (const frame of [centerFrame, edgeFrame]) {
    assert.equal(frame?.object.material.name, 'VillaTrim', 'side openings have a separate inner sash and perimeter');
    assert.ok(frame.face.normal.x < -.99, 'trim faces outward toward the intro camera');
    assert.ok(frame.point.x > -7.76 && frame.point.x < -7.72, 'frame sits inside the 0.4m wall reveal');
  }
  assert.equal(curtain?.object.material.name, 'VillaTrim');
  assert.equal(glass?.object.material.name, 'VillaGlass');
  assert.ok(curtain.distance > centerFrame.distance + .08 && curtain.distance < glass.distance, 'curtain is behind the frame and ahead of the glazing');
  const sample = hit => {
    const { position, color } = hit.object.geometry.attributes;
    assert.ok(color && hit.object.material.vertexColors, 'exported COLOR_0 is enabled');
    const weights = Triangle.getBarycoord(hit.object.worldToLocal(hit.point.clone()),
      new Vector3().fromBufferAttribute(position, hit.face.a), new Vector3().fromBufferAttribute(position, hit.face.b),
      new Vector3().fromBufferAttribute(position, hit.face.c), new Vector3());
    return weights.x * color.getX(hit.face.a) + weights.y * color.getX(hit.face.b) + weights.z * color.getX(hit.face.c);
  };
  const topAt = x => new Raycaster(new Vector3(x, 6.1, -.6), new Vector3(0, 1, 0)).intersectObject(root, true)[0];
  const outer = topAt(-7.95), inner = topAt(-7.76);
  assert.equal(inner?.object.material.name, 'VillaStucco');
  assert.ok(sample(inner) < .45 && sample(outer) > .5 && sample(inner) / sample(outer) < .75, 'top return darkens toward the occupied recess without runtime shadows');
  const clay = root.children.find(mesh => mesh.material.name === 'VillaTerracotta').geometry.attributes.color;
  assert.ok(Array.from({ length: clay.count }, (_, i) => clay.getX(i)).some(value => value < .32), 'hollow tile lips carry a dark inner edge');
});

test('villa kit stays under the full four-variant geometry budget with six opaque shared materials', () => {
  assert.equal(document.materials.length, 6);
  assert.equal(document.images?.length ?? 0, 0, 'existing shared browser maps avoid duplicate embedded textures');
  for (const material of document.materials) assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
  let triangles = 0;
  const materials = new Set();
  scene.traverse(object => {
    if (!object.isMesh) return;
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    materials.add(object.material);
    assert.ok(object.geometry.attributes.color, 'neutral colors retain shared material programs on unchanged variants');
  });
  assert.equal(materials.size, 6, 'baked reveal shading does not add material variants');
  assert.ok(triangles < 21000, `${triangles} triangles`);
  assert.ok(bytes.length < 1900000, `${bytes.length} bytes`);
});

test('Villa0 starter tiles have separate eave noses and small shaded inner-frame stops', () => {
  const root = scene.getObjectByName('WaterfrontVilla0'), step = 15 / 35;
  const tileAt = z => new Raycaster(new Vector3(-30, 8.64, z), new Vector3(1, 0, 0)).intersectObject(root, true)[0];
  const nose = tileAt(0), gap = tileAt(step / 2), adjacent = tileAt(step);
  assert.equal(nose?.object.material.name, 'VillaTerracotta');
  assert.ok(nose.point.x < -9.15 && gap.point.x > -9.10, 'projecting starter noses are separated by visible recessed gaps');
  assert.ok(nose.face.normal.x < -.7 && nose.face.normal.y > .4, 'the eave bevel faces outward and up to catch the sun');
  const camera = new PerspectiveCamera(63, 1.5, .15, 6000);
  camera.position.set(-62.10801488367133, 5.1388888888888875, 53.763856560395794);
  camera.lookAt(-42.61259427002369, -1.1574074074074072, 50.53973382464292);
  camera.setViewOffset(1536, 1024, -307.2, 0, 1536, 1024); camera.updateMatrixWorld();
  const spacing = Math.abs(nose.point.clone().project(camera).x - adjacent.point.clone().project(camera).x) * 768;
  assert.ok(spacing >= 3 && spacing <= 6, `near eave spacing is ${spacing}px`);
  const stop = new Raycaster(new Vector3(-35, 5.9, -1.29), new Vector3(1, 0, 0)).intersectObject(root, true)[0];
  assert.equal(stop?.object.material.name, 'VillaTeak');
  assert.ok(stop.point.x > -7.64 && stop.point.x < -7.61, 'dark inner stop is behind the accepted sash without changing wall depth');
  const sillPoint = new Vector3(-8.21, 4.79, -.5);
  const sill = new Raycaster(camera.position, sillPoint.sub(camera.position).normalize()).intersectObject(root, true)[0];
  assert.equal(sill?.object.material.name, 'VillaTrim');
  assert.ok(sill.point.x >= -8.25 && sill.point.x <= -8.17 && sill.face.normal.y > .65, 'the camera sees a small upward bevel inside the existing sill bounds');
});
