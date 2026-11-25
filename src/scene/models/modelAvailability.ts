import { useEffect, useState } from 'react'

const cache = new Map<string, Promise<boolean>>()

/** 检测 public 下的模型文件是否真实存在（开发服务器对缺失文件会回退返回 index.html，需排除） */
function probe(url: string): Promise<boolean> {
  let p = cache.get(url)
  if (!p) {
    p = fetch(url, { method: 'HEAD' })
      .then((r) => r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))
      .catch(() => false)
    cache.set(url, p)
  }
  return p
}

export function useModelExists(url: string): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let alive = true
    probe(url).then((v) => alive && setOk(v))
    return () => {
      alive = false
    }
  }, [url])
  return ok
}
