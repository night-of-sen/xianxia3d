import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '../../config/theme'
import { useGameStore } from '../../store/useGameStore'

/** 2.5D 立绘背后的 3D 动态仙气飘带（消除侧面单薄感） */
function StandeeRibbon({ side, color }: { side: -1 | 1; color: string }) {
  const segs = useRef<(THREE.Group | null)[]>([])
  const segLen = 0.34

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const freq = boosting ? 13 : 6.5
    const amp = boosting ? 0.24 : 0.18
    for (let i = 0; i < 4; i++) {
      const s = segs.current[i]
      if (!s) continue
      const p = t * freq - i * 0.8 + (side > 0 ? 1.5 : 0)
      s.rotation.y = Math.sin(p) * amp * (1 + i * 0.2) + side * 0.08
      s.rotation.x = Math.cos(p * 0.7) * amp * 0.45
    }
  })

  return (
    <group position={[side * 0.28, 1.05, 0.12]}>
      <group ref={(el) => { segs.current[0] = el }}>
        <mesh position={[0, 0, segLen * 0.5]}>
          <boxGeometry args={[0.09, 0.014, segLen]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.5} />
        </mesh>
        <group ref={(el) => { segs.current[1] = el }} position={[0, 0, segLen]}>
          <mesh position={[0, 0, segLen * 0.5]}>
            <boxGeometry args={[0.08, 0.012, segLen]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.5} />
          </mesh>
          <group ref={(el) => { segs.current[2] = el }} position={[0, 0, segLen]}>
            <mesh position={[0, 0, segLen * 0.5]}>
              <boxGeometry args={[0.065, 0.01, segLen]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.75} roughness={0.5} />
            </mesh>
            <group ref={(el) => { segs.current[3] = el }} position={[0, 0, segLen]}>
              <mesh position={[0, 0, segLen * 0.5]}>
                <boxGeometry args={[0.05, 0.01, segLen]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} toneMapped={false} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

function createDefaultStandeeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 480
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 320, 480)

  const grad = ctx.createLinearGradient(0, 30, 0, 460)
  grad.addColorStop(0, 'rgba(95, 227, 208, 0.85)')
  grad.addColorStop(0.6, 'rgba(42, 74, 86, 0.82)')
  grad.addColorStop(1, 'rgba(255, 210, 122, 0.88)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(40, 40, 240, 410, 120)
  ctx.fill()

  ctx.strokeStyle = '#ffd27a'
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.fillStyle = '#f8f2e0'
  ctx.font = 'bold 34px serif'
  ctx.textAlign = 'center'
  ctx.fillText('上传人像', 160, 225)
  ctx.font = '20px serif'
  ctx.fillStyle = '#d7f7f0'
  ctx.fillText('AI 智能精准抠图', 160, 272)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * 方案 A：清透 2.5D 灵影立绘
 * - 采用不受逆光黑脸影响的 meshBasicMaterial 还原照片真实鲜艳原色
 * - 配合 MediaPipe AI 语义人像抠图 + 脚下灵气光环 + 背后双 3D 飘带
 */
export function RiderStandee() {
  const standeeImageUrl = useGameStore((s) => s.standeeImageUrl)
  const standeeAspect = useGameStore((s) => s.standeeAspect)
  const standeeScale = useGameStore((s) => s.standeeScale)
  const pose = useGameStore((s) => s.riderPose)
  const swordTheme = useGameStore((s) => s.swordTheme)

  const groupRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const defaultTex = useMemo(() => createDefaultStandeeTexture(), [])
  const [userTex, setUserTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!standeeImageUrl) {
      setUserTex(null)
      return
    }
    const loader = new THREE.TextureLoader()
    let alive = true
    loader.load(standeeImageUrl, (tex) => {
      if (!alive) {
        tex.dispose()
        return
      }
      tex.colorSpace = THREE.SRGBColorSpace
      setUserTex((prev) => {
        prev?.dispose()
        return tex
      })
    })
    return () => {
      alive = false
    }
  }, [standeeImageUrl])

  useEffect(() => {
    return () => {
      defaultTex.dispose()
    }
  }, [defaultTex])

  const tex = userTex ?? defaultTex
  const height = 2.15 * standeeScale
  const width = Math.min(2.6, Math.max(0.75, height * (userTex ? standeeAspect : 0.66)))
  const accentColor = swordTheme === 'jade' ? PALETTE.jade : PALETTE.gold

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const k = 1 - Math.exp(-7 * dt)
    const t = clock.elapsedTime
    const boosting = useGameStore.getState().isBoosting
    const g = groupRef.current
    if (!g) return

    let targetY = 0.08 + Math.sin(t * 2.4) * 0.025
    let targetPitch = boosting ? -0.22 : -0.04
    let targetRoll = 0
    let targetScaleY = 1

    if (pose === 'charge') {
      targetPitch = boosting ? -0.45 : -0.28
      targetY = 0.04
    } else if (pose === 'meditate') {
      targetY = 0.48 + Math.sin(t * 2.2) * 0.09
      targetPitch = 0
      targetScaleY = 0.88
    } else if (pose === 'salute') {
      targetRoll = Math.sin(t * 4.5) * 0.16
      targetY = 0.1 + Math.abs(Math.sin(t * 4.5)) * 0.12
      targetPitch = Math.cos(t * 2.25) * 0.06
    }

    g.position.y += (targetY - g.position.y) * k
    g.rotation.x += (targetPitch - g.rotation.x) * k
    g.rotation.z += (targetRoll - g.rotation.z) * k
    g.scale.y += (targetScaleY - g.scale.y) * k

    if (haloRef.current) haloRef.current.rotation.z = t * 1.1
  })

  return (
    <group ref={groupRef} position={[0, 0.08, -0.35]}>
      {/* 脚下灵气托环 */}
      <mesh
        ref={haloRef}
        position={[0, pose === 'meditate' ? -0.14 : 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.36, 0.48, 32]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={pose === 'meditate' ? 0.75 : 0.35}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 正反双面清透原色立绘（不受逆光发黑影响，关闭 toneMapped 保持鲜明） */}
      <mesh position={[0, height / 2, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.08} side={THREE.DoubleSide} />
      </mesh>

      {/* 背后两条 3D 动态飘动仙气飘带 */}
      <StandeeRibbon side={-1} color={accentColor} />
      <StandeeRibbon side={1} color={swordTheme === 'jade' ? '#d93829' : PALETTE.jade} />
    </group>
  )
}
