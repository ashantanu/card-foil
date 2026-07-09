export interface Tilt {
  x: number
  y: number
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Pointer position over an element → tilt in [-1, 1]; rect center is (0, 0). */
export function pointerToTilt(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Tilt {
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
    y: clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
  }
}

/**
 * deviceorientation angles relative to a captured baseline → tilt in [-1, 1].
 * gamma → x, beta → y, clamped at ±rangeDeg. Null when the device has no gyro
 * (some phones report beta/gamma as null).
 */
export function orientationToTilt(
  beta: number | null,
  gamma: number | null,
  base: { beta: number; gamma: number },
  rangeDeg = 30,
): Tilt | null {
  if (beta == null || gamma == null) return null
  return {
    x: clamp((gamma - base.gamma) / rangeDeg, -1, 1),
    y: clamp((beta - base.beta) / rangeDeg, -1, 1),
  }
}
