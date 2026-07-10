import { loadImage } from '../card/textures'
import { maskToSelection } from './maskToSelection'

export interface SamPoint {
  x: number
  y: number
  label: 0 | 1
}

export class SegmentUnavailableError extends Error {}

/**
 * Ask the server-side SAM proxy for a mask. Points are in artwork pixel
 * coordinates (the same canvas is sent as the image, so spaces match).
 * Returns a 0/1 selection sized to the artwork.
 */
export async function segment(
  artwork: HTMLCanvasElement,
  points: SamPoint[],
): Promise<Uint8Array> {
  // JPEG keeps photographic cards well under the 8MB body cap.
  const image = artwork.toDataURL('image/jpeg', 0.9)
  const res = await fetch('/api/segment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, points }),
  })
  if (res.status === 503) {
    throw new SegmentUnavailableError('smart select is not configured on this deployment')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `segmentation failed (${res.status})`)
  }
  const { mask } = (await res.json()) as { mask: string }
  const img = await loadImage(mask)

  // The mask may come back at any resolution — normalize to artwork pixels.
  const c = document.createElement('canvas')
  c.width = artwork.width
  c.height = artwork.height
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return maskToSelection(ctx.getImageData(0, 0, c.width, c.height).data)
}
