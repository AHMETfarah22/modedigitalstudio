// Liman Butik Otel: scroll-driven day on an Aegean bay.
import * as THREE from 'three';
import { skyVertex, skyFragment, waterVertex, waterFragment } from './shaders.js';
import { buildWorld, hotelY, HOTEL, PIER, LIGHTHOUSE, shoreZ } from './world.js';

const canvas = document.getElementById('scene');
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(max-width: 767px)').matches;

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

if (!webglAvailable()) {
  root.classList.add('no-webgl');
} else {
  try {
    start();
  } catch (err) {
    console.error(err);
    root.classList.add('no-webgl');
  }
}

function start() {
  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xcfe7ee, 0.0045);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.3, 1500);

  // ---------- shared sky uniforms ----------
  const U = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uGlow: { value: 1 },
    uDusk: { value: 0 },
    uTime: { value: 0 },
  };

  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 48, 24),
    new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: U,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  // water
  const waterUniforms = {
    ...U,
    uAmp: { value: 1 },
    uDeep: { value: new THREE.Color() },
    uShallow: { value: new THREE.Color() },
    uFogColor: { value: scene.fog.color },
    uFogDensity: { value: 0.0045 },
    uSunInt: { value: 1 },
    uAmbient: { value: new THREE.Color() },
    uLightColor: { value: new THREE.Color(0xffb36b) },
    uLights: {
      value: [
        new THREE.Vector3(HOTEL.x + 1, 0.55, shoreZ(HOTEL.x) + 0.5),
        new THREE.Vector3(PIER.x - 1, 0.9, PIER.z1 + 0.2),
        new THREE.Vector3(LIGHTHOUSE.x - 2, 0.7, shoreZ(LIGHTHOUSE.x) + 1),
      ],
    },
  };
  const waterMat = new THREE.ShaderMaterial({ vertexShader: waterVertex, fragmentShader: waterFragment, uniforms: waterUniforms });
  const seg = isMobile ? 140 : 300;
  const waterGeo = new THREE.PlaneGeometry(440, 440, seg, seg);
  waterGeo.rotateX(-Math.PI / 2);
  waterGeo.translate(0, 0, 60);
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.frustumCulled = false;
  scene.add(water);
  const farGeo = new THREE.PlaneGeometry(2600, 2600, 24, 24);
  farGeo.rotateX(-Math.PI / 2);
  const farWater = new THREE.Mesh(farGeo, waterMat);
  farWater.position.y = -0.45;
  farWater.frustumCulled = false;
  scene.add(farWater);

  // lights
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xd9b98a, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = -55; sc.right = 55; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(4, 0, -26);
  scene.add(sun, sun.target);

  const W = buildWorld(scene, isMobile);

  // ---------- story keyframes ----------
  const H = hotelY;
  const c = (hex) => new THREE.Color(hex);
  const KF = [
    { // 0 hero: bright morning, wide over the bay
      pos: [6, 15, 46], look: [0, 4, -22],
      elev: 30, az: 35, top: c(0x3d8fd1), horizon: c(0xcfe7ee), sunColor: c(0xfff1d6), glow: 0.8,
      light: c(0xfff3df), lightInt: 2.8, hemiSky: c(0xcfe8ff), hemiGround: c(0xd9b98a), hemiInt: 1.15,
      deep: c(0x0d4a6b), shallow: c(0x2fb5b3), fog: 0.0042, dusk: 0, exposure: 1.0, minutes: 450,
    },
    { // 1 rooms: late morning at the facade
      pos: [HOTEL.x + 10, H + 6, HOTEL.z + 24], look: [HOTEL.x + 5, H + 3, HOTEL.z],
      elev: 48, az: 20, top: c(0x2f86cf), horizon: c(0xd8eef2), sunColor: c(0xfff8ea), glow: 0.6,
      light: c(0xfffaf0), lightInt: 3.0, hemiSky: c(0xcfe8ff), hemiGround: c(0xd9b98a), hemiInt: 1.15,
      deep: c(0x0c4d70), shallow: c(0x33c0bc), fog: 0.004, dusk: 0, exposure: 1.0, minutes: 615,
    },
    { // 2 experiences: low along the pier, afternoon
      pos: [19, 2.8, 2], look: [6, 1, -20],
      elev: 28, az: 70, top: c(0x3a86c4), horizon: c(0xecdcbc), sunColor: c(0xffe3b5), glow: 0.9,
      light: c(0xffe6c2), lightInt: 2.6, hemiSky: c(0xd6e6f2), hemiGround: c(0xd1a878), hemiInt: 1.0,
      deep: c(0x0d466a), shallow: c(0x2bb0ae), fog: 0.0045, dusk: 0, exposure: 1.0, minutes: 900,
    },
    { // 3 sunset: turn to the open sea
      pos: [2, 6, -14], look: [30, 3, 70],
      elev: 2.5, az: 20, top: c(0x2d3a6e), horizon: c(0xff9658), sunColor: c(0xff7a3d), glow: 1.6,
      light: c(0xff9a5c), lightInt: 1.7, hemiSky: c(0xf7a483), hemiGround: c(0x503a55), hemiInt: 0.75,
      deep: c(0x1b2e4f), shallow: c(0x3e6f80), fog: 0.0052, dusk: 0.3, exposure: 1.02, minutes: 1195,
    },
    { // 4 booking: dusk, windows and lighthouse on
      pos: [12, 12, 50], look: [-12.7, 5, -26],
      elev: -5, az: 15, top: c(0x0d1d3d), horizon: c(0x8c4d63), sunColor: c(0xff6a4a), glow: 1.0,
      light: c(0x8fa6d6), lightInt: 0.5, hemiSky: c(0x4a5a8a), hemiGround: c(0x1c1e33), hemiInt: 0.6,
      deep: c(0x0a1a30), shallow: c(0x1d3f55), fog: 0.0058, dusk: 1, exposure: 1.12, minutes: 1245,
    },
    { // 5 contact: night, pulled back
      pos: [20, 22, 80], look: [-10, 6, -20],
      elev: -14, az: 10, top: c(0x060e22), horizon: c(0x2a2e57), sunColor: c(0xc46060), glow: 0.4,
      light: c(0x7f97cf), lightInt: 0.38, hemiSky: c(0x33446e), hemiGround: c(0x111526), hemiInt: 0.5,
      deep: c(0x071426), shallow: c(0x12304a), fog: 0.0052, dusk: 1, exposure: 1.18, minutes: 1300,
    },
  ];

  // yaw / pitch per keyframe, unwrapped so the turn to the sea pans past the lighthouse
  let prevYaw = null;
  KF.forEach((k) => {
    const d = new THREE.Vector3(k.look[0] - k.pos[0], k.look[1] - k.pos[1], k.look[2] - k.pos[2]).normalize();
    let yaw = Math.atan2(d.x, d.z);
    if (prevYaw !== null) {
      while (yaw - prevYaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw - prevYaw <= -Math.PI) yaw += Math.PI * 2;
    }
    prevYaw = yaw;
    k.yaw = yaw;
    k.pitch = Math.asin(d.y);
  });
  const camCurve = new THREE.CatmullRomCurve3(KF.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');

  // ---------- scroll mapping ----------
  const sections = [...document.querySelectorAll('[data-scene]')];
  let anchors = [];
  function measure() {
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    anchors = sections.map((el, i) => {
      if (i === 0) return 0;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      return Math.min(max, Math.max(0, top + Math.min(r.height, vh * 1.4) * 0.5 - vh * 0.5));
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function scrollToStage() {
    const y = window.scrollY;
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return anchors.length - 1;
  }

  let stageTarget = 0;
  let stage = 0;

  // ---------- pointer parallax ----------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ---------- per-frame scene state ----------
  const tmp = {
    pos: new THREE.Vector3(), dir: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(),
    col: new THREE.Color(), lightDir: new THREE.Vector3(),
  };
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clockEl = document.getElementById('dayTime');
  const clockBox = document.querySelector('.day-clock');
  const dot = document.querySelector('.day-dot');
  let lastClock = '';

  function applyStage(s, time) {
    const n = KF.length - 1;
    const i = Math.min(Math.floor(s), n - 1);
    const f = ease(Math.min(Math.max(s - i, 0), 1));
    const a = KF[i];
    const b = KF[i + 1];

    // camera
    const portrait = camera.aspect < 0.8;
    camCurve.getPoint((i + f) / n, tmp.pos);
    const yaw = lerp(a.yaw, b.yaw, f);
    const pitch = lerp(a.pitch, b.pitch, f);
    tmp.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    if (portrait) tmp.pos.addScaledVector(tmp.dir, -10).y += 2;
    tmp.right.set(-Math.cos(yaw), 0, Math.sin(yaw));
    tmp.pos.addScaledVector(tmp.right, -pointer.sx * 0.9);
    tmp.pos.y += -pointer.sy * 0.5;
    tmp.pos.y = Math.max(tmp.pos.y, 1.6);
    // gentle breathing drift
    tmp.pos.y += Math.sin(time * 0.35) * 0.12;
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.pos.x + tmp.dir.x, tmp.pos.y + tmp.dir.y, tmp.pos.z + tmp.dir.z);

    // sky + sun
    const elev = THREE.MathUtils.degToRad(lerp(a.elev, b.elev, f));
    const az = THREE.MathUtils.degToRad(lerp(a.az, b.az, f));
    U.uSunDir.value.set(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az));
    U.uTop.value.copy(a.top).lerp(b.top, f);
    U.uHorizon.value.copy(a.horizon).lerp(b.horizon, f);
    U.uSunColor.value.copy(a.sunColor).lerp(b.sunColor, f);
    U.uGlow.value = lerp(a.glow, b.glow, f);
    const dusk = lerp(a.dusk, b.dusk, f);
    U.uDusk.value = dusk;
    U.uTime.value = time;
    sky.position.copy(camera.position);

    scene.fog.color.copy(U.uHorizon.value);
    scene.fog.density = lerp(a.fog, b.fog, f);
    waterUniforms.uFogDensity.value = scene.fog.density;
    waterUniforms.uDeep.value.copy(a.deep).lerp(b.deep, f);
    waterUniforms.uShallow.value.copy(a.shallow).lerp(b.shallow, f);
    renderer.toneMappingExposure = lerp(a.exposure, b.exposure, f);

    // lights
    const sd = U.uSunDir.value;
    tmp.lightDir.set(sd.x, Math.max(sd.y, 0.14), sd.z);
    if (sd.y < 0.05) tmp.lightDir.lerp(new THREE.Vector3(-0.3, 0.8, 0.5), Math.min(1, (0.05 - sd.y) * 6));
    tmp.lightDir.normalize();
    sun.position.copy(sun.target.position).addScaledVector(tmp.lightDir, 140);
    sun.color.copy(a.light).lerp(b.light, f);
    sun.intensity = lerp(a.lightInt, b.lightInt, f);
    hemi.color.copy(a.hemiSky).lerp(b.hemiSky, f);
    hemi.groundColor.copy(a.hemiGround).lerp(b.hemiGround, f);
    hemi.intensity = lerp(a.hemiInt, b.hemiInt, f);
    waterUniforms.uSunInt.value = sun.intensity;
    waterUniforms.uAmbient.value.copy(hemi.color).multiplyScalar(hemi.intensity * 0.5);

    // dusk: windows, bulbs, lighthouse
    const glow = Math.max(0, (dusk - 0.15) / 0.85);
    W.M.window.emissiveIntensity = glow * 2.6;
    W.M.bulb.emissiveIntensity = glow * 4;
    W.M.lantern.emissiveIntensity = 0.25 + glow * 5;
    W.M.cloud.emissive.copy(U.uHorizon.value).multiplyScalar(0.55);
    W.M.cloud.emissiveIntensity = 0.5;
    W.hotelLight.intensity = glow * 70;
    W.pierLamp.intensity = glow * 18;
    W.lighthouse.light.intensity = glow * 55;
    W.lighthouse.pivot.visible = glow > 0.02;
    W.lighthouse.beamMat.uniforms.uOpacity.value = glow * 0.24;

    // day clock
    const minutes = Math.round(lerp(a.minutes, b.minutes, f));
    const label = String(Math.floor(minutes / 60)).padStart(2, '0') + '.' + String(minutes % 60).padStart(2, '0');
    if (label !== lastClock) {
      lastClock = label;
      clockEl.textContent = label;
      const frac = Math.min(Math.max((minutes - 360) / (1320 - 360), 0), 1);
      const ang = Math.PI * (1 - frac);
      dot.setAttribute('cx', (32 + 28 * Math.cos(ang)).toFixed(2));
      dot.setAttribute('cy', (32 - 28 * Math.sin(ang)).toFixed(2));
      clockBox.classList.toggle('is-night', dusk > 0.6);
    }
  }

  function animateWorld(time) {
    waterUniforms.uTime.value = time;
    const boat = W.boat;
    boat.position.y = Math.sin(time * 1.3) * 0.09 - 0.02;
    boat.rotation.z = Math.sin(time * 1.05) * 0.05;
    boat.rotation.x = Math.sin(time * 0.85 + 1) * 0.03;

    const sb = W.sailboat;
    const st = time * 0.012;
    const sx = -60 + ((st * 100) % 160);
    sb.position.set(sx, Math.sin(time * 1.1) * 0.08, 38 + Math.sin(st * 3) * 4);
    sb.rotation.set(Math.sin(time * 0.9) * 0.03, Math.PI / 2 + 0.15, Math.sin(time * 1.2) * 0.06 - 0.08);

    W.lighthouse.pivot.rotation.y = -time * 0.55;

    W.gulls.forEach((g) => {
      const ang = g.phase + time * g.speed;
      const x = g.cx + Math.cos(ang) * g.rad;
      const z = g.cz + Math.sin(ang) * g.rad * 0.6;
      const y = g.cy + Math.sin(ang * 2) * 1.4;
      g.group.position.set(x, y, z);
      const a2 = ang + 0.05 * Math.sign(g.speed);
      g.group.lookAt(g.cx + Math.cos(a2) * g.rad, g.cy + Math.sin(a2 * 2) * 1.4, g.cz + Math.sin(a2) * g.rad * 0.6);
      const flap = Math.sin(time * g.flap + g.phase) * 0.55 * (0.6 + 0.4 * Math.sin(time * 0.4 + g.phase));
      g.r.rotation.z = flap;
      g.l.rotation.z = -flap;
    });

    W.clouds.forEach((cl) => {
      cl.position.x += cl.userData.speed * 0.016;
      if (cl.position.x > 190) cl.position.x = -190;
    });
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let time = 4;
  let raf = 0;
  let running = false;

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    stage += (stageTarget - stage) * (1 - Math.exp(-dt * 3.2));
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 2.5));
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 2.5));
    animateWorld(time);
    applyStage(stage, time);
    renderer.render(scene, camera);
  }

  function renderStatic() {
    stage = stageTarget;
    pointer.sx = pointer.sy = 0;
    animateWorld(12);
    applyStage(stage, 0);
    renderer.render(scene, camera);
  }

  function play() {
    if (running || reduceMotion.matches || document.hidden) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function onScroll() {
    stageTarget = scrollToStage();
    if (reduceMotion.matches) renderStatic();
  }
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 60 : 45;
    camera.updateProjectionMatrix();
    measure();
    onScroll();
    if (!running) renderStatic();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  const onMotionPref = () => {
    if (reduceMotion.matches) { pause(); renderStatic(); } else play();
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionPref);
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); onScroll(); }).observe(document.querySelector('main'));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); onScroll(); });

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pause(); root.classList.add('no-webgl'); });

  onResize();
  stage = stageTarget;
  renderStatic();
  play();
}
