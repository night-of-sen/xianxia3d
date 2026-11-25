import { XianxiaScene } from './scene/XianxiaScene'
import { HUD } from './ui/HUD'
import { MobileControls } from './ui/MobileControls'
import { LoadingScreen } from './ui/LoadingScreen'
import { useGameStore } from './store/useGameStore'

export default function App() {
  const aspect = useGameStore((s) => s.aspect)
  const isVertical = aspect === '9:16'

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#0c1720]">
      {/* 16:9 全屏横屏 / 9:16 竖屏短视频原生画布比例（录制即所得） */}
      <div
        className={
          isVertical
            ? 'relative h-full max-w-full aspect-[9/16] shadow-[0_0_60px_rgba(0,0,0,0.85)] ring-1 ring-[#e8c878]/35'
            : 'relative h-full w-full'
        }
      >
        <XianxiaScene />
      </div>
      <HUD />
      <MobileControls />
      <LoadingScreen />
    </div>
  )
}
