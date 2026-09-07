import * as T from 'three';

export const DEBRIS_CAPACITY = Object.freeze({ panels: 64, planks: 64, tubes: 40 });
const FIELDS = 19;

/** Fixed GPU/CPU pools: hits recycle slots, never allocate scene objects. */
export function makeDestructionEffects(scene, { reducedMotion = false } = {}) {
  const group = new T.Group(); group.name = 'CartoonDestruction'; scene.add(group);
  const dummy = new T.Object3D();
  const colors = [0xffeed1, 0x39a9af, 0xf48772, 0xc39867, 0xffd15f, 0x83d1ca]
    .map(color => new T.Color(color));
  const pools = Object.entries(DEBRIS_CAPACITY).map(([name, capacity]) => {
    const geometry = name === 'tubes'
      ? new T.TorusGeometry(.55, .14, 6, 9, Math.PI * .72)
      : new T.BoxGeometry(1, 1, 1);
    const material = new T.MeshStandardMaterial({ roughness: .7, metalness: .03 });
    const mesh = new T.InstancedMesh(geometry, material, capacity);
    mesh.name = `Destruction_${name}`; mesh.frustumCulled = false; mesh.count = 0;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(T.DynamicDrawUsage);
    group.add(mesh);
    return { mesh, capacity, cursor: 0, data: new Float32Array(capacity * FIELDS) };
  });
  let sequence = 0;
  const random = () => {
    sequence = (Math.imul(sequence, 1664525) + 1013904223) >>> 0;
    return sequence / 4294967296;
  };

  function emit(pool, event, index, total, isTube) {
    const k = (pool.cursor++ % pool.capacity) * FIELDS, d = pool.data;
    const heading = event.heading || 0, nx = Math.cos(heading), nz = Math.sin(heading);
    const fx = Math.sin(heading), fz = -Math.cos(heading);
    const width = Math.min(6, Math.max(1, event.radius || 1.5));
    const length = Math.min(13, Math.max(1.4, event.halfLength || width * 1.5));
    const angle = index / total * Math.PI * 2 + random() * .3;
    const side = isTube ? Math.sin(angle) * width * .7 : (random() - .5) * width * 1.6;
    const forward = isTube ? Math.cos(angle) * width * .7 : (random() - .5) * length * 1.5;
    d[k] = event.x + nx * side + fx * forward;
    d[k + 1] = Math.max(.2, Math.min(2.5, event.y || .6)) + random() * .5;
    d[k + 2] = event.z + nz * side + fz * forward;
    const motion = reducedMotion ? .25 : 1;
    const spread = (2 + random() * 4) * motion;
    d[k + 3] = Math.sin(angle) * spread;
    d[k + 4] = (3 + random() * 4) * motion;
    d[k + 5] = Math.cos(angle) * spread;
    d[k + 6] = random() * Math.PI; d[k + 7] = heading + random(); d[k + 8] = random();
    d[k + 9] = reducedMotion ? 0 : (random() - .5) * 8;
    d[k + 10] = reducedMotion ? 0 : (random() - .5) * 6;
    d[k + 11] = reducedMotion ? 0 : (random() - .5) * 8;
    const size = Math.min(1.8, .7 + width * .14);
    d[k + 12] = isTube ? size : (.5 + random() * .8) * size;
    d[k + 13] = isTube ? size : .07 + random() * .06;
    d[k + 14] = isTube ? size : (pool === pools[1] ? 1.6 + random() * 1.2 : .45 + random() * .6) * size;
    d[k + 15] = 0; // age
    d[k + 16] = 2.2 + random() * .55; // lifetime, zero means free
    d[k + 17] = isTube ? 2 + index % 4 : pool === pools[1] ? 3 : index % 3;
    d[k + 18] = 0; // floating
  }

  return {
    event(event) {
      if (event.type !== 'destroy' || event.targetType === 'gator') return;
      if (!Number.isFinite(event.x) || !Number.isFinite(event.z)) return;
      const isTube = event.targetType === 'floater';
      const count = reducedMotion ? (isTube ? 5 : 9) : (isTube ? 12 : 28);
      for (let i = 0; i < count; i++) emit(isTube ? pools[2] : pools[i % 3 ? 0 : 1], event, i, count, isTube);
    },
    update(dt) {
      // A paused frame preserves matrices, color buffers, age and buoyancy exactly.
      if (!(dt > 0)) return;
      dt = Math.min(dt, .1);
      for (const pool of pools) {
        const d = pool.data; let visible = 0;
        for (let i = 0; i < pool.capacity; i++) {
          const k = i * FIELDS;
          if (!d[k + 16]) continue;
          d[k + 15] += dt;
          const age = d[k + 15], life = d[k + 16], remaining = life - age;
          if (remaining <= 0) { d[k + 16] = 0; continue; }
          d[k] += d[k + 3] * dt; d[k + 2] += d[k + 5] * dt;
          const drag = Math.exp(-(d[k + 18] ? 3.5 : .7) * dt);
          d[k + 3] *= drag; d[k + 5] *= drag;
          if (!d[k + 18]) {
            d[k + 1] += d[k + 4] * dt; d[k + 4] -= 12 * dt;
            if (d[k + 1] < .13) { d[k + 18] = 1; d[k + 4] = 0; }
          }
          if (d[k + 18]) {
            d[k + 1] = .13 + (reducedMotion ? 0 : Math.sin(age * 4 + i) * .045);
            d[k + 9] *= drag; d[k + 10] *= drag; d[k + 11] *= drag;
          }
          d[k + 6] += d[k + 9] * dt; d[k + 7] += d[k + 10] * dt; d[k + 8] += d[k + 11] * dt;
          const fade = Math.min(1, remaining / .5);
          dummy.position.set(d[k], d[k + 1] - (1 - fade) * .55, d[k + 2]);
          dummy.rotation.set(d[k + 6], d[k + 7], d[k + 8]);
          dummy.scale.set(d[k + 12] * fade, d[k + 13] * fade, d[k + 14] * fade);
          dummy.updateMatrix(); pool.mesh.setMatrixAt(visible, dummy.matrix);
          pool.mesh.setColorAt(visible, colors[d[k + 17]]); visible++;
        }
        pool.mesh.count = visible;
        pool.mesh.instanceMatrix.needsUpdate = pool.mesh.instanceColor.needsUpdate = true;
      }
    },
    reset() {
      for (const pool of pools) { pool.data.fill(0); pool.cursor = 0; pool.mesh.count = 0; }
      sequence = 0;
    },
  };
}
