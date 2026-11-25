import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

/**
 * 抠图模式：
 * - ai    : Google MediaPipe AI 语义人像分割（本地 250KB 模型，精准抠真实生活照/复杂背景全身人像）
 * - color : 极速纯色去背（适合白底/单色底二次元卡通图、表情包）
 * - none  : 保留原图并自动裁切圆角玉牌框
 */
export type CutoutMode = 'ai' | 'color' | 'none'

export interface StandeeResult {
  dataUrl: string
  aspect: number
}

let segmenterPromise: Promise<ImageSegmenter> | null = null

async function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const base = import.meta.env.BASE_URL
      const vision = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`)
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${base}mediapipe/selfie_segmenter.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      })
    })().catch((err) => {
      segmenterPromise = null
      throw err
    })
  }
  return segmenterPromise
}

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

/** 裁剪多余透明留白，让人物脚底精准贴合飞剑 */
function trimTransparent(canvas: HTMLCanvasElement): StandeeResult {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')!
  const data = ctx.getImageData(0, 0, w, h).data

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 28) {
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

  const pad = 8
  const sx = Math.max(0, minX - pad)
  const sy = Math.max(0, minY - pad)
  const cw = Math.min(w - sx, maxX - minX + 1 + pad * 2)
  const ch = Math.min(h - sy, maxY - minY + 1 + pad * 2)

  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d')!.drawImage(canvas, sx, sy, cw, ch, 0, 0, cw, ch)
  return { dataUrl: out.toDataURL('image/png'), aspect: cw / ch }
}

/**
 * 处理上传的全身人像 / 卡通图片为清透 2.5D 立绘贴图
 */
export async function processStandeeImage(
  file: File,
  mode: CutoutMode = 'ai',
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

  // 若本身已是透明底 PNG，直接保留透明并裁剪脚底留白
  const cornerIdx = [0, (w - 1) * 4, (h - 1) * w * 4, (w * h - 1) * 4]
  const alreadyTransparent = cornerIdx.some((i) => data[i + 3] < 24)
  if (alreadyTransparent) {
    return trimTransparent(canvas)
  }

  if (mode === 'none') {
    // 保留原图：加上柔和圆角裁切，美观不生硬
    const card = document.createElement('canvas')
    card.width = w
    card.height = h
    const cctx = card.getContext('2d')!
    const rad = Math.min(w, h) * 0.08
    cctx.beginPath()
    cctx.roundRect(0, 0, w, h, rad)
    cctx.clip()
    cctx.drawImage(canvas, 0, 0)
    return { dataUrl: card.toDataURL('image/png'), aspect: w / h }
  }

  if (mode === 'ai') {
    // 使用 MediaPipe AI 人像语义分割精准抠出人物主体
    const seg = await getSegmenter()
    const result = seg.segment(canvas)
    const masks = result.confidenceMasks
    if (masks && masks.length > 0) {
      // selfie_segmenter 单通道或双通道：取前景人像概率（若 2 通道取索引 1，若 1 通道取索引 0）
      const fgMask = masks.length > 1 ? masks[1] : masks[0]
      const probs = fgMask.getAsFloat32Array()
      let keptPixels = 0
      for (let i = 0; i < w * h; i++) {
        const p = probs[i]
        // 柔和边缘羽化（0.25 ~ 0.65 平滑过渡），保留细腻发丝与轮廓
        const alpha = Math.max(0, Math.min(1, (p - 0.25) / 0.4))
        data[i * 4 + 3] = Math.round(alpha * 255)
        if (alpha > 0.5) keptPixels++
      }
      result.close()
      // 若识别到了有效人像主体，写回并返回；否则自动回退到纯色抠图（例如非人形卡通/物体）
      if (keptPixels > w * h * 0.015) {
        ctx.putImageData(imgData, 0, 0)
        return trimTransparent(canvas)
      }
    } else {
      result.close()
    }
  }

  // 纯色背景去背（适合白底卡通/二次元/表情包，或 AI 未检测到真人的物体）
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
      const ratio = (Math.sqrt(d / 3) - tolerance) / 18
      data[p + 3] = Math.round(data[p + 3] * Math.max(0, Math.min(1, ratio)))
    }
  }

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
  return trimTransparent(canvas)
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
  const sy = Math.max(0, (img.height - side) * 0.22)

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)

  return canvas.toDataURL('image/png')
}
