import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const NAMES = ['BridgeCauseway', 'FisheriesRestaurant'];
const templates = new Map();
let loading;

/** Load the original Blender landmarks before constructing the waterfront. */
export function loadLandmarkArt() {
  return loading ??= new GLTFLoader()
    .loadAsync(new URL('./assets/models/landmarks-v1.glb', import.meta.url).href)
    .then(({ scene }) => {
      for (const name of NAMES) {
        const template = scene.getObjectByName(name);
        if (!template) throw new Error(`Landmark art is missing ${name}.`);
        template.traverse(object => {
          if (!object.isMesh) return;
          object.castShadow = true;
          object.receiveShadow = true;
        });
        templates.set(name, template);
      }
    });
}

/** Both roots use metres/Y-up; the restaurant's waterfront face is +Z. */
export function landmarkAsset(name) {
  const template = templates.get(name);
  if (!template) throw new Error(`Landmark ${name} was requested before loading.`);
  return template.clone(true);
}
