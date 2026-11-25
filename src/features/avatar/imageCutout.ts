import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'

/**
 * 抠图模式：
 * - ai    : MediaPipe AI 语义人像分割（带 10 秒超时保护，超时自动降级本地智能抠图，绝不卡死）
 * - color : 极速纯色去背（适合白底/单色底二次元卡通图、表情包）
 * - none  : 保留原图并自动裁切圆角玉牌框
 */
export type CutoutMode = 'ai' | 'color' | 'none'

export interface StandeeResult {
  dataUrl: string
  aspect: number
  note?: string
}

let segmenterPromise: Promise<ImageSegmenter> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (err) => {
        window.clearTimeout(id)
        reject(err)
      },
    )
  })
}

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
  return withTimeout(segmenterPromise, 10000)
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

function trimTransparent(canvas: HTMLCanvasElement, note?: string): StandeeResult {
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
    return { dataUrl: canvas.toDataURL('image/png'), aspect: w / h, note }
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
  return { dataUrl: out.toDataURL('image/png'), aspect: cw / ch, note }
}

/** 生成精致圆角玉牌卡片（保底方案或用户主动选择原图玉牌） */
function makeJadeCard(src: HTMLCanvasElement, note?: string): StandeeResult {
  const w = src.width
  const h = src.height
  const card = document.createElement('canvas')
  card.width = w
  card.height = h
  const ctx = card.getContext('2d')!
  const rad = Math.min(w, h) * 0.09
  ctx.beginPath()
  ctx.roundRect(0, 0, w, h, rad)
  ctx.clip()
  ctx.drawImage(src, 0, 0)
  return { dataUrl: card.toDataURL('image/png'), aspect: w / h, note }
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
  const maxSide = 640
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

  const cornerIdx = [0, (w - 1) * 4, (h - 1) * w * 4, (w * h - 1) * 4]
  const alreadyTransparent = cornerIdx.some((i) => data[i + 3] < 24)
  if (alreadyTransparent) {
    return trimTransparent(canvas)
  }

  if (mode === 'none') {
    return makeJadeCard(canvas)
  }

  if (mode === 'ai') {
    try {
      const seg = await getSegmenter()
      const result = seg.segment(canvas)
      const masks = result.confidenceMasks
      if (masks && masks.length > 0) {
        const fgMask = masks.length > 1 ? masks[1] : masks[0]
        const probs = fgMask.getAsFloat32Array()
        let keptPixels = 0
        for (let i = 0; i < w * h; i++) {
          const p = probs[i]
          const alpha = Math.max(0, Math.min(1, (p - 0.28) / 0.36))
          data[i * 4 + 3] = Math.round(alpha * 255)
          if (alpha > 0.5) keptPixels++
        }
        result.close()
        if (keptPixels > w * h * 0.02) {
          ctx.putImageData(imgData, 0, 0)
          return trimTransparent(canvas)
        }
      } else {
        result.close()
      }
      // 未识别到真人时，用圆角玉牌保底（比强行色差抠图把复杂背景抠碎好看得多）
      return makeJadeCard(canvas, '未检测到清晰人像主体，已自动切换为圆角玉牌')
    } catch {
      // 网络或手机浏览器不支持 WASM 时，10 秒超时后优雅降级，绝不卡死
      return makeJadeCard(canvas, 'AI 抠图引擎加载超时，已自动切换为圆角玉牌（透明底PNG或白底图可选「白底卡通」）')
    }
  }

  // 纯色背景去背（适合白底卡通/二次元/表情包）
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
