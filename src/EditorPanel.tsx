import { UploadPanel } from './upload/UploadPanel'
import type { Tool, WandMode } from './mask/MaskPainter'

export function EditorPanel(props: {
  tool: Tool
  setTool: (t: Tool) => void
  brushSize: number
  setBrushSize: (n: number) => void
  tolerance: number
  setTolerance: (n: number) => void
  wandMode: WandMode
  setWandMode: (m: WandMode) => void
  highlightMask: boolean
  setHighlightMask: (v: boolean) => void
  smartAvailable: boolean
  smartLabel: 0 | 1
  setSmartLabel: (l: 0 | 1) => void
  smartIndexing: boolean
  smartIndexed: number
  smartIndexTotal: number
  onUndo: () => void
  onClear: () => void
  onExportMask: () => void
  onImportMask: (file: File) => void
  onUploadCard: (canvas: HTMLCanvasElement) => void
  onError: (msg: string) => void
}) {
  return (
    <aside className="panel">
      <UploadPanel onLoaded={props.onUploadCard} onError={props.onError} />

      <fieldset>
        <legend>Tool</legend>
        {(props.smartAvailable
          ? (['smart', 'brush', 'eraser', 'wand'] as const)
          : (['brush', 'eraser', 'wand'] as const)
        ).map((t) => (
          <label key={t}>
            <input
              type="radio"
              name="tool"
              checked={props.tool === t}
              onChange={() => props.setTool(t)}
            />
            {t === 'wand' ? 'color wand' : t === 'smart' ? 'smart select (AI)' : t}
          </label>
        ))}
      </fieldset>

      {props.tool === 'smart' && (
        <>
          <fieldset>
            <legend>Tap means</legend>
            {([1, 0] as const).map((l) => (
              <label key={l}>
                <input
                  type="radio"
                  name="smart-label"
                  checked={props.smartLabel === l}
                  onChange={() => props.setSmartLabel(l)}
                />
                {l === 1 ? 'include this' : 'exclude this'}
              </label>
            ))}
          </fieldset>
          {props.smartIndexing && (
            <p className="hint">
              Indexing regions…{' '}
              {props.smartIndexTotal > 0
                ? `${props.smartIndexed}/${props.smartIndexTotal}`
                : ''}{' '}
              (taps work meanwhile, just slower)
            </p>
          )}
          <p className="hint">Sends the card image to our segmentation service.</p>
        </>
      )}

      {(props.tool === 'brush' || props.tool === 'eraser') && (
        <label className="slider">
          Brush size {props.brushSize}px
          <input
            type="range"
            min={4}
            max={120}
            value={props.brushSize}
            onChange={(e) => props.setBrushSize(Number(e.target.value))}
          />
        </label>
      )}

      {props.tool === 'wand' && (
        <>
          <label className="slider">
            Tolerance {props.tolerance}
            <input
              type="range"
              min={0}
              max={120}
              value={props.tolerance}
              onChange={(e) => props.setTolerance(Number(e.target.value))}
            />
          </label>
          <fieldset>
            <legend>Wand mode</legend>
            {(['add', 'remove'] as const).map((m) => (
              <label key={m}>
                <input
                  type="radio"
                  name="wand-mode"
                  checked={props.wandMode === m}
                  onChange={() => props.setWandMode(m)}
                />
                {m === 'add' ? 'add foil' : 'remove foil'}
              </label>
            ))}
          </fieldset>
        </>
      )}

      <label>
        <input
          type="checkbox"
          checked={props.highlightMask}
          onChange={(e) => props.setHighlightMask(e.target.checked)}
        />{' '}
        Highlight foil (pink)
      </label>

      <div className="row">
        <button onClick={props.onUndo}>Undo</button>
        <button onClick={props.onClear}>Clear foil</button>
        <button onClick={props.onExportMask}>Export mask</button>
        <label className="file-button">
          Import mask
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) props.onImportMask(f)
            }}
          />
        </label>
      </div>
    </aside>
  )
}
