"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The studio host, built in 3D from simple shapes: dark hair and beard, black Mode Academy t-shirt,
 * dark trousers, black shoes. He walks while the page scrolls (a real walk cycle: hips, knees, arm swing,
 * bob) and points with his left arm at the card the page is showing, turning his body and head to it.
 *
 * `drive` is shared with the page: speed = how fast the page scrolls (0 when still),
 * target = the screen point (px) of the card to point at, or null.
 */
export type WalkerDrive = { speed: number; target: { x: number; y: number } | null; still: boolean };

const SKIN = "#e8b08c";
const SHIRT = "#161618";
const PANTS = "#2b2e33";
const SHOE = "#0c0c0e";
const HAIR = "#3a2417";
const BEARD = "#4a2e1d";

function shirtPrint() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = SHIRT;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#d9d9d6";
  g.textAlign = "center";
  g.font = "800 118px system-ui, Arial, sans-serif";
  g.fillText("MODE", 256, 150);
  g.font = "700 50px system-ui, Arial, sans-serif";
  g.fillText("ACADEMY", 256, 212);
  // the small M mark, top right
  g.font = "800 46px system-ui, Arial, sans-serif";
  g.fillText("M", 418, 56);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function Host({ drive }: { drive: React.RefObject<WalkerDrive> }) {
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.55 }),
      shirt: new THREE.MeshStandardMaterial({ color: SHIRT, roughness: 0.85 }),
      pants: new THREE.MeshStandardMaterial({ color: PANTS, roughness: 0.8 }),
      shoe: new THREE.MeshStandardMaterial({ color: SHOE, roughness: 0.35, metalness: 0.1 }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.7 }),
      beard: new THREE.MeshStandardMaterial({ color: BEARD, roughness: 0.9 }),
      white: new THREE.MeshStandardMaterial({ color: "#f6f3ee", roughness: 0.3 }),
      iris: new THREE.MeshStandardMaterial({ color: "#2c1d12", roughness: 0.2 }),
      lip: new THREE.MeshStandardMaterial({ color: "#7a3b2c", roughness: 0.5 }),
      print: new THREE.MeshStandardMaterial({ map: shirtPrint(), roughness: 0.85 }),
      shadow: new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.35, depthWrite: false }),
    }),
    [],
  );

  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null); // his left = screen right, the pointing arm
  const elbowL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const st = useRef({ phase: 0, walk: 0, point: 0, aim: 0.25, lift: 0, t: 0, lastTarget: -1 }).current;
  const { camera, size, gl } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const d = drive.current;
    const dt = Math.min(dtRaw, 0.05);
    st.t += dt;
    const damp = (a: number, b: number, k: number) => THREE.MathUtils.damp(a, b, k, dt);

    // walking: the cycle runs with the scroll speed, and fades to a stand when the page stops
    const sp = d.still ? 0 : Math.min(1, d.speed / 900);
    st.walk = damp(st.walk, sp > 0.02 ? 1 : 0, 6);
    st.phase += dt * (4.2 + sp * 4) * st.walk;
    const p = st.phase;
    const w = st.walk;

    // where to point: the angle from his shoulder to the card, in the screen plane
    let wantPoint = 0;
    if (d.target && armL.current) {
      armL.current.getWorldPosition(v);
      v.project(camera);
      const r = gl.domElement.getBoundingClientRect();
      const sx = r.left + ((v.x + 1) / 2) * size.width;
      const sy = r.top + ((1 - v.y) / 2) * size.height;
      const ang = Math.atan2(d.target.x - sx, d.target.y - sy); // 0 = straight down, π/2 = level to the right
      const key = Math.round(d.target.y / 40);
      // a new card: drop the arm a little, then point again, so each card gets its own gesture
      if (key !== st.lastTarget) { st.lastTarget = key; st.lift = 1; }
      st.aim = damp(st.aim, THREE.MathUtils.clamp(ang, 0.5, 2.5), 5);
      wantPoint = 1;
    }
    st.point = damp(st.point, wantPoint, 4);
    st.lift = damp(st.lift, 0, 3);
    const pt = st.point * (1 - st.lift * 0.45);

    if (root.current) {
      root.current.position.y = Math.abs(Math.cos(p)) * 0.035 * w;
      root.current.rotation.y = damp(root.current.rotation.y, 0.12 + st.point * 0.26, 4);
    }
    if (body.current) body.current.rotation.z = Math.sin(p) * 0.03 * w;
    if (torso.current) {
      torso.current.rotation.y = Math.sin(p) * 0.12 * w;
      torso.current.rotation.x = 0.04 * w;
      torso.current.scale.y = 1 + Math.sin(st.t * 2.2) * 0.008 * (1 - w); // breathing at rest
    }
    if (head.current) {
      head.current.rotation.y = -Math.sin(p) * 0.08 * w - st.point * 0.12;
      head.current.rotation.x = -0.05 + Math.sin(p * 2) * 0.02 * w + (st.point ? (st.aim - 1.57) * -0.25 : 0);
      head.current.rotation.z = Math.sin(st.t * 0.9) * 0.03;
    }

    // legs: thigh swings, knee bends on the way back
    const leg = (hip: THREE.Group | null, knee: THREE.Group | null, ph: number) => {
      if (!hip || !knee) return;
      hip.rotation.x = Math.sin(ph) * 0.5 * w;
      knee.rotation.x = Math.max(0, -Math.cos(ph)) * 0.9 * w + 0.03;
    };
    leg(hipL.current, kneeL.current, p);
    leg(hipR.current, kneeR.current, p + Math.PI);

    // right arm swings with the walk
    if (armR.current && elbowR.current) {
      armR.current.rotation.x = -Math.sin(p) * 0.45 * w;
      armR.current.rotation.z = -0.12;
      elbowR.current.rotation.x = -0.25 - Math.max(0, Math.sin(p)) * 0.35 * w;
    }
    // left arm: swings when walking with nothing to show, points at the card otherwise
    if (armL.current && elbowL.current) {
      const swingX = Math.sin(p) * 0.45 * w;
      armL.current.rotation.z = THREE.MathUtils.lerp(0.12, st.aim, pt);
      armL.current.rotation.x = THREE.MathUtils.lerp(swingX, -0.35 + Math.sin(st.t * 3) * 0.04, st.point);
      elbowL.current.rotation.x = THREE.MathUtils.lerp(-0.25 - Math.max(0, -Math.sin(p)) * 0.35 * w, -0.08, st.point);
    }
    if (shadow.current) shadow.current.scale.setScalar(1 - Math.abs(Math.cos(p)) * 0.08 * w);
  });

  // a limb segment: capsule hanging down from its joint
  const Seg = ({ r, len, y, mat }: { r: number; len: number; y: number; mat: THREE.Material }) => (
    <mesh position={[0, y, 0]} material={mat}>
      <capsuleGeometry args={[r, len, 6, 14]} />
    </mesh>
  );

  const arm = (side: 1 | -1, armRef: React.RefObject<THREE.Group | null>, elbowRef: React.RefObject<THREE.Group | null>, pointing: boolean) => (
    <group ref={armRef} position={[0.255 * side, 1.415, 0]}>
      <mesh position={[0, -0.06, 0]} material={mats.shirt}>
        <cylinderGeometry args={[0.078, 0.07, 0.17, 18]} />
      </mesh>
      <Seg r={0.052} len={0.16} y={-0.19} mat={mats.skin} />
      <group ref={elbowRef} position={[0, -0.3, 0]}>
        <Seg r={0.046} len={0.18} y={-0.12} mat={mats.skin} />
        <group position={[0, -0.27, 0.005]}>
          <mesh material={mats.skin} scale={[1, 1.15, 0.7]}>
            <sphereGeometry args={[0.05, 16, 12]} />
          </mesh>
          {pointing ? (
            <mesh position={[0.004, -0.075, 0.012]} material={mats.skin}>
              <capsuleGeometry args={[0.013, 0.06, 4, 8]} />
            </mesh>
          ) : (
            <mesh position={[0, -0.045, 0.012]} material={mats.skin} scale={[1, 0.8, 0.8]}>
              <sphereGeometry args={[0.034, 12, 10]} />
            </mesh>
          )}
          {/* thumb */}
          <mesh position={[-0.032 * side, -0.02, 0.025]} rotation={[0.3, 0, 0.5 * side]} material={mats.skin}>
            <capsuleGeometry args={[0.012, 0.03, 4, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  const leg = (side: 1 | -1, hipRef: React.RefObject<THREE.Group | null>, kneeRef: React.RefObject<THREE.Group | null>) => (
    <group ref={hipRef} position={[0.1 * side, 0.95, 0]}>
      <Seg r={0.088} len={0.28} y={-0.22} mat={mats.pants} />
      <group ref={kneeRef} position={[0, -0.45, 0]}>
        <Seg r={0.074} len={0.3} y={-0.2} mat={mats.pants} />
        <group position={[0, -0.44, 0]}>
          <mesh position={[0, -0.005, 0.05]} rotation={[Math.PI / 2, 0, 0]} material={mats.shoe} scale={[1.05, 1, 0.75]}>
            <capsuleGeometry args={[0.055, 0.12, 6, 14]} />
          </mesh>
        </group>
      </group>
    </group>
  );

  return (
    <group ref={root}>
      <mesh ref={shadow} position={[0, 0.002, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={mats.shadow}>
        <circleGeometry args={[0.3, 32]} />
      </mesh>
      <group ref={body}>
        {leg(1, hipL, kneeL)}
        {leg(-1, hipR, kneeR)}
        {/* hips */}
        <mesh position={[0, 0.98, 0]} scale={[1, 1, 0.7]} material={mats.pants}>
          <cylinderGeometry args={[0.18, 0.17, 0.16, 24]} />
        </mesh>
        <group ref={torso} position={[0, 0.98, 0]}>
          <group position={[0, -0.98, 0]}>
            {/* the t-shirt */}
            <group scale={[1, 1, 0.66]}>
              <mesh position={[0, 1.24, 0]} material={mats.shirt}>
                <cylinderGeometry args={[0.225, 0.195, 0.46, 32]} />
              </mesh>
              <mesh position={[0, 1.31, 0]} material={mats.print}>
                <cylinderGeometry args={[0.2265, 0.2215, 0.17, 32, 1, true, -0.62, 1.24]} />
              </mesh>
              <mesh position={[0, 1.465, 0]} scale={[1, 0.35, 1]} material={mats.shirt}>
                <sphereGeometry args={[0.225, 32, 16]} />
              </mesh>
            </group>
            {arm(1, armL, elbowL, true)}
            {arm(-1, armR, elbowR, false)}
            {/* neck and head */}
            <mesh position={[0, 1.53, 0]} material={mats.skin}>
              <cylinderGeometry args={[0.052, 0.058, 0.12, 16]} />
            </mesh>
            <group ref={head} position={[0, 1.6, 0]}>
              <group position={[0, 0.115, 0]} scale={1.22}>
                <mesh material={mats.skin} scale={[0.94, 1.08, 0.98]}>
                  <sphereGeometry args={[0.15, 32, 24]} />
                </mesh>
                {/* hair: a cap and a quiff */}
                <mesh material={mats.hair} position={[0, 0.012, -0.008]} scale={[0.97, 1.08, 1.02]}>
                  <sphereGeometry args={[0.156, 32, 16, 0, Math.PI * 2, 0, 1.2]} />
                </mesh>
                <mesh material={mats.hair} position={[0.01, 0.135, 0.05]} rotation={[0.5, 0, -0.2]} scale={[1.25, 0.5, 0.9]}>
                  <sphereGeometry args={[0.075, 20, 12]} />
                </mesh>
                {/* beard along the jaw */}
                <mesh material={mats.beard} position={[0, -0.004, 0.004]} scale={[0.96, 1.1, 1]}>
                  <sphereGeometry args={[0.152, 32, 16, Math.PI / 2 - 1.5, 3.0, 2.02, 0.78]} />
                </mesh>
                {/* ears */}
                {[1, -1].map((s) => (
                  <mesh key={s} material={mats.skin} position={[0.142 * s, -0.005, -0.01]} scale={[0.4, 1, 0.7]}>
                    <sphereGeometry args={[0.04, 12, 10]} />
                  </mesh>
                ))}
                {/* eyes, brows, nose, smile */}
                {[1, -1].map((s) => (
                  <group key={s} position={[0.05 * s, 0.02, 0.128]}>
                    <mesh material={mats.white} scale={[1, 1.1, 0.6]}>
                      <sphereGeometry args={[0.026, 16, 12]} />
                    </mesh>
                    <mesh material={mats.iris} position={[0, -0.002, 0.014]}>
                      <sphereGeometry args={[0.014, 12, 10]} />
                    </mesh>
                    <mesh material={mats.hair} position={[0, 0.045, 0.012]} rotation={[0, 0, 0.1 * s]}>
                      <boxGeometry args={[0.055, 0.012, 0.012]} />
                    </mesh>
                  </group>
                ))}
                <mesh material={mats.skin} position={[0, -0.025, 0.148]} scale={[0.9, 1, 0.9]}>
                  <sphereGeometry args={[0.024, 12, 10]} />
                </mesh>
                <mesh material={mats.beard} position={[0, -0.048, 0.142]} scale={[1, 0.32, 0.45]}>
                  <sphereGeometry args={[0.045, 16, 10]} />
                </mesh>
                <mesh material={mats.lip} position={[0, -0.07, 0.137]} rotation={[0.15, 0, Math.PI]}>
                  <torusGeometry args={[0.034, 0.007, 8, 18, Math.PI]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default function Walker3D({ drive, active }: { drive: React.RefObject<WalkerDrive>; active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 1.02, 5.6], fov: 22 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.98, 0)}
    >
      <hemisphereLight args={["#dfe9ff", "#0a1733", 1.1]} />
      <directionalLight position={[1.5, 3, 5]} intensity={2.6} color="#fff4e6" />
      <pointLight position={[0.2, 1.9, 1.6]} intensity={2.2} distance={4} color="#ffe9d6" />
      <directionalLight position={[-3, 2, -2]} intensity={1.6} color="#2bb8ff" />
      <directionalLight position={[3, 1, -3]} intensity={0.9} color="#ffd166" />
      <group position={[-0.28, 0, 0]}>
        <Host drive={drive} />
      </group>
    </Canvas>
  );
}
