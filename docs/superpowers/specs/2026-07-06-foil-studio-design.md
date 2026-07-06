# Foil Studio — Interactive Foil & Paper Card Renderer

**Date:** 2026-07-06
**Status:** Approved design, pre-implementation
**Supersedes:** `2026-07-06-pokemon-card-gyro-vercel-design.md` (executed, now retired to reference)

## Vision

An app where anyone uploads a card (e.g. a wedding invitation), the app identifies
which layers would look good as foil (gold foil, kraft paper texture), and viewers
on a phone tilt the device to see light play across the foil and paper as if
holding the real card.

## Current state of the repo

The repo root is an executed fork of `simeydotme/pokemon-cards-css` (Vite +
Svelte 3): iOS motion-permission button added (`src/lib/components/
MotionPermission.svelte`), gallery redesigned light & airy, deployed on Vercel.
It proved the holo look, the gyro pipeline, and the iOS permission flow.

That app is now **retired as a deployment** and becomes a **reference**: during
M1 it moves to `reference/pokemon-cards/` (still runnable standalone), and the
new studio app takes over the repo root — so the existing Vercel project starts
building the studio with no reconfiguration.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product shape | Public product, **open source GPL-3.0** | User choice. Whole repo stays GPL (inherited from the fork); fork code/techniques may be ported freely with attribution. |
| Renderer | **three.js PBR** (react-three-fiber) from day one | A wedding invitation needs foil AND paper lit consistently. CSS can fake foil but cannot relight paper grain; PBR does both natively (`metalnessMap` for foil, `normalMap` for paper). Nothing is rewritten when paper arrives. |
| Foil masks | **Manual first, auto later** | V1: paint + color-wand selection. ML segmentation (SAM 2, Depth Anything) is a later phase — de-risks the renderer from the ML pipeline. |
| Sharing | **Local-only preview first** | Client-only static app; no storage, auth, or abuse surface. Shareable links are their own later phase. |
| App shape | **Single app at repo root** | The fork's separate deployment is retired; input rig, permission button, renderer, and deploy config are each written once, where they ship. |
| Stack | Vite + React + react-three-fiber + drei | r3f ecosystem (Environment, texture helpers, damping) saves the most time; React carries into the later product phase (Next.js + Supabase). |

## Roadmap (each later phase gets its own spec)

1. **Foil Studio v1** — this spec. M1: sample card live with gyro foil.
   M2: upload your own card + mask painter.
2. **Paper** — kraft / linen / cotton / hammered presets as normal+roughness
   maps; letterpress/emboss via height map. Additive to the same material.
3. **Auto masks** — in-browser SAM 2 (WebGPU click-to-segment) + metallic-color
   heuristic to propose foil masks; Depth Anything V2 for emboss depth. The
   painter becomes the correction tool.
4. **Product loop** — storage, shareable links, embed on ashantanu.com
   (Next.js + Supabase, or an API layer on this app — decided then).

## Phase 1 design: Foil Studio v1

### M1 — sample card live

**Restructure.** `git mv` the fork app (index.html, src/, public/, vite.config.js,
jsconfig.json, package.json, package-lock.json, README-pokemon-cards.md) to
`reference/pokemon-cards/`; scaffold the studio at root. Update `CLAUDE.md` to
describe the new layout and real build commands.

**Renderer.** One card-shaped plane (rounded corners via shader or geometry are
a nice-to-have, not required) with `MeshPhysicalMaterial`:

- `map` = card artwork
- `metalnessMap` = foil mask (white = foil), `roughnessMap` = inverted mask
  (foil glossy ~0.15, paper matte ~0.9)
- `<Environment preset="studio">` (drei) — **required**: metallic foil without
  an environment map renders black; the envmap is what makes gold read as gold
- Later phases add `normalMap` (paper grain) and `iridescence`
  (`MeshPhysicalMaterial` supports it natively — the Pokémon-style rainbow holo
  is available in this renderer when wanted)

**Sample assets.** A bundled original sample card (mock wedding-invitation style)
plus a hand-made foil-mask PNG. **No Pokémon artwork in the studio** — the app
is public; Pokémon art stays in `reference/`.

**Input rig** (one module, the only part conceptually ported from the fork):

- Pointer position over the card, or gyro `gamma`/`beta` clamped to ±30°,
  normalized to `(x, y)` in [-1, 1]
- Frame-rate-independent damping (e.g. `maath/easing.damp`) before applying
- Drives **both** card tilt (max ~±10°) and key-light / envmap rotation
- iOS: `MotionPermission` button re-implemented in React — feature-detect
  `typeof DeviceOrientationEvent.requestPermission === 'function'`, call on tap,
  hide when absent (Android). HTTPS required (Vercel provides).
- `prefers-reduced-motion`: freeze motion, render static lit card
- No WebGL: fall back to the flat artwork image

**Deploy.** Same Vercel project; root build replaces the gallery. Verify on
iPhone (permission grant + deny paths) and Android.

### M2 — bring your own card

- **Upload:** file input + drag-drop, client-only (object URL, never leaves the
  browser). Reject non-images; downscale anything over 2048px on the long edge
  to a working canvas. Card plane adopts the image's aspect ratio.
- **Mask painter:** 2D canvas overlay aligned to the card:
  - Brush / eraser with size control
  - Color wand: click a pixel → flood-select by color similarity with a
    tolerance slider (one click on gold text should get ~90% of a typical
    invitation's foil)
  - Undo (bounded history)
  - Export mask as PNG / import a PNG mask (hand-made masks from design files
    work directly)
  - Mask → `CanvasTexture` → live material update while painting
- **UI:** minimal — card viewport, side panel with upload, brush controls,
  wand tolerance, mask import/export. Design polish is not the goal of M2.

### Error handling

- Gyro absent or `beta`/`gamma` null → pointer/touch fallback (always active)
- iOS permission denied → keep pointer mode, show a one-line hint
- Oversized/corrupt image uploads → downscale / reject with a message
- WebGL context lost → re-create renderer; if unavailable, static image

### Testing

- `npm run build` clean; renderer unit-testable logic kept out of components
  (input normalization, flood-fill/color-wand) with small unit tests
- Manual matrix: desktop Chrome + Safari (pointer); iPhone Safari (grant and
  deny); Android Chrome (no button, gyro direct); `prefers-reduced-motion`;
  60fps sanity on a mid-tier phone (one mesh + one light — expected trivial)
- Visual benchmark: side-by-side with the reference gallery (`reference/
  pokemon-cards/`, run locally) to judge whether the PBR foil reads as good

## Out of scope (YAGNI)

- Paper textures, emboss (Phase 2)
- Any ML (Phase 3)
- Storage, links, accounts, embeds (Phase 4)
- Custom domain, analytics, PWA
- Rounded-corner/thickness card geometry beyond nice-to-have

## Risks / notes

- **Foil look parity:** PBR gold foil is a different aesthetic than the CSS
  color-dodge rainbow holo. Mitigation: envmap choice + `iridescence` gets the
  rainbow back if plain metalness underwhelms; benchmark against the reference.
- **Mobile GPU:** single plane + envmap is light, but test early on-device.
- **Mask painting on touch:** usable-but-basic in M2; polish later.
- **GPL:** whole repo remains GPL-3.0 — fine (chosen); any future closed
  commercialization would require a clean-room rebuild.

## Appendix: paper/relighting research (feeds Phase 2+)

No existing "pokemon-cards-css for paper" was found. Most relevant resources:

| Resource | License | Relevance |
|---|---|---|
| three.js `MeshStandardMaterial`/`MeshPhysicalMaterial` + normalMap + metalnessMap | MIT | Chosen route; only approach found where kraft grain and physically-correct gold foil coexist under one light |
| [normalmap.js](https://github.com/jwagner/normalmap.js/) | MIT | Tiny "relight image with movable light" WebGL lib; unmaintained (~2016); good study reference |
| SVG `feTurbulence` + `feDiffuseLighting`/`fePointLight` ([MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDiffuseLighting)) | web platform | No-WebGL bump lighting; mobile Safari perf unproven; fallback idea |
| [paper-design/shaders](https://github.com/paper-design/shaders) | Apache-2.0 | Procedural kraft/cardstock texture generator (fiber, crumple, roughness params) — candidate source for Phase 2 paper maps |
| [webgpu-sam2](https://github.com/lucasgelfond/webgpu-sam2), [SAM-in-Browser](https://github.com/sunu/SAM-in-Browser) | MIT/Apache | Phase 3: click-to-segment foil regions fully client-side |
| [transformers.js](https://github.com/huggingface/transformers.js) + Depth Anything V2 | Apache-2.0 | Phase 3: in-browser depth (→ normals for emboss) |
| [DeepBump](https://github.com/HugoTini/DeepBump) | GPL-3.0 | Normal maps from photos; GPL-compatible with this repo |
| [NormalMap-Online](https://github.com/cpetry/NormalMap-Online) | check repo | Client-side Sobel normal-map generation; code reference |
| [Foil3D](https://foil3d.com/), Pacdora, [KeyShot foil/spot-UV write-up](https://www.keyshot.com/blog/how-to-create-spot-uv-and-foil-printing-appearance-using-keyshot/) | commercial | Proof of category; KeyShot article documents the material logic (foil = metallic + low roughness mask) |
| [pokebox](https://github.com/selop/pokebox) | — | three.js Pokémon cards with phone-gyro off-axis projection; gyro-wiring reference |
