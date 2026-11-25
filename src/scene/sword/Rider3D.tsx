import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../../config/theme'
import { useGameStore, type RiderPose, type RobeTheme } from '../../store/useGameStore'

const ROBES: Record<RobeTheme, { main: string; trim: string; sash: string; hair: string; crown: string }> = {
  white: { main: '#eae6dc', trim: '#538a9e', sash: '#d9b15f', hair: '#1d1f24', crown: '#f0c66c' },
  jade: { main: '#c9e8e0', trim: '#2c7a78', sash: '#f2b86b', hair: '#1c1d22', crown: '#e6f7f4' },
  dark: { main: '#1f242c', trim: '#8c2b22', sash: '#d9a441', hair: '#14161a', crown: '#e8b954' },
}

interface PoseTarget {
  rootY: number
  torsoPitch: number
  torsoYaw: number
  lArmX: number
  lArmZ: number
  rArmX: number
  rArmZ: number
  lLegX: number
  lLegZ: number
  rLegX: number
  rLegZ: number
  skirtScaleY: number
}

const POSES: Record<RiderPose, PoseTarget> = {
  // 负手傲立：挺拔直立，双手负于身后
  stand: {
    rootY: 0.08,
    torsoPitch: 0.04,
    torsoYaw: 0,
    lArmX: 0.42,
    lArmZ: 0.22,
    rArmX: 0.42,
    rArmZ: -0.22,
    lLegX: 0,
    lLegZ: 0.06,
    rLegX: 0,
    rLegZ: -0.06,
    skirtScaleY: 1,
  },
  // 御剑前冲：前倾压低重心，右手前指剑诀，左手后展平衡
  charge: {
    rootY: 0.02,
    torsoPitch: -0.34,
    torsoYaw: -0.18,
    lArmX: 0.72,
    lArmZ: 0.52,
    rArmX: -1.18,
    rArmZ: -0.16,
    lLegX: 0.28,
    lLegZ: 0.14,
    rLegX: -0.22,
    rLegZ: -0.14,
    skirtScaleY: 0.94,
  },
  // 盘膝打坐：悬浮于飞剑上方，双腿盘坐，双手丹田结印
  meditate: {
    rootY: 0.56,
    torsoPitch: 0,
    torsoYaw: 0,
    lArmX: -0.58,
    lArmZ: -0.38,
    rArmX: -0.58,
    rArmZ: 0.38,
    lLegX: -1.35,
    lLegZ: 0.65,
    rLegX: -1.35,
    rLegZ: -0.65,
    skirtScaleY: 0.62,
  },
  // 挥袖迎风：一手潇洒侧展广袖，一手胸前掐诀
  salute: {
    rootY: 0.12,
    torsoPitch: 0.08,
    torsoYaw: 0.22,
    lArmX: -0.45,
    lArmZ: 1.25,
    rArmX: -0.92,
    rArmZ: 0.35,
    lLegX: -0.08,
    lLegZ: 0.1,
    rLegX: 0.1,
    rLegZ: -0.1,
    skirtScaleY: 1,
  },
}

/** 随风飘动的 3D 仙侠发带 / 披帛 */
function FlowingRibbon({
  position,
  color,
  length = 1.1,
  width = 0.09,
  phase = 0,
}: {
  position: [number, number, number]
  color: string
  length?: number
  width?: number
  phase?: number
}) {
  const segs = useRef<(THREE.Group | null)[]>([])
  const segLen = length / 4

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const freq = boosting ? 12 : 6.2
    const amp = boosting ? 0.24 : 0.16
    for (let i = 0; i < 4; i++) {
      const s = segs.current[i]
      if (!s) continue
      const p = t * freq - i * 0.8 + phase
      s.rotation.y = Math.sin(p) * amp * (1 + i * 0.22)
      s.rotation.x = Math.cos(p * 0.75) * amp * 0.5 + (boosting ? 0.04 : -0.12)
    }
  })

  return (
    <group position={position}>
      <group ref={(el) => { segs.current[0] = el }}>
        <mesh position={[0, 0, segLen * 0.5]}>
          <boxGeometry args={[width, 0.015, segLen]} />
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
        <group ref={(el) => { segs.current[1] = el }} position={[0, 0, segLen]}>
          <mesh position={[0, 0, segLen * 0.5]}>
            <boxGeometry args={[width * 0.92, 0.014, segLen]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
          <group ref={(el) => { segs.current[2] = el }} position={[0, 0, segLen]}>
            <mesh position={[0, 0, segLen * 0.5]}>
              <boxGeometry args={[width * 0.82, 0.012, segLen]} />
              <meshStandardMaterial color={color} roughness={0.55} />
            </mesh>
            <group ref={(el) => { segs.current[3] = el }} position={[0, 0, segLen]}>
              <mesh position={[0, 0, segLen * 0.5]}>
                <boxGeometry args={[width * 0.65, 0.01, segLen]} />
                <meshStandardMaterial color={color} roughness={0.55} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/**
 * 方案 B：真 3D 骨骼古风剑仙（支持 4 套姿势平滑切换 + 3 套衣袍配色 + 上传自拍/卡通换头像）
 */
export function Rider3D() {
  const pose = useGameStore((s) => s.riderPose)
  const robeTheme = useGameStore((s) => s.robeTheme)
  const faceImageUrl = useGameStore((s) => s.faceImageUrl)
  const robe = ROBES[robeTheme]

  const rootRef = useRef<THREE.Group>(null)
  const torsoRef = useRef<THREE.Group>(null)
  const lArmRef = useRef<THREE.Group>(null)
  const rArmRef = useRef<THREE.Group>(null)
  const lLegRef = useRef<THREE.Group>(null)
  const rLegRef = useRef<THREE.Group>(null)
  const skirtRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  const [faceTex, setFaceTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!faceImageUrl) {
      setFaceTex(null)
      return
    }
    const loader = new THREE.TextureLoader()
    let alive = true
    loader.load(faceImageUrl, (tex) => {
      if (!alive) {
        tex.dispose()
        return
      }
      tex.colorSpace = THREE.SRGBColorSpace
      setFaceTex((prev) => {
        prev?.dispose()
        return tex
      })
    })
    return () => {
      alive = false
    }
  }, [faceImageUrl])

  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PALETTE.jade,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = 1 - Math.exp(-7 * dt)
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const target = POSES[pose]

    if (rootRef.current) {
      const floatOff = pose === 'meditate' ? Math.sin(t * 2.4) * 0.08 : Math.sin(t * 2.2) * 0.015
      rootRef.current.position.y += (target.rootY + floatOff - rootRef.current.position.y) * k
    }
    if (torsoRef.current) {
      const boostLean = boosting && pose !== 'meditate' ? -0.18 : 0
      torsoRef.current.rotation.x += (target.torsoPitch + boostLean - torsoRef.current.rotation.x) * k
      torsoRef.current.rotation.y += (target.torsoYaw - torsoRef.current.rotation.y) * k
    }
    if (lArmRef.current) {
      lArmRef.current.rotation.x += (target.lArmX - lArmRef.current.rotation.x) * k
      lArmRef.current.rotation.z += (target.lArmZ - lArmRef.current.rotation.z) * k
    }
    if (rArmRef.current) {
      rArmRef.current.rotation.x += (target.rArmX - rArmRef.current.rotation.x) * k
      rArmRef.current.rotation.z += (target.rArmZ - rArmRef.current.rotation.z) * k
    }
    if (lLegRef.current) {
      lLegRef.current.rotation.x += (target.lLegX - lLegRef.current.rotation.x) * k
      lLegRef.current.rotation.z += (target.lLegZ - lLegRef.current.rotation.z) * k
    }
    if (rLegRef.current) {
      rLegRef.current.rotation.x += (target.rLegX - rLegRef.current.rotation.x) * k
      rLegRef.current.rotation.z += (target.rLegZ - rLegRef.current.rotation.z) * k
    }
    if (skirtRef.current) {
      skirtRef.current.scale.y += (target.skirtScaleY - skirtRef.current.scale.y) * k
      skirtRef.current.rotation.x = boosting ? 0.25 + Math.sin(t * 14) * 0.05 : 0.08 + Math.sin(t * 5) * 0.03
    }
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 0.9
    }
  })

  return (
    <group ref={rootRef} position={[0, 0.08, -0.35]}>
      {/* 打坐专属脚下吐纳灵气光环 */}
      {pose === 'meditate' && (
        <mesh ref={haloRef} position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} material={haloMat}>
          <ringGeometry args={[0.42, 0.56, 32]} />
        </mesh>
      )}

      {/* 双腿 */}
      <group position={[0, 0.68, 0]}>
        <group ref={lLegRef} position={[-0.12, 0, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.06, 0.62, 8]} />
            <meshStandardMaterial color="#252830" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.64, -0.05]}>
            <boxGeometry args={[0.11, 0.09, 0.22]} />
            <meshStandardMaterial color="#181a1f" roughness={0.7} />
          </mesh>
        </group>
        <group ref={rLegRef} position={[0.12, 0, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.06, 0.62, 8]} />
            <meshStandardMaterial color="#252830" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.64, -0.05]}>
            <boxGeometry args={[0.11, 0.09, 0.22]} />
            <meshStandardMaterial color="#181a1f" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {/* 长袍下摆 */}
      <mesh ref={skirtRef} position={[0, 0.44, 0.02]} castShadow>
        <cylinderGeometry args={[0.19, 0.34, 0.78, 12]} />
        <meshStandardMaterial color={robe.main} roughness={0.72} />
      </mesh>

      {/* 上半身骨架（腰部以上可整体前倾/旋转） */}
      <group ref={torsoRef} position={[0, 0.76, 0]}>
        {/* 躯干仙袍 */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.17, 0.62, 12]} />
          <meshStandardMaterial color={robe.main} roughness={0.7} />
        </mesh>
        {/* 交领滚边 */}
        <mesh position={[0, 0.36, -0.14]} rotation={[0.15, 0, 0.32]}>
          <boxGeometry args={[0.07, 0.48, 0.08]} />
          <meshStandardMaterial color={robe.trim} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.36, -0.14]} rotation={[0.15, 0, -0.32]}>
          <boxGeometry args={[0.07, 0.48, 0.08]} />
          <meshStandardMaterial color={robe.trim} roughness={0.6} />
        </mesh>
        {/* 鎏金腰带 + 玉佩 */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.185, 0.19, 0.1, 12]} />
          <meshStandardMaterial color={robe.sash} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0.16, -0.02, -0.1]}>
          <octahedronGeometry args={[0.055, 0]} />
          <meshStandardMaterial color={PALETTE.jade} emissive={PALETTE.jade} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>

        {/* 左臂 + 广袖 */}
        <group ref={lArmRef} position={[-0.25, 0.54, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.125, 0.54, 8]} />
            <meshStandardMaterial color={robe.main} roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.125, 0.13, 0.06, 8]} />
            <meshStandardMaterial color={robe.trim} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#f0cdb0" roughness={0.65} />
          </mesh>
        </group>

        {/* 右臂 + 广袖 */}
        <group ref={rArmRef} position={[0.25, 0.54, 0]}>
          <mesh position={[0, -0.24, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.125, 0.54, 8]} />
            <meshStandardMaterial color={robe.main} roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <cylinderGeometry args={[0.125, 0.13, 0.06, 8]} />
            <meshStandardMaterial color={robe.trim} roughness={0.6} />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#f0cdb0" roughness={0.65} />
          </mesh>
        </group>

        {/* 背后飘动仙侠披帛（双飘带） */}
        <FlowingRibbon position={[-0.16, 0.55, 0.15]} color={robe.trim} length={1.25} width={0.11} phase={0} />
        <FlowingRibbon position={[0.16, 0.55, 0.15]} color={robe.sash} length={1.25} width={0.11} phase={1.7} />

        {/* 头部 + 发髻 + 玉冠 + 发带 + 可替换头像 */}
        <group position={[0, 0.78, 0]}>
          {/* 头颅 */}
          <mesh castShadow>
            <sphereGeometry args={[0.17, 16, 14]} />
            <meshStandardMaterial color="#f2d2b6" roughness={0.6} />
          </mesh>
          {/* 后脑乌发 */}
          <mesh position={[0, 0.02, 0.035]}>
            <sphereGeometry args={[0.172, 14, 12]} />
            <meshStandardMaterial color={robe.hair} roughness={0.8} />
          </mesh>
          {/* 顶髻 + 鎏金发冠 */}
          <mesh position={[0, 0.21, 0.02]}>
            <sphereGeometry args={[0.075, 12, 10]} />
            <meshStandardMaterial color={robe.hair} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.2, 0.02]}>
            <cylinderGeometry args={[0.065, 0.075, 0.08, 10]} />
            <meshStandardMaterial color={robe.crown} metalness={0.85} roughness={0.25} />
          </mesh>
          {/* 飘动发带 */}
          <FlowingRibbon position={[0, 0.16, 0.1]} color={robe.trim} length={0.85} width={0.055} phase={0.8} />

          {/* 若用户上传了自拍/卡通头像，贴合于面部前方 */}
          {faceTex && (
            <mesh position={[0, 0.0, -0.178]} rotation={[0, Math.PI, 0]}>
              <circleGeometry args={[0.185, 28]} />
              <meshStandardMaterial map={faceTex} transparent roughness={0.45} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  )
}
