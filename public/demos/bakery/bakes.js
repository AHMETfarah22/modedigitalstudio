// Procedural baked goods, wood and oven pieces for Ekşi Maya Fırın.
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

/* ---------------- shared GLSL noise ---------------- */
export const NOISE_GLSL = /* glsl */`
float em_hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float em_noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(em_hash(i), em_hash(i + vec3(1,0,0)), f.x), mix(em_hash(i + vec3(0,1,0)), em_hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(em_hash(i + vec3(0,0,1)), em_hash(i + vec3(1,0,1)), f.x), mix(em_hash(i + vec3(0,1,1)), em_hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float em_fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * em_noise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`;

// small JS value noise for CPU displacement
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf),
    zf);
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* ---------------- crust material ---------------- */
// MeshStandardMaterial with shader noise: browning, crust grain, flour dusting, scoring, micro bump.
export function crustMaterial(o = {}) {
  const u = {
    uBake: { value: o.bake ?? 1 },
    uGolden: { value: new THREE.Color(o.golden ?? '#c98a3e') },
    uDeep: { value: new THREE.Color(o.deep ?? '#6b3313') },
    uPale: { value: new THREE.Color(o.pale ?? '#e8c58c') },
    uDough: { value: new THREE.Color(o.dough ?? '#eee0c4') },
    uFlour: { value: o.flour ?? 0 },
    uGloss: { value: o.gloss ?? 0 },
    uBump: { value: o.bump ?? 0.014 },
    uScale: { value: o.scale ?? 1 },
  };
  const m = new THREE.MeshStandardMaterial({ roughness: o.rough ?? 0.72, metalness: 0 });
  if (o.score) m.defines = { USE_SCORE: '' };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vObj; varying vec3 vObjN;
        #ifdef USE_SCORE
        attribute float aScore; varying float vScore;
        #endif`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vObj = position; vObjN = normal;
        #ifdef USE_SCORE
        vScore = aScore;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uBake, uFlour, uGloss, uBump, uScale;
        uniform vec3 uGolden, uDeep, uPale, uDough;
        varying vec3 vObj; varying vec3 vObjN;
        #ifdef USE_SCORE
        varying float vScore;
        #endif
        ${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 op = vObj * uScale;
        float nA = em_fbm(op * 4.5);
        float nB = em_fbm(op * 19.0);
        float topF = clamp(normalize(vObjN).y * 0.5 + 0.5, 0.0, 1.0);
        vec3 crust = mix(uGolden, uDeep, smoothstep(0.42, 1.0, topF * 0.72 + nA * 0.6));
        crust *= 0.8 + 0.4 * nB;
        float sc = 0.0;
        #ifdef USE_SCORE
        sc = smoothstep(0.12, 0.7, vScore);
        float ridge = smoothstep(0.02, 0.12, vScore) * (1.0 - sc);
        crust = mix(crust, uDeep * 0.75, ridge * 0.6);
        crust = mix(crust, uPale * (0.82 + 0.35 * nB), sc);
        #endif
        float fl = uFlour * smoothstep(0.5, 0.7, em_fbm(op * 3.2 + 3.1)) * smoothstep(0.5, 0.95, topF) * (1.0 - sc);
        fl = max(fl, uFlour * 0.35 * smoothstep(0.62, 0.75, em_fbm(op * 9.0 + 7.0)) * topF * (1.0 - sc));
        crust = mix(crust, vec3(0.88, 0.85, 0.8), fl);
        vec3 dg = uDough * (0.94 + 0.09 * nB);
        diffuseColor.rgb = mix(dg, crust, uBake);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + fl * 0.25 - uGloss * (1.0 - fl) * 0.35 + (nB - 0.5) * 0.18, 0.08, 1.0);
        roughnessFactor = mix(0.62, roughnessFactor, uBake);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float h = em_fbm(op * 15.0) + 0.45 * em_fbm(op * 38.0);
          vec3 sp = -vViewPosition;
          vec3 dpx = dFdx(sp), dpy = dFdy(sp);
          float hx = dFdx(h), hy = dFdy(h);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (hx * r1 + hy * r2);
          float bs = uBump * mix(0.25, 1.0, uBake);
          normal = normalize(abs(det) * normal - grad * bs);
        }`);
  };
  m.customProgramCacheKey = () => 'em-crust-' + (o.score ? 1 : 0);
  return m;
}

/* ---------------- wood material ---------------- */
export function woodMaterial(o = {}) {
  const u = {
    uLight: { value: new THREE.Color(o.light ?? '#c69a64') },
    uDark: { value: new THREE.Color(o.dark ?? '#8c5f35') },
    uFreq: { value: o.freq ?? 22 },
  };
  const m = new THREE.MeshStandardMaterial({ roughness: o.rough ?? 0.62, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uLight, uDark; uniform float uFreq; varying vec3 vObj; ${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float warp = em_fbm(vObj * vec3(0.6, 3.0, 6.0)) * 3.0;
        float g = sin(vObj.z * uFreq + warp * 2.4) * 0.5 + 0.5;
        g = pow(g, 3.0);
        float fine = em_fbm(vObj * vec3(1.0, 30.0, 60.0));
        vec3 wc = mix(uLight, uDark, g * 0.75 + fine * 0.35);
        diffuseColor.rgb = wc;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + g * 0.12, 0.0, 1.0);`);
  };
  m.customProgramCacheKey = () => 'em-wood';
  return m;
}

/* ---------------- loaf: baked shape + dough morph ---------------- */
export function loafGeometry(detail = 1) {
  let g = new THREE.SphereGeometry(1, Math.round(150 * detail), Math.round(100 * detail));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-5);
  const pos = g.attributes.position;
  const n = pos.count;
  const baked = new Float32Array(n * 3);
  const dough = new Float32Array(n * 3);
  const score = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const yy = y < 0 ? y * 0.34 : y;
    // the scoring: one long, slightly curved slash along the top
    const curve = 0.16 * x + 0.08 * Math.sin(x * 2.2);
    const d = z - curve - 0.05;
    const along = smooth(0.92, 0.55, Math.abs(x));
    const onTop = smooth(0.25, 0.7, y);
    const groove = Math.exp(-(d * d) / 0.012) * along * onTop;
    const ear = smooth(0.0, 0.08, d) * smooth(0.32, 0.12, d) * along * onTop; // lifted lip on one side
    const nz = vnoise(x * 3 + 4, y * 3, z * 3) - 0.5;
    const taper = 1 - 0.1 * x * x;
    const r = 1 - groove * 0.13 + ear * 0.05 + nz * 0.035;
    baked[i * 3] = x * 1.5 * r;
    baked[i * 3 + 1] = yy * 0.82 * r * taper;
    baked[i * 3 + 2] = z * 0.98 * r * taper;
    // dough: smooth, rounder, slightly slumped
    const dn = vnoise(x * 2 + 9, y * 2, z * 2) - 0.5;
    const sl = y < 0 ? y * 0.3 : y * 0.9;
    dough[i * 3] = x * 1.3 * (1 + dn * 0.02);
    dough[i * 3 + 1] = sl * 0.72;
    dough[i * 3 + 2] = z * 1.0 * (1 + dn * 0.02);
    score[i] = groove;
  }
  pos.array.set(baked);
  pos.needsUpdate = true;
  g.computeVertexNormals();

  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dough, 3));
  dg.setIndex(g.index);
  dg.computeVertexNormals();

  g.morphAttributes.position = [dg.attributes.position];
  g.morphAttributes.normal = [dg.attributes.normal];
  g.setAttribute('aScore', new THREE.BufferAttribute(score, 1));
  return g; // base = baked, morph 0 = dough. Bottom sits at y ≈ -0.28
}

/* ---------------- simit ---------------- */
const SIMIT_R = 0.6, SIMIT_r = 0.16, TWIST = 8;
function simitRadius(u, v) { return SIMIT_r * (1 + 0.17 * (Math.abs(Math.cos(v - TWIST * u)) - 0.6)); }

export function simitGeometry(detail = 1) {
  const g = new THREE.TorusGeometry(SIMIT_R, SIMIT_r, Math.round(36 * detail), Math.round(200 * detail));
  const pos = g.attributes.position;
  const p = new THREE.Vector3(), c = new THREE.Vector3(), radial = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const u = Math.atan2(p.y, p.x);
    radial.set(Math.cos(u), Math.sin(u), 0);
    c.copy(radial).multiplyScalar(SIMIT_R);
    const d = p.clone().sub(c);
    const v = Math.atan2(d.z, d.dot(radial));
    const rr = simitRadius(u, v);
    const nrm = radial.clone().multiplyScalar(Math.cos(v)).add(new THREE.Vector3(0, 0, Math.sin(v)));
    p.copy(c).addScaledVector(nrm, rr);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  g.rotateX(-Math.PI / 2);
  return g;
}

export function sesameMesh(count, color = '#ecd29c') {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), spin = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3();
  const pos = new THREE.Vector3(), radial = new THREE.Vector3(), nrm = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = (0.08 + Math.random() * 0.86) * Math.PI; // top half of the tube (before rotation)
    radial.set(Math.cos(u), Math.sin(u), 0);
    nrm.copy(radial).multiplyScalar(Math.cos(v)).add(new THREE.Vector3(0, 0, Math.sin(v)));
    pos.copy(radial).multiplyScalar(SIMIT_R).addScaledVector(nrm, simitRadius(u, v) - 0.004);
    q.setFromUnitVectors(Y, nrm);
    spin.setFromAxisAngle(Y, Math.random() * Math.PI * 2);
    q.multiply(spin);
    const k = 0.75 + Math.random() * 0.5;
    s.set(0.026 * k, 0.009 * k, 0.015 * k);
    m.compose(pos, q, s).premultiply(rot);
    mesh.setMatrixAt(i, m);
  }
  mesh.castShadow = false;
  return mesh;
}

/* ---------------- croissant: twisted segments ---------------- */
export function croissantGeometry() {
  const parts = [];
  const N = 9, R = 0.85;
  for (let k = 0; k < N; k++) {
    const t = (k / (N - 1)) * 2 - 1;
    const a = t * 1.18;
    const s = 0.34 * (1 - 0.62 * t * t) + 0.07;
    const sp = new THREE.SphereGeometry(1, 28, 20);
    sp.scale(0.17 + 0.07 * (1 - t * t), s * 0.78, s);
    sp.rotateX(t * 0.7 + (k % 2 ? 0.22 : -0.22));
    sp.rotateY(a);
    sp.translate(Math.sin(a) * R, s * 0.55, (Math.cos(a) - 1) * R + 0.2);
    parts.push(sp);
  }
  const g = mergeGeometries(parts);
  return g;
}

/* ---------------- cinnamon bun: spiral tube + icing ---------------- */
export function bunGeometry() {
  const pts = [];
  const M = 140, turns = 2.4;
  for (let i = 0; i <= M; i++) {
    const f = i / M;
    const th = f * turns * Math.PI * 2;
    const r = 0.06 + 0.42 * f;
    const y = 0.17 * (1 - (r / 0.52) ** 2) + 0.1;
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 360, 0.105, 16, false);
  const capA = new THREE.SphereGeometry(0.105, 16, 12); capA.translate(pts[0].x, pts[0].y, pts[0].z);
  const capB = new THREE.SphereGeometry(0.105, 16, 12); capB.translate(pts[M].x, pts[M].y, pts[M].z);
  const g = mergeGeometries([tube, capA, capB]);
  g.scale(1, 0.85, 1);
  return g;
}
export function icingGeometry() {
  const pts = [];
  const K = 7;
  for (let i = 0; i <= K * 6; i++) {
    const f = i / (K * 6);
    const x = -0.42 + f * 0.84;
    const z = Math.sin(f * K * Math.PI) * 0.34 * Math.sqrt(Math.max(0, 1 - (x / 0.48) ** 2));
    const r = Math.hypot(x, z);
    const y = (0.17 * (1 - (r / 0.52) ** 2) + 0.1) * 0.85 + 0.1;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.016, 8, false);
}

/* ---------------- poğaça ---------------- */
export function pogacaGeometry() {
  const g = new THREE.SphereGeometry(0.5, 48, 32);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    y = y < 0 ? y * 0.28 : y * 0.66;
    const n = vnoise(x * 4, y * 4, z * 4) - 0.5;
    pos.setXYZ(i, x * (1 + n * 0.04), y + 0.14, z * (1 + n * 0.04));
  }
  g.computeVertexNormals();
  return g;
}
export function nigellaMesh(count) {
  const geo = new THREE.SphereGeometry(1, 6, 4);
  const mat = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.4 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = 0.14 + 0.33 * Math.sqrt(Math.max(0, 1 - (r / 0.5) ** 2));
    e.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(0.018, 0.008, 0.012));
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

/* ---------------- peel ---------------- */
export function peelGeometry() {
  const s = new THREE.Shape();
  s.moveTo(3.0, -0.13); s.lineTo(1.4, -0.13);
  s.quadraticCurveTo(1.08, -0.15, 0.98, -0.55);
  s.quadraticCurveTo(0.82, -0.98, 0.0, -0.98);
  s.quadraticCurveTo(-1.3, -0.98, -1.3, 0);
  s.quadraticCurveTo(-1.3, 0.98, 0, 0.98);
  s.quadraticCurveTo(0.82, 0.98, 0.98, 0.55);
  s.quadraticCurveTo(1.08, 0.15, 1.4, 0.13);
  s.lineTo(3.0, 0.13); s.lineTo(3.0, -0.13);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.02, bevelSegments: 3, curveSegments: 32 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.015, 0);
  return g; // top surface ≈ y 0.08
}

/* ---------------- stone oven ---------------- */
export const OVEN = { z: -6.5, W: 1.4, hearth: 0.5, archY: 1.5 };

export function buildOven(lowPower) {
  const group = new THREE.Group();
  const { W, hearth, archY } = OVEN;
  const bw = 0.52, bh = 0.26, bd = 0.42;
  const inOpening = (x, y) => (y >= hearth && y <= archY && Math.abs(x) < W) || (y > archY && Math.hypot(x, y - archY) < W);
  const inBand = (x, y) => y > archY - 0.02 && Math.hypot(x, y - archY) < W + 0.56;
  const blocked = (x, y) => {
    const hx = bw * 0.45, hy = bh * 0.45;
    for (const [dx, dy] of [[-hx, -hy], [hx, -hy], [-hx, hy], [hx, hy], [0, 0]]) {
      if (inOpening(x + dx, y + dy) || inBand(x + dx, y + dy)) return true;
    }
    return false;
  };
  const spots = [];
  const rows = Math.round(5.6 / bh);
  for (let r = 0; r < rows; r++) {
    const y = r * bh + bh / 2;
    const off = (r % 2) * bw * 0.5;
    for (let x = -4.4 - off; x <= 4.4; x += bw) {
      if (Math.abs(x) > 4.3 || blocked(x, y)) continue;
      spots.push([x, y, 0]);
    }
  }
  const brickGeo = new RoundedBoxGeometry(bw - 0.035, bh - 0.035, bd, 2, 0.03);
  const brickMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
  const voussoirs = 19;
  const bricks = new THREE.InstancedMesh(brickGeo, brickMat, spots.length + voussoirs + 6);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  const base = new THREE.Color('#5a3a2a'), soot = new THREE.Color('#1c1512');
  let i = 0;
  const tint = (x, y) => {
    const near = Math.hypot(x, (y - archY) * 1.2);
    const sootAmt = THREE.MathUtils.clamp(1.4 - near * 0.35 + (y > archY ? 0.25 : 0), 0, 1) * 0.75;
    c.copy(base).offsetHSL((Math.random() - 0.5) * 0.03, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.08);
    c.lerp(soot, sootAmt);
    return c;
  };
  for (const [x, y] of spots) {
    m.compose(new THREE.Vector3(x + (Math.random() - 0.5) * 0.01, y, (Math.random() - 0.5) * 0.03), q.identity(), new THREE.Vector3(1, 1, 1));
    bricks.setMatrixAt(i, m); bricks.setColorAt(i, tint(x, y)); i++;
  }
  // arch voussoirs, radial
  for (let k = 0; k < voussoirs; k++) {
    const a = (k + 0.5) / voussoirs * Math.PI;
    const rr = W + 0.27;
    const x = Math.cos(a) * rr, y = archY + Math.sin(a) * rr;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    m.compose(new THREE.Vector3(x, y, 0.04), q, new THREE.Vector3(1, 0.98, 1.1));
    bricks.setMatrixAt(i, m); bricks.setColorAt(i, tint(x, y).lerp(soot, 0.3)); i++;
  }
  // hearth lip
  for (let k = 0; k < 6; k++) {
    const x = -W + bw * 0.5 + k * ((2 * W - bw) / 5);
    m.compose(new THREE.Vector3(x, hearth - bh / 2 + 0.01, 0.06), q.identity(), new THREE.Vector3(1, 1, 1.15));
    bricks.setMatrixAt(i, m); bricks.setColorAt(i, tint(x, 0).lerp(soot, 0.2)); i++;
  }
  bricks.count = i;
  bricks.instanceMatrix.needsUpdate = true;
  bricks.receiveShadow = true;
  group.add(bricks);

  // mortar wall behind bricks
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-4.6, 0); wallShape.lineTo(4.6, 0); wallShape.lineTo(4.6, 6); wallShape.lineTo(-4.6, 6); wallShape.lineTo(-4.6, 0);
  const hole = new THREE.Path();
  hole.moveTo(-W, hearth); hole.lineTo(W, hearth); hole.lineTo(W, archY);
  hole.absarc(0, archY, W, 0, Math.PI, false);
  hole.lineTo(-W, hearth);
  wallShape.holes.push(hole);
  const wall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape, 24), new THREE.MeshStandardMaterial({ color: '#1a1411', roughness: 1 }));
  wall.position.set(0, 0, -0.2);
  group.add(wall);

  // glowing cavity (inside faces of a box)
  const glowU = { uTime: { value: 0 }, uGlow: { value: 1 } };
  const cavityMat = new THREE.ShaderMaterial({
    uniforms: glowU,
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uGlow; varying vec3 vP; ${NOISE_GLSL}
      void main(){
        float back = smoothstep(0.9, -0.85, vP.z);
        float low = smoothstep(1.6, -1.4, vP.y);
        float n = em_fbm(vec3(vP.x * 2.0, vP.y * 2.0 - uTime * 0.9, uTime * 0.25));
        float flick = 0.85 + 0.15 * sin(uTime * 7.0 + n * 6.0);
        float e = (0.15 + back * 0.6 + low * 0.5) * (0.55 + n * 0.9) * flick;
        float embers = smoothstep(0.7, 0.9, em_noise(vec3(vP.xz * 9.0, uTime * 0.6))) * smoothstep(-1.2, -1.45, vP.y);
        vec3 col = mix(vec3(0.18, 0.03, 0.005), vec3(1.0, 0.38, 0.06), clamp(e * 0.85, 0.0, 1.0));
        col += vec3(1.0, 0.75, 0.35) * pow(clamp(e - 0.6, 0.0, 1.0), 2.0) * 2.0 + embers * vec3(1.0, 0.5, 0.15) * 1.5;
        gl_FragColor = vec4(col * (0.3 + 0.42 * uGlow), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const cavH = archY + W - hearth + 0.2;
  const cavity = new THREE.Mesh(new THREE.BoxGeometry(2 * W + 0.3, cavH, 1.8), cavityMat);
  cavity.position.set(0, hearth + cavH / 2 - 0.0, -1.1);
  group.add(cavity);

  // dark floor of the cavity so a loaf sitting in it reads well
  const hearthFloor = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 0.3, 1.8), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.95, emissive: '#3a1406', emissiveIntensity: 0.6 }));
  hearthFloor.rotation.x = -Math.PI / 2;
  hearthFloor.position.set(0, hearth + 0.002, -1.1);
  hearthFloor.receiveShadow = true;
  group.add(hearthFloor);

  group.position.z = OVEN.z;
  group.userData.glow = glowU;
  group.userData.floorMat = hearthFloor.material;
  return group;
}

/* ---------------- flour particles ---------------- */
export function flourParticles(count, beamO, beamD) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3), s = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * 7;
    p[i * 3 + 1] = Math.random() * 4.2;
    p[i * 3 + 2] = (Math.random() - 0.5) * 5;
    s[i] = Math.random();
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
  const u = {
    uTime: { value: 0 }, uPixel: { value: 1 }, uSize: { value: 28 }, uOpacity: { value: 1 },
    uBeamO: { value: beamO }, uBeamD: { value: beamD }, uColor: { value: new THREE.Color('#ffe8c4') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aSeed; uniform float uTime, uSize, uPixel; uniform vec3 uBeamO, uBeamD; varying float vA;
      void main(){
        vec3 p = position;
        float t = uTime * 0.25 + aSeed * 40.0;
        p.y = mod(p.y - uTime * (0.03 + aSeed * 0.05), 4.2);
        p.x += sin(t + aSeed * 6.28) * 0.35 + sin(t * 0.37) * 0.2;
        p.z += cos(t * 0.8 + aSeed * 3.0) * 0.3;
        vec3 w = (modelMatrix * vec4(p, 1.0)).xyz;
        vec3 d = w - uBeamO; float along = dot(d, uBeamD);
        float dist = length(d - uBeamD * along);
        float inBeam = smoothstep(1.3, 0.15, dist / max(0.4, along * 0.22));
        vA = (0.12 + 0.88 * inBeam) * smoothstep(0.0, 0.5, p.y) * smoothstep(4.2, 3.5, p.y);
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_PointSize = uSize * uPixel * (0.35 + aSeed * 0.8) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(c)); gl_FragColor = vec4(uColor * a * vA * uOpacity, a * vA * uOpacity); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.userData.u = u;
  return pts;
}

/* ---------------- light beam ---------------- */
export function lightBeam(origin, dir, length = 8, radius = 1.6) {
  const geo = new THREE.ConeGeometry(radius, length, 48, 1, true);
  geo.translate(0, -length / 2, 0);
  const u = { uOpacity: { value: 1 }, uLen: { value: length }, uColor: { value: new THREE.Color('#ffd49a') } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying float vH; varying vec3 vN; varying vec3 vV; uniform float uLen;
      void main(){ vH = -position.y / uLen; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vH; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = edge * smoothstep(0.0, 0.25, vH) * smoothstep(1.0, 0.55, vH) * 0.11 * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(origin);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
  mesh.renderOrder = 5;
  mesh.userData.u = u;
  return mesh;
}
