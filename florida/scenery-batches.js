import * as T from 'three';

function foliageAOVisibility(root) {
  // SSAOPass's normal override has no alpha mask, so leaf cards would write
  // solid rectangles into depth. Only omit them for AO; retain the solid wood.
  const foliage = [];
  root.traverse(mesh => { if (mesh.isMesh && mesh.material.alphaTest > 0) foliage.push(mesh); });
  let savedVisibility = null;
  return enabled => {
    if (enabled) {
      if (savedVisibility) return;
      savedVisibility = foliage.map(mesh => mesh.visible);
      for (const mesh of foliage) mesh.visible = false;
    } else if (savedVisibility) {
      foliage.forEach((mesh, i) => { mesh.visible = savedVisibility[i]; });
      savedVisibility = null;
    }
  };
}

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
  let targetsVisible = true;
  function syncTarget(targetId) {
    const visible = targetsVisible && !hidden.has(targetId);
    for (const {mesh, i, matrix} of targets.get(targetId) || []) {
      mesh.setMatrixAt(i, visible ? matrix : zero); mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function setDestroyed(targetId, destroyed = true) {
    if (destroyed) hidden.add(targetId); else hidden.delete(targetId);
    syncTarget(targetId);
  }
  function setTargetsVisible(visible) {
    if (targetsVisible === Boolean(visible)) return;
    targetsVisible = Boolean(visible);
    for (const targetId of targets.keys()) syncTarget(targetId);
  }
  const setFoliageAO = foliageAOVisibility(root);
  let distance = 0, ao = false;
  function visibility() {
    for (const chunk of chunks) chunk.visible = Math.abs(chunk.userData.s - distance) < (ao ? aoDistance : viewDistance);
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; setFoliageAO(enabled); visibility(); }, setDestroyed, setTargetsVisible,
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
    const geometries = [...entry.geometries.keys()];
    const indexed = geometries.some(geometry => geometry.index !== null);
    const vertices = geometries.reduce((sum, geometry) => sum + geometry.attributes.position.count, 0);
    const indices = indexed ? geometries.reduce((sum, geometry) => sum + (geometry.index?.count ?? geometry.attributes.position.count), 0) : 0;
    const batch = new T.BatchedMesh(entry.capacity, vertices, indices, material);
    batch.castShadow = batch.receiveShadow = shadows;
    batch.frustumCulled = false; // Per-object culling runs separately for every camera/pass.
    batch.sortObjects = material.transparent;
    for (const geometry of geometries) {
      // Preserve authored vertex sharing, including normal/UV seams. BatchedMesh
      // requires a consistent index layout within one material bucket, so only
      // mixed buckets need a sequential index for their procedural triangle soup.
      // Keep the source geometry untouched because other instances share it.
      let source = geometry;
      if (indexed && !geometry.index) {
        source = geometry.clone();
        const count = source.attributes.position.count;
        const IndexArray = count > 65535 ? Uint32Array : Uint16Array;
        source.setIndex(new T.BufferAttribute(IndexArray.from({length: count}, (_, i) => i), 1));
      }
      entry.geometries.set(geometry, batch.addGeometry(source));
      if (source !== geometry) source.dispose();
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
  const setFoliageAO = foliageAOVisibility(root);
  let distance = 0, ao = false, targetsVisible = true;
  function visibility() {
    for (const region of regions.values()) {
      const visible = Math.abs(region.s - distance) < (ao ? aoDistance : viewDistance);
      if (visible === region.visible) continue;
      region.visible = visible;
      for (const {batch, id, targetId} of region.instances) batch.setVisibleAt(id, visible && !hidden.has(targetId) && (targetsVisible || !targetId));
    }
  }
  function setDestroyed(targetId, destroyed = true) {
    if (destroyed) hidden.add(targetId); else hidden.delete(targetId);
    for (const {batch, id, region} of targets.get(targetId) || []) batch.setVisibleAt(id, region.visible && !destroyed && targetsVisible);
  }
  function setTargetsVisible(visible) {
    if (targetsVisible === Boolean(visible)) return;
    targetsVisible = Boolean(visible);
    for (const [targetId, records] of targets) {
      for (const {batch, id, region} of records) batch.setVisibleAt(id, region.visible && !hidden.has(targetId) && targetsVisible);
    }
  }
  return { root, update(s) { distance = s; visibility(); }, setAO(enabled) { ao = enabled; setFoliageAO(enabled); visibility(); }, setDestroyed, setTargetsVisible,
    resetDestruction() { for (const id of hidden) setDestroyed(id, false); } };
}

export function batchScenery(chunks, {multiDraw = false, viewDistance = 670, aoDistance = 95, shadows = true} = {}) {
  const options = {viewDistance, aoDistance, shadows};
  return multiDraw ? multiDrawScenery(chunks, options) : chunkScenery(chunks, options);
}
