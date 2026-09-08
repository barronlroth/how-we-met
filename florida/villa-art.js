import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadSurfaceTextures, applySurfaceMaps, applySurfaceUVs } from './materials.js';

const templates = new Map();
let loading;

/** Four Blender-authored houses retain the previous variant scale and +Z frontage. */
export function loadVillaArt() {
  return loading ??= Promise.all([
    new GLTFLoader().loadAsync(new URL('./assets/models/villas-v1.glb', import.meta.url).href),
    loadSurfaceTextures(),
  ]).then(([{ scene }, textures]) => {
    const finished = new Set();
    scene.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = object.receiveShadow = true;
      const material = object.material;
      if (finished.has(material)) return;
      finished.add(material);
      switch (material.name) {
        case 'VillaStucco':
          material.color.setHex(0xfffaf0);
          applySurfaceMaps(material, textures.plaster, { roughness: .85, bumpScale: .018, tileSize: [3.5, 3.5] });
          break;
        case 'VillaTrim':
          material.color.setHex(0xfffcf4);
          applySurfaceMaps(material, textures.concrete, { roughness: .7, bumpScale: .009, tileSize: [4, 4] });
          break;
        case 'VillaTerracotta':
          material.color.setHex(0xffead7);
          applySurfaceMaps(material, textures.tile, { roughness: .86, bumpScale: .014, tileSize: [2.6, 2.7] });
          // Authored roof UVs follow the underlying roof plane through each
          // curved clay cap; normal-based projection would split its texture.
          delete material.userData.surfaceTileSize;
          break;
        case 'VillaTeak':
          material.color.setHex(0xd2b994);
          applySurfaceMaps(material, textures.teak, { roughness: .7, bumpScale: .014, tileSize: [1.8, 3.6] });
          break;
      case 'VillaGlass':
          material.color.setHex(0x314b56);
          material.roughness = .25;
          material.metalness = .08;
          material.envMapIntensity = .9;
          material.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <aomap_fragment>', `
              #include <aomap_fragment>
              #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
                reflectedLight.indirectSpecular *= pow(clamp(vColor.b, 0.0, 1.0), 1.2);
              #endif
            `);
          };
          material.customProgramCacheKey = () => 'villa-reveal-occlusion-v1';
          break;
      }
    });
    applySurfaceUVs(scene);
    for (let variant = 0; variant < 4; variant++) {
      const name = `WaterfrontVilla${variant}`, root = scene.getObjectByName(name);
      if (!root) throw new Error(`Villa art is missing ${name}.`);
      templates.set(variant, root);
    }
  });
}

/** Independent transforms with shared geometry, opaque materials and image maps. */
export function villaAsset(variant = 0) {
  const index = ((variant % 4) + 4) % 4, template = templates.get(index);
  if (!template) throw new Error(`Villa ${variant} was requested before loading.`);
  return template.clone(true);
}
