import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SUN_DIR } from '../../config/theme'

const SUN = SUN_DIR

/* ───────────── 丁达尔光柱：沿阳光方向的交叉加法混合光束 ───────────── */

const shaftMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  fog: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; varying vec2 vUv; varying vec3 vW;
    void main(){
      float ac = max(1.0 - abs(vUv.x * 2.0 - 1.0), 0.0);
      float across = ac * ac;
      float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
      float flick = 0.65 + 0.35 * sin(uTime * 0.35 + vW.x * 0.02 + vW.z * 0.015);
      gl_FragColor = vec4(vec3(1.0, 0.82, 0.52), across * along * flick * 0.16);
    }`,
})

const SHAFTS: [number, number, number, number][] = [
  [-30, 10, -60, 26], [40, 0, -100, 34], [0, 20, -170, 40], [-80, 20, -150, 30],
  [90, 10, -200, 36], [10, 0, -10, 22], [-55, 0, 10, 28], [60, 10, -30, 24],
]

export function GodRays() {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN), [])
  useFrame((s) => {
    shaftMat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <group>
      {SHAFTS.map(([x, y, z, w], i) => (
        <group key={i} position={[x, y, z]} quaternion={q}>
          <mesh material={shaftMat} renderOrder={4}>
            <planeGeometry args={[w, 320]} />
          </mesh>
          <mesh material={shaftMat} rotation={[0, Math.PI / 2, 0]} renderOrder={4}>
            <planeGeometry args={[w, 320]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ───────────── 粒子：桃花瓣 / 金色灵气萤火 / 青色灵光（GPU 环绕相机循环） ───────────── */

interface ParticleProps {
  count: number
  color: string
  size: number
  fall: number // 正数下落，负数上升
  box: [number, number, number]
  mode: 'petal' | 'glow'
  boost?: number
}

function Particles({ count, color, size, fall, box, mode, boost = 1 }: ParticleProps) {
  const { geo, mat } = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < arr.length; i++) arr[i] = Math.random()
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: mode === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(...box) },
        uSize: { value: size },
        uPx: { value: 800 },
        uFall: { value: fall },
        uMode: { value: mode === 'glow' ? 1 : 0 },
        uColor: { value: new THREE.Color(color).multiplyScalar(boost) },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uSize, uPx, uFall; uniform vec3 uCam, uBox;
        varying float vAlpha; varying float vSeed;
        void main(){
          vec3 s = position;
          vec3 p = s * uBox;
          p.y -= uFall * uTime;
          p.x += sin(uTime * 0.6 + s.z * 30.0) * 3.0;
          p.z += cos(uTime * 0.5 + s.x * 30.0) * 3.0;
          p = mod(p - uCam, uBox) - uBox * 0.5;
          vAlpha = 1.0 - smoothstep(0.32, 0.5, length(p / uBox));
          vSeed = fract(s.x * 17.0 + s.z * 5.0);
          vec4 mv = viewMatrix * vec4(uCam + p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uSize * uPx / max(-mv.z, 0.1), 1.0, 96.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime, uMode; uniform vec3 uColor;
        varying float vAlpha; varying float vSeed;
        void main(){
          vec2 c = gl_PointCoord - 0.5;
          if (uMode < 0.5) {
            float ang = vSeed * 6.283 + uTime * (0.8 + vSeed);
            c = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * c;
            float d = length(vec2(c.x * 1.3, c.y * 2.4));
            if (d > 0.5) discard;
            vec3 col = mix(uColor, uColor * 0.7 + 0.3, c.y + 0.5);
            gl_FragColor = vec4(col, vAlpha * (1.0 - smoothstep(0.38, 0.5, d)) * 0.95);
          } else {
            float d = length(c);
            float g = exp(-d * d * 26.0) * (0.65 + 0.35 * sin(uTime * 2.0 + vSeed * 40.0));
            gl_FragColor = vec4(uColor, g * vAlpha);
          }
        }`,
    })
    return { geo, mat }
  }, [count, color, size, fall, box, mode, boost])

  const { size: vp, dpr } = useThree((s) => ({ size: s.size, dpr: s.viewport.dpr }))
  useFrame((s) => {
    const cam = s.camera as THREE.PerspectiveCamera
    mat.uniforms.uTime.value = s.clock.elapsedTime
    mat.uniforms.uCam.value.copy(cam.position)
    mat.uniforms.uPx.value = (vp.height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2))
  })

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
}

export function Spirits() {
  return (
    <>
      <Particles count={520} color="#f9b8cb" size={0.5} fall={1.6} box={[190, 110, 190]} mode="petal" />
      <Particles count={380} color="#ffd27a" size={0.55} fall={-0.9} box={[170, 90, 170]} mode="glow" boost={2.4} />
      <Particles count={220} color="#5fe3d0" size={0.6} fall={-1.4} box={[150, 80, 150]} mode="glow" boost={2.2} />
    </>
  )
}

/* ───────────── 云雾丝带：缓缓飘动的半透明雾带 ───────────── */

const mistMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){
      float across = pow(max(1.0 - abs(vUv.y * 2.0 - 1.0), 0.0001), 1.6);
      float ends = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
      float d = n(vec2(vUv.x * 6.0 - uTime * 0.15, vUv.y * 2.0)) * 0.65 + n(vec2(vUv.x * 14.0 - uTime * 0.25, vUv.y * 5.0)) * 0.35;
      gl_FragColor = vec4(vec3(0.97, 0.97, 0.94), across * ends * smoothstep(0.3, 0.8, d) * 0.5);
    }`,
})

export function MistRibbons() {
  const ribbons = useMemo(() => {
    return Array.from({ length: 14 }, (_, k) => {
      const g = new THREE.PlaneGeometry(150, 11, 50, 1)
      const p = g.attributes.position
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i)
        p.setY(i, p.getY(i) + Math.sin(x * 0.045 + k) * 5)
        p.setZ(i, Math.sin(x * 0.03 + k * 2) * 12)
      }
      const r = (n: number) => Math.abs(Math.sin(k * 12.9898 + n * 78.233) * 43758.5453) % 1
      return { g, pos: [(r(1) - 0.5) * 320, -8 + r(2) * 48, 20 - r(3) * 340] as [number, number, number], rot: r(4) * Math.PI }
    })
  }, [])
  useFrame((s) => {
    mistMat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return (
    <group>
      {ribbons.map((o, i) => (
        <mesh key={i} geometry={o.g} material={mistMat} position={o.pos} rotation={[0, o.rot, 0]} renderOrder={3} />
      ))}
    </group>
  )
}
