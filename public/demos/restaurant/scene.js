// Sofra — procedural table scene (three.js)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(1907);
const R = (a, b) => a + (b - a) * rand();
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const wobble = (x, y, z) =>
  Math.sin(x * 7.1 + y * 3.3) * Math.sin(z * 6.7 - x * 2.1) * 0.6 +
  Math.sin(x * 17.3 + z * 13.1 + y * 5.0) * 0.4;

function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */
function woodTexture() {
  return canvasTex(1024, (g, S) => {
    const planks = 4, ph = S / planks;
    for (let p = 0; p < planks; p++) {
      const y0 = p * ph;
      g.save();
      g.beginPath(); g.rect(0, y0, S, ph); g.clip();
      const l = 9 + rand() * 5;
      g.fillStyle = `hsl(${20 + rand() * 6}, ${38 + rand() * 10}%, ${l}%)`;
      g.fillRect(0, y0, S, ph);
      const phase = rand() * 10;
      for (let i = 0; i < 260; i++) {
        const y = y0 + rand() * ph;
        const dark = rand() > 0.45;
        g.strokeStyle = dark ? `rgba(8,4,2,${0.08 + rand() * 0.22})` : `rgba(120,72,40,${0.04 + rand() * 0.12})`;
        g.lineWidth = 0.6 + rand() * 2.4;
        g.beginPath();
        const amp = 2 + rand() * 7, f = 0.002 + rand() * 0.004;
        for (let x = -10; x <= S + 10; x += 12) {
          const yy = y + Math.sin(x * f + phase + i * 0.03) * amp + Math.sin(x * 0.03 + i) * 0.8;
          if (x === -10) g.moveTo(x, yy); else g.lineTo(x, yy);
        }
        g.stroke();
      }
      // a knot
      if (rand() > 0.35) {
        const kx = rand() * S, ky = y0 + ph * (0.3 + rand() * 0.4);
        const grd = g.createRadialGradient(kx, ky, 1, kx, ky, 26);
        grd.addColorStop(0, 'rgba(10,5,2,.85)'); grd.addColorStop(1, 'rgba(10,5,2,0)');
        g.fillStyle = grd; g.beginPath(); g.ellipse(kx, ky, 46, 16, 0, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.75)';
      g.fillRect(0, y0, S, 3);
    }
  });
}

function linenTexture() {
  return canvasTex(256, (g, S) => {
    g.fillStyle = '#e9dfcd'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 2) {
      g.fillStyle = `rgba(120,100,70,${0.05 + rand() * 0.07})`; g.fillRect(0, i, S, 1);
      g.fillStyle = `rgba(255,255,255,${0.04 + rand() * 0.06})`; g.fillRect(i, 0, 1, S);
    }
  });
}

function charTexture() {
  return canvasTex(256, (g, S) => {
    const grd = g.createLinearGradient(0, 0, S, 0);
    grd.addColorStop(0, '#5a2a12'); grd.addColorStop(0.5, '#7a3d1b'); grd.addColorStop(1, '#5a2a12');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = rand() > 0.5 ? `rgba(30,10,4,${rand() * 0.5})` : `rgba(170,90,40,${rand() * 0.3})`;
      g.fillRect(rand() * S, rand() * S, 1 + rand() * 3, 1 + rand() * 3);
    }
    // grill marks
    g.strokeStyle = 'rgba(18,7,3,.85)'; g.lineWidth = 9;
    for (let k = -2; k < 8; k++) {
      g.beginPath(); g.moveTo(-20, k * 40); g.lineTo(S + 20, k * 40 + 70); g.stroke();
    }
    // isot flakes
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(${150 + rand() * 60},${30 + rand() * 20},20,.8)`;
      g.fillRect(rand() * S, rand() * S, 2, 2);
    }
  });
}

function glowTexture(inner, outer) {
  const t = canvasTex(128, (g, S) => {
    const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, inner); grd.addColorStop(0.35, outer); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ------------------------------------------------------------------ */
/* camera states                                                       */
/* az / el / r: spherical around target. shift: horizontal view offset */
/* ------------------------------------------------------------------ */
const STATE_DEFS = {
  hero:    { tgt: [0, 0.1, 0],     az: 0.0,  el: 1.47, r: 8.4, fov: 34, shift: 0.2,   shiftY: 0.0,  exp: 0.95, key: 2.4, candle: 2.2, fire: 3,  env: 0.55, embers: 0.55, dusk: 0 },
  story:   { tgt: [0.2, 0.3, 0],   az: 0.72, el: 0.58, r: 7.0, fov: 36, shift: -0.17, shiftY: 0.0,  exp: 1.0,  key: 2.2, candle: 2.6, fire: 7,  env: 0.5,  embers: 1.0,  dusk: 0.15 },
  menuA:   { tgt: [0, 0.25, -0.2], az: -0.7, el: 0.5,  r: 6.6, fov: 37, shift: -0.2,  shiftY: 0.0,  exp: 0.98, key: 2.3, candle: 2.6, fire: 4,  env: 0.5,  embers: 0.5,  dusk: 0.2 },
  menuB:   { tgt: [0, 0.25, -0.4], az: -1.5, el: 0.4,  r: 6.2, fov: 37, shift: -0.2,  shiftY: 0.0,  exp: 0.95, key: 2.0, candle: 3.0, fire: 4,  env: 0.45, embers: 0.5,  dusk: 0.3 },
  aksam:   { tgt: [-2.0, 0.6, -1.3], az: 0.5,  el: 0.22, r: 4.3, fov: 38, shift: 0.16,  shiftY: 0.0,  exp: 0.88, key: 0.5, candle: 6.5, fire: 5,  env: 0.16, embers: 0.7,  dusk: 0.75 },
  reserve: { tgt: [-0.6, 0.3, -0.6], az: 1.0,  el: 0.62, r: 7.4, fov: 36, shift: -0.2,  shiftY: 0.0,  exp: 0.74, key: 0.2, candle: 8,  fire: 8,  env: 0.07, embers: 1.0,  dusk: 1 },
};
const KEYS = ['az', 'el', 'r', 'fov', 'shift', 'shiftY', 'exp', 'key', 'candle', 'fire', 'env', 'embers', 'dusk'];

/* ------------------------------------------------------------------ */
export function createScene(canvas, { reduced = false, small = false, states }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const bgDay = new THREE.Color('#10291f');
  const bgNight = new THREE.Color('#050d0a');
  scene.background = bgDay.clone();
  scene.fog = new THREE.Fog(scene.background, 10, 24);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 60);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xf3e1c0, 0x0f2a22, 0.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe0b5, 2.4);
  key.position.set(3.5, 8, 3);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(small ? 1024 : 2048);
  const sc = key.shadow.camera;
  sc.left = -5.5; sc.right = 5.5; sc.top = 5; sc.bottom = -5; sc.near = 1; sc.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  key.shadow.blurSamples = 16;
  scene.add(key);
  const keyBase = key.position.clone();

  const rim = new THREE.DirectionalLight(0x8fbfa6, 0.5);
  rim.position.set(-5, 3, -6);
  scene.add(rim);

  const fireLight = new THREE.PointLight(0xff6a2a, 4, 14, 1.6);
  fireLight.position.set(6.5, 1.2, -4.5);
  scene.add(fireLight);

  /* ---------- materials ---------- */
  const mats = {
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.62, metalness: 0 }),
    linen: new THREE.MeshStandardMaterial({ map: linenTexture(), color: '#8a7f6b', roughness: 0.95 }),
    ceramic: new THREE.MeshPhysicalMaterial({ color: '#efe8dc', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
    glazeGreen: new THREE.MeshPhysicalMaterial({ color: '#1d4a3a', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a45c', metalness: 1, roughness: 0.26 }),
    char: new THREE.MeshStandardMaterial({ map: charTexture(), roughness: 0.62 }),
    tomato: new THREE.MeshPhysicalMaterial({ color: '#b8281a', roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    tomatoCut: new THREE.MeshStandardMaterial({ color: '#d9553a', roughness: 0.5 }),
    pepper: new THREE.MeshPhysicalMaterial({ color: '#4f7a24', roughness: 0.32, clearcoat: 0.7, vertexColors: true }),
    stem: new THREE.MeshStandardMaterial({ color: '#7c8a3a', roughness: 0.6 }),
    onion: new THREE.MeshPhysicalMaterial({ color: '#b2577a', roughness: 0.35, transmission: 0.2, thickness: 0.05 }),
    herb: new THREE.MeshStandardMaterial({ color: '#3f7a2c', roughness: 0.55, side: THREE.DoubleSide }),
    yogurt: new THREE.MeshPhysicalMaterial({ color: '#f4efe4', roughness: 0.35, clearcoat: 0.6, sheen: 0.4 }),
    redOil: new THREE.MeshPhysicalMaterial({ color: '#9c2a17', roughness: 0.15, clearcoat: 1 }),
    hummus: new THREE.MeshStandardMaterial({ color: '#d8b98a', roughness: 0.7 }),
    ezme: new THREE.MeshStandardMaterial({ color: '#a8321e', roughness: 0.5 }),
    wax: new THREE.MeshPhysicalMaterial({ color: '#f3ece0', roughness: 0.55, emissive: '#ff9a4a', emissiveIntensity: 0.04, sheen: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.06, ior: 1.5,
      transparent: true, opacity: 1, envMapIntensity: 1.4, specularIntensity: 1,
    }),
    wine: new THREE.MeshPhysicalMaterial({
      color: '#7a0f1c', roughness: 0.05, transmission: 0.85, thickness: 0.4, ior: 1.34,
      attenuationColor: new THREE.Color('#4a0610'), attenuationDistance: 0.12,
    }),
    raki: new THREE.MeshPhysicalMaterial({ color: '#f1ede4', roughness: 0.4, transmission: 0.35, thickness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 }),
  };
  const shadowy = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  /* ---------- table + runner ---------- */
  const table = new THREE.Mesh(new RoundedBoxGeometry(15, 0.4, 9.5, 3, 0.08), mats.wood);
  table.position.y = -0.2;
  table.receiveShadow = true;
  mats.wood.map.repeat.set(1.6, 1.1);
  mats.wood.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  scene.add(table);

  const runner = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 9.4), mats.linen);
  runner.rotation.x = -Math.PI / 2;
  runner.position.y = 0.004;
  runner.receiveShadow = true;
  mats.linen.map.repeat.set(6, 12);
  scene.add(runner);

  /* ---------- plate ---------- */
  const plateProfile = [
    [0.0, 0.04], [0.85, 0.04], [0.9, 0.0], [0.98, 0.0], [1.03, 0.04], [1.5, 0.165],
    [1.62, 0.215], [1.645, 0.235], [1.615, 0.25], [1.49, 0.215], [1.06, 0.095], [0.96, 0.078], [0.0, 0.078],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const plate = shadowy(new THREE.Mesh(new THREE.LatheGeometry(plateProfile, 112), mats.ceramic));
  scene.add(plate);
  const rimBand = new THREE.Mesh(new THREE.TorusGeometry(1.632, 0.011, 8, 140), mats.brass);
  rimBand.rotation.x = Math.PI / 2;
  rimBand.position.y = 0.243;
  scene.add(rimBand);
  // thin green glaze band that follows the plate's sloped inner wall
  const glazeRing = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(1.36, 0.1815), new THREE.Vector2(1.25, 0.1515),
  ], 112), mats.glazeGreen);
  glazeRing.material = mats.glazeGreen.clone();
  glazeRing.material.side = THREE.DoubleSide;
  glazeRing.receiveShadow = true;
  scene.add(glazeRing);

  const FOOD_Y = 0.08;

  /* ---------- dish items (drop animation) ---------- */
  const items = [];
  function addItem(obj, { pos, rot = [0, 0, 0], order, mode = 'drop', inst = null, index = 0, scale = 1 }) {
    const it = {
      obj, inst, index, mode, order,
      base: new THREE.Vector3(...pos),
      baseRot: new THREE.Euler(...rot),
      baseScale: scale,
      spin: new THREE.Vector3(R(-2, 2), R(-3, 3), R(-2, 2)),
      h: R(2.6, 4.2),
      y: 0, v: 0, q: 0, qv: 0, g: 0, gv: 0,
      started: false, resting: false,
    };
    if (!inst) { obj.visible = false; scene.add(obj); }
    items.push(it);
    return it;
  }

  // yogurt bed (grows)
  const bedShape = new THREE.Shape();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const r = 0.92 + Math.sin(a * 3) * 0.05 + Math.sin(a * 7 + 1) * 0.03;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) bedShape.moveTo(x, y); else bedShape.lineTo(x, y);
  }
  const bedGeo = new THREE.ExtrudeGeometry(bedShape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 64 });
  bedGeo.rotateX(-Math.PI / 2);
  const bed = shadowy(new THREE.Mesh(bedGeo, mats.yogurt));
  bed.receiveShadow = true; bed.castShadow = false;
  addItem(bed, { pos: [0.05, FOOD_Y, 0.05], order: 0.0, mode: 'grow' });

  // red pepper butter swirl (grows)
  const swirlPts = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, a = t * Math.PI * 4.2, r = 0.18 + t * 0.62;
    swirlPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  const swirlGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(swirlPts), 220, 0.019, 6, false);
  swirlGeo.scale(1, 0.35, 1);
  const swirl = new THREE.Mesh(swirlGeo, mats.redOil);
  addItem(swirl, { pos: [0.05, FOOD_Y + 0.03, 0.05], order: 0.55, mode: 'grow' });

  // adana skewers
  const kebabGeo = new THREE.CapsuleGeometry(0.135, 1.05, 8, 20);
  {
    const p = kebabGeo.attributes.position, n = kebabGeo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // ridges from hand-pressing along the skewer
      const d = wobble(x * 2, y * 1.2, z * 2) * 0.018 + Math.sin(y * 18) * 0.012;
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    kebabGeo.computeVertexNormals();
    kebabGeo.rotateZ(Math.PI / 2);
    kebabGeo.scale(1, 0.78, 1);
  }
  const skewerGeo = new THREE.CylinderGeometry(0.012, 0.012, 1.7, 6);
  skewerGeo.rotateZ(Math.PI / 2);
  [
    { p: [-0.05, -0.34], ry: 0.22, o: 0.06 },
    { p: [0.08, 0.0], ry: 0.08, o: 0.14 },
    { p: [0.0, 0.34], ry: -0.08, o: 0.22 },
  ].forEach(({ p, ry, o }) => {
    const g = new THREE.Group();
    const k = shadowy(new THREE.Mesh(kebabGeo, mats.char));
    const s = new THREE.Mesh(skewerGeo, mats.brass);
    s.position.x = 0.15;
    g.add(k, s);
    addItem(g, { pos: [p[0], FOOD_Y + 0.115, p[1]], rot: [0, ry, 0], order: o });
  });

  // roasted green peppers (tapered tube)
  function pepperGeo(len, bend) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(new THREE.Vector3(t * len - len / 2, 0, Math.sin(t * Math.PI) * bend));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const TS = 48, RS = 12;
    const geo = new THREE.TubeGeometry(curve, TS, 0.075, RS, false);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const seg = Math.floor(i / (RS + 1));
      const u = seg / TS;
      curve.getPointAt(u, c);
      v.fromBufferAttribute(pos, i).sub(c);
      const taper = Math.min(1, 0.35 + u * 4) * (1 - Math.pow(u, 2.4) * 0.92);
      v.multiplyScalar(taper);
      v.y *= 0.75;
      pos.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
      const burn = clamp(wobble(c.x * 3, v.y * 4, v.z * 4 + i * 0.001) * 1.2 + 0.1);
      colors[i * 3] = lerp(1, 0.28, burn); colors[i * 3 + 1] = lerp(1, 0.22, burn); colors[i * 3 + 2] = lerp(1, 0.12, burn);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }
  [
    { p: [-0.55, 0.78], ry: 2.6, o: 0.3, len: 0.95 },
    { p: [0.7, -0.72], ry: -0.5, o: 0.34, len: 0.85 },
  ].forEach(({ p, ry, o, len }) => {
    const g = new THREE.Group();
    const m = shadowy(new THREE.Mesh(pepperGeo(len, 0.12), mats.pepper));
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 6), mats.stem);
    st.rotation.z = Math.PI / 2; st.position.x = -len / 2 - 0.05;
    g.add(m, st);
    addItem(g, { pos: [p[0], FOOD_Y + 0.07, p[1]], rot: [0, ry, 0], order: o });
  });

  // tomato halves
  const tomHemi = new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const tomCap = new THREE.CircleGeometry(0.16, 24);
  tomCap.rotateX(Math.PI / 2);
  [[0.95, 0.28], [0.82, 0.62], [-0.9, -0.35], [-0.75, -0.7]].forEach((p, i) => {
    const g = new THREE.Group();
    g.add(shadowy(new THREE.Mesh(tomHemi, mats.tomato)), new THREE.Mesh(tomCap, mats.tomatoCut));
    g.scale.y = 0.8;
    addItem(g, { pos: [p[0], FOOD_Y + 0.02, p[1]], rot: [0, R(0, 6), 0], order: 0.38 + i * 0.05 });
  });

  // sumac onion rings
  const ringGeo = new THREE.TorusGeometry(0.11, 0.018, 6, 28);
  ringGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < (small ? 5 : 8); i++) {
    const a = R(0, Math.PI * 2), r = R(0.55, 1.0);
    const m = new THREE.Mesh(ringGeo, mats.onion);
    m.castShadow = true;
    addItem(m, { pos: [Math.cos(a) * r, FOOD_Y + 0.03 + R(0, 0.06), Math.sin(a) * r], rot: [R(-0.3, 0.3), R(0, 6), R(-0.3, 0.3)], scale: R(0.7, 1.15), order: 0.62 + i * 0.015 });
  }

  // parsley leaves (instanced)
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.bezierCurveTo(0.05, 0.03, 0.07, 0.09, 0, 0.16);
  leaf.bezierCurveTo(-0.07, 0.09, -0.05, 0.03, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leaf, 6);
  leafGeo.rotateX(-Math.PI / 2);
  {
    const p = leafGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, Math.abs(p.getX(i)) * 0.4 - p.getZ(i) * 0.08);
    leafGeo.computeVertexNormals();
  }
  const HERBS = small ? 22 : 38;
  const herbs = new THREE.InstancedMesh(leafGeo, mats.herb, HERBS);
  herbs.castShadow = true;
  herbs.frustumCulled = false;
  herbs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const herbCol = new THREE.Color();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < HERBS; i++) {
    herbs.setMatrixAt(i, zero);
    herbCol.setHSL(0.27 + R(-0.03, 0.03), 0.55, 0.26 + R(-0.06, 0.08));
    herbs.setColorAt(i, herbCol);
    const a = R(0, Math.PI * 2), r = Math.sqrt(rand()) * 1.05;
    addItem(new THREE.Object3D(), {
      inst: herbs, index: i,
      pos: [Math.cos(a) * r, FOOD_Y + 0.2 + R(0, 0.05), Math.sin(a) * r],
      rot: [R(-0.4, 0.4), R(0, 6.28), R(-0.4, 0.4)], scale: R(0.8, 1.35),
      order: 0.78 + (i / HERBS) * 0.22,
    });
  }
  scene.add(herbs);

  /* ---------- cutlery ---------- */
  const knifeShape = new THREE.Shape();
  knifeShape.moveTo(-0.055, 0);
  knifeShape.lineTo(0.055, 0);
  knifeShape.lineTo(0.06, 0.95);
  knifeShape.lineTo(0.035, 1.0);
  knifeShape.lineTo(0.07, 1.05);
  knifeShape.quadraticCurveTo(0.09, 1.75, 0.01, 2.08);
  knifeShape.lineTo(-0.045, 2.0);
  knifeShape.lineTo(-0.04, 1.05);
  knifeShape.lineTo(-0.035, 1.0);
  knifeShape.lineTo(-0.06, 0.95);
  knifeShape.lineTo(-0.055, 0);
  const forkShape = new THREE.Shape();
  const fp = [
    [-0.06, 0], [0.06, 0], [0.055, 0.95], [0.03, 1.12], [0.12, 1.32], [0.12, 1.88], [0.088, 1.88], [0.088, 1.5],
    [0.048, 1.5], [0.048, 1.88], [0.016, 1.88], [0.016, 1.5], [-0.016, 1.5], [-0.016, 1.88], [-0.048, 1.88],
    [-0.048, 1.5], [-0.088, 1.5], [-0.088, 1.88], [-0.12, 1.88], [-0.12, 1.32], [-0.03, 1.12], [-0.055, 0.95],
  ];
  fp.forEach(([x, y], i) => (i === 0 ? forkShape.moveTo(x, y) : forkShape.lineTo(x, y)));
  forkShape.closePath();
  const ext = { depth: 0.018, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 16 };
  const knife = shadowy(new THREE.Mesh(new THREE.ExtrudeGeometry(knifeShape, ext), mats.brass));
  knife.rotation.set(-Math.PI / 2, 0, 0);
  knife.position.set(2.0, 0.014, 1.05);
  knife.rotation.z = 0; // blade points to -z (away)
  scene.add(knife);
  const fork = shadowy(new THREE.Mesh(new THREE.ExtrudeGeometry(forkShape, ext), mats.brass));
  fork.rotation.set(-Math.PI / 2, 0, 0);
  fork.position.set(-2.0, 0.014, 1.0);
  scene.add(fork);

  /* ---------- glasses ---------- */
  const wineProfile = [
    [0, 0.0], [0.3, 0.0], [0.31, 0.012], [0.06, 0.03], [0.03, 0.09], [0.024, 0.52], [0.06, 0.6],
    [0.2, 0.7], [0.285, 0.88], [0.285, 1.08], [0.245, 1.3], [0.236, 1.3], [0.274, 1.08], [0.274, 0.88],
    [0.195, 0.715], [0.05, 0.625], [0, 0.615],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const wineGlass = new THREE.Group();
  const wg = new THREE.Mesh(new THREE.LatheGeometry(wineProfile, 64), mats.glass);
  wg.castShadow = true;
  const wineLiquid = new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0.622], [0.05, 0.63], [0.19, 0.72], [0.262, 0.86], [0.27, 0.93], [0, 0.93],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 48), mats.wine);
  wineGlass.add(wineLiquid, wg);
  wineGlass.position.set(2.55, 0, -1.55);
  wineGlass.scale.setScalar(1.15);
  scene.add(wineGlass);

  const rakiGlass = new THREE.Group();
  const rg = new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0], [0.15, 0], [0.155, 0.04], [0.12, 0.45], [0.16, 0.95], [0.15, 0.95], [0.11, 0.45], [0.142, 0.05], [0, 0.05],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 48), mats.glass);
  rg.castShadow = true;
  const rl = new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0.052], [0.14, 0.055], [0.108, 0.45], [0.135, 0.68], [0, 0.68],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40), mats.raki);
  rakiGlass.add(rl, rg);
  rakiGlass.position.set(3.25, 0, -0.55);
  scene.add(rakiGlass);

  /* ---------- meze bowls ---------- */
  const bowlGeo = new THREE.LatheGeometry([
    [0, 0], [0.32, 0], [0.42, 0.06], [0.52, 0.2], [0.54, 0.22], [0.5, 0.22], [0.4, 0.09], [0, 0.07],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 64);
  const dipGeo = new THREE.CircleGeometry(0.44, 48);
  dipGeo.rotateX(-Math.PI / 2);
  {
    const p = dipGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
      p.setY(i, (1 - r / 0.44) * 0.06 + Math.sin(Math.atan2(z, x) * 5 + r * 20) * 0.01 * (1 - r / 0.44));
    }
    dipGeo.computeVertexNormals();
  }
  [
    { p: [-0.95, -2.75], m: mats.yogurt, glaze: mats.glazeGreen },
    { p: [0.55, -2.95], m: mats.ezme, glaze: mats.ceramic },
    { p: [-3.0, 0.9], m: mats.hummus, glaze: mats.glazeGreen },
  ].forEach(({ p, m, glaze }) => {
    const g = new THREE.Group();
    g.add(shadowy(new THREE.Mesh(bowlGeo, glaze)));
    const d = new THREE.Mesh(dipGeo, m);
    d.position.y = 0.11;
    g.add(d);
    g.position.set(p[0], 0, p[1]);
    scene.add(g);
  });

  /* ---------- candle ---------- */
  const candle = new THREE.Group();
  const holder = shadowy(new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0], [0.34, 0], [0.36, 0.03], [0.3, 0.06], [0.1, 0.09], [0.08, 0.3], [0.2, 0.36], [0.22, 0.4], [0.18, 0.41], [0, 0.4],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 48), mats.brass));
  const waxMesh = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.9, 32), mats.wax));
  waxMesh.position.y = 0.4 + 0.45;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), mats.dark);
  wick.position.y = 1.33;
  candle.add(holder, waxMesh, wick);

  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime; varying vec2 vUv; varying float vH;
      void main(){
        vUv = uv; vec3 p = position;
        float h = clamp(p.y / 0.24, 0.0, 1.0); vH = h;
        p.x += sin(uTime * 9.0 + h * 3.0) * 0.012 * h * h;
        p.z += cos(uTime * 7.0 + h * 2.0) * 0.008 * h * h;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying float vH;
      void main(){
        vec3 core = vec3(1.0, 0.96, 0.82);
        vec3 edge = vec3(1.0, 0.48, 0.12);
        vec3 col = mix(core, edge, smoothstep(0.25, 0.95, vH));
        col = mix(vec3(0.35, 0.45, 1.0), col, smoothstep(0.0, 0.14, vH));
        float a = (1.0 - smoothstep(0.7, 1.0, vH)) * 0.95;
        gl_FragColor = vec4(col * 1.6, a);
      }`,
  });
  const flamePts = [];
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    flamePts.push(new THREE.Vector2(0.05 * Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - t * 0.2) + 0.0001, t * 0.24));
  }
  const flame = new THREE.Mesh(new THREE.LatheGeometry(flamePts, 20), flameMat);
  flame.position.y = 1.345;
  candle.add(flame);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,220,160,1)', 'rgba(255,140,60,.35)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  halo.position.y = 1.45;
  halo.scale.setScalar(1.1);
  candle.add(halo);
  const candleLight = new THREE.PointLight(0xffa860, 2.5, 9, 1.8);
  candleLight.position.y = 1.5;
  candle.add(candleLight);
  candle.position.set(-2.95, 0, -1.7);
  scene.add(candle);

  /* ---------- off-screen fire glow + embers ---------- */
  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,150,70,1)', 'rgba(194,65,45,.4)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false,
  }));
  fireGlow.position.set(8, 0.5, -7);
  fireGlow.scale.setScalar(9);
  scene.add(fireGlow);

  const EMBERS = small ? 140 : 360;
  const eGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(EMBERS * 3), eSeed = new Float32Array(EMBERS), eSpeed = new Float32Array(EMBERS);
  for (let i = 0; i < EMBERS; i++) {
    // cluster toward the fire (back right) but scatter everywhere
    const near = rand() < 0.6;
    ePos[i * 3] = near ? R(3, 9) : R(-8, 8);
    ePos[i * 3 + 1] = 0;
    ePos[i * 3 + 2] = near ? R(-8, -2.5) : R(-7, 3);
    eSeed[i] = rand();
    eSpeed[i] = R(0.035, 0.11);
  }
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 1));
  eGeo.setAttribute('aSpeed', new THREE.BufferAttribute(eSpeed, 1));
  const eMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uIntensity: { value: 0.6 }, uSize: { value: 26 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uTime, uPR, uSize; attribute float aSeed, aSpeed;
      varying float vLife; varying float vSeed;
      void main(){
        vec3 p = position;
        float life = fract(aSeed + uTime * aSpeed);
        p.y = mix(-0.6, 5.2, life);
        p.x += sin(uTime * 0.7 + aSeed * 40.0) * 0.5 * life - life * 1.6;
        p.z += cos(uTime * 0.5 + aSeed * 23.0) * 0.4 * life + life * 0.8;
        vLife = life; vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(18.0 * uPR, uSize * uPR * (0.45 + fract(aSeed * 13.7)) * (1.0 - life * 0.55) / max(0.5, -mv.z));
      }`,
    fragmentShader: /* glsl */`
      uniform float uIntensity, uTime; varying float vLife; varying float vSeed;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife));
        float tw = 0.65 + 0.35 * sin(uTime * 11.0 + vSeed * 80.0);
        vec3 col = mix(vec3(1.0, 0.86, 0.52), vec3(0.9, 0.24, 0.1), smoothstep(0.1, 0.8, vLife));
        gl_FragColor = vec4(col * tw * 1.5, a * uIntensity);
      }`,
  });
  const embers = new THREE.Points(eGeo, eMat);
  embers.frustumCulled = false;
  scene.add(embers);

  /* ------------------------------------------------------------------ */
  /* state / animation                                                   */
  /* ------------------------------------------------------------------ */
  const defs = states.map((n) => STATE_DEFS[n]);
  let targetF = 0, curF = 0, scrollVH = 0;
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const cur = {};
  const tgtV = new THREE.Vector3();
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  function blend(f) {
    const i = clamp(Math.floor(f), 0, defs.length - 1);
    const j = Math.min(defs.length - 1, i + 1);
    const t = smooth(clamp(f - i));
    const A = defs[i], B = defs[j];
    for (const k of KEYS) cur[k] = lerp(A[k], B[k], t);
    tmpA.fromArray(A.tgt); tmpB.fromArray(B.tgt);
    tgtV.lerpVectors(tmpA, tmpB, t);
  }

  const startTime = performance.now();
  let elapsed = 0;
  const dummy = new THREE.Object3D();
  const viewport = { w: 1, h: 1, portrait: false };

  function updateItems(dt, reveal) {
    let instDirty = false;
    for (const it of items) {
      if (!it.started && reveal >= it.order) {
        it.started = true;
        if (reduced) { it.resting = true; it.y = 0; it.q = 0; it.g = 1; }
        else if (it.mode === 'drop') { it.y = it.h; it.v = 0; it.g = 1; }
        else { it.g = 0; it.gv = 0; }
        if (!it.inst) it.obj.visible = true;
      }
      if (!it.started) continue;
      if (!it.resting) {
        if (it.mode === 'drop') {
          it.v -= 16 * dt;
          it.y += it.v * dt;
          if (it.y <= 0) {
            it.y = 0;
            if (Math.abs(it.v) > 0.6) { it.qv -= Math.min(6, Math.abs(it.v) * 0.9); it.v = -it.v * 0.3; }
            else it.v = 0;
          }
          // squash/stretch spring
          const qa = -260 * it.q - 12 * it.qv;
          it.qv += qa * dt; it.q += it.qv * dt;
          if (it.y === 0 && it.v === 0 && Math.abs(it.q) < 0.002 && Math.abs(it.qv) < 0.02) { it.q = 0; it.resting = true; }
        } else {
          const ga = -90 * (it.g - 1) - 9 * it.gv;
          it.gv += ga * dt; it.g += it.gv * dt;
          if (Math.abs(it.g - 1) < 0.002 && Math.abs(it.gv) < 0.01) { it.g = 1; it.resting = true; }
        }
      }
      const o = it.inst ? dummy : it.obj;
      const fall = it.mode === 'drop' ? clamp(it.y / it.h) : 0;
      o.position.copy(it.base); o.position.y += it.y;
      o.rotation.set(it.baseRot.x + it.spin.x * fall, it.baseRot.y + it.spin.y * fall, it.baseRot.z + it.spin.z * fall);
      const s = it.baseScale * (it.mode === 'grow' ? Math.max(0.0001, it.g) : 1);
      const sq = clamp(it.q, -0.4, 0.4);
      if (it.mode === 'grow') {
        o.scale.set(s, s, s);
        o.rotation.y = it.baseRot.y + (1 - it.g) * 1.5;
      } else o.scale.set(s * (1 - sq * 0.5), s * (1 + sq), s * (1 - sq * 0.5));
      if (it.inst) {
        dummy.updateMatrix();
        it.inst.setMatrixAt(it.index, dummy.matrix);
        instDirty = true;
      }
    }
    if (instDirty) herbs.instanceMatrix.needsUpdate = true;
  }

  function applyCamera() {
    let { az, el, r } = cur;
    if (viewport.portrait) r *= 1.38;
    az += ptr.sx * 0.07;
    el = clamp(el - ptr.sy * 0.035, 0.12, 1.5);
    camera.position.set(
      tgtV.x + r * Math.cos(el) * Math.sin(az),
      tgtV.y + r * Math.sin(el),
      tgtV.z + r * Math.cos(el) * Math.cos(az),
    );
    camera.lookAt(tgtV);
    camera.fov = cur.fov * (viewport.portrait ? 1.08 : 1);
    const wide = viewport.w / viewport.h > 1.05;
    const aspect = viewport.w / viewport.h;
    const sx = wide ? cur.shift * clamp(1.9 - aspect * 0.5, 1, 1.45) : 0;
    const sy = viewport.portrait ? lerp(0.14, -0.14, clamp(curF)) : 0;
    camera.setViewOffset(viewport.w, viewport.h, -sx * viewport.w, -sy * viewport.h, viewport.w, viewport.h);
    camera.updateProjectionMatrix();
  }

  function applyLook(t) {
    const flick = reduced ? 1 :
      0.86 + Math.sin(t * 13.0) * 0.05 + Math.sin(t * 23.7 + 1.3) * 0.04 + Math.sin(t * 5.3) * 0.04 + (Math.random() - 0.5) * 0.04;
    renderer.toneMappingExposure = cur.exp;
    key.intensity = cur.key;
    key.position.set(keyBase.x + ptr.sx * 1.6, keyBase.y, keyBase.z + ptr.sy * 1.2);
    hemi.intensity = lerp(0.35, 0.06, cur.dusk);
    rim.intensity = lerp(0.5, 0.12, cur.dusk);
    candleLight.intensity = cur.candle * flick;
    halo.material.opacity = lerp(0.55, 1, cur.dusk) * flick;
    halo.scale.setScalar(lerp(0.9, 1.6, cur.dusk) * (0.95 + flick * 0.05));
    flame.scale.set(1, 0.92 + flick * 0.1, 1);
    fireLight.intensity = cur.fire * (reduced ? 1 : 0.85 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 7.9) * 0.07);
    fireGlow.material.opacity = 0.25 + cur.dusk * 0.45;
    scene.environmentIntensity = cur.env;
    eMat.uniforms.uIntensity.value = cur.embers;
    scene.background.copy(bgDay).lerp(bgNight, cur.dusk);
    scene.fog.color.copy(scene.background);
    mats.wax.emissiveIntensity = lerp(0.04, 0.18, cur.dusk) * flick;
  }

  /* ---------- loop ---------- */
  let raf = 0, last = performance.now(), active = true, needsRender = true;

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) elapsed += dt;
    const t = elapsed;

    if (reduced) curF = targetF;
    else curF += (targetF - curF) * (1 - Math.exp(-dt * 3.2));
    ptr.sx += (ptr.x - ptr.sx) * (1 - Math.exp(-dt * 2.5));
    ptr.sy += (ptr.y - ptr.sy) * (1 - Math.exp(-dt * 2.5));

    const intro = clamp(((now - startTime) / 1000 - 0.5) / 2.0) * 0.6;
    const reveal = reduced ? 1 : Math.max(intro, scrollVH > 0.02 ? 0.6 + clamp(scrollVH / 0.6) * 0.4 : 0);
    updateItems(dt, reveal);

    blend(curF);
    applyCamera();
    applyLook(t);
    flameMat.uniforms.uTime.value = t;
    eMat.uniforms.uTime.value = t;

    renderer.render(scene, camera);
    needsRender = false;
    if (!reduced && active) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && active) raf = requestAnimationFrame(frame);
  }

  function resize() {
    viewport.w = window.innerWidth; viewport.h = window.innerHeight;
    viewport.portrait = viewport.w / viewport.h < 0.85;
    renderer.setSize(viewport.w, viewport.h, false);
    camera.aspect = viewport.w / viewport.h;
    eMat.uniforms.uPR.value = renderer.getPixelRatio();
    needsRender = true;
    kick();
  }
  resize();

  return {
    setScroll(f, vh) {
      targetF = f; scrollVH = vh;
      if (reduced) { needsRender = true; kick(); }
    },
    setPointer(x, y) { ptr.x = x; ptr.y = y; },
    setActive(on) {
      active = on;
      if (on) { last = performance.now(); kick(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    resize,
  };
}
