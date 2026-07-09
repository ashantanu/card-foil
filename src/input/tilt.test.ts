import { describe, expect, test } from 'vitest'
import { clamp, orientationToTilt, pointerToTilt } from './tilt'

const rect = { left: 100, top: 200, width: 400, height: 600 }

describe('pointerToTilt', () => {
  test('center of rect → (0, 0)', () => {
    expect(pointerToTilt(300, 500, rect)).toEqual({ x: 0, y: 0 })
  })
  test('top-left corner → (-1, -1)', () => {
    expect(pointerToTilt(100, 200, rect)).toEqual({ x: -1, y: -1 })
  })
  test('beyond bottom-right clamps to (1, 1)', () => {
    expect(pointerToTilt(9999, 9999, rect)).toEqual({ x: 1, y: 1 })
  })
})

describe('orientationToTilt', () => {
  const base = { beta: 40, gamma: 0 }
  test('at baseline → (0, 0)', () => {
    expect(orientationToTilt(40, 0, base)).toEqual({ x: 0, y: 0 })
  })
  test('gamma +15° of default 30° range → x = 0.5', () => {
    expect(orientationToTilt(40, 15, base)).toEqual({ x: 0.5, y: 0 })
  })
  test('clamps beyond range', () => {
    expect(orientationToTilt(120, -80, base)).toEqual({ x: -1, y: 1 })
  })
  test('null beta/gamma (no gyro) → null', () => {
    expect(orientationToTilt(null, null, base)).toBeNull()
  })
})

test('clamp', () => {
  expect(clamp(5, 0, 1)).toBe(1)
  expect(clamp(-5, 0, 1)).toBe(0)
  expect(clamp(0.5, 0, 1)).toBe(0.5)
})
