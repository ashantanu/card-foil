import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import { useRef } from 'react'
import * as THREE from 'three'
import type { Tilt } from '../input/tilt'
import type { CardMaps } from './textures'

const MAX_TILT = THREE.MathUtils.degToRad(10)
const CARD_HEIGHT = 3

export function FoilCard({
  maps,
  aspect,
  tilt,
  frozen,
}: {
  maps: CardMaps
  aspect: number // width / height
  tilt: React.RefObject<Tilt>
  frozen: boolean
}) {
  const mesh = useRef<THREE.Mesh>(null!)
  const scene = useThree((s) => s.scene)

  useFrame((_, dt) => {
    const t = frozen ? { x: 0, y: 0 } : tilt.current
    // Card leans toward the pointer/tilt…
    easing.dampE(mesh.current.rotation, [t.y * MAX_TILT, t.x * MAX_TILT, 0], 0.12, dt)
    // …and the environment counter-rotates so reflections sweep across the foil.
    easing.dampE(scene.environmentRotation, [t.y * 0.3, t.x * 0.6, 0], 0.12, dt)
  })

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[CARD_HEIGHT * aspect, CARD_HEIGHT]} />
      {/* Paper renders via emissiveMap (unlit — exactly the artwork's pixels,
          lighting cannot brighten it); lights and reflections only affect the
          foil regions, whose albedo lives in `map`. */}
      <meshPhysicalMaterial
        map={maps.map}
        emissiveMap={maps.emissiveMap}
        emissive="#ffffff"
        metalnessMap={maps.metalnessMap}
        roughnessMap={maps.roughnessMap}
        metalness={1}
        roughness={1}
        envMapIntensity={1.0}
      />
    </mesh>
  )
}
