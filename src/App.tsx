import { useEffect, useMemo, useRef, useState } from 'react'
import { CardScene } from './card/CardScene'
import { usePrefersReducedMotion, webglAvailable } from './card/env'
import {
  buildCardMaps,
  loadImage,
  loadSampleAssets,
  updateRoughnessCanvas,
  type CardMaps,
} from './card/textures'
import { EditorPanel } from './EditorPanel'
import { MaskEditor } from './mask/maskEditor'
import { MaskPainter, type Tool } from './mask/MaskPainter'
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
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(24)
  const [tolerance, setTolerance] = useState(40)

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

      {error && (
        <p className="error" onClick={() => setError(null)}>
          {error}
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
            tool={tool}
            brushSize={brushSize}
            tolerance={tolerance}
          />
          <EditorPanel
            tool={tool}
            setTool={setTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            tolerance={tolerance}
            setTolerance={setTolerance}
            onUndo={() => card.editor.undo()}
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
                card.maps.metalnessMap.dispose()
                card.maps.roughnessMap.dispose()
              }
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
