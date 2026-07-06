# Foil Studio v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pokémon-fork deployment with a three.js "Foil Studio": a card with gyro/pointer-lit gold foil (M1: bundled sample card; M2: upload your own card and paint the foil mask).

**Architecture:** Single Vite + React + react-three-fiber app at repo root (the linked Vercel project `card-foil` keeps building root unchanged). The old Svelte fork moves to `reference/pokemon-cards/`, runnable standalone but never deployed. Renderer: one plane with `MeshPhysicalMaterial` — artwork = `map`, foil mask = `metalnessMap`, mask-derived levels = `roughnessMap`, drei `<Environment>` for reflections. A tilt ref (pointer or deviceorientation) drives damped card rotation + environment rotation.

**Tech Stack:** Vite (react-ts template), React 19, three ~0.185, @react-three/fiber ^9, @react-three/drei ^10, maath, Vitest (node environment, pure-logic tests only).

**Spec:** `docs/superpowers/specs/2026-07-06-foil-studio-design.md`

## Global Constraints

- Repo license is **GPL-3.0** — `LICENSE` stays at repo root; porting code from the fork is allowed.
- **No Pokémon artwork in the studio app** — Pokémon assets exist only under `reference/pokemon-cards/`.
- Deploy target: existing Vercel project `card-foil` (already linked via `.vercel/project.json`), framework Vite, build `vite build`, output `dist/` — the root app must keep these defaults.
- Uploaded images are client-only (object URLs, never sent anywhere) and downscaled to **max 2048px** long edge.
- Gyro: clamp ±30°, card tilt max ±10°, iOS needs `DeviceOrientationEvent.requestPermission()` from a real tap.
- Honor `prefers-reduced-motion` (freeze motion) and missing WebGL (fall back to flat image).
- Unit tests only for pure logic (no canvas/jsdom mocking); components verified manually per task.
- All new code TypeScript, `strict: true` (template default).

---

### Task 1: Retire the fork to `reference/pokemon-cards/`

**Files:**
- Move (git mv): `index.html`, `src/`, `public/`, `vite.config.js`, `jsconfig.json`, `package.json`, `package-lock.json`, `README-pokemon-cards.md`, `.prettierrc` → `reference/pokemon-cards/`
- Modify: `.gitignore` (foils path)
- Delete (untracked): root `node_modules/`, `dist/`

**Interfaces:**
- Consumes: current repo state (fork at root, clean tree on `main`).
- Produces: empty root (docs/LICENSE/CLAUDE.md remain) for Task 2's scaffold; `reference/pokemon-cards/` runnable via its own `npm install && npm run build`.

- [ ] **Step 1: Move the fork**

```bash
cd /Users/Shan/Documents/projects/card-foil
mkdir -p reference/pokemon-cards
git mv index.html src public vite.config.js jsconfig.json package.json package-lock.json README-pokemon-cards.md .prettierrc reference/pokemon-cards/
rm -rf node_modules dist
```

- [ ] **Step 2: Fix `.gitignore`**

In `.gitignore`, replace the line `public/img/foils/` with:

```
reference/pokemon-cards/public/img/foils/
```

(`node_modules/`, `dist/` etc. have no leading slash so they already match at any depth.)

- [ ] **Step 3: Verify the reference app still builds**

```bash
cd reference/pokemon-cards && npm install && npm run build && cd ../..
```

Expected: Vite build completes, `reference/pokemon-cards/dist/` created. If Svelte 3/Vite 3 fail on the current Node, note the required Node version in `reference/pokemon-cards/README-pokemon-cards.md` instead of upgrading anything — this app is frozen reference code.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: retire pokemon-cards fork to reference/, freeing root for Foil Studio"
```

---

### Task 2: Scaffold Foil Studio at root (Vite + React TS + r3f + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json` (+ template companions), `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/smoke.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: empty root from Task 1.
- Produces: working `npm run dev` / `build` / `test` at root; `src/App.tsx` default export replaced in Task 7.

- [ ] **Step 1: Generate the template in a temp dir and move it in**

`create-vite` refuses non-empty dirs, so scaffold aside and move:

```bash
cd /Users/Shan/Documents/projects/card-foil
npm create vite@latest studio-tmp -- --template react-ts
rsync -a studio-tmp/ ./ --exclude .gitignore
rm -rf studio-tmp src/assets src/App.css
```

Keep the existing root `.gitignore` (it already covers node_modules/dist/.vercel).

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install three @react-three/fiber @react-three/drei maath
npm install -D vitest @types/three
```

- [ ] **Step 3: Set app identity + scripts**

`index.html`: set `<title>Foil Studio</title>` and remove the vite.svg favicon link.
`package.json`: set `"name": "foil-studio"` and add to scripts: `"test": "vitest run"`.

Replace `src/App.tsx` with:

```tsx
export default function App() {
  return <h1>Foil Studio</h1>
}
```

Replace `src/index.css`/`src/main.tsx` styling import with a single `src/styles.css`:

```css
* { margin: 0; box-sizing: border-box; }
html, body, #root { height: 100%; }
body { background: #14120f; color: #e8e2d5; font-family: system-ui, sans-serif; }
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Delete `src/index.css` if the template created it.

- [ ] **Step 4: Smoke test for the test runner**

`src/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'

test('vitest runs', () => {
  expect(1 + 1).toBe(2)
})
```

- [ ] **Step 5: Verify build + test**

```bash
npm run build && npm run test
```

Expected: TS build + Vite build pass, 1 test passes.

- [ ] **Step 6: Rewrite `CLAUDE.md`**

Replace the "Project status" section (keep the technical/gyro/licensing sections) with:

```markdown
## Project status

**Foil Studio** (Vite + React + react-three-fiber) lives at the repo root and is
what the Vercel project `card-foil` deploys. Spec:
`docs/superpowers/specs/2026-07-06-foil-studio-design.md`. Plan:
`docs/superpowers/plans/2026-07-06-foil-studio-v1.md`.

- Build: `npm run build` · Dev: `npm run dev` · Tests: `npm run test` (Vitest, pure logic only)
- `reference/pokemon-cards/` is the retired GPL fork (study/benchmark only, own
  package.json, never deployed). Run it with `cd reference/pokemon-cards && npm i && npm run dev`.
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Foil Studio (Vite + React + r3f + vitest) at repo root"
```

---

### Task 3: Tilt math (pure, TDD)

**Files:**
- Create: `src/input/tilt.ts`
- Test: `src/input/tilt.test.ts`

**Interfaces:**
- Produces: `interface Tilt { x: number; y: number }` (both in [-1, 1]); `clamp(v, min, max): number`; `pointerToTilt(clientX, clientY, rect): Tilt`; `orientationToTilt(beta, gamma, base, rangeDeg?): Tilt | null`. Used by Task 4's hook and Task 7's renderer.

- [ ] **Step 1: Write the failing tests**

`src/input/tilt.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { clamp, orientationToTilt, pointerToTilt } from './tilt'

const rect = { left: 100, top: 200, width: 400, height: 600 }

describe('pointerToTilt', () => {
  test('center of rect → (0, 0)', () => {
    expect(pointerToTilt(300, 500, rect)).toEqual({ x: 0, y: 0 })
  })
  test('top-left corner → (-1, -1)', () => {
    expect(pointerToTilt(100, 200, rect)).toEqual({ x: -1, y: -1 })
  })
  test('beyond bottom-right clamps to (1, 1)', () => {
    expect(pointerToTilt(9999, 9999, rect)).toEqual({ x: 1, y: 1 })
  })
})

describe('orientationToTilt', () => {
  const base = { beta: 40, gamma: 0 }
  test('at baseline → (0, 0)', () => {
    expect(orientationToTilt(40, 0, base)).toEqual({ x: 0, y: 0 })
  })
  test('gamma +15° of default 30° range → x = 0.5', () => {
    expect(orientationToTilt(40, 15, base)).toEqual({ x: 0.5, y: 0 })
  })
  test('clamps beyond range', () => {
    expect(orientationToTilt(120, -80, base)).toEqual({ x: -1, y: 1 })
  })
  test('null beta/gamma (no gyro) → null', () => {
    expect(orientationToTilt(null, null, base)).toBeNull()
  })
})

test('clamp', () => {
  expect(clamp(5, 0, 1)).toBe(1)
  expect(clamp(-5, 0, 1)).toBe(0)
  expect(clamp(0.5, 0, 1)).toBe(0.5)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/input/tilt.test.ts`
Expected: FAIL — cannot resolve `./tilt`.

- [ ] **Step 3: Implement**

`src/input/tilt.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/input/tilt.test.ts`
Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/input/tilt.ts src/input/tilt.test.ts
git commit -m "feat: pure tilt math (pointer + deviceorientation → normalized tilt)"
```

---

### Task 4: useTilt hook + iOS MotionPermission button

**Files:**
- Create: `src/input/useTilt.ts`, `src/input/MotionPermission.tsx`
- Modify: `src/styles.css` (button styles)

**Interfaces:**
- Consumes: `pointerToTilt`, `orientationToTilt`, `Tilt` from Task 3.
- Produces: `useTilt(containerRef): { tilt: React.RefObject<Tilt>; recenter: () => void }` — `tilt.current` is the live target, updated without re-renders; `needsMotionPermission(): boolean`; `<MotionPermission onGranted={() => void} />`. Used by Task 7.

- [ ] **Step 1: Implement the hook**

`src/input/useTilt.ts`:

```ts
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
```

- [ ] **Step 2: Implement the permission button**

`src/input/MotionPermission.tsx`:

```tsx
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
```

- [ ] **Step 3: Button styles**

Append to `src/styles.css`:

```css
.motion-button {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  padding: 10px 20px; border: 1px solid #c9a24b; border-radius: 999px;
  background: rgba(20, 18, 15, 0.8); color: #c9a24b; font-size: 15px;
}
.motion-hint {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  font-size: 13px; opacity: 0.7;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run build`
Expected: PASS (components are wired into the app in Task 7; on-device behavior is verified in Task 8).

- [ ] **Step 5: Commit**

```bash
git add src/input/useTilt.ts src/input/MotionPermission.tsx src/styles.css
git commit -m "feat: useTilt hook (pointer + gyro with baseline) and iOS motion-permission button"
```

---

### Task 5: Sample card assets (original art, no Pokémon)

**Files:**
- Create: `public/sample/sample-card.svg`, `public/sample/sample-mask.svg`

**Interfaces:**
- Produces: two same-sized (1000×1400) SVGs; the mask is white-on-black and geometrically aligned with the card's gold elements. Loaded by Task 6's `loadSampleAssets()`. Both are rasterized by the same browser at runtime, so text layout matches between them — any change to one file's geometry MUST be mirrored in the other.

- [ ] **Step 1: Create the card artwork**

`public/sample/sample-card.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400" viewBox="0 0 1000 1400">
  <rect width="1000" height="1400" fill="#f3ecdd"/>
  <rect x="40" y="40" width="920" height="1320" fill="none" stroke="#c9a24b" stroke-width="6"/>
  <rect x="60" y="60" width="880" height="1280" fill="none" stroke="#c9a24b" stroke-width="2"/>
  <circle cx="500" cy="300" r="90" fill="none" stroke="#c9a24b" stroke-width="8"/>
  <text x="500" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="90"
        fill="#c9a24b" text-anchor="middle">A&amp;N</text>
  <text x="500" y="560" font-family="Georgia, 'Times New Roman', serif" font-size="110"
        font-style="italic" fill="#c9a24b" text-anchor="middle">Ava &amp; Noah</text>
  <text x="500" y="700" font-family="Georgia, 'Times New Roman', serif" font-size="40"
        fill="#5a5346" text-anchor="middle">request the pleasure of your company</text>
  <text x="500" y="780" font-family="Georgia, 'Times New Roman', serif" font-size="40"
        fill="#5a5346" text-anchor="middle">at the celebration of their marriage</text>
  <text x="500" y="960" font-family="Georgia, 'Times New Roman', serif" font-size="56"
        fill="#c9a24b" text-anchor="middle">Saturday, the sixth of June</text>
  <text x="500" y="1060" font-family="Georgia, 'Times New Roman', serif" font-size="40"
        fill="#5a5346" text-anchor="middle">at half past four in the afternoon</text>
  <path d="M 300 1180 Q 500 1120 700 1180" fill="none" stroke="#c9a24b" stroke-width="5"/>
</svg>
```

- [ ] **Step 2: Create the aligned foil mask**

`public/sample/sample-mask.svg` — same geometry, gold elements white, everything else black:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1400" viewBox="0 0 1000 1400">
  <rect width="1000" height="1400" fill="#000000"/>
  <rect x="40" y="40" width="920" height="1320" fill="none" stroke="#ffffff" stroke-width="6"/>
  <rect x="60" y="60" width="880" height="1280" fill="none" stroke="#ffffff" stroke-width="2"/>
  <circle cx="500" cy="300" r="90" fill="none" stroke="#ffffff" stroke-width="8"/>
  <text x="500" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="90"
        fill="#ffffff" text-anchor="middle">A&amp;N</text>
  <text x="500" y="560" font-family="Georgia, 'Times New Roman', serif" font-size="110"
        font-style="italic" fill="#ffffff" text-anchor="middle">Ava &amp; Noah</text>
  <text x="500" y="960" font-family="Georgia, 'Times New Roman', serif" font-size="56"
        fill="#ffffff" text-anchor="middle">Saturday, the sixth of June</text>
  <path d="M 300 1180 Q 500 1120 700 1180" fill="none" stroke="#ffffff" stroke-width="5"/>
</svg>
```

(The gray body-text lines are intentionally absent — they are not foil.)

- [ ] **Step 3: Visual sanity check**

Open both files directly in a browser (`npm run dev`, visit `/sample/sample-card.svg` and `/sample/sample-mask.svg`). Expected: an invitation card; a black image with white marks exactly where the card's gold marks are.

- [ ] **Step 4: Commit**

```bash
git add public/sample
git commit -m "feat: original sample invitation artwork + aligned foil mask (SVG)"
```

---

### Task 6: Texture pipeline (mask → metalness/roughness maps)

**Files:**
- Create: `src/card/textures.ts`
- Test: `src/card/roughness.test.ts`

**Interfaces:**
- Consumes: sample SVGs from Task 5.
- Produces (used by Tasks 7 and 12):
  - `roughnessFromMask(data: Uint8ClampedArray): Uint8ClampedArray` — pure; RGBA in/out.
  - `loadImage(url: string): Promise<HTMLImageElement>`
  - `imageToCanvas(src, width, height): HTMLCanvasElement`
  - `roughnessCanvasFromMask(mask: HTMLCanvasElement): HTMLCanvasElement`
  - `updateRoughnessCanvas(mask: HTMLCanvasElement, rough: HTMLCanvasElement): void` — recompute in place (M2 repaints).
  - `interface CardMaps { map: CanvasTexture; metalnessMap: CanvasTexture; roughnessMap: CanvasTexture }`
  - `buildCardMaps(artwork: HTMLCanvasElement, mask: HTMLCanvasElement): CardMaps`
  - `loadSampleAssets(): Promise<{ artwork: HTMLCanvasElement; mask: HTMLCanvasElement }>` — rasterizes both SVGs at 1000×1400.

- [ ] **Step 1: Write the failing test for the pure levels function**

`src/card/roughness.test.ts`:

```ts
import { expect, test } from 'vitest'
import { roughnessFromMask } from './textures'

function px(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray([r, g, b, a])
}

test('foil (white mask) → glossy ~0.15 (38/255)', () => {
  expect(Array.from(roughnessFromMask(px(255, 255, 255)))).toEqual([38, 38, 38, 255])
})

test('paper (black mask) → matte ~0.9 (230/255)', () => {
  expect(Array.from(roughnessFromMask(px(0, 0, 0)))).toEqual([230, 230, 230, 255])
})

test('mid mask interpolates', () => {
  const [v] = roughnessFromMask(px(128, 128, 128))
  expect(v).toBeGreaterThan(38)
  expect(v).toBeLessThan(230)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/card/roughness.test.ts`
Expected: FAIL — cannot resolve `./textures`.

- [ ] **Step 3: Implement**

`src/card/textures.ts`:

```ts
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
  const roughData = new ImageData(roughnessFromMask(maskData.data), mask.width, mask.height)
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
```

- [ ] **Step 4: Run tests + build**

Run: `npx vitest run src/card/roughness.test.ts && npm run build`
Expected: 3 tests PASS, build PASS.

- [ ] **Step 5: Commit**

```bash
git add src/card/textures.ts src/card/roughness.test.ts
git commit -m "feat: texture pipeline — mask to metalness/roughness maps, sample asset loader"
```

---

### Task 7: PBR card renderer + M1 app wiring

**Files:**
- Create: `src/card/FoilCard.tsx`, `src/card/CardScene.tsx`, `src/card/env.ts`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `useTilt`, `MotionPermission` (Task 4); `CardMaps`, `buildCardMaps`, `loadSampleAssets` (Task 6); `Tilt` (Task 3).
- Produces: `<CardScene maps={CardMaps} aspect={number} tilt={RefObject<Tilt>} frozen={boolean} />` — the reusable viewer M2 keeps using; `usePrefersReducedMotion(): boolean` and `webglAvailable(): boolean` in `env.ts`.

- [ ] **Step 1: Environment helpers**

`src/card/env.ts`:

```ts
import { useEffect, useState } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
```

- [ ] **Step 2: The card mesh**

`src/card/FoilCard.tsx`:

```tsx
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
      <meshPhysicalMaterial
        map={maps.map}
        metalnessMap={maps.metalnessMap}
        roughnessMap={maps.roughnessMap}
        metalness={1}
        roughness={1}
        envMapIntensity={1.1}
      />
    </mesh>
  )
}
```

(`metalness`/`roughness` are set to 1 because three multiplies the scalar with the map value — the maps carry the real values.)

- [ ] **Step 3: The scene**

`src/card/CardScene.tsx`:

```tsx
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
      camera={{ position: [0, 0, 4.2], fov: 45 }}
      dpr={[1, 2]}
      onCreated={({ gl }) =>
        // preventDefault lets three restore the context automatically after loss
        gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault())
      }
    >
      {/* Base light so the card is visible before/without the HDRI (it loads
          from the pmndrs CDN at runtime). */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={0.6} />
      <Environment preset="studio" />
      <FoilCard maps={maps} aspect={aspect} tilt={tilt} frozen={frozen} />
    </Canvas>
  )
}
```

- [ ] **Step 4: Wire the M1 app**

Replace `src/App.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { CardScene } from './card/CardScene'
import { usePrefersReducedMotion, webglAvailable } from './card/env'
import { buildCardMaps, loadSampleAssets, type CardMaps } from './card/textures'
import { MotionPermission } from './input/MotionPermission'
import { useTilt } from './input/useTilt'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tilt, recenter } = useTilt(containerRef)
  const reduced = usePrefersReducedMotion()
  const hasWebgl = useMemo(webglAvailable, [])
  const [card, setCard] = useState<{ maps: CardMaps; aspect: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadSampleAssets().then(({ artwork, mask }) => {
      if (cancelled) return
      setCard({ maps: buildCardMaps(artwork, mask), aspect: artwork.width / artwork.height })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!hasWebgl) {
    return (
      <div className="stage">
        <img className="flat-card" src="/sample/sample-card.svg" alt="Sample invitation card" />
      </div>
    )
  }

  return (
    <div className="stage" ref={containerRef}>
      {card && <CardScene maps={card.maps} aspect={card.aspect} tilt={tilt} frozen={reduced} />}
      <MotionPermission onGranted={recenter} />
    </div>
  )
}
```

Append to `src/styles.css`:

```css
.stage { height: 100%; touch-action: none; }
.flat-card { display: block; max-height: 90vh; max-width: 90vw; margin: 5vh auto; }
```

- [ ] **Step 5: Manual verification (desktop)**

Run: `npm run dev` and open the printed URL.
Expected: the sample invitation renders as a card; moving the mouse across it tilts the card and sweeps a bright reflection across the gold border, monogram, names, and date line while the cream paper stays matte. With macOS "Reduce motion" enabled, the card renders lit but static.

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add -A
git commit -m "feat: PBR foil card renderer with tilt-driven environment lighting (M1)"
```

---

### Task 8: M1 deploy + on-device verification

**Files:** none (deploy + verify)

**Interfaces:**
- Consumes: complete M1 app (Tasks 1–7), linked Vercel project `card-foil`.
- Produces: live production URL rendering Foil Studio; M1 exit criteria met.

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Confirm production deploy**

```bash
npx vercel ls card-foil 2>/dev/null | head -5
```

Or check the Vercel dashboard. Expected: a fresh production deployment building from root with Vite (settings unchanged from the fork era — same build command/output).

- [ ] **Step 3: On-device checks (user, on phones)**

Ask the user to verify on the production URL and report back:
- **Android Chrome:** no button appears; tilting the phone sweeps the foil shine. 
- **iPhone Safari:** "Enable motion" button appears; tap → grant → tilt works and the baseline is the hold position at grant time. Reload → tap → *deny* → hint appears, dragging a finger over the card still moves the shine.
- Either phone: hold at a comfortable angle — motion should feel centered there (baseline), not centered on flat-on-table.

- [ ] **Step 4: Record result**

If any check fails, fix before starting M2. When it passes, note the production URL in `CLAUDE.md` under Project status and commit:

```bash
git add CLAUDE.md
git commit -m "docs: record live Foil Studio URL after M1 verification"
```

---

### Task 9: Upload pipeline (M2)

**Files:**
- Create: `src/upload/imageLoad.ts`, `src/upload/UploadPanel.tsx`
- Test: `src/upload/fitWithin.test.ts`

**Interfaces:**
- Consumes: `imageToCanvas`, `loadImage` from Task 6.
- Produces: `fitWithin(width, height, max): { width: number; height: number }` (pure); `loadCardImage(file: File): Promise<HTMLCanvasElement>` — rejects non-images, downscales to ≤2048 long edge; `<UploadPanel onLoaded={(canvas: HTMLCanvasElement) => void} onError={(msg: string) => void} />`. Used by Task 12.

- [ ] **Step 1: Write the failing test**

`src/upload/fitWithin.test.ts`:

```ts
import { expect, test } from 'vitest'
import { fitWithin } from './imageLoad'

test('image within limit is untouched', () => {
  expect(fitWithin(800, 1200, 2048)).toEqual({ width: 800, height: 1200 })
})

test('oversized landscape scales by width', () => {
  expect(fitWithin(4096, 2048, 2048)).toEqual({ width: 2048, height: 1024 })
})

test('oversized portrait scales by height', () => {
  expect(fitWithin(3000, 6000, 2048)).toEqual({ width: 1024, height: 2048 })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/upload/fitWithin.test.ts`
Expected: FAIL — cannot resolve `./imageLoad`.

- [ ] **Step 3: Implement**

`src/upload/imageLoad.ts`:

```ts
import { imageToCanvas, loadImage } from '../card/textures'

export const MAX_EDGE = 2048

export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** File → downscaled canvas. Client-only: the image never leaves the browser. */
export async function loadCardImage(file: File): Promise<HTMLCanvasElement> {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image — please choose a PNG, JPEG, or SVG.')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    if (!img.width || !img.height) throw new Error('Could not read that image.')
    const { width, height } = fitWithin(img.width, img.height, MAX_EDGE)
    return imageToCanvas(img, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}
```

`src/upload/UploadPanel.tsx`:

```tsx
import { useState } from 'react'
import { loadCardImage } from './imageLoad'

export function UploadPanel({
  onLoaded,
  onError,
}: {
  onLoaded: (canvas: HTMLCanvasElement) => void
  onError: (message: string) => void
}) {
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    try {
      onLoaded(await loadCardImage(file))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not load that image.')
    }
  }

  return (
    <label
      className={`upload ${dragging ? 'upload--drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void handleFile(e.dataTransfer.files[0])
      }}
    >
      Upload your card
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0] ?? undefined)}
      />
    </label>
  )
}
```

Append to `src/styles.css`:

```css
.upload {
  display: block; padding: 12px; border: 1px dashed #6b6353; border-radius: 8px;
  text-align: center; cursor: pointer; font-size: 14px;
}
.upload--drag { border-color: #c9a24b; color: #c9a24b; }
```

- [ ] **Step 4: Run tests + build**

Run: `npx vitest run src/upload/fitWithin.test.ts && npm run build`
Expected: 3 tests PASS, build PASS.

- [ ] **Step 5: Commit**

```bash
git add src/upload src/styles.css
git commit -m "feat: client-only card upload with downscaling to 2048px"
```

---

### Task 10: Color-wand flood select (pure, TDD)

**Files:**
- Create: `src/mask/floodSelect.ts`
- Test: `src/mask/floodSelect.test.ts`

**Interfaces:**
- Produces: `interface Raster { width: number; height: number; data: Uint8ClampedArray }` (structurally compatible with `ImageData`); `floodSelect(img: Raster, sx: number, sy: number, tolerance: number): Uint8Array` — 4-connected flood fill from the seed pixel, selecting pixels whose RGB distance from the seed is within tolerance (0–255 per-channel scale); returns width×height array of 0/1. Used by Task 12.

- [ ] **Step 1: Write the failing tests**

`src/mask/floodSelect.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { floodSelect, type Raster } from './floodSelect'

/** Build a raster from rows of single-letter color keys. */
function raster(rows: string[], palette: Record<string, [number, number, number]>): Raster {
  const height = rows.length
  const width = rows[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      const [r, g, b] = palette[key]
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }),
  )
  return { width, height, data }
}

const palette = {
  g: [200, 160, 60] as [number, number, number], // gold
  G: [205, 165, 65] as [number, number, number], // gold, slightly off
  w: [245, 240, 225] as [number, number, number], // paper
}

describe('floodSelect', () => {
  // gold plus-shape on paper; a detached gold pixel bottom-right
  const img = raster(['wgww', 'gggw', 'wgwg'], palette)

  test('selects the connected same-color region only', () => {
    const sel = floodSelect(img, 1, 1, 0)
    expect(Array.from(sel)).toEqual([0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0])
  })

  test('detached pixel is not selected even with same color', () => {
    const sel = floodSelect(img, 1, 1, 0)
    expect(sel[2 * 4 + 3]).toBe(0)
  })

  test('tolerance includes near-colors', () => {
    const img2 = raster(['gGw'], palette)
    expect(Array.from(floodSelect(img2, 0, 0, 10))).toEqual([1, 1, 0])
    expect(Array.from(floodSelect(img2, 0, 0, 0))).toEqual([1, 0, 0])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/mask/floodSelect.test.ts`
Expected: FAIL — cannot resolve `./floodSelect`.

- [ ] **Step 3: Implement**

`src/mask/floodSelect.ts`:

```ts
export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

/**
 * 4-connected flood select from (sx, sy). A pixel joins the selection when its
 * RGB distance from the SEED color is within tolerance (0–255 scale, compared
 * as squared Euclidean distance across the three channels).
 */
export function floodSelect(img: Raster, sx: number, sy: number, tolerance: number): Uint8Array {
  const { width, height, data } = img
  const selected = new Uint8Array(width * height)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return selected

  const seed = (sy * width + sx) * 4
  const r0 = data[seed]
  const g0 = data[seed + 1]
  const b0 = data[seed + 2]
  const limit = tolerance * tolerance * 3

  const within = (p: number) => {
    const i = p * 4
    const dr = data[i] - r0
    const dg = data[i + 1] - g0
    const db = data[i + 2] - b0
    return dr * dr + dg * dg + db * db <= limit
  }

  const queue = [sy * width + sx]
  selected[queue[0]] = 1
  while (queue.length > 0) {
    const p = queue.pop()!
    const x = p % width
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < width - 1 ? p + 1 : -1,
      p - width,
      p + width,
    ]
    for (const n of neighbors) {
      if (n < 0 || n >= selected.length || selected[n]) continue
      if (within(n)) {
        selected[n] = 1
        queue.push(n)
      }
    }
  }
  return selected
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/mask/floodSelect.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mask/floodSelect.ts src/mask/floodSelect.test.ts
git commit -m "feat: color-wand flood select with tolerance (pure, tested)"
```

---

### Task 11: Mask editor model (brush, wand apply, undo, import/export)

**Files:**
- Create: `src/mask/boundedStack.ts`, `src/mask/maskEditor.ts`
- Test: `src/mask/boundedStack.test.ts`

**Interfaces:**
- Consumes: `Raster` (Task 10).
- Produces (used by Task 12):
  - `class BoundedStack<T> { constructor(limit?: number); push(item: T): void; pop(): T | undefined; get size(): number }`
  - `class MaskEditor` with: `constructor(width: number, height: number)`; `readonly canvas: HTMLCanvasElement` (grayscale mask: white = foil, black = none); `onChange?: () => void` (fires after every visible change); `beginStroke(x, y, size, erase)`, `strokeTo(x, y)`, `endStroke()`; `applySelection(sel: Uint8Array, mode: 'add' | 'remove')`; `undo(): void`; `exportPNG(): Promise<Blob>`; `importImage(img: HTMLImageElement): void` (draws scaled to mask size); `loadFrom(mask: HTMLCanvasElement): void`.

- [ ] **Step 1: Write the failing undo-stack tests**

`src/mask/boundedStack.test.ts`:

```ts
import { expect, test } from 'vitest'
import { BoundedStack } from './boundedStack'

test('push/pop is LIFO', () => {
  const s = new BoundedStack<number>(10)
  s.push(1)
  s.push(2)
  expect(s.pop()).toBe(2)
  expect(s.pop()).toBe(1)
  expect(s.pop()).toBeUndefined()
})

test('exceeding the limit drops the oldest item', () => {
  const s = new BoundedStack<number>(3)
  for (const n of [1, 2, 3, 4]) s.push(n)
  expect(s.size).toBe(3)
  expect(s.pop()).toBe(4)
  expect(s.pop()).toBe(3)
  expect(s.pop()).toBe(2)
  expect(s.pop()).toBeUndefined() // 1 was evicted
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/mask/boundedStack.test.ts`
Expected: FAIL — cannot resolve `./boundedStack`.

- [ ] **Step 3: Implement the stack**

`src/mask/boundedStack.ts`:

```ts
export class BoundedStack<T> {
  private items: T[] = []
  constructor(private limit = 20) {}

  push(item: T): void {
    this.items.push(item)
    if (this.items.length > this.limit) this.items.shift()
  }

  pop(): T | undefined {
    return this.items.pop()
  }

  get size(): number {
    return this.items.length
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/mask/boundedStack.test.ts`
Expected: 2 tests PASS.

- [ ] **Step 5: Implement the editor (canvas logic — verified via UI in Task 12)**

`src/mask/maskEditor.ts`:

```ts
import { BoundedStack } from './boundedStack'

const UNDO_LIMIT = 20

/** Grayscale foil mask editor: white = foil, black = not foil. */
export class MaskEditor {
  readonly canvas: HTMLCanvasElement
  onChange?: () => void
  private ctx: CanvasRenderingContext2D
  private undoStack = new BoundedStack<ImageData>(UNDO_LIMIT)
  private stroking = false

  constructor(width: number, height: number) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, width, height)
  }

  private snapshot(): void {
    this.undoStack.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height))
  }

  private changed(): void {
    this.onChange?.()
  }

  /** x/y in mask-canvas pixel coordinates. Eraser paints black. */
  beginStroke(x: number, y: number, size: number, erase: boolean): void {
    this.snapshot()
    this.stroking = true
    this.ctx.lineWidth = size
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.strokeStyle = erase ? '#000' : '#fff'
    this.ctx.fillStyle = this.ctx.strokeStyle
    this.ctx.beginPath()
    // Dot for a single tap:
    this.ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    this.ctx.fill()
    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.changed()
  }

  strokeTo(x: number, y: number): void {
    if (!this.stroking) return
    this.ctx.lineTo(x, y)
    this.ctx.stroke()
    this.changed()
  }

  endStroke(): void {
    this.stroking = false
  }

  /** Set pixels from a floodSelect result (same dimensions as the mask). */
  applySelection(sel: Uint8Array, mode: 'add' | 'remove'): void {
    this.snapshot()
    const img = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    const value = mode === 'add' ? 255 : 0
    for (let p = 0; p < sel.length; p++) {
      if (!sel[p]) continue
      const i = p * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = value
      img.data[i + 3] = 255
    }
    this.ctx.putImageData(img, 0, 0)
    this.changed()
  }

  undo(): void {
    const prev = this.undoStack.pop()
    if (!prev) return
    this.ctx.putImageData(prev, 0, 0)
    this.changed()
  }

  exportPNG(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Mask export failed'))),
        'image/png',
      )
    })
  }

  /** Import any image as the mask, scaled to mask dimensions. */
  importImage(img: HTMLImageElement): void {
    this.snapshot()
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
    this.changed()
  }

  /** Initialize from an existing mask canvas (e.g. the sample mask). */
  loadFrom(mask: HTMLCanvasElement): void {
    this.ctx.drawImage(mask, 0, 0, this.canvas.width, this.canvas.height)
    this.changed()
  }
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run build
git add src/mask
git commit -m "feat: mask editor model — brush/eraser strokes, selection apply, bounded undo, PNG io"
```

---

### Task 12: Mask painter UI + live material update (M2 wiring)

**Files:**
- Create: `src/mask/MaskPainter.tsx`, `src/EditorPanel.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: everything — `CardScene` (7), `UploadPanel`/`loadCardImage` (9), `floodSelect` (10), `MaskEditor` (11), `buildCardMaps`/`updateRoughnessCanvas`/`loadImage`/`loadSampleAssets` (6), `useTilt`/`MotionPermission` (4).
- Produces: the finished M2 app — two views ("Preview" 3D / "Edit foil" painter), tool state lifted into `App`.

- [ ] **Step 1: The painter component**

`src/mask/MaskPainter.tsx` — artwork as background, mask as gold-tinted overlay, pointer painting, wand clicks:

```tsx
import { useEffect, useRef } from 'react'
import { floodSelect } from './floodSelect'
import type { MaskEditor } from './maskEditor'

export type Tool = 'brush' | 'eraser' | 'wand'

export function MaskPainter({
  artwork,
  editor,
  tool,
  brushSize,
  tolerance,
}: {
  artwork: HTMLCanvasElement
  editor: MaskEditor
  tool: Tool
  brushSize: number
  tolerance: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  // Draw artwork + tinted mask overlay; re-tint on every editor change.
  useEffect(() => {
    const bg = bgRef.current!
    bg.width = artwork.width
    bg.height = artwork.height
    bg.getContext('2d')!.drawImage(artwork, 0, 0)

    const overlay = overlayRef.current!
    overlay.width = artwork.width
    overlay.height = artwork.height
    const octx = overlay.getContext('2d')!

    const paintOverlay = () => {
      octx.clearRect(0, 0, overlay.width, overlay.height)
      octx.globalAlpha = 0.55
      octx.drawImage(editor.canvas, 0, 0)
      // Tint the white mask gold so it reads as "foil here".
      octx.globalCompositeOperation = 'source-in'
      octx.fillStyle = '#c9a24b'
      octx.fillRect(0, 0, overlay.width, overlay.height)
      octx.globalCompositeOperation = 'source-over'
      octx.globalAlpha = 1
    }
    paintOverlay()
    const prev = editor.onChange
    editor.onChange = () => {
      prev?.()
      paintOverlay()
    }
    return () => {
      editor.onChange = prev
    }
  }, [artwork, editor])

  /** Display px → mask-canvas px. */
  const toMask = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * artwork.width),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * artwork.height),
    }
  }

  return (
    <div
      ref={wrapRef}
      className="painter"
      style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const { x, y } = toMask(e)
        if (tool === 'wand') {
          const ctx = artwork.getContext('2d', { willReadFrequently: true })!
          const raster = ctx.getImageData(0, 0, artwork.width, artwork.height)
          editor.applySelection(floodSelect(raster, x, y, tolerance), 'add')
        } else {
          editor.beginStroke(x, y, brushSize, tool === 'eraser')
        }
      }}
      onPointerMove={(e) => {
        if (tool === 'wand' || e.buttons === 0) return
        const { x, y } = toMask(e)
        editor.strokeTo(x, y)
      }}
      onPointerUp={() => editor.endStroke()}
    >
      <canvas ref={bgRef} className="painter-layer" />
      <canvas ref={overlayRef} className="painter-layer" />
    </div>
  )
}
```

- [ ] **Step 2: The editor side panel**

`src/EditorPanel.tsx`:

```tsx
import { UploadPanel } from './upload/UploadPanel'
import type { Tool } from './mask/MaskPainter'

export function EditorPanel(props: {
  tool: Tool
  setTool: (t: Tool) => void
  brushSize: number
  setBrushSize: (n: number) => void
  tolerance: number
  setTolerance: (n: number) => void
  onUndo: () => void
  onExportMask: () => void
  onImportMask: (file: File) => void
  onUploadCard: (canvas: HTMLCanvasElement) => void
  onError: (msg: string) => void
}) {
  return (
    <aside className="panel">
      <UploadPanel onLoaded={props.onUploadCard} onError={props.onError} />

      <fieldset>
        <legend>Tool</legend>
        {(['brush', 'eraser', 'wand'] as const).map((t) => (
          <label key={t}>
            <input
              type="radio"
              name="tool"
              checked={props.tool === t}
              onChange={() => props.setTool(t)}
            />
            {t === 'wand' ? 'color wand' : t}
          </label>
        ))}
      </fieldset>

      {props.tool !== 'wand' && (
        <label className="slider">
          Brush size {props.brushSize}px
          <input
            type="range"
            min={4}
            max={120}
            value={props.brushSize}
            onChange={(e) => props.setBrushSize(Number(e.target.value))}
          />
        </label>
      )}

      {props.tool === 'wand' && (
        <label className="slider">
          Tolerance {props.tolerance}
          <input
            type="range"
            min={0}
            max={120}
            value={props.tolerance}
            onChange={(e) => props.setTolerance(Number(e.target.value))}
          />
        </label>
      )}

      <div className="row">
        <button onClick={props.onUndo}>Undo</button>
        <button onClick={props.onExportMask}>Export mask</button>
        <label className="file-button">
          Import mask
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) props.onImportMask(f)
            }}
          />
        </label>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Rewire `App.tsx` with Preview/Edit views**

Replace `src/App.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { CardScene } from './card/CardScene'
import { usePrefersReducedMotion, webglAvailable } from './card/env'
import {
  buildCardMaps,
  loadImage,
  loadSampleAssets,
  updateRoughnessCanvas,
  type CardMaps,
} from './card/textures'
import { EditorPanel } from './EditorPanel'
import { MaskEditor } from './mask/maskEditor'
import { MaskPainter, type Tool } from './mask/MaskPainter'
import { MotionPermission } from './input/MotionPermission'
import { useTilt } from './input/useTilt'

interface CardState {
  artwork: HTMLCanvasElement
  editor: MaskEditor
  maps: CardMaps
}

function makeCardState(artwork: HTMLCanvasElement, initialMask?: HTMLCanvasElement): CardState {
  const editor = new MaskEditor(artwork.width, artwork.height)
  if (initialMask) editor.loadFrom(initialMask)
  const maps = buildCardMaps(artwork, editor.canvas)
  editor.onChange = () => {
    maps.metalnessMap.needsUpdate = true
    updateRoughnessCanvas(editor.canvas, maps.roughnessMap.image as HTMLCanvasElement)
    maps.roughnessMap.needsUpdate = true
  }
  return { artwork, editor, maps }
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { tilt, recenter } = useTilt(containerRef)
  const reduced = usePrefersReducedMotion()
  const hasWebgl = useMemo(webglAvailable, [])

  const [view, setView] = useState<'preview' | 'edit'>('preview')
  const [card, setCard] = useState<CardState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(24)
  const [tolerance, setTolerance] = useState(40)

  useEffect(() => {
    let cancelled = false
    loadSampleAssets().then(({ artwork, mask }) => {
      if (!cancelled) setCard(makeCardState(artwork, mask))
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!hasWebgl) {
    return (
      <div className="stage">
        <img className="flat-card" src="/sample/sample-card.svg" alt="Sample invitation card" />
      </div>
    )
  }
  if (!card) return null

  const aspect = card.artwork.width / card.artwork.height

  return (
    <div className="layout">
      <header className="topbar">
        <strong>Foil Studio</strong>
        <nav>
          <button disabled={view === 'preview'} onClick={() => setView('preview')}>
            Preview
          </button>
          <button disabled={view === 'edit'} onClick={() => setView('edit')}>
            Edit foil
          </button>
        </nav>
      </header>

      {error && (
        <p className="error" onClick={() => setError(null)}>
          {error}
        </p>
      )}

      {view === 'preview' ? (
        <div className="stage" ref={containerRef}>
          <CardScene maps={card.maps} aspect={aspect} tilt={tilt} frozen={reduced} />
          <MotionPermission onGranted={recenter} />
        </div>
      ) : (
        <div className="edit-layout">
          <MaskPainter
            artwork={card.artwork}
            editor={card.editor}
            tool={tool}
            brushSize={brushSize}
            tolerance={tolerance}
          />
          <EditorPanel
            tool={tool}
            setTool={setTool}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            tolerance={tolerance}
            setTolerance={setTolerance}
            onUndo={() => card.editor.undo()}
            onExportMask={() => {
              void card.editor.exportPNG().then((blob) => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'foil-mask.png'
                a.click()
                URL.revokeObjectURL(a.href)
              })
            }}
            onImportMask={(file) => {
              const url = URL.createObjectURL(file)
              void loadImage(url)
                .then((img) => card.editor.importImage(img))
                .catch(() => setError('Could not read that mask image.'))
                .finally(() => URL.revokeObjectURL(url))
            }}
            onUploadCard={(artwork) => {
              setCard(makeCardState(artwork))
              setView('edit')
            }}
            onError={setError}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Layout styles**

Append to `src/styles.css`:

```css
.layout { display: flex; flex-direction: column; height: 100%; }
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 16px; border-bottom: 1px solid #2c2822;
}
.topbar button { margin-left: 8px; }
.layout .stage { flex: 1; min-height: 0; }
.edit-layout {
  flex: 1; min-height: 0; display: flex; gap: 16px; padding: 16px;
}
.painter { position: relative; flex: 1; max-height: 100%; align-self: center; touch-action: none; }
.painter-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
.panel { width: 240px; display: flex; flex-direction: column; gap: 16px; font-size: 14px; }
.panel fieldset { border: 1px solid #2c2822; border-radius: 8px; display: grid; gap: 6px; }
.slider { display: grid; gap: 4px; }
.row { display: flex; flex-wrap: wrap; gap: 8px; }
.file-button { border: 1px solid #6b6353; border-radius: 6px; padding: 4px 10px; cursor: pointer; }
.error { padding: 8px 16px; color: #e08b8b; cursor: pointer; }
@media (max-width: 700px) {
  .edit-layout { flex-direction: column; }
  .panel { width: 100%; }
}
```

- [ ] **Step 5: Manual verification (full M2 loop)**

Run: `npm run dev`. Verify:
1. Preview shows the sample card with foil (as in Task 7), now driven by the editable mask.
2. "Edit foil" shows the artwork with gold-tinted mask overlay matching the foil regions.
3. Brush adds gold overlay; switch to Preview → new regions shine. Eraser removes.
4. Wand: click the cream background with tolerance ~40 → most background selects (visible as tint); Undo reverts it. Click gold text → text selects.
5. Upload a photo/JPEG → switches to edit view with an empty mask; paint some foil; Preview shines where painted.
6. Export mask downloads a black/white PNG; re-importing it reproduces the same mask.

- [ ] **Step 6: Build, test, commit**

```bash
npm run build && npm run test
git add -A
git commit -m "feat: mask painter UI with live foil preview (M2)"
```

---

### Task 13: Finish — README, docs, deploy, verification matrix

**Files:**
- Create: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the finished app.
- Produces: shipped M2; repo documented for the next phase (Paper).

- [ ] **Step 1: Write `README.md`**

```markdown
# Foil Studio

Upload a card (e.g. a wedding invitation), paint which parts are gold foil,
and view it as an interactive card — tilt your phone (or move the mouse) and
the foil catches the light like the real thing.

**Live:** <production URL>

- `npm run dev` — local dev · `npm run build` — production build · `npm run test` — unit tests
- Everything is client-side; uploaded images never leave the browser.
- `reference/pokemon-cards/` — retired fork of
  [pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) (GPL-3.0),
  kept as a study/benchmark reference. This repo is GPL-3.0 (see LICENSE).
- Roadmap and specs: `docs/superpowers/specs/`.
```

(Fill in the real production URL from Task 8.)

- [ ] **Step 2: Run the full verification matrix**

- `npm run build && npm run test` — clean.
- Desktop Chrome + Safari: pointer tilt, painting, wand, undo, export/import, upload.
- iPhone Safari (production URL after push): grant + deny paths, gyro shine, painting with a finger usable (basic is acceptable per spec).
- Android Chrome: gyro works with no button.
- `prefers-reduced-motion`: card static but lit in Preview.
- Benchmark: run `reference/pokemon-cards` locally side-by-side; judge whether PBR foil reads as convincingly as the CSS holo (note verdict for the Paper phase — if underwhelming, the follow-up lever is `iridescence` on `MeshPhysicalMaterial`).

- [ ] **Step 3: Deploy + record**

```bash
git push origin main
```

Confirm the Vercel production deployment updates, fill the live URL into `README.md` and `CLAUDE.md`, then:

```bash
git add README.md CLAUDE.md
git commit -m "docs: README + verification results for Foil Studio v1"
git push origin main
```
