import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Raycaster, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/waterfront-v1.glb', import.meta.url));
const document = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
const { scene } = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
);
const expected = {
  WaterfrontResidence: { width: [35, 40], height: [10, 15], depth: [26, 30], triangles: 6500 },
  MarinaHotel: { width: [40, 44], height: [85, 93], depth: [32, 36], triangles: 18000 },
  SkylineTower: { width: [27, 31], height: [100, 110], depth: [24, 28], triangles: 10000 },
  WaterfrontClub: { width: [31, 38], height: [9, 13], depth: [25, 29], triangles: 9500 },
  SkylineFar: { width: [29, 31], height: [77, 81], depth: [24, 26], triangles: 3800 },
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
  assert.ok(bytes.length < 2200000, `${bytes.length} bytes`);
  assert.equal(document.images?.length ?? 0, 0, 'no texture or transparency overhead');
  assert.equal(document.materials.length, 12);
  for (const material of document.materials) assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
  let triangles = 0;
  const runtimeMaterials = new Set();
  scene.traverse(object => {
    if (!object.isMesh) return;
    runtimeMaterials.add(object.material);
    triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    assert.equal(object.material.transparent, false);
  });
  assert.ok(triangles < 44000, `${triangles} triangles`);
  assert.ok(triangles - 38352 < 4000, 'apartment pane variation adds less than 4,000 triangles');
  assert.equal(runtimeMaterials.size, 12, 'colored geometry does not create extra material variants or batches');
  assert.equal(scene.getObjectByName('SkylineFar').children.length, 3);
  assert.equal(scene.getObjectByName('CanopyCluster').children.length, 3);
});

test('tower glass carries overhang occlusion and distinct sky-tinted apartment panes', () => {
  const colorAt = (root, y, x = .8) => {
    const hit = new Raycaster(new Vector3(x, y, 40), new Vector3(0, 0, -1)).intersectObject(root, true)[0];
    assert.equal(hit?.object.material.name, 'deep_glass');
    const { position, color } = hit.object.geometry.attributes;
    assert.ok(color && hit.object.material.vertexColors, 'GLTFLoader enables the exported COLOR_0');
    const localPoint = hit.object.worldToLocal(hit.point.clone());
    const weights = Triangle.getBarycoord(localPoint,
      new Vector3().fromBufferAttribute(position, hit.face.a),
      new Vector3().fromBufferAttribute(position, hit.face.b),
      new Vector3().fromBufferAttribute(position, hit.face.c), new Vector3());
    return new Vector3().fromBufferAttribute(color, hit.face.a).multiplyScalar(weights.x)
      .addScaledVector(new Vector3().fromBufferAttribute(color, hit.face.b), weights.y)
      .addScaledVector(new Vector3().fromBufferAttribute(color, hit.face.c), weights.z);
  };
  for (const [name, floor, height] of [['SkylineFar', 5, 4], ['SkylineTower', 6.5, 3.4], ['MarinaHotel', 10.1, 3.1]]) {
    const root = scene.getObjectByName(name), low = floor + .72, high = floor + height - .06;
    const top = colorAt(root, high - .02), middle = colorAt(root, low + (high - low) * .65), bottom = colorAt(root, low + .02);
    assert.ok(top.z / middle.z >= .5 && top.z / middle.z <= .56, `${name} soft shadow directly below the slab: ${top.z / middle.z}`);
    assert.ok(middle.z >= .76 && middle.z <= 1, `${name} pane middle preserves sky brightness: ${middle.z}`);
    assert.ok(bottom.z / middle.z >= .8, `${name} lower pane remains readable: ${bottom.z / middle.z}`);
    assert.ok(middle.z > middle.y && middle.y > middle.x, `${name} glazing carries a blue sky tint`);
    const panes = [-5.25, -1.75, 1.75, 5.25].map(x => colorAt(root, low + (high - low) * .65, x).z);
    const paneRange = 1 - Math.min(...panes) / Math.max(...panes);
    assert.ok(paneRange >= .19 && paneRange <= .21, `${name} adjacent apartment groups span 20 percent sky brightness: ${paneRange}`);
    for (const mesh of root.children.filter(mesh => mesh.material.name === 'ivory')) {
      const color = mesh.geometry.attributes.color;
      assert.ok(Array.from({ length: color.count }, (_, i) => color.getX(i)).some(value => value > .66 && value < .7), 'fin interiors carry restrained occlusion');
    }
  }
  for (const name of ['WaterfrontResidence', 'WaterfrontClub', 'CanopyCluster']) {
    scene.getObjectByName(name).traverse(mesh => {
      const color = mesh.geometry?.attributes.color;
      if (!color) return;
      for (let i = 0; i < color.count; i++) assert.ok(color.getX(i) === 1 && color.getY(i) === 1 && color.getZ(i) === 1 && color.getW(i) === 1, `${name} colors remain unchanged`);
    });
  }
});

test('tower balcony sections have recessed glazing and open thin rails in the exported asset', () => {
  scene.updateMatrixWorld(true);
  for (const [name, floor, front] of [['SkylineFar', 5, 8.5], ['SkylineTower', 6.5, 9], ['MarinaHotel', 10.1, 8.5]]) {
    const asset = scene.getObjectByName(name);
    const hitAt = height => new Raycaster(new Vector3(.8, floor + height, 40), new Vector3(0, 0, -1))
      .intersectObject(asset, true)[0];
    const plate = hitAt(.1), glass = hitAt(2), openGuard = hitAt(1.15), rail = hitAt(1.68);
    assert.equal(plate?.object.material.name, 'porcelain', `${name} floor plate`);
    assert.equal(hitAt(.65)?.object.material.name, 'porcelain', `${name} substantial floor edge`);
    assert.equal(glass?.object.material.name, 'deep_glass', `${name} recessed glazed doors`);
    assert.equal(openGuard?.object.material.name, 'deep_glass', `${name} balcony guard stays open`);
    assert.equal(rail?.object.material.name, 'porcelain', `${name} handrail`);
    assert.ok(Math.abs(plate.point.z - front) < .02, `${name} preserves its floor envelope`);
    assert.ok(plate.point.z - glass.point.z >= 1.65, `${name} has a deep geometric recess`);
    assert.ok(rail.point.z - glass.point.z >= 1.6, `${name} railing projects in front of the glass`);
    assert.ok(Math.abs(openGuard.point.z - glass.point.z) < .02, `${name} has no opaque facade panel hiding the balcony`);
    const soffit = new Raycaster(new Vector3(.8, floor - .05, front - .4), new Vector3(0, 1, 0)).intersectObject(asset, true)[0];
    assert.equal(soffit?.object.material.name, 'ivory', `${name} soffit stays matte as glazing reflections brighten`);
    assert.ok(soffit.object.geometry.attributes.color.getZ(soffit.face.a) < .07, `${name} physical underside remains dark`);
  }
});

test('tower glazing is divided into apartment bays by continuous projecting fins on both axes', () => {
  scene.updateMatrixWorld(true);
  for (const [name, floor, centerZ, storey] of [['SkylineFar', 5, -1, 4], ['SkylineTower', 6.5, 0, 3.4], ['MarinaHotel', 10.1, -2.5, 3.1]]) {
    const asset = scene.getObjectByName(name);
    for (const height of [floor + 2, floor + storey * 4 + 2]) {
      for (const side of [-1, 1]) {
        const frontAt = x => new Raycaster(new Vector3(x, height, centerZ + side * 40), new Vector3(0, 0, -side)).intersectObject(asset, true)[0];
        const sideAt = z => new Raycaster(new Vector3(side * 40, height, centerZ + z), new Vector3(-side, 0, 0)).intersectObject(asset, true)[0];
        for (const [face, at] of [['front/back', frontAt], ['sides', sideAt]]) {
          const fin = at(3.5), window = at(1.75), adjacentFin = at(0);
          assert.equal(fin?.object.material.name, 'ivory', `${name} ${face} structural fin`);
          assert.equal(adjacentFin?.object.material.name, 'ivory', `${name} ${face} adjacent apartment bay`);
          assert.equal(window?.object.material.name, 'deep_glass', `${name} ${face} inset apartment glazing`);
          assert.ok(window.distance - fin.distance >= .28 && window.distance - fin.distance <= .32, `${name} ${face} has restrained fin relief`);
          assert.equal(at(3.56)?.object.material.name, 'deep_glass', `${name} ${face} fin remains slender`);
        }
      }
    }
  }
});
