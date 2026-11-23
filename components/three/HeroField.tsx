"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * After the flight through the portal, the ring is behind you: a slow particle ring
 * that leans toward the pointer and parts around it.
 */

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;
  uniform vec2 uMouse;
  uniform float uMouseOn;
  uniform float uIn;
  attribute float aSeed;
  attribute float aSize;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vec3 p = position;
    float a = uTime * (0.04 + aSeed * 0.05);
    float c = cos(a), s = sin(a);
    p.xy = mat2(c, -s, s, c) * p.xy;
    p.z += sin(uTime * 0.7 + aSeed * 50.0) * 0.12;
    p *= mix(1.6, 1.0, uIn);

    vec4 world = modelMatrix * vec4(p, 1.0);
    vec2 d = world.xy - uMouse;
    float dist = length(d);
    float push = smoothstep(1.6, 0.0, dist) * uMouseOn;
    world.xy += normalize(d + 0.0001) * push * 0.7;
    world.z += push * 0.6;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixel * (13.0 / -mv.z);
    vSeed = aSeed;
    vDepth = clamp((mv.z + 14.0) / 8.0, 0.0, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform vec3 uCyan;
  uniform vec3 uSun;
  uniform vec3 uBlue;
  uniform float uIn;
  varying float vSeed;
  varying float vDepth;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    vec3 c = mix(uBlue, uCyan, smoothstep(0.2, 0.7, vSeed));
    c = mix(c, uSun, step(0.93, vSeed));
    gl_FragColor = vec4(c, a * (0.35 + 0.65 * vDepth) * uIn);
  }
`;

function Ring({ count, interactive }: { count: number; interactive: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { gl, camera, pointer } = useThree();
  const target = useRef(new THREE.Vector2(0, 0));
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ring = i < count * 0.82;
      const a = Math.random() * Math.PI * 2;
      if (ring) {
        // gaussian-ish spread around a ring of radius 3.4
        const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 0.55;
        const r = 3.4 + spread;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.9 * (1 - Math.abs(spread));
      } else {
        const r = 1 + Math.random() * 9;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r * 0.7;
        pos[i * 3 + 2] = -4 + Math.random() * 6;
      }
      seed[i] = Math.random();
      size[i] = ring ? 0.8 + Math.random() * 1.8 : 0.5 + Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, [count]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixel: { value: gl.getPixelRatio() },
          uMouse: { value: new THREE.Vector2(99, 99) },
          uMouseOn: { value: 0 },
          uIn: { value: 0 },
          uCyan: { value: new THREE.Color("#2bb8ff") },
          uSun: { value: new THREE.Color("#ffd166") },
          uBlue: { value: new THREE.Color("#1f5cdc") },
        },
      }),
    [gl],
  );

  useFrame((_, dt) => {
    const u = mat.uniforms;
    u.uTime.value += dt;
    u.uIn.value = Math.min(1, u.uIn.value + dt * 0.6);
    target.current.lerp(pointer, 0.05);
    if (group.current) {
      group.current.rotation.x = -0.35 + target.current.y * 0.25;
      group.current.rotation.y = 0.5 + target.current.x * 0.35;
    }
    if (interactive) {
      ray.setFromCamera(pointer, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        (u.uMouse.value as THREE.Vector2).lerp(new THREE.Vector2(hit.x, hit.y), 0.2);
        u.uMouseOn.value = Math.min(1, u.uMouseOn.value + dt * 2);
      }
    }
  });

  const { size } = useThree();
  const narrow = size.width < 768;

  return (
    <group ref={group} position={narrow ? [0, 1.2, -3] : [2.4, 0, 0]}>
      <points geometry={geo} material={mat} frustumCulled={false} />
    </group>
  );
}

export default function HeroField({ lite }: { lite: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pause rendering when the hero is off screen.
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 9], fov: 45 }}
        dpr={lite ? [1, 1.25] : [1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        aria-hidden="true"
      >
        <Ring count={lite ? 2600 : 7000} interactive={!lite} />
      </Canvas>
    </div>
  );
}
