import * as THREE from 'three'

/** Roughness range: foil = 0.31 (80), paper = 0.9 (230).
    Foil is deliberately not mirror-glossy: against the high-contrast studio
    HDRI a near-mirror reads as either blinding white or pitch black; ~0.3
    spreads highlights into the gradual sweep real stamped foil shows. */
const ROUGH_FOIL = 80
const ROUGH_PAPER = 230

/** Map an RGBA mask (white = foil) to an RGBA roughness image. Pure. */
export function roughnessFromMask(mask: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length)
  for (let i = 0; i < mask.length; i += 4) {
    const m = mask[i] / 255
    const r = Math.round(ROUGH_PAPER - m * (ROUGH_PAPER - ROUGH_FOIL))
    out[i] = out[i + 1] = out[i + 2] = r
    out[i + 3] = 255
  }
  return out
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

export function imageToCanvas(
  src: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  c.getContext('2d')!.drawImage(src, 0, 0, width, height)
  return c
}

export function updateRoughnessCanvas(mask: HTMLCanvasElement, rough: HTMLCanvasElement): void {
  const maskData = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height)
  const roughBytes = roughnessFromMask(maskData.data)
  const roughData = mask.getContext('2d')!.createImageData(mask.width, mask.height)
  roughData.data.set(roughBytes)
  rough.getContext('2d')!.putImageData(roughData, 0, 0)
}

export function roughnessCanvasFromMask(mask: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = mask.width
  c.height = mask.height
  updateRoughnessCanvas(mask, c)
  return c
}

/**
 * Split the artwork by the mask so paper can render unlit. Pure.
 * albedo   = artwork where foil (lit/reflective), black where paper
 * emissive = artwork where paper (ignores lighting), black where foil
 */
export function splitByMask(
  artwork: Uint8ClampedArray,
  mask: Uint8ClampedArray,
): { albedo: Uint8ClampedArray; emissive: Uint8ClampedArray } {
  const albedo = new Uint8ClampedArray(artwork.length)
  const emissive = new Uint8ClampedArray(artwork.length)
  for (let i = 0; i < artwork.length; i += 4) {
    const m = mask[i] / 255
    for (let c = 0; c < 3; c++) {
      albedo[i + c] = Math.round(artwork[i + c] * m)
      emissive[i + c] = Math.round(artwork[i + c] * (1 - m))
    }
    albedo[i + 3] = emissive[i + 3] = 255
  }
  return { albedo, emissive }
}

export function updateFoilSplitCanvases(
  artwork: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  albedoCanvas: HTMLCanvasElement,
  emissiveCanvas: HTMLCanvasElement,
): void {
  const w = mask.width
  const h = mask.height
  const art = artwork.getContext('2d')!.getImageData(0, 0, w, h)
  const m = mask.getContext('2d')!.getImageData(0, 0, w, h)
  const { albedo, emissive } = splitByMask(art.data, m.data)
  const aData = mask.getContext('2d')!.createImageData(w, h)
  aData.data.set(albedo)
  albedoCanvas.getContext('2d')!.putImageData(aData, 0, 0)
  const eData = mask.getContext('2d')!.createImageData(w, h)
  eData.data.set(emissive)
  emissiveCanvas.getContext('2d')!.putImageData(eData, 0, 0)
}

export interface CardMaps {
  map: THREE.CanvasTexture // albedo: artwork in foil regions, black in paper
  emissiveMap: THREE.CanvasTexture // artwork in paper regions (unlit), black in foil
  metalnessMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
}

function sizedCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  return c
}

export function buildCardMaps(artwork: HTMLCanvasElement, mask: HTMLCanvasElement): CardMaps {
  const albedoCanvas = sizedCanvas(mask.width, mask.height)
  const emissiveCanvas = sizedCanvas(mask.width, mask.height)
  updateFoilSplitCanvases(artwork, mask, albedoCanvas, emissiveCanvas)
  const map = new THREE.CanvasTexture(albedoCanvas)
  map.colorSpace = THREE.SRGBColorSpace // artwork is color data
  map.anisotropy = 4
  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas)
  emissiveMap.colorSpace = THREE.SRGBColorSpace
  emissiveMap.anisotropy = 4
  const metalnessMap = new THREE.CanvasTexture(mask) // linear data — leave NoColorSpace
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvasFromMask(mask))
  return { map, emissiveMap, metalnessMap, roughnessMap }
}

const SAMPLE_W = 1000
const SAMPLE_H = 1400

export async function loadSampleAssets(): Promise<{
  artwork: HTMLCanvasElement
  mask: HTMLCanvasElement
}> {
  const [card, mask] = await Promise.all([
    loadImage('/sample/sample-card.svg'),
    loadImage('/sample/sample-mask.svg'),
  ])
  return {
    artwork: imageToCanvas(card, SAMPLE_W, SAMPLE_H),
    mask: imageToCanvas(mask, SAMPLE_W, SAMPLE_H),
  }
}
