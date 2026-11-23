// Telve Kahve — scroll-driven 3D scene. Concept by Mode Digital Studio.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { latteVertex, latteFragment, steamVertex, steamFragment } from './shaders.js';

const root = document.documentElement;
const canvas = document.getElementById('scene');
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const small = innerWidth < 768;

let renderer = null;
try {
  const probe = document.createElement('canvas');
  const ok = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  if (ok && canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  }
} catch (err) {
  renderer = null;
}

if (!renderer) {
  root.classList.add('no-webgl');
} else {
  start(renderer);
}

function start(renderer) {
  /* ---------------- renderer ---------------- */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    root.classList.add('no-webgl');
    running = false;
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  pmrem.dispose();

  /* ---------------- lights ---------------- */
  const key = new THREE.DirectionalLight(0xffe2c0, 2.4);
  key.position.set(3.2, 6, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 512 : 1024, small ? 512 : 1024);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 14;
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);

  const rim = new THREE.DirectionalLight(0x7cc4bd, 1.1);
  rim.position.set(-4, 3, -4);
  scene.add(rim);

  /* ---------------- materials ---------------- */
  const glaze = new THREE.MeshPhysicalMaterial({
    color: '#1f6f6b', roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide,
  });
  const porcelain = new THREE.MeshPhysicalMaterial({
    color: '#f6efe4', roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide,
  });

  /* ---------------- cup ---------------- */
  const cupGroup = new THREE.Group();
  scene.add(cupGroup);

  const v = (x, y) => new THREE.Vector2(x, y);
  const seg = small ? 72 : 128;

  // saucer
  const saucerProfile = [
    v(0, 0.02), v(0.4, 0.02), v(0.43, 0), v(0.48, 0), v(0.51, 0.022), v(0.84, 0.068),
    v(0.94, 0.105), v(0.975, 0.124), v(0.968, 0.134), v(0.94, 0.128), v(0.84, 0.096),
    v(0.52, 0.054), v(0.42, 0.047), v(0, 0.047),
  ];
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, seg), porcelain);
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  cupGroup.add(saucer);

  const cup = new THREE.Group();
  cup.position.y = 0.047;
  cupGroup.add(cup);

  const outerProfile = [
    v(0, 0), v(0.29, 0), v(0.345, 0.012), v(0.375, 0.045), v(0.39, 0.12),
    v(0.44, 0.42), v(0.49, 0.72), v(0.525, 0.93), v(0.545, 1.0), v(0.549, 1.012),
  ];
  const innerProfile = [
    v(0.549, 1.012), v(0.545, 1.022), v(0.534, 1.025), v(0.523, 1.012), v(0.512, 0.94),
    v(0.476, 0.7), v(0.43, 0.45), v(0.38, 0.2), v(0.345, 0.1), v(0.29, 0.075), v(0, 0.07),
  ];
  const outer = new THREE.Mesh(new THREE.LatheGeometry(outerProfile, seg), glaze);
  const inner = new THREE.Mesh(new THREE.LatheGeometry(innerProfile, seg), porcelain);
  outer.castShadow = true;
  outer.receiveShadow = true;
  inner.receiveShadow = true;
  cup.add(outer, inner);

  // handle
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.475, 0.74, 0),
    new THREE.Vector3(0.66, 0.8, 0),
    new THREE.Vector3(0.79, 0.64, 0),
    new THREE.Vector3(0.74, 0.43, 0),
    new THREE.Vector3(0.58, 0.32, 0),
    new THREE.Vector3(0.43, 0.3, 0),
  ]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 64, 0.042, 16, false);
  handleGeo.scale(1, 1, 1.35);
  const handle = new THREE.Mesh(handleGeo, glaze);
  handle.castShadow = true;
  cup.add(handle);

  // coffee surface with latte art
  const latteUniforms = {
    uTime: { value: 0 },
    uCoffee: { value: new THREE.Color('#2a1408') },
    uCrema: { value: new THREE.Color('#9a5f31') },
    uFoam: { value: new THREE.Color('#f5e9d6') },
  };
  const coffeeGeo = new THREE.CircleGeometry(0.5, 96);
  coffeeGeo.rotateX(-Math.PI / 2);
  const coffee = new THREE.Mesh(coffeeGeo, new THREE.ShaderMaterial({
    uniforms: latteUniforms, vertexShader: latteVertex, fragmentShader: latteFragment,
  }));
  coffee.position.y = 0.83;
  cup.add(coffee);

  /* ---------------- steam ---------------- */
  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 0.95, 0);
  scene.add(steamGroup);
  const steamMats = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uSeed: { value: i * 0.37 + 0.1 },
        uColor: { value: new THREE.Color('#fbf4ea') },
      },
      vertexShader: steamVertex,
      fragmentShader: steamFragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    steamMats.push(mat);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7), mat);
    plane.position.set((i - 1) * 0.12, 0.85, (i - 1) * 0.05);
    plane.renderOrder = 2;
    steamGroup.add(plane);
  }

  /* ---------------- ground (shadow catcher) ---------------- */
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.38 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------------- beans ---------------- */
  const BEANS = small ? 70 : 150;
  const beanGeo = makeBeanGeometry(small ? 14 : 20, small ? 10 : 14);
  const beanMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', roughness: 0.38, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.32,
  });
  const beans = new THREE.InstancedMesh(beanGeo, beanMat, BEANS);
  beans.castShadow = true;
  beans.receiveShadow = true;
  beans.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  beans.frustumCulled = false;
  scene.add(beans);

  const rand = mulberry32(7);
  const R = (a, b) => a + (b - a) * rand();
  const beanData = [];
  const tint = new THREE.Color();
  for (let i = 0; i < BEANS; i++) {
    const restAngle = R(0, Math.PI * 2);
    const restRadius = R(1.12, 2.4);
    const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, R(0, Math.PI * 2), 'YXZ'));
    const restYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), R(0, Math.PI * 2));
    restQ.premultiply(restYaw);
    beanData.push({
      a0: R(0, Math.PI * 2),
      r: R(0.85, 1.95),
      h: R(0.08, 1.55),
      spd: R(0.18, 0.42) * (rand() < 0.85 ? 1 : -1),
      bob: R(0.5, 1.2),
      axis: new THREE.Vector3(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(),
      spin: R(0.6, 1.8),
      phase: R(0, 10),
      delay: rand(),
      scale: R(0.82, 1.18),
      far: new THREE.Vector3(R(-4, 4), R(4.5, 7.5), R(-4, 3)),
      rest: new THREE.Vector3(Math.cos(restAngle) * restRadius, 0.017, Math.sin(restAngle) * restRadius),
      restQ,
    });
    tint.setHSL(0.06 + R(-0.01, 0.015), R(0.45, 0.6), R(0.12, 0.2));
    beans.setColorAt(i, tint);
  }
  if (beans.instanceColor) beans.instanceColor.needsUpdate = true;

  /* ---------------- scroll states ---------------- */
  // az/el in degrees, dist in cup heights, shift = where the cup sits horizontally (fraction of screen)
  const STATES = [
    { // hero: the cup alone, on the right
      az: 18, el: 15, dist: 4.3, ty: 0.55, shift: 0.22,
      swirl: 0, rest: 0, radius: 1, steam: 1, spin: 1,
      bgA: '#4a2c1d', bgB: '#1a0f0a', keyColor: '#ffe2c0', keyI: 2.4, shadow: 0.38,
    },
    { // process: beans tumble in and swirl, camera swings round
      az: 72, el: 26, dist: 5.4, ty: 0.62, shift: 0,
      swirl: 1, rest: 0, radius: 1, steam: 0.65, spin: 0.6,
      bgA: '#3a2318', bgB: '#140b07', keyColor: '#ffe7cc', keyI: 2.6, shadow: 0.32,
    },
    { // menu: cup steps aside to the left, wider swirl
      az: 148, el: 17, dist: 4.6, ty: 0.5, shift: -0.25,
      swirl: 1, rest: 0, radius: 1.2, steam: 0.85, spin: 0.8,
      bgA: '#21403c', bgB: '#120d0a', keyColor: '#ffeedd', keyI: 2.3, shadow: 0.34,
    },
    { // place: high view into the cup, beans settle on the table
      az: 205, el: 64, dist: 5.0, ty: 0.25, shift: 0.24,
      swirl: 1, rest: 1, radius: 1, steam: 0.45, spin: 0.35,
      bgA: '#5a3722', bgB: '#1c110b', keyColor: '#ffd9a8', keyI: 2.7, shadow: 0.42,
    },
    { // visit: low, warm, settled
      az: 335, el: 9, dist: 4.1, ty: 0.5, shift: 0.22,
      swirl: 1, rest: 1, radius: 1, steam: 1, spin: 0.5,
      bgA: '#8a5430', bgB: '#2a1a12', keyColor: '#ffc68c', keyI: 3.1, shadow: 0.45,
    },
  ];
  for (const s of STATES) {
    s._bgA = new THREE.Color(s.bgA);
    s._bgB = new THREE.Color(s.bgB);
    s._key = new THREE.Color(s.keyColor);
  }

  const sections = [...document.querySelectorAll('[data-scene]')];
  let anchors = [];
  function measure() {
    const vh = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
    anchors = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      return Math.min(maxScroll, Math.max(0, top + rect.height / 2 - vh / 2));
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
  }
  function scrollToStateIndex() {
    const y = window.scrollY;
    if (!anchors.length) return 0;
    if (y <= anchors[0]) return 0;
    const last = anchors.length - 1;
    if (y >= anchors[last]) return last;
    for (let i = 0; i < last; i++) {
      if (y < anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    }
    return last;
  }

  /* ---------------- state blending ---------------- */
  const cur = {
    az: 0, el: 0, dist: 0, ty: 0, shift: 0, swirl: 0, rest: 0, radius: 1, steam: 1, spin: 1,
    keyI: 2.4, shadow: 0.38, bgA: new THREE.Color(), bgB: new THREE.Color(), key: new THREE.Color(),
  };
  const smooth = (t) => {
    const x = Math.min(1, Math.max(0, (t - 0.12) / 0.76));
    return x * x * (3 - 2 * x);
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  function blend(f) {
    const i = Math.min(STATES.length - 1, Math.floor(f));
    const j = Math.min(STATES.length - 1, i + 1);
    const t = smooth(f - i);
    const A = STATES[i];
    const B = STATES[j];
    for (const k of ['az', 'el', 'dist', 'ty', 'shift', 'swirl', 'rest', 'radius', 'steam', 'spin', 'keyI', 'shadow']) {
      cur[k] = lerp(A[k], B[k], t);
    }
    cur.bgA.lerpColors(A._bgA, B._bgA, t);
    cur.bgB.lerpColors(A._bgB, B._bgB, t);
    cur.key.lerpColors(A._key, B._key, t);
  }

  /* ---------------- input ---------------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------------- resize ---------------- */
  let narrow = false;
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = w < 768 || w / h < 0.9;
    measure();
    if (reduced) renderOnce();
  }

  /* ---------------- per-frame ---------------- */
  const tmpQ = new THREE.Quaternion();
  const tmpP = new THREE.Vector3();
  const swirlP = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  const DEG = Math.PI / 180;
  let lastBg = '';

  function applyCamera() {
    let dist = cur.dist;
    let ty = cur.ty;
    let shift = cur.shift;
    if (camera.aspect < 1) dist *= 1 + (1 - camera.aspect) * 0.95;
    else if (camera.aspect < 1.6) dist *= 1 + (1.6 - camera.aspect) * 0.8;
    if (narrow) {
      shift = 0;
      ty -= 0.55; // lift the cup into the upper half on phones
    }
    const az = cur.az * DEG;
    const el = cur.el * DEG;
    camera.position.set(
      Math.sin(az) * Math.cos(el) * dist,
      ty + Math.sin(el) * dist,
      Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(0, ty, 0);
    const tanHalf = Math.tan((camera.fov * DEG) / 2);
    camera.filmOffset = -shift * 2 * tanHalf * camera.aspect * camera.getFilmWidth();
    camera.updateProjectionMatrix();
  }

  function updateBeans(time) {
    for (let i = 0; i < BEANS; i++) {
      const b = beanData[i];
      // staggered per-bean weights so beans arrive and land at different moments
      const sw = smooth01(cur.swirl * 1.45 - b.delay * 0.45);
      const re = smooth01(cur.rest * 1.45 - (1 - b.delay) * 0.45);

      const ang = b.a0 + time * b.spd;
      const rad = b.r * cur.radius;
      swirlP.set(Math.cos(ang) * rad, b.h + Math.sin(time * b.bob + b.phase) * 0.1, Math.sin(ang) * rad);

      tmpP.lerpVectors(b.far, swirlP, sw);
      tmpP.y += Math.sin(sw * Math.PI) * 0.5;
      tmpP.lerp(b.rest, re);
      tmpP.y += Math.sin(re * Math.PI) * 0.35;

      tmpQ.setFromAxisAngle(b.axis, time * b.spin + b.phase);
      tmpQ.slerp(b.restQ, re);

      const visible = sw > 0.001 || re > 0.001;
      dummy.position.copy(tmpP);
      dummy.quaternion.copy(tmpQ);
      dummy.scale.setScalar(visible ? b.scale : 0.0001);
      dummy.updateMatrix();
      beans.setMatrixAt(i, dummy.matrix);
    }
    beans.instanceMatrix.needsUpdate = true;
  }

  function updateScene(time, dt) {
    applyCamera();

    // cup slowly turns and leans toward the pointer
    cupGroup.rotation.y += dt * 0.22 * cur.spin;
    cupGroup.rotation.x = pointer.y * 0.1;
    cupGroup.rotation.z = -pointer.x * 0.1;

    // steam faces the camera around its vertical axis
    for (const plane of steamGroup.children) {
      plane.rotation.y = Math.atan2(camera.position.x - plane.position.x, camera.position.z - plane.position.z);
    }
    for (const m of steamMats) {
      m.uniforms.uTime.value = time;
      m.uniforms.uOpacity.value = cur.steam;
    }
    latteUniforms.uTime.value = time;

    key.color.copy(cur.key);
    key.intensity = cur.keyI;
    groundMat.opacity = cur.shadow;

    updateBeans(time);

    const bg = cur.bgA.getHexString() + cur.bgB.getHexString();
    if (bg !== lastBg) {
      lastBg = bg;
      root.style.setProperty('--bg-a', '#' + cur.bgA.getHexString());
      root.style.setProperty('--bg-b', '#' + cur.bgB.getHexString());
    }
  }

  /* ---------------- loop ---------------- */
  let reduced = reduceMQ.matches;
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;
  let f = scrollToStateIndex();

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;

    const target = scrollToStateIndex();
    f += (target - f) * (1 - Math.exp(-dt * 3.2));
    if (Math.abs(target - f) < 0.0005) f = target;
    blend(f);

    pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 3));
    pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 3));

    updateScene(time, dt);
    renderer.render(scene, camera);
  }

  function play() {
    if (running || reduced || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // reduced motion: one still frame of the hero composition
  function renderOnce() {
    blend(0);
    pointer.x = pointer.y = 0;
    cupGroup.rotation.set(0, -0.5, 0);
    updateScene(2.5, 0);
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else play();
  });
  reduceMQ.addEventListener?.('change', (e) => {
    reduced = e.matches;
    if (reduced) { stop(); renderOnce(); } else play();
  });

  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.body);
  window.addEventListener('load', measure);
  document.fonts?.ready.then(measure);

  resize();
  if (reduced) {
    renderOnce();
  } else {
    f = scrollToStateIndex();
    blend(f);
    cupGroup.rotation.y = -0.5;
    play();
  }
}

/* ---------------- helpers ---------------- */
function smooth01(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A coffee bean: squashed ellipsoid, flatter on one side, with an S-shaped crease.
function makeBeanGeometry(wSeg, hSeg) {
  const geo = new THREE.SphereGeometry(1, wSeg, hSeg);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    let { x, y, z } = p;
    if (z > 0) {
      z *= 0.55;
      const creaseY = y - 0.12 * Math.sin(x * 2.6);
      z -= 0.38 * Math.exp(-(creaseY * creaseY) / 0.012) * Math.sqrt(Math.max(z, 0) / 0.55 + 0.0001) * (1 - x * x * 0.6);
    }
    pos.setXYZ(i, x * 0.075, y * 0.054, z * 0.034);
  }
  geo.computeVertexNormals();
  return geo;
}
