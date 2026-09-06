import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {flamingo, textSign} from './art.js';

let template;
export async function loadHeroArt() {
  const gltf = await new GLTFLoader().loadAsync('./assets/models/airboat-couple-v5.glb');
  template = gltf.scene;
}
export function heroAirboat() {
  const root = template.clone(true);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const fan = root.getObjectByName('Fan'), nina = root.getObjectByName('Nina');
  const barron = root.getObjectByName('Barron'), hull = root.getObjectByName('Hull');
  const arm = root.getObjectByName('PointingArm');
  if (!fan || !nina || !barron || !hull || !arm) throw new Error('The airboat asset is missing an animation node.');
  nina.userData.arm = arm;
  const floatie = flamingo(true); floatie.visible = false; root.add(floatie);
  const label = textSign('BARRON + NINA',1.8,.23,{font:'900 80px Nunito',bg:'#f7eac9',color:'#1c6566',border:null});
  label.position.set(0,.38,3.08);root.add(label);
  root.userData = {fan,nina,barron,hull,floatie};
  return root;
}
