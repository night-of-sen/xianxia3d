import { useCallback, useEffect, useRef, useState } from 'react'
import { mobileInput } from '../../store/mobileInput'

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function applyDeadzone(val: number, deadzone: number, maxAngle: number): number {
  const abs = Math.abs(val)
  if (abs <= deadzone) return 0
  return Math.sign(val) * clamp((abs - deadzone) / (maxAngle - deadzone), 0, 1)
}

/**
 * 手机陀螺仪体感御剑 Hook：
 * - 自动兼容 iOS 13+ 权限申请（需在用户点击按钮的回调内调用）
 * - 开启瞬间自动记录当前握持角度为零点（基准校准），无论躺着/坐着/横屏/竖屏都顺手
 * - 内置死区与平滑低通滤波，手微抖不晃动
 */
export function useGyroControl() {
  const [enabled, setEnabled] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const baseRef = useRef<{ beta: number; gamma: number } | null>(null)
  const smoothRef = useRef({ yaw: 0, pitch: 0 })

  const disable = useCallback(() => {
    setEnabled(false)
    baseRef.current = null
    smoothRef.current = { yaw: 0, pitch: 0 }
    mobileInput.gyroYaw = 0
    mobileInput.gyroPitch = 0
  }, [])

  const toggle = useCallback(async () => {
    if (enabled) {
      disable()
      return
    }

    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setStatusMsg('当前设备不支持陀螺仪')
      return
    }

    const DOE = window.DeviceOrientationEvent as DeviceOrientationWithPermission
    if (typeof DOE.requestPermission === 'function') {
      try {
        const res = await DOE.requestPermission()
        if (res !== 'granted') {
          setStatusMsg('未获得陀螺仪权限，请在浏览器设置中允许动作与方向访问')
          return
        }
      } catch {
        setStatusMsg('陀螺仪权限申请失败（需在 HTTPS 环境下点击开启）')
        return
      }
    }

    baseRef.current = null
    setStatusMsg(null)
    setEnabled(true)
  }, [enabled, disable])

  useEffect(() => {
    if (!enabled) return

    let gotData = false
    const timer = window.setTimeout(() => {
      if (!gotData) {
        setStatusMsg('未检测到陀螺仪传感器信号（电脑端请使用键鼠）')
        disable()
      }
    }, 1800)

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      gotData = true

      // 自动以开启瞬间握持角度作为中立零点
      if (!baseRef.current) {
        baseRef.current = { beta: e.beta, gamma: e.gamma }
        return
      }

      const dBeta = e.beta - baseRef.current.beta
      const dGamma = e.gamma - baseRef.current.gamma

      // 适配竖屏与横屏方向
      const angle = window.screen?.orientation?.angle ?? 0
      let rawRoll: number
      let rawPitch: number
      if (angle === 90) {
        // 横屏左转
        rawRoll = dBeta
        rawPitch = -dGamma
      } else if (angle === -90 || angle === 270) {
        // 横屏右转
        rawRoll = -dBeta
        rawPitch = dGamma
      } else {
        // 竖屏
        rawRoll = dGamma
        rawPitch = dBeta
      }

      // 向左倾斜(rawRoll < 0) → 左转(+yaw)；手机后仰(rawPitch > 0) → 拉升(+pitch)
      const targetYaw = -applyDeadzone(rawRoll, 4, 30)
      const targetPitch = applyDeadzone(rawPitch, 4, 26)

      // 柔和低通滤波
      smoothRef.current.yaw += (targetYaw - smoothRef.current.yaw) * 0.25
      smoothRef.current.pitch += (targetPitch - smoothRef.current.pitch) * 0.25

      mobileInput.gyroYaw = smoothRef.current.yaw
      mobileInput.gyroPitch = smoothRef.current.pitch
    }

    window.addEventListener('deviceorientation', onOrientation)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('deviceorientation', onOrientation)
      mobileInput.gyroYaw = 0
      mobileInput.gyroPitch = 0
    }
  }, [enabled, disable])

  // 自动清除提示
  useEffect(() => {
    if (!statusMsg) return
    const id = window.setTimeout(() => setStatusMsg(null), 3200)
    return () => window.clearTimeout(id)
  }, [statusMsg])

  return { enabled, toggle, statusMsg }
}
