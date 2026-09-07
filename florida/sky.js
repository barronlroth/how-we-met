import * as T from 'three';

let sky;
export async function loadSkyArt() {
  sky = await new T.TextureLoader().loadAsync(new URL('./assets/textures/florida-sky-v2.png',import.meta.url).href);
  sky.colorSpace = T.SRGBColorSpace;
  sky.mapping = T.EquirectangularReflectionMapping;
}

export function makeSky(scene,renderer) {
  scene.background = sky;
  scene.backgroundIntensity = 1.0;
  scene.backgroundRotation.y = 1.2;
  const pmrem = new T.PMREMGenerator(renderer), environment = pmrem.fromEquirectangular(sky);
  scene.environment = environment.texture;
  scene.environmentRotation.y = 1.2;
  scene.environmentIntensity = .42;
  pmrem.dispose();
}
