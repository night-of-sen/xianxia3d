import { useEffect, useMemo } from 'react'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { ridged } from '../noise'
import { FollowCamera } from './CloudSea'
import { WEATHER_PRESETS, type TimeOfDay } from '../../config/theme'
import { useGameStore } from '../../store/useGameStore'

const RING_SPECS = [
  { r: 560, peak: 205, seed: 1 },
  { r: 720, peak: 245, seed: 2 },
  { r: 890, peak: 275, seed: 3 },
  { r: 1080, peak: 300, seed: 4 },
]

const SEG = 360

/** 残阳暮霞 / 月夜星海专属国风天穹（含落日绯霞或皓月清辉） */
function StylizedSky({ timeOfDay }: { timeOfDay: TimeOfDay }) {
  const w = WEATHER_PRESETS[timeOfDay]
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color('#1a1426') },
          uMid: { value: new THREE.Color('#6b3346') },
          uHor: { value: new THREE.Color('#df855c') },
          uSunDir: { value: new THREE.Vector3(...w.sunDir).normalize() },
          uSunCol: { value: new THREE.Color('#ffaa55') },
          uIsNight: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uMid, uHor, uSunDir, uSunCol;
          uniform float uIsNight;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = clamp(d.y, 0.0, 1.0);
            vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.32, h));
            col = mix(col, uTop, smoothstep(0.28, 0.85, h));

            float sd = max(dot(d, normalize(uSunDir)), 0.0);
            float sd2 = sd * sd;
            float halo = sd2 * sd2 * sd2;
            col += uSunCol * halo * (uIsNight > 0.5 ? 0.35 : 0.65);

            // 落日 / 皓月圆盘
            float disc = smoothstep(uIsNight > 0.5 ? 0.9985 : 0.9972, uIsNight > 0.5 ? 0.9992 : 0.9986, sd);
            col = mix(col, uSunCol * (uIsNight > 0.5 ? 1.8 : 2.1), disc);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  )

  useEffect(() => {
    const isNight = timeOfDay === 'night'
    mat.uniforms.uIsNight.value = isNight ? 1 : 0
    mat.uniforms.uSunDir.value.set(...w.sunDir).normalize()
    if (isNight) {
      mat.uniforms.uTop.value.set('#050a14')
      mat.uniforms.uMid.value.set('#0e1d30')
      mat.uniforms.uHor.value.set('#1c334a')
      mat.uniforms.uSunCol.value.set('#d9ecff')
    } else {
      mat.uniforms.uTop.value.set('#221a33')
      mat.uniforms.uMid.value.set('#7a3b4c')
      mat.uniforms.uHor.value.set('#e08a5e')
      mat.uniforms.uSunCol.value.set('#ff9b4a')
    }
  }, [mat, timeOfDay, w.sunDir])

  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[2500, 32, 16]} />
    </mesh>
  )
}

function MountainRing({
  r,
  peak,
  top,
  base,
  rim,
  sunDir,
  seed,
}: {
  r: number
  peak: number
  top: string
  base: string
  rim: string
  sunDir: [number, number, number]
  seed: number
}) {
  const { geo, mat } = useMemo(() => {
    const pos: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2
      const ca = Math.cos(a), sa = Math.sin(a)
      const ridge = ridged(ca * 3.2 + seed * 9, sa * 3.2 + seed * 9, seed, 4)
      const macro = ridged(ca * 1.15 + seed, sa * 1.15, seed * 3, 2)
      const h = peak * (0.14 + 0.86 * Math.pow(ridge, 1.75) * (0.4 + 0.6 * macro))
      pos.push(ca * r, -65, sa * r, ca * r, h - 65, sa * r)
      uv.push(j / SEG, 0, j / SEG, 1)
      if (j < SEG) {
        const k = j * 2
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geo.setIndex(idx)

    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(top) },
        uBase: { value: new THREE.Color(base) },
        uRim: { value: new THREE.Color(rim) },
        uSun: { value: new THREE.Vector3(...sunDir).normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vDir;
        void main() {
          vUv = uv;
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uBase, uRim, uSun;
        varying vec2 vUv;
        varying vec3 vDir;
        void main() {
          float h = smoothstep(0.05, 0.88, vUv.y);
          vec3 col = mix(uBase, uTop, h);
          float sunGlow = max(dot(normalize(vDir), normalize(uSun)), 0.0);
          col += uRim * (sunGlow * sunGlow) * smoothstep(0.55, 1.0, vUv.y) * 0.2;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
    return { geo, mat }
  }, [r, peak, seed])

  useEffect(() => {
    mat.uniforms.uTop.value.set(top)
    mat.uniforms.uBase.value.set(base)
    mat.uniforms.uRim.value.set(rim)
    mat.uniforms.uSun.value.set(...sunDir).normalize()
  }, [mat, top, base, rim, sunDir])

  return <mesh geometry={geo} material={mat} frustumCulled={false} />
}

/** 远景水墨山峦 + 暮霞/月夜天穹与星海（整体随相机平移保持无限远） */
export function InkBackdrop() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const w = WEATHER_PRESETS[timeOfDay]

  return (
    <FollowCamera>
      {!w.useHdrBg && <StylizedSky timeOfDay={timeOfDay} />}
      {timeOfDay === 'night' && <Stars radius={1600} depth={300} count={2600} factor={6} saturation={0.2} fade speed={0.4} />}
      {RING_SPECS.map((spec, i) => (
        <MountainRing
          key={spec.seed}
          {...spec}
          top={w.mountainTops[i]}
          base={w.mountainBases[i]}
          rim={w.cloudRim}
          sunDir={w.sunDir}
        />
      ))}
    </FollowCamera>
  )
}
