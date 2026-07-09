import { useEffect, useMemo, useRef, useState } from 'react'
import { CardScene } from './card/CardScene'
import { usePrefersReducedMotion, webglAvailable } from './card/env'
import { buildCardMaps, loadSampleAssets, type CardMaps } from './card/textures'
import { MotionPermission } from './input/MotionPermission'
import { useTilt } from './input/useTilt'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tilt, recenter } = useTilt(containerRef)
  const reduced = usePrefersReducedMotion()
  const hasWebgl = useMemo(webglAvailable, [])
  const [card, setCard] = useState<{ maps: CardMaps; aspect: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSampleAssets().then(({ artwork, mask }) => {
      if (cancelled) return
      setCard({ maps: buildCardMaps(artwork, mask), aspect: artwork.width / artwork.height })
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

  return (
    <div className="stage" ref={containerRef}>
      {card && <CardScene maps={card.maps} aspect={card.aspect} tilt={tilt} frozen={reduced} />}
      <MotionPermission onGranted={recenter} />
    </div>
  )
}
