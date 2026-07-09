import * as THREE from 'three'

/** Roughness range: foil = 0.15 (38), paper = 0.9 (230). */
const ROUGH_FOIL = 38
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

export interface CardMaps {
  map: THREE.CanvasTexture
  metalnessMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
}

export function buildCardMaps(artwork: HTMLCanvasElement, mask: HTMLCanvasElement): CardMaps {
  const map = new THREE.CanvasTexture(artwork)
  map.colorSpace = THREE.SRGBColorSpace // artwork is color data
  map.anisotropy = 4
  const metalnessMap = new THREE.CanvasTexture(mask) // linear data — leave NoColorSpace
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvasFromMask(mask))
  return { map, metalnessMap, roughnessMap }
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
