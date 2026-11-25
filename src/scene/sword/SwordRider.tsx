import { Suspense } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { Rider3D } from './Rider3D'
import { RiderStandee } from './RiderStandee'

/** 飞剑上的剑主化身统一挂载点：踏剑第一人称 / 剑尖视角时自动隐藏，防止遮挡视线 */
export function SwordRider() {
  const riderMode = useGameStore((s) => s.riderMode)
  const mode = useGameStore((s) => s.mode)
  const viewMode = useGameStore((s) => s.viewMode)

  if (riderMode === 'none') return null
  if (mode === 'free' && (viewMode === 'first' || viewMode === 'nose')) return null

  return (
    <Suspense fallback={null}>
      {riderMode === '3d' ? <Rider3D /> : <RiderStandee />}
    </Suspense>
  )
}
