// Procedural bay: terrain, hotel, pier, boats, lighthouse, trees, village, gulls, clouds.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { beamVertex, beamFragment } from './shaders.js';

export const COLORS = {
  navy: 0x0d2b45,
  sea: 0x2fb5b3,
  white: 0xf5f2ea,
  coral: 0xff8a5b,
  sand: 0xe3c79a,
  shutter: 0x1f5d93,
  stone: 0xd8ccb2,
  rock: 0x9a8b76,
  scrub: 0x7f8a4f,
  olive: 0x6b7a45,
  cypress: 0x34482c,
  wood: 0x8a6243,
};

export const HOTEL = { x: -8, z: -40 };
export const PIER = { x: 10, z0: -25.6, z1: -8, deck: 0.9 };
export const LIGHTHOUSE = { x: 34, z: -16 };

// ---------- deterministic helpers ----------
let seed = 7;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const smooth = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};
export const shoreZ = (x) => -26 + 0.012 * x * x;

function ridge(x, z) {
  return (
    Math.sin(x * 0.13 + Math.cos(z * 0.11) * 2.0) * 0.5 +
    Math.sin(z * 0.17 + x * 0.05) * 0.5 +
    Math.sin((x + z) * 0.31) * 0.22 +
    Math.cos(x * 0.47 - z * 0.29) * 0.12
  );
}

function baseHeight(x, z) {
  const d = shoreZ(x) - z;
  if (d < 0) return Math.max(d * 0.45, -6);
  let h = Math.min(d, 4) * 0.15 + smooth(3, 22, d) * 6 + smooth(25, 75, d) * 17;
  h += 7 * Math.exp(-(((x - HOTEL.x) ** 2) / 110 + ((z - HOTEL.z) ** 2) / 70));
  h += 3.6 * Math.exp(-(((x - LIGHTHOUSE.x) ** 2) + ((z - LIGHTHOUSE.z) ** 2)) / 22);
  h += ridge(x, z) * smooth(2, 9, d) * (1.4 + smooth(20, 60, d) * 4.5);
  return h;
}
const HOTEL_Y = baseHeight(HOTEL.x, HOTEL.z);
export function heightAt(x, z) {
  const h = baseHeight(x, z);
  const r = Math.hypot((x - HOTEL.x) / 1.15, z - HOTEL.z);
  const w = 1 - smooth(7.5, 12.5, r);
  const flat = h + (HOTEL_Y - h) * w;
  // sink the far edges of the terrain into the sea so no cut edge is visible
  const edge = Math.max(smooth(82, 116, z), smooth(105, 128, Math.abs(x)));
  return flat + (-4 - flat) * edge;
}
export const hotelY = HOTEL_Y;

// ---------- shared materials ----------
export function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });
  return {
    white: std(COLORS.white, { roughness: 0.9 }),
    stone: std(COLORS.stone),
    shutter: std(COLORS.shutter, { roughness: 0.6 }),
    navy: std(COLORS.navy, { roughness: 0.55 }),
    coral: std(COLORS.coral, { roughness: 0.8 }),
    sand: std(COLORS.sand),
    wood: std(COLORS.wood, { roughness: 0.9 }),
    woodDark: std(0x5e4330, { roughness: 0.95 }),
    rock: std(COLORS.rock, { roughness: 1 }),
    olive: std(COLORS.olive, { roughness: 1 }),
    cypress: std(COLORS.cypress, { roughness: 1 }),
    bloom: std(0xd2487a, { roughness: 1 }),
    pool: std(0x5fd6cf, { roughness: 0.2, emissive: 0x1b8f8c, emissiveIntensity: 0.25 }),
    window: new THREE.MeshStandardMaterial({ color: 0x223447, roughness: 0.35, metalness: 0.1, emissive: 0xffb76b, emissiveIntensity: 0 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.4, emissive: 0xffc27a, emissiveIntensity: 0 }),
    lantern: new THREE.MeshStandardMaterial({ color: 0xfff4d8, roughness: 0.3, emissive: 0xffd896, emissiveIntensity: 0.2 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.25 }),
    gull: new THREE.MeshBasicMaterial({ color: 0x1c2733, side: THREE.DoubleSide }),
  };
}

// ---------- terrain ----------
function buildTerrain(mobile) {
  const seg = mobile ? 90 : 130;
  let geo = new THREE.PlaneGeometry(260, 250, seg, seg);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const colors = new Float32Array(p.count * 3);
  const cSand = new THREE.Color(COLORS.sand);
  const cWet = new THREE.Color(0xb59a72);
  const cScrub = new THREE.Color(COLORS.scrub);
  const cDry = new THREE.Color(0xb8a473);
  const cRock = new THREE.Color(COLORS.rock);
  const cHigh = new THREE.Color(0x8d8a7a);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const ny = n.getY(i);
    const jitter = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
    if (y < 0.2) c.copy(cWet);
    else if (y < 1.3) c.copy(cSand);
    else {
      c.copy(cScrub).lerp(cDry, 0.5 + 0.5 * Math.sin(x * 0.21 + y * 0.4));
      if (ny < 0.82) c.lerp(cRock, 0.85);
      if (y > 18) c.lerp(cHigh, smooth(18, 30, y) * 0.7);
    }
    c.offsetHSL(0, 0, jitter * 0.035);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r;
      colors[(i + k) * 3 + 1] = c.g;
      colors[(i + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.97 }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// ---------- hotel ----------
function buildHotel(M) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const rb = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, 0.18);

  // plinth + terrace
  add(new THREE.BoxGeometry(16, 7, 11), M.stone, 0, -2.3, 0.5);
  // main blocks
  add(rb(9, 4, 6), M.white, -1.5, 3.2, -1);
  add(rb(5.4, 3.2, 5), M.white, 4.6, 2.8, 0.2);
  add(rb(5.2, 3, 4.4), M.white, -3, 6.7, -1.6);
  add(rb(3.2, 2.4, 3.2), M.white, 1.8, 6.4, -2.2);
  // parapets
  add(new THREE.BoxGeometry(5.6, 0.35, 5.2), M.white, 4.6, 4.55, 0.2);
  // chapel-style dome over the stair tower
  const dome = add(new THREE.SphereGeometry(1.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.shutter, 1.8, 7.6, -2.2);
  dome.material = M.shutter;
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), M.white, 1.8, 9.1, -2.2);

  // terrace railing (front + sides)
  add(new THREE.BoxGeometry(16, 0.7, 0.25), M.white, 0, 1.55, 5.9);
  add(new THREE.BoxGeometry(0.25, 0.7, 5.5), M.white, -7.9, 1.55, 3.2);
  add(new THREE.BoxGeometry(0.25, 0.7, 5.5), M.white, 7.9, 1.55, 3.2);
  // pool
  add(new THREE.BoxGeometry(3.6, 0.08, 1.7), M.pool, 4.6, 1.23, 4.4, false);

  // umbrellas
  [[-5.2, 4.2], [-2, 4.4], [1.2, 4.2]].forEach(([x, z], i) => {
    add(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), M.wood, x, 2.2, z);
    add(new THREE.ConeGeometry(1.3, 0.55, 8), i === 1 ? M.coral : M.sand, x, 3.25, z);
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 10), M.woodDark, x, 1.95, z);
  });

  // windows and shutters as instances
  const winSpots = [];
  const addWin = (x, y, z, ry = 0, tall = 1.3) => winSpots.push({ x, y, z, ry, tall });
  // block A front (z = 2.0)
  [-4.6, -3, 0.6].forEach((x) => addWin(x, 3.3, 2.02));
  addWin(-1, 2.6, 2.02, 0, 2.2); // door
  // block B front (z = 2.7)
  [3.4, 5.8].forEach((x) => addWin(x, 2.9, 2.72));
  // block B side (x = 7.3)
  addWin(7.32, 2.9, 0.2, Math.PI / 2);
  // block C front (z = 0.6)
  [-4.2, -1.8].forEach((x) => addWin(x, 6.8, 0.62));
  // stair tower
  addWin(1.8, 6.3, -0.58, 0, 1.1);
  // block A side (x = -6)
  addWin(-6.02, 3.3, -1, -Math.PI / 2);

  const paneGeo = new THREE.BoxGeometry(0.85, 1, 0.08);
  const shutGeo = new THREE.BoxGeometry(0.44, 1, 0.06);
  const panes = new THREE.InstancedMesh(paneGeo, M.window, winSpots.length);
  const shutters = new THREE.InstancedMesh(shutGeo, M.shutter, winSpots.length * 2);
  const o = new THREE.Object3D();
  winSpots.forEach((w, i) => {
    o.position.set(w.x, w.y, w.z);
    o.rotation.set(0, w.ry, 0);
    o.scale.set(1, w.tall, 1);
    o.updateMatrix();
    panes.setMatrixAt(i, o.matrix);
    for (let s = 0; s < 2; s++) {
      const side = s === 0 ? -1 : 1;
      const dx = Math.cos(w.ry) * side * 0.68;
      const dz = -Math.sin(w.ry) * side * 0.68;
      const fx = Math.sin(w.ry) * 0.05;
      const fz = Math.cos(w.ry) * 0.05;
      o.position.set(w.x + dx + fx, w.y, w.z + dz + fz);
      o.rotation.set(0, w.ry + side * 0.35, 0);
      o.updateMatrix();
      shutters.setMatrixAt(i * 2 + s, o.matrix);
    }
  });
  shutters.castShadow = true;
  g.add(panes, shutters);

  // bougainvillea
  const blob = new THREE.IcosahedronGeometry(0.7, 0);
  [[-6.3, 2.6, 1.8, 1.1], [7.1, 2.4, 2.6, 0.9], [-0.2, 5.6, 0.4, 0.8], [6.8, 4.9, -1.5, 0.7]].forEach(([x, y, z, s]) => {
    const m = add(blob, M.bloom, x, y, z);
    m.scale.setScalar(s);
    m.rotation.set(x, y, z);
  });

  // string lights along the railing
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), M.bulb, 18);
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const x = -7.6 + t * 15.2;
    const sag = Math.sin(((t * 6) % 1) * Math.PI) * 0.35;
    o.position.set(x, 3.05 - sag, 5.85);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    bulbs.setMatrixAt(i, o.matrix);
  }
  g.add(bulbs);
  // posts for the string lights
  for (let i = 0; i <= 3; i++) add(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 5), M.wood, -7.6 + i * 5.066, 2.1, 5.85);

  g.position.set(HOTEL.x, HOTEL_Y - 0.6, HOTEL.z);
  g.rotation.y = 0.12;
  return g;
}

// ---------- pier ----------
function buildPier(M) {
  const g = new THREE.Group();
  const len = PIER.z1 - PIER.z0;
  const count = Math.floor(len / 0.42);
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.12, 0.36), M.wood, count);
  const o = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    o.position.set(PIER.x + (Math.sin(i * 7.1) * 0.03), PIER.deck, PIER.z0 + i * 0.42 + 0.21);
    o.rotation.set(0, Math.sin(i * 3.7) * 0.02, 0);
    o.updateMatrix();
    planks.setMatrixAt(i, o.matrix);
  }
  planks.castShadow = planks.receiveShadow = true;
  g.add(planks);

  const postCount = Math.floor(len / 2.6) + 1;
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.14, 3, 6), M.woodDark, postCount * 2);
  for (let i = 0; i < postCount; i++) {
    for (let s = 0; s < 2; s++) {
      o.position.set(PIER.x + (s ? 1.1 : -1.1), PIER.deck - 1.3, PIER.z0 + 0.5 + i * 2.6);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      posts.setMatrixAt(i * 2 + s, o.matrix);
    }
  }
  posts.castShadow = true;
  g.add(posts);

  // lamp at the end of the pier
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), M.navy);
  pole.position.set(PIER.x - 1, PIER.deck + 1.1, PIER.z1 - 0.4);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), M.bulb);
  bulb.position.set(PIER.x - 1, PIER.deck + 2.25, PIER.z1 - 0.4);
  g.add(pole, bulb);
  // bollards
  [[1, -9], [1, -12.5]].forEach(([dx, z]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 8), M.navy);
    b.position.set(PIER.x + dx, PIER.deck + 0.2, z);
    g.add(b);
  });
  return g;
}

// ---------- boats ----------
function hullGeometry(w, h, l) {
  const geo = new THREE.BoxGeometry(w, h, l, 2, 2, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const bow = Math.max(0, (z - l * 0.15) / (l * 0.35));
    x *= 1 - Math.min(bow, 1) * 0.95;
    if (y < 0) x *= 0.55;
    const lift = Math.max(0, z / (l * 0.5)) ** 2 * h * 0.35;
    p.setXYZ(i, x, y + (y > 0 ? lift : lift * 0.5), z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildBoat(M) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(hullGeometry(1.7, 0.75, 4.6), M.navy);
  hull.position.y = 0.1;
  const rim = new THREE.Mesh(hullGeometry(1.75, 0.12, 4.65), M.white);
  rim.position.y = 0.5;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 3.2), M.wood);
  deck.position.set(0, 0.46, -0.3);
  const cabin = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.8, 1.3, 2, 0.1), M.white);
  cabin.position.set(0, 0.88, -0.5);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 1.5), M.coral);
  roof.position.set(0, 1.32, -0.5);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.6, 6), M.wood);
  mast.position.set(0, 2.0, 0.6);
  [hull, rim, cabin, roof, mast].forEach((m) => { m.castShadow = true; });
  g.add(hull, rim, deck, cabin, roof, mast);
  g.position.set(PIER.x + 2.4, 0, -11.5);
  g.rotation.y = 0.05;
  return g;
}

function buildSailboat(M) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(hullGeometry(1.2, 0.5, 3.6), M.white);
  hull.position.y = 0.1;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 4.6, 5), M.wood);
  mast.position.set(0, 2.6, 0.2);
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 0.25, 0, 4.7, 0.22, 0, 0.6, -1.6], 3));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({ color: 0xfaf6ec, side: THREE.DoubleSide, roughness: 0.9 }));
  const jibGeo = new THREE.BufferGeometry();
  jibGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 0.35, 0, 4.2, 0.25, 0, 0.6, 1.7], 3));
  jibGeo.computeVertexNormals();
  const jib = new THREE.Mesh(jibGeo, sail.material);
  g.add(hull, mast, sail, jib);
  return g;
}

// ---------- lighthouse ----------
function buildLighthouse(M) {
  const g = new THREE.Group();
  const base = heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.3, 7, 14), M.white);
  tower.position.y = 3.5;
  const band1 = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.14, 0.9, 14), M.navy);
  band1.position.y = 2.6;
  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 1.0, 0.9, 14), M.navy);
  band2.position.y = 5.2;
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.18, 14), M.navy);
  gallery.position.y = 7.05;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.05, 10), M.lantern);
  lantern.position.y = 7.7;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.8, 10), M.navy);
  cap.position.y = 8.6;
  const house = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.6, 2, 2, 0.1), M.white);
  house.position.set(-1.9, 0.8, 0.6);
  [tower, band1, band2, gallery, cap, house].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.add(tower, band1, band2, gallery, lantern, cap, house);

  // rotating beams
  const beamGeo = new THREE.ConeGeometry(2.6, 46, 24, 1, true);
  beamGeo.translate(0, -23, 0);
  beamGeo.rotateZ(Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0xffe2a8) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const pivot = new THREE.Group();
  pivot.position.y = 7.7;
  const b1 = new THREE.Mesh(beamGeo, beamMat);
  const b2 = new THREE.Mesh(beamGeo, beamMat);
  b2.rotation.y = Math.PI;
  b1.rotation.z = b2.rotation.z = -0.04;
  b1.frustumCulled = b2.frustumCulled = false;
  pivot.add(b1, b2);
  pivot.visible = false;
  g.add(pivot);

  const light = new THREE.PointLight(0xffd59a, 0, 40, 1.6);
  light.position.y = 7.7;
  g.add(light);

  g.position.set(LIGHTHOUSE.x, base - 0.3, LIGHTHOUSE.z);
  return { group: g, pivot, beamMat, light, top: new THREE.Vector3(LIGHTHOUSE.x, base + 7.4, LIGHTHOUSE.z) };
}

// ---------- vegetation, rocks and village ----------
function scatter(count, test, tries = 4000) {
  const out = [];
  for (let i = 0; i < tries && out.length < count; i++) {
    const x = -120 + rand() * 240;
    const z = -110 + rand() * 120;
    const d = shoreZ(x) - z;
    const y = heightAt(x, z);
    if (test(x, z, d, y)) out.push({ x, z, y, d });
  }
  return out;
}
const nearHotel = (x, z, r) => Math.hypot(x - HOTEL.x, z - HOTEL.z) < r;
const nearPier = (x, z) => Math.abs(x - PIER.x) < 3.5 && z > -30;

function buildNature(M, mobile) {
  const g = new THREE.Group();
  const o = new THREE.Object3D();

  // olive trees: trunk + canopy
  const olives = scatter(mobile ? 70 : 130, (x, z, d, y) => d > 5 && d < 55 && y < 20 && !nearHotel(x, z, 12) && !nearPier(x, z));
  const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.olive, olives.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 5), M.woodDark, olives.length);
  olives.forEach((p, i) => {
    const s = 0.8 + rand() * 0.9;
    o.position.set(p.x, p.y + 0.5 * s, p.z);
    o.rotation.set(0, rand() * 6, 0);
    o.scale.set(s, s, s);
    o.updateMatrix();
    trunk.setMatrixAt(i, o.matrix);
    o.position.set(p.x, p.y + 1.45 * s, p.z);
    o.rotation.set(rand(), rand() * 6, rand());
    o.scale.set(s * 1.3, s * 0.85, s * 1.2);
    o.updateMatrix();
    canopy.setMatrixAt(i, o.matrix);
  });
  canopy.castShadow = true;
  g.add(canopy, trunk);

  // cypresses, clustered around the hotel and the ridge
  const cyp = scatter(mobile ? 26 : 44, (x, z, d, y) => d > 7 && d < 45 && (nearHotel(x, z, 24) || rand() < 0.15) && !nearHotel(x, z, 10.5));
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 5, 6), M.cypress, cyp.length);
  cyp.forEach((p, i) => {
    const s = 0.7 + rand() * 0.6;
    o.position.set(p.x, p.y + 2.3 * s, p.z);
    o.rotation.set(0, rand() * 6, 0);
    o.scale.set(s, s, s);
    o.updateMatrix();
    cone.setMatrixAt(i, o.matrix);
  });
  cone.castShadow = true;
  g.add(cone);

  // rocks along the shore and around the lighthouse
  const rocks = scatter(mobile ? 40 : 70, (x, z, d) => (d > -1.5 && d < 3.5 && !nearPier(x, z) && rand() < 0.5) || Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) < 7, 9000);
  const rockMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M.rock, rocks.length);
  rocks.forEach((p, i) => {
    const s = 0.5 + rand() * 1.4;
    o.position.set(p.x, Math.max(p.y, -0.3) + s * 0.2, p.z);
    o.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    o.scale.set(s * 1.3, s * 0.8, s);
    o.updateMatrix();
    rockMesh.setMatrixAt(i, o.matrix);
  });
  rockMesh.castShadow = rockMesh.receiveShadow = true;
  g.add(rockMesh);

  // whitewashed village houses on the slopes
  const houses = scatter(mobile ? 14 : 24, (x, z, d, y) => d > 4 && d < 28 && y < 12 && ((x < -22 && x > -70) || (x > 16 && x < 28)) && !nearPier(x, z), 6000);
  const box = new RoundedBoxGeometry(1, 1, 1, 1, 0.06);
  const houseMesh = new THREE.InstancedMesh(box, M.white, houses.length);
  const houseWin = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), M.window, houses.length);
  const houseDoor = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.9, 0.06), M.shutter, houses.length);
  houses.forEach((p, i) => {
    const w = 2 + rand() * 1.8;
    const h = 1.8 + rand() * 1.4;
    const dpt = 2 + rand() * 1.5;
    const ry = (rand() - 0.5) * 0.6;
    o.position.set(p.x, p.y + h / 2 - 0.2, p.z);
    o.rotation.set(0, ry, 0);
    o.scale.set(w, h, dpt);
    o.updateMatrix();
    houseMesh.setMatrixAt(i, o.matrix);
    const fx = Math.sin(ry) * (dpt / 2 + 0.02);
    const fz = Math.cos(ry) * (dpt / 2 + 0.02);
    o.scale.set(1, 1, 1);
    o.position.set(p.x + fx + Math.cos(ry) * w * 0.22, p.y + h * 0.55, p.z + fz - Math.sin(ry) * w * 0.22);
    o.updateMatrix();
    houseWin.setMatrixAt(i, o.matrix);
    o.position.set(p.x + fx - Math.cos(ry) * w * 0.22, p.y + 0.25, p.z + fz + Math.sin(ry) * w * 0.22);
    o.updateMatrix();
    houseDoor.setMatrixAt(i, o.matrix);
  });
  houseMesh.castShadow = houseMesh.receiveShadow = true;
  g.add(houseMesh, houseWin, houseDoor);

  // a small strip of beach umbrellas below the hotel (the private beach)
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 3.4;
    const z = shoreZ(x) - 2.2;
    const y = heightAt(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 5), M.wood);
    pole.position.set(x, y + 0.9, z);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1, 0.42, 8), i % 2 ? M.sand : M.coral);
    top.position.set(x, y + 1.85, z);
    top.castShadow = true;
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 1.6), M.white);
    lounger.position.set(x + 0.9, y + 0.25, z + 0.5);
    lounger.rotation.y = 0.2;
    g.add(pole, top, lounger);
  }
  return g;
}

// ---------- gulls ----------
function buildGulls(M, n) {
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.22, 0, 0, -0.2, 1.05, 0.05, -0.1, 0, 0, 0.22, 1.05, 0.05, -0.1, 0.55, 0.02, 0.18], 3));
  wingGeo.computeVertexNormals();
  const bodyGeo = new THREE.ConeGeometry(0.09, 0.7, 5);
  bodyGeo.rotateX(Math.PI / 2);
  const gulls = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const r = new THREE.Mesh(wingGeo, M.gull);
    const l = new THREE.Mesh(wingGeo, M.gull);
    l.scale.x = -1;
    const body = new THREE.Mesh(bodyGeo, M.gull);
    g.add(r, l, body);
    g.scale.setScalar(0.9 + rand() * 0.5);
    gulls.push({
      group: g,
      r,
      l,
      cx: -10 + rand() * 30,
      cy: 9 + rand() * 9,
      cz: -22 + rand() * 26,
      rad: 7 + rand() * 12,
      speed: (0.12 + rand() * 0.12) * (rand() < 0.5 ? 1 : -1),
      phase: rand() * Math.PI * 2,
      flap: 5 + rand() * 3,
    });
  }
  return gulls;
}

// ---------- clouds ----------
function buildClouds(M) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const parts = [];
  const spots = [
    [-60, 38, -150], [10, 44, -170], [70, 36, -140], [-110, 46, -120], [120, 40, -110],
    [40, 30, 140], [-30, 34, 170], [95, 42, 120], [140, 30, 60],
  ];
  const clouds = [];
  spots.forEach(([x, y, z]) => {
    const pieces = [];
    const k = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < k; i++) {
      const g = geo.clone();
      const s = 5 + rand() * 6;
      g.scale(s * 1.6, s * 0.55, s);
      g.translate((i - k / 2) * 6 + rand() * 3, rand() * 2, rand() * 4);
      pieces.push(g);
    }
    const merged = mergeGeometries(pieces);
    const m = new THREE.Mesh(merged, M.cloud);
    m.position.set(x, y, z);
    m.userData.speed = 0.6 + rand() * 0.8;
    clouds.push(m);
    parts.push(m);
  });
  return clouds;
}

export function buildWorld(scene, mobile) {
  const M = makeMaterials();
  const terrain = buildTerrain(mobile);
  const hotel = buildHotel(M);
  const pier = buildPier(M);
  const boat = buildBoat(M);
  const sailboat = buildSailboat(M);
  const lighthouse = buildLighthouse(M);
  const nature = buildNature(M, mobile);
  const gulls = buildGulls(M, mobile ? 6 : 10);
  const clouds = buildClouds(M);

  scene.add(terrain, hotel, pier, boat, sailboat, lighthouse.group, nature);
  gulls.forEach((g) => scene.add(g.group));
  clouds.forEach((c) => scene.add(c));

  const hotelLight = new THREE.PointLight(0xffb36b, 0, 26, 1.5);
  hotelLight.position.set(HOTEL.x, hotelY + 3.5, HOTEL.z + 7);
  scene.add(hotelLight);

  const pierLamp = new THREE.PointLight(0xffc27a, 0, 12, 1.6);
  pierLamp.position.set(PIER.x - 1, PIER.deck + 2.1, PIER.z1 - 0.4);
  scene.add(pierLamp);

  return { M, terrain, hotel, pier, boat, sailboat, lighthouse, gulls, clouds, hotelLight, pierLamp };
}
