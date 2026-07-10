/**
 * Bit-packed binary mask. Dozens of full-resolution card masks live in the
 * smart-select cache; at 1 byte/pixel a 2048px card would cost ~4MB per mask
 * (hundreds of MB total) — packed, it's 1/8th of that. Pure.
 */
export class BitMask {
  readonly size: number
  readonly area: number
  private words: Uint32Array

  private constructor(size: number, words: Uint32Array, area: number) {
    this.size = size
    this.words = words
    this.area = area
  }

  static fromSelection(sel: Uint8Array): BitMask {
    const words = new Uint32Array(Math.ceil(sel.length / 32))
    let area = 0
    for (let i = 0; i < sel.length; i++) {
      if (sel[i]) {
        words[i >> 5] |= 1 << (i & 31)
        area++
      }
    }
    return new BitMask(sel.length, words, area)
  }

  get(i: number): boolean {
    if (i < 0 || i >= this.size) return false
    return (this.words[i >> 5] & (1 << (i & 31))) !== 0
  }

  /** sel[i] = 1 wherever this mask is set. */
  unionInto(sel: Uint8Array): void {
    for (let i = 0; i < this.size; i++) {
      if ((this.words[i >> 5] & (1 << (i & 31))) !== 0) sel[i] = 1
    }
  }

  /** sel[i] = 0 wherever this mask is set. */
  subtractFrom(sel: Uint8Array): void {
    for (let i = 0; i < this.size; i++) {
      if ((this.words[i >> 5] & (1 << (i & 31))) !== 0) sel[i] = 0
    }
  }
}

/**
 * The most specific (smallest-area) cached mask containing pixel index `i`,
 * or null. Smallest wins so tapping a monogram letter selects the letter,
 * not the whole card background region that also contains it.
 */
export function pickMaskAt(masks: BitMask[], i: number): BitMask | null {
  let best: BitMask | null = null
  for (const m of masks) {
    if (m.get(i) && (best === null || m.area < best.area)) best = m
  }
  return best
}
