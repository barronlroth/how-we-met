import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let template;
let loading;

/** Load the original Blender yacht before the waterfront is constructed. */
export function loadYachtArt() {
  return loading ??= new GLTFLoader()
    .loadAsync(new URL('./assets/models/superyacht-v1.glb', import.meta.url).href)
    .then(({ scene }) => {
      template = scene.getObjectByName('Superyacht');
      if (!template) throw new Error('Yacht art is missing Superyacht.');
      template.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
    });
}

/** Metres, Y up, bow -Z; clones share all six materials and mesh resources. */
export function yachtAsset() {
  if (!template) throw new Error('Yacht art was requested before loading.');
  return template.clone(true);
}
