/**
 * 移动端高频输入通道（摇杆 / 陀螺仪 / 冲刺）：
 * 直接由 useFrame 每帧读取，避免高频触发 React 重渲染。
 */
export const mobileInput = {
  /** 虚拟摇杆：+1 左转，-1 右转 */
  joyYaw: 0,
  /** 虚拟摇杆：+1 拉升，-1 俯冲 */
  joyPitch: 0,
  /** 陀螺仪：+1 左转，-1 右转 */
  gyroYaw: 0,
  /** 陀螺仪：+1 拉升，-1 俯冲 */
  gyroPitch: 0,
  /** 按住冲刺按钮 */
  boosting: false,
}

export function resetMobileInput() {
  mobileInput.joyYaw = 0
  mobileInput.joyPitch = 0
  mobileInput.gyroYaw = 0
  mobileInput.gyroPitch = 0
  mobileInput.boosting = false
}
