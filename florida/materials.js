import * as T from 'three';
import {indexExactGeometry} from './index-geometry.js';

let texturesLoading;

function repeatingTexture(image, name, colorSpace = T.SRGBColorSpace, wrap = T.RepeatWrapping) {
  const texture = new T.CanvasTexture(image);
  texture.name = name;
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = wrap;
  texture.anisotropy = 8;
  return texture;
}

// Each cell becomes its own image before mipmaps are made. Atlas offsets with
// RepeatWrapping would repeat the entire atlas and leak neighboring materials.
function atlasCell(image, column, row, name, size = 512, wrap = T.MirroredRepeatWrapping) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const width = image.width / 2, height = image.height / 2;
  context.drawImage(image, column * width + 1, row * height + 1, width - 2, height - 2, 0, 0, size, size);
  return surfaceMaps(canvas, name, wrap);
}

function surfaceMaps(image, name, wrap = T.RepeatWrapping) {
  const map = repeatingTexture(image, `${name} color`, T.SRGBColorSpace, wrap);
  const bump = repeatingTexture(image, `${name} relief`, T.NoColorSpace, wrap);
  // Surface-derived, subdued roughness variation. It is linear data, not color.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, 256, 256);
  const pixels = context.getImageData(0, 0, 256, 256);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const luma = .2126 * pixels.data[i] + .7152 * pixels.data[i + 1] + .0722 * pixels.data[i + 2];
    const value = Math.round(220 + luma * .13);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  return { map, bump, roughness: repeatingTexture(canvas, `${name} roughness`, T.NoColorSpace, wrap) };
}

/** One shared, original texture set for procedural and Blender waterfront art. */
export function loadSurfaceTextures() {
  return texturesLoading ??= Promise.all([
    new T.ImageLoader().loadAsync(new URL('./assets/textures/coastal-materials-v1.png', import.meta.url).href),
    new T.ImageLoader().loadAsync(new URL('./assets/teak-v2.png', import.meta.url).href),
    new T.ImageLoader().loadAsync(new URL('./assets/textures/coastal-ground-v1.png', import.meta.url).href),
  ]).then(([atlas, deck, ground]) => ({
    plaster: atlasCell(atlas, 0, 0, 'Coastal stucco'),
    tile: atlasCell(atlas, 1, 0, 'Barrel terracotta', 1024, T.RepeatWrapping),
    cloth: atlasCell(atlas, 0, 1, 'Ivory linen'),
    concrete: atlasCell(atlas, 1, 1, 'Cast concrete'),
    teak: surfaceMaps(deck, 'Varnished teak'),
    lawn: atlasCell(ground,0,0,'Subtropical lawn'),
    soil: atlasCell(ground,1,0,'Damp mangrove earth'),
    sand: atlasCell(ground,0,1,'Coastal shell sand'),
  }));
}

export function applySurfaceMaps(material, maps, { roughness = .7, bumpScale = .018, tileSize = [3, 3] } = {}) {
  material.map = maps.map;
  material.bumpMap = maps.bump;
  material.bumpScale = bumpScale;
  material.roughnessMap = maps.roughness;
  material.roughness = roughness;
  material.userData.surfaceTileSize = tileSize;
  material.needsUpdate = true;
  return material;
}

/** Generate UV seams per face without changing positions, normals or triangles. */
export function applySurfaceUVs(root) {
  root.updateMatrixWorld(true);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const ab = new T.Vector3(), ac = new T.Vector3(), normal = new T.Vector3();
  root.traverse(mesh => {
    const tileSize = mesh.material?.userData.surfaceTileSize;
    if (!mesh.isMesh || !tileSize) return;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    const position = geometry.getAttribute('position');
    const uv = new T.Float32BufferAttribute(new Float32Array(position.count * 2), 2);
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, i + 1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, i + 2).applyMatrix4(mesh.matrixWorld);
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      const x = Math.abs(normal.x), y = Math.abs(normal.y), z = Math.abs(normal.z);
      for (const [j, p] of [a, b, c].entries()) {
        const u = x > y && x > z ? p.z : p.x;
        const v = y >= x && y >= z ? p.z : p.y;
        uv.setXY(i + j, u / tileSize[0], v / tileSize[1]);
      }
    }
    geometry.setAttribute('uv', uv);
    // UV projection temporarily splits triangle corners. Restore exact sharing
    // afterward, keeping every UV seam and hard normal as its own vertex.
    mesh.geometry = indexExactGeometry(geometry);
    if (mesh.geometry !== geometry) geometry.dispose();
  });
  return root;
}

export function surfaceMaterials(textures) {
  const make = (name, color, options = {}) => new T.MeshStandardMaterial({ name, color, roughness: .7, ...options });
  const mapped = (name, color, maps, options) => applySurfaceMaps(make(name, color), maps, options);
  return {
    wall: [0xfffcf3, 0xf1d8c7, 0xe4ecdf, 0xeadace].map((color, i) => mapped(`Villa stucco ${i}`, color, textures.plaster, { roughness: .84, bumpScale: .014, tileSize: [3.5, 3.5] })),
    roof: mapped('Sun-warmed terracotta', 0xffead7, textures.tile, { roughness: .8, bumpScale: .078, tileSize: [2.6, 2.7] }),
    leaf: [0x719346, 0x58782d, 0x8c9b43].map((color, i) => make(`Legacy canopy ${i}`, color, { roughness: .9 })),
    cloth: mapped('Ivory woven upholstery', 0xfffcf5, textures.cloth, { roughness: .94, bumpScale: .006, tileSize: [.8, .8] }),
    teak: mapped('Varnished marine teak', 0xead8bd, textures.teak, { roughness: .43, bumpScale: .014, tileSize: [1.8, 3.6] }),
    concrete: mapped('Pale cast concrete', 0xfffcf7, textures.concrete, { roughness: .86, bumpScale: .018, tileSize: [4, 4] }),
    lawn: applySurfaceMaps(make('Island lawn',0xb8c6a4,{vertexColors:true}),textures.lawn,{roughness:1,bumpScale:.016,tileSize:[2,2]}),
    soil: applySurfaceMaps(make('Mangrove island soil',0xd0cbbb,{vertexColors:true}),textures.soil,{roughness:1,bumpScale:.020,tileSize:[2,2]}),
    sand: applySurfaceMaps(make('Island shell shoreline',0xb9b4a7,{vertexColors:true}),textures.sand,{roughness:.95,bumpScale:.010,tileSize:[2,2]}),
    white: make('Warm white marine enamel', 0xfffcf2, { roughness: .27, metalness: .03 }),
    // Opaque dielectric glazing keeps the cool reflection readable under broad
    // overhangs; a highly metallic approximation turned shaded windows black.
    glass: make('Blue-gray shaded glazing', 0x34515d, { roughness: .22, metalness: .2, envMapIntensity: 1.15 }),
    trim: make('Limestone architectural trim', 0xf4ead4, { roughness: .66 }),
    reveal: make('Window recess', 0x293c40, { roughness: .85 }),
    metal: make('Brushed stainless steel', 0xaebbb8, { roughness: .3, metalness: .88 }),
    rubber: make('Marine rubber', 0x25332f, { roughness: .9 }),
    coral: make('Coral marine enamel', 0xd66c51, { roughness: .32, metalness: .06 }),
    aqua: make('Turquoise marine enamel', 0x237b7d, { roughness: .3, metalness: .08 }),
  };
}
