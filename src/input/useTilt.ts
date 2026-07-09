import { useCallback, useEffect, useRef } from 'react'
import { orientationToTilt, pointerToTilt, type Tilt } from './tilt'

/** While gyro events are flowing, ignore pointer input for this long. */
const GYRO_HOLDOFF_MS = 500

export function useTilt(containerRef: React.RefObject<HTMLElement | null>) {
  const tilt = useRef<Tilt>({ x: 0, y: 0 })
  const baseline = useRef<{ beta: number; gamma: number } | null>(null)
  const lastGyroAt = useRef(-Infinity)

  useEffect(() => {
    // Listen on window (not the container): the container div can unmount and
    // remount when the app switches views, which would orphan its listeners.
    const onPointer = (e: PointerEvent) => {
      const el = containerRef.current
      if (!el) return
      if (performance.now() - lastGyroAt.current < GYRO_HOLDOFF_MS) return
      tilt.current = pointerToTilt(e.clientX, e.clientY, el.getBoundingClientRect())
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      baseline.current ??= { beta: e.beta, gamma: e.gamma }
      const t = orientationToTilt(e.beta, e.gamma, baseline.current)
      if (t) {
        tilt.current = t
        lastGyroAt.current = performance.now()
      }
    }

    window.addEventListener('pointermove', onPointer)
    window.addEventListener('deviceorientation', onOrientation)
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('deviceorientation', onOrientation)
    }
  }, [containerRef])

  /** Re-capture the gyro baseline from the current hold position. */
  const recenter = useCallback(() => {
    baseline.current = null
  }, [])

  return { tilt, recenter }
}
