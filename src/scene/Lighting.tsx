import { useMemo } from 'react'
import * as THREE from 'three'
import { WEATHER_PRESETS } from '../config/theme'
import { useGameStore } from '../store/useGameStore'

/**
 * 光照与实时软阴影体系：
 * - 主平行光开启 2048x2048 PCFSoft 阴影，投射亭台飞檐、古树、石桥与仙山峭壁的真实阴影
 * - 随「晨曦 / 暮霞 / 月夜」时辰自动联动光照方向、色温与强度
 */
export function Lighting() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const w = WEATHER_PRESETS[timeOfDay]

  const sunPos = useMemo(() => {
    const v = new THREE.Vector3(...w.sunDir).normalize().multiplyScalar(140)
    return [v.x, v.y, v.z] as [number, number, number]
  }, [w.sunDir])

  return (
    <>
      <hemisphereLight args={[w.hemiSky, w.hemiGround, w.hemiIntensity]} />
      <directionalLight
        position={sunPos}
        intensity={w.sunIntensity}
        color={w.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={420}
      />
      <directionalLight position={[-sunPos[0], 30, -sunPos[2]]} intensity={w.fillIntensity} color={w.fillColor} />
    </>
  )
}
