import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fal } from '@fal-ai/client'

const MAX_BODY_BYTES = 8 * 1024 * 1024
const DATA_URI_RE = /^data:image\/(png|jpeg|webp);base64,/

interface SamPoint {
  x: number
  y: number
  label: 0 | 1
}

function isValidPoint(p: unknown): p is SamPoint {
  if (typeof p !== 'object' || p === null) return false
  const q = p as Record<string, unknown>
  return (
    Number.isFinite(q.x) && Number.isFinite(q.y) && (q.label === 0 || q.label === 1)
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const key = process.env.FAL_KEY
  if (!key) {
    res.status(503).json({ error: 'segmentation not configured' })
    return
  }

  const { image, points } = (req.body ?? {}) as { image?: unknown; points?: unknown }
  if (typeof image !== 'string' || !DATA_URI_RE.test(image)) {
    res.status(400).json({ error: 'image must be a png/jpeg/webp data URI' })
    return
  }
  if (image.length > MAX_BODY_BYTES) {
    res.status(400).json({ error: 'image too large (max 8MB)' })
    return
  }
  if (!Array.isArray(points) || points.length === 0 || !points.every(isValidPoint)) {
    res.status(400).json({ error: 'points must be a non-empty array of {x, y, label: 0|1}' })
    return
  }

  fal.config({ credentials: key })
  const model = process.env.SAM_MODEL ?? 'fal-ai/sam2/image'
  try {
    const result = await fal.subscribe(model, {
      input: {
        image_url: image,
        prompts: points.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), label: p.label })),
        sync_mode: true,
        output_format: 'png',
      },
    })
    const mask = (result.data as { image?: { url?: string } }).image?.url
    if (!mask) {
      res.status(502).json({ error: 'segmentation returned no mask' })
      return
    }
    res.status(200).json({ mask })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'segmentation failed'
    res.status(502).json({ error: message })
  }
}
