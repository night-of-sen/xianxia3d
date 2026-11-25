import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { ENV_ROT_Y, WEATHER_PRESETS } from '../config/theme'
import { useGameStore } from '../store/useGameStore'
import { Lighting } from './Lighting'
import { PostFX } from './PostFX'
import { InkBackdrop } from './environment/InkBackdrop'
import { FloatingIslands } from './environment/FloatingIslands'
import { IslandDecor } from './environment/IslandDecor'
import { GodRays, MistRibbons, Spirits } from './environment/Atmosphere'
import { CloudSea } from './environment/CloudSea'
import { VolumetricMist } from './environment/VolumetricMist'
import { XianxiaLife } from './environment/XianxiaLife'
import { FlyingSword } from './sword/FlyingSword'

/** 根据当前时辰动态同步渲染器曝光值 */
function WeatherSync() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.toneMappingExposure = WEATHER_PRESETS[timeOfDay].exposure
  }, [gl, timeOfDay])
  return null
}

/** 3D 主场景容器 */
export function XianxiaScene() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const w = WEATHER_PRESETS[timeOfDay]

  return (
    <Canvas
      id="xianxia-canvas"
      shadows="soft"
      dpr={[1, 2]}
      camera={{ position: [0, 14, 54], fov: 55, near: 0.1, far: 3500 }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: w.exposure,
        outputColorSpace: THREE.SRGBColorSpace,
        preserveDrawingBuffer: true,
      }}
    >
      <color attach="background" args={[w.bg]} />
      <fogExp2 attach="fog" args={[w.fog, w.fogDensity]} />
      <WeatherSync />

      {/* HDR 环境光：晨曦时作为天空背景，暮霞/月夜时仅提供环境反射，由 StylizedSky 接管天穹 */}
      <Suspense fallback={null}>
        <Environment
          files="/hdri/dawn_sky.hdr"
          background={w.useHdrBg}
          backgroundIntensity={w.envBgIntensity}
          backgroundRotation={[0, ENV_ROT_Y, 0]}
          environmentRotation={[0, ENV_ROT_Y, 0]}
          environmentIntensity={w.envIntensity}
        />
      </Suspense>

      <Lighting />
      <InkBackdrop />
      <Suspense fallback={null}>
        <FloatingIslands />
      </Suspense>
      <IslandDecor />
      <CloudSea />
      <VolumetricMist />
      <MistRibbons />
      {timeOfDay !== 'night' && <GodRays />}
      <XianxiaLife />
      <Spirits />
      <FlyingSword />

      <PostFX />
    </Canvas>
  )
}
