export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

/**
 * 4-connected flood select from (sx, sy). A pixel joins the selection when its
 * RGB distance from the SEED color is within tolerance (0–255 scale, compared
 * as squared Euclidean distance across the three channels).
 */
export function floodSelect(img: Raster, sx: number, sy: number, tolerance: number): Uint8Array {
  const { width, height, data } = img
  const selected = new Uint8Array(width * height)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return selected

  const seed = (sy * width + sx) * 4
  const r0 = data[seed]
  const g0 = data[seed + 1]
  const b0 = data[seed + 2]
  const limit = tolerance * tolerance * 3

  const within = (p: number) => {
    const i = p * 4
    const dr = data[i] - r0
    const dg = data[i + 1] - g0
    const db = data[i + 2] - b0
    return dr * dr + dg * dg + db * db <= limit
  }

  const queue = [sy * width + sx]
  selected[queue[0]] = 1
  while (queue.length > 0) {
    const p = queue.pop()!
    const x = p % width
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < width - 1 ? p + 1 : -1,
      p - width,
      p + width,
    ]
    for (const n of neighbors) {
      if (n < 0 || n >= selected.length || selected[n]) continue
      if (within(n)) {
        selected[n] = 1
        queue.push(n)
      }
    }
  }
  return selected
}
