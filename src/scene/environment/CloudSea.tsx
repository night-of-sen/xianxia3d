import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WEATHER_PRESETS } from '../../config/theme'
import { useGameStore } from '../../store/useGameStore'

const vert = /* glsl */ `
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const frag = /* glsl */ `
  uniform float uTime;
  uniform float uAlphaCut;
  uniform float uScale;
  uniform float uSpeed;
  uniform vec3 uLight;
  uniform vec3 uShadow;
  uniform vec3 uDeep;
  uniform vec3 uRim;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  #include <fog_pars_fragment>

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p){
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
    return s;
  }
  // 翻涌：域扭曲产生层叠云浪
  float cloud(vec2 p){
    float t = uTime * uSpeed;
    vec2 w = vec2(fbm(p + vec2(t, 0.0)), fbm(p + vec2(5.2, 1.3 - t)));
    return fbm(p + 1.85 * w + vec2(t * 0.55, 0.0));
  }

  void main() {
    vec2 p = vWorld.xz * uScale;
    float h = cloud(p);
    float e = 0.025;
    float hx = cloud(p + vec2(e, 0.0));
    float hz = cloud(p + vec2(0.0, e));
    // 强化高度场梯度法线，呈现厚重立体的云峰与云谷明暗
    vec3 n = normalize(vec3(-(hx - h) / e * 0.85, 1.0, -(hz - h) / e * 0.85));
    vec3 sun = normalize(uSunDir);
    float diff = clamp(dot(n, sun) * 0.55 + 0.45, 0.0, 1.0);

    // 三阶水墨云海着色：云谷深青黛 → 云腰青灰 → 云顶暖杏白
    float ridge = smoothstep(0.28, 0.78, h);
    vec3 baseCol = mix(uDeep, uShadow, smoothstep(0.18, 0.52, h));
    vec3 col = mix(baseCol, uLight, smoothstep(0.2, 0.92, diff * 0.72 + ridge * 0.55));

    // 云顶迎阳面柔和金边（不超 1.0，避免触发死白 Bloom）
    float sunDot = max(dot(n, sun), 0.0);
    float s2 = sunDot * sunDot;
    col += uRim * (s2 * s2 * s2) * ridge * 0.28;

    float alpha = smoothstep(uAlphaCut, uAlphaCut + 0.22, h);
    gl_FragColor = vec4(col, alpha);
    #include <fog_fragment>
  }
`

interface LayerProps {
  y: number
  scale: number
  speed: number
  alphaCut: number
  light: string
  shadow: string
  deep: string
  rim: string
  sunDir: [number, number, number]
  transparent?: boolean
}

function CloudLayer({ y, scale, speed, alphaCut, light, shadow, deep, rim, sunDir, transparent }: LayerProps) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        fog: true,
        transparent: !!transparent,
        depthWrite: !transparent,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uAlphaCut: { value: alphaCut },
            uScale: { value: scale },
            uSpeed: { value: speed },
            uLight: { value: new THREE.Color(light) },
            uShadow: { value: new THREE.Color(shadow) },
            uDeep: { value: new THREE.Color(deep) },
            uRim: { value: new THREE.Color(rim) },
            uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
          },
        ]),
      }),
    [alphaCut, scale, speed, transparent],
  )

  useEffect(() => {
    mat.uniforms.uLight.value.set(light)
    mat.uniforms.uShadow.value.set(shadow)
    mat.uniforms.uDeep.value.set(deep)
    mat.uniforms.uRim.value.set(rim)
    mat.uniforms.uSunDir.value.set(...sunDir).normalize()
  }, [mat, light, shadow, deep, rim, sunDir])

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} material={mat} renderOrder={transparent ? 2 : 0}>
      <planeGeometry args={[3200, 3200, 1, 1]} />
    </mesh>
  )
}

/** 多层立体翻涌云海：随「晨曦 / 暮霞 / 月夜」自动切换云浪色调 */
export function CloudSea() {
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const w = WEATHER_PRESETS[timeOfDay]
  return (
    <FollowCamera>
      <CloudLayer
        y={-24}
        scale={0.011}
        speed={0.018}
        alphaCut={0.0}
        light={w.cloudLight}
        shadow={w.cloudShadow}
        deep={w.cloudDeep}
        rim={w.cloudRim}
        sunDir={w.sunDir}
      />
      <CloudLayer
        y={-15}
        scale={0.019}
        speed={0.028}
        alphaCut={0.48}
        light={w.cloudLight}
        shadow={w.cloudShadow}
        deep={w.cloudDeep}
        rim={w.cloudRim}
        sunDir={w.sunDir}
        transparent
      />
      <CloudLayer
        y={-7}
        scale={0.028}
        speed={0.04}
        alphaCut={0.6}
        light={w.cloudLight}
        shadow={w.cloudShadow}
        deep={w.cloudDeep}
        rim={w.cloudRim}
        sunDir={w.sunDir}
        transparent
      />
    </FollowCamera>
  )
}

/** 让子节点在 XZ 平面跟随相机 */
export function FollowCamera({ children, factor = 1 }: { children: React.ReactNode; factor?: number }) {
  const ref = useMemo(() => ({ current: null as THREE.Group | null }), [])
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.x = state.camera.position.x * factor
      ref.current.position.z = state.camera.position.z * factor
    }
  })
  return <group ref={(g) => void (ref.current = g)}>{children}</group>
}
