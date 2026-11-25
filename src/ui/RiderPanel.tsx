import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload, User, X } from 'lucide-react'
import { useGameStore, type RiderMode, type RiderPose, type RobeTheme } from '../store/useGameStore'
import { processFaceAvatar, processStandeeImage } from '../features/avatar/imageCutout'

const MODES: { id: RiderMode; label: string }[] = [
  { id: 'none', label: '纯飞剑' },
  { id: '3d', label: '3D 剑仙' },
  { id: '2.5d', label: '上传立绘' },
]

const POSES_3D: { id: RiderPose; label: string }[] = [
  { id: 'stand', label: '负手傲立' },
  { id: 'charge', label: '御剑前冲' },
  { id: 'meditate', label: '盘膝打坐' },
  { id: 'salute', label: '挥袖迎风' },
]

const POSES_25D: { id: RiderPose; label: string }[] = [
  { id: 'stand', label: '御风直立' },
  { id: 'charge', label: '疾驰前倾' },
  { id: 'meditate', label: '浮空打坐' },
  { id: 'salute', label: '欢快摇摆' },
]

const ROBES: { id: RobeTheme; label: string; dot: string }[] = [
  { id: 'white', label: '白衣剑仙', dot: '#eae6dc' },
  { id: 'jade', label: '青衣仙子', dot: '#5fe3d0' },
  { id: 'dark', label: '玄衣剑尊', dot: '#8c2b22' },
]

/** 国风剑主化身定制面板（A+B 融合：真 3D 剑仙换脸切姿 + 2.5D 上传人像/卡通立绘智能抠图） */
export function RiderPanel() {
  const open = useGameStore((s) => s.riderPanelOpen)
  const setOpen = useGameStore((s) => s.setRiderPanelOpen)
  const riderMode = useGameStore((s) => s.riderMode)
  const setRiderMode = useGameStore((s) => s.setRiderMode)
  const riderPose = useGameStore((s) => s.riderPose)
  const setRiderPose = useGameStore((s) => s.setRiderPose)
  const robeTheme = useGameStore((s) => s.robeTheme)
  const setRobeTheme = useGameStore((s) => s.setRobeTheme)
  const faceImageUrl = useGameStore((s) => s.faceImageUrl)
  const setFaceImage = useGameStore((s) => s.setFaceImage)
  const standeeImageUrl = useGameStore((s) => s.standeeImageUrl)
  const setStandeeImage = useGameStore((s) => s.setStandeeImage)
  const standeeScale = useGameStore((s) => s.standeeScale)
  const setStandeeScale = useGameStore((s) => s.setStandeeScale)

  const [removeBg, setRemoveBg] = useState(true)
  const [tolerance, setTolerance] = useState(36)
  const [busy, setBusy] = useState(false)
  const lastFileRef = useRef<File | null>(null)
  const faceInputRef = useRef<HTMLInputElement>(null)
  const standeeInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFaceUpload = async (file: File) => {
    setBusy(true)
    try {
      const url = await processFaceAvatar(file)
      setFaceImage(url)
      setRiderMode('3d')
    } finally {
      setBusy(false)
    }
  }

  const runStandeeProcess = async (file: File, cut: boolean, tol: number) => {
    setBusy(true)
    try {
      const res = await processStandeeImage(file, cut, tol)
      setStandeeImage(res.dataUrl, res.aspect)
      setRiderMode('2.5d')
    } finally {
      setBusy(false)
    }
  }

  const handleStandeeUpload = async (file: File) => {
    lastFileRef.current = file
    await runStandeeProcess(file, removeBg, tolerance)
  }

  const poses = riderMode === '2.5d' ? POSES_25D : POSES_3D

  return (
    <div
      data-ui-control="true"
      className="xx-panel pointer-events-auto fixed right-3 top-20 z-30 w-72 p-4 font-serif text-xs text-[#f3ead2] sm:right-6 sm:top-20"
    >
      {/* 标题栏 */}
      <div className="mb-3 flex items-center justify-between border-b border-[#e8c878]/25 pb-2">
        <div className="flex items-center gap-1.5 text-sm tracking-widest text-[#ffd27a]">
          <User size={15} />
          剑主化身
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded p-0.5 text-[#f3ead2]/70 hover:bg-white/10 hover:text-white"
        >
          <X size={15} />
        </button>
      </div>

      {/* 1. 形态切换 */}
      <div className="mb-3">
        <div className="mb-1.5 text-[11px] tracking-wider text-[#e8d9a8]/75">化身形态</div>
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setRiderMode(m.id)}
              className={`cursor-pointer rounded-xs border py-1.5 text-center tracking-wider transition ${
                riderMode === m.id
                  ? 'border-[#ffd27a] bg-[#ffd27a]/20 text-[#ffd27a]'
                  : 'border-[#e8c878]/25 text-[#f3ead2]/80 hover:border-[#e8c878]/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 姿势切换（3D 与 2.5D 均支持，快捷键 P） */}
      {riderMode !== 'none' && (
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] tracking-wider text-[#e8d9a8]/75">
            <span>御剑姿势</span>
            <span className="text-[10px] text-[#5fe3d0]">按 P 快捷切换</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {poses.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRiderPose(p.id)}
                className={`cursor-pointer rounded-xs border py-1.5 text-center tracking-wider transition ${
                  riderPose === p.id
                    ? 'border-[#5fe3d0] bg-[#5fe3d0]/20 text-[#5fe3d0]'
                    : 'border-[#e8c878]/25 text-[#f3ead2]/80 hover:border-[#e8c878]/60'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. 方案 B：3D 剑仙专属（衣袍配色 + 上传换头像） */}
      {riderMode === '3d' && (
        <div className="space-y-3 border-t border-[#e8c878]/20 pt-3">
          <div>
            <div className="mb-1.5 text-[11px] tracking-wider text-[#e8d9a8]/75">仙袍配色</div>
            <div className="grid grid-cols-3 gap-1.5">
              {ROBES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRobeTheme(r.id)}
                  className={`flex cursor-pointer items-center justify-center gap-1 rounded-xs border py-1.5 text-[11px] transition ${
                    robeTheme === r.id
                      ? 'border-[#ffd27a] bg-[#ffd27a]/15 text-[#ffd27a]'
                      : 'border-[#e8c878]/25 text-[#f3ead2]/80'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full border border-white/40" style={{ background: r.dot }} />
                  {r.label.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] tracking-wider text-[#e8d9a8]/75">自定义头像（自拍 / 卡通）</div>
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
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => faceInputRef.current?.click()}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xs border border-[#ffd27a]/60 bg-[#3a2e16]/50 py-2 tracking-wider text-[#ffd27a] transition hover:bg-[#4e3d1d]/70"
              >
                <Upload size={13} />
                {busy ? '处理中...' : faceImageUrl ? '更换头像' : '上传头像换脸'}
              </button>
              {faceImageUrl && (
                <button
                  type="button"
                  onClick={() => setFaceImage(null)}
                  className="cursor-pointer rounded-xs border border-white/20 px-2.5 text-[#f3ead2]/70 hover:border-[#ff7b7b] hover:text-[#ff7b7b]"
                  title="恢复默认面容"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 方案 A：2.5D 上传全身人像/卡通立绘专属 */}
      {riderMode === '2.5d' && (
        <div className="space-y-3 border-t border-[#e8c878]/20 pt-3">
          <input
            ref={standeeInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleStandeeUpload(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => standeeInputRef.current?.click()}
            className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xs border border-[#5fe3d0]/70 bg-[#143438]/60 py-2 tracking-wider text-[#5fe3d0] transition hover:bg-[#1a474c]/80"
          >
            <ImagePlus size={14} />
            {busy ? '抠图处理中...' : standeeImageUrl ? '更换全身人像 / 卡通图' : '上传全身人像 / 卡通图'}
          </button>

          {/* 智能去背景开关与容差 */}
          <div className="space-y-2 rounded-xs bg-black/25 p-2.5">
            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-[11px] text-[#e8d9a8]/85">智能去纯色背景（PNG自动透明）</span>
              <input
                type="checkbox"
                checked={removeBg}
                onChange={(e) => {
                  const next = e.target.checked
                  setRemoveBg(next)
                  if (lastFileRef.current) void runStandeeProcess(lastFileRef.current, next, tolerance)
                }}
                className="accent-[#5fe3d0]"
              />
            </label>
            {removeBg && (
              <div>
                <div className="mb-1 flex justify-between text-[10px] text-[#e8d9a8]/70">
                  <span>抠图容差</span>
                  <span>{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={85}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  onMouseUp={() => {
                    if (lastFileRef.current) void runStandeeProcess(lastFileRef.current, removeBg, tolerance)
                  }}
                  onTouchEnd={() => {
                    if (lastFileRef.current) void runStandeeProcess(lastFileRef.current, removeBg, tolerance)
                  }}
                  className="w-full accent-[#5fe3d0]"
                />
              </div>
            )}
            <div>
              <div className="mb-1 flex justify-between text-[10px] text-[#e8d9a8]/70">
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
        </div>
      )}
    </div>
  )
}
