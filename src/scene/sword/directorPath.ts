import * as THREE from 'three'
import type { ActiveShot } from '../../store/useGameStore'

/**
 * 导演模式 3D 自动巡航闭环样条路径：
 * 掠过主仙山亭台 → 穿越悬空石桥 → 环绕中景群岛 → 俯冲贴近翻涌云海 → 破云爬升回主峰
 */
export function createDirectorCurve(): THREE.CatmullRomCurve3 {
  const pts = [
    new THREE.Vector3(0, 15, 34), // 起势：正对主仙山亭台
    new THREE.Vector3(24, 18, -16), // 掠过主峰右侧飞檐
    new THREE.Vector3(-22, 16, -62), // 穿越主岛与二号岛石桥上方
    new THREE.Vector3(-82, 26, -98), // 绕行二号岛峭壁
    new THREE.Vector3(-42, 42, -172), // 爬升俯瞰四号巨岛
    new THREE.Vector3(38, 36, -210), // 穿行中远景仙山之间
    new THREE.Vector3(96, 12, -168), // 俯冲掠过三号岛悬瀑
    new THREE.Vector3(64, -9, -92), // 低空贴近云海穿云破雾
    new THREE.Vector3(16, -6, -4), // 贴云滑行
    new THREE.Vector3(-46, 12, 32), // 破云拉升，回望仙山群
  ]
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5)
}

/** 在闭合样条曲线上查找距离给定点最近的参数 t ∈ [0, 1) */
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
export const AUTO_SHOT_DURATION = 7.5 // 每个电影镜头自动停留秒数

export interface ShotResult {
  camPos: THREE.Vector3
  lookAt: THREE.Vector3
  fov: number
}

const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

/**
 * 计算导演模式各电影机位的目标位置、注视点与视野：
 * - orbit: 360° 优雅环绕特写
 * - dive : 尾翼俯冲穿云（强速度感）
 * - flank: 侧前方低角度高速掠影
 * - wide : 宏阔水墨大远景
 */
export function computeDirectorCamera(
  shot: ActiveShot,
  swordPos: THREE.Vector3,
  swordFwd: THREE.Vector3,
  elapsed: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): number {
  _right.crossVectors(swordFwd, _up).normalize()
  if (_right.lengthSq() < 1e-4) _right.set(1, 0, 0)

  switch (shot) {
    case 'orbit': {
      const ang = elapsed * 0.48
      const r = 10.5
      outPos.set(
        swordPos.x + Math.cos(ang) * r,
        swordPos.y + 2.8 + Math.sin(elapsed * 0.6) * 1.4,
        swordPos.z + Math.sin(ang) * r,
      )
      outLook.copy(swordPos).addScaledVector(swordFwd, 2.5)
      return 50
    }
    case 'dive': {
      // 略高于剑尾并随呼吸轻微摆动，强化俯冲穿云的冲击力
      const sway = Math.sin(elapsed * 0.9) * 1.8
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, -8.5)
        .addScaledVector(_right, sway)
        .addScaledVector(_up, 3.6 + Math.cos(elapsed * 0.7) * 0.8)
      outLook.copy(swordPos).addScaledVector(swordFwd, 18)
      return 68
    }
    case 'flank': {
      // 侧前方回望飞剑与流光拖尾，构图极具电影感
      const side = Math.sin(elapsed * 0.25) >= 0 ? 1 : -1
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, 5.5)
        .addScaledVector(_right, side * 9.5)
        .addScaledVector(_up, 1.4 + Math.sin(elapsed * 0.8) * 1.0)
      outLook.copy(swordPos).addScaledVector(swordFwd, -2.5)
      return 48
    }
    case 'wide': {
      // 拉开远景，呈现“一剑霜寒十四州”的山水留白
      const ang = elapsed * 0.18 + 0.8
      outPos
        .copy(swordPos)
        .addScaledVector(swordFwd, -20)
        .addScaledVector(_right, Math.sin(ang) * 24)
        .addScaledVector(_up, 11)
      outLook.copy(swordPos).addScaledVector(swordFwd, 10)
      return 58
    }
  }
}
