import * as T from 'three';

// Keep the existing chunk renderer on browsers without native multi-draw.
// Pooling instance buffers there needs separate browser benchmarks before adoption.
function chunkScenery(chunks) {
  const root = new T.Group(); root.add(...chunks);
  let distance = 0, ao = false;
  function visibility() {
    for (const chunk of chunks) chunk.visible = Math.abs(chunk.userData.s - distance) < (ao ? 95 : 670);
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; visibility(); } };
}

function multiDrawScenery(chunks) {
  const root = new T.Group(), byMaterial = new Map(), matrix = new T.Matrix4();
  for (const chunk of chunks) for (const mesh of chunk.children) {
    let entry = byMaterial.get(mesh.material);
    if (!entry) byMaterial.set(mesh.material, entry = { geometries: new Map(), records: [], capacity: 0 });
    entry.geometries.set(mesh.geometry, null);
    entry.records.push({ mesh, s: chunk.userData.s }); entry.capacity += mesh.count;
  }
  const regions = new Map();
  for (const [material, entry] of byMaterial) {
    const vertices = [...entry.geometries.keys()].reduce((sum, geometry) => sum + (geometry.index?.count ?? geometry.attributes.position.count), 0);
    const batch = new T.BatchedMesh(entry.capacity, vertices, 0, material);
    batch.castShadow = batch.receiveShadow = true;
    batch.frustumCulled = false; // Per-object culling runs separately for every camera/pass.
    batch.sortObjects = material.transparent;
    for (const geometry of entry.geometries.keys()) {
      const clean = geometry.index ? geometry.toNonIndexed() : geometry;
      entry.geometries.set(geometry, batch.addGeometry(clean));
      if (clean !== geometry) clean.dispose();
    }
    for (const {mesh, s} of entry.records) {
      let region = regions.get(s);
      if (!region) regions.set(s, region = { s, instances: [], visible: false });
      for (let i = 0; i < mesh.count; i++) {
        const id = batch.addInstance(entry.geometries.get(mesh.geometry));
        mesh.getMatrixAt(i, matrix); batch.setMatrixAt(id, matrix); batch.setVisibleAt(id, false);
        region.instances.push({ batch, id });
      }
    }
    root.add(batch);
  }
  let distance = 0, ao = false;
  function visibility() {
    for (const region of regions.values()) {
      const visible = Math.abs(region.s - distance) < (ao ? 95 : 670);
      if (visible === region.visible) continue;
      region.visible = visible;
      for (const {batch, id} of region.instances) batch.setVisibleAt(id, visible);
    }
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; visibility(); } };
}

export function batchScenery(chunks, {multiDraw = false} = {}) {
  return multiDraw ? multiDrawScenery(chunks) : chunkScenery(chunks);
}
