import { expect, test } from 'vitest'
import { roughnessFromMask } from './textures'

function px(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray([r, g, b, a])
}

test('foil (white mask) → glossy ~0.31 (80/255)', () => {
  expect(Array.from(roughnessFromMask(px(255, 255, 255)))).toEqual([80, 80, 80, 255])
})

test('paper (black mask) → matte ~0.9 (230/255)', () => {
  expect(Array.from(roughnessFromMask(px(0, 0, 0)))).toEqual([230, 230, 230, 255])
})

test('mid mask interpolates', () => {
  const [v] = roughnessFromMask(px(128, 128, 128))
  expect(v).toBeGreaterThan(80)
  expect(v).toBeLessThan(230)
})

import { splitByMask } from './textures'

test('splitByMask: paper pixel is exact artwork in emissive, black in albedo', () => {
  const art = new Uint8ClampedArray([200, 150, 100, 255])
  const mask = new Uint8ClampedArray([0, 0, 0, 255])
  const { albedo, emissive } = splitByMask(art, mask)
  expect(Array.from(albedo)).toEqual([0, 0, 0, 255])
  expect(Array.from(emissive)).toEqual([200, 150, 100, 255])
})

test('splitByMask: foil pixel keeps full albedo plus the floor fraction in emissive', () => {
  const art = new Uint8ClampedArray([40, 50, 60, 255])
  const mask = new Uint8ClampedArray([255, 255, 255, 255])
  const { albedo, emissive } = splitByMask(art, mask, 0.35)
  expect(Array.from(albedo)).toEqual([40, 50, 60, 255])
  expect(Array.from(emissive)).toEqual([14, 18, 21, 255]) // round(art * 0.35)
})

test('splitByMask: mid mask interpolates both layers', () => {
  const art = new Uint8ClampedArray([200, 100, 50, 255])
  const mask = new Uint8ClampedArray([128, 128, 128, 255])
  const { albedo, emissive } = splitByMask(art, mask, 0.35)
  for (let c = 0; c < 3; c++) {
    expect(albedo[c]).toBeGreaterThan(0)
    expect(albedo[c]).toBeLessThan(art[c])
    // emissive between floor (full foil) and full artwork (no foil)
    expect(emissive[c]).toBeGreaterThan(art[c] * 0.35 - 1)
    expect(emissive[c]).toBeLessThan(art[c])
  }
})
