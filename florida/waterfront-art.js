import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NAMES = ['WaterfrontResidence', 'MarinaHotel', 'SkylineTower', 'WaterfrontClub', 'SkylineFar', 'CanopyCluster'];
const templates = new Map();
let loading;

/** Load the Blender-authored kit once before making the world. */
export function loadWaterfrontArt() {
  return loading ??= new GLTFLoader()
    .loadAsync(new URL('./assets/models/waterfront-v1.glb', import.meta.url).href)
    .then(({ scene }) => {
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
