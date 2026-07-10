/**
 * Convert a SAM mask image's RGBA pixels to a 0/1 selection array.
 *
 * The provider may return either a white-on-black mask (opaque everywhere) or
 * a cutout with transparency. Heuristic: if the image has meaningful alpha
 * variation, a pixel is selected when alpha > 127; otherwise when its
 * luminance > 127. Pure.
 */
export function maskToSelection(data: Uint8ClampedArray): Uint8Array {
  const selection = new Uint8Array(data.length / 4)
  let hasAlphaVariation = false
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) {
      hasAlphaVariation = true
      break
    }
  }
  for (let p = 0; p < selection.length; p++) {
    const i = p * 4
    if (hasAlphaVariation) {
      selection[p] = data[i + 3] > 127 ? 1 : 0
    } else {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      selection[p] = luminance > 127 ? 1 : 0
    }
  }
  return selection
}
