import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  Clapperboard,
  Compass,
  Eye,
  EyeOff,
  ImagePlus,
  Monitor,
  Moon,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Sunrise,
  Trash2,
  Upload,
  Video,
  Wind,
  X,
} from 'lucide-react'
import { WEATHER_PRESETS, type TimeOfDay } from '../config/theme'
import {
  useGameStore,
  type CameraShot,
  type RiderMode,
  type RiderPose,
  type RobeTheme,
  type ViewMode,
} from '../store/useGameStore'
import { useVideoRecorder } from '../features/video/useVideoRecorder'
import { processFaceAvatar, processStandeeImage, type CutoutMode } from '../features/avatar/imageCutout'

const SHOTS: { id: CameraShot; label: string }[] = [
  { id: 'auto', label: '自动' },
  { id: 'orbit', label: '环绕' },
  { id: 'flank', label: '掠影' },
  { id: 'dive', label: '俯冲' },
  { id: 'wide', label: '远景' },
]

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: 'third', label: '御剑跟拍' },
  { id: 'first', label: '踏剑第一' },
  { id: 'nose', label: '剑尖疾驰' },
]

const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'dawn', label: '晨曦' },
  { id: 'sunset', label: '暮霞' },
  { id: 'night', label: '月夜' },
]

const RIDER_MODES: { id: RiderMode; label: string }[] = [
  { id: 'none', label: '纯飞剑' },
  { id: '3d', label: '3D 剑仙' },
  { id: '2.5d', label: '上传人像' },
]

const POSES_3D: { id: RiderPose; label: string }[] = [
  { id: 'stand', label: '御风傲立' },
  { id: 'charge', label: '御剑疾驰' },
  { id: 'meditate', label: '浮空打坐' },
  { id: 'salute', label: '剑意致礼' },
]

const POSES_25D: { id: RiderPose; label: string }[] = [
  { id: 'stand', label: '御风直立' },
  { id: 'charge', label: '疾驰前倾' },
  { id: 'meditate', label: '浮空打坐' },
  { id: 'salute', label: '欢快摇摆' },
]

const ROBES: { id: RobeTheme; label: string; dot: string }[] = [
  { id: 'white', label: '白玉', dot: '#eae6dc' },
  { id: 'jade', label: '青莲', dot: '#5fe3d0' },
  { id: 'dark', label: '玄金', dot: '#8c2b22' },
]

const CUTOUT_MODES: { id: CutoutMode; label: string }[] = [
  { id: 'ai', label: 'AI 精准抠人' },
  { id: 'color', label: '白底卡通' },
  { id: 'none', label: '原图玉牌' },
]

function formatTime(sec: number): string {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * 极简国风 HUD（手机端极致清爽）：
 * - 屏幕上只常驻右上角 3 颗小按钮：【菜单】【录制】【清屏(小眼睛)】
 * - 所有同类切换（模式、机位、视角、时辰、剑色、剑主化身、画幅、回主峰、截图）全部收进「仙途菜单」抽屉
 * - 点击【清屏】一键隐藏全部按钮、标题与摇杆，仅留右上角一颗淡透小眼睛用于随时恢复
 */
export function HUD() {
  const mode = useGameStore((s) => s.mode)
  const menuOpen = useGameStore((s) => s.menuOpen)
  const viewMode = useGameStore((s) => s.viewMode)
  const shot = useGameStore((s) => s.shot)
  const aspect = useGameStore((s) => s.aspect)
  const swordTheme = useGameStore((s) => s.swordTheme)
  const timeOfDay = useGameStore((s) => s.timeOfDay)
  const riderMode = useGameStore((s) => s.riderMode)
  const riderPose = useGameStore((s) => s.riderPose)
  const robeTheme = useGameStore((s) => s.robeTheme)
  const faceImageUrl = useGameStore((s) => s.faceImageUrl)
  const standeeImageUrl = useGameStore((s) => s.standeeImageUrl)
  const standeeScale = useGameStore((s) => s.standeeScale)
  const hudVisible = useGameStore((s) => s.hudVisible)
  const speed = useGameStore((s) => s.speed)
  const boosting = useGameStore((s) => s.isBoosting)
  const isRecording = useGameStore((s) => s.isRecording)
  const recordSeconds = useGameStore((s) => s.recordSeconds)

  const setMode = useGameStore((s) => s.setMode)
  const toggleMenu = useGameStore((s) => s.toggleMenu)
  const setMenuOpen = useGameStore((s) => s.setMenuOpen)
  const setViewMode = useGameStore((s) => s.setViewMode)
  const setShot = useGameStore((s) => s.setShot)
  const setAspect = useGameStore((s) => s.setAspect)
  const toggleSwordTheme = useGameStore((s) => s.toggleSwordTheme)
  const cycleTimeOfDay = useGameStore((s) => s.cycleTimeOfDay)
  const setRiderMode = useGameStore((s) => s.setRiderMode)
  const setRiderPose = useGameStore((s) => s.setRiderPose)
  const setRobeTheme = useGameStore((s) => s.setRobeTheme)
  const setFaceImage = useGameStore((s) => s.setFaceImage)
  const setStandeeImage = useGameStore((s) => s.setStandeeImage)
  const setStandeeScale = useGameStore((s) => s.setStandeeScale)
  const toggleHud = useGameStore((s) => s.toggleHud)
  const triggerReset = useGameStore((s) => s.triggerReset)

  const { toggleRecording, captureScreenshot } = useVideoRecorder()

  const [cutoutMode, setCutoutMode] = useState<CutoutMode>('ai')
  const [busy, setBusy] = useState(false)
  const [tip, setTip] = useState<string | null>(null)
  const lastFileRef = useRef<File | null>(null)
  const faceInputRef = useRef<HTMLInputElement>(null)
  const standeeInputRef = useRef<HTMLInputElement>(null)

  // 全局快捷键：C 导演，V 视角，P 姿势，T 时辰，R 回主峰，H 隐藏界面
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const st = useGameStore.getState()
      if (e.code === 'KeyC') st.toggleMode()
      if (e.code === 'KeyV' && st.mode === 'free') st.cycleViewMode()
      if (e.code === 'KeyP' && st.riderMode !== 'none') st.cycleRiderPose()
      if (e.code === 'KeyT') st.cycleTimeOfDay()
      if (e.code === 'KeyR') st.triggerReset()
      if (e.code === 'KeyH') st.toggleHud()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleFaceUpload = async (file: File) => {
    setBusy(true)
    setTip(null)
    try {
      const url = await processFaceAvatar(file)
      setFaceImage(url)
      setRiderMode('3d')
    } catch {
      setTip('头像处理失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  const runStandee = async (file: File, cm: CutoutMode) => {
    setBusy(true)
    setTip(cm === 'ai' ? 'AI 抠图中（首次约 3~8 秒）…' : null)
    try {
      const res = await processStandeeImage(file, cm, 36)
      setStandeeImage(res.dataUrl, res.aspect)
      setRiderMode('2.5d')
      setTip(res.note ?? null)
    } catch {
      setTip('处理失败，请切换「原图玉牌」重试')
    } finally {
      setBusy(false)
    }
  }

  // 清屏模式：仅留右上角一颗极淡半透明恢复按钮（以及录制红点）
  if (!hudVisible) {
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-2 font-serif">
        {isRecording && (
          <div className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-[#ff8a8a]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4f]" />
            {formatTime(recordSeconds)}
          </div>
        )}
        <button
          type="button"
          data-ui-control="true"
          onClick={toggleHud}
          className="pointer-events-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/30 text-[#f3ead2]/75 backdrop-blur-sm transition hover:bg-black/55 hover:text-white"
          title="显示界面（快捷键 H）"
        >
          <Eye size={16} />
        </button>
      </div>
    )
  }

  const poses = riderMode === '2.5d' ? POSES_25D : POSES_3D

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-serif text-[#f3ead2]">
      {/* 左上：极简标题 */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <h1 className="text-lg tracking-[0.25em] drop-shadow-[0_2px_10px_rgba(12,20,28,0.85)] sm:text-2xl sm:tracking-[0.38em]">
          御剑·云海仙途
        </h1>
      </div>

      {/* 右上：仅常驻 3 颗极简按钮【菜单】【录制】【清屏】 */}
      <div className="pointer-events-auto fixed right-3 top-3 z-30 flex items-center gap-2 sm:right-6 sm:top-5">
        <button
          type="button"
          data-ui-control="true"
          onClick={toggleRecording}
          className={`xx-panel flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider transition ${
            isRecording
              ? 'border-[#ff6b6b] bg-[#521818]/80 text-[#ffb4b4]'
              : 'border-[#ffd27a]/65 text-[#ffd27a] hover:bg-[#3a2e16]/60'
          }`}
          title="一键录制 1080p 高清视频"
        >
          {isRecording ? (
            <>
              <Square size={11} className="fill-current" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff4d4f]" />
              {formatTime(recordSeconds)}
            </>
          ) : (
            <>
              <Video size={14} />
              录制
            </>
          )}
        </button>

        <button
          type="button"
          data-ui-control="true"
          onClick={toggleMenu}
          className={`xx-panel flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs tracking-wider transition ${
            menuOpen ? 'border-[#5fe3d0] text-[#5fe3d0]' : 'hover:border-[#ffd27a]'
          }`}
          title="展开/收起功能菜单"
        >
          <SlidersHorizontal size={14} />
          菜单
        </button>

        <button
          type="button"
          data-ui-control="true"
          onClick={() => {
            setMenuOpen(false)
            toggleHud()
          }}
          className="xx-panel flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition hover:border-[#ffd27a]"
          title="隐藏全部按钮（快捷键 H）"
        >
          <EyeOff size={15} />
        </button>
      </div>

      {/* 统一收纳抽屉菜单（支持手机端滚动，绝不占满屏幕） */}
      {menuOpen && (
        <div
          data-ui-control="true"
          className="xx-panel pointer-events-auto fixed right-3 top-14 z-30 max-h-[78vh] w-72 overflow-y-auto p-3.5 text-xs sm:right-6 sm:top-16"
        >
          <div className="mb-2.5 flex items-center justify-between border-b border-[#e8c878]/25 pb-2">
            <span className="text-sm tracking-widest text-[#ffd27a]">仙途控制</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="cursor-pointer rounded p-0.5 text-[#f3ead2]/70 hover:bg-white/10"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-3">
            {/* 1. 飞行模式 + 导演机位 */}
            <div>
              <div className="mb-1 text-[11px] text-[#e8d9a8]/75">飞行模式</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMode('free')}
                  className={`flex cursor-pointer items-center justify-center gap-1 rounded-xs border py-1.5 transition ${
                    mode === 'free' ? 'border-[#5fe3d0] bg-[#5fe3d0]/20 text-[#5fe3d0]' : 'border-white/15'
                  }`}
                >
                  <Wind size={13} /> 自由御剑
                </button>
                <button
                  type="button"
                  onClick={() => setMode('director')}
                  className={`flex cursor-pointer items-center justify-center gap-1 rounded-xs border py-1.5 transition ${
                    mode === 'director' ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15'
                  }`}
                >
                  <Clapperboard size={13} /> 电影导演
                </button>
              </div>
              {mode === 'director' && (
                <div className="mt-1.5 grid grid-cols-5 gap-1">
                  {SHOTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShot(s.id)}
                      className={`cursor-pointer rounded-xs border py-1 text-[10px] ${
                        shot === s.id ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15 text-[#f3ead2]/75'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. 自由视角切换 */}
            {mode === 'free' && (
              <div>
                <div className="mb-1 text-[11px] text-[#e8d9a8]/75">御剑视角</div>
                <div className="grid grid-cols-3 gap-1">
                  {VIEWS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setViewMode(v.id)}
                      className={`cursor-pointer rounded-xs border py-1 text-[11px] ${
                        viewMode === v.id ? 'border-[#5fe3d0] bg-[#5fe3d0]/20 text-[#5fe3d0]' : 'border-white/15'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 时辰天气 + 飞剑主题 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="mb-1 text-[11px] text-[#e8d9a8]/75">时辰气象</div>
                <button
                  type="button"
                  onClick={cycleTimeOfDay}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xs border border-white/20 py-1.5 hover:border-[#ffd27a]"
                >
                  {timeOfDay === 'dawn' ? (
                    <Sunrise size={13} className="text-[#ffd27a]" />
                  ) : timeOfDay === 'sunset' ? (
                    <Sun size={13} className="text-[#ff8a5c]" />
                  ) : (
                    <Moon size={13} className="text-[#a6cfff]" />
                  )}
                  {TIMES.find((t) => t.id === timeOfDay)?.label ?? WEATHER_PRESETS[timeOfDay].label}
                </button>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-[#e8d9a8]/75">飞剑流光</div>
                <button
                  type="button"
                  onClick={toggleSwordTheme}
                  className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xs border border-white/20 py-1.5 hover:border-[#ffd27a]"
                >
                  <Sparkles size={13} className={swordTheme === 'jade' ? 'text-[#5fe3d0]' : 'text-[#ffd27a]'} />
                  {swordTheme === 'jade' ? '青霜剑' : '太虚剑'}
                </button>
              </div>
            </div>

            {/* 4. 剑主化身（纯飞剑 / 3D剑仙 / 上传人像） */}
            <div className="border-t border-[#e8c878]/20 pt-2.5">
              <div className="mb-1.5 text-[11px] text-[#ffd27a]">剑主化身</div>
              <div className="grid grid-cols-3 gap-1">
                {RIDER_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRiderMode(m.id)}
                    className={`cursor-pointer rounded-xs border py-1.5 text-[11px] ${
                      riderMode === m.id ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]' : 'border-white/15'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {riderMode !== 'none' && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {poses.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setRiderPose(p.id)}
                      className={`cursor-pointer rounded-xs border py-1 text-[11px] ${
                        riderPose === p.id ? 'border-[#5fe3d0] bg-[#5fe3d0]/20 text-[#5fe3d0]' : 'border-white/15'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 3D 剑仙子选项 */}
              {riderMode === '3d' && (
                <div className="mt-2 space-y-2 rounded-xs bg-black/25 p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {ROBES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRobeTheme(r.id)}
                        className={`flex cursor-pointer items-center justify-center gap-1 rounded-xs border py-1 text-[10px] ${
                          robeTheme === r.id ? 'border-[#ffd27a] text-[#ffd27a]' : 'border-white/15'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: r.dot }} />
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <input
                    ref={faceInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleFaceUpload(f)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => faceInputRef.current?.click()}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xs border border-[#ffd27a]/60 py-1.5 text-[11px] text-[#ffd27a]"
                    >
                      <Upload size={12} /> {faceImageUrl ? '更换头像' : '上传头像换脸'}
                    </button>
                    {faceImageUrl && (
                      <button
                        type="button"
                        onClick={() => setFaceImage(null)}
                        className="cursor-pointer rounded-xs border border-white/20 px-2 text-[#ff9b9b]"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2.5D 上传人像子选项 */}
              {riderMode === '2.5d' && (
                <div className="mt-2 space-y-2 rounded-xs bg-black/25 p-2">
                  <input
                    ref={standeeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        lastFileRef.current = f
                        void runStandee(f, cutoutMode)
                      }
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => standeeInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xs border border-[#5fe3d0]/70 bg-[#143438]/60 py-1.5 text-[11px] text-[#5fe3d0]"
                  >
                    <ImagePlus size={13} />
                    {busy ? '处理中…' : standeeImageUrl ? '更换人像 / 卡通图' : '上传全身人像 / 卡通图'}
                  </button>
                  {tip && <div className="text-[10px] leading-relaxed text-[#ffd27a]">{tip}</div>}
                  <div className="grid grid-cols-3 gap-1">
                    {CUTOUT_MODES.map((cm) => (
                      <button
                        key={cm.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setCutoutMode(cm.id)
                          if (lastFileRef.current) void runStandee(lastFileRef.current, cm.id)
                        }}
                        className={`cursor-pointer rounded-xs border py-1 text-[10px] ${
                          cutoutMode === cm.id ? 'border-[#5fe3d0] bg-[#5fe3d0]/20 text-[#5fe3d0]' : 'border-white/15'
                        }`}
                      >
                        {cm.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-[#e8d9a8]/70">
                      <span>人物大小</span>
                      <span>{Math.round(standeeScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.6}
                      step={0.05}
                      value={standeeScale}
                      onChange={(e) => setStandeeScale(Number(e.target.value))}
                      className="w-full accent-[#ffd27a]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. 画幅 + 快捷工具 */}
            <div className="grid grid-cols-3 gap-1.5 border-t border-[#e8c878]/20 pt-2.5">
              <button
                type="button"
                onClick={() => setAspect(aspect === '16:9' ? '9:16' : '16:9')}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-xs border border-white/20 py-1.5 text-[11px]"
              >
                {aspect === '16:9' ? <Monitor size={12} /> : <Smartphone size={12} />}
                {aspect}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerReset()
                  setMenuOpen(false)
                }}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-xs border border-white/20 py-1.5 text-[11px]"
              >
                <Compass size={12} /> 回主峰
              </button>
              <button
                type="button"
                onClick={captureScreenshot}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-xs border border-white/20 py-1.5 text-[11px]"
              >
                <Camera size={12} /> 截图
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 左下：精简剑速 */}
      <div className="xx-panel absolute bottom-3 left-4 px-2.5 py-1 text-[11px] tracking-widest sm:bottom-5 sm:left-6 sm:px-3.5 sm:py-1.5 sm:text-xs">
        剑速 <span className="text-[#ffd27a]">{speed}</span>
        {boosting && <span className="ml-1.5 text-[#5fe3d0]">冲刺</span>}
      </div>

      {/* 电脑端底部按键提示（手机端自动隐藏） */}
      <div className="xx-panel absolute bottom-5 left-1/2 hidden -translate-x-1/2 whitespace-nowrap px-4 py-1.5 text-xs tracking-widest lg:block">
        <span className="xx-key">WASD</span> 御剑 <span className="xx-key">空格</span> 冲刺
        <span className="xx-key">V</span> 视角 <span className="xx-key">P</span> 姿势
        <span className="xx-key">T</span> 时辰 <span className="xx-key">C</span> 导演 <span className="xx-key">H</span> 清屏
      </div>
    </div>
  )
}
