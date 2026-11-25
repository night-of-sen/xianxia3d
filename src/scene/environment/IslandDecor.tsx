import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { PALETTE } from '../../config/theme'
import { fbm3 } from '../noise'
import { ModelSlot } from '../models/ModelSlot'
import { ISLANDS, edgeAt, islandRot, localAngle, topYLocal, worldTopY, type IslandDef } from './islandData'

const ni = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g)
const rand = (seed: number) => {
  let t = seed * 2654435761
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────────────────── 亭台 ───────────────────────── */

/** 飞檐翘角屋顶：中心起脊、四角上翘的曲面 */
function roofGeo(half: number, H: number, flick: number) {
  const g = new THREE.PlaneGeometry(half * 2, half * 2, 28, 28)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const nx = Math.min(1, Math.abs(p.getX(i)) / half)
    const nz = Math.min(1, Math.abs(p.getZ(i)) / half)
    const d = Math.max(0, 1 - Math.max(nx, nz))
    p.setY(i, H * Math.pow(d, 1.4) + flick * Math.pow(nx * nz, 2.5))
  }
  g.computeVertexNormals()
  return g
}

const RED = '#8c2b22'
const STONE = '#bdb7aa'

function Lantern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.9, 4]} />
        <meshBasicMaterial color="#3a2a1c" />
      </mesh>
      <mesh scale={[0.42, 0.58, 0.42]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={3.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.1, 8]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.1, 8]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function Pavilion({ island }: { island: IslandDef }) {
  const y0 = topYLocal(island, 0, 0) + 0.5
  const lower = useMemo(() => roofGeo(6.4, 1.9, 1.8), [])
  const upper = useMemo(() => roofGeo(3.5, 1.7, 1.3), [])
  const roofMat = <meshStandardMaterial color="#3f5559" roughness={0.6} side={THREE.DoubleSide} />
  const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]]

  return (
    <group position={[0, y0, 0]}>
      {/* 台基 */}
      <mesh position={[0, -1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[11, 4, 11]} />
        <meshStandardMaterial color={STONE} roughness={0.9} />
      </mesh>
      {/* 石阶（朝 +Z） */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, -0.3 * (i + 1) - 1.5, 6 + i]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 3, 1.05]} />
          <meshStandardMaterial color={STONE} roughness={0.95} />
        </mesh>
      ))}
      {/* 阶旁石灯 */}
      {[-2.6, 2.6].map((x) => (
        <group key={x} position={[x, 0.2, 7]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.45, 1.6, 0.45]} />
            <meshStandardMaterial color={STONE} />
          </mesh>
          <mesh position={[0, 1.55, 0]} scale={[0.34, 0.45, 0.34]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={PALETTE.lantern} emissive={PALETTE.lantern} emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* 朱红立柱 + 柱础石墩 */}
      {corners.map(([cx, cz], i) => (
        <group key={i} position={[cx * 3.4, 0, cz * 3.4]}>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.5, 0.35, 8]} />
            <meshStandardMaterial color={STONE} roughness={0.85} />
          </mesh>
          <mesh position={[0, 2.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.24, 0.26, 4.4, 12]} />
            <meshStandardMaterial color={RED} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* 三面古风美人靠护栏（正面留石阶入口） */}
      {[-3.4, 3.4].map((x) => (
        <group key={`rail-x-${x}`} position={[x, 1.05, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.14, 6.4]} />
            <meshStandardMaterial color={RED} roughness={0.65} />
          </mesh>
          <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.12, 0.1, 6.4]} />
            <meshStandardMaterial color={RED} roughness={0.65} />
          </mesh>
        </group>
      ))}
      <group position={[0, 1.05, -3.4]}>
        <mesh castShadow>
          <boxGeometry args={[6.4, 0.14, 0.16]} />
          <meshStandardMaterial color={RED} roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.35, 0]} castShadow>
          <boxGeometry args={[6.4, 0.1, 0.12]} />
          <meshStandardMaterial color={RED} roughness={0.65} />
        </mesh>
      </group>
      {/* 亭前玄黑鎏金匾额 */}
      <group position={[0, 4.25, 3.55]}>
        <mesh castShadow>
          <boxGeometry args={[2.3, 0.78, 0.12]} />
          <meshStandardMaterial color="#181c20" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[2.1, 0.62, 0.04]} />
          <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={0.65} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* 横梁 */}
      {[-3.4, 3.4].map((v) => (
        <group key={v}>
          <mesh position={[v, 4.75, 0]}>
            <boxGeometry args={[0.3, 0.35, 7.2]} />
            <meshStandardMaterial color={RED} />
          </mesh>
          <mesh position={[0, 4.75, v]}>
            <boxGeometry args={[7.2, 0.35, 0.3]} />
            <meshStandardMaterial color={RED} />
          </mesh>
        </group>
      ))}
      {/* 双层飞檐 */}
      <mesh geometry={lower} position={[0, 4.95, 0]} castShadow receiveShadow>{roofMat}</mesh>
      <mesh position={[0, 6.2, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 2.4, 10]} />
        <meshStandardMaterial color={RED} />
      </mesh>
      <mesh geometry={upper} position={[0, 7.0, 0]} castShadow receiveShadow>{roofMat}</mesh>
      {/* 宝顶 */}
      <mesh position={[0, 8.9, 0]}>
        <coneGeometry args={[0.28, 1.1, 8]} />
        <meshStandardMaterial color={PALETTE.gold} emissive={PALETTE.gold} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      {/* 檐角灯笼 */}
      {corners.map(([cx, cz], i) => (
        <Lantern key={i} position={[cx * 6.3, 5.4, cz * 6.3]} />
      ))}
      <pointLight color={PALETTE.lantern} intensity={60} distance={30} position={[0, 4, 0]} />
    </group>
  )
}

/* ───────────────────────── 树木 ───────────────────────── */

type TreeKind = 'pine' | 'peach'
const treeCache = new Map<string, { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry }>()

function blob(radius: number, flat: number, at: THREE.Vector3, r: () => number) {
  const g = new THREE.IcosahedronGeometry(radius, 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const k = 1 + (fbm3(x * 1.3 + at.x, y * 1.3 + at.y, z * 1.3 + at.z, 2) - 0.5) * 0.7
    p.setXYZ(i, x * k, y * k * flat, z * k)
  }
  g.translate(at.x, at.y, at.z)
  g.computeVertexNormals()
  void r
  return g
}

/** 程序化枝干虬曲的树：松（层叠扁平松冠）/ 桃（圆润粉冠） */
function makeTree(kind: TreeKind, variant: number) {
  const key = `${kind}${variant}`
  const hit = treeCache.get(key)
  if (hit) return hit
  const r = rand(variant * 131 + (kind === 'pine' ? 7 : 19))
  const lean = (r() - 0.5) * 2.2
  const H = kind === 'pine' ? 6.5 : 4.8
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    pts.push(new THREE.Vector3(Math.sin(t * 3 + variant) * 0.6 + lean * t * t, t * H, Math.cos(t * 2.4 + variant * 2) * 0.5))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const trunkParts: THREE.BufferGeometry[] = [ni(new THREE.TubeGeometry(curve, 28, kind === 'pine' ? 0.3 : 0.24, 7, false))]
  const base = new THREE.CylinderGeometry(0.28, 0.55, 0.9, 8)
  base.translate(0, 0.3, 0)
  trunkParts.push(ni(base))

  const canopyParts: THREE.BufferGeometry[] = []
  const top = curve.getPoint(1)
  canopyParts.push(ni(blob(kind === 'pine' ? 1.9 : 1.7, kind === 'pine' ? 0.5 : 0.8, top.clone().add(new THREE.Vector3(0, 0.3, 0)), r)))
  const nb = kind === 'pine' ? 4 : 3
  for (let b = 0; b < nb; b++) {
    const t = 0.45 + (b / nb) * 0.45
    const o = curve.getPoint(t)
    const ang = r() * Math.PI * 2 + b * 1.7
    const len = (kind === 'pine' ? 3.2 : 2.4) * (0.7 + r() * 0.6)
    const end = new THREE.Vector3(o.x + Math.cos(ang) * len, o.y + 0.6 + r() * 0.8, o.z + Math.sin(ang) * len)
    const bc = new THREE.CatmullRomCurve3([o, o.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.5, 0)), end])
    trunkParts.push(ni(new THREE.TubeGeometry(bc, 10, 0.1, 5, false)))
    canopyParts.push(ni(blob((kind === 'pine' ? 1.5 : 1.3) * (0.8 + r() * 0.4), kind === 'pine' ? 0.45 : 0.75, end.clone().add(new THREE.Vector3(0, 0.25, 0)), r)))
  }
  const out = { trunk: mergeGeometries(trunkParts)!, canopy: mergeGeometries(canopyParts)! }
  treeCache.set(key, out)
  return out
}

function Tree({ kind, variant, position, scale, rotY }: { kind: TreeKind; variant: number; position: [number, number, number]; scale: number; rotY: number }) {
  const { trunk, canopy } = useMemo(() => makeTree(kind, variant), [kind, variant])
  return (
    <group position={position} scale={scale} rotation={[0, rotY, 0]}>
      <mesh geometry={trunk} castShadow receiveShadow>
        <meshStandardMaterial color={kind === 'pine' ? '#4a3a2c' : '#4b3a34'} roughness={1} />
      </mesh>
      <mesh geometry={canopy} castShadow receiveShadow>
        {kind === 'pine' ? (
          <meshStandardMaterial color="#2f5d47" roughness={0.9} flatShading />
        ) : (
          <meshStandardMaterial color="#f4b4c6" emissive="#f08fae" emissiveIntensity={0.25} roughness={0.8} flatShading />
        )}
      </mesh>
    </group>
  )
}

/* ───────────────────────── 瀑布 ───────────────────────── */

const fallMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    void main(){
      float streak = n(vec2(vUv.x * 18.0, vUv.y * 4.0 + uTime * 2.4)) * 0.6 + n(vec2(vUv.x * 40.0, vUv.y * 9.0 + uTime * 3.6)) * 0.4;
      float side = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
      float fade = smoothstep(0.0, 0.55, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
      float a = smoothstep(0.25, 0.9, streak) * side * fade;
      gl_FragColor = vec4(vec3(0.62, 0.95, 1.0) * 1.35, a * 0.8);
    }`,
})

function Waterfall({ island, wx, wz }: { island: IslandDef; wx: number; wz: number }) {
  const a = localAngle(island, wx, wz)
  const rimR = island.radius * edgeAt(island, a) * 0.97
  const x = Math.cos(a) * rimR, z = Math.sin(a) * rimR
  const H = island.depth * 0.95
  return (
    <mesh position={[x, topYLocal(island, x, z) - H / 2 + 0.2, z]} rotation={[0, Math.PI / 2 - a, 0]} material={fallMat} renderOrder={3}>
      <planeGeometry args={[Math.max(2.6, island.radius * 0.16), H]} />
    </mesh>
  )
}

/* ───────────────────────── 悬空石桥 ───────────────────────── */

function Bridge({ from, to }: { from: IslandDef; to: IslandDef }) {
  const { planes, rails, a, b } = useMemo(() => {
    const dir = new THREE.Vector2(to.pos[0] - from.pos[0], to.pos[2] - from.pos[2]).normalize()
    const sx = from.pos[0] + dir.x * from.radius * 0.62, sz = from.pos[2] + dir.y * from.radius * 0.62
    const ex = to.pos[0] - dir.x * to.radius * 0.62, ez = to.pos[2] - dir.y * to.radius * 0.62
    const a = new THREE.Vector3(sx, worldTopY(from, sx, sz) + 0.3, sz)
    const b = new THREE.Vector3(ex, worldTopY(to, ex, ez) + 0.3, ez)
    const mid = a.clone().lerp(b, 0.5)
    mid.y += 3.5 // 拱起
    const curve = new THREE.CatmullRomCurve3([a, mid, b])
    const N = Math.round(a.distanceTo(b) / 1.1)
    const planes = Array.from({ length: N }, (_, i) => {
      const t = i / (N - 1)
      const p = curve.getPoint(t)
      const tg = curve.getTangent(t)
      return { p, yaw: Math.atan2(-tg.x, -tg.z), pitch: Math.asin(tg.y) }
    })
    const side = new THREE.Vector3(-dir.y, 0, dir.x).multiplyScalar(1.5)
    const mk = (s: number) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(curve.getPoints(40).map((q) => q.clone().add(side.clone().multiplyScalar(s)).add(new THREE.Vector3(0, 1.15, 0)))),
        60, 0.08, 6, false,
      )
    return { planes, rails: [mk(1), mk(-1)], a, b }
  }, [from, to])

  const proc = <BridgeProcedural planes={planes} rails={rails} />
  return (
    <ModelSlot slot="bridge" between={[a, b]} fitSize={a.distanceTo(b)} fallback={proc} />
  )
}

function BridgeProcedural({ planes, rails }: { planes: { p: THREE.Vector3; yaw: number; pitch: number }[]; rails: THREE.BufferGeometry[] }) {
  return (
    <group>
      {planes.map((o, i) => (
        <mesh key={i} position={o.p} rotation={new THREE.Euler(o.pitch, o.yaw, 0, 'YXZ')}>
          <boxGeometry args={[3.2, 0.25, 1.0]} />
          <meshStandardMaterial color={i % 2 ? '#7a6048' : '#6b5440'} roughness={0.9} />
        </mesh>
      ))}
      {rails.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={RED} />
        </mesh>
      ))}
      {planes
        .filter((_, i) => i % 6 === 0)
        .map((o, i) => (
          <Lantern key={i} scale={0.55} position={[o.p.x, o.p.y + 1.4, o.p.z]} />
        ))}
    </group>
  )
}

/* ───────────────────────── 汇总 ───────────────────────── */

function IslandTrees({ d }: { d: IslandDef }) {
  const items = useMemo(() => {
    const r = rand(d.seed * 977)
    const list: { kind: TreeKind; variant: number; x: number; z: number; s: number }[] = []
    const n = Math.max(3, Math.round(d.radius / 5))
    for (let i = 0; i < n * 3 && list.length < n; i++) {
      const rr = (0.28 + r() * 0.5) * d.radius
      const ang = r() * Math.PI * 2
      const x = Math.cos(ang) * rr, z = Math.sin(ang) * rr
      if (d.seed === 1 && Math.hypot(x, z) < 11.5) continue // 为主亭台让位
      if (d.seed === 1 && z > 0 && Math.abs(x) < 5 && z < 16) continue
      list.push({ kind: list.length % 2 ? 'peach' : 'pine', variant: i % 4, x, z, s: (0.9 + r() * 0.7) * THREE.MathUtils.clamp(d.radius / 22, 0.85, 1.4) })
    }
    return list
  }, [d])
  return (
    <>
      {items.map((t, i) => {
        const pos: [number, number, number] = [t.x, topYLocal(d, t.x, t.z) - 0.25, t.z]
        return (
          <ModelSlot
            key={i}
            slot={t.kind}
            position={pos}
            rotationY={i * 1.9}
            scaleMul={t.s}
            fallback={<Tree kind={t.kind} variant={t.variant} scale={t.s} rotY={i * 1.9} position={pos} />}
          />
        )
      })}
    </>
  )
}

const FALLS: Record<number, [number, number]> = { 1: [-0.5, 0.9], 2: [0.5, 0.8], 4: [0.2, 1] }

export function IslandDecor() {
  return (
    <group>
      {ISLANDS.map((d) => (
        <group key={d.seed} position={d.pos} rotation={[0, islandRot(d), 0]}>
          {d.seed === 1 && (
            <ModelSlot slot="pavilion" position={[0, topYLocal(d, 0, 0), 0]} fallback={<Pavilion island={d} />} />
          )}
          <IslandTrees d={d} />
          {FALLS[d.seed] && <Waterfall island={d} wx={FALLS[d.seed][0]} wz={FALLS[d.seed][1]} />}
        </group>
      ))}
      <Bridge from={ISLANDS[0]} to={ISLANDS[1]} />
      <WaterfallClock />
    </group>
  )
}

/** 驱动瀑布共享材质的时间 */
function WaterfallClock() {
  useFrame((s) => {
    fallMat.uniforms.uTime.value = s.clock.elapsedTime
  })
  return null
}
