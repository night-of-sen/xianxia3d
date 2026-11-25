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
/** 剑主化身模式：none = 纯飞剑；3d = 真3D剑仙；2.5d = 上传图片2.5D灵影立绘 */
export type RiderMode = 'none' | '3d' | '2.5d'
/** 剑主姿势 */
export type RiderPose = 'stand' | 'charge' | 'meditate' | 'salute'
/** 3D 剑仙衣袍配色 */
export type RobeTheme = 'white' | 'jade' | 'dark'
/** 手机端自由模式操控方式：joystick = 虚拟摇杆；gyro = 陀螺仪体感（互斥，开陀螺仪自动隐藏摇杆） */
export type MobileControlMode = 'joystick' | 'gyro'

interface GameState {
  mode: GameMode
  mobileControlMode: MobileControlMode
  menuOpen: boolean
  viewMode: ViewMode
  shot: CameraShot
  activeShot: ActiveShot
  aspect: AspectRatio
  swordTheme: SwordTheme
  timeOfDay: TimeOfDay
  riderMode: RiderMode
  riderPose: RiderPose
  robeTheme: RobeTheme
  faceImageUrl: string | null
  standeeImageUrl: string | null
  standeeAspect: number
  standeeScale: number
  riderPanelOpen: boolean
  isBoosting: boolean
  isRecording: boolean
  recordSeconds: number
  hudVisible: boolean
  resetToken: number
  /** 实时速度（仅供 HUD 显示，由 useFrame 低频写入） */
  speed: number

  toggleMode: () => void
  setMode: (mode: GameMode) => void
  setMobileControlMode: (m: MobileControlMode) => void
  toggleMenu: () => void
  setMenuOpen: (v: boolean) => void
  cycleViewMode: () => void
  setViewMode: (v: ViewMode) => void
  setShot: (shot: CameraShot) => void
  setActiveShot: (shot: ActiveShot) => void
  setAspect: (aspect: AspectRatio) => void
  toggleSwordTheme: () => void
  cycleTimeOfDay: () => void
  setRiderMode: (m: RiderMode) => void
  setRiderPose: (p: RiderPose) => void
  cycleRiderPose: () => void
  setRobeTheme: (t: RobeTheme) => void
  setFaceImage: (url: string | null) => void
  setStandeeImage: (url: string | null, aspect?: number) => void
  setStandeeScale: (s: number) => void
  toggleRiderPanel: () => void
  setRiderPanelOpen: (v: boolean) => void
  setBoosting: (v: boolean) => void
  setRecording: (v: boolean) => void
  setRecordSeconds: (s: number) => void
  toggleHud: () => void
  triggerReset: () => void
  setSpeed: (v: number) => void
}

const VIEW_ORDER: ViewMode[] = ['third', 'first', 'nose']
const TIME_ORDER: TimeOfDay[] = ['dawn', 'sunset', 'night']
const POSE_ORDER: RiderPose[] = ['stand', 'charge', 'meditate', 'salute']

export const useGameStore = create<GameState>((set) => ({
  mode: 'free',
  mobileControlMode: 'joystick',
  menuOpen: false,
  viewMode: 'third',
  shot: 'auto',
  activeShot: 'orbit',
  aspect: '16:9',
  swordTheme: 'jade',
  timeOfDay: 'dawn',
  riderMode: 'none',
  riderPose: 'stand',
  robeTheme: 'white',
  faceImageUrl: null,
  standeeImageUrl: null,
  standeeAspect: 0.65,
  standeeScale: 1,
  riderPanelOpen: false,
  isBoosting: false,
  isRecording: false,
  recordSeconds: 0,
  hudVisible: true,
  resetToken: 0,
  speed: 0,

  toggleMode: () => set((s) => ({ mode: s.mode === 'free' ? 'director' : 'free' })),
  setMode: (mode) => set({ mode }),
  setMobileControlMode: (mobileControlMode) => set({ mobileControlMode }),
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  cycleViewMode: () =>
    set((s) => ({ viewMode: VIEW_ORDER[(VIEW_ORDER.indexOf(s.viewMode) + 1) % VIEW_ORDER.length] })),
  setViewMode: (viewMode) => set({ viewMode }),
  setShot: (shot) => set({ shot }),
  setActiveShot: (activeShot) => set({ activeShot }),
  setAspect: (aspect) => set({ aspect }),
  toggleSwordTheme: () => set((s) => ({ swordTheme: s.swordTheme === 'jade' ? 'gold' : 'jade' })),
  cycleTimeOfDay: () =>
    set((s) => ({ timeOfDay: TIME_ORDER[(TIME_ORDER.indexOf(s.timeOfDay) + 1) % TIME_ORDER.length] })),
  setRiderMode: (riderMode) => set({ riderMode }),
  setRiderPose: (riderPose) => set({ riderPose }),
  cycleRiderPose: () =>
    set((s) => ({ riderPose: POSE_ORDER[(POSE_ORDER.indexOf(s.riderPose) + 1) % POSE_ORDER.length] })),
  setRobeTheme: (robeTheme) => set({ robeTheme }),
  setFaceImage: (faceImageUrl) => set({ faceImageUrl }),
  setStandeeImage: (standeeImageUrl, standeeAspect = 0.65) => set({ standeeImageUrl, standeeAspect }),
  setStandeeScale: (standeeScale) => set({ standeeScale }),
  toggleRiderPanel: () => set((s) => ({ riderPanelOpen: !s.riderPanelOpen })),
  setRiderPanelOpen: (riderPanelOpen) => set({ riderPanelOpen }),
  setBoosting: (isBoosting) => set({ isBoosting }),
  setRecording: (isRecording) => set({ isRecording }),
  setRecordSeconds: (recordSeconds) => set({ recordSeconds }),
  toggleHud: () => set((s) => ({ hudVisible: !s.hudVisible })),
  triggerReset: () => set((s) => ({ resetToken: s.resetToken + 1 })),
  setSpeed: (speed) => set({ speed }),
}))
