import { useEffect, useRef, useState } from 'react'
import { Flame, Smartphone } from 'lucide-react'
import { useGameStore } from '../store/useGameStore'
import { mobileInput, resetMobileInput } from '../store/mobileInput'
import { useGyroControl } from '../features/mobile/useGyroControl'

const MAX_RADIUS = 44

/**
 * 移动端触控与陀螺仪体感御剑界面：
 * - 自动检测触屏设备（pointer: coarse / maxTouchPoints > 0）显示
 * - 左下角：国风鎏金虚拟摇杆（多点触控，控制转向与俯仰）
 * - 右下角：按住冲刺按钮 + 陀螺仪体感御剑开关（含自动握持角度校准）
 */
export function MobileControls() {
  const mode = useGameStore((s) => s.mode)
  const hudVisible = useGameStore((s) => s.hudVisible)

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

  // 切到导演模式时清零摇杆与冲刺
  useEffect(() => {
    if (mode !== 'free') {
      mobileInput.joyYaw = 0
      mobileInput.joyPitch = 0
      mobileInput.boosting = false
      setKnob({ x: 0, y: 0, active: false })
      setBoostDown(false)
    }
  }, [mode])

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
    // 左滑(dx<0) → 左转(+yaw)；下推(dy>0) → 拉升(+pitch)，上推(dy<0) → 俯冲(-pitch)
    mobileInput.joyYaw = -(dx / MAX_RADIUS)
    mobileInput.joyPitch = dy / MAX_RADIUS
  }

  const releaseJoystick = () => {
    joyPointerId.current = null
    setKnob({ x: 0, y: 0, active: false })
    mobileInput.joyYaw = 0
    mobileInput.joyPitch = 0
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none font-serif">
      {/* 陀螺仪提示气泡 */}
      {gyro.statusMsg && (
        <div className="xx-panel fixed left-1/2 top-24 -translate-x-1/2 whitespace-nowrap px-4 py-2 text-xs tracking-wider text-[#ffd27a]">
          {gyro.statusMsg}
        </div>
      )}

      {/* 左下角：国风鎏金虚拟摇杆 */}
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
        className="pointer-events-auto fixed bottom-16 left-6 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-[#e8c878]/50 bg-[#141a1e]/45 backdrop-blur-md"
      >
        {/* 十字罗盘刻度 */}
        <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-[#e8c878]/25" />
        <span className="pointer-events-none absolute top-2 text-[10px] text-[#e8d9a8]/60">俯</span>
        <span className="pointer-events-none absolute bottom-2 text-[10px] text-[#e8d9a8]/60">升</span>
        <span className="pointer-events-none absolute left-2.5 text-[10px] text-[#e8d9a8]/60">左</span>
        <span className="pointer-events-none absolute right-2.5 text-[10px] text-[#e8d9a8]/60">右</span>

        {/* 摇杆圆心 */}
        <div
          style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
          className={`pointer-events-none h-12 w-12 rounded-full border transition-colors ${
            knob.active
              ? 'border-[#5fe3d0] bg-[#5fe3d0]/35 shadow-[0_0_16px_rgba(95,227,208,0.65)]'
              : 'border-[#ffd27a]/75 bg-[#ffd27a]/20'
          }`}
        />
      </div>

      {/* 右下角：陀螺仪开关 + 按住冲刺按钮 */}
      <div className="pointer-events-auto fixed bottom-16 right-6 flex flex-col items-end gap-3">
        {/* 陀螺仪体感按钮 */}
        <button
          type="button"
          data-ui-control="true"
          onClick={(e) => {
            e.stopPropagation()
            void gyro.toggle()
          }}
          className={`xx-panel flex touch-none items-center gap-1.5 rounded-full px-3.5 py-2 text-xs tracking-widest transition ${
            gyro.enabled
              ? 'border-[#5fe3d0] bg-[#143438]/75 text-[#5fe3d0] shadow-[0_0_14px_rgba(95,227,208,0.45)]'
              : 'text-[#f3ead2]'
          }`}
        >
          <Smartphone size={14} />
          {gyro.enabled ? '体感已开' : '陀螺仪'}
        </button>

        {/* 按住加速冲刺 */}
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
          className={`flex h-20 w-20 touch-none flex-col items-center justify-center rounded-full border text-xs tracking-widest backdrop-blur-md transition ${
            boostDown
              ? 'scale-95 border-[#5fe3d0] bg-[#164246]/80 text-[#5fe3d0] shadow-[0_0_24px_rgba(95,227,208,0.65)]'
              : 'border-[#ffd27a]/65 bg-[#141a1e]/55 text-[#ffd27a]'
          }`}
        >
          <Flame size={20} />
          <span className="mt-0.5">冲刺</span>
        </button>
      </div>
    </div>
  )
}
