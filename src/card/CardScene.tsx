import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import type { Tilt } from '../input/tilt'
import { FoilCard } from './FoilCard'
import type { CardMaps } from './textures'

export function CardScene({
  maps,
  aspect,
  tilt,
  frozen,
}: {
  maps: CardMaps
  aspect: number
  tilt: React.RefObject<Tilt>
  frozen: boolean
}) {
  return (
    <Canvas
      // `flat` disables ACES tone mapping so matte paper renders the artwork's
      // actual colors — with tone mapping + stacked lights the whole card
      // washed out brighter than the uploaded image.
      flat
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      dpr={[1, 2]}
      onCreated={({ gl }) =>
        // preventDefault lets three restore the context automatically after loss
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
      }
    >
      {/* These stack with the environment's own light — keep the total diffuse
          irradiance on the (matte, metalness 0) paper close to 1.0 so paper
          matches the uploaded artwork's brightness. */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 4]} intensity={0.15} />
      {/* Vendored (public/env/, CC0 Poly Haven via pmndrs/drei-assets) instead
          of preset="studio", which fetches from a third-party CDN at runtime —
          slow or blocked CDN = black scene. */}
      <Environment files="/env/studio_small_03_1k.hdr" />
      <FoilCard maps={maps} aspect={aspect} tilt={tilt} frozen={frozen} />
    </Canvas>
  )
}
