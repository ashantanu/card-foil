import { useState } from 'react'

type RequestPermission = () => Promise<'granted' | 'denied'>

/** iOS 13+ gates deviceorientation behind a tap-triggered permission call. */
export function needsMotionPermission(): boolean {
  const DOE = globalThis.DeviceOrientationEvent as
    | { requestPermission?: RequestPermission }
    | undefined
  return typeof DOE?.requestPermission === 'function'
}

// Module-level so the grant/deny outcome survives this component unmounting
// (e.g. switching Preview -> Edit -> Preview), rather than resetting to
// 'idle' and re-showing the permission button on iOS.
let resolved: 'granted' | 'denied' | null = null

export function MotionPermission({ onGranted }: { onGranted?: () => void }) {
  const [state, setState] = useState<'unneeded' | 'idle' | 'granted' | 'denied'>(
    () => resolved ?? (needsMotionPermission() ? 'idle' : 'unneeded'),
  )

  if (state === 'unneeded' || state === 'granted') return null
  if (state === 'denied') {
    return <p className="motion-hint">Motion blocked — drag over the card instead.</p>
  }
  return (
    <button
      className="motion-button"
      onClick={async () => {
        try {
          const request = (DeviceOrientationEvent as unknown as {
            requestPermission: RequestPermission
          }).requestPermission
          const result = await request()
          resolved = result
          setState(result)
          if (result === 'granted') onGranted?.()
        } catch {
          resolved = 'denied'
          setState('denied')
        }
      }}
    >
      Enable motion
    </button>
  )
}
