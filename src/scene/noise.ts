/** 轻量 3D 值噪声 + fbm（程序化地形用，带种子偏移） */
function hash(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z)
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi)
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

/** 0..1 范围的分形噪声 */
export function fbm3(x: number, y: number, z: number, oct = 4): number {
  let a = 0.5, f = 1, s = 0, n = 0
  for (let i = 0; i < oct; i++) {
    s += a * noise3(x * f, y * f, z * f)
    n += a
    a *= 0.5
    f *= 2.05
  }
  return s / n
}

/** 脊状噪声（尖锐山脊/水墨峰），0..1 */
export function ridged(x: number, y: number, z: number, oct = 4): number {
  let a = 0.5, f = 1, s = 0, n = 0
  for (let i = 0; i < oct; i++) {
    s += a * (1 - Math.abs(noise3(x * f, y * f, z * f) * 2 - 1))
    n += a
    a *= 0.5
    f *= 2.1
  }
  return s / n
}
