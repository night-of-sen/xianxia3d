import { useCallback, useEffect, useRef } from 'react'
import { useGameStore } from '../../store/useGameStore'

function pickMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
    { mimeType: 'video/webm', ext: 'webm' },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c
    }
  }
  return { mimeType: '', ext: 'webm' }
}

function getCanvasElement(): HTMLCanvasElement | null {
  return document.querySelector('#xianxia-canvas canvas')
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * 画布 1080p 高清视频录制与截图 Hook：
 * - 支持 16:9（1920x1080）与 9:16（1080x1920）短视频原生画幅
 * - 当原画布分辨率低于 1080p 时自动启用离屏 1080p 60fps 合成画布，确保导出清晰度
 * - 16 Mbps 高码率，纯净录制 3D 画面，自动排除外层 HUD 按钮
 */
export function useVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(0)

  const stopRecording = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') {
      rec.stop()
    }
    useGameStore.getState().setRecording(false)
  }, [])

  const startRecording = useCallback(() => {
    const srcCanvas = getCanvasElement()
    if (!srcCanvas || typeof MediaRecorder === 'undefined') {
      alert('当前浏览器暂不支持画布录制，请使用最新版 Chrome 或 Edge 浏览器。')
      return
    }

    const aspect = useGameStore.getState().aspect
    const targetW = aspect === '9:16' ? 1080 : 1920
    const targetH = aspect === '9:16' ? 1920 : 1080

    // 若源画布已达到 1080p 级别，直接零拷贝捕获；否则用离屏 1080p 画布 60fps 高清输出
    let stream: MediaStream
    if (srcCanvas.width >= targetW * 0.95 && srcCanvas.height >= targetH * 0.95) {
      stream = srcCanvas.captureStream(60)
    } else {
      const hdCanvas = document.createElement('canvas')
      hdCanvas.width = targetW
      hdCanvas.height = targetH
      const ctx = hdCanvas.getContext('2d')
      if (ctx) {
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        const pump = () => {
          ctx.drawImage(srcCanvas, 0, 0, targetW, targetH)
          rafRef.current = window.requestAnimationFrame(pump)
        }
        pump()
        stream = hdCanvas.captureStream(60)
      } else {
        stream = srcCanvas.captureStream(60)
      }
    }

    const { mimeType, ext } = pickMimeType()
    chunksRef.current = []

    const options: MediaRecorderOptions = {
      videoBitsPerSecond: 16_000_000,
      ...(mimeType ? { mimeType } : {}),
    }

    const recorder = new MediaRecorder(stream, options)
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      const url = URL.createObjectURL(blob)
      const tag = aspect === '9:16' ? '1080x1920' : '1920x1080'
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      triggerDownload(url, `xianxia-${tag}-${ts}.${ext}`)
      window.setTimeout(() => URL.revokeObjectURL(url), 5000)
      recorderRef.current = null
      useGameStore.getState().setRecordSeconds(0)
    }

    recorderRef.current = recorder
    recorder.start(200)
    startTimeRef.current = performance.now()
    useGameStore.getState().setRecordSeconds(0)
    useGameStore.getState().setRecording(true)

    timerRef.current = window.setInterval(() => {
      const sec = Math.floor((performance.now() - startTimeRef.current) / 1000)
      useGameStore.getState().setRecordSeconds(sec)
    }, 250)
  }, [])

  const toggleRecording = useCallback(() => {
    if (useGameStore.getState().isRecording) stopRecording()
    else startRecording()
  }, [startRecording, stopRecording])

  /** 一键保存当前画面高清 PNG 截图 */
  const captureScreenshot = useCallback(() => {
    const canvas = getCanvasElement()
    if (!canvas) return
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    try {
      const dataUrl = canvas.toDataURL('image/png')
      triggerDownload(dataUrl, `xianxia-shot-${ts}.png`)
    } catch {
      alert('截图失败，请稍后重试。')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [])

  return { toggleRecording, stopRecording, captureScreenshot }
}
