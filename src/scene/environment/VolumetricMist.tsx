import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WEATHER_PRESETS } from '../../config/theme'
import { useGameStore } from '../../store/useGameStore'
import { ISLANDS } from './islandData'

interface PuffData {
  pos: THREE.Vector3
  scale: number
  speed: number
  phase: number
  isWaterfall: boolean
}

/**
 * 3D 山腰缠绕体积云团 + 瀑布底部水雾：
 * 使用 InstancedMesh + 视点朝向（Billboard）与程序化 FBM 柔边 Shader，
 * 性能开销极低，却能在穿行山间时呈现真正的 3D 穿云破雾立体感。
 */
export function VolumetricMist() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const w = WEATHER_PRESETS[timeOfDay]
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const puffs = useMemo<PuffData[]>(() => {
    const list: PuffData[] = []
    let seed = 733
    const next = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    // 每座仙山腰际生成 6~8 团缓缓流动的 3D 云絮
    ISLANDS.forEach((isl, idx) => {
      const count = idx < 5 ? 8 : 5
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + next() * 0.7
        const dist = isl.radius * (0.85 + next() * 0.75)
        const y = isl.pos[1] - isl.depth * (0.25 + next() * 0.45)
        list.push({
          pos: new THREE.Vector3(isl.pos[0] + Math.cos(ang) * dist, y, isl.pos[2] + Math.sin(ang) * dist),
          scale: 16 + next() * 20,
          speed: 0.12 + next() * 0.16,
          phase: next() * Math.PI * 2,
          isWaterfall: false,
        })
      }
    })

    // 瀑布落入云海处的翻腾水雾（主岛与 2、4 号岛下方）
    const waterfallSpots: [number, number, number][] = [
      [-10, -24, -12],
      [-48, -22, -74],
      [-16, -20, -176],
    ]
    waterfallSpots.forEach(([x, y, z]) => {
      for (let i = 0; i < 6; i++) {
        list.push({
          pos: new THREE.Vector3(x + (next() - 0.5) * 16, y + next() * 8, z + (next() - 0.5) * 16),
          scale: 11 + next() * 10,
          speed: 0.35 + next() * 0.25,
          phase: next() * Math.PI * 2,
          isWaterfall: true,
        })
      }
    })
    return list
  }, [])

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(w.mistColor) },
          uRim: { value: new THREE.Color(w.cloudRim) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying float vDist;
          void main() {
            vUv = uv;
            // Instanced Billboard：让每个云团面片始终优雅朝向镜头
            vec4 worldCenter = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec4 mvCenter = viewMatrix * worldCenter;
            float sx = length(vec3(instanceMatrix[0][0], instanceMatrix[0][1], instanceMatrix[0][2]));
            float sy = length(vec3(instanceMatrix[1][0], instanceMatrix[1][1], instanceMatrix[1][2]));
            mvCenter.xy += position.xy * vec2(sx, sy);
            vDist = -mvCenter.z;
            gl_Position = projectionMatrix * mvCenter;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor, uRim;
          varying vec2 vUv;
          varying float vDist;

          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p){
            vec2 i = floor(p), f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
          }
          float fbm(vec2 p){
            return n(p) * 0.55 + n(p * 2.1 + 3.1) * 0.3 + n(p * 4.3 + 7.2) * 0.15;
          }

          void main() {
            vec2 c = vUv - 0.5;
            float r = length(c) * 2.0;
            if (r >= 1.0) discard;
            float shape = smoothstep(1.0, 0.15, r);
            float billow = fbm(vUv * 3.4 + vec2(uTime * 0.08, -uTime * 0.04));
            // 穿云柔化：离镜头极近时平滑淡出，无生硬裁切感
            float nearFade = smoothstep(3.0, 18.0, vDist);
            float farFade = 1.0 - smoothstep(320.0, 620.0, vDist);
            float alpha = shape * smoothstep(0.28, 0.85, billow) * nearFade * farFade * 0.32;
            if (alpha < 0.005) discard;
            vec3 col = mix(uColor * 0.85, mix(uColor, uRim, 0.25), smoothstep(0.25, 0.85, vUv.y));
            gl_FragColor = vec4(col, alpha);
          }
        `,
      }),
    [],
  )

  useEffect(() => {
    mat.uniforms.uColor.value.set(w.mistColor)
    mat.uniforms.uRim.value.set(w.cloudRim)
  }, [mat, w.mistColor, w.cloudRim])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    mat.uniforms.uTime.value = t
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]
      const driftX = Math.sin(t * p.speed + p.phase) * (p.isWaterfall ? 2.5 : 5.5)
      const driftY = Math.cos(t * p.speed * 0.8 + p.phase) * (p.isWaterfall ? 2.0 : 1.4)
      dummy.position.set(p.pos.x + driftX, p.pos.y + driftY, p.pos.z)
      dummy.scale.set(p.scale * 1.45, p.scale * 0.72, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, puffs.length]} material={mat} frustumCulled={false} renderOrder={4}>
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  )
}
