import { BoxGeometry } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadSurfaceTextures, applySurfaceMaps, applySurfaceUVs } from './materials.js';

const NAMES = ['WaterfrontResidence', 'MarinaHotel', 'SkylineTower', 'WaterfrontClub', 'SkylineFar', 'CanopyCluster'];
const templates = new Map();
let loading;

function appendFacadeDivisions(root, boxes) {
  const structural = root.children.find(object => object.isMesh && object.material.name === 'porcelain');
  if (!structural) throw new Error(`${root.name} is missing its architectural trim.`);
  const original = structural.geometry;
  const base = original.index ? original.toNonIndexed() : original.clone();
  base.deleteAttribute('uv');
  const additions = boxes.map(([x,y,z,w,h,d]) => {
    const box = new BoxGeometry(w,h,d).translate(x,y,z);
    const flat = box.toNonIndexed();box.dispose();flat.deleteAttribute('uv');return flat;
  });
  const merged = mergeGeometries([base,...additions],false);
  if (!merged) throw new Error(`${root.name} architectural divisions could not be merged.`);
  structural.geometry=merged;
  original.dispose();base.dispose();additions.forEach(geometry=>geometry.dispose());
}

/** Refine the shared source templates once, inside their original envelopes. */
function articulateTowerFacades(scene) {
  const far=[];
  for(const x of [-7,0,7])for(const z of [-9.6,7.6])far.push([x,38,z,.2,65,.18]);
  for(const x of [-10.6,10.6])for(const z of [-6,-1,4])far.push([x,38,z,.18,65,.2]);
  appendFacadeDivisions(scene.getObjectByName('SkylineFar'),far);
  const hotel=[];
  for(const x of [-10,0,10])hotel.push([x,44,5.73,.28,74,.22]);
  for(const x of [-15.64,15.64])for(const z of [-7,-2])hotel.push([x,44,z,.22,74,.28]);
  appendFacadeDivisions(scene.getObjectByName('MarinaHotel'),hotel);
  const tower=[];
  for(let i=0;i<27;i++){
    const y=6.5+i*3.4,stage=i<18?0:i<23?1:2,width=24-stage*4,depth=18-stage*2.6;
    for(const x of [-width/2+.4,width/2-.4])tower.push([x,y+1.8,-stage*.5,.18,2.75,.16]);
    tower.push([0,y+1.66,depth/2-stage*.5-.07,width-4.8,.075,.12]);
  }
  appendFacadeDivisions(scene.getObjectByName('SkylineTower'),tower);
}

function finishWaterfrontMaterials(scene, textures) {
  const finished = new Set();
  scene.traverse(object => {
    if (!object.isMesh) return;
    const material = object.material;
    if (finished.has(material)) return;
    finished.add(material);
    switch (material.name) {
      case 'ivory':
        material.color.setHex(0xfffaf0);
        applySurfaceMaps(material, textures.plaster, { roughness: .84, bumpScale: .014, tileSize: [3.5, 3.5] });
        break;
      case 'porcelain':
        material.color.setHex(0xfffcf4);
        applySurfaceMaps(material, textures.concrete, { roughness: .54, bumpScale: .006, tileSize: [4, 4] });
        break;
      case 'sandstone':
        material.color.setHex(0xe6d6ba);
        applySurfaceMaps(material, textures.concrete, { roughness: .88, bumpScale: .025, tileSize: [4, 4] });
        break;
      case 'teak':
        material.color.setHex(0xd2b994);
        applySurfaceMaps(material, textures.teak, { roughness: .56, bumpScale: .016, tileSize: [1.8, 3.6] });
        break;
      case 'linen':
      case 'coral_canvas':
        material.color.setHex(material.name === 'linen' ? 0xfffcf0 : 0xd77d63);
        applySurfaceMaps(material, textures.cloth, { roughness: .94, bumpScale: .006, tileSize: [.8, .8] });
        break;
      case 'lagoon_glass':
        material.color.setHex(0x57858e);
        material.roughness = .25;
        material.metalness = .18;
        material.envMapIntensity = 1.15;
        break;
      case 'deep_glass':
        material.color.setHex(0x34505c);
        material.roughness = .23;
        material.metalness = .18;
        material.envMapIntensity = 1.15;
        break;
      case 'bronze':
        material.roughness = .32;
        material.metalness = .78;
        break;
    }
  });
  // Original kit has no TEXCOORD_0. Project in the loaded, game-axis transform
  // once; cloned instances continue sharing both geometry and opaque materials.
  applySurfaceUVs(scene);
}

/** Load the Blender-authored kit once before making the world. */
export function loadWaterfrontArt() {
  return loading ??= Promise.all([
    new GLTFLoader().loadAsync(new URL('./assets/models/waterfront-v1.glb', import.meta.url).href),
    loadSurfaceTextures(),
  ]).then(([{ scene }, textures]) => {
    articulateTowerFacades(scene);
    finishWaterfrontMaterials(scene, textures);
    for (const name of NAMES) {
      const template = scene.getObjectByName(name);
      if (!template) throw new Error(`Waterfront art is missing ${name}.`);
      template.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = false;
        object.receiveShadow = true;
      });
      templates.set(name, template);
    }
  });
}

/** Independent transform hierarchy; geometry and opaque materials stay shared. */
export function waterfrontAsset(name) {
  const template = templates.get(name);
  if (!template) throw new Error(`Waterfront asset ${name} was requested before loading.`);
  return template.clone(true);
}
