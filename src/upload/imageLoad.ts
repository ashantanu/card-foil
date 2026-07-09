import { imageToCanvas, loadImage } from '../card/textures'

export const MAX_EDGE = 2048

export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** File → downscaled canvas. Client-only: the image never leaves the browser. */
export async function loadCardImage(file: File): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image — please choose a PNG, JPEG, or SVG.')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    if (!img.width || !img.height) throw new Error('Could not read that image.')
    const { width, height } = fitWithin(img.width, img.height, MAX_EDGE)
    return imageToCanvas(img, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}
