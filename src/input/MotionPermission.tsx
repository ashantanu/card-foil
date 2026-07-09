import { useState } from 'react'

type RequestPermission = () => Promise<'granted' | 'denied'>

/** iOS 13+ gates deviceorientation behind a tap-triggered permission call. */
export function needsMotionPermission(): boolean {
  const DOE = globalThis.DeviceOrientationEvent as
    | { requestPermission?: RequestPermission }
    | undefined
  return typeof DOE?.requestPermission === 'function'
}

export function MotionPermission({ onGranted }: { onGranted?: () => void }) {
  const [state, setState] = useState<'unneeded' | 'idle' | 'granted' | 'denied'>(
    () => (needsMotionPermission() ? 'idle' : 'unneeded'),
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
          setState(result === 'granted' ? 'granted' : 'denied')
          if (result === 'granted') onGranted?.()
        } catch {
          setState('denied')
        }
      }}
    >
      Enable motion
    </button>
  )
}
