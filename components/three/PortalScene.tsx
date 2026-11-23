"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The portal is the studio mark made physical: a cyan ring around a sun-yellow core.
 * `progress.p` (0 → 1) is driven from outside by the intro timeline:
 *   0.00–0.30  ring arrives and turns face-on
 *   0.30–0.55  the iris opens, particles burst out
 *   0.55–1.00  the camera flies through the ring
 */
export type PortalProgress = { p: number };

const CYAN = new THREE.Color("#2bb8ff");
const SUN = new THREE.Color("#ffd166");
const SIGNAL = new THREE.Color("#1f5cdc");

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const pointVert = /* glsl */ `
  uniform float uTime;
  uniform float uBurst;
  uniform float uPixel;
  attribute vec3 aDir;
  attribute float aSeed;
  attribute float aSize;
  varying float vSeed;
  varying float vFade;
  void main() {
    float b = uBurst;
    vec3 p = position + aDir * b * (6.0 + aSeed * 14.0);
    p.xy += vec2(sin(uTime * 0.6 + aSeed * 40.0), cos(uTime * 0.5 + aSeed * 30.0)) * 0.08;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixel * (14.0 / -mv.z);
    vSeed = aSeed;
    vFade = smoothstep(0.0, 0.08, b) * (1.0 - smoothstep(0.85, 1.0, b));
  }
`;

const pointFrag = /* glsl */ `
  uniform vec3 uCyan;
  uniform vec3 uSun;
  varying float vSeed;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 c = mix(uCyan, uSun, step(0.82, vSeed));
    c = mix(c, vec3(1.0), smoothstep(0.25, 0.0, d) * 0.6);
    gl_FragColor = vec4(c, a * vFade);
  }
`;

const irisFrag = /* glsl */ `
  uniform float uOpen;
  uniform float uTime;
  uniform vec3 uCyan;
  uniform vec3 uSun;
  varying vec2 vUv;
  void main() {
    vec2 q = vUv - 0.5;
    float r = length(q) * 2.0;
    float ang = atan(q.y, q.x);
    float swirl = 0.5 + 0.5 * sin(ang * 6.0 + uTime * 1.6 - r * 10.0);
    float core = smoothstep(uOpen, 0.0, r);
    vec3 col = mix(uCyan, vec3(1.0), core * core);
    col = mix(col, uSun, smoothstep(0.18, 0.0, r) * 0.9);
    float a = core * (0.65 + 0.35 * swirl);
    gl_FragColor = vec4(col, a);
  }
`;

const irisVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

function Burst({ progress, count }: { progress: PortalProgress; count: number }) {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const dir = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 1.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
      // Mostly toward the camera, fanning out
      const v = new THREE.Vector3(Math.cos(a) * (0.3 + Math.random()), Math.sin(a) * (0.3 + Math.random()), 0.6 + Math.random() * 1.6).normalize();
      dir[i * 3] = v.x;
      dir[i * 3 + 1] = v.y;
      dir[i * 3 + 2] = v.z;
      seed[i] = Math.random();
      size[i] = 0.6 + Math.random() * 2.2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: pointVert,
        fragmentShader: pointFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uBurst: { value: 0 },
          uPixel: { value: gl.getPixelRatio() },
          uCyan: { value: CYAN },
          uSun: { value: SUN },
        },
      }),
    [gl],
  );

  useFrame((_, dt) => {
    mat.uniforms.uTime.value += dt;
    mat.uniforms.uBurst.value = easeOut(seg(progress.p, 0.32, 1.0));
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

/** Star streaks along the tunnel the camera flies down. */
function Tunnel({ progress, count }: { progress: PortalProgress; count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.6 + Math.random() * 7;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = -40 + Math.random() * 46;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);

  useFrame(() => {
    const m = ref.current?.material as THREE.PointsMaterial | undefined;
    if (m) m.opacity = 0.25 + seg(progress.p, 0.5, 0.9) * 0.75;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color={"#9fdcff"} size={0.05} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Portal({ progress, lite }: { progress: PortalProgress; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const iris = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const irisMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: irisVert,
        fragmentShader: irisFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uOpen: { value: 0 }, uTime: { value: 0 }, uCyan: { value: CYAN }, uSun: { value: SUN } },
      }),
    [],
  );

  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: irisVert,
        fragmentShader: /* glsl */ `
          uniform float uA; uniform vec3 uC; varying vec2 vUv;
          void main(){ float r = length(vUv-0.5)*2.0; float a = smoothstep(1.0,0.55,r)*smoothstep(0.35,0.62,r); gl_FragColor = vec4(uC, a*uA); }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uA: { value: 0 }, uC: { value: CYAN } },
      }),
    [],
  );

  useFrame((state, dt) => {
    const p = progress.p;
    const arrive = easeOut(seg(p, 0, 0.3));
    const open = easeInOut(seg(p, 0.28, 0.58));
    const fly = easeInOut(seg(p, 0.55, 1));

    if (group.current) {
      group.current.scale.setScalar(0.2 + arrive * 0.8);
      group.current.rotation.x = (1 - arrive) * 1.1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.03 * (1 - fly);
      group.current.rotation.y = (1 - arrive) * -0.8;
    }
    if (ring.current) ring.current.rotation.z += dt * (0.4 + open * 2.4);
    if (ring2.current) {
      ring2.current.rotation.z -= dt * (0.6 + open * 1.8);
      ring2.current.rotation.x = 0.35 * (1 - open);
    }
    irisMat.uniforms.uOpen.value = open * 1.02;
    irisMat.uniforms.uTime.value += dt;
    haloMat.uniforms.uA.value = arrive * 0.9;
    if (iris.current) iris.current.visible = open > 0.001;
    if (halo.current) halo.current.scale.setScalar(1 + open * 0.25);

    camera.position.z = 9 - fly * 13;
    camera.position.x = Math.sin(fly * Math.PI) * 0.15;
    (camera as THREE.PerspectiveCamera).fov = 50 + fly * 28;
    camera.updateProjectionMatrix();
  });

  return (
    <>
      <group ref={group}>
        <mesh ref={halo}>
          <planeGeometry args={[7.6, 7.6]} />
          <primitive object={haloMat} attach="material" />
        </mesh>
        <mesh ref={ring}>
          <torusGeometry args={[2.2, 0.075, 24, lite ? 120 : 220]} />
          <meshBasicMaterial color={CYAN} toneMapped={false} />
        </mesh>
        <mesh ref={ring2}>
          <torusGeometry args={[2.45, 0.018, 12, lite ? 120 : 220, Math.PI * 1.55]} />
          <meshBasicMaterial color={SIGNAL} toneMapped={false} transparent opacity={0.9} />
        </mesh>
        <mesh ref={iris} position={[0, 0, -0.01]}>
          <circleGeometry args={[2.2, 96]} />
          <primitive object={irisMat} attach="material" />
        </mesh>
      </group>
      <Burst progress={progress} count={lite ? 700 : 2200} />
      <Tunnel progress={progress} count={lite ? 500 : 1400} />
    </>
  );
}

export default function PortalScene({ progress, lite }: { progress: PortalProgress; lite: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 50, near: 0.05, far: 100 }}
      dpr={lite ? [1, 1.5] : [1, 2]}
      gl={{ antialias: !lite, alpha: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Portal progress={progress} lite={lite} />
    </Canvas>
  );
}
