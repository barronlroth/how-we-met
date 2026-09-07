import { DoubleSide } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const VEGETATION_NAMES = Object.freeze([
  'PalmRoyal', 'PalmCoconut', 'HammockTree', 'SeaGrapeTree', 'HedgeCluster', 'TreeBand',
]);
const templates = new Map();
let loading;

/** Load six metre-scale, Y-up Blender templates and one shared leaf atlas. */
export function loadVegetationArt() {
  return loading ??= new GLTFLoader()
    .loadAsync(new URL('./assets/models/vegetation-v1.glb', import.meta.url).href)
    .then(({ scene }) => {
      for (const name of VEGETATION_NAMES) {
        const template = scene.getObjectByName(name);
        if (!template) throw new Error(`Vegetation art is missing ${name}.`);
        template.traverse(object => {
          if (!object.isMesh) return;
          object.castShadow = name !== 'TreeBand';
          object.receiveShadow = true;
          if (object.material.alphaTest > 0) {
            object.material.side = DoubleSide;
            object.material.transparent = false;
            // MSAA smooths the alpha-tested leaflet edges; no sorting or blend
            // overdraw is needed in the repeated shoreline vegetation batches.
            object.material.alphaToCoverage = true;
            if (object.material.map) object.material.map.anisotropy = 4;
          }
        });
        templates.set(name, template);
      }
    });
}

/** Hierarchies are independent; every clone reuses geometry/material/texture. */
export function vegetationAsset(name) {
  const template = templates.get(name);
  if (!template) throw new Error(`Vegetation asset ${name} was requested before loading.`);
  return template.clone(true);
}
