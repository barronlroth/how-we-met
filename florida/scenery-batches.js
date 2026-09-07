import * as T from 'three';

// Keep the existing chunk renderer on browsers without native multi-draw.
// Pooling instance buffers there needs separate browser benchmarks before adoption.
function chunkScenery(chunks, {viewDistance, aoDistance, shadows}) {
  const root = new T.Group(); root.add(...chunks);
  if (!shadows) root.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = false; });
  const targets = new Map(), hidden = new Set(), zero = new T.Matrix4().makeScale(0, 0, 0);
  for (const chunk of chunks) for (const mesh of chunk.children) {
    (mesh.userData.targetIds || []).forEach((targetId, i) => {
      if (!targetId) return;
      let records = targets.get(targetId); if (!records) targets.set(targetId, records = []);
      const matrix = new T.Matrix4(); mesh.getMatrixAt(i, matrix); records.push({mesh, i, matrix});
    });
  }
  function setDestroyed(targetId, destroyed = true) {
    if (destroyed) hidden.add(targetId); else hidden.delete(targetId);
    for (const {mesh, i, matrix} of targets.get(targetId) || []) {
      mesh.setMatrixAt(i, destroyed ? zero : matrix); mesh.instanceMatrix.needsUpdate = true;
    }
  }
  let distance = 0, ao = false;
  function visibility() {
    for (const chunk of chunks) chunk.visible = Math.abs(chunk.userData.s - distance) < (ao ? aoDistance : viewDistance);
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; visibility(); }, setDestroyed,
    resetDestruction() { for (const id of hidden) setDestroyed(id, false); } };
}

function multiDrawScenery(chunks, {viewDistance, aoDistance, shadows}) {
  const root = new T.Group(), byMaterial = new Map(), matrix = new T.Matrix4();
  for (const chunk of chunks) for (const mesh of chunk.children) {
    let entry = byMaterial.get(mesh.material);
    if (!entry) byMaterial.set(mesh.material, entry = { geometries: new Map(), records: [], capacity: 0 });
    entry.geometries.set(mesh.geometry, null);
    entry.records.push({ mesh, s: chunk.userData.s }); entry.capacity += mesh.count;
  }
  const regions = new Map(), targets = new Map(), hidden = new Set();
  for (const [material, entry] of byMaterial) {
    const vertices = [...entry.geometries.keys()].reduce((sum, geometry) => sum + (geometry.index?.count ?? geometry.attributes.position.count), 0);
    const batch = new T.BatchedMesh(entry.capacity, vertices, 0, material);
    batch.castShadow = batch.receiveShadow = shadows;
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
        const targetId = mesh.userData.targetIds?.[i], record = {batch, id, targetId, region};
        region.instances.push(record);
        if (targetId) { let records = targets.get(targetId); if (!records) targets.set(targetId, records = []); records.push(record); }
      }
    }
    root.add(batch);
  }
  let distance = 0, ao = false;
  function visibility() {
    for (const region of regions.values()) {
      const visible = Math.abs(region.s - distance) < (ao ? aoDistance : viewDistance);
      if (visible === region.visible) continue;
      region.visible = visible;
      for (const {batch, id, targetId} of region.instances) batch.setVisibleAt(id, visible && !hidden.has(targetId));
    }
  }
  function setDestroyed(targetId, destroyed = true) {
    if (destroyed) hidden.add(targetId); else hidden.delete(targetId);
    for (const {batch, id, region} of targets.get(targetId) || []) batch.setVisibleAt(id, region.visible && !destroyed);
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; visibility(); }, setDestroyed,
    resetDestruction() { for (const id of hidden) setDestroyed(id, false); } };
}

export function batchScenery(chunks, {multiDraw = false, viewDistance = 670, aoDistance = 95, shadows = true} = {}) {
  const options = {viewDistance, aoDistance, shadows};
  return multiDraw ? multiDrawScenery(chunks, options) : chunkScenery(chunks, options);
}
