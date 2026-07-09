import { expect, test } from 'vitest'
import { fitWithin } from './imageLoad'

test('image within limit is untouched', () => {
  expect(fitWithin(800, 1200, 2048)).toEqual({ width: 800, height: 1200 })
})

test('oversized landscape scales by width', () => {
  expect(fitWithin(4096, 2048, 2048)).toEqual({ width: 2048, height: 1024 })
})

test('oversized portrait scales by height', () => {
  expect(fitWithin(3000, 6000, 2048)).toEqual({ width: 1024, height: 2048 })
})
