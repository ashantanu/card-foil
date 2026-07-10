import { useCallback, useRef, useState } from 'react'
import { segment, SegmentUnavailableError, type SamPoint } from './segmentClient'

export interface SmartSelectState {
  points: SamPoint[]
  proposal: Uint8Array | null
  busy: boolean
  error: string | null
  /** false once the server reports 503 (no FAL_KEY) — hide the tool. */
  available: boolean
}

/**
 * Accumulates include/exclude tap points and keeps `proposal` in sync via the
 * segmentation API. Concurrent requests are superseded: only the newest
 * response is applied (last write wins).
 */
export function useSmartSelect(artwork: HTMLCanvasElement | null) {
  const [state, setState] = useState<SmartSelectState>({
    points: [],
    proposal: null,
    busy: false,
    error: null,
    available: true,
  })
  const requestSeq = useRef(0)

  const tap = useCallback(
    (x: number, y: number, label: 0 | 1) => {
      if (!artwork) return
      setState((s) => {
        const points = [...s.points, { x, y, label }]
        const seq = ++requestSeq.current
        void segment(artwork, points)
          .then((proposal) => {
            if (requestSeq.current !== seq) return // superseded
            setState((cur) => ({ ...cur, proposal, busy: false, error: null }))
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
        return { ...s, points, busy: true, error: null }
      })
    },
    [artwork],
  )

  const reset = useCallback(() => {
    requestSeq.current++ // orphan any in-flight request
    setState((s) => ({ ...s, points: [], proposal: null, busy: false, error: null }))
  }, [])

  return { state, tap, reset }
}
