import { useEffect, useMemo, useRef, useState } from 'react'
import { CardScene } from './card/CardScene'
import { usePrefersReducedMotion, webglAvailable } from './card/env'
import {
  buildCardMaps,
  loadImage,
  loadSampleAssets,
  updateFoilSplitCanvases,
  updateRoughnessCanvas,
  type CardMaps,
} from './card/textures'
import { EditorPanel } from './EditorPanel'
import { MaskEditor } from './mask/maskEditor'
import { MaskPainter, type Tool, type WandMode } from './mask/MaskPainter'
import { useSmartSelect } from './segment/useSmartSelect'
import { MotionPermission } from './input/MotionPermission'
import { useTilt } from './input/useTilt'

interface CardState {
  artwork: HTMLCanvasElement
  editor: MaskEditor
  maps: CardMaps
}

function makeCardState(artwork: HTMLCanvasElement, initialMask?: HTMLCanvasElement): CardState {
  const editor = new MaskEditor(artwork.width, artwork.height)
  if (initialMask) editor.loadFrom(initialMask)
  const maps = buildCardMaps(artwork, editor.canvas)
  editor.onChange = () => {
    maps.metalnessMap.needsUpdate = true
    updateRoughnessCanvas(editor.canvas, maps.roughnessMap.image as HTMLCanvasElement)
    maps.roughnessMap.needsUpdate = true
    updateFoilSplitCanvases(
      artwork,
      editor.canvas,
      maps.map.image as HTMLCanvasElement,
      maps.emissiveMap.image as HTMLCanvasElement,
    )
    maps.map.needsUpdate = true
    maps.emissiveMap.needsUpdate = true
  }
  return { artwork, editor, maps }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tilt, recenter } = useTilt(containerRef)
  const reduced = usePrefersReducedMotion()
  const hasWebgl = useMemo(webglAvailable, [])

  const [view, setView] = useState<'preview' | 'edit'>('preview')
  const [card, setCard] = useState<CardState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('smart')
  const [brushSize, setBrushSize] = useState(24)
  const [tolerance, setTolerance] = useState(40)
  const [wandMode, setWandMode] = useState<WandMode>('add')
  const [highlightMask, setHighlightMask] = useState(true)
  const [smartLabel, setSmartLabel] = useState<0 | 1>(1)
  const smart = useSmartSelect(card?.artwork ?? null)

  useEffect(() => {
    let cancelled = false
    loadSampleAssets().then(({ artwork, mask }) => {
      if (!cancelled) setCard(makeCardState(artwork, mask))
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!hasWebgl) {
    return (
      <div className="stage">
        <img className="flat-card" src="/sample/sample-card.svg" alt="Sample invitation card" />
      </div>
    )
  }
  if (!card) return null

  const aspect = card.artwork.width / card.artwork.height
  // If the deployment has no segmentation backend (503), fall back to brush.
  const effectiveTool: Tool = tool === 'smart' && !smart.state.available ? 'brush' : tool
  const banner = error ?? smart.state.error

  return (
    <div className="layout">
      <header className="topbar">
        <strong>Foil Studio</strong>
        <nav>
          <button disabled={view === 'preview'} onClick={() => setView('preview')}>
            Preview
          </button>
          <button disabled={view === 'edit'} onClick={() => setView('edit')}>
            Edit foil
          </button>
        </nav>
      </header>

      {banner && (
        <p className="error" onClick={() => setError(null)}>
          {banner}
        </p>
      )}

      {view === 'preview' ? (
        <div className="stage" ref={containerRef}>
          <CardScene maps={card.maps} aspect={aspect} tilt={tilt} frozen={reduced} />
          <MotionPermission onGranted={recenter} />
        </div>
      ) : (
        <div className="edit-layout">
          <MaskPainter
            artwork={card.artwork}
            editor={card.editor}
            tool={effectiveTool}
            brushSize={brushSize}
            tolerance={tolerance}
            wandMode={wandMode}
            highlightMask={highlightMask}
            smartPoints={smart.state.points}
            smartProposal={smart.state.proposal}
            smartBusy={smart.state.busy}
            onSmartTap={(x, y) => smart.tap(x, y, smartLabel)}
            onSmartCommit={(mode) => {
              if (smart.state.proposal) card.editor.applySelection(smart.state.proposal, mode)
              smart.reset()
            }}
            onSmartCancel={smart.reset}
          />
          <EditorPanel
            tool={tool}
            setTool={setTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            tolerance={tolerance}
            setTolerance={setTolerance}
            wandMode={wandMode}
            setWandMode={setWandMode}
            highlightMask={highlightMask}
            setHighlightMask={setHighlightMask}
            smartAvailable={smart.state.available}
            smartLabel={smartLabel}
            setSmartLabel={setSmartLabel}
            onUndo={() => card.editor.undo()}
            onClear={() => card.editor.clear()}
            onExportMask={() => {
              void card.editor.exportPNG().then((blob) => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'foil-mask.png'
                a.click()
                URL.revokeObjectURL(a.href)
              })
            }}
            onImportMask={(file) => {
              const url = URL.createObjectURL(file)
              void loadImage(url)
                .then((img) => card.editor.importImage(img))
                .catch(() => setError('Could not read that mask image.'))
                .finally(() => URL.revokeObjectURL(url))
            }}
            onUploadCard={(artwork) => {
              // Dispose here (a plain read of `card`, not inside the setState
              // updater) since StrictMode double-invokes updaters, which
              // would double-dispose textures if this side effect lived there.
              if (card) {
                card.maps.map.dispose()
                card.maps.emissiveMap.dispose()
                card.maps.metalnessMap.dispose()
                card.maps.roughnessMap.dispose()
              }
              smart.reset()
              setCard(makeCardState(artwork))
              setView('edit')
            }}
            onError={setError}
          />
        </div>
      )}
    </div>
  )
}
