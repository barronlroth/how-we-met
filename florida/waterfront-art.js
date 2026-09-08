import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadSurfaceTextures, applySurfaceMaps, applySurfaceUVs } from './materials.js';

const NAMES = ['WaterfrontResidence', 'MarinaHotel', 'SkylineTower', 'WaterfrontClub', 'SkylineFar', 'CanopyCluster'];
const templates = new Map();
const glassMaterials = new Set();
const GLASS_ENV_INTENSITY = .95;
let loading;

function useGlazingOcclusion(material) {
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `
      #include <aomap_fragment>
      #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
        // Glass COLOR_0 carries sky brightness and the shaded upper reveal.
        // Base-color multiplication alone leaves reflected sky unoccluded.
        reflectedLight.indirectSpecular *= pow(clamp(vColor.b, 0.0, 1.0), 1.35);
      #endif
    `);
  };
  material.customProgramCacheKey = () => 'waterfront-glazing-occlusion-v1';
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
        material.color.setHex(0x6b899a);
        material.roughness = .14;
        material.metalness = .20;
        material.envMapIntensity = GLASS_ENV_INTENSITY;
        glassMaterials.add(material);
        break;
      case 'deep_glass':
        material.color.setHex(0x5b7588);
        material.roughness = .16;
        material.metalness = .22;
        material.envMapIntensity = GLASS_ENV_INTENSITY;
        useGlazingOcclusion(material);
        glassMaterials.add(material);
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

/** Share the installed PMREM while keeping glazing reflection strength local. */
export function bindWaterfrontEnvironment(scene) {
  if (!scene.environment) throw new Error('Waterfront glazing requires the sky environment before binding.');
  for (const material of glassMaterials) {
    material.envMap = scene.environment;
    material.envMapRotation.copy(scene.environmentRotation);
    // Three uses scene.environmentIntensity when envMap is null; an explicit
    // shared map activates this glass-only intensity without a new texture.
    material.envMapIntensity = GLASS_ENV_INTENSITY;
    material.needsUpdate = true;
  }
}

/** Load the Blender-authored kit once before making the world. */
export function loadWaterfrontArt() {
  return loading ??= Promise.all([
    new GLTFLoader().loadAsync(new URL('./assets/models/waterfront-v1.glb', import.meta.url).href),
    loadSurfaceTextures(),
  ]).then(([{ scene }, textures]) => {
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
