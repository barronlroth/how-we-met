import * as T from 'three';
import {objectX, pointAt} from './core.js';

// One shared pair of draws; only damaged, nearby targets get a health marker.
export function makeTargetHealth(scene) {
  const limit = 32, geometry = new T.PlaneGeometry(1, 1);
  const markerMaterial = color => new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false,fog:false});
  const back = new T.InstancedMesh(geometry, markerMaterial(0x102e36), limit);
  const fill = new T.InstancedMesh(geometry, markerMaterial(0xffffff), limit);
  back.name = 'target-health-backs'; fill.name = 'target-health-fill';
  back.frustumCulled = fill.frustumCulled = false;
  back.renderOrder = 20; fill.renderOrder = 21;
  back.count = fill.count = 0; scene.add(back, fill);
  const dummy = new T.Object3D(), right = new T.Vector3(), front = new T.Vector3(), color = new T.Color();
  return {update(race, camera) {
    let count = 0;
    if (['racing', 'paused'].includes(race.status)) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      front.set(0, 0, 1).applyQuaternion(camera.quaternion);
      for (let i = 0; i < race.objects.length + race.rivals.length && count < limit; i++) {
        const rival = i >= race.objects.length, o = rival ? race.rivals[i-race.objects.length] : race.objects[i];
        if (o.destroyed || !(o.hp > 0 && o.hp < o.maxHp) || o.s < race.s-8 || o.s > race.s+120) continue;
        const p = pointAt(o.s, rival ? o.x : objectX(o, race.elapsed));
        const width = rival ? 3.8 : o.type === 'mooring' || o.type === 'yacht' ? 6.4 : 3.2;
        const height = rival ? 2.6 : ({gator:1.6, floater:3.5, taxi:5, mooring:o.model==='super'?7:3.6, yacht:9}[o.type] || 4);
        const health = o.hp/o.maxHp;
        dummy.quaternion.copy(camera.quaternion); dummy.position.set(p.x, height, p.z);
        dummy.scale.set(width+.32, .65, 1); dummy.updateMatrix(); back.setMatrixAt(count, dummy.matrix);
        dummy.position.addScaledVector(right, -width*(1-health)/2).addScaledVector(front, .035);
        dummy.scale.set(width*health, .31, 1); dummy.updateMatrix(); fill.setMatrixAt(count, dummy.matrix);
        color.setHex(o.damageFlash > 0 ? 0xffffff : health <= .34 ? 0xff875f : 0xffd75d); fill.setColorAt(count, color);
        count++;
      }
    }
    back.count = fill.count = count;
    if (count) { back.instanceMatrix.needsUpdate = fill.instanceMatrix.needsUpdate = true; fill.instanceColor.needsUpdate = true; }
  }};
}
