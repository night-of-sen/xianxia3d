import * as THREE from 'three'
import type { ActiveShot } from '../../store/useGameStore'

/**
 * 导演模式 3D 自动巡航闭环样条路径：
 * 掠过主仙山亭台 → 穿越悬空石桥 → 环绕中景群岛 → 俯冲贴近翻涌云海 → 破云爬升回主峰
 */
export function createDirectorCurve(): THREE.CatmullRomCurve3 {
  const pts = [
    new THREE.Vector3(0, 15, 34),
    new THREE.Vector3(24, 18, -16),
    new THREE.Vector3(-22, 16, -62),
    new THREE.Vector3(-82, 26, -98),
    new THREE.Vector3(-42, 42, -172),
    new THREE.Vector3(38, 36, -210),
    new THREE.Vector3(96, 12, -168),
    new THREE.Vector3(64, -9, -92),
    new THREE.Vector3(16, -6, -4),
    new THREE.Vector3(-46, 12, 32),
  ]
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5)
}

export function findNearestT(curve: THREE.CatmullRomCurve3, target: THREE.Vector3, samples = 120): number {
  let bestT = 0
  let bestDist = Infinity
  const p = new THREE.Vector3()
  for (let i = 0; i < samples; i++) {
    const t = i / samples
    curve.getPointAt(t, p)
    const d = p.distanceToSquared(target)
    if (d < bestDist) {
      bestDist = d
      bestT = t
    }
  }
  return bestT
}

export const AUTO_SHOT_ORDER: ActiveShot[] = ['orbit', 'flank', 'dive', 'wide']
export const AUTO_SHOT_DURATION = 7.5

const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

/**
 * 计算导演模式各电影机位：
 * - 所有机位紧盯飞剑/剑主本体（避免窄屏手机上飞剑甩出左右视野）
 * - 当画布为竖屏（aspect < 1）时自动拉宽垂直视野与微调距离，确保飞剑 100% 稳居画面中心
 */
export function computeDirectorCamera(
  shot: ActiveShot,
  swordPos: THREE.Vector3,
  swordFwd: THREE.Vector3,
  elapsed: number,
  aspect: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): number {
  _right.crossVectors(swordFwd, _up).normalize()
  if (_right.lengthSq() < 1e-4) _right.set(1, 0, 0)

  const portraitBoost = aspect < 0.9 ? 1.25 : 1.0
  const fovBonus = aspect < 0.9 ? 10 : 0

  switch (shot) {
    case 'orbit': {
      const ang = elapsed * 0.45
      const r = 9.5 * portraitBoost
      outPos.set(
        swordPos.x + Math.cos(ang) * r,
        swordPos.y + 2.6 + Math.sin(elapsed * 0.6) * 1.1,
        swordPos.z + Math.sin(ang) * r,
      )
      // 紧盯飞剑中心偏前一点，绝不偏出屏幕
      outLook.copy(swordPos).addScaledVector(swordFwd, 0.8)
      return 52 + fovBonus
    }
    case 'dive': {
      const sway = Math.sin(elapsed * 0.85) * (aspect < 0.9 ? 0.9 : 1.6)
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, -8.5 * portraitBoost)
        .addScaledVector(_right, sway)
        .addScaledVector(_up, 3.2 + Math.cos(elapsed * 0.7) * 0.6)
      outLook.copy(swordPos).addScaledVector(swordFwd, 3.2)
      return 64 + fovBonus
    }
    case 'flank': {
      const side = Math.sin(elapsed * 0.25) >= 0 ? 1 : -1
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, 4.2 * portraitBoost)
        .addScaledVector(_right, side * 8.2 * portraitBoost)
        .addScaledVector(_up, 1.5 + Math.sin(elapsed * 0.8) * 0.8)
      outLook.copy(swordPos).addScaledVector(swordFwd, -0.5)
      return 50 + fovBonus
    }
    case 'wide': {
      const ang = elapsed * 0.18 + 0.8
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, -16 * portraitBoost)
        .addScaledVector(_right, Math.sin(ang) * 14 * portraitBoost)
        .addScaledVector(_up, 9.5)
      outLook.copy(swordPos).addScaledVector(swordFwd, 2.0)
      return 56 + fovBonus
    }
  }
}
