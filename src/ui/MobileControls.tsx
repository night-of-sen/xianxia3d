import { useEffect, useRef, useState } from 'react'
import { Flame, Gamepad2, Smartphone } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { mobileInput, resetMobileInput } from '../store/mobileInput'
import { useGyroControl } from '../features/mobile/useGyroControl'

const MAX_RADIUS = 44

/**
 * 移动端触控与陀螺仪体感御剑界面（互斥不占空间）：
 * - 右下角提供单颗「操控方式」切换按钮：摇杆 / 陀螺仪 一键互斥切换
 * - 开启陀螺仪时自动隐藏左下角大摇杆，屏幕视野瞬间开阔
 * - 导演模式或清屏模式下全部隐藏
 */
export function MobileControls() {
  const mode = useGameStore((s) => s.mode)
  const hudVisible = useGameStore((s) => s.hudVisible)
  const mobileControlMode = useGameStore((s) => s.mobileControlMode)
  const setMobileControlMode = useGameStore((s) => s.setMobileControlMode)

  const [isTouch, setIsTouch] = useState(false)
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false })
  const [boostDown, setBoostDown] = useState(false)

  const baseRef = useRef<HTMLDivElement>(null)
  const joyPointerId = useRef<number | null>(null)
  const boostPointerId = useRef<number | null>(null)

  const gyro = useGyroControl()

  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
      const touchPoints = navigator.maxTouchPoints > 0
      setIsTouch(coarse || touchPoints)
    }
    check()
    window.addEventListener('resize', check)
    return () => {
      window.removeEventListener('resize', check)
      resetMobileInput()
    }
  }, [])

  // 当切到摇杆模式或导演模式时，自动关闭陀螺仪并清零摇杆
  useEffect(() => {
    if (mode !== 'free') {
      mobileInput.joyYaw = 0
      mobileInput.joyPitch = 0
      mobileInput.boosting = false
      setKnob({ x: 0, y: 0, active: false })
      setBoostDown(false)
    }
    if ((mode !== 'free' || mobileControlMode !== 'gyro') && gyro.enabled) {
      void gyro.toggle()
    }
  }, [mode, mobileControlMode, gyro.enabled])

  // 若陀螺仪因无传感器或拒权自动关闭，同步回摇杆模式
  useEffect(() => {
    if (gyro.statusMsg && mobileControlMode === 'gyro' && !gyro.enabled) {
      setMobileControlMode('joystick')
    }
  }, [gyro.statusMsg, gyro.enabled, mobileControlMode, setMobileControlMode])

  if (!isTouch || !hudVisible || mode !== 'free') return null

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = baseRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS
      dy = (dy / dist) * MAX_RADIUS
    }
    setKnob({ x: dx, y: dy, active: true })
    mobileInput.joyYaw = -(dx / MAX_RADIUS)
    mobileInput.joyPitch = -(dy / MAX_RADIUS)
  }

  const releaseJoystick = () => {
    joyPointerId.current = null
    setKnob({ x: 0, y: 0, active: false })
    mobileInput.joyYaw = 0
    mobileInput.joyPitch = 0
  }

  const handleToggleControl = async () => {
    if (mobileControlMode === 'joystick') {
      releaseJoystick()
      setMobileControlMode('gyro')
      if (!gyro.enabled) await gyro.toggle()
    } else {
      if (gyro.enabled) await gyro.toggle()
      setMobileControlMode('joystick')
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none font-serif">
      {/* 陀螺仪提示气泡 */}
      {gyro.statusMsg && (
        <div className="xx-panel fixed left-1/2 top-20 -translate-x-1/2 whitespace-nowrap px-4 py-2 text-xs tracking-wider text-[#ffd27a]">
          {gyro.statusMsg}
        </div>
      )}

      {/* 左下角：仅在「摇杆模式」下显示虚拟摇杆，开陀螺仪后自动隐藏腾出全屏空间 */}
      {mobileControlMode === 'joystick' && (
        <div
          ref={baseRef}
          data-ui-control="true"
          onPointerDown={(e) => {
            e.stopPropagation()
            if (joyPointerId.current !== null) return
            joyPointerId.current = e.pointerId
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            updateJoystick(e.clientX, e.clientY)
          }}
          onPointerMove={(e) => {
            if (e.pointerId !== joyPointerId.current) return
            e.stopPropagation()
            updateJoystick(e.clientX, e.clientY)
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== joyPointerId.current) return
            e.stopPropagation()
            releaseJoystick()
          }}
          onPointerCancel={(e) => {
            if (e.pointerId !== joyPointerId.current) return
            releaseJoystick()
          }}
          className="pointer-events-auto fixed bottom-14 left-5 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-[#e8c878]/50 bg-[#141a1e]/40 backdrop-blur-md"
        >
          <div className="pointer-events-none absolute inset-2.5 rounded-full border border-dashed border-[#e8c878]/25" />
          <span className="pointer-events-none absolute top-1.5 text-[10px] text-[#e8d9a8]/60">升</span>
          <span className="pointer-events-none absolute bottom-1.5 text-[10px] text-[#e8d9a8]/60">俯</span>
          <span className="pointer-events-none absolute left-2 text-[10px] text-[#e8d9a8]/60">左</span>
          <span className="pointer-events-none absolute right-2 text-[10px] text-[#e8d9a8]/60">右</span>

          <div
            style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
            className={`pointer-events-none h-11 w-11 rounded-full border transition-colors ${
              knob.active
                ? 'border-[#5fe3d0] bg-[#5fe3d0]/35 shadow-[0_0_16px_rgba(95,227,208,0.65)]'
                : 'border-[#ffd27a]/75 bg-[#ffd27a]/20'
            }`}
          />
        </div>
      )}

      {/* 右下角：单颗操控方式切换按钮（摇杆 ↔ 陀螺仪互斥） + 按住冲刺 */}
      <div className="pointer-events-auto fixed bottom-14 right-5 flex flex-col items-end gap-2.5">
        <button
          type="button"
          data-ui-control="true"
          onClick={(e) => {
            e.stopPropagation()
            void handleToggleControl()
          }}
          className={`xx-panel flex touch-none items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] tracking-wider transition ${
            mobileControlMode === 'gyro'
              ? 'border-[#5fe3d0] bg-[#143438]/75 text-[#5fe3d0]'
              : 'text-[#f3ead2]'
          }`}
        >
          {mobileControlMode === 'gyro' ? <Smartphone size={13} /> : <Gamepad2 size={13} />}
          {mobileControlMode === 'gyro' ? '体感中 · 切摇杆' : '摇杆中 · 切体感'}
        </button>

        <button
          type="button"
          data-ui-control="true"
          onPointerDown={(e) => {
            e.stopPropagation()
            boostPointerId.current = e.pointerId
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            mobileInput.boosting = true
            setBoostDown(true)
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== boostPointerId.current) return
            e.stopPropagation()
            boostPointerId.current = null
            mobileInput.boosting = false
            setBoostDown(false)
          }}
          onPointerCancel={() => {
            boostPointerId.current = null
            mobileInput.boosting = false
            setBoostDown(false)
          }}
          className={`flex h-16 w-16 touch-none flex-col items-center justify-center rounded-full border text-[11px] tracking-widest backdrop-blur-md transition ${
            boostDown
              ? 'scale-95 border-[#5fe3d0] bg-[#164246]/80 text-[#5fe3d0] shadow-[0_0_20px_rgba(95,227,208,0.65)]'
              : 'border-[#ffd27a]/65 bg-[#141a1e]/50 text-[#ffd27a]'
          }`}
        >
          <Flame size={18} />
          <span className="mt-0.5">冲刺</span>
        </button>
      </div>
    </div>
  )
}
