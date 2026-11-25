import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { fbm3 } from '../noise'
import { useIslandMaterial } from './islandMaterial'
import { ISLANDS, edgeAt, islandNoiseSeed, islandRot, topYLocal, type IslandDef } from './islandData'

const SEG = 96
const ROWS_TOP = 36
const ROWS_BOT = 44

// 顶点色仅作明暗/色相微调（真实纹理由三平面 PBR 材质提供）
const GRASS_A = new THREE.Color('#cfe6a8')
const GRASS_B = new THREE.Color('#ffffff')
const MOSS = new THREE.Color('#8fb89a')
const ROCK_A = new THREE.Color('#ffffff')
const ROCK_B = new THREE.Color('#c9bfb0')

/** 极坐标网格单曲面：圆心 → 山巅边缘 → 悬垂岩壁 → 底部尖端，一体成型无缝 */
function buildIsland(d: IslandDef): THREE.BufferGeometry {
  const { radius: R, depth } = d
  const s = islandNoiseSeed(d)
  const rows = ROWS_TOP + ROWS_BOT
  const pos = new Float32Array((rows + 1) * (SEG + 1) * 3)

  let p = 0
  for (let i = 0; i <= rows; i++) {
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2
      const ca = Math.cos(a), sa = Math.sin(a)
      const edge = edgeAt(d, a)
      let x: number, y: number, z: number
      if (i <= ROWS_TOP) {
        const r = (i / ROWS_TOP) * R * edge
        x = ca * r
        z = sa * r
        y = topYLocal(d, x, z)
      } else {
        const u = (i - ROWS_TOP) / ROWS_BOT
        const cliff = fbm3(ca * 2.2 + s, u * 3.2, sa * 2.2 + s, 4)
        const taper = Math.pow(1 - u, 0.62)
        const strata = 1 + 0.05 * Math.sin(u * 55 + cliff * 7) // 垂直层理岩层
        const r = R * edge * taper * strata * (1 + (cliff - 0.5) * 0.7 * Math.sin(u * Math.PI))
        x = ca * r
        z = sa * r
        y = -depth * Math.pow(u, 0.85) * (1 + (cliff - 0.5) * 0.35)
      }
      pos[p++] = x
      pos[p++] = y
      pos[p++] = z
    }
  }

  const idx: number[] = []
  const W = SEG + 1
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * W + j
      const b = a + W
      idx.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()

  // 修复极点退化三角形可能产生的零法线/NaN 法线
  const nrm = geo.getAttribute('normal')
  for (let v = 0; v < nrm.count; v++) {
    const nx = nrm.getX(v), ny = nrm.getY(v), nz = nrm.getZ(v)
    if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz) || nx * nx + ny * ny + nz * nz < 1e-6) {
      nrm.setXYZ(v, 0, pos[v * 3 + 1] >= 0 ? 1 : -1, 0)
    }
  }
  nrm.needsUpdate = true

  // 顶点着色：山巅青绿草甸/苔藓，陡坡与侧壁为分层岩石
  const col = new Float32Array(pos.length)
  const aGrass = new Float32Array(pos.length / 3)
  const c = new THREE.Color()
  const grass = new THREE.Color()
  for (let v = 0; v < pos.length / 3; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]
    const ny = nrm.getY(v)
    const n = fbm3(x * 0.12 + s, y * 0.12, z * 0.12 + s, 3)
    const grassMask = THREE.MathUtils.smoothstep(ny, 0.55, 0.8) * (y > -1.5 ? 1 : 0)
    const band = 0.5 + 0.5 * Math.sin(y * 1.4 + n * 5)
    c.copy(ROCK_B).lerp(ROCK_A, band * 0.7 + n * 0.3)
    c.multiplyScalar(THREE.MathUtils.clamp(1 + y / (depth * 1.4), 0.5, 1)) // 越往下越暗
    grass.copy(GRASS_A).lerp(GRASS_B, n).lerp(MOSS, THREE.MathUtils.smoothstep(n, 0.5, 0.75) * 0.5)
    c.lerp(grass, grassMask)
    aGrass[v] = grassMask
    col[v * 3] = c.r
    col[v * 3 + 1] = c.g
    col[v * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aGrass', new THREE.BufferAttribute(aGrass, 1))
  return geo
}

/** 环绕仙山缓缓起伏的碎浮石群（InstancedMesh 高性能渲染，大幅增强仙侠空间细节） */
function FloatingRocks() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const rocks = useMemo(() => {
    const list: { base: THREE.Vector3; scale: THREE.Vector3; rot: THREE.Euler; phase: number; amp: number }[] = []
    let seed = 101
    const next = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    ISLANDS.forEach((isl) => {
      const count = 5
      for (let i = 0; i < count; i++) {
        const ang = next() * Math.PI * 2
        const dist = isl.radius * (1.18 + next() * 0.65)
        const y = isl.pos[1] - 6 + next() * 14
        list.push({
          base: new THREE.Vector3(isl.pos[0] + Math.cos(ang) * dist, y, isl.pos[2] + Math.sin(ang) * dist),
          scale: new THREE.Vector3(1.1 + next() * 2.2, 1.4 + next() * 2.8, 1.1 + next() * 2.2),
          rot: new THREE.Euler(next() * 3, next() * 6, next() * 3),
          phase: next() * Math.PI * 2,
          amp: 0.5 + next() * 0.9,
        })
      }
    })
    return list
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    const mesh = ref.current
    if (!mesh) return
    const t = clock.elapsedTime
    for (let i = 0; i < rocks.length; i++) {
      const r = rocks[i]
      dummy.position.set(r.base.x, r.base.y + Math.sin(t * 0.7 + r.phase) * r.amp, r.base.z)
      dummy.rotation.set(r.rot.x, r.rot.y + t * 0.08, r.rot.z)
      dummy.scale.copy(r.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, rocks.length]} frustumCulled={false} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#6e6d68" roughness={0.92} metalness={0.05} flatShading />
    </instancedMesh>
  )
}

export function FloatingIslands() {
  const geos = useMemo(() => ISLANDS.map(buildIsland), [])
  const material = useIslandMaterial()
  return (
    <group>
      {ISLANDS.map((d, i) => (
        <mesh key={i} geometry={geos[i]} position={d.pos} rotation={[0, islandRot(d), 0]} castShadow receiveShadow>
          <primitive object={material} attach="material" />
        </mesh>
      ))}
      <FloatingRocks />
    </group>
  )
}
