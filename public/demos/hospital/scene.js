// Nabız Hastanesi — procedural WebGL scene.
// Glass heart + ECG pulse tube + instanced DNA helix + medical-cross tiles + dust,
// all driven by a continuous scroll progress value from main.js.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/BufferGeometryUtils.js';

const BLUE = '#1463ff';
const MINT = '#18c29c';
const CORAL = '#ff6b6b';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const x = clamp01((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

// Stylised heart: project a sphere onto the classic implicit heart surface,
// then add soft vessel tubes on top for an anatomical silhouette.
function buildHeartGeometry(segW, segH) {
  let g = new THREE.SphereGeometry(1, segW, segH);
  const pos = g.attributes.position;
  const d = new THREE.Vector3();
  const F = (x, y, z) => {
    // implicit heart with Z-up; our scene is Y-up, so map (x, y, z) -> (X, Z, Y)
    const X = x, Y = z * 1.12, Z = y;
    const a = X * X + 2.25 * Y * Y + Z * Z - 1;
    return a * a * a - X * X * Z * Z * Z - 0.1125 * Y * Y * Z * Z * Z;
  };
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    let lo = 0, hi = 2;
    for (let r = 0.03; r <= 2; r += 0.03) {
      if (F(d.x * r, d.y * r, d.z * r) > 0) { hi = r; lo = r - 0.03; break; }
    }
    for (let k = 0; k < 18; k++) {
      const m = (lo + hi) * 0.5;
      if (F(d.x * m, d.y * m, d.z * m) > 0) hi = m; else lo = m;
    }
    const r = (lo + hi) * 0.5;
    let x = d.x * r, y = d.y * r, z = d.z * r;
    // gentle asymmetry: fuller left ventricle (viewer's right), softer apex
    if (x > 0 && y < 0.4) { const k = 1 + 0.07 * Math.sin(Math.min(1, x) * Math.PI) * (1 - Math.max(0, y)); x *= k; z *= k; }
    if (y < -0.75) y = -0.75 - (-0.75 - y) * 0.82;
    pos.setXYZ(i, x, y, z);
  }
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();

  const tube = (pts, radius, capEnd = true) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const parts = [new THREE.TubeGeometry(curve, 48, radius, 20, false)];
    if (capEnd) {
      const s = new THREE.SphereGeometry(radius, 20, 14);
      const e = curve.getPoint(1);
      s.translate(e.x, e.y, e.z);
      parts.push(s);
    }
    return parts.map((p) => { p.deleteAttribute('uv'); return p; });
  };

  const vessels = [
    // aortic arch
    ...tube([[-0.05, 0.55, 0.1], [0.0, 1.35, 0.12], [0.22, 1.78, 0.0], [0.62, 1.78, -0.25], [0.84, 1.35, -0.45], [0.86, 0.6, -0.6]], 0.2),
    // pulmonary trunk + branches
    ...tube([[0.28, 0.55, 0.38], [0.36, 1.1, 0.34], [0.62, 1.32, 0.12], [1.0, 1.25, -0.02]], 0.16),
    ...tube([[0.36, 1.1, 0.34], [0.05, 1.36, 0.1], [-0.48, 1.32, -0.1]], 0.13),
    // superior vena cava
    ...tube([[-0.56, 0.6, 0.0], [-0.6, 1.3, -0.05], [-0.62, 1.95, -0.1]], 0.13),
    // arch branches
    ...tube([[0.14, 1.72, 0.04], [0.1, 1.95, 0.03], [0.04, 2.12, 0.02]], 0.055),
    ...tube([[0.36, 1.8, -0.06], [0.38, 2.0, -0.07], [0.37, 2.16, -0.08]], 0.05),
    ...tube([[0.58, 1.76, -0.18], [0.64, 1.95, -0.2], [0.7, 2.08, -0.22]], 0.045),
  ];

  const merged = mergeGeometries([g, ...vessels]);
  merged.translate(0, -0.55, 0);
  merged.computeBoundingSphere();
  return merged;
}

// ECG waveform as a closed-form curve (one beat per 1/K of the length).
class EcgCurve extends THREE.Curve {
  constructor(length, beats, amp) {
    super();
    this.length = length; this.beats = beats; this.amp = amp;
    this.arcLengthDivisions = 3200;
  }
  static wave(q) {
    const g = (c, w) => Math.exp(-(((q - c) / w) ** 2));
    return 0.11 * g(0.15, 0.035) - 0.12 * g(0.275, 0.012) + 1.0 * g(0.3, 0.013) - 0.26 * g(0.33, 0.014) + 0.22 * g(0.55, 0.05);
  }
  getPoint(t, target = new THREE.Vector3()) {
    const q = (t * this.beats) % 1;
    return target.set(-this.length / 2 + t * this.length, EcgCurve.wave(q) * this.amp, 0);
  }
}

function buildEcgGeometry(curve, segments, radius, radial) {
  const g = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const count = g.attributes.position.count;
  const cy = new Float32Array(count);
  const uu = new Float32Array(count);
  const p = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, p);
    const u = (p.x + curve.length / 2) / curve.length;
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      cy[idx] = p.y; uu[idx] = u;
    }
  }
  g.setAttribute('aCY', new THREE.BufferAttribute(cy, 1));
  g.setAttribute('aU', new THREE.BufferAttribute(uu, 1));
  g.deleteAttribute('uv');
  return g;
}

function buildCrossGeometry() {
  const a = new RoundedBoxGeometry(1, 0.36, 0.22, 3, 0.09);
  const b = new RoundedBoxGeometry(0.36, 1, 0.22, 3, 0.09);
  return mergeGeometries([a, b]);
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */

const rimVert = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mv;
  }`;

const rimFrag = /* glsl */`
  uniform vec3 uBlue; uniform vec3 uAccent; uniform float uOpacity; uniform float uBeat;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
    float rim = pow(f, 2.4);
    vec3 col = mix(uAccent, uBlue, smoothstep(-1.2, 1.4, vY));
    col = mix(col, vec3(1.0), pow(f, 7.0) * 0.6);
    float a = (rim * (0.8 + 0.4 * uBeat) + 0.04) * uOpacity;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }`;

const coreFrag = /* glsl */`
  uniform vec3 uAccent; uniform float uOpacity; uniform float uBeat;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main(){
    float c = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
    gl_FragColor = vec4(uAccent, c * (0.35 + 0.45 * uBeat) * uOpacity);
    #include <colorspace_fragment>
  }`;

const haloVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const haloFrag = /* glsl */`
  uniform vec3 uColor; uniform float uStrength;
  varying vec2 vUv;
  void main(){
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(1.0 - smoothstep(0.0, 1.0, d), 2.2) * uStrength;
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }`;

const ecgVert = /* glsl */`
  attribute float aCY; attribute float aU;
  uniform float uAmp;
  varying float vU; varying vec3 vN; varying vec3 vV;
  void main(){
    vec3 p = position;
    p.y = aCY * uAmp + (position.y - aCY);
    vU = aU;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const ecgFrag = /* glsl */`
  uniform float uHead; uniform float uOpacity; uniform float uBase; uniform float uGlow;
  uniform vec3 uColA; uniform vec3 uColB;
  varying float vU; varying vec3 vN; varying vec3 vV;
  void main(){
    float d = uHead - vU;
    if (d < 0.0) d += 1.0;
    float trail = exp(-d * 7.0);
    float head = exp(-pow(d * 90.0, 2.0));
    float facing = max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 col = mix(uColA, uColB, trail);
    col = mix(col, vec3(1.0), head * 0.7);
    float a;
    if (uGlow > 0.5) a = (trail * 0.22 + head * 0.35) * pow(facing, 1.6);
    else a = uBase + trail * (1.0 - uBase) + head;
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);
    #include <colorspace_fragment>
  }`;

const dustVert = /* glsl */`
  attribute float aSeed;
  uniform float uTime; uniform float uSize;
  varying float vSeed;
  void main(){
    vec3 p = position;
    p.y += sin(uTime * 0.18 + aSeed * 6.2831) * 0.35;
    p.x += cos(uTime * 0.13 + aSeed * 12.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.5 + aSeed) / -mv.z;
    vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
  }`;

const dustFrag = /* glsl */`
  uniform vec3 uA; uniform vec3 uB; uniform float uOpacity;
  varying float vSeed;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * uOpacity * (0.35 + 0.4 * vSeed);
    gl_FragColor = vec4(mix(uA, uB, step(0.7, vSeed)), a);
    #include <colorspace_fragment>
  }`;

/* ------------------------------------------------------------------ */
/* Scroll states                                                       */
/* ------------------------------------------------------------------ */

// Keys interpolated between neighbouring states.
function buildStates(narrow, aspect = 1.6) {
  const base = {
    camX: 0, camY: 0, camZ: 10, lookX: 0, lookY: 0,
    heartX: 0, heartY: 0, heartZ: 0, heartS: 1, heartO: 1,
    dnaX: 0, dnaY: 0, dnaZ: 0, dnaS: 1, dnaO: 1, dnaTilt: 0.2,
    ecgY: -1.5, ecgZ: 0.5, ecgAmp: 1, ecgO: 1,
    tA: 1, tB: 0, tC: 0, tS: 0, tO: 0,
    halo: 1, dust: 0.8,
  };
  const S = (o) => ({ ...base, ...o });
  if (!narrow) {
    const k = Math.min(1.3, Math.max(0.72, aspect / 1.7));
    const fit = (st) => { for (const key of ['heartX', 'dnaX']) st[key] *= k; return st; };
    return [
      // 0 hero — heart centre-stage, DNA nearby, ECG sweeping
      S({ heartX: 2.55, heartY: 0.15, heartS: 1.0, dnaX: 5.9, dnaY: 0.7, dnaZ: -2.6, dnaS: 0.6, dnaO: 0.85, dnaTilt: 0.35, ecgY: -1.75, ecgZ: 0.6 }),
      // 1 departments — camera pulls back, DNA takes focus
      S({ camY: 0.2, camZ: 13.5, lookY: 0.1, heartX: -5.4, heartY: 2.6, heartZ: -6, heartS: 0.42, heartO: 0.3, dnaX: 3.6, dnaY: 0, dnaZ: 0.2, dnaS: 1.08, dnaO: 1, dnaTilt: 0.16, ecgY: -3.6, ecgZ: -1, ecgAmp: 0.5, ecgO: 0.45, tS: 0.34, tO: 0.7, halo: 0.45, dust: 1 }),
      // 2 how it works — calm grid of cross tiles
      S({ camZ: 11.5, heartX: 0, heartY: 5, heartZ: -7, heartS: 0.3, heartO: 0, dnaX: 8, dnaZ: -4, dnaS: 0.6, dnaO: 0, dnaTilt: 0.6, ecgY: -3.7, ecgZ: -1, ecgAmp: 0.25, ecgO: 0.3, tA: 0, tB: 1, tS: 1, tO: 1, halo: 0, dust: 0.6 }),
      // 3 appointment — serene, minimal
      S({ camZ: 10.5, heartX: 3.2, heartY: 0.25, heartS: 0.6, heartO: 1, dnaX: 7, dnaZ: -7, dnaS: 0.7, dnaO: 0.2, dnaTilt: 0.4, ecgY: -1.2, ecgZ: -0.5, ecgAmp: 0.12, ecgO: 0.65, tA: 0, tC: 1, tS: 0.42, tO: 0.5, halo: 0.6, dust: 0.45 }),
      // 4 contact — quiet resting state
      S({ camY: 0.3, camZ: 12, lookY: 0.2, heartX: 3.6, heartY: 1.5, heartZ: -1.5, heartS: 0.46, heartO: 0.9, dnaX: -6, dnaZ: -7, dnaS: 0.7, dnaO: 0.25, dnaTilt: 0.3, ecgY: -2.4, ecgZ: -0.6, ecgAmp: 0.35, ecgO: 0.5, tA: 0, tC: 1, tS: 0.5, tO: 0.45, halo: 0.4, dust: 0.5 }),
    ].map(fit);
  }
  return [
    S({ camZ: 12, heartX: -0.1, heartY: 1.95, heartS: 0.6, dnaX: 2.0, dnaY: 2.2, dnaZ: -6, dnaS: 0.6, dnaO: 0.45, dnaTilt: 0.45, ecgY: 0.5, ecgZ: -0.4, ecgAmp: 0.6, ecgO: 0.8, halo: 0.9 }),
    S({ camZ: 14, heartX: -1.6, heartY: 3.4, heartZ: -6, heartS: 0.38, heartO: 0.3, dnaX: 1.0, dnaY: 0, dnaZ: -2.5, dnaS: 0.9, dnaO: 0.55, dnaTilt: 0.12, ecgY: -3.8, ecgZ: -1, ecgAmp: 0.4, ecgO: 0.3, tS: 0.28, tO: 0.55, halo: 0.3, dust: 1 }),
    S({ camZ: 14, heartY: 6, heartZ: -7, heartS: 0.3, heartO: 0, dnaX: 4, dnaZ: -4, dnaS: 0.6, dnaO: 0, dnaTilt: 0.6, ecgY: -4.6, ecgAmp: 0.2, ecgO: 0.2, tA: 0, tB: 1, tS: 0.9, tO: 1, halo: 0, dust: 0.6 }),
    S({ camZ: 12, heartX: 0.9, heartY: 3.1, heartZ: -2, heartS: 0.42, heartO: 0.9, dnaX: 4, dnaZ: -7, dnaS: 0.6, dnaO: 0.15, ecgY: 2.3, ecgZ: -1, ecgAmp: 0.15, ecgO: 0.45, tA: 0, tC: 1, tS: 0.35, tO: 0.45, halo: 0.5, dust: 0.45 }),
    S({ camZ: 12.5, heartX: 0.6, heartY: 2.6, heartZ: -2, heartS: 0.45, heartO: 0.85, dnaX: -4, dnaZ: -7, dnaS: 0.6, dnaO: 0.2, ecgY: -2.6, ecgZ: -1, ecgAmp: 0.3, ecgO: 0.4, tA: 0, tC: 1, tS: 0.4, tO: 0.4, halo: 0.35, dust: 0.5 }),
  ];
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

export function createScene(canvas, story, { reduceMotion = false } = {}) {
  const small = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.6);
  fill.position.set(-5, -2, 3);
  scene.add(fill);

  const accent = new THREE.Color(CORAL);
  const accentTarget = new THREE.Color(CORAL);
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  const cBlue = new THREE.Color(BLUE);
  const cMint = new THREE.Color(MINT);
  const cCoral = new THREE.Color(CORAL);

  /* ---------- Heart ---------- */
  const heartRoot = new THREE.Group();
  const heartTilt = new THREE.Group();
  heartTilt.rotation.z = 0.32;
  heartTilt.rotation.x = 0.08;
  heartRoot.add(heartTilt);
  scene.add(heartRoot);

  const heartGeo = buildHeartGeometry(small ? 96 : 160, small ? 72 : 120);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef3ff,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    sheen: 1,
    sheenColor: new THREE.Color('#ffb3b3'),
    sheenRoughness: 0.45,
    emissive: new THREE.Color(CORAL),
    emissiveIntensity: 0.06,
    envMapIntensity: 1.3,
    transparent: true,
    opacity: 0.78,
  });
  const heartBody = new THREE.Mesh(heartGeo, glassMat);
  heartBody.renderOrder = 2;
  heartTilt.add(heartBody);

  const rimUniforms = {
    uBlue: { value: cBlue.clone() },
    uAccent: { value: accent },
    uOpacity: { value: 1 },
    uBeat: { value: 0 },
  };
  const rimMat = new THREE.ShaderMaterial({
    uniforms: rimUniforms, vertexShader: rimVert, fragmentShader: rimFrag,
    transparent: true, depthWrite: false,
  });
  const heartRim = new THREE.Mesh(heartGeo, rimMat);
  heartRim.renderOrder = 3;
  heartTilt.add(heartRim);

  const coreMat = new THREE.ShaderMaterial({
    uniforms: { uAccent: { value: accent }, uOpacity: { value: 1 }, uBeat: { value: 0 } },
    vertexShader: rimVert, fragmentShader: coreFrag,
    transparent: true, depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), coreMat);
  core.position.set(0.08, -0.15, 0);
  core.scale.set(1.2, 1, 0.8);
  core.renderOrder = 1;
  heartTilt.add(core);

  const haloMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: accent }, uStrength: { value: 0.5 } },
    vertexShader: haloVert, fragmentShader: haloFrag,
    transparent: true, depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
  halo.renderOrder = -1;
  scene.add(halo);

  /* ---------- ECG line ---------- */
  const ECG_LEN = 26, ECG_BEATS = 5;
  const ecgCurve = new EcgCurve(ECG_LEN, ECG_BEATS, 0.9);
  const ecgSeg = small ? 1200 : 2200;
  const ecgUniformsBase = () => ({
    uHead: { value: 0 }, uOpacity: { value: 1 }, uBase: { value: 0.16 }, uGlow: { value: 0 },
    uAmp: { value: 1 }, uColA: { value: new THREE.Color('#7fa6ff') }, uColB: { value: accent },
  });
  const ecgCoreMat = new THREE.ShaderMaterial({
    uniforms: ecgUniformsBase(), vertexShader: ecgVert, fragmentShader: ecgFrag,
    transparent: true, depthWrite: false,
  });
  const ecgGlowMat = new THREE.ShaderMaterial({
    uniforms: { ...ecgUniformsBase(), uGlow: { value: 1 } }, vertexShader: ecgVert, fragmentShader: ecgFrag,
    transparent: true, depthWrite: false,
  });
  const ecg = new THREE.Group();
  const ecgCore = new THREE.Mesh(buildEcgGeometry(ecgCurve, ecgSeg, 0.03, 8), ecgCoreMat);
  const ecgGlow = new THREE.Mesh(buildEcgGeometry(ecgCurve, ecgSeg, 0.17, 10), ecgGlowMat);
  ecgCore.renderOrder = 4; ecgGlow.renderOrder = 3;
  ecgCore.frustumCulled = false; ecgGlow.frustumCulled = false;
  ecg.add(ecgGlow, ecgCore);
  scene.add(ecg);

  /* ---------- DNA helix ---------- */
  const PAIRS = small ? 34 : 56;
  const DNA_H = 7.4, DNA_R = 0.95, DNA_TURNS = 2.6;
  const dnaRoot = new THREE.Group();
  const dnaSpin = new THREE.Group();
  dnaRoot.add(dnaSpin);
  scene.add(dnaRoot);

  const dnaMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,
    envMapIntensity: 1.15, transparent: true, opacity: 1,
  });
  const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, small ? 2 : 3), dnaMat, PAIRS * 2);
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xd3def2, roughness: 0.35, transparent: true, opacity: 0.9, envMapIntensity: 1 });
  const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.032, 0.032, 1, 8), rungMat, PAIRS);
  dnaSpin.add(rungs, beads);

  const beadPos = [];
  const beadBase = [];
  const strandA = new THREE.Color('#3b78ff');
  const strandB = new THREE.Color('#22c8a4');
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v3 = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < PAIRS; i++) {
    const f = i / (PAIRS - 1);
    const y = -DNA_H / 2 + DNA_H * f;
    const th = f * DNA_TURNS * Math.PI * 2;
    const a = new THREE.Vector3(Math.cos(th) * DNA_R, y, Math.sin(th) * DNA_R);
    const b = new THREE.Vector3(-Math.cos(th) * DNA_R, y, -Math.sin(th) * DNA_R);
    beadPos.push(a, b);
    beadBase.push(strandA, strandB);
    const dir = v3.copy(b).sub(a);
    const len = dir.length();
    q.setFromUnitVectors(up, dir.normalize());
    m4.compose(a.clone().add(b).multiplyScalar(0.5), q, s3.set(1, len - 0.3, 1));
    rungs.setMatrixAt(i, m4);
  }
  rungs.instanceMatrix.needsUpdate = true;
  const pairGlow = new Float32Array(PAIRS);
  const identityQ = new THREE.Quaternion();
  const beadColor = new THREE.Color();
  for (let i = 0; i < PAIRS * 2; i++) beads.setColorAt(i, beadBase[i]);

  /* ---------- Medical-cross tiles ---------- */
  const COLS = small ? 3 : 7, ROWS = small ? 5 : 4;
  const TILES = COLS * ROWS;
  const tileMat = new THREE.MeshPhysicalMaterial({
    roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1,
    envMapIntensity: 1.2, transparent: true, opacity: 1,
  });
  const tiles = new THREE.InstancedMesh(buildCrossGeometry(), tileMat, TILES);
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tiles.frustumCulled = false;
  scene.add(tiles);

  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const tileData = [];
  const palette = ['#ffffff', '#ffffff', '#ffffff', '#e4edff', '#e4edff', MINT, BLUE, '#ffffff', CORAL, '#d9f5ee'];
  const spacing = small ? 1.12 : 1.45;
  for (let i = 0; i < TILES; i++) {
    const c = i % COLS, r = Math.floor(i / COLS);
    const ang = (i / TILES) * Math.PI * 2;
    tileData.push({
      A: new THREE.Vector3((rand() * 2 - 1) * 10, (rand() * 2 - 1) * 6, -4 - rand() * 7),
      B: new THREE.Vector3((c - (COLS - 1) / 2) * spacing, ((ROWS - 1) / 2 - r) * spacing - 0.15, -1.5),
      C: new THREE.Vector3(Math.cos(ang) * 8, -2.6 + Math.sin(ang * 3) * 0.4, -6 + Math.sin(ang) * 3.5),
      rot: new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
      delay: ((c + r * 0.6) / (COLS + ROWS * 0.6)) * 0.5,
      phase: rand() * 6.28,
    });
    tiles.setColorAt(i, new THREE.Color(palette[Math.floor(rand() * palette.length)]));
  }
  tiles.instanceColor.needsUpdate = true;
  const tPos = new THREE.Vector3();
  const tEuler = new THREE.Euler();
  const tQuat = new THREE.Quaternion();

  /* ---------- Dust ---------- */
  const DUST = small ? 160 : 420;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (rand() * 2 - 1) * 13;
    dustPos[i * 3 + 1] = (rand() * 2 - 1) * 8;
    dustPos[i * 3 + 2] = -10 + rand() * 12;
    dustSeed[i] = rand();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: 60 }, uA: { value: cBlue.clone() }, uB: { value: cMint.clone() }, uOpacity: { value: 0.8 } },
    vertexShader: dustVert, fragmentShader: dustFrag, transparent: true, depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- State + sizing ---------- */
  let states = buildStates(false);
  const S = { ...states[0] };
  const KEYS = Object.keys(S);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    states = buildStates(camera.aspect < 1, camera.aspect);
    dustMat.uniforms.uSize.value = 60 * renderer.getPixelRatio() * (small ? 0.8 : 1);
  }
  resize();
  window.addEventListener('resize', resize);

  const stateAccent = (i) => {
    switch (i) {
      case 0: return CORAL;
      case 1: return story.accent || BLUE;
      case 2: return MINT;
      default: return BLUE;
    }
  };

  /* ---------- Frame ---------- */
  let lastT = performance.now();
  const tick = () => { const n = performance.now(); const d = (n - lastT) / 1000; lastT = n; return d; };
  let t = reduceMotion ? 0.12 : 0;
  let prog = story.progress;
  const ptr = { x: 0, y: 0 };
  let raf = 0;
  let lastSig = '';

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(tick(), 0.25); // larger cap keeps scroll easing responsive on slow frames

    if (reduceMotion) {
      const sig = `${story.progress.toFixed(3)}|${story.accent}|${window.innerWidth}x${window.innerHeight}`;
      if (sig === lastSig) return;
      lastSig = sig;
      prog = story.progress;
      ptr.x = 0; ptr.y = 0;
    } else {
      t += dt;
      prog += (story.progress - prog) * (1 - Math.exp(-dt * 4.5));
      ptr.x += (story.pointer.x - ptr.x) * (1 - Math.exp(-dt * 3));
      ptr.y += (story.pointer.y - ptr.y) * (1 - Math.exp(-dt * 3));
    }

    // interpolate scroll states
    const maxI = states.length - 1;
    const p = Math.min(Math.max(prog, 0), maxI);
    const i0 = Math.min(Math.floor(p), maxI - 1);
    const f = p - i0;
    const e = f * f * (3 - 2 * f);
    const s0 = states[i0], s1 = states[i0 + 1];
    for (const k of KEYS) S[k] = lerp(s0[k], s1[k], e);

    // accent colour
    tmpA.set(stateAccent(i0));
    tmpB.set(stateAccent(i0 + 1));
    accentTarget.copy(tmpA).lerp(tmpB, e);
    if (story.confirmPulse && performance.now() - story.confirmPulse < 1800) accentTarget.copy(cMint);
    if (reduceMotion) accent.copy(accentTarget);
    else accent.lerp(accentTarget, 1 - Math.exp(-dt * 3.5));

    // heartbeat (lub-dub at 60 bpm, synced with the ECG spikes)
    const ph = t % 1;
    const beat = Math.exp(-(((ph - 0.3) / 0.045) ** 2)) + 0.55 * Math.exp(-(((ph - 0.5) / 0.06) ** 2));

    /* camera */
    camera.position.set(S.camX + ptr.x * 0.35, S.camY - ptr.y * 0.22, S.camZ);
    camera.lookAt(S.lookX, S.lookY, 0);

    /* heart */
    heartRoot.visible = S.heartO > 0.01;
    heartRoot.position.set(S.heartX, S.heartY, S.heartZ);
    heartRoot.scale.setScalar(S.heartS * (1 + 0.05 * beat));
    heartRoot.rotation.y = Math.sin(t * 0.35) * 0.28 + ptr.x * 0.55;
    heartRoot.rotation.x = ptr.y * 0.3 + Math.sin(t * 0.27) * 0.05;
    glassMat.opacity = 0.78 * S.heartO;
    glassMat.emissiveIntensity = 0.05 + beat * 0.09;
    rimUniforms.uOpacity.value = S.heartO;
    rimUniforms.uBeat.value = beat;
    coreMat.uniforms.uOpacity.value = S.heartO;
    coreMat.uniforms.uBeat.value = beat;

    halo.visible = S.halo * S.heartO > 0.01;
    halo.position.set(S.heartX, S.heartY + 0.1 * S.heartS, S.heartZ - 1.2);
    halo.quaternion.copy(camera.quaternion);
    halo.scale.setScalar(6.5 * S.heartS * (1 + 0.04 * beat));
    let haloK = S.halo * S.heartO * (0.32 + 0.16 * beat);
    if (story.confirmPulse) {
      const since = (performance.now() - story.confirmPulse) / 1000;
      if (since < 2) haloK += Math.sin(Math.min(since / 2, 1) * Math.PI) * 0.35;
    }
    haloMat.uniforms.uStrength.value = haloK;

    /* ECG */
    ecg.visible = S.ecgO > 0.01;
    ecg.position.set(0, S.ecgY, S.ecgZ);
    const head = (t / ECG_BEATS) % 1;
    for (const m of [ecgCoreMat, ecgGlowMat]) {
      m.uniforms.uHead.value = head;
      m.uniforms.uAmp.value = S.ecgAmp;
      m.uniforms.uOpacity.value = S.ecgO;
    }

    /* DNA */
    dnaRoot.visible = S.dnaO > 0.01;
    dnaRoot.position.set(S.dnaX, S.dnaY, S.dnaZ);
    dnaRoot.scale.setScalar(S.dnaS);
    dnaRoot.rotation.z = S.dnaTilt;
    dnaSpin.rotation.y = t * 0.32;
    dnaMat.opacity = S.dnaO;
    rungMat.opacity = 0.9 * S.dnaO;
    if (dnaRoot.visible) {
      const deptW = clamp01(1 - Math.abs(p - 1) * 1.6);
      const band = story.activeDept || 0;
      const lo = Math.floor((band * PAIRS) / 6), hi = Math.floor(((band + 1) * PAIRS) / 6);
      const k = reduceMotion ? 1 : 1 - Math.exp(-dt * 6);
      for (let i = 0; i < PAIRS; i++) {
        const target = i >= lo && i < hi ? 1 : 0;
        pairGlow[i] += (target - pairGlow[i]) * k;
        const h = pairGlow[i] * deptW;
        const wave = reduceMotion ? 0 : Math.sin(t * 2.2 - i * 0.35) * 0.06;
        const sc = 1 + 0.7 * h + wave * (1 - h);
        for (let sIdx = 0; sIdx < 2; sIdx++) {
          const idx = i * 2 + sIdx;
          m4.compose(beadPos[idx], identityQ, s3.set(sc, sc, sc));
          beads.setMatrixAt(idx, m4);
          beadColor.copy(beadBase[idx]).lerp(accent, h);
          beads.setColorAt(idx, beadColor);
        }
      }
      beads.instanceMatrix.needsUpdate = true;
      beads.instanceColor.needsUpdate = true;
    }

    /* tiles */
    tiles.visible = S.tO > 0.01 && S.tS > 0.01;
    tileMat.opacity = S.tO;
    if (tiles.visible) {
      const restAC = S.tA + S.tC || 1;
      for (let i = 0; i < TILES; i++) {
        const d = tileData[i];
        const wb = smooth(d.delay, d.delay + 0.5, S.tB);
        const rest = 1 - wb;
        const wa = rest * (S.tA / restAC), wc = rest * (S.tC / restAC);
        tPos.set(0, 0, 0)
          .addScaledVector(d.A, wa)
          .addScaledVector(d.B, wb)
          .addScaledVector(d.C, wc);
        tPos.y += Math.sin(t * 0.7 + d.phase) * 0.1;
        tPos.x += Math.cos(t * 0.5 + d.phase) * 0.05 * rest;
        const loose = 1 - wb;
        tEuler.set(
          d.rot.x * loose + Math.sin(t * 0.5 + d.phase) * 0.07 - 0.12 * wb,
          d.rot.y * loose + Math.cos(t * 0.4 + d.phase) * 0.1 + t * 0.15 * loose,
          d.rot.z * loose,
        );
        tQuat.setFromEuler(tEuler);
        const sc = S.tS * (0.85 + 0.15 * wb);
        m4.compose(tPos, tQuat, s3.set(sc, sc, sc));
        tiles.setMatrixAt(i, m4);
      }
      tiles.instanceMatrix.needsUpdate = true;
    }

    /* dust */
    dustMat.uniforms.uTime.value = t;
    dustMat.uniforms.uOpacity.value = S.dust;

    renderer.render(scene, camera);
  }

  function start() {
    if (raf) return;
    tick();
    lastSig = '';
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  start();

  return { renderer, scene, camera, start, stop };
}
