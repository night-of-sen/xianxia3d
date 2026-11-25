/**
 * 纯前端极速图片处理与智能去背景模块（0 后端、0 外部大模型卡顿、手机电脑秒出）：
 * 1. processStandeeImage：用于 2.5D 灵影立绘
 *    - 透明底 PNG 自动保留透明通道并裁剪留白，保证人物脚底精准贴剑
 *    - 普通 JPG/纯色底卡通图启用四边 BFS 智能去背景 + 边缘柔化羽化
 * 2. processFaceAvatar：用于 3D 剑仙换头像
 *    - 自动居中裁切为高清圆形头像贴图
 */

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

export interface StandeeResult {
  dataUrl: string
  aspect: number
}

/**
 * 处理上传的全身人像/卡通图片为 2.5D 立绘贴图
 * @param file 上传图片
 * @param removeBg 是否开启智能去背景
 * @param tolerance 去背景色差容差 (10 ~ 90)
 */
export async function processStandeeImage(
  file: File,
  removeBg = true,
  tolerance = 36,
): Promise<StandeeResult> {
  const img = await loadImage(file)
  const maxSide = 768
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)

  const imgData = ctx.getImageData(0, 0, w, h)
  const data = imgData.data

  // 检测四角是否原本就是透明 PNG
  const cornerIdx = [0, (w - 1) * 4, (h - 1) * w * 4, (w * h - 1) * 4]
  const alreadyTransparent = cornerIdx.some((i) => data[i + 3] < 24)

  if (removeBg && !alreadyTransparent) {
    // 采样四个角作为背景参考色
    const seeds = cornerIdx.map((i) => [data[i], data[i + 1], data[i + 2]])
    const bgR = (seeds[0][0] + seeds[1][0] + seeds[2][0] + seeds[3][0]) / 4
    const bgG = (seeds[0][1] + seeds[1][1] + seeds[2][1] + seeds[3][1]) / 4
    const bgB = (seeds[0][2] + seeds[1][2] + seeds[2][2] + seeds[3][2]) / 4

    const visited = new Uint8Array(w * h)
    const queue = new Int32Array(w * h)
    let head = 0
    let tail = 0

    const tolSq = tolerance * tolerance * 3
    const softSq = (tolerance + 18) * (tolerance + 18) * 3

    const colorDistSq = (pxIdx: number) => {
      const dr = data[pxIdx] - bgR
      const dg = data[pxIdx + 1] - bgG
      const db = data[pxIdx + 2] - bgB
      return dr * dr + dg * dg + db * db
    }

    const tryEnqueue = (x: number, y: number) => {
      const idx = y * w + x
      if (visited[idx]) return
      const p = idx * 4
      const d = colorDistSq(p)
      if (d <= tolSq) {
        visited[idx] = 1
        data[p + 3] = 0
        queue[tail++] = idx
      } else if (d <= softSq) {
        // 边缘柔和半透明羽化，消除生硬锯齿
        const ratio = (Math.sqrt(d / 3) - tolerance) / 18
        data[p + 3] = Math.round(data[p + 3] * Math.max(0, Math.min(1, ratio)))
      }
    }

    // 从四条边向内部 BFS 泛洪去背景
    for (let x = 0; x < w; x++) {
      tryEnqueue(x, 0)
      tryEnqueue(x, h - 1)
    }
    for (let y = 0; y < h; y++) {
      tryEnqueue(0, y)
      tryEnqueue(w - 1, y)
    }

    while (head < tail) {
      const idx = queue[head++]
      const x = idx % w
      const y = (idx - x) / w
      if (x > 0) tryEnqueue(x - 1, y)
      if (x < w - 1) tryEnqueue(x + 1, y)
      if (y > 0) tryEnqueue(x, y - 1)
      if (y < h - 1) tryEnqueue(x, y + 1)
    }

    ctx.putImageData(imgData, 0, 0)
  }

  // 自动计算非透明像素包围盒，裁剪多余留白让人物脚底精准贴剑
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    return { dataUrl: canvas.toDataURL('image/png'), aspect: w / h }
  }

  const pad = 6
  const sx = Math.max(0, minX - pad)
  const sy = Math.max(0, minY - pad)
  const cw = Math.min(w - sx, maxX - minX + 1 + pad * 2)
  const ch = Math.min(h - sy, maxY - minY + 1 + pad * 2)

  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d')!.drawImage(canvas, sx, sy, cw, ch, 0, 0, cw, ch)

  return {
    dataUrl: out.toDataURL('image/png'),
    aspect: cw / ch,
  }
}

/** 处理上传的自拍/卡通头像为 3D 剑仙面部贴图（自动居中裁切圆形） */
export async function processFaceAvatar(file: File): Promise<string> {
  const img = await loadImage(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = Math.max(0, (img.height - side) * 0.25) // 略偏上对准人像面部

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL('image/png')
}
