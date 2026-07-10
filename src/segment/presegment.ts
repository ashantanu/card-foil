import { maskToSelection } from './maskToSelection'
import { BitMask } from './bitmask'
import { toSegmentPayload } from './segmentClient'
import { SegmentUnavailableError } from './segmentClient'

const DECODE_CONCURRENCY = 4

function loadCrossOriginImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // masks are fetched from fal's CDN
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('failed to load mask'))
    img.src = url
  })
}

/**
 * Auto-segment the card server-side, then download and bit-pack every
 * region mask at artwork resolution. One network round trip + N mask
 * downloads; afterwards taps resolve locally.
 */
export async function presegment(
  artwork: HTMLCanvasElement,
  onProgress: (done: number, total: number) => void,
): Promise<BitMask[]> {
  const image = toSegmentPayload(artwork).canvas.toDataURL('image/jpeg', 0.9)
  const res = await fetch('/api/presegment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image }),
  })
  if (res.status === 503) {
    throw new SegmentUnavailableError('smart select is not configured on this deployment')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `auto-segmentation failed (${res.status})`)
  }
  const { masks: urls } = (await res.json()) as { masks: string[] }

  const scratch = document.createElement('canvas')
  scratch.width = artwork.width
  scratch.height = artwork.height
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!

  const out: BitMask[] = []
  let done = 0
  onProgress(0, urls.length)
  // Small worker pool: decode a few masks at a time.
  const queue = [...urls]
  await Promise.all(
    Array.from({ length: Math.min(DECODE_CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const url = queue.shift()
        if (!url) return
        try {
          const img = await loadCrossOriginImage(url)
          ctx.clearRect(0, 0, scratch.width, scratch.height)
          ctx.drawImage(img, 0, 0, scratch.width, scratch.height)
          const sel = maskToSelection(ctx.getImageData(0, 0, scratch.width, scratch.height).data)
          out.push(BitMask.fromSelection(sel))
        } catch {
          // A single undecodable mask shouldn't sink the cache.
        } finally {
          onProgress(++done, urls.length)
        }
      }
    }),
  )
  return out
}
