import { BoundedStack } from './boundedStack'

const UNDO_LIMIT = 20
const UNDO_BYTE_BUDGET = 64 * 1024 * 1024

/** Grayscale foil mask editor: white = foil, black = not foil. */
export class MaskEditor {
  readonly canvas: HTMLCanvasElement
  onChange?: () => void
  private ctx: CanvasRenderingContext2D
  private undoStack: BoundedStack<ImageData>
  private redoStack: BoundedStack<ImageData>
  private stackLimit: number
  private stroking = false
  private rafId: number | null = null

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, width, height)
    // Cap undo memory to a byte budget instead of a flat snapshot count —
    // at large canvas sizes 20 full ImageData snapshots can be hundreds of MB.
    this.stackLimit = Math.max(
      4,
      Math.min(UNDO_LIMIT, Math.floor(UNDO_BYTE_BUDGET / (width * height * 4))),
    )
    this.undoStack = new BoundedStack<ImageData>(this.stackLimit)
    this.redoStack = new BoundedStack<ImageData>(this.stackLimit)
  }

  private snapshot(): void {
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height))
    // A new edit invalidates the redo branch.
    this.redoStack = new BoundedStack<ImageData>(this.stackLimit)
  }

  private changed(): void {
    if (this.rafId != null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      this.onChange?.()
    })
  }

  /** Reset the whole mask to no-foil (undoable). */
  clear(): void {
    this.snapshot()
    this.stroking = false
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.changed()
  }

  /** x/y in mask-canvas pixel coordinates. Eraser paints black. */
  beginStroke(x: number, y: number, size: number, erase: boolean): void {
    this.snapshot()
    this.stroking = true
    this.ctx.lineWidth = size
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.strokeStyle = erase ? '#000' : '#fff'
    this.ctx.fillStyle = this.ctx.strokeStyle
    this.ctx.beginPath()
    // Dot for a single tap:
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.changed()
  }

  strokeTo(x: number, y: number): void {
    if (!this.stroking) return
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.changed()
  }

  endStroke(): void {
    this.stroking = false
  }

  /** Set pixels from a floodSelect result (same dimensions as the mask). */
  applySelection(sel: Uint8Array, mode: 'add' | 'remove'): void {
    this.snapshot()
    const img = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const value = mode === 'add' ? 255 : 0
    for (let p = 0; p < sel.length; p++) {
      if (!sel[p]) continue
      const i = p * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = value
      img.data[i + 3] = 255
    }
    this.ctx.putImageData(img, 0, 0)
    this.changed()
  }

  undo(): void {
    if (this.stroking) return
    const prev = this.undoStack.pop()
    if (!prev) return
    this.redoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height))
    this.ctx.putImageData(prev, 0, 0)
    this.changed()
  }

  redo(): void {
    if (this.stroking) return
    const next = this.redoStack.pop()
    if (!next) return
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height))
    this.ctx.putImageData(next, 0, 0)
    this.changed()
  }

  exportPNG(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Mask export failed'))),
        'image/png',
      )
    })
  }

  /** Import any image as the mask, scaled to mask dimensions. */
  importImage(img: HTMLImageElement): void {
    this.snapshot()
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
    this.changed()
  }

  /** Initialize from an existing mask canvas (e.g. the sample mask). */
  loadFrom(mask: HTMLCanvasElement): void {
    this.ctx.drawImage(mask, 0, 0, this.canvas.width, this.canvas.height)
    this.changed()
  }
}
