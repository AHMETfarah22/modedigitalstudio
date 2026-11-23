// Ekşi Maya Fırın — scroll-driven 3D bakery concept.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import {
  crustMaterial, woodMaterial, loafGeometry, simitGeometry, sesameMesh, croissantGeometry,
  bunGeometry, icingGeometry, pogacaGeometry, nigellaMesh, peelGeometry, buildOven, OVEN,
  flourParticles, lightBeam,
} from './bakes.js';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const instant = /[?&]still/.test(location.search); // review aid: skip scroll smoothing

/* ======================================================================
   Page UI (works with or without WebGL)
   ====================================================================== */
const header = document.getElementById('top');
const stepsList = document.querySelector('.steps');
const steps = [...document.querySelectorAll('.step')];

function initReveals() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));

  const sio = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) {
      steps.forEach((s) => s.classList.toggle('is-active', s === en.target));
    }
  }, { rootMargin: '-42% 0px -42% 0px' });
  steps.forEach((s) => sio.observe(s));
}

function onScrollUI() {
  header.classList.toggle('is-stuck', window.scrollY > 24);
  if (stepsList) {
    const r = stepsList.getBoundingClientRect();
    const f = THREE.MathUtils.clamp((window.innerHeight * 0.5 - r.top) / r.height, 0, 1);
    stepsList.style.setProperty('--fill', (f * 100).toFixed(1) + '%');
  }
}

/* ---------- pre-order form ---------- */
function initForm() {
  const form = document.getElementById('order-form');
  const confirmBox = document.getElementById('order-confirm');
  const again = document.getElementById('order-again');
  const date = document.getElementById('f-date');
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDay() === 1) tomorrow.setDate(tomorrow.getDate() + 1); // Monday: closed
  date.min = iso(new Date(Date.now() + 864e5));
  date.value = iso(tomorrow);

  const setErr = (id, msg) => {
    const input = document.getElementById('f-' + id);
    const err = document.getElementById('e-' + id);
    err.textContent = msg || '';
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'e-' + id); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !msg;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const qty = Number(fd.get('qty'));
    const dv = String(fd.get('date') || '');
    const d = dv ? new Date(dv + 'T00:00') : null;
    let ok = true;
    ok = setErr('name', name.length < 2 ? 'Adını yaz, poşete onu yazacağız.' : '') && ok;
    ok = setErr('email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Geçerli bir e-posta adresi gir.') && ok;
    ok = setErr('qty', qty >= 1 && qty <= 20 ? '' : '1 ile 20 arasında bir adet seç.') && ok;
    let dateMsg = '';
    if (!d || isNaN(d)) dateMsg = 'Bir teslim günü seç.';
    else if (dv < date.min) dateMsg = 'En erken yarın için sipariş alabiliyoruz.';
    else if (d.getDay() === 1) dateMsg = 'Pazartesi fırın kapalı. Başka bir gün seç.';
    ok = setErr('date', dateMsg) && ok;
    if (!ok) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }

    const day = d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    const first = name.split(/\s+/)[0];
    document.getElementById('confirm-title').textContent = `Ayırdık, ${first}.`;
    document.getElementById('confirm-body').textContent =
      `${qty} × ${fd.get('product')}, ${day} ${fd.get('slot')} arası Moda'da seni bekliyor. Ödemeyi teslimde yaparsın.`;
    form.hidden = true;
    confirmBox.hidden = false;
    confirmBox.focus();
  });

  again.addEventListener('click', () => {
    form.reset();
    date.value = iso(tomorrow);
    confirmBox.hidden = true;
    form.hidden = false;
    document.getElementById('f-name').focus();
  });
}

initReveals();
initForm();
onScrollUI();
window.addEventListener('scroll', onScrollUI, { passive: true });

/* ======================================================================
   WebGL scene
   ====================================================================== */
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

if (!hasWebGL()) {
  root.classList.add('no-webgl');
  initMoodWithoutGL();
} else {
  try { initScene(); } catch (err) {
    console.warn('WebGL sahnesi başlatılamadı:', err);
    root.classList.add('no-webgl');
    initMoodWithoutGL();
  }
}

function initMoodWithoutGL() {
  const morning = document.getElementById('saatler');
  const upd = () => root.classList.toggle('is-morning', morning.getBoundingClientRect().top < window.innerHeight * 0.4);
  upd();
  window.addEventListener('scroll', upd, { passive: true });
}

function initScene() {
  const canvas = document.getElementById('scene');
  let mobile = window.innerWidth < 768;
  const low = mobile || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const NIGHT_BG = new THREE.Color('#1d1a17');
  const MORNING_BG = new THREE.Color('#eadbc3');
  scene.background = NIGHT_BG.clone();
  scene.fog = new THREE.Fog(scene.background.clone(), 10, 28);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(mobile ? 40 : 32, window.innerWidth / window.innerHeight, 0.1, 80);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight('#ffe2b8', '#2a1d15', 0.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffd2a0', 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  key.shadow.camera.left = -3.6; key.shadow.camera.right = 3.6;
  key.shadow.camera.top = 3.6; key.shadow.camera.bottom = -3.6;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#ffb37a', 0.6);
  scene.add(rim, rim.target);
  const ovenLight = new THREE.PointLight('#ff7a2a', 6, 16, 1.6);
  ovenLight.position.set(0, 1.7, OVEN.z + 0.7);
  scene.add(ovenLight);
  const ovenInner = new THREE.PointLight('#ff9a4a', 3, 4, 1.5);
  ovenInner.position.set(0, 2.2, OVEN.z - 1.5);
  scene.add(ovenInner);

  const NIGHT_KEY = new THREE.Vector3(-3, 6, 2.5);
  const MORNING_KEY = new THREE.Vector3(4.5, 5.5, 2.8);
  const NIGHT_KEY_COL = new THREE.Color('#ffd2a0');
  const MORNING_KEY_COL = new THREE.Color('#fff4e4');

  /* ---------- floor / counter ---------- */
  const floorMat = new THREE.MeshStandardMaterial({ color: '#2b231d', roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const NIGHT_FLOOR = new THREE.Color('#2b231d');
  const MORNING_FLOOR = new THREE.Color('#c7ab86');

  /* ---------- oven ---------- */
  const oven = buildOven(low);
  oven.scale.setScalar(1.3);
  scene.add(oven);

  /* ---------- peel + loaf ---------- */
  const peel = new THREE.Group();
  const peelMesh = new THREE.Mesh(peelGeometry(), woodMaterial({ light: '#c99c66', dark: '#8a5a31', freq: 24 }));
  peelMesh.castShadow = true; peelMesh.receiveShadow = true;
  peel.add(peelMesh);
  scene.add(peel);

  const loafMat = crustMaterial({ golden: '#c98a3e', deep: '#57290f', pale: '#ecd09e', dough: '#dcc49a', flour: 0.75, score: true, rough: 0.74, bump: 0.016 });
  const loafGeo = loafGeometry(low ? 0.65 : 1);
  const loaf = new THREE.Mesh(loafGeo, loafMat);
  loaf.castShadow = true; loaf.receiveShadow = true;
  const loafPivot = new THREE.Group(); // sits on the peel, takes pointer tilt
  loafPivot.add(loaf);
  scene.add(loafPivot);

  /* ---------- simit ---------- */
  const simitGeo = simitGeometry(low ? 0.7 : 1);
  const simitMat = crustMaterial({ golden: '#b8652b', deep: '#5a280e', gloss: 0.6, rough: 0.6, bump: 0.01, scale: 1.4 });
  function makeSimit(seeds) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(simitGeo, simitMat);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m, sesameMesh(seeds));
    return g;
  }
  const simit = makeSimit(low ? 260 : 520);
  scene.add(simit);

  /* ---------- turntable with the full range ---------- */
  const STATION = new THREE.Vector3(7, 0, 0);
  const table = new THREE.Group();
  table.position.copy(STATION);
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.25, 0.14, 72), woodMaterial({ light: '#b98a57', dark: '#7d5130', freq: 18 }));
  tableTop.position.y = 0.07; tableTop.castShadow = true; tableTop.receiveShadow = true;
  const tableFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.06, 48), new THREE.MeshStandardMaterial({ color: '#3a2c22', roughness: 0.6 }));
  tableFoot.position.y = 0.03;
  scene.add(tableFoot); tableFoot.position.x = STATION.x;
  const spinner = new THREE.Group();
  spinner.add(tableTop);
  table.add(spinner);
  scene.add(table);

  const items = [];
  const loafCopy = new THREE.Mesh(loafGeo, crustMaterial({ golden: '#c98a3e', deep: '#57290f', pale: '#ecd09e', flour: 0.75, score: true, rough: 0.74, bump: 0.016 }));
  loafCopy.morphTargetInfluences[0] = 0;
  loafCopy.scale.setScalar(0.6); loafCopy.position.y = 0.14 + 0.28 * 0.6;
  items.push(loafCopy);

  const simitCopy = makeSimit(low ? 200 : 380);
  simitCopy.scale.setScalar(0.85); simitCopy.position.y = 0.14 + 0.15;
  items.push(simitCopy);

  const croissant = new THREE.Mesh(croissantGeometry(), crustMaterial({ golden: '#d9963f', deep: '#7a3812', gloss: 0.65, rough: 0.55, bump: 0.009, scale: 1.6 }));
  croissant.position.y = 0.14;
  items.push(croissant);

  const bun = new THREE.Group();
  const bunMesh = new THREE.Mesh(bunGeometry(), crustMaterial({ golden: '#c98546', deep: '#5c2a10', gloss: 0.35, rough: 0.6, bump: 0.01, scale: 1.5 }));
  const icing = new THREE.Mesh(icingGeometry(), new THREE.MeshStandardMaterial({ color: '#fbf6ec', roughness: 0.28 }));
  bun.add(bunMesh, icing); bun.scale.setScalar(1.1); bun.position.y = 0.14;
  items.push(bun);

  const pogaca = new THREE.Group();
  const pogacaMesh = new THREE.Mesh(pogacaGeometry(), crustMaterial({ golden: '#e1a34c', deep: '#9a5216', gloss: 0.85, rough: 0.5, bump: 0.008, scale: 1.4 }));
  pogaca.add(pogacaMesh, nigellaMesh(low ? 30 : 46));
  pogaca.scale.setScalar(1.05); pogaca.position.y = 0.14 - 0.14 * 0.28 * 1.05 + 0.02;
  items.push(pogaca);

  items.forEach((it, i) => {
    const a = (i / items.length) * Math.PI * 2;
    it.position.x = Math.cos(a) * 1.3;
    it.position.z = Math.sin(a) * 1.3;
    it.rotation.y = -a + Math.PI * 0.5;
    it.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
    spinner.add(it);
  });

  /* ---------- beam + flour ---------- */
  const beamTarget = new THREE.Vector3(0, 0.4, 0);
  const beamOrigin = beamTarget.clone().addScaledVector(NIGHT_KEY, 0.92);
  const beamDir = beamTarget.clone().sub(beamOrigin).normalize();
  const beam = lightBeam(beamOrigin, beamDir, 7.2, 1.7);
  scene.add(beam);
  const flour = flourParticles(low ? 380 : 900, beamOrigin, beamDir);
  scene.add(flour);

  /* ======================================================================
     Scroll states
     ====================================================================== */
  const BASE = {
    cam: [0.6, 2.9, 7.6], look: [0, 0.45, -0.3], sx: 0.2, msy: 0.23,
    peel: [0, 0, 0], peelRot: 0.9, loafScale: 1, bake: 1, rise: 1, spin: 1,
    simitOrbit: 1, simitVis: 1, oven: 0.6, beam: 1, morning: 0,
  };
  const K = [
    // 0 hero: the loaf on its peel, simit orbiting, flour in the beam
    { ...BASE },
    // 1 process start: back to dough
    { ...BASE, cam: [-3.4, 3.3, 5.2], look: [0, 0.35, 0], sx: -0.2, loafScale: 0.8, bake: 0, rise: 0, spin: 0.25, simitVis: 0, oven: 0.75, beam: 0.55 },
    // 2 process middle: the dough has risen, camera turns toward the oven
    { ...BASE, cam: [-2.6, 2.3, 4.6], look: [0, 0.5, -0.8], sx: -0.2, loafScale: 1, bake: 0, rise: 1, spin: 0.1, simitVis: 0, oven: 1.0, beam: 0.3 },
    // 3 process end: peel slides into the glowing stone oven, the crust bakes
    { ...BASE, cam: [2.6, 2.4, 0.6], look: [0, 1.15, -7.6], sx: -0.18, peel: [0, 0.69, -7.6], peelRot: -Math.PI / 2, loafScale: 0.82, bake: 1, rise: 1, spin: 0, simitVis: 0, oven: 1.75, beam: 0 },
    // 4 products: turntable with the whole range
    { ...BASE, cam: [7.4, 3.5, 7.2], look: [7, 0.35, 0], sx: 0.2, spin: 0.4, oven: 0.5, beam: 0 },
    // 5 morning: calm daylight over the counter
    { ...BASE, cam: [3.2, 5.0, 5.4], look: [0.3, 0.2, 0.3], sx: -0.2, spin: 0.15, simitOrbit: 0, oven: 0.12, beam: 0, morning: 1 },
    // 6 order: close and low, ready to take home
    { ...BASE, cam: [-2.8, 1.9, 5.0], look: [0.2, 0.4, 0.2], sx: 0.22, spin: 0.1, simitOrbit: 0, oven: 0.1, beam: 0, morning: 1 },
  ];
  const keys = Object.keys(BASE);
  const S = structuredClone(BASE);
  const lerp = THREE.MathUtils.lerp;
  const ease = (x) => x * x * (3 - 2 * x);
  function sample(p) {
    const i = Math.min(K.length - 2, Math.max(0, Math.floor(p)));
    const f = ease(THREE.MathUtils.clamp(p - i, 0, 1));
    const a = K[i], b = K[i + 1];
    for (const k of keys) {
      if (Array.isArray(a[k])) for (let j = 0; j < a[k].length; j++) S[k][j] = lerp(a[k][j], b[k][j], f);
      else S[k] = lerp(a[k], b[k], f);
    }
    return S;
  }

  let ky = [];
  function layout() {
    const vh = window.innerHeight;
    const off = (id) => { const el = document.getElementById(id); let y = 0, n = el; while (n) { y += n.offsetTop; n = n.offsetParent; } return [y, el.offsetHeight]; };
    const [pT, pH] = off('surec');
    const [prT] = off('urunler');
    const [mT] = off('saatler');
    const [oT] = off('siparis');
    ky = [0, pT - vh * 0.25, pT + pH * 0.45, pT + pH - vh, prT - vh * 0.15, mT - vh * 0.2, oT - vh * 0.2];
    for (let i = 1; i < ky.length; i++) ky[i] = Math.max(ky[i], ky[i - 1] + 1);
  }
  function progress(y) {
    if (y <= ky[0]) return 0;
    for (let i = 0; i < ky.length - 1; i++) {
      if (y < ky[i + 1]) return i + (y - ky[i]) / (ky[i + 1] - ky[i]);
    }
    return ky.length - 1;
  }

  /* ======================================================================
     Frame
     ====================================================================== */
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), look = new THREE.Vector3();
  const simitRest = new THREE.Vector3(1.55, 0.18, 1.05);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let smoothP = progress(window.scrollY);
  let t = 0, last = performance.now(), raf = 0;
  let isMorning = false;

  function update(dt) {
    const target = progress(window.scrollY);
    smoothP = (reduced || instant) ? target : smoothP + (target - smoothP) * (1 - Math.exp(-dt * 3.2));
    sample(smoothP);
    const k = reduced ? 0 : 1;
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 4)) * k;
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 4)) * k;

    // camera
    look.fromArray(S.look);
    tmpA.fromArray(S.cam);
    tmpA.sub(look).multiplyScalar(mobile ? 1.55 : Math.max(1, 1.65 / camera.aspect)).add(look);
    tmpA.x += pointer.sx * 0.18; tmpA.y -= pointer.sy * 0.1;
    camera.position.copy(tmpA);
    camera.lookAt(look);
    const w = window.innerWidth, h = window.innerHeight;
    const sx = mobile ? 0 : S.sx, sy = mobile ? S.msy : 0;
    camera.setViewOffset(w, h, -sx * w, sy * h, w, h);

    // peel + loaf
    peel.position.fromArray(S.peel);
    peel.rotation.y = S.peelRot;
    const bake = S.bake;
    loafMat.userData.u.uBake.value = bake;
    loaf.morphTargetInfluences[0] = 1 - bake;
    const syS = S.loafScale * (0.6 + 0.4 * S.rise);
    const sxz = S.loafScale * (1 + 0.14 * (1 - S.rise));
    loaf.scale.set(sxz, syS, sxz);
    loaf.position.y = (0.279 * bake + 0.216 * (1 - bake)) * syS;
    loafPivot.position.copy(peel.position).add(tmpB.set(0, 0.08, 0));
    loaf.rotation.y += dt * 0.22 * S.spin * k;
    loafPivot.rotation.x = pointer.sy * 0.12;
    loafPivot.rotation.z = -pointer.sx * 0.12;
    // subtle breathing while proofing
    if (!reduced && S.bake < 0.5) loaf.scale.y *= 1 + Math.sin(t * 1.6) * 0.012 * (1 - S.bake);

    // simit
    const a = t * 0.32;
    tmpA.set(Math.cos(a) * 1.9, 1.05 + Math.sin(t * 1.1) * 0.08, Math.sin(a) * 1.25 - 0.2).add(loafPivot.position);
    simit.position.lerpVectors(simitRest, tmpA, S.simitOrbit);
    simit.rotation.set(lerp(0, 0.85, S.simitOrbit) + pointer.sy * 0.15, lerp(0.4, t * 0.4, S.simitOrbit), lerp(0, 0.2, S.simitOrbit) - pointer.sx * 0.15);
    simit.scale.setScalar(Math.max(0.0001, S.simitVis));
    simit.visible = S.simitVis > 0.01;

    // turntable
    spinner.rotation.y = t * 0.16 + window.scrollY * 0.0011;
    table.rotation.x = pointer.sy * 0.05;
    table.rotation.z = -pointer.sx * 0.05;

    // lights & mood
    const m = S.morning;
    key.position.copy(look).add(tmpB.lerpVectors(NIGHT_KEY, MORNING_KEY, m));
    key.target.position.copy(look);
    key.color.lerpColors(NIGHT_KEY_COL, MORNING_KEY_COL, m);
    key.intensity = 2.3 + m * 0.9;
    rim.position.copy(look).add(tmpB.set(2.5, 2.5, -4));
    rim.target.position.copy(look);
    rim.intensity = 0.7 * (1 - m) + 0.25;
    hemi.intensity = 0.22 + m * 0.75;
    scene.environmentIntensity = 0.28 + m * 0.5;
    renderer.toneMappingExposure = 1.0 + m * 0.08;
    scene.background.lerpColors(NIGHT_BG, MORNING_BG, m);
    scene.fog.color.copy(scene.background);
    floorMat.color.lerpColors(NIGHT_FLOOR, MORNING_FLOOR, m);

    const flick = reduced ? 1 : 0.86 + 0.09 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 23.7 + 1.3);
    ovenLight.intensity = 4.2 * S.oven * flick;
    ovenInner.intensity = 5 * Math.max(0, S.oven - 0.6) * flick;
    oven.userData.glow.uGlow.value = 0.25 + S.oven * 0.75;
    oven.userData.glow.uTime.value = t;

    beam.userData.u.uOpacity.value = S.beam;
    beam.visible = S.beam > 0.01;
    flour.userData.u.uTime.value = t;
    flour.userData.u.uOpacity.value = 0.35 + S.beam * 0.65 - m * 0.3;
    flour.visible = flour.userData.u.uOpacity.value > 0.02;

    const nowMorning = m > 0.5;
    if (nowMorning !== isMorning) {
      isMorning = nowMorning;
      root.classList.toggle('is-morning', isMorning);
      themeMeta?.setAttribute('content', isMorning ? '#eadbc3' : '#1d1a17');
    }
  }

  function render() { renderer.render(scene, camera); }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    update(dt);
    render();
  }

  function resize() {
    mobile = window.innerWidth < 768;
    camera.fov = mobile ? 40 : 32;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    flour.userData.u.uPixel.value = renderer.getPixelRatio() * (window.innerHeight / 900);
    layout();
    if (reduced) { update(0); render(); }
  }

  layout();
  resize();
  window.addEventListener('resize', resize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  window.addEventListener('load', layout);

  if (reduced) {
    // static scene: no ambient animation, re-render only when the page scrolls
    t = 2.0;
    let pending = false;
    const once = () => { pending = false; update(0); render(); };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(once); } }, { passive: true });
    once();
  } else {
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    });
  }
}
