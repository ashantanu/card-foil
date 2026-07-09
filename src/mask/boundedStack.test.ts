import { expect, test } from 'vitest'
import { BoundedStack } from './boundedStack'

test('push/pop is LIFO', () => {
  const s = new BoundedStack<number>(10)
  s.push(1)
  s.push(2)
  expect(s.pop()).toBe(2)
  expect(s.pop()).toBe(1)
  expect(s.pop()).toBeUndefined()
})

test('exceeding the limit drops the oldest item', () => {
  const s = new BoundedStack<number>(3)
  for (const n of [1, 2, 3, 4]) s.push(n)
  expect(s.size).toBe(3)
  expect(s.pop()).toBe(4)
  expect(s.pop()).toBe(3)
  expect(s.pop()).toBe(2)
  expect(s.pop()).toBeUndefined() // 1 was evicted
})
