import { expect, test } from 'vitest'
import { BitMask, pickMaskAt } from './bitmask'

function mask(bits: number[]): BitMask {
  return BitMask.fromSelection(new Uint8Array(bits))
}

test('round-trips membership and counts area across word boundaries', () => {
  const bits = new Array(70).fill(0)
  bits[0] = bits[31] = bits[32] = bits[69] = 1
  const m = mask(bits)
  expect(m.area).toBe(4)
  expect(m.get(0)).toBe(true)
  expect(m.get(31)).toBe(true)
  expect(m.get(32)).toBe(true)
  expect(m.get(69)).toBe(true)
  expect(m.get(1)).toBe(false)
  expect(m.get(-1)).toBe(false)
  expect(m.get(70)).toBe(false)
})

test('unionInto sets bits without clearing existing ones', () => {
  const sel = new Uint8Array([1, 0, 0, 0])
  mask([0, 0, 1, 0]).unionInto(sel)
  expect(Array.from(sel)).toEqual([1, 0, 1, 0])
})

test('subtractFrom clears only its own bits', () => {
  const sel = new Uint8Array([1, 1, 1, 0])
  mask([0, 1, 0, 0]).subtractFrom(sel)
  expect(Array.from(sel)).toEqual([1, 0, 1, 0])
})

test('pickMaskAt returns the smallest containing mask', () => {
  const big = mask([1, 1, 1, 1])
  const small = mask([0, 1, 0, 0])
  expect(pickMaskAt([big, small], 1)).toBe(small)
  expect(pickMaskAt([big, small], 0)).toBe(big)
  expect(pickMaskAt([big, small], 4)).toBeNull()
})
