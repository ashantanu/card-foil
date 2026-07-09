export class BoundedStack<T> {
  private items: T[] = []
  private limit: number

  constructor(limit = 20) {
    this.limit = limit
  }

  push(item: T): void {
    this.items.push(item)
    if (this.items.length > this.limit) this.items.shift()
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  get size(): number {
    return this.items.length
  }
}
