import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { MODELS, type ModelSlotName } from '../../config/models'
import { useModelExists } from './modelAvailability'

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false }
  static getDerivedStateFromError() {
    return { err: true }
  }
  componentDidCatch(e: unknown) {
    console.warn('[ModelSlot] 模型加载失败，已回退到程序化版本：', e)
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children
  }
}

interface SlotProps {
  slot: ModelSlotName
  /** 模型不存在 / 加载中 / 出错时显示的程序化替代（自带定位） */
  fallback: ReactNode
  position?: [number, number, number]
  rotationY?: number
  scaleMul?: number
  /** 覆盖配置中的目标尺寸（桥梁用：跨度） */
  fitSize?: number
  /** 桥梁：模型长轴(+X)对齐 a→b，并按坡度倾斜 */
  between?: [THREE.Vector3, THREE.Vector3]
}

function Loaded({ slot, position = [0, 0, 0], rotationY = 0, scaleMul = 1, fitSize, between }: Omit<SlotProps, 'fallback'>) {
  const cfg = MODELS[slot]
  const { scene } = useGLTF(cfg.url)

  const obj = useMemo(() => {
    const root = scene.clone(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const c = box.getCenter(new THREE.Vector3())
    root.position.set(-c.x, -box.min.y, -c.z) // 底面落地、水平居中
    const wrap = new THREE.Group()
    wrap.add(root)
    const base = cfg.fit === 'height' ? size.y : cfg.fit === 'width' ? Math.max(size.x, size.z) : size.x
    wrap.scale.setScalar((fitSize ?? cfg.size) / Math.max(base, 1e-4))

    const boost = 'emissiveBoost' in cfg ? cfg.emissiveBoost : 0
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mt of mats as THREE.MeshStandardMaterial[]) {
        if (boost && mt.emissive && mt.emissive.getHex() !== 0 && !mt.userData.boosted) {
          mt.emissiveIntensity *= boost // 灯笼等自发光部分：>1 触发 Bloom 泛光
          mt.toneMapped = false
          mt.userData.boosted = true
        }
      }
    })
    return wrap
  }, [scene, cfg, fitSize])

  if (between) {
    const [a, b] = between
    const dx = b.x - a.x, dz = b.z - a.z
    const yaw = Math.atan2(-dz, dx)
    const pitch = Math.atan2(b.y - a.y, Math.hypot(dx, dz))
    const mid = a.clone().lerp(b, 0.5)
    return (
      <group position={mid} rotation={new THREE.Euler(0, yaw, pitch, 'YZX')}>
        <primitive object={obj} />
      </group>
    )
  }
  const off = 'offset' in cfg ? cfg.offset : [0, 0, 0]
  return (
    <group
      position={[position[0] + off[0], position[1] + off[1], position[2] + off[2]]}
      rotation={[0, rotationY + ('yaw' in cfg ? cfg.yaw : 0), 0]}
      scale={scaleMul}
    >
      <primitive object={obj} />
    </group>
  )
}

/**
 * 模型插槽：public/models/ 下存在对应 .glb 时加载并自动归一化（落地、居中、缩放到目标尺寸），
 * 否则无缝使用程序化 fallback。放入/移除模型文件即可切换，无需改代码。
 */
export function ModelSlot({ fallback, ...props }: SlotProps) {
  const exists = useModelExists(MODELS[props.slot].url)
  if (!exists) return <>{fallback}</>
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Loaded {...props} />
      </Suspense>
    </Boundary>
  )
}
