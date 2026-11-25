import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { PALETTE } from '../../config/theme'
import { useGameStore, type RiderPose, type RobeTheme } from '../../store/useGameStore'

const RIDER_URL = `${import.meta.env.BASE_URL}models/rider.glb`

const THEMES: Record<RobeTheme, { primary: string; accent: string; emissive: string; ribbonA: string; ribbonB: string }> = {
  white: {
    primary: '#eef2f5',
    accent: '#c8a660',
    emissive: '#38e8d0',
    ribbonA: '#5fe3d0',
    ribbonB: '#ffd27a',
  },
  jade: {
    primary: '#bfe8df',
    accent: '#2c7d78',
    emissive: '#38e8d0',
    ribbonA: '#38e8d0',
    ribbonB: '#f7b6c8',
  },
  dark: {
    primary: '#232a33',
    accent: '#a83328',
    emissive: '#ffbe55',
    ribbonA: '#d93829',
    ribbonB: '#ffd27a',
  },
}

/** 随风飘动的 3D 仙侠披帛飘带 */
function FlowingRibbon({
  position,
  color,
  phase = 0,
}: {
  position: [number, number, number]
  color: string
  phase?: number
}) {
  const segs = useRef<(THREE.Group | null)[]>([])
  const segLen = 0.34

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const freq = boosting ? 12.5 : 6.2
    const amp = boosting ? 0.24 : 0.16
    for (let i = 0; i < 4; i++) {
      const s = segs.current[i]
      if (!s) continue
      const p = t * freq - i * 0.8 + phase
      s.rotation.y = Math.sin(p) * amp * (1 + i * 0.22)
      s.rotation.x = Math.cos(p * 0.75) * amp * 0.5 + (boosting ? 0.04 : -0.1)
    }
  })

  return (
    <group position={position}>
      <group ref={(el) => { segs.current[0] = el }}>
        <mesh position={[0, 0, segLen * 0.5]}>
          <boxGeometry args={[0.1, 0.015, segLen]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.5} />
        </mesh>
        <group ref={(el) => { segs.current[1] = el }} position={[0, 0, segLen]}>
          <mesh position={[0, 0, segLen * 0.5]}>
            <boxGeometry args={[0.09, 0.014, segLen]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.5} />
          </mesh>
          <group ref={(el) => { segs.current[2] = el }} position={[0, 0, segLen]}>
            <mesh position={[0, 0, segLen * 0.5]}>
              <boxGeometry args={[0.075, 0.012, segLen]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} roughness={0.5} />
            </mesh>
            <group ref={(el) => { segs.current[3] = el }} position={[0, 0, segLen]}>
              <mesh position={[0, 0, segLen * 0.5]}>
                <boxGeometry args={[0.055, 0.01, segLen]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

/** 根据姿态选择最匹配的高精度骨骼动画名称 */
function pickClipName(names: string[], pose: RiderPose): string | null {
  if (!names.length) return null
  const lower = new Map(names.map((n) => [n.toLowerCase(), n]))
  const find = (...keys: string[]) => {
    for (const k of keys) {
      for (const [ln, orig] of lower) {
        if (ln.includes(k)) return orig
      }
    }
    return names[0]
  }
  switch (pose) {
    case 'charge':
      return find('run', 'walk', 'sneak', 'idle')
    case 'meditate':
      return find('sad', 'idle')
    case 'salute':
      return find('agree', 'wave', 'headshake', 'idle')
    default:
      return find('idle', 'walk')
  }
}

/**
 * 方案 B：高精度带完整人形骨骼动画的 3D 剑主模型（public/models/rider.glb）
 * - 支持白衣/青衣/玄衣三套玉质流光仙侠材质重绘 + 背后双 3D 动态飘带
 * - 支持 4 种姿势骨骼动画平滑切换 + 上传自拍/卡通头像挂接头部
 */
export function Rider3D() {
  const pose = useGameStore((s) => s.riderPose)
  const robeTheme = useGameStore((s) => s.robeTheme)
  const faceImageUrl = useGameStore((s) => s.faceImageUrl)
  const theme = THEMES[robeTheme]

  const rootRef = useRef<THREE.Group>(null)
  const modelWrapRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)

  const { scene, animations } = useGLTF(RIDER_URL)
  const cloned = useMemo(() => {
    const obj = cloneSkinned(scene)
    // Xbot.glb 原生高度约 1.78m、脚底在 y=0；直接缩放 1.15 避免 SkinnedMesh Box3 重复计算 Armature 0.01 缩放导致隐身
    obj.scale.setScalar(1.15)
    obj.position.set(0, 0, 0)
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        // 关键：SkinnedMesh 必须关闭视锥剔除，防止镜头靠近或旋转时模型被错误剔除消失
        mesh.frustumCulled = false
      }
    })
    return obj
  }, [scene])

  const { actions, names } = useAnimations(animations, cloned)

  // 根据仙袍主题重绘高精度模型材质（玉质流光 + 发光关节纹路）
  useEffect(() => {
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const isJoint = mesh.name.toLowerCase().includes('joint')
      const mat = new THREE.MeshStandardMaterial({
        color: isJoint ? theme.accent : theme.primary,
        emissive: isJoint ? theme.emissive : theme.primary,
        emissiveIntensity: isJoint ? 0.85 : 0.08,
        metalness: isJoint ? 0.72 : 0.32,
        roughness: isJoint ? 0.25 : 0.35,
      })
      mesh.material = mat
    })
  }, [cloned, theme])

  // 平滑切换骨骼动画
  useEffect(() => {
    const clip = pickClipName(names, pose)
    if (!clip) return
    const action = actions[clip]
    if (!action) return
    Object.values(actions).forEach((a) => {
      if (a && a !== action) a.fadeOut(0.35)
    })
    action.reset().fadeIn(0.35).play()
    action.timeScale = pose === 'charge' ? 1.15 : pose === 'meditate' ? 0.35 : 0.85
  }, [actions, names, pose])

  // 加载用户自定义头像贴图
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

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = 1 - Math.exp(-6.5 * dt)
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting

    if (rootRef.current) {
      const targetY =
        pose === 'meditate'
          ? 0.45 + Math.sin(t * 2.2) * 0.09
          : 0.06 + Math.sin(t * 2.2) * 0.015
      const targetPitch =
        pose === 'charge'
          ? boosting
            ? -0.36
            : -0.22
          : pose === 'meditate'
            ? 0
            : boosting
              ? -0.15
              : 0
      rootRef.current.position.y += (targetY - rootRef.current.position.y) * k
      rootRef.current.rotation.x += (targetPitch - rootRef.current.rotation.x) * k
    }

    if (haloRef.current) {
      haloRef.current.rotation.z = t * 1.1
    }
  })

  return (
    <group ref={rootRef} position={[0, 0.06, -0.35]}>
      {/* 脚下灵气托环 */}
      <mesh ref={haloRef} position={[0, pose === 'meditate' ? -0.16 : 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.52, 32]} />
        <meshBasicMaterial
          color={PALETTE.jade}
          transparent
          opacity={pose === 'meditate' ? 0.78 : 0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 高精度骨骼模型（旋转 Math.PI 使正面朝向飞剑前方 -Z） */}
      <group ref={modelWrapRef} rotation={[0, Math.PI, 0]}>
        <primitive object={cloned} />
      </group>

      {/* 若上传了自定义头像，清晰悬浮贴合在头部位置 */}
      {faceTex && (
        <mesh position={[0, 1.82, -0.14]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[0.19, 28]} />
          <meshBasicMaterial map={faceTex} transparent side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 背后双 3D 仙侠飘带 */}
      <FlowingRibbon position={[-0.22, 1.48, 0.16]} color={theme.ribbonA} phase={0} />
      <FlowingRibbon position={[0.22, 1.48, 0.16]} color={theme.ribbonB} phase={1.7} />
    </group>
  )
}
