import { imageToCanvas, loadImage } from '../card/textures'
import { fitWithin } from '../upload/imageLoad'
import { maskToSelection } from './maskToSelection'

export interface SamPoint {
  x: number
  y: number
  label: 0 | 1
}

export class SegmentUnavailableError extends Error {}

/** Vercel caps request bodies at 4.5MB; a full-res photo card as base64 can
    exceed it. SAM works internally at ~1024px anyway, so segment against a
    downscaled copy and stretch masks back up. */
const SEGMENT_MAX_EDGE = 1024

export interface SegmentPayload {
  canvas: HTMLCanvasElement
  /** artwork px → payload px multiplier (≤ 1) */
  scale: number
}

export function toSegmentPayload(artwork: HTMLCanvasElement): SegmentPayload {
  const { width, height } = fitWithin(artwork.width, artwork.height, SEGMENT_MAX_EDGE)
  return { canvas: imageToCanvas(artwork, width, height), scale: width / artwork.width }
}

async function postJson(url: string, body: unknown): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 503) {
    throw new SegmentUnavailableError('smart select is not configured on this deployment')
  }
  if (!res.ok) {
    const parsed = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(parsed?.error ?? `segmentation failed (${res.status})`)
  }
  return res
}

/**
 * Ask the server-side SAM proxy for a mask. Points are in artwork pixel
 * coordinates; they are scaled into the (downscaled) payload space, and the
 * returned mask is scaled back to a 0/1 selection at artwork resolution.
 */
export async function segment(
  artwork: HTMLCanvasElement,
  points: SamPoint[],
): Promise<Uint8Array> {
  const payload = toSegmentPayload(artwork)
  const image = payload.canvas.toDataURL('image/jpeg', 0.9)
  const scaled = points.map((p) => ({
    x: Math.round(p.x * payload.scale),
    y: Math.round(p.y * payload.scale),
    label: p.label,
  }))
  const res = await postJson('/api/segment', { image, points: scaled })
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
