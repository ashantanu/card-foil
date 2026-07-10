import { useEffect, useRef } from 'react'
import type { SamPoint } from '../segment/segmentClient'
import { floodSelect } from './floodSelect'
import type { MaskEditor } from './maskEditor'

export type Tool = 'smart' | 'brush' | 'eraser' | 'wand'
export type WandMode = 'add' | 'remove'

export function MaskPainter({
  artwork,
  editor,
  tool,
  brushSize,
  tolerance,
  wandMode,
  highlightMask,
  smartPoints,
  smartProposal,
  smartBusy,
  onSmartTap,
  onSmartCommit,
  onSmartCancel,
}: {
  artwork: HTMLCanvasElement
  editor: MaskEditor
  tool: Tool
  brushSize: number
  tolerance: number
  wandMode: WandMode
  highlightMask: boolean
  smartPoints: SamPoint[]
  smartProposal: Uint8Array | null
  smartBusy: boolean
  onSmartTap: (x: number, y: number) => void
  onSmartCommit: (mode: 'add' | 'remove') => void
  onSmartCancel: () => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const proposalRef = useRef<HTMLCanvasElement>(null)

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

    // Subtle gold reads nicely but disappears on gold-toned artwork; the
    // highlight mode exists so over-selection (e.g. a wand grabbing half a
    // photo card) is unmissable.
    const [r, g, b, alpha] = highlightMask ? [255, 0, 200, 0.8] : [201, 162, 75, 0.55]

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
        dst[i] = r
        dst[i + 1] = g
        dst[i + 2] = b
        dst[i + 3] = maskValue * alpha
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
  }, [artwork, editor, highlightMask])

  // Smart-select proposal layer (cyan, distinct from the committed mask).
  useEffect(() => {
    const c = proposalRef.current!
    c.width = artwork.width
    c.height = artwork.height
    const ctx = c.getContext('2d')!
    if (!smartProposal) {
      ctx.clearRect(0, 0, c.width, c.height)
      return
    }
    const img = ctx.createImageData(c.width, c.height)
    for (let p = 0; p < smartProposal.length; p++) {
      const i = p * 4
      img.data[i] = 34 // #22d3ee
      img.data[i + 1] = 211
      img.data[i + 2] = 238
      img.data[i + 3] = smartProposal[p] ? 150 : 0
    }
    ctx.putImageData(img, 0, 0)
  }, [artwork, smartProposal])

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
        if (tool === 'smart') {
          onSmartTap(x, y)
        } else if (tool === 'wand') {
          const ctx = artwork.getContext('2d', { willReadFrequently: true })!
          const raster = ctx.getImageData(0, 0, artwork.width, artwork.height)
          editor.applySelection(floodSelect(raster, x, y, tolerance), wandMode)
        } else {
          editor.beginStroke(x, y, brushSize, tool === 'eraser')
        }
      }}
      onPointerMove={(e) => {
        if (tool === 'smart' || tool === 'wand' || e.buttons === 0) return
        const { x, y } = toMask(e)
        editor.strokeTo(x, y)
      }}
      onPointerUp={() => editor.endStroke()}
      onPointerCancel={() => editor.endStroke()}
    >
      <canvas ref={bgRef} className="painter-layer" />
      <canvas ref={overlayRef} className="painter-layer" />
      <canvas ref={proposalRef} className="painter-layer" />
      {tool === 'smart' &&
        smartPoints.map((p, i) => (
          <span
            key={i}
            className={`tap-marker ${p.label === 1 ? 'tap-marker--include' : 'tap-marker--exclude'}`}
            style={{
              left: `${(p.x / artwork.width) * 100}%`,
              top: `${(p.y / artwork.height) * 100}%`,
            }}
          />
        ))}
      {tool === 'smart' && (smartProposal || smartBusy) && (
        <div className="proposal-actions" onPointerDown={(e) => e.stopPropagation()}>
          {smartBusy && <span className="spinner" aria-label="segmenting" />}
          {smartProposal && (
            <>
              <button onClick={() => onSmartCommit('add')}>Add foil</button>
              <button onClick={() => onSmartCommit('remove')}>Remove foil</button>
            </>
          )}
          <button onClick={onSmartCancel}>Cancel</button>
        </div>
      )}
    </div>
  )
}
