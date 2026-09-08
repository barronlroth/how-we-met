import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, DoubleSide, MeshStandardMaterial, ShaderChunk, ShaderLib, Texture, Vector3 } from 'three';
import { configureFoliageMaterial } from '../florida/vegetation-art.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const bytes = await readFile(new URL('../florida/assets/models/vegetation-v1.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const loader = new GLTFLoader();
const atlas = new Texture();
// Node lacks a bitmap decoder. Geometry/material loading still uses the real
// GLB; the separate image checks below inspect its actual embedded PNG bytes.
loader.register(() => ({ name: 'NODE_LEAF_ATLAS', loadTexture: () => Promise.resolve(atlas) }));
const { scene } = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const expected = {
  PalmRoyal: { size: [10.960, 19.366, 11.466], triangles: 4500, meshes: 3, uv: [0, 0] },
  PalmCoconut: { size: [12.475, 16.499, 12.870], triangles: 4500, meshes: 3, uv: [.5, .5] },
  HammockTree: { size: [13.44, 10.58, 13.71], triangles: 5000, meshes: 2, uv: [.5, 0] },
  SeaGrapeTree: { size: [9.89, 7.53, 10.52], triangles: 5000, meshes: 2, uv: [.5, 0] },
  HedgeCluster: { size: [6.07, 1.98, 2.44], triangles: 1500, meshes: 2, uv: [0, .5] },
  TreeBand: { size: [25.99, 11.14, 8.61], triangles: 1000, meshes: 2, uv: [.5, 0] },
};

test('vegetation kit contains grounded metre-scale Y-up templates within per-instance budgets', () => {
  for (const [name, limits] of Object.entries(expected)) {
    const asset = scene.getObjectByName(name);
    assert.ok(asset, name);
    const bounds = new Box3().setFromObject(asset);
    const size = bounds.getSize(new Vector3()).toArray();
    size.forEach((value, i) => assert.ok(Math.abs(value - limits.size[i]) < .05, `${name} axis ${i}: ${value}`));
    assert.ok(Math.abs(bounds.min.y) < .0001, `${name} base at y=0: ${bounds.min.y}`);
    let triangles = 0;
    assert.equal(asset.children.length, limits.meshes, `${name} draw groups`);
    asset.traverse(mesh => {
      if (!mesh.isMesh) return;
      const { position, normal, color } = mesh.geometry.attributes;
      for (const attribute of [position, normal, color]) {
        assert.ok(attribute, `${name} missing surface attribute`);
        assert.ok(attribute.array.every(Number.isFinite), `${name} non-finite attribute`);
      }
      assert.equal(mesh.material.vertexColors, true, `${name} retains per-leaf and bark shading`);
      triangles += (mesh.geometry.index?.count ?? position.count) / 3;
    });
    assert.ok(triangles <= limits.triangles, `${name}: ${triangles} triangles`);
    const clone = asset.clone(true);
    assert.notEqual(clone, asset);
    for (let i = 0; i < asset.children.length; i++) {
      assert.equal(clone.children[i].geometry, asset.children[i].geometry, `${name} shared geometry`);
      assert.equal(clone.children[i].material, asset.children[i].material, `${name} shared material`);
    }
  }
});

test('leaf cards use the correct padded atlas quadrant, double-sided alpha test, and shared texture', () => {
  const foliageMaterials = new Set();
  for (const [name, limits] of Object.entries(expected)) {
    let leafyMeshes = 0;
    scene.getObjectByName(name).traverse(mesh => {
      if (!mesh.isMesh || mesh.material.name !== 'LeafAtlas') return;
      leafyMeshes++;
      foliageMaterials.add(mesh.material);
      assert.equal(mesh.material.transparent, false, `${name}: no blended sorting`);
      assert.equal(mesh.material.side, DoubleSide);
      assert.ok(Math.abs(mesh.material.alphaTest - .45) < 1e-6);
      assert.equal(mesh.material.depthWrite, true);
      assert.equal(mesh.material.map, atlas);
      const uv = mesh.geometry.attributes.uv;
      assert.ok(uv && uv.count === mesh.geometry.attributes.position.count);
      for (let i = 0; i < uv.count; i++) {
        assert.ok(uv.getX(i) >= limits.uv[0] + .003 && uv.getX(i) <= limits.uv[0] + .497, `${name} u crosses species boundary`);
        assert.ok(uv.getY(i) >= limits.uv[1] + .003 && uv.getY(i) <= limits.uv[1] + .497, `${name} v crosses species boundary`);
      }
      const colors = mesh.geometry.attributes.color.array;
      assert.ok(colors.some(value => value < .9), `${name} exported leaf colour variation`);
    });
    assert.equal(leafyMeshes, 1, `${name} batches every leaf into one draw group`);
  }
  assert.equal(foliageMaterials.size, 1);
});

test('vegetation export embeds one RGBA PNG and stays within shared resource budgets', () => {
  assert.ok(bytes.length < 3500000, `${bytes.length} bytes`);
  assert.equal(document.materials.length, 3);
  assert.equal(document.meshes.reduce((sum, mesh) => sum + mesh.primitives.length, 0), 14);
  assert.deepEqual(scene.children.map(root => root.name).sort(), Object.keys(expected).sort());
  assert.equal(document.images.length, 1);
  assert.equal(document.textures.length, 1);
  const leafMaterial = document.materials.find(material => material.name === 'LeafAtlas');
  assert.equal(leafMaterial.alphaMode, 'MASK');
  assert.equal(leafMaterial.doubleSided, true);
  assert.ok(Math.abs(leafMaterial.alphaCutoff - .45) < 1e-6);
  for (const material of document.materials.filter(material => material !== leafMaterial)) {
    assert.ok(!material.alphaMode || material.alphaMode === 'OPAQUE');
    assert.equal(material.doubleSided ?? false, false);
  }
  const image = document.images[0];
  assert.equal(image.uri, undefined, 'no external asset dependency');
  assert.equal(image.mimeType, 'image/png');
  const view = document.bufferViews[image.bufferView];
  const imageOffset = 20 + jsonLength + 8 + (view.byteOffset ?? 0);
  const png = bytes.subarray(imageOffset, imageOffset + view.byteLength);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(12), 0x49484452, 'PNG IHDR');
  assert.ok(png.readUInt32BE(16) <= 2048 && png.readUInt32BE(20) <= 2048, 'atlas bounded to 2048px');
  assert.equal(png[25], 6, 'RGBA keeps transparent gaps between individual leaves');
  let triangles = 0;
  scene.traverse(mesh => { if (mesh.isMesh) triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3; });
  assert.ok(triangles <= 17000, `${triangles} kit triangles`);
});

// Freeze the non-palm meshes while palm generation evolves. Include geometry,
// normals, UVs, vertex colors, and indices; a changed random stream can otherwise
// silently rearrange every broadleaf canopy while palm-only tests still pass.
test('palm refinements preserve the four non-palm exports exactly', () => {
  const fingerprints = {
    HammockTree: '6004d40e36272e6f219b2a2109eb6b14c23acd7564e1ce9f9a796860e9946e9f',
    SeaGrapeTree: '74ae5bcffb227a8b32693a02cd99a31557b78c7a904b082d5827916203098790',
    HedgeCluster: '3493b10260ac3cedf828a8385919bf91eae41818040fc10e3cf7ecc215956bf6',
    TreeBand: '6ada40ecf2eaf2dbc1655b12082a82aa3d0c17f01751e9d6d3d181f9ed8341b7',
  };
  const binary = bytes.subarray(20 + jsonLength + 8);
  for (const [name, expectedHash] of Object.entries(fingerprints)) {
    const root = document.nodes.find(node => node.name === name);
    const meshes = root.children.map(child => {
      const node = document.nodes[child];
      const parts = document.meshes[node.mesh].primitives.map(primitive => {
        const attributes = {};
        for (const [key, index] of Object.entries({ ...primitive.attributes, index: primitive.indices })) {
          const accessor = document.accessors[index];
          const view = document.bufferViews[accessor.bufferView];
          const data = binary.subarray((view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), (view.byteOffset ?? 0) + view.byteLength);
          attributes[key] = { type: accessor.type, count: accessor.count, componentType: accessor.componentType, sha: createHash('sha256').update(data).digest('hex') };
        }
        return attributes;
      });
      return { name: node.name, parts };
    });
    assert.equal(createHash('sha256').update(JSON.stringify(meshes)).digest('hex'), expectedHash, name);
  }
});


test('palm transmission reuses directional shadows and preserves the other atlas quadrants', () => {
  const material = new MeshStandardMaterial({ map: atlas, alphaTest: .45, vertexColors: true });
  assert.equal(configureFoliageMaterial(material), material, 'one shared material');
  const compile = material.onBeforeCompile;
  configureFoliageMaterial(material);
  assert.equal(material.onBeforeCompile, compile, 'configure the shared material once');
  const shader = { uniforms: {}, fragmentShader: ShaderLib.standard.fragmentShader };
  compile(shader);
  const source = shader.fragmentShader;
  const transmitted = source.indexOf('reflectedLight.directDiffuse+=palmAtlasMask');
  const directional = source.indexOf('getDirectionalLightInfo(');
  const shadow = source.indexOf('getShadow( directionalShadowMap');
  assert.ok(directional >= 0 && shadow > directional && transmitted > shadow, 'transmitted sunlight uses the existing shadowed directional light');
  assert.ok(source.includes('palmAtlasMask*material.diffuseColor*directLight.color'), 'occluded sunlight cannot fill the inner crown');
  assert.equal((source.match(/getShadow\(/g) || []).length, (ShaderChunk.lights_fragment_begin.match(/getShadow\(/g) || []).length, 'no additional shadow-map lookup');
  assert.ok(source.includes('(1.0-palmAtlasMask)*diffuseColor.rgb*vec3(.72,.85,.25)*leafTransmission'), 'non-palm transmission retains its previous expression');
  assert.equal(material.map, atlas);
  assert.equal(material.alphaTest, .45);
  assert.equal(material.alphaToCoverage, true);
  assert.equal(material.transparent, false);
  for (const name of Object.keys(expected)) {
    const mesh = scene.getObjectByName(name + '_LeafAtlas');
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const isPalmQuadrant = (uv.getX(i) < .5) === (uv.getY(i) < .5);
      assert.equal(isPalmQuadrant, name.startsWith('Palm'), `${name} retains its shader quadrant`);
    }
  }
});


test('palm upper surfaces face upward so shadow bias does not self-occlude transmission', () => {
  for (const name of ['PalmRoyal', 'PalmCoconut']) {
    const geometry = scene.getObjectByName(name + '_LeafAtlas').geometry;
    const { position, normal } = geometry.attributes;
    const indices = geometry.index;
    let area = 0;
    let weightedNormalY = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
      const vertices = ids.map(id => new Vector3().fromBufferAttribute(position, id));
      const triangleArea = vertices[1].sub(vertices[0]).cross(vertices[2].sub(vertices[0])).length() / 2;
      const averagedNormal = ids.reduce((sum, id) => sum.add(new Vector3().fromBufferAttribute(normal, id)), new Vector3()).normalize();
      area += triangleArea;
      weightedNormalY += triangleArea * averagedNormal.y;
    }
    assert.ok(weightedNormalY / area > .35, `${name}: upper-side winding must keep the shadow receiver above the thin leaf`);
  }
});
