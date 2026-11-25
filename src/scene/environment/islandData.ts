import { fbm3, noise3 } from '../noise'

export interface IslandDef {
  pos: [number, number, number]
  radius: number
  depth: number
  seed: number
}

/** 多层错落的环状悬空仙山群：近处主峰 + 中景群岛 + 四周远景仙山，任意方向视野皆有层次 */
export const ISLANDS: IslandDef[] = [
  { pos: [0, 0, -30], radius: 22, depth: 38, seed: 1 },
  { pos: [-60, 14, -95], radius: 28, depth: 46, seed: 2 },
  { pos: [70, -4, -130], radius: 20, depth: 34, seed: 3 },
  { pos: [-20, 28, -210], radius: 34, depth: 56, seed: 4 },
  { pos: [105, 18, -240], radius: 26, depth: 44, seed: 5 },
  { pos: [-120, 6, -30], radius: 18, depth: 30, seed: 6 },
  { pos: [40, 40, -330], radius: 40, depth: 60, seed: 7 },
  { pos: [-95, 30, -320], radius: 24, depth: 40, seed: 8 },
  // 扩充左右翼与后方仙山，避免转向后视野空荡
  { pos: [95, 10, -20], radius: 21, depth: 36, seed: 9 },
  { pos: [145, 24, -110], radius: 30, depth: 50, seed: 10 },
  { pos: [-155, 22, -165], radius: 29, depth: 48, seed: 11 },
  { pos: [-75, 12, 75], radius: 23, depth: 38, seed: 12 },
  { pos: [85, 16, 85], radius: 25, depth: 42, seed: 13 },
  { pos: [0, 26, 160], radius: 32, depth: 52, seed: 14 },
]

export const islandNoiseSeed = (d: IslandDef) => d.seed * 17.3
export const islandRot = (d: IslandDef) => d.seed * 1.3

/** 山体边缘不规则系数（角度 a，局部坐标 x=cos, z=sin） */
export function edgeAt(d: IslandDef, a: number): number {
  const s = islandNoiseSeed(d)
  return 1 + 0.28 * (fbm3(Math.cos(a) * 1.4 + s, Math.sin(a) * 1.4 + s, s, 3) - 0.5) * 2
}

/** 山巅局部坐标 (x,z) 处的地表高度，与网格生成共用同一公式，保证摆放物精确贴地 */
export function topYLocal(d: IslandDef, x: number, z: number): number {
  const R = d.radius
  const s = islandNoiseSeed(d)
  const a = Math.atan2(z, x)
  const q = Math.min(Math.hypot(x, z) / (R * edgeAt(d, a)), 1)
  const hills = (fbm3(x * 0.06 + s, 0, z * 0.06 + s, 4) - 0.5) * R * 0.34
  const dome = R * 0.16 * (1 - q * q)
  return dome + hills * (1 - Math.pow(q, 4)) + (noise3(x * 0.5 + s, 1, z * 0.5) - 0.5) * 0.5 * (1 - q)
}

/** 世界坐标 → 岛屿局部坐标（岛屿绕 Y 轴旋转 islandRot） */
export function toLocal(d: IslandDef, wx: number, wz: number): [number, number] {
  const dx = wx - d.pos[0], dz = wz - d.pos[2]
  const t = islandRot(d)
  return [dx * Math.cos(t) - dz * Math.sin(t), dx * Math.sin(t) + dz * Math.cos(t)]
}

export function worldTopY(d: IslandDef, wx: number, wz: number): number {
  const [x, z] = toLocal(d, wx, wz)
  return d.pos[1] + topYLocal(d, x, z)
}

/** 世界方向 → 局部极角 */
export function localAngle(d: IslandDef, wx: number, wz: number): number {
  const t = islandRot(d)
  return Math.atan2(wx * Math.sin(t) + wz * Math.cos(t), wx * Math.cos(t) - wz * Math.sin(t))
}
