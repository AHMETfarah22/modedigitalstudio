// GLSL for sky, water and lighthouse beam. Colours arrive as linear-space uniforms.

export const SKY_UNIFORMS = /* glsl */`
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uGlow;
uniform float uDusk;
uniform float uTime;
`;

export const SKY_FN = /* glsl */`
vec3 skyColor(vec3 d) {
  float h = d.y;
  float t = pow(clamp(h, 0.0, 1.0), 0.42);
  vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 1.0, t));
  float s = max(dot(d, uSunDir), 0.0);
  float band = exp(-abs(h) * 6.0);
  float sunUp = smoothstep(-0.25, 0.05, uSunDir.y);
  col += uSunColor * (pow(s, 5.0) * 0.32 + pow(s, 48.0) * 0.55) * uGlow * sunUp;
  col += uSunColor * band * pow(s, 1.6) * 0.38 * uGlow * sunUp;
  if (h < 0.0) col = mix(col, uHorizon * 0.75, clamp(-h * 5.0, 0.0, 1.0));
  return col;
}
`;

export const NOISE_FN = /* glsl */`
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

export const skyVertex = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

export const skyFragment = /* glsl */`
${SKY_UNIFORMS}
varying vec3 vDir;
${NOISE_FN}
${SKY_FN}
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyColor(d);
  float sd = dot(d, uSunDir);
  float disk = smoothstep(0.99935, 0.99965, sd) * smoothstep(-0.03, 0.01, uSunDir.y);
  col += uSunColor * disk * 4.0;
  if (uDusk > 0.01) {
    vec3 p = d * 220.0;
    vec3 cell = floor(p);
    float r = hash13(cell);
    vec3 f = fract(p) - 0.5;
    float star = step(0.992, r) * smoothstep(0.22, 0.0, length(f));
    star *= 0.6 + 0.4 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
    col += vec3(star) * uDusk * smoothstep(0.04, 0.35, d.y) * 1.4;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const waterVertex = /* glsl */`
uniform float uTime;
uniform float uAmp;
varying vec3 vWorld;
varying vec3 vNrm;

void addWave(vec2 p, vec2 dir, float k, float a, float speed, inout float h, inout vec2 dh) {
  float ph = dot(dir, p) * k + uTime * speed;
  h += a * sin(ph);
  dh += a * k * cos(ph) * dir;
}

void main() {
  vec3 pos = position;
  vec2 p = pos.xz;
  float h = 0.0;
  vec2 dh = vec2(0.0);
  addWave(p, normalize(vec2(0.3, 1.0)), 0.22, 0.20, 1.1, h, dh);
  addWave(p, normalize(vec2(-0.6, 0.8)), 0.37, 0.11, 1.5, h, dh);
  addWave(p, normalize(vec2(0.9, 0.4)), 0.61, 0.06, 2.1, h, dh);
  addWave(p, normalize(vec2(-0.2, -1.0)), 0.95, 0.03, 2.7, h, dh);
  // calmer water inside the bay
  float zs = -26.0 + 0.012 * p.x * p.x;
  float calm = mix(0.35, 1.0, smoothstep(0.0, 30.0, p.y - zs));
  h *= uAmp * calm;
  dh *= uAmp * calm;
  pos.y += h;
  vNrm = normalize(vec3(-dh.x, 1.0, -dh.y));
  vec4 world = modelMatrix * vec4(pos, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const waterFragment = /* glsl */`
${SKY_UNIFORMS}
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uSunInt;
uniform vec3 uAmbient;
uniform vec3 uLights[3];
uniform vec3 uLightColor;
varying vec3 vWorld;
varying vec3 vNrm;
${NOISE_FN}
${SKY_FN}

void main() {
  vec2 p = vWorld.xz;
  // fine ripples for glitter
  vec3 n = vNrm;
  float r1 = vnoise(p * 0.9 + vec2(uTime * 0.35, uTime * 0.2));
  float r2 = vnoise(p * 2.3 - vec2(uTime * 0.5, -uTime * 0.3));
  n.xz += (vec2(r1, r2) - 0.5) * 0.22;
  n = normalize(n);

  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;

  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  vec3 r = reflect(-v, n);
  r.y = abs(r.y);
  vec3 refl = skyColor(r);

  float zs = -26.0 + 0.012 * p.x * p.x;
  float shoreDist = p.y - zs;
  float shallow = 1.0 - smoothstep(0.0, 16.0, shoreDist);
  vec3 base = mix(uDeep, uShallow, shallow * 0.9);
  float diff = max(dot(n, normalize(vec3(uSunDir.x, max(uSunDir.y, 0.2), uSunDir.z))), 0.0);
  base *= uAmbient + diff * uSunInt * 0.18 * uSunColor;

  vec3 col = mix(base, refl, clamp(fres * 0.9, 0.0, 1.0));

  vec3 hv = normalize(uSunDir + v);
  float sunVis = smoothstep(-0.03, 0.04, uSunDir.y);
  float spec = pow(max(dot(n, hv), 0.0), 320.0) * 7.0 + pow(max(dot(n, hv), 0.0), 36.0) * 0.18;
  col += uSunColor * spec * sunVis * min(uSunInt, 2.5) * 0.6;

  // warm light reflections at dusk (hotel, pier lamp, lighthouse)
  for (int i = 0; i < 3; i++) {
    vec3 L = uLights[i];
    vec2 dl = p - L.xz;
    // streak elongated toward the camera
    vec2 toC = normalize(cameraPosition.xz - L.xz);
    float along = dot(dl, toC);
    float across = dot(dl, vec2(-toC.y, toC.x));
    float streak = exp(-across * across * 0.9) * exp(-max(along, 0.0) * 0.045) * step(0.0, along);
    streak *= 0.55 + 0.45 * vnoise(vec2(along * 1.4 - uTime * 1.5, across * 3.0));
    col += uLightColor * streak * uDusk * L.y;
  }

  // foam at the shoreline
  float nf = vnoise(p * 0.55 + uTime * 0.12);
  float edge = shoreDist + (nf - 0.5) * 2.2 + sin(uTime * 1.1 - shoreDist * 1.3) * 0.35;
  float foam = 1.0 - smoothstep(0.0, 1.5, edge);
  float lineZ = 3.0 + sin(uTime * 0.7) * 1.3;
  float line = smoothstep(0.35, 0.0, abs(shoreDist - lineZ + (nf - 0.5) * 1.6)) * 0.55;
  float foamAmt = clamp(foam + line * (1.0 - smoothstep(0.0, 8.0, shoreDist)), 0.0, 1.0);
  foamAmt *= smoothstep(0.25, 0.6, vnoise(p * 1.7 - uTime * 0.2) + foam * 0.6);
  vec3 foamCol = uAmbient * 1.25 + uSunColor * uSunInt * 0.12;
  col = mix(col, foamCol, foamAmt * 0.85);

  float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
  col = mix(col, uFogColor, f);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const beamVertex = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const beamFragment = /* glsl */`
uniform float uOpacity;
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float a = pow(vUv.y, 2.2) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;
