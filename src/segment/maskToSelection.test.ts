import { expect, test } from 'vitest'
import { maskToSelection } from './maskToSelection'

function rgba(pixels: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat())
}

test('white-on-black opaque mask selects by luminance', () => {
  const data = rgba([
    [255, 255, 255, 255], // white → selected
    [0, 0, 0, 255], // black → not
    [40, 40, 40, 255], // dark gray → not
    [200, 200, 200, 255], // light gray → selected
  ])
  expect(Array.from(maskToSelection(data))).toEqual([1, 0, 0, 1])
})

test('cutout with transparency selects by alpha, even for dark pixels', () => {
  const data = rgba([
    [10, 10, 10, 255], // dark but opaque → selected (alpha path)
    [255, 255, 255, 0], // bright but transparent → not
    [128, 90, 60, 200], // semi-opaque above threshold → selected
    [128, 90, 60, 100], // below threshold → not
  ])
  expect(Array.from(maskToSelection(data))).toEqual([1, 0, 1, 0])
})
