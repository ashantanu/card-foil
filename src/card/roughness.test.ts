import { expect, test } from 'vitest'
import { roughnessFromMask } from './textures'

function px(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray([r, g, b, a])
}

test('foil (white mask) → glossy ~0.15 (38/255)', () => {
  expect(Array.from(roughnessFromMask(px(255, 255, 255)))).toEqual([38, 38, 38, 255])
})

test('paper (black mask) → matte ~0.9 (230/255)', () => {
  expect(Array.from(roughnessFromMask(px(0, 0, 0)))).toEqual([230, 230, 230, 255])
})

test('mid mask interpolates', () => {
  const [v] = roughnessFromMask(px(128, 128, 128))
  expect(v).toBeGreaterThan(38)
  expect(v).toBeLessThan(230)
})
