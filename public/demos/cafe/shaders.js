// GLSL for the coffee surface (latte art) and the rising steam.

const noise = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  float ss(float a, float b, float x) { return a < b ? smoothstep(a, b, x) : 1.0 - smoothstep(b, a, x); }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
`;

export const latteVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const latteFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCoffee;
  uniform vec3 uCrema;
  uniform vec3 uFoam;
  varying vec2 vUv;
  ${noise}

  // classic implicit heart, negative inside
  float heart(vec2 q) {
    float a = q.x * q.x + q.y * q.y - 1.0;
    return a * a * a - q.x * q.x * q.y * q.y * q.y;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);

    // gentle swirl: the inner pattern drifts more than the rim
    float swirl = (1.0 - r) * (0.55 + 0.25 * sin(uTime * 0.21));
    vec2 sp = rot(swirl + uTime * 0.03) * p;
    sp += 0.025 * vec2(fbm(sp * 3.0 + uTime * 0.05), fbm(sp * 3.0 - uTime * 0.04)) - 0.0125;

    // crema base
    float n = fbm(p * 5.0 + 3.0);
    vec3 base = mix(uCoffee, uCrema, 0.42 + 0.38 * n);
    base = mix(base, uCrema * 1.08, ss(0.78, 0.98, r) * 0.55);
    base *= 0.92 + 0.12 * fbm(p * 22.0);

    // tulip: main heart + layered rings + a smaller heart below + pour line
    vec2 q = sp * 1.75 + vec2(0.0, -0.18);
    float h = heart(q) + (fbm(sp * 9.0) - 0.5) * 0.06;
    float mainH = ss(0.025, -0.025, h);
    float depth = ss(0.0, -0.6, h);
    float rings = ss(0.25, 0.7, sin((q.y + q.x * q.x * 0.55) * 15.0 - depth * 2.0) * 0.5 + 0.5);
    float foam = mainH * mix(1.0, 0.62 + 0.38 * rings, ss(0.02, 0.45, depth));

    vec2 q2 = (sp + vec2(0.0, 0.52)) * 4.2;
    float h2 = heart(q2) + (fbm(sp * 11.0) - 0.5) * 0.08;
    foam = max(foam, ss(0.03, -0.03, h2));

    float line = ss(0.03, 0.0, abs(sp.x + 0.02 * sin(sp.y * 9.0)))
               * ss(-0.78, -0.62, sp.y) * ss(0.62, 0.3, sp.y);
    foam = max(foam, line * 0.9);
    foam *= ss(0.98, 0.9, r);

    vec3 col = mix(base, uFoam, clamp(foam, 0.0, 1.0));

    // soft surface sheen
    float gloss = pow(max(0.0, 1.0 - length(p - vec2(-0.34, 0.36)) * 1.5), 5.0);
    col += vec3(1.0, 0.95, 0.88) * gloss * 0.22;
    col *= mix(0.7, 1.0, ss(1.0, 0.85, r));

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const steamVertex = latteVertex;

export const steamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec3 uColor;
  varying vec2 vUv;
  ${noise}

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.32 + uSeed * 10.0;
    float cx = 0.5 + (0.1 * sin(uv.y * 5.0 - t * 2.6 + uSeed * 6.0) + 0.05 * sin(uv.y * 11.0 - t * 4.0)) * uv.y;
    float width = 0.09 + uv.y * 0.24;
    float d = abs(uv.x - cx);
    float shape = ss(width, 0.0, d);
    float n = fbm(vec2(uv.x * 4.0 + uSeed * 3.0, uv.y * 2.6 - t * 1.6));
    n = ss(0.35, 0.85, n);
    float fade = ss(0.0, 0.18, uv.y) * ss(1.0, 0.4, uv.y);
    float a = shape * n * fade * uOpacity;
    gl_FragColor = vec4(uColor, a * 0.42);
    #include <colorspace_fragment>
  }
`;
