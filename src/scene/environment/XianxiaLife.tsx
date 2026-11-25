import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../../config/theme'
import { ISLANDS, topYLocal } from './islandData'

interface CraneSpec {
  center: [number, number, number]
  rx: number
  rz: number
  yAmp: number
  speed: number
  phase: number
  flapSpeed: number
  scale: number
}

const CRANES: CraneSpec[] = [
  { center: [0, 18, -30], rx: 32, rz: 28, yAmp: 3.5, speed: 0.24, phase: 0.0, flapSpeed: 4.8, scale: 1.05 },
  { center: [0, 21, -30], rx: 36, rz: 31, yAmp: 4.0, speed: 0.22, phase: 0.55, flapSpeed: 5.1, scale: 0.95 },
  { center: [0, 16, -30], rx: 28, rz: 25, yAmp: 2.8, speed: 0.25, phase: 3.1, flapSpeed: 4.6, scale: 1.0 },
  { center: [-30, 20, -64], rx: 40, rz: 34, yAmp: 5.0, speed: 0.2, phase: 1.4, flapSpeed: 4.9, scale: 1.1 },
  { center: [-30, 23, -64], rx: 44, rz: 38, yAmp: 4.5, speed: 0.19, phase: 1.85, flapSpeed: 5.2, scale: 0.92 },
  { center: [48, 12, -85], rx: 38, rz: 30, yAmp: 4.2, speed: 0.23, phase: 4.2, flapSpeed: 4.7, scale: 1.0 },
  { center: [-15, 34, -175], rx: 48, rz: 42, yAmp: 6.0, speed: 0.18, phase: 2.5, flapSpeed: 4.5, scale: 1.15 },
  { center: [22, 16, 4], rx: 34, rz: 26, yAmp: 3.2, speed: 0.26, phase: 5.1, flapSpeed: 5.0, scale: 0.98 },
]

/** 单只振翅盘旋的丹顶仙鹤 */
function SpiritCrane({ spec }: { spec: CraneSpec }) {
  const root = useRef<THREE.Group>(null)
  const leftWing = useRef<THREE.Group>(null)
  const rightWing = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const a = t * spec.speed + spec.phase
    const x = spec.center[0] + Math.cos(a) * spec.rx
    const z = spec.center[2] + Math.sin(a) * spec.rz
    const y = spec.center[1] + Math.sin(a * 2.0) * spec.yAmp

    const dx = -Math.sin(a) * spec.rx * spec.speed
    const dz = Math.cos(a) * spec.rz * spec.speed
    const dy = Math.cos(a * 2.0) * spec.yAmp * 2.0 * spec.speed

    if (root.current) {
      root.current.position.set(x, y, z)
      // 鸟头朝向 -Z，沿切线飞行并微微侧倾
      root.current.rotation.set(Math.atan2(dy, Math.hypot(dx, dz)) * 0.6, Math.atan2(-dx, -dz), -0.22)
    }

    const flap = Math.sin(t * spec.flapSpeed + spec.phase * 3) * 0.52
    if (leftWing.current) leftWing.current.rotation.z = flap
    if (rightWing.current) rightWing.current.rotation.z = -flap
  })

  return (
    <group ref={root} scale={spec.scale}>
      {/* 洁白躯干 */}
      <mesh scale={[0.32, 0.26, 0.95]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#f5f3ec" roughness={0.65} />
      </mesh>
      {/* 修长颈部与头 */}
      <mesh position={[0, 0.14, -1.05]} rotation={[Math.PI / 2 - 0.12, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 0.95, 8]} />
        <meshStandardMaterial color="#f5f3ec" roughness={0.65} />
      </mesh>
      {/* 丹顶红冠 + 长喙 */}
      <mesh position={[0, 0.25, -1.52]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color="#c9382e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.2, -1.78]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.42, 6]} />
        <meshStandardMaterial color="#2a2420" roughness={0.5} />
      </mesh>
      {/* 墨黑尾羽 */}
      <mesh position={[0, 0.04, 1.05]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.42, 0.04, 0.7]} />
        <meshStandardMaterial color="#24292e" roughness={0.8} />
      </mesh>
      {/* 左翼（白羽 + 墨黑翼尖） */}
      <group ref={leftWing} position={[-0.22, 0.05, -0.05]}>
        <mesh position={[-0.75, 0, 0]}>
          <boxGeometry args={[1.5, 0.04, 0.65]} />
          <meshStandardMaterial color="#faf8f2" roughness={0.6} />
        </mesh>
        <mesh position={[-1.65, -0.01, 0.08]} rotation={[0, 0.15, 0]}>
          <boxGeometry args={[0.62, 0.035, 0.5]} />
          <meshStandardMaterial color="#1f252b" roughness={0.8} />
        </mesh>
      </group>
      {/* 右翼 */}
      <group ref={rightWing} position={[0.22, 0.05, -0.05]}>
        <mesh position={[0.75, 0, 0]}>
          <boxGeometry args={[1.5, 0.04, 0.65]} />
          <meshStandardMaterial color="#faf8f2" roughness={0.6} />
        </mesh>
        <mesh position={[1.65, -0.01, 0.08]} rotation={[0, -0.15, 0]}>
          <boxGeometry args={[0.62, 0.035, 0.5]} />
          <meshStandardMaterial color="#1f252b" roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * 主峰护山灵气阵法：
 * 自定义 GLSL 程序化八卦/星芒阵纹光环，缓慢旋转并散发细腻青金灵光（月夜与暮霞下极美）
 */
function SpiritFormation() {
  const mainIsland = ISLANDS[0]
  const yBase = mainIsland.pos[1] + topYLocal(mainIsland, 0, 0) + 0.65

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(PALETTE.jade) },
          uColorB: { value: new THREE.Color(PALETTE.gold) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColorA, uColorB;
          varying vec2 vUv;

          void main() {
            vec2 p = vUv * 2.0 - 1.0;
            float r = length(p);
            if (r > 1.0) discard;
            float ang = atan(p.y, p.x);

            // 双层反向旋转阵纹
            float a1 = ang + uTime * 0.16;
            float a2 = ang - uTime * 0.24;

            // 外环与内环细线
            float ring1 = smoothstep(0.025, 0.004, abs(r - 0.94));
            float ring2 = smoothstep(0.018, 0.003, abs(r - 0.78));
            float ring3 = smoothstep(0.015, 0.003, abs(r - 0.52));

            // 八卦方位刻度与符文段
            float ticks = smoothstep(0.025, 0.006, abs(r - 0.86)) * step(0.18, sin(a1 * 8.0));
            float runes = smoothstep(0.032, 0.008, abs(r - 0.65)) * step(0.45, sin(a2 * 24.0));

            // 六芒星几何线
            float hex = abs(cos(a1 * 3.0));
            float star = smoothstep(0.02, 0.004, abs(r - (0.44 + 0.08 * hex)));

            float mask = clamp(ring1 + ring2 * 0.85 + ring3 * 0.7 + ticks * 0.9 + runes * 0.75 + star * 0.65, 0.0, 1.0);
            float pulse = 0.78 + 0.22 * sin(uTime * 1.8);
            vec3 col = mix(uColorA, uColorB, smoothstep(0.5, 0.95, r)) * (1.65 * pulse);
            gl_FragColor = vec4(col, mask * 0.75);
          }
        `,
      }),
    [],
  )

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <group position={[mainIsland.pos[0], yBase, mainIsland.pos[2]]}>
      {/* 主峰地面灵气大阵 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={4}>
        <planeGeometry args={[32, 32]} />
      </mesh>
      {/* 亭台上方悬浮小光环 */}
      <mesh position={[0, 10.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={4}>
        <planeGeometry args={[12, 12]} />
      </mesh>
    </group>
  )
}

/** 仙侠生态集合：盘旋仙鹤群 + 主峰护山灵阵 */
export function XianxiaLife() {
  return (
    <group>
      {CRANES.map((spec, i) => (
        <SpiritCrane key={i} spec={spec} />
      ))}
      <SpiritFormation />
    </group>
  )
}
