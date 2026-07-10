import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fal } from '@fal-ai/client'

const MAX_BODY_BYTES = 8 * 1024 * 1024
const DATA_URI_RE = /^data:image\/(png|jpeg|webp);base64,/

/**
 * Auto-segment the whole card once; the client caches the returned masks so
 * subsequent taps are instant local lookups. Masks come back as fal-hosted
 * URLs (sync_mode off) so this function's response stays small.
 */
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
  const { image } = (req.body ?? {}) as { image?: unknown }
  if (typeof image !== 'string' || !DATA_URI_RE.test(image)) {
    res.status(400).json({ error: 'image must be a png/jpeg/webp data URI' })
    return
  }
  if (image.length > MAX_BODY_BYTES) {
    res.status(400).json({ error: 'image too large (max 8MB)' })
    return
  }

  fal.config({ credentials: key })
  try {
    const result = await fal.subscribe('fal-ai/sam2/auto-segment', {
      input: {
        image_url: image,
        output_format: 'png',
      },
    })
    const data = result.data as { individual_masks?: Array<{ url?: string }> }
    const masks = (data.individual_masks ?? [])
      .map((m) => m.url)
      .filter((u): u is string => typeof u === 'string' && u.length > 0)
    res.status(200).json({ masks })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'auto-segmentation failed'
    res.status(502).json({ error: message })
  }
}
