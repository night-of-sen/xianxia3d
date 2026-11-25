/**
 * 外部模型插槽配置。把 .glb 文件放进 public/models/ 即自动替换对应的程序化版本。
 *
 * fit  : 归一化依据 —— height 按高度 / width 按水平最大边 / length 按 X 轴长度（桥）
 * size : 归一化后的目标尺寸（世界单位，飞剑长约 2.3）
 * yaw  : 额外绕 Y 轴旋转（弧度），用于让亭台台阶朝向 +Z
 * offset: 落地位置微调 [x,y,z]
 * emissiveBoost: 自发光材质强度倍增（灯笼泛光）
 */
export const MODELS = {
  pavilion: { url: '/models/pavilion.glb', fit: 'width', size: 13, yaw: 0, offset: [0, -0.1, 0], emissiveBoost: 3 },
  bridge: { url: '/models/bridge.glb', fit: 'length', size: 40, emissiveBoost: 3 },
  pine: { url: '/models/pine.glb', fit: 'height', size: 9, yaw: 0 },
  peach: { url: '/models/peach_tree.glb', fit: 'height', size: 6.5, yaw: 0 },
} as const

export type ModelSlotName = keyof typeof MODELS
