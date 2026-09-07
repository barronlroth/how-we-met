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

test('distant scenery spans bends beyond detail culling and skips shadows and AO in both backends', () => {
  for (const multiDraw of [false, true]) {
    const chunks = [chunk(0, [[0, 0, 0]]), chunk(1100, [[2, 0, 0]]), chunk(1900, [[4, 0, 0]])];
    const batch = batchScenery(chunks, {multiDraw, viewDistance: 1600, aoDistance: 0, shadows: false});
    const visible = () => multiDraw ? [0, 1, 2].map(i => batch.root.children[0].getVisibleAt(i)) : chunks.map(c => c.visible);
    batch.update(0); assert.deepEqual(visible(), [true, true, false]);
    batch.setAO(true); assert.deepEqual(visible(), [false, false, false]);
    batch.setAO(false); assert.deepEqual(visible(), [true, true, false]);
    batch.root.traverse(mesh => { if (mesh.isMesh) assert.equal(mesh.castShadow, false); });
    batch.update(1700); assert.deepEqual(visible(), [false, true, true]);
  }
});

test('destroying a batched hull hides only its parts through culling and AO, and restart restores exact transforms', () => {
  for (const multiDraw of [false, true]) {
    const chunks = [chunk(0, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), chunk(200, [[10, 11, 12]])];
    chunks[0].children[0].userData.targetIds = ['boat-a', null, 'boat-a'];
    chunks[1].children[0].userData.targetIds = ['boat-b'];
    const batch = batchScenery(chunks, {multiDraw}), matrix = new T.Matrix4();
    const visible = i => {
      if (multiDraw) return batch.root.children[0].getVisibleAt(i);
      const c = chunks[i === 3 ? 1 : 0], mesh = c.children[0];
      mesh.getMatrixAt(i === 3 ? 0 : i, matrix);
      return c.visible && matrix.determinant() !== 0;
    };
    batch.update(0); batch.setDestroyed('boat-a');
    assert.deepEqual([0, 1, 2, 3].map(visible), [false, true, false, true]);
    batch.setAO(true);
    assert.deepEqual([0, 1, 2, 3].map(visible), [false, true, false, false]);
    batch.setAO(false); batch.update(1000); batch.update(0);
    assert.deepEqual([0, 1, 2, 3].map(visible), [false, true, false, true]);
    batch.setDestroyed('boat-b'); batch.update(1000); batch.resetDestruction();
    assert.deepEqual([0, 1, 2, 3].map(visible), [false, false, false, false]);
    batch.update(0);
    assert.deepEqual([0, 1, 2, 3].map(visible), [true, true, true, true]);
    (multiDraw ? batch.root.children[0] : chunks[0].children[0]).getMatrixAt(2, matrix);
    assert.deepEqual(new T.Vector3().setFromMatrixPosition(matrix).toArray(), [7, 8, 9]);
  }
});

function geometryChunk(s, geometries) {
  const group = new T.Group(); group.userData.s = s;
  for (const [i, source] of geometries.entries()) {
    const mesh = new T.InstancedMesh(source, material, 1);
    mesh.setMatrixAt(0, new T.Matrix4().compose(new T.Vector3(i * 3, 2, -7), new T.Quaternion().setFromEuler(new T.Euler(.2, .4, -.1)), new T.Vector3(1.2, .8, 2)));
    mesh.userData.targetIds = [`mixed-${i}`];
    group.add(mesh);
  }
  return group;
}

function triangleAttributes(source, start = 0, count = source.index?.count ?? source.attributes.position.count) {
  return Object.fromEntries(Object.entries(source.attributes).map(([name, attribute]) => [name,
    Array.from({length: count}, (_, i) => {
      const vertex = source.index ? source.index.getX(start + i) : start + i;
      return Array.from({length: attribute.itemSize}, (_, component) => attribute.getComponent(vertex, component));
    }).flat(),
  ]));
}

test('mixed indexed and procedural scenery keeps exact triangle attributes, transforms and target visibility in both backends', () => {
  for (const multiDraw of [false, true]) for (const indexedFirst of [false, true]) {
    const indexed = new T.PlaneGeometry(4, 2, 2, 1);
    const procedural = new T.BoxGeometry(2, 3, 5).toNonIndexed();
    const sources = indexedFirst ? [indexed, procedural] : [procedural, indexed];
    const group = geometryChunk(0, sources);
    const expectedMatrices = group.children.map(mesh => {const m = new T.Matrix4(); mesh.getMatrixAt(0, m); return m;});
    const originalIndices = [...indexed.index.array];
    const batch = batchScenery([group], {multiDraw}); batch.update(0);
    const mesh = batch.root.children[0], matrix = new T.Matrix4();
    if (multiDraw) {
      assert.equal(mesh.geometry.attributes.position.count, sources.reduce((sum, source) => sum + source.attributes.position.count, 0));
      assert.equal(mesh.geometry.index.count, sources.reduce((sum, source) => sum + (source.index?.count ?? source.attributes.position.count), 0));
      assert.ok(mesh.geometry.attributes.position.count < mesh.geometry.index.count);
      for (const [i, source] of sources.entries()) {
        const range = mesh.getGeometryRangeAt(mesh.getGeometryIdAt(i));
        assert.deepEqual(triangleAttributes(mesh.geometry, range.start, range.count), triangleAttributes(source));
        const indices = [...mesh.geometry.index.array.slice(range.indexStart, range.indexStart + range.indexCount)].map(index => index - range.vertexStart);
        assert.deepEqual(indices, source.index ? [...source.index.array] : Array.from({length: source.attributes.position.count}, (_, j) => j));
        mesh.getMatrixAt(i, matrix); assert.deepEqual(matrix.elements, expectedMatrices[i].elements);
      }
    } else {
      for (const [i, source] of sources.entries()) {
        assert.equal(group.children[i].geometry, source);
        group.children[i].getMatrixAt(0, matrix); assert.deepEqual(matrix.elements, expectedMatrices[i].elements);
      }
    }
    assert.equal(procedural.index, null);
    assert.deepEqual([...indexed.index.array], originalIndices);
    batch.setDestroyed('mixed-0'); batch.setAO(true); batch.setAO(false);
    if (multiDraw) assert.deepEqual([mesh.getVisibleAt(0), mesh.getVisibleAt(1)], [false, true]);
    else {group.children[0].getMatrixAt(0, matrix); assert.equal(matrix.determinant(), 0);}
    batch.resetDestruction();
    if (multiDraw) assert.deepEqual([mesh.getVisibleAt(0), mesh.getVisibleAt(1)], [true, true]);
    else {group.children[0].getMatrixAt(0, matrix); assert.deepEqual(matrix.elements, expectedMatrices[0].elements);}
  }
});

test('multi-draw rebases authored indices beyond 16-bit range without wrapping', () => {
  const large = new T.BufferGeometry();
  large.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(65536 * 3), 3));
  large.setIndex([0, 1, 65535]);
  const small = new T.BufferGeometry();
  small.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  small.setIndex([2, 0, 1]);
  const batch = batchScenery([geometryChunk(0, [large, small])], {multiDraw: true});
  const mesh = batch.root.children[0];
  assert.ok(mesh.geometry.index.array instanceof Uint32Array);
  assert.deepEqual([...mesh.geometry.index.array], [0, 1, 65535, 65538, 65536, 65537]);
  const range = mesh.getGeometryRangeAt(mesh.getGeometryIdAt(1));
  assert.deepEqual(triangleAttributes(mesh.geometry, range.start, range.count), triangleAttributes(small));
});

test('all-procedural material buckets retain non-indexed storage', () => {
  const source = new T.BoxGeometry(1, 2, 3).toNonIndexed();
  const batch = batchScenery([geometryChunk(0, [source, source])], {multiDraw: true});
  const mesh = batch.root.children[0];
  assert.equal(mesh.geometry.index, null);
  assert.equal(mesh.geometry.attributes.position.count, source.attributes.position.count);
  assert.deepEqual(triangleAttributes(mesh.geometry), triangleAttributes(source));
  assert.equal(mesh.getGeometryIdAt(0), mesh.getGeometryIdAt(1));
});

test('target staging visibility remains independent of destruction, AO and distance in both backends', () => {
  for (const multiDraw of [false, true]) {
    const chunks = [chunk(0, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]), chunk(200, [[10, 11, 12]])];
    chunks[0].children[0].userData.targetIds = ['boat-a', null, 'boat-b'];
    chunks[1].children[0].userData.targetIds = ['boat-c'];
    const transform = new T.Matrix4().compose(new T.Vector3(1, 2, 3), new T.Quaternion().setFromEuler(new T.Euler(.3, -.6, .2)), new T.Vector3(.8, 1.1, 1.4));
    chunks[0].children[0].setMatrixAt(0, transform);
    const originals = chunks.flatMap(c => Array.from({length: c.children[0].count}, (_, i) => {const m = new T.Matrix4(); c.children[0].getMatrixAt(i, m); return m;}));
    const batch = batchScenery(chunks, {multiDraw}), matrix = new T.Matrix4();
    const readMatrix = i => {
      if (multiDraw) batch.root.children[0].getMatrixAt(i, matrix);
      else chunks[i === 3 ? 1 : 0].children[0].getMatrixAt(i === 3 ? 0 : i, matrix);
      return matrix;
    };
    const visible = () => [0, 1, 2, 3].map(i => multiDraw ? batch.root.children[0].getVisibleAt(i) : chunks[i === 3 ? 1 : 0].visible && readMatrix(i).determinant() !== 0);
    batch.update(0); batch.setTargetsVisible(false);
    assert.deepEqual(visible(), [false, true, false, false]);
    assert.deepEqual(readMatrix(1).elements, originals[1].elements);
    batch.setDestroyed('boat-a'); batch.setAO(true); batch.setAO(false);
    assert.deepEqual(visible(), [false, true, false, false]);
    batch.setTargetsVisible(true);
    assert.deepEqual(visible(), [false, true, true, true]);
    for (const i of [1, 2, 3]) assert.deepEqual(readMatrix(i).elements, originals[i].elements);
    batch.resetDestruction();
    assert.deepEqual(visible(), [true, true, true, true]);
    for (let i = 0; i < 4; i++) assert.deepEqual(readMatrix(i).elements, originals[i].elements);
    // Resetting destruction while staging is hidden must not reveal targets.
    batch.setTargetsVisible(false); batch.setDestroyed('boat-b'); batch.resetDestruction();
    batch.update(1000); batch.setTargetsVisible(true);
    assert.deepEqual(visible(), [false, false, false, false]);
    batch.setAO(true); batch.update(0);
    assert.deepEqual(visible(), [true, true, true, false]);
    batch.setAO(false);
    assert.deepEqual(visible(), [true, true, true, true]);
    for (let i = 0; i < 4; i++) assert.deepEqual(readMatrix(i).elements, originals[i].elements);
  }
});

test('AO omits masked foliage, retains solid wood, and restores prior visibility in both backends', () => {
  for (const multiDraw of [false, true]) {
    const atlas = new T.Texture();
    const leaves = new T.MeshStandardMaterial({map: atlas, alphaTest: .45, alphaToCoverage: true, side: T.DoubleSide});
    const hiddenLeaves = leaves.clone(), wood = new T.MeshStandardMaterial();
    const source = chunk(0, [[1, 2, 3]], wood);
    for (const mat of [leaves, hiddenLeaves]) {
      const mesh = new T.InstancedMesh(geometry, mat, 1);
      mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(4, 5, 6));
      mesh.castShadow = mesh.receiveShadow = true;
      source.add(mesh);
    }
    const batch = batchScenery([source], {multiDraw}); batch.update(0);
    const meshes = new Map();
    batch.root.traverse(mesh => { if (mesh.isMesh) meshes.set(mesh.material, mesh); });
    const leafMesh = meshes.get(leaves), hiddenMesh = meshes.get(hiddenLeaves), woodMesh = meshes.get(wood);
    hiddenMesh.visible = false;
    const visibleMaterials = () => {
      const result = [];
      batch.root.traverseVisible(mesh => { if (mesh.isMesh) result.push(mesh.material); });
      return result;
    };
    assert.deepEqual(visibleMaterials(), [wood, leaves]);
    batch.setAO(false);
    assert.equal(hiddenMesh.visible, false, 'an inactive restore must not reveal an already hidden mesh');
    for (let cycle = 0; cycle < 2; cycle++) {
      batch.setAO(true); batch.setAO(true);
      assert.deepEqual(visibleMaterials(), [wood], 'normal/depth pass keeps trunks and roots, without leaf cards');
      assert.equal(leafMesh.visible, false);
      assert.equal(hiddenMesh.visible, false);
      assert.equal(woodMesh.visible, true);
      batch.setAO(false); batch.setAO(false);
      assert.deepEqual(visibleMaterials(), [wood, leaves], 'beauty, reflection and shadow passes recover the original leaves');
      assert.equal(hiddenMesh.visible, false, 'repeated AO cycles preserve the pre-existing visibility');
      for (const mat of [leaves, hiddenLeaves]) {
        assert.equal(mat.map, atlas);
        assert.equal(mat.alphaTest, .45);
        assert.equal(mat.alphaToCoverage, true);
        assert.equal(mat.side, T.DoubleSide);
      }
      assert.ok(leafMesh.castShadow && leafMesh.receiveShadow);
    }
    // Each cycle captures current visibility rather than a permanent startup state.
    leafMesh.visible = false; hiddenMesh.visible = true;
    batch.setAO(true); batch.setAO(false);
    assert.equal(leafMesh.visible, false);
    assert.equal(hiddenMesh.visible, true);
  }
});
