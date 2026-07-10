import { useCallback, useEffect, useRef, useState } from 'react'
import { BitMask, pickMaskAt } from './bitmask'
import { presegment } from './presegment'
import { segment, SegmentUnavailableError, type SamPoint } from './segmentClient'

export interface SmartSelectState {
  points: SamPoint[]
  proposal: Uint8Array | null
  /** true while a live (network) segmentation is in flight */
  busy: boolean
  error: string | null
  /** false once the server reports 503 (no FAL_KEY) — hide the tool. */
  available: boolean
  /** region-cache build progress */
  indexing: boolean
  indexed: number
  indexTotal: number
}

/**
 * Smart-select with a region cache: the card is auto-segmented once
 * (presegment) and taps resolve instantly against cached region masks —
 * include unions the tapped region into the proposal, exclude subtracts it.
 * Taps that hit no cached region fall back to a live point-prompt call.
 */
export function useSmartSelect(artwork: HTMLCanvasElement | null) {
  const [state, setState] = useState<SmartSelectState>({
    points: [],
    proposal: null,
    busy: false,
    error: null,
    available: true,
    indexing: false,
    indexed: 0,
    indexTotal: 0,
  })
  const cache = useRef<BitMask[]>([])
  const indexedFor = useRef<HTMLCanvasElement | null>(null)
  const requestSeq = useRef(0)

  // Build the region cache once per artwork.
  useEffect(() => {
    if (!artwork || indexedFor.current === artwork) return
    indexedFor.current = artwork
    cache.current = []
    setState((s) => ({ ...s, indexing: true, indexed: 0, indexTotal: 0 }))
    presegment(artwork, (done, total) =>
      setState((s) =>
        indexedFor.current === artwork ? { ...s, indexed: done, indexTotal: total } : s,
      ),
    )
      .then((masks) => {
        if (indexedFor.current !== artwork) return
        cache.current = masks
        setState((s) => ({ ...s, indexing: false }))
      })
      .catch((e: unknown) => {
        if (indexedFor.current !== artwork) return
        // Cache is an optimization — taps still work via the live path.
        const unavailable = e instanceof SegmentUnavailableError
        setState((s) => ({ ...s, indexing: false, available: !unavailable && s.available }))
      })
  }, [artwork])

  const applyRegion = useCallback((region: BitMask, label: 0 | 1, base: Uint8Array | null, size: number) => {
    const next = base ? base.slice() : new Uint8Array(size)
    if (label === 1) region.unionInto(next)
    else region.subtractFrom(next)
    return next
  }, [])

  const tap = useCallback(
    (x: number, y: number, label: 0 | 1) => {
      if (!artwork) return
      const size = artwork.width * artwork.height
      const region = pickMaskAt(cache.current, y * artwork.width + x)
      if (region) {
        // Instant local path.
        setState((s) => ({
          ...s,
          points: [...s.points, { x, y, label }],
          proposal: applyRegion(region, label, s.proposal, size),
          error: null,
        }))
        return
      }
      // Live fallback for regions the auto-segmentation didn't isolate.
      const seq = ++requestSeq.current
      setState((s) => ({ ...s, points: [...s.points, { x, y, label }], busy: true, error: null }))
      void segment(artwork, [{ x, y, label: 1 }])
        .then((sel) => {
          if (requestSeq.current !== seq) return // superseded
          const region = BitMask.fromSelection(sel)
          setState((cur) => ({
            ...cur,
            proposal: applyRegion(region, label, cur.proposal, size),
            busy: false,
          }))
        })
        .catch((e: unknown) => {
          if (requestSeq.current !== seq) return
          if (e instanceof SegmentUnavailableError) {
            setState((cur) => ({ ...cur, busy: false, available: false, error: e.message }))
          } else {
            const message = e instanceof Error ? e.message : 'segmentation failed'
            setState((cur) => ({ ...cur, busy: false, error: message }))
          }
        })
    },
    [artwork, applyRegion],
  )

  const reset = useCallback(() => {
    requestSeq.current++ // orphan any in-flight request
    setState((s) => ({ ...s, points: [], proposal: null, busy: false, error: null }))
  }, [])

  return { state, tap, reset }
}
