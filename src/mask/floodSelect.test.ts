import { describe, expect, test } from 'vitest'
import { floodSelect, type Raster } from './floodSelect'

/** Build a raster from rows of single-letter color keys. */
function raster(rows: string[], palette: Record<string, [number, number, number]>): Raster {
  const height = rows.length
  const width = rows[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      const [r, g, b] = palette[key]
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }),
  )
  return { width, height, data }
}

const palette = {
  g: [200, 160, 60] as [number, number, number], // gold
  G: [205, 165, 65] as [number, number, number], // gold, slightly off
  w: [245, 240, 225] as [number, number, number], // paper
}

describe('floodSelect', () => {
  // gold plus-shape on paper; a detached gold pixel bottom-right
  const img = raster(['wgww', 'gggw', 'wgwg'], palette)

  test('selects the connected same-color region only', () => {
    const sel = floodSelect(img, 1, 1, 0)
    expect(Array.from(sel)).toEqual([0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0])
  })

  test('detached pixel is not selected even with same color', () => {
    const sel = floodSelect(img, 1, 1, 0)
    expect(sel[2 * 4 + 3]).toBe(0)
  })

  test('tolerance includes near-colors', () => {
    const img2 = raster(['gGw'], palette)
    expect(Array.from(floodSelect(img2, 0, 0, 10))).toEqual([1, 1, 0])
    expect(Array.from(floodSelect(img2, 0, 0, 0))).toEqual([1, 0, 0])
  })

  test('seed one pixel past the right/bottom edge selects nothing', () => {
    // 4x3 fixture: x === width (4) or y === height (3) is out of bounds,
    // as produced by a click landing on the exact right/bottom edge.
    expect(Array.from(floodSelect(img, 4, 1, 0))).toEqual(new Array(12).fill(0))
    expect(Array.from(floodSelect(img, 1, 3, 0))).toEqual(new Array(12).fill(0))
  })
})
