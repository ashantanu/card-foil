import { useEffect, useRef } from 'react'
import { floodSelect } from './floodSelect'
import type { MaskEditor } from './maskEditor'

export type Tool = 'brush' | 'eraser' | 'wand'

export function MaskPainter({
  artwork,
  editor,
  tool,
  brushSize,
  tolerance,
}: {
  artwork: HTMLCanvasElement
  editor: MaskEditor
  tool: Tool
  brushSize: number
  tolerance: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  // Draw artwork + tinted mask overlay; re-tint on every editor change.
  useEffect(() => {
    const bg = bgRef.current!
    bg.width = artwork.width
    bg.height = artwork.height
    bg.getContext('2d')!.drawImage(artwork, 0, 0)

    const overlay = overlayRef.current!
    overlay.width = artwork.width
    overlay.height = artwork.height
    const octx = overlay.getContext('2d')!

    const paintOverlay = () => {
      // Derive per-pixel alpha from mask luminance instead of compositing the
      // (fully opaque) mask canvas directly — otherwise the whole card gets
      // tinted uniformly since the mask has alpha=1 everywhere.
      const maskCtx = editor.canvas.getContext('2d')!
      const maskData = maskCtx.getImageData(0, 0, editor.canvas.width, editor.canvas.height)
      const overlayData = octx.createImageData(overlay.width, overlay.height)
      const src = maskData.data
      const dst = overlayData.data
      for (let i = 0; i < src.length; i += 4) {
        const maskValue = src[i] // red channel: 0 = no foil, 255 = foil
        dst[i] = 201 // #c9a24b red
        dst[i + 1] = 162 // #c9a24b green
        dst[i + 2] = 75 // #c9a24b blue
        dst[i + 3] = maskValue * 0.55
      }
      octx.putImageData(overlayData, 0, 0)
    }
    paintOverlay()
    const prev = editor.onChange
    editor.onChange = () => {
      prev?.()
      paintOverlay()
    }
    return () => {
      editor.onChange = prev
    }
  }, [artwork, editor])

  /** Display px → mask-canvas px. */
  const toMask = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * artwork.width),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * artwork.height),
    }
  }

  return (
    <div
      ref={wrapRef}
      className="painter"
      style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const { x, y } = toMask(e)
        if (tool === 'wand') {
          const ctx = artwork.getContext('2d', { willReadFrequently: true })!
          const raster = ctx.getImageData(0, 0, artwork.width, artwork.height)
          editor.applySelection(floodSelect(raster, x, y, tolerance), 'add')
        } else {
          editor.beginStroke(x, y, brushSize, tool === 'eraser')
        }
      }}
      onPointerMove={(e) => {
        if (tool === 'wand' || e.buttons === 0) return
        const { x, y } = toMask(e)
        editor.strokeTo(x, y)
      }}
      onPointerUp={() => editor.endStroke()}
      onPointerCancel={() => editor.endStroke()}
    >
      <canvas ref={bgRef} className="painter-layer" />
      <canvas ref={overlayRef} className="painter-layer" />
    </div>
  )
}
