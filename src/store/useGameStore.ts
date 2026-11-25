import { create } from 'zustand'
import type { TimeOfDay } from '../config/theme'

/** 游戏模式：free = 自由御剑；director = 电影导演自动运镜 */
export type GameMode = 'free' | 'director'
/** 导演模式机位 */
export type CameraShot = 'auto' | 'orbit' | 'dive' | 'flank' | 'wide'
/** 实际生效的具体机位（用于 auto 模式下在 HUD 提示当前镜头） */
export type ActiveShot = Exclude<CameraShot, 'auto'>
/** 输出画幅 */
export type AspectRatio = '16:9' | '9:16'
/** 飞剑主题 */
export type SwordTheme = 'jade' | 'gold'
/** 自由模式视角：third = 御剑跟拍；first = 踏剑第一人称；nose = 剑尖疾驰 */
export type ViewMode = 'third' | 'first' | 'nose'

interface GameState {
  mode: GameMode
  viewMode: ViewMode
  shot: CameraShot
  activeShot: ActiveShot
  aspect: AspectRatio
  swordTheme: SwordTheme
  timeOfDay: TimeOfDay
  isBoosting: boolean
  isRecording: boolean
  recordSeconds: number
  hudVisible: boolean
  resetToken: number
  /** 实时速度（仅供 HUD 显示，由 useFrame 低频写入） */
  speed: number

  toggleMode: () => void
  setMode: (mode: GameMode) => void
  cycleViewMode: () => void
  setViewMode: (v: ViewMode) => void
  setShot: (shot: CameraShot) => void
  setActiveShot: (shot: ActiveShot) => void
  setAspect: (aspect: AspectRatio) => void
  toggleSwordTheme: () => void
  cycleTimeOfDay: () => void
  setBoosting: (v: boolean) => void
  setRecording: (v: boolean) => void
  setRecordSeconds: (s: number) => void
  toggleHud: () => void
  triggerReset: () => void
  setSpeed: (v: number) => void
}

const VIEW_ORDER: ViewMode[] = ['third', 'first', 'nose']
const TIME_ORDER: TimeOfDay[] = ['dawn', 'sunset', 'night']

export const useGameStore = create<GameState>((set) => ({
  mode: 'free',
  viewMode: 'third',
  shot: 'auto',
  activeShot: 'orbit',
  aspect: '16:9',
  swordTheme: 'jade',
  timeOfDay: 'dawn',
  isBoosting: false,
  isRecording: false,
  recordSeconds: 0,
  hudVisible: true,
  resetToken: 0,
  speed: 0,

  toggleMode: () => set((s) => ({ mode: s.mode === 'free' ? 'director' : 'free' })),
  setMode: (mode) => set({ mode }),
  cycleViewMode: () =>
    set((s) => ({ viewMode: VIEW_ORDER[(VIEW_ORDER.indexOf(s.viewMode) + 1) % VIEW_ORDER.length] })),
  setViewMode: (viewMode) => set({ viewMode }),
  setShot: (shot) => set({ shot }),
  setActiveShot: (activeShot) => set({ activeShot }),
  setAspect: (aspect) => set({ aspect }),
  toggleSwordTheme: () => set((s) => ({ swordTheme: s.swordTheme === 'jade' ? 'gold' : 'jade' })),
  cycleTimeOfDay: () =>
    set((s) => ({ timeOfDay: TIME_ORDER[(TIME_ORDER.indexOf(s.timeOfDay) + 1) % TIME_ORDER.length] })),
  setBoosting: (isBoosting) => set({ isBoosting }),
  setRecording: (isRecording) => set({ isRecording }),
  setRecordSeconds: (recordSeconds) => set({ recordSeconds }),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
  triggerReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  setSpeed: (speed) => set({ speed }),
}))
