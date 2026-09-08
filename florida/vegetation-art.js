import { DoubleSide, ShaderChunk, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const VEGETATION_NAMES = Object.freeze([
  'PalmRoyal', 'PalmCoconut', 'HammockTree', 'SeaGrapeTree', 'HedgeCluster', 'TreeBand',
]);
const templates = new Map();
let loading;

// Reuse the directional light's already shadowed color. A second shadow lookup
// would add foliage cost, while the old unshadowed term filled the dark crown.
const directCall = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const directionalStart = ShaderChunk.lights_fragment_begin.indexOf('#if ( NUM_DIR_LIGHTS > 0 )');
const directionalEnd = ShaderChunk.lights_fragment_begin.indexOf('#if ( NUM_RECT_AREA_LIGHTS > 0 )');
if (directionalStart < 0 || directionalEnd <= directionalStart) throw new Error('Three directional-light shader layout changed.');
const directionalBlock = ShaderChunk.lights_fragment_begin.slice(directionalStart, directionalEnd);
if (!directionalBlock.includes(directCall)) throw new Error('Three directional-light response hook is missing.');
const palmLighting = ShaderChunk.lights_fragment_begin.slice(0, directionalStart)
  + directionalBlock.replace(directCall, `${directCall}
    reflectedLight.directDiffuse+=palmAtlasMask*material.diffuseColor*directLight.color*vec3(.16,.17,.10)
      *pow(max(0.0,dot(geometryNormal,-directLight.direction)),1.6);
  `)
  + ShaderChunk.lights_fragment_begin.slice(directionalEnd);

/** One atlas/material retains the broadleaf shader while shading palms in depth. */
export function configureFoliageMaterial(material) {
  if (material.userData.palmLightingVersion === 2) return material;
  material.userData.palmLightingVersion = 2;
  material.side = DoubleSide;
  material.transparent = false;
  // Four-sample composer MSAA smooths masked edges without sorted transparency.
  material.alphaToCoverage = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.leafSun = { value: new Vector3(.38, .84, .12).normalize() };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 leafSun;')
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        // glTF UVs: royal top-left and coconut bottom-right; the other two
        // quadrants keep their existing light response and shared draw bucket.
        float palmAtlasMask=1.0-abs(step(.5,vMapUv.x)-step(.5,vMapUv.y));
      `)
      .replace('#include <lights_fragment_begin>', palmLighting)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        vec3 leafLight=normalize(mat3(viewMatrix)*leafSun);
        float leafTransmission=pow(max(0.0,dot(normal,-leafLight)),1.6);
        reflectedLight.indirectDiffuse+=(1.0-palmAtlasMask)*diffuseColor.rgb*vec3(.72,.85,.25)*leafTransmission;
      `);
  };
  material.customProgramCacheKey = () => 'sun-through-leaf-v2-shadowed-palms';
  if (material.map) material.map.anisotropy = 4;
  material.needsUpdate = true;
  return material;
}

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
          if (object.material.alphaTest > 0) configureFoliageMaterial(object.material);
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
