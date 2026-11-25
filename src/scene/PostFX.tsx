import { Bloom, EffectComposer, Vignette, SMAA } from '@react-three/postprocessing'

/**
 * 后期管线：
 * - Bloom：阈值提高到 1.45，避免天空与云海过曝泛白，仅让飞剑符文、灯笼、灵气粒子散发精致仙气辉光
 * - Vignette：柔和电影暗角
 * - SMAA：抗锯齿
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.62} luminanceThreshold={1.45} luminanceSmoothing={0.25} radius={0.55} />
      <Vignette eskil={false} offset={0.28} darkness={0.48} />
      <SMAA />
    </EffectComposer>
  )
}
