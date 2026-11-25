import { useEffect } from 'react'
import {
  Camera,
  Clapperboard,
  Compass,
  Eye,
  Monitor,
  Moon,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Sunrise,
  Video,
  Wind,
} from 'lucide-react'
import { WEATHER_PRESETS } from '../config/theme'
import { useGameStore, type CameraShot, type ViewMode } from '../store/useGameStore'
import { useVideoRecorder } from '../features/video/useVideoRecorder'

const SHOTS: { id: CameraShot; label: string }[] = [
  { id: 'auto', label: '自动轮播' },
  { id: 'orbit', label: '环绕特写' },
  { id: 'flank', label: '侧翼掠影' },
  { id: 'dive', label: '俯冲穿云' },
  { id: 'wide', label: '水墨远景' },
]

const SHOT_LABEL: Record<string, string> = {
  orbit: '环绕特写',
  flank: '侧翼掠影',
  dive: '俯冲穿云',
  wide: '水墨远景',
}

const VIEW_LABEL: Record<ViewMode, string> = {
  third: '御剑跟拍',
  first: '踏剑第一人称',
  nose: '剑尖疾驰',
}

function formatTime(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

/** 国风极简 HUD：御剑信息 + 视角/导演机位控制 + 一键高清录屏与画幅切换 */
export function HUD() {
  const mode = useGameStore((s) => s.mode)
  const viewMode = useGameStore((s) => s.viewMode)
  const shot = useGameStore((s) => s.shot)
  const activeShot = useGameStore((s) => s.activeShot)
  const aspect = useGameStore((s) => s.aspect)
  const swordTheme = useGameStore((s) => s.swordTheme)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const hudVisible = useGameStore((s) => s.hudVisible)
  const speed = useGameStore((s) => s.speed)
  const boosting = useGameStore((s) => s.isBoosting)
  const isRecording = useGameStore((s) => s.isRecording)
  const recordSeconds = useGameStore((s) => s.recordSeconds)

  const toggleMode = useGameStore((s) => s.toggleMode)
  const cycleViewMode = useGameStore((s) => s.cycleViewMode)
  const setShot = useGameStore((s) => s.setShot)
  const setAspect = useGameStore((s) => s.setAspect)
  const toggleSwordTheme = useGameStore((s) => s.toggleSwordTheme)
  const cycleTimeOfDay = useGameStore((s) => s.cycleTimeOfDay)
  const triggerReset = useGameStore((s) => s.triggerReset)

  const { toggleRecording, captureScreenshot } = useVideoRecorder()

  // 全局快捷键：C 切换导演模式，V 切换视角，R 回到主峰，H 隐藏界面
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const st = useGameStore.getState()
      if (e.code === 'KeyC') st.toggleMode()
      if (e.code === 'KeyV' && st.mode === 'free') st.cycleViewMode()
      if (e.code === 'KeyT') st.cycleTimeOfDay()
      if (e.code === 'KeyR') st.triggerReset()
      if (e.code === 'KeyH') st.toggleHud()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!hudVisible) {
    return isRecording ? (
      <div className="pointer-events-none fixed right-6 top-6 flex items-center gap-2 rounded-sm bg-black/50 px-3 py-1.5 font-serif text-xs tracking-widest text-[#ff7b7b]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4f]" />
        录制中 {formatTime(recordSeconds)}
      </div>
    ) : null
  }

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-serif text-[#f3ead2]">
      {/* 左上：标题（加柔和文字阴影确保在亮天色下清晰可读） */}
      <div className="absolute left-6 top-6">
        <h1 className="text-3xl tracking-[0.4em] drop-shadow-[0_2px_10px_rgba(12,20,28,0.85)]">御剑·云海仙途</h1>
        <p className="mt-1 text-xs tracking-[0.3em] text-[#f5e6be] drop-shadow-[0_1px_6px_rgba(12,20,28,0.9)]">
          XIANXIA · SWORD FLIGHT
        </p>
      </div>

      {/* 右上：核心功能工具栏 */}
      <div className="pointer-events-auto absolute right-6 top-6 flex flex-col items-end gap-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* 模式切换 */}
          <button
            type="button"
            onClick={toggleMode}
            className={`xx-panel flex cursor-pointer items-center gap-2 px-3.5 py-2 text-xs tracking-widest transition hover:border-[#ffd27a] ${
              mode === 'director' ? 'border-[#ffd27a] text-[#ffd27a]' : ''
            }`}
            title="按 C 键快速切换"
          >
            {mode === 'free' ? <Wind size={15} /> : <Clapperboard size={15} />}
            {mode === 'free' ? '自由御剑' : '电影导演'}
          </button>

          {/* 自由模式视角切换（按 V） */}
          {mode === 'free' && (
            <button
              type="button"
              onClick={cycleViewMode}
              className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
              title="按 V 键切换御剑视角"
            >
              <Eye size={14} className="text-[#5fe3d0]" />
              {VIEW_LABEL[viewMode]}
            </button>
          )}

          {/* 一键回主峰（按 R） */}
          {mode === 'free' && (
            <button
              type="button"
              onClick={triggerReset}
              className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
              title="按 R 键快速返回主仙山亭台前"
            >
              <Compass size={14} />
              回主峰
            </button>
          )}

          {/* 时辰天气切换（按 T：晨曦 / 暮霞 / 月夜） */}
          <button
            type="button"
            onClick={cycleTimeOfDay}
            className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
            title="按 T 键切换时辰（晨曦青绿 / 残阳暮霞 / 月夜星海）"
          >
            {timeOfDay === 'dawn' ? (
              <Sunrise size={14} className="text-[#ffd27a]" />
            ) : timeOfDay === 'sunset' ? (
              <Sun size={14} className="text-[#ff8a5c]" />
            ) : (
              <Moon size={14} className="text-[#a6cfff]" />
            )}
            {WEATHER_PRESETS[timeOfDay].label}
          </button>

          {/* 飞剑换色 */}
          <button
            type="button"
            onClick={toggleSwordTheme}
            className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
            title="切换飞剑流光主题"
          >
            <Sparkles size={14} className={swordTheme === 'jade' ? 'text-[#5fe3d0]' : 'text-[#ffd27a]'} />
            {swordTheme === 'jade' ? '青霜剑' : '太虚剑'}
          </button>

          {/* 画幅切换（16:9 / 9:16 竖屏短视频） */}
          <button
            type="button"
            onClick={() => setAspect(aspect === '16:9' ? '9:16' : '16:9')}
            className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
            title="切换横屏影院 / 竖屏短视频画幅"
          >
            {aspect === '16:9' ? <Monitor size={14} /> : <Smartphone size={14} />}
            {aspect === '16:9' ? '16:9 横屏' : '9:16 竖屏'}
          </button>

          {/* 一键截图 */}
          <button
            type="button"
            onClick={captureScreenshot}
            className="xx-panel flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs tracking-widest transition hover:border-[#ffd27a]"
            title="保存高清 PNG 截图"
          >
            <Camera size={14} />
            截图
          </button>

          {/* 一键高清录制 */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`xx-panel flex cursor-pointer items-center gap-2 px-4 py-2 text-xs tracking-widest transition ${
              isRecording
                ? 'border-[#ff6b6b] bg-[#521818]/75 text-[#ffb4b4]'
                : 'border-[#ffd27a]/70 text-[#ffd27a] hover:bg-[#3a2e16]/60'
            }`}
            title="录制纯净 60fps 高清视频（自动隐藏界面按钮）"
          >
            {isRecording ? (
              <>
                <Square size={12} className="fill-current" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4f]" />
                停止 {formatTime(recordSeconds)}
              </>
            ) : (
              <>
                <Video size={14} />
                一键录制
              </>
            )}
          </button>
        </div>

        {/* 导演模式专属：机位选择条 */}
        {mode === 'director' && (
          <div className="xx-panel flex items-center gap-1 px-2 py-1.5 text-xs tracking-wider">
            {SHOTS.map((item) => {
              const selected = shot === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setShot(item.id)}
                  className={`cursor-pointer rounded-xs px-2.5 py-1 transition ${
                    selected
                      ? 'bg-[#ffd27a]/20 text-[#ffd27a]'
                      : 'text-[#f3ead2]/75 hover:bg-white/10 hover:text-[#f3ead2]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
            {shot === 'auto' && (
              <span className="ml-1.5 border-l border-[#e8c878]/30 pl-2 text-[11px] text-[#5fe3d0]">
                当前：{SHOT_LABEL[activeShot]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 左下：速度 */}
      <div className="xx-panel absolute bottom-6 left-6 px-4 py-2 text-sm tracking-widest">
        剑速 <span className="text-[#ffd27a]">{speed}</span>
        {boosting && <span className="ml-2 text-[#5fe3d0]">冲刺</span>}
      </div>

      {/* 底部：按键提示 */}
      <div className="xx-panel absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap px-5 py-2 text-xs tracking-widest lg:block">
        <span className="xx-key">WASD</span> 御剑 <span className="xx-key">空格</span> 冲刺
        <span className="xx-key">V</span> 视角 <span className="xx-key">T</span> 时辰
        <span className="xx-key">R</span> 主峰 <span className="xx-key">C</span> 导演 <span className="xx-key">H</span> 隐藏
      </div>
    </div>
  )
}
