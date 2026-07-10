import { useCallback, useEffect, useRef, useState } from 'react'
import { BitMask, pickMaskAt } from './bitmask'
import { presegment } from './presegment'
import { segment, SegmentUnavailableError, type SamPoint } from './segmentClient'

export interface SmartSelectState {
  points: SamPoint[]
  proposal: Uint8Array | null
  /** number of live (network) segmentations in flight */
  busy: boolean
  error: string | null
  /** false once the server reports 503 (no FAL_KEY) — hide the tool. */
  available: boolean
  /** region-cache build progress */
  indexing: boolean
  indexed: number
  indexTotal: number
  /** cached region count once indexing finishes (0 = cache unavailable) */
  regionCount: number
}

interface TapEntry {
  point: SamPoint
  /** region resolved from cache immediately, or filled in when the live call lands */
  region: BitMask | null
  cancelled: boolean
}

/**
 * Smart-select with a region cache: the card is auto-segmented once
 * (presegment) and taps resolve instantly against cached region masks —
 * include unions the tapped region into the proposal, exclude subtracts it.
 * Taps that hit no cached region fall back to live point-prompt calls, which
 * ACCUMULATE (each resolves independently and merges in tap order — a new
 * tap never cancels an earlier one). undoTap removes the most recent tap.
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
    regionCount: 0,
  })
  const cache = useRef<BitMask[]>([])
  const indexedFor = useRef<HTMLCanvasElement | null>(null)
  const history = useRef<TapEntry[]>([])
  const generation = useRef(0) // bumped on reset to orphan in-flight taps
  const liveInFlight = useRef(0)

  // Build the region cache once per artwork.
  useEffect(() => {
    if (!artwork || indexedFor.current === artwork) return
    indexedFor.current = artwork
    cache.current = []
    setState((s) => ({ ...s, indexing: true, indexed: 0, indexTotal: 0, regionCount: 0 }))
    presegment(artwork, (done, total) =>
      setState((s) =>
        indexedFor.current === artwork ? { ...s, indexed: done, indexTotal: total } : s,
      ),
    )
      .then((masks) => {
        if (indexedFor.current !== artwork) return
        cache.current = masks
        setState((s) => ({ ...s, indexing: false, regionCount: masks.length }))
      })
      .catch((e: unknown) => {
        if (indexedFor.current !== artwork) return
        if (e instanceof SegmentUnavailableError) {
          setState((s) => ({ ...s, indexing: false, available: false }))
        } else {
          // The cache is an optimization — taps still work via the live path.
          const message = e instanceof Error ? e.message : 'auto-segmentation failed'
          setState((s) => ({
            ...s,
            indexing: false,
            error: `region cache unavailable (${message}) — taps use live mode`,
          }))
        }
      })
  }, [artwork])

  /** Fold the tap history (in order) into a fresh proposal. */
  const recompute = useCallback((size: number) => {
    const entries = history.current.filter((t) => !t.cancelled)
    if (entries.length === 0) return null
    const sel = new Uint8Array(size)
    for (const t of entries) {
      if (!t.region) continue // live tap still in flight
      if (t.point.label === 1) t.region.unionInto(sel)
      else t.region.subtractFrom(sel)
    }
    return sel
  }, [])

  const publish = useCallback(() => {
    if (!artwork) return
    setState((s) => ({
      ...s,
      points: history.current.filter((t) => !t.cancelled).map((t) => t.point),
      proposal: recompute(artwork.width * artwork.height),
      busy: liveInFlight.current > 0,
    }))
  }, [artwork, recompute])

  const tap = useCallback(
    (x: number, y: number, label: 0 | 1) => {
      if (!artwork) return
      const point: SamPoint = { x, y, label }
      const cached = pickMaskAt(cache.current, y * artwork.width + x)
      const entry: TapEntry = { point, region: cached, cancelled: false }
      history.current.push(entry)
      if (cached) {
        publish()
        return
      }
      // Live fallback: always segment the object AT the tap (label 1); the
      // user's include/exclude choice decides how the region merges.
      const gen = generation.current
      liveInFlight.current++
      publish()
      void segment(artwork, [{ x, y, label: 1 }])
        .then((sel) => {
          if (generation.current !== gen) return
          entry.region = BitMask.fromSelection(sel)
        })
        .catch((e: unknown) => {
          if (generation.current !== gen) return
          entry.cancelled = true
          if (e instanceof SegmentUnavailableError) {
            setState((cur) => ({ ...cur, available: false }))
          } else {
            const message = e instanceof Error ? e.message : 'segmentation failed'
            setState((cur) => ({ ...cur, error: message }))
          }
        })
        .finally(() => {
          if (generation.current !== gen) return
          liveInFlight.current--
          publish()
        })
    },
    [artwork, publish],
  )

  /** Remove the most recent (non-cancelled) tap. */
  const undoTap = useCallback(() => {
    for (let i = history.current.length - 1; i >= 0; i--) {
      if (!history.current[i].cancelled) {
        history.current[i].cancelled = true
        break
      }
    }
    publish()
  }, [publish])

  const reset = useCallback(() => {
    generation.current++
    liveInFlight.current = 0
    history.current = []
    setState((s) => ({ ...s, points: [], proposal: null, busy: false, error: null }))
  }, [])

  const hasTaps = state.points.length > 0

  return { state, tap, undoTap, hasTaps, reset }
}
