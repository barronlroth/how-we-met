import {BufferGeometry, BufferAttribute} from 'three';

// Baked static models repeat identical vertices for both triangles of each
// face. Reuse only exact attribute tuples: UV seams and hard normals stay split.
export function indexExactGeometry(source) {
  if (source.index || Object.keys(source.morphAttributes).length) return source;
  const attributes = Object.entries(source.attributes);
  if (attributes.some(([, a]) => a.isInterleavedBufferAttribute || a.isInstancedBufferAttribute)) return source;
  const count = source.attributes.position.count, unique = new Map(), representatives = [], indices = [];
  for (let i = 0; i < count; i++) {
    let key = '';
    for (const [, attribute] of attributes) {
      const offset = i * attribute.itemSize;
      for (let k = 0; k < attribute.itemSize; k++) {
        const value = attribute.array[offset + k];
        key += (Object.is(value, -0) ? '-0' : String(value)) + ',';
      }
    }
    let index = unique.get(key);
    if (index === undefined) {
      index = representatives.length; unique.set(key, index); representatives.push(i);
    }
    indices.push(index);
  }
  if (representatives.length === count) return source;
  const result = new BufferGeometry();
  for (const [name, attribute] of attributes) {
    const array = new attribute.array.constructor(representatives.length * attribute.itemSize);
    representatives.forEach((original, i) => {
      const offset = original * attribute.itemSize;
      array.set(attribute.array.subarray(offset, offset + attribute.itemSize), i * attribute.itemSize);
    });
    const packed = new BufferAttribute(array, attribute.itemSize, attribute.normalized);
    packed.name = attribute.name; packed.setUsage(attribute.usage); packed.gpuType = attribute.gpuType;
    result.setAttribute(name, packed);
  }
  result.setIndex(indices);
  result.name = source.name; result.userData = {...source.userData};
  result.groups = source.groups.map(group => ({...group}));
  result.setDrawRange(source.drawRange.start, source.drawRange.count);
  result.boundingBox = source.boundingBox?.clone() ?? null;
  result.boundingSphere = source.boundingSphere?.clone() ?? null;
  return result;
}
