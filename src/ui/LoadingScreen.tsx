import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

/**
 * 国风仙侠真实进度加载幕布：
 * - React 挂载后立即无缝接管 index.html 的静态 #boot-loader
 * - 通过 useProgress 实时显示贴图 / HDR / 3D 模型加载百分比
 * - 加载完毕并稳帧后平滑淡出，彻底告别长时间黑屏
 */
export function LoadingScreen() {
  const { active, progress, loaded, total } = useProgress()
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [displayPct, setDisplayPct] = useState(12)

  // React 挂载后移除 index.html 的静态首屏，无缝衔接
  useEffect(() => {
    const boot = document.getElementById('boot-loader')
    if (boot) {
      boot.classList.add('fade-out')
      window.setTimeout(() => boot.remove(), 650)
    }
  }, [])

  // 平滑推进百分比（避免卡在 0% 或来回跳动）
  useEffect(() => {
    const target = !active && total > 0 ? 100 : Math.max(15, Math.round(progress))
    setDisplayPct((prev) => Math.max(prev, target))
  }, [active, progress, total])

  // 加载完毕或保底超时后优雅淡出
  useEffect(() => {
    const done = (!active && total > 0 && loaded >= total) || displayPct >= 100
    if (done) {
      const t1 = window.setTimeout(() => setFading(true), 350)
      const t2 = window.setTimeout(() => setVisible(false), 1050)
      return () => {
        window.clearTimeout(t1)
        window.clearTimeout(t2)
      }
    }
    // 兜底：若某些缓存场景下 total 始终为 0，2.2 秒后也淡出
    const fallback = window.setTimeout(() => {
      setDisplayPct(100)
      setFading(true)
      window.setTimeout(() => setVisible(false), 700)
    }, 2600)
    return () => window.clearTimeout(fallback)
  }, [active, loaded, total, displayPct])

  if (!visible) return null

  const statusText =
    displayPct < 40
      ? '正在绘制水墨远山与浮空仙岛…'
      : displayPct < 80
        ? '正在凝聚翻涌云海与晨曦灵光…'
        : '灵气已聚，御剑启程'

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center font-serif text-[#f3ead2] transition-opacity duration-700 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 42%, #1d3544 0%, #0e1b26 58%, #070d14 100%)',
      }}
    >
      {/* 旋转八卦灵阵 + 悬浮发光飞剑 */}
      <div className="relative flex h-36 w-36 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full animate-[spin_14s_linear_infinite]" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="56" stroke="rgba(255,210,122,0.6)" strokeWidth="1" strokeDasharray="6 4" />
          <circle cx="60" cy="60" r="46" stroke="rgba(95,227,208,0.5)" strokeWidth="1" strokeDasharray="14 6" />
        </svg>
        <svg
          className="absolute inset-0 h-full w-full animate-[spin_9s_linear_infinite_reverse]"
          viewBox="0 0 120 120"
          fill="none"
        >
          <polygon points="60,12 102,84 18,84" stroke="rgba(255,210,122,0.38)" strokeWidth="0.9" />
          <polygon points="60,108 18,36 102,36" stroke="rgba(95,227,208,0.38)" strokeWidth="0.9" />
        </svg>
        <svg
          className="h-20 w-9 animate-bounce drop-shadow-[0_0_14px_rgba(95,227,208,0.9)]"
          viewBox="0 0 40 90"
          fill="none"
        >
          <path d="M20 4 L25 18 L24 62 L16 62 L15 18 Z" fill="#5fe3d0" />
          <rect x="19" y="10" width="2" height="50" fill="#ffffff" />
          <rect x="9" y="61" width="22" height="4" rx="2" fill="#ffd27a" />
          <rect x="18" y="65" width="4" height="14" fill="#c89e52" />
          <circle cx="20" cy="82" r="3.5" fill="#ffd27a" />
        </svg>
      </div>

      <h2 className="mt-6 pl-[0.45em] text-2xl tracking-[0.45em] text-[#f7eed6] drop-shadow-[0_0_18px_rgba(255,210,122,0.5)] sm:text-3xl">
        御剑·云海仙途
      </h2>
      <p className="mt-2 text-xs tracking-[0.25em] text-[#e8d9a8]/80">{statusText}</p>

      {/* 鎏金流光进度条 */}
      <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-[#e8c878]/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#38e8d0] via-[#ffd27a] to-[#fff2cc] transition-all duration-300"
          style={{ width: `${displayPct}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] tracking-[0.3em] text-[#5fe3d0]">{displayPct}%</div>
    </div>
  )
}
