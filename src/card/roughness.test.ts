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

import { splitByMask } from './textures'

test('splitByMask: paper pixel goes fully to emissive, foil fully to albedo', () => {
  const art = new Uint8ClampedArray([200, 150, 100, 255, 40, 50, 60, 255])
  const mask = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
  const { albedo, emissive } = splitByMask(art, mask)
  expect(Array.from(albedo)).toEqual([0, 0, 0, 255, 40, 50, 60, 255])
  expect(Array.from(emissive)).toEqual([200, 150, 100, 255, 0, 0, 0, 255])
})

test('splitByMask: mid mask splits proportionally and sums to the artwork', () => {
  const art = new Uint8ClampedArray([200, 100, 50, 255])
  const mask = new Uint8ClampedArray([128, 128, 128, 255])
  const { albedo, emissive } = splitByMask(art, mask)
  for (let c = 0; c < 3; c++) {
    expect(albedo[c] + emissive[c]).toBeGreaterThanOrEqual(art[c] - 1)
    expect(albedo[c] + emissive[c]).toBeLessThanOrEqual(art[c] + 1)
    expect(albedo[c]).toBeGreaterThan(0)
    expect(emissive[c]).toBeGreaterThan(0)
  }
})
