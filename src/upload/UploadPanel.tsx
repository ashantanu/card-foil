import { useState } from 'react'
import { loadCardImage } from './imageLoad'

export function UploadPanel({
  onLoaded,
  onError,
}: {
  onLoaded: (canvas: HTMLCanvasElement) => void
  onError: (message: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      onLoaded(await loadCardImage(file))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not load that image.')
    }
  }

  return (
    <label
      className={`upload ${dragging ? 'upload--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void handleFile(e.dataTransfer.files[0])
      }}
    >
      Upload your card
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0] ?? undefined)}
      />
    </label>
  )
}
