import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Original game art. Every scene object is real geometry, built in a shared
// palette and baked by material so a richly dressed waterfront stays light.
export const C = { cream: 0xfff4d8, coral: 0xee7865, teal: 0x359d9d, navy: 0x173e4b, roof: 0xc77450, pink: 0xf77ca7, leaf: 0x53935c, leafLight: 0x7ab467, trunk: 0xa28157, skin: 0xe8b28a, skinNina: 0xe7af86, hair: 0x644026, blonde: 0xb17a3d, wood: 0xc99e6b, dark: 0x2c403e, white: 0xfffcf1, gold: 0xffd765 };
const materials = new Map();
export function mat(color, options = {}) {
  const key = `${color}:${JSON.stringify(options)}`;
  if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, flatShading: false, roughness: 0.62, ...options }));
  return materials.get(key);
}
function put(g, geo, color, x = 0, y = 0, z = 0, options = {}) {
  const m = new T.Mesh(geo, typeof color === 'number' ? mat(color, options) : color);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
}
export const box = (g, w, h, d, color, x = 0, y = 0, z = 0) => put(g, Math.min(w,h,d)>.12&&Math.max(w,h,d)<10?new RoundedBoxGeometry(w,h,d,1,Math.min(.065,Math.min(w,h,d)*.18)):new T.BoxGeometry(w,h,d), color, x, y, z);
export function ball(g, x, y, z, sx, sy, sz, color, detail = 1) { const m = put(g, new T.IcosahedronGeometry(1, detail), color, x, y, z); m.scale.set(sx, sy, sz); return m; }
export function pipe(g, from, to, radius, color, sides = 7) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to), d = b.clone().sub(a);
  const m = put(g, new T.CylinderGeometry(radius, radius, d.length(), sides), color);
  m.position.copy(a.add(b).multiplyScalar(0.5)); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
}
export function ring(g, radius, tube, color, x = 0, y = 0, z = 0, horizontal = false) {
  const m = put(g, new T.TorusGeometry(radius, tube, 7, 32), color, x, y, z); if (horizontal) m.rotation.x = Math.PI / 2; return m;
}
function cone(g, radius, h, color, x, y, z, sides = 8) { return put(g, new T.ConeGeometry(radius, h, sides), color, x, y, z); }
function cylinder(g, r, h, color, x, y, z, sides = 10) { return put(g, new T.CylinderGeometry(r, r, h, sides), color, x, y, z); }
function poly(g, verts, indices, color) {
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(verts.flat(), 3)); geo.setIndex(indices); geo.computeVertexNormals();
  geo.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(verts.length * 2), 2)); return put(g, geo, color);
}
export function bake(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const clean = geo.index ? geo.toNonIndexed() : geo;
    if (!clean.getAttribute('normal')) clean.computeVertexNormals();
    if (!clean.getAttribute('uv')) clean.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(clean.getAttribute('position').count * 2), 2));
    for (const name of Object.keys(clean.attributes)) if (!['position', 'normal', 'uv'].includes(name)) clean.deleteAttribute(name);
    const entry = buckets.get(o.material) || []; entry.push(clean); buckets.set(o.material, entry);
  });
  const result = new T.Group();
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error('Could not bake game geometry');
    const mesh = new T.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; result.add(mesh);
    for (const geometry of geometries) geometry.dispose();
  }
  return result;
}

export function textSign(text, width, height, { color = '#143f4c', bg = '#fff8e2', font = '900 70px Nunito', border = '#e17c5f' } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 256);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 12; ctx.strokeRect(10, 10, 1004, 236); }
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 133, 940);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: texture, roughness: 0.85, side: T.DoubleSide }));
}

function head(g, nina, x, y, z) {
  const skin = nina ? C.skinNina : C.skin;
  ball(g, x, y, z, .30, .38, .29, skin, 2);
  ball(g, x, y + .23, z + .02, .34, .25, .31, nina ? C.blonde : C.hair, 1);
  box(g, .12, .13, .12, skin, x, y - .02, z - .31);
  for (const dx of [-.13, .13]) { box(g, .1, .065, .018, C.white, x + dx, y + .035, z - .277); box(g, .045, .065, .021, 0x263c38, x + dx, y + .032, z - .29); }
  box(g, .105, .025, .02, 0x9f5550, x, y - .16, z - .29);
  for (const dx of [-.32, .32]) ball(g, x + dx, y - .015, z, .07, .1, .07, skin, 0);
  if (nina) {
    for (let i = 0; i < 17; i++) {
      const xx = x + (i - 8) * .038;
      const points=Array.from({length:7},(_,j)=>new T.Vector3(xx+Math.sin(j*1.4+i*.5)*.045,y+.24-j*.155,z+.17+Math.sin(j*.6)*.15));
      put(g,new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.044+(i%3)*.012,5,false),i%3?0xb47a39:0xdbad67);
    }
    ball(g, x - .27, y + .025, z + .02, .12, .4, .22, C.blonde);
  } else {
    for (let i = 0; i < 6; i++) ball(g, x + Math.sin(i * 2) * .23, y + .31 + (i % 2) * .08, z + Math.cos(i * 2) * .19, .17, .18, .17, i % 2 ? C.hair : 0x785333, 0);
    // Sunglasses are modeled rather than drawn on the face.
    for (const dx of [-.14, .14]) box(g, .22, .115, .03, C.navy, x + dx, y + .015, z - .31);
    box(g, .09, .025, .03, C.navy, x, y + .025, z - .33);
  }
}

export function person(nina = false) {
  const root = new T.Group(), fixed = new T.Group(), arm = new T.Group();
  const skin = nina ? C.skinNina : C.skin;
  if (nina) {
    ball(fixed, 0, .78, 0, .28, .37, .18, skin);
    ball(fixed, -.14, .98, -.16, .17, .12, .105, C.coral); ball(fixed, .14, .98, -.16, .17, .12, .105, C.coral);
    pipe(fixed, [-.2, 1.04, -.12], [-.23, 1.2, .06], .025, C.coral); pipe(fixed, [.2, 1.04, -.12], [.23, 1.2, .06], .025, C.coral);
    ball(fixed, 0, .48, -.015, .32, .17, .24, C.coral);
  } else {
    box(fixed, .65, .69, .37, C.cream, 0, .88, 0);
    box(fixed, .2, .55, .025, C.skin, 0, .95, -.2);
    for (const x of [-.25, .25]) pipe(fixed, [x, 1.19, -.22], [x * .28, .92, -.22], .035, C.wood);
    box(fixed, .67, .25, .45, C.teal, 0, .43, -.06);
    for (let i = 0; i < 9; i++) { const leaf = box(fixed, .06, .1, .012, i % 2 ? C.coral : C.teal, Math.sin(i * 3) * .25, .66 + (i % 4) * .13, -.2); leaf.rotation.z = i; }
  }
  head(fixed, nina, 0, 1.49, -.01);
  for (const x of [-.2, .2]) {
    pipe(fixed, [x, .44, -.02], [x, .37, -.62], nina ? .135 : .16, skin);
    pipe(fixed, [x, .37, -.62], [x, -.13, -.64], .11, skin);
    box(fixed, .25, .09, .36, nina ? C.wood : C.navy, x, -.16, -.74);
  }
  pipe(fixed, [-.31, 1.08, 0], [-.44, .74, -.1], .105, skin);
  pipe(fixed, [-.44, .74, -.1], [-.36, .56, -.4], .09, skin);
  if (nina) {
    arm.position.set(.32, 1.08, 0);
    pipe(arm, [0, 0, 0], [.22, .08, -.26], .09, skin);
    pipe(arm, [.22, .08, -.26], [.38, .25, -.55], .075, skin);
    pipe(arm, [.38, .25, -.55], [.45, .29, -.75], .035, skin, 5);
    ball(arm, .38, .25, -.56, .09, .07, .1, skin, 0);
  } else {
    pipe(fixed, [.32, 1.07, 0], [.45, .85, -.32], .11, C.cream);
    pipe(fixed, [.45, .85, -.32], [.3, .77, -.68], .09, skin);
  }
  root.add(bake(fixed)); root.add(arm); root.userData.arm = arm; return root;
}

export function airboat() {
  const root = new T.Group(), fixed = new T.Group();
  const shape = new T.Shape();
  shape.moveTo(-1.38, -2.65); shape.lineTo(1.38, -2.65); shape.lineTo(1.45, 1.9); shape.quadraticCurveTo(1.3, 2.9, .52, 3.13); shape.lineTo(-.52, 3.13); shape.quadraticCurveTo(-1.3, 2.9, -1.45, 1.9); shape.closePath();
  const hull = new T.ExtrudeGeometry(shape, { depth: .52, bevelEnabled: true, bevelSize: .12, bevelThickness: .13, bevelSegments: 3, steps: 1 }); hull.rotateX(-Math.PI / 2);
  put(fixed, hull, C.cream, 0, .1, 0);
  box(fixed, 2.52, .14, 4.85, C.wood, 0, .64, -.05);
  for (let z = -2.28; z < 2.4; z += .35) box(fixed, 2.46, .018, .023, 0xaa845d, 0, .72, z);
  for (const side of [-1, 1]) {
    box(fixed, .13, .3, 4.95, C.coral, side * 1.35, .78, .05);
    pipe(fixed, [side * 1.27, 1.02, 1.85], [side * 1.27, 1.02, -.8], .035, C.cream);
    for (const z of [-.8, .4, 1.85]) pipe(fixed, [side * 1.27, .75, z], [side * 1.27, 1.02, z], .035, C.cream);
    box(fixed, .025, .17, 2.3, C.teal, side * 1.51, .32, 0);
  }
  box(fixed, 1.55, .18, .68, C.cream, 0, 1.03, -1.76);
  box(fixed, 1.5, .1, .62, 0xd4dfc5, 0, 1.15, -1.76);
  for (const x of [-.57, .57]) pipe(fixed, [x, .7, -1.76], [x, 1.03, -1.76], .06, C.navy);
  box(fixed, .87, .17, .78, C.navy, 0, 1.57, .2);
  box(fixed, .87, .72, .15, C.teal, 0, 1.88, .56);
  for (const x of [-.34, .34]) pipe(fixed, [x, .72, .5], [x, 1.52, .28], .045, C.navy);
  box(fixed, .84, .38, .5, C.teal, 0, 1.99, -.75);
  ring(fixed, .28, .034, C.navy, 0, 2.34, -.68).rotation.x = -.4;
  pipe(fixed, [0, 2.05, -.73], [0, 2.33, -.68], .045, C.navy);
  box(fixed, .75, .6, .8, C.teal, 0, 1.3, 1.83);
  for (const x of [-.43, .43]) { cylinder(fixed, .15, .48, C.navy, x, 1.38, 1.87); pipe(fixed, [x, .7, 1.45], [x, 2.12, 2.14], .07, C.coral); }
  const fan = new T.Group(); fan.position.set(0, 2.22, 2.13);
  for (const z of [1.94, 2.31]) ring(fixed, 1.43, .04, C.coral, 0, 2.22, z);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; const x = Math.cos(a) * 1.43, y = Math.sin(a) * 1.43 + 2.22; pipe(fixed, [0, 2.22, 2.34], [x, y, 2.31], .018, C.navy, 5); pipe(fixed, [x, y, 1.94], [x, y, 2.31], .02, C.coral, 5); }
  for (let i = 0; i < 3; i++) { const blade = ball(fan, 0, .64, 0, .17, .68, .05, C.navy, 1); const pivot = new T.Group(); fan.remove(blade); pivot.add(blade); pivot.rotation.z = i * Math.PI * 2 / 3; fan.add(pivot); }
  ball(fan, 0, 0, -.02, .17, .17, .16, C.cream);
  box(fixed, .57, .4, .46, C.coral, -.83, .96, 1.05); box(fixed, .6, .08, .5, C.cream, -.83, 1.2, 1.05);
  ring(fixed, .23, .06, C.wood, .65, .77, -2.28, true);
  const label = textSign('BARRON + NINA', 1.64, .32, { font: '900 80px Nunito', border: null }); label.position.set(0, .52, -3.02); label.rotation.y = Math.PI; fixed.add(label);
  root.add(bake(fixed)); root.add(fan);
  const barron = person(false); barron.position.set(0, 1.59, -.02); root.add(barron);
  const nina = person(true); nina.position.set(.16, 1.16, -1.91); nina.rotation.y = -.16; root.add(nina);
  const floatie = flamingo(true); floatie.position.set(0, .67, -.1); floatie.visible = false; root.add(floatie);
  root.userData = { fan, nina, barron, floatie }; return root;
}

export function flamingo(boatSize = false) {
  const g = new T.Group();
  const r = ring(g, boatSize ? 1.65 : .7, boatSize ? .23 : .19, C.pink, 0, 0, 0, true); if (boatSize) r.scale.y = 1.9;
  const z = boatSize ? -2.8 : -.7, x = boatSize ? 1 : .3;
  pipe(g, [x, 0, z], [x, .85, z - .1], .15, C.pink);
  pipe(g, [x, .85, z - .1], [x, 1.15, z + .1], .15, C.pink);
  ball(g, x, 1.15, z + .08, .25, .21, .24, C.pink);
  ball(g, x, 1.08, z - .17, .13, .17, .14, C.cream);
  ball(g, x, .99, z - .24, .085, .1, .1, C.navy);
  for (const side of [-1, 1]) ball(g, x + side * .22, 1.19, z - .015, .027, .038, .034, C.navy, 0);
  return bake(g);
}

export function floater(variant = 0) {
  const g = new T.Group(); const skin = [0xd99776, 0xd1a57c, 0xd5a080][variant % 3];
  ring(g, 1.03, .37, [C.gold, 0x8acb72, C.coral][variant % 3], 0, .2, 0, true);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ball(g, Math.cos(a) * 1.03, .48, Math.sin(a) * 1.03, .2, .03, .16, C.cream, 0); }
  ball(g, 0, .66, .1, .51, .6, .37, skin);
  box(g, .72, .27, .63, variant % 2 ? C.teal : 0x6a79a3, 0, .32, -.25);
  for (const x of [-.28, .28]) { pipe(g, [x, .38, -.3], [x * 1.2, .19, -1.2], .15, skin); box(g, .25, .15, .4, skin, x * 1.2, .18, -1.34); }
  head(g, false, 0, 1.34, .05);
  if (variant % 2 === 0) { cylinder(g, .55, .07, C.wood, 0, 1.68, .05); cylinder(g, .33, .25, C.wood, 0, 1.81, .05); }
  pipe(g, [-.45, .99, .05], [-1.04, .53, -.14], .13, skin);
  pipe(g, [.46, .99, .08], [.86, 1.14, -.2], .13, skin);
  cylinder(g, .12, .34, C.cream, .88, 1.29, -.2); box(g, .17, .13, .025, C.coral, .88, 1.29, -.323);
  return bake(g);
}

export function gator() {
  const g = new T.Group(), green = 0x578951, darkGreen = 0x3d6641;
  ball(g, 0, .2, .15, .74, .37, 1.55, green);
  ball(g, 0, .19, -1.65, .55, .23, 1.03, green);
  box(g, .77, .095, 1.2, 0xadb97d, 0, .065, -2.06);
  for (const x of [-.41, .41]) { ball(g, x, .43, -1.38, .14, .14, .17, green); ball(g, x, .48, -1.5, .075, .075, .06, C.gold); box(g, .025, .075, .025, C.navy, x, .49, -1.552); }
  for (let i = 0; i < 7; i++) cone(g, .12, .24, darkGreen, 0, .62, -.9 + i * .4, 4);
  for (const x of [-1, 1]) for (const z of [-.65, .85]) { pipe(g, [x * .45, .12, z], [x * 1.1, -.01, z + .22], .15, green); box(g, .39, .11, .3, darkGreen, x * 1.03, .02, z + .25); }
  pipe(g, [0, .18, 1.3], [.25, .12, 2.35], .29, green);
  pipe(g, [.25, .12, 2.35], [.7, .055, 3.18], .15, green);
  pipe(g, [.7, .055, 3.18], [1.06, .03, 3.7], .055, green);
  return bake(g);
}

export function pickup(type) {
  const g = new T.Group();
  ring(g, 1.18, .045, type === 'flamingo' ? C.pink : C.gold, 0, -.6, 0, true);
  if (type === 'coffee') {
    cylinder(g, .45, .66, C.cream, 0, .05, 0, 16); cylinder(g, .405, .03, 0x684025, 0, .4, 0, 16);
    ring(g, .29, .085, C.cream, .49, .07, 0);
    cylinder(g, .65, .065, C.cream, 0, -.32, 0, 16);
    for (const x of [-.19, 0, .19]) { pipe(g, [x, .58, 0], [x + .09, .78, 0], .025, C.cream); pipe(g, [x + .09, .78, 0], [x, 1.03, 0], .021, C.cream); }
  } else if (type === 'flamingo') g.add(flamingo());
  else {
    box(g, .63, 1.0, .35, C.gold, 0, .05, 0); box(g, .5, .18, .31, C.coral, 0, .66, 0);
    const label = textSign('SPF 1000', .61, .4, { color: '#fff8e2', bg: '#ef7865', border: null, font: '900 90px Nunito' }); label.position.set(0, .12, .185); g.add(label);
  }
  const baked = bake(g); baked.scale.setScalar(1.75); return baked;
}

export function palm(seed = 0, scale = 1) {
  const g = new T.Group(); const lean = Math.sin(seed) * 1.3;
  for (let i = 0; i < 7; i++) { const y = i * 1.3; pipe(g, [lean * i * i / 49, y, 0], [lean * (i + 1) ** 2 / 49, y + 1.4, 0], .22 - i * .016, i % 2 ? C.trunk : 0x94734f); }
  ball(g, lean, 9.2, 0, .5, .37, .5, C.leaf, 0);
  for (let f = 0; f < 9; f++) {
    const angle = f * Math.PI * 2 / 9 + seed;
    const verts = [], inds = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, r = t * (4.6 + Math.sin(f) * .7), y = 9.2 + Math.sin(t * 3.1) * 1.25 - t * t * 1.6;
      const width = Math.sin(t * Math.PI) * .48;
      for (const side of [-1, 1]) verts.push([lean + Math.cos(angle) * r + Math.sin(angle) * width * side, y, Math.sin(angle) * r - Math.cos(angle) * width * side]);
      if (i < 6) { const k = i * 2; inds.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    poly(g, verts, inds, mat(f % 2 ? C.leaf : C.leafLight, { side: T.DoubleSide }));
    pipe(g, [lean, 9.2, 0], [lean + Math.cos(angle) * 2.7, 10, Math.sin(angle) * 2.7], .04, 0x62904d, 5);
  }
  for (let i = 0; i < 3; i++) ball(g, lean + Math.sin(i * 2) * .3, 8.85, Math.cos(i * 2) * .3, .21, .26, .22, C.trunk, 0);
  g.scale.setScalar(scale); return g;
}

function roof(g, w, d, x, y, z, color = C.roof) {
  const verts = [[x - w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2],[x-w*.23,y+2.1,z],[x+w*.23,y+2.1,z]];
  poly(g, verts, [0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0,0,1,2,0,2,3], color);
  for (let i = 0; i < Math.floor(w / .6); i++) {
    const xx = x - w / 2 + i * .6;
    pipe(g, [xx, y + .045, z + d / 2], [x + (xx - x) * .46, y + 2.12, z], .035, 0xb76547, 4);
  }
}

export function mansion(seed = 0) {
  const g = new T.Group(); const palettes = [C.cream, 0xf2ddbe, 0xf2c9ba, 0xe6edda, 0xf5e7bf];
  const walls = palettes[seed % palettes.length], w = 12 + seed % 4 * 1.5, depth = 10 + seed % 3, h = seed % 3 === 0 ? 8 : 6.2;
  box(g, w, h, depth, walls, 0, h / 2 + .4, 0);
  box(g, w + .7, .35, depth + .5, C.cream, 0, h + .38, 0);
  roof(g, w + 1.5, depth + 1.7, 0, h + .57, 0);
  for (const y of [2.0, h - 1.5]) for (let x = -w / 2 + 1.65; x < w / 2 - .8; x += 3.3) {
    box(g, 1.75, 2.15, .14, C.cream, x, y, depth / 2 + .14);
    box(g, 1.4, 1.82, .17, 0x467b82, x, y, depth / 2 + .24);
    box(g, .055, 1.85, .03, C.cream, x, y, depth / 2 + .34);
    box(g, 1.42, .055, .03, C.cream, x, y, depth / 2 + .34);
  }
  box(g, w + .4, .3, 2.7, C.cream, 0, 3.48, depth / 2 + .9);
  for (const x of [-w / 2 + .45, w / 2 - .45]) cylinder(g, .2, 3.4, C.cream, x, 1.8, depth / 2 + 1.75);
  pipe(g, [-w / 2, 4.6, depth / 2 + 2.1], [w / 2, 4.6, depth / 2 + 2.1], .055, C.cream);
  for (let x = -w / 2; x <= w / 2; x += .65) pipe(g, [x, 3.6, depth / 2 + 2.1], [x, 4.6, depth / 2 + 2.1], .032, C.cream, 5);
  // A pool, flowering planters and chaise longues make each yard a place.
  box(g, 7, .18, 4.6, C.cream, w / 2 + 5.2, .5, 2);
  box(g, 6.3, .025, 3.8, 0x65c8cc, w / 2 + 5.2, .61, 2);
  for (const x of [-w / 2 - 1.5, w / 2 + 1.4]) {
    box(g, .9, .65, .9, C.roof, x, .68, depth / 2 + 1);
    ball(g, x, 1.3, depth / 2 + 1, .8, .7, .65, C.leaf, 1);
    for (let i = 0; i < 4; i++) ball(g, x + Math.sin(i * 2) * .55, 1.6, depth / 2 + 1 + Math.cos(i * 2) * .5, .23, .18, .25, seed % 2 ? C.pink : 0xefb359, 0);
  }
  for (let i = 0; i < 2; i++) { const x = w / 2 + 2.8 + i * 2.8; box(g, 1.1, .18, 2.5, C.cream, x, .7, 6.2); box(g, 1.1, 1, .15, C.cream, x, 1.12, 7.2).rotation.x = -.22; }
  const umb = cone(g, 2.3, 1.0, seed % 2 ? C.coral : C.cream, w / 2 + 4.2, 3.2, 5.8, 8); umb.rotation.y = .3; cylinder(g, .045, 3, C.wood, w / 2 + 4.2, 1.7, 5.8);
  return g;
}

export function yacht(size = 1) {
  const g = new T.Group();
  const hull = ball(g, 0, .55, 0, 2.3, .9, 6.9, C.cream, 1); hull.geometry = new T.SphereGeometry(1, 8, 5);
  box(g, 3.9, .2, 9.6, C.wood, 0, 1.16, .5);
  box(g, 3.35, 1.5, 4.8, C.cream, 0, 2.03, .65);
  box(g, 3.4, .62, 3.8, 0x3c707e, 0, 2.68, -.1);
  box(g, 3.75, .23, 5.9, C.cream, 0, 3.12, .4);
  box(g, 2.6, .95, 2.8, C.cream, 0, 3.66, .55);
  box(g, 2.7, .36, 2.4, 0x3c707e, 0, 3.91, .23);
  box(g, 3.4, .16, 4, C.cream, 0, 4.2, .55);
  for (const x of [-1.85, 1.85]) { pipe(g, [x, 1.55, 4.6], [x, 1.55, -4.1], .025, C.navy, 5); for (const z of [-4, -1, 2, 4.5]) pipe(g, [x, 1.1, z], [x, 1.55, z], .025, C.navy, 5); }
  pipe(g, [0, 4.2, .7], [0, 5.9, 1.5], .06, C.cream); box(g, 2, .1, .3, C.cream, 0, 5.25, 1.15);
  for (let i = 0; i < 5; i++) ball(g, -2.18, .67, -3 + i * 1.3, .055, .15, .17, C.navy, 0);
  g.scale.setScalar(size); return g;
}

export function dock(length = 12) {
  const g = new T.Group();
  box(g, 3, .26, length, C.wood, 0, .74, 0);
  for (let z = -length / 2; z < length / 2; z += .55) box(g, 2.96, .015, .025, 0x9b7958, 0, .88, z);
  for (const x of [-1.25, 1.25]) for (let z = -length / 2 + .4; z <= length / 2; z += 4) cylinder(g, .14, 2.5, C.wood, x, .4, z);
  return g;
}

export function ramp() {
  const g = new T.Group(), w = 8, d = 10;
  poly(g, [[-w/2,.1,d/2],[w/2,.1,d/2],[w/2,2.2,-d/2],[-w/2,2.2,-d/2],[-w/2,.1,-d/2],[w/2,.1,-d/2]], [0,2,1,0,3,2,0,4,3,1,2,5,3,5,2,3,4,5], C.wood);
  for (let i = 0; i < 14; i++) { const z = d / 2 - i * d / 14; box(g, w, .08, .13, i % 2 ? 0xb18451 : 0xc89d60, 0, .13 + i * 2.1 / 14, z).rotation.x = .2; }
  for (const x of [-w/2, w/2]) pipe(g, [x,.2,d/2], [x,2.35,-d/2], .1, C.coral);
  for (const x of [-2.6, 0, 2.6]) {
    const a = box(g, .2, .04, 2.6, C.cream, x, 1.3, -.2); a.rotation.x = .2;
    const b = box(g, 1.15, .04, .2, C.cream, x, 1.53, -1.4); b.rotation.y = x ? 0 : 0;
  }
  return bake(g);
}

export function buoy(color = C.coral, large = false) {
  const g = new T.Group(), s = large ? 1.6 : 1;
  cylinder(g, .67, .25, color, 0, .2, 0); cone(g, .48, 1.65, color, 0, 1.0, 0);
  cylinder(g, .24, .28, C.cream, 0, 1.34, 0);
  ball(g, 0, 1.98, 0, .16, .16, .16, C.cream, 0);
  g.scale.setScalar(s); return bake(g);
}

export function boatWake() {
  const g = new T.Group();
  for (let row = 0; row < 3; row++) for (let i = 0; i < 20; i++) {
    const x = (i - 9.5) * 1.35, z = Math.abs(x) * .18 + row * 2.2;
    ball(g, x, .12 + Math.sin(i) * .035, z, .95, .055, .3, row % 2 ? 0xc1ede0 : 0xeaf3d9, 0);
  }
  return bake(g);
}

function flag(g, x, y, z) {
  pipe(g, [x,y,z], [x,y+5,z], .045, C.cream);
  for (let i = 0; i < 7; i++) box(g, 2.2, .2, .02, i % 2 ? C.cream : 0xcb5752, x+1.1, y+4.8-i*.2, z);
  box(g, .95, .78, .035, 0x42697c, x+.48, y+4.52, z-.01);
}

export function fisheries() {
  const g = new T.Group();
  box(g, 25, .4, 28, C.wood, 0, 1.05, 0);
  for (const x of [-11.5, 11.5]) for (let z=-12;z<=12;z+=3) cylinder(g,.2,3,C.wood,x,.3,z);
  box(g, 19, 5.3, 17, C.cream, 2, 3.93, -1.5);
  roof(g, 22, 20, 2, 6.65, -1.5, 0xc75d45);
  for (let x=-6;x<11;x+=3) { box(g,2.4,2.8,.2,0x396974,x,4.4,7.1); box(g,.15,3,.3,C.cream,x+1.4,4.4,7.15); }
  for (let z=-8;z<6;z+=3) box(g,.2,2.7,2.3,0x396974,-7.6,4.4,z);
  box(g, 23, .35, 4, C.cream, 0, 4.2, 9.7);
  for (let x=-10;x<=10;x+=4) pipe(g,[x,1.25,11.2],[x,4.2,11.2],.14,C.cream);
  // Layered awning ribs, dock caps and roof seams catch the warm waterfront light.
  for(let x=-10;x<=10;x+=1.1){box(g,.065,.075,3.7,0x829b87,x,4.42,9.65);pipe(g,[x,6.75,8],[x,8.9,-1.5],.032,0xe89b72,4)}
  for(let x=-12;x<=12;x+=2){box(g,.3,.14,.3,C.cream,x,2.57,14);pipe(g,[x,1.1,14],[x,1.95,14],.12,0x8b6a43,6)}
  const sign = textSign('15th Street Fisheries', 21, 3.15, { font: '900 72px Nunito' }); sign.position.set(0,6.15,8.74); g.add(sign);
  box(g, 6.6, 2.4, 5.8, C.cream, 1, 9.15, -2);
  for (const x of [-1.25,1.25,3.75]) box(g,1.9,1.4,.1,0x366876,x,9.35,1);
  roof(g,8.3,7.4,1,10.43,-2,0xc75d45);
  for (let i=0;i<5;i++) {
    const x=-8+i*4.4; cylinder(g,.92,.14,C.cream,x,1.95,11.5); cylinder(g,.055,.7,C.wood,x,1.55,11.5);
    for (const z of [10.2,12.8]) { box(g,.6,.1,.6,C.cream,x,1.55,z); box(g,.6,.75,.1,C.cream,x,1.95,z+(z>11?.27:-.27)); }
    if(i%2===0) { cylinder(g,.045,3,C.cream,x,2.8,11.5); cone(g,2,1,C.gold,x,4.4,11.5,8); }
  }
  for(let x=-12;x<=12;x+=2){pipe(g,[x,1.25,14],[x,2.5,14],.085,C.wood)}pipe(g,[-12,2.5,14],[12,2.5,14],.09,C.wood);
  const sideSign = textSign('FISHERIES', 9, 1.65, { font:'900 90px Nunito',border:null }); sideSign.position.set(-7.72,6,-1);sideSign.rotation.y=-Math.PI/2;g.add(sideSign);
  flag(g,10,7,1);
  return bake(g);
}

export function bridge(width = 130) {
  const g = new T.Group();
  const deckY = 16;
  for(const side of [-1,1]){
    box(g, width/2-22,1.15,13,C.cream,side*(22+(width/2-22)/2),deckY,0);
    box(g,width/2-22,.08,11,0x738888,side*(22+(width/2-22)/2),deckY+.65,0);
    for (const x of [30,51]) {box(g,3.2,16,4.5,0xd3d6bb,side*x,7.2,-3.5);box(g,3.2,16,4.5,0xd3d6bb,side*x,7.2,3.5);box(g,8,1,14,0xc4c9b1,side*x,.1,0)}
    box(g,7,11,8,C.cream,side*27,12,0);
    box(g,8.2,.5,9.2,C.cream,side*27,18.2,0);
    box(g,6.6,3.8,6.5,C.cream,side*27,20.2,0);
    for(const x of [-2.1,0,2.1])box(g,1.65,2,.12,0x497783,side*27+x,20.8,3.32);
    roof(g,8.6,8.5,side*27,22.25,0,0xc29368);
    for(const z of [-4.05,4.05]){
      for(const dx of [-2.75,2.75])box(g,.38,10.1,.2,0xe0d7ba,side*27+dx,12,z);
      for(const y of [7.2,10.2,13.2,16.2])box(g,6.1,.10,.14,0xc8c7ac,side*27,y,z+.06);
      box(g,7.6,.26,.4,0xf4e9cb,side*27,17.2,z);
    }
    box(g,7.6,.23,7.5,0xe1d6b8,side*27,18.9,0);

    for(let x=34;x<width/2;x+=3)for(const z of [-6.2,6.2])pipe(g,[side*x,deckY+.6,z],[side*x,deckY+1.65,z],.055,C.cream);
    for(const z of [-6.2,6.2])pipe(g,[side*31,deckY+1.65,z],[side*width/2,deckY+1.65,z],.06,C.cream);
  }
  box(g,44,.95,13,C.cream,0,deckY,0);box(g,44,.06,11,0x738888,0,deckY+.51,0);
  for(let x=-20;x<22;x+=5)box(g,2.3,.015,.14,C.cream,x,deckY+.56,0);
  for(const z of [-6.2,6.2]) {pipe(g,[-23,deckY+1.6,z],[23,deckY+1.6,z],.07,C.cream);for(let x=-21;x<24;x+=3)pipe(g,[x,deckY+.45,z],[x,deckY+1.6,z],.05,C.cream)}
  const label=textSign('17TH STREET CAUSEWAY',40,2.1,{font:'900 68px Nunito',border:null});label.position.set(0,15.6,6.6);g.add(label);
  // Race bunting beneath the span signals the finish without replacing the landmark.
  pipe(g,[-23,11.1,6.8],[23,11.1,6.8],.035,C.navy);
  for(let x=-22;x<23;x+=2.1)poly(g,[[x,11.1,6.82],[x+1.5,11.1,6.82],[x+.75,9.9,6.82]],[0,1,2],mat(Math.round(x)%3?C.coral:C.gold,{side:T.DoubleSide}));
  const finish=textSign('FINISH',11,2,{font:'900 130px Nunito',bg:'#183f4b',color:'#fff8e2',border:null});finish.position.set(0,10.8,6.84);g.add(finish);
  flag(g,31,20,2);
  return bake(g);
}
