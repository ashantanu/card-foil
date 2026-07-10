# Smart Select — Server-Side SAM Segmentation for Foil Masks

**Date:** 2026-07-10
**Status:** Approved design
**Context:** Foil Studio phase 3a (auto masks), pulled forward after the color
wand proved inadequate on photographic cards (flood fill over-selects connected
gold tones; see v0.1.0 user testing).

## Goal

Tap an object on the card (e.g. a monogram) and get a high-quality foil mask
proposal from SAM, refined by additional include/exclude taps, then commit it
to the existing mask editor. Quality outranks latency and privacy-purity —
segmentation runs server-side on the best available SAM checkpoint.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where inference runs | **Hosted GPU API (fal.ai), proxied by a Vercel function** | Best SAM quality with ~100 lines of ours; in-browser variants (SlimSAM) and Vercel-hosted CPU inference both sacrifice quality. User chose quality explicitly. |
| Provider/model | **fal.ai `fal-ai/sam2/image`**, model id behind a `SAM_MODEL` env var | Documented point-prompt API (verified 2026-07-10). fal also hosts SAM 3 — swapping the env var lets us A/B without code changes. |
| Timeout risk | None: Vercel Fluid compute default max duration is **300s on all plans** (verified 2026-07-10); warm fal calls are 1–3s | The old 10s Hobby limit no longer applies. |
| Privacy | **Smart select sends the card to our API → fal** (not stored by us; pass-through). Brush/eraser/wand remain fully client-side | README/privacy copy updated; smart-select UI carries a one-line disclosure. |
| Wand | Kept as-is (local, tolerance slider) as the offline/fallback tool | User request: "sam replaces tolerance but keep the old tap based selection". |
| Session model | Stateless per request: every refinement re-sends image + all accumulated points | Simplest v1; fal re-encodes (~1–3s/tap). Embedding reuse (Modal-style) is a later optimization if refinement feels slow. |

## Architecture

```
[MaskPainter tap] → points[] state → POST /api/segment {imageDataUrl, points[]}
                                        │ (Vercel function, holds FAL_KEY)
                                        ▼
                              fal.subscribe(SAM_MODEL, {image_url: dataURI,
                                            prompts: points, sync_mode: true})
                                        ▼
                    {maskDataUrl} → client: mask PNG → Uint8Array selection
                    (threshold + scale to artwork px) → proposal overlay
                    → [Add foil | Remove foil | Cancel] → editor.applySelection()
```

### Server: `api/segment.ts` (Vercel serverless function)

- `POST` only. Body: `{ image: string /* data URI */, points: [{x, y, label: 0|1}] }`.
- Guards: body ≤ 8MB, ≥1 point, data-URI mime `image/png|jpeg|webp`; 405 on
  other methods; 400 with a message on validation failure.
- Calls fal via `@fal-ai/client` with `credentials: process.env.FAL_KEY`,
  `sync_mode: true`, `output_format: 'png'`; returns `{ mask: string /* data URI */ }`.
- Missing `FAL_KEY` → 503 `{ error: 'segmentation not configured' }` (client
  disables the tool gracefully).
- Errors from fal → 502 with a short message. No logging of image contents.

### Client: `src/segment/`

- `segmentClient.ts` — `segment(image: HTMLCanvasElement, points: SamPoint[]):
  Promise<HTMLImageElement>`; converts canvas → PNG data URI (the artwork is
  already ≤2048px), POSTs, decodes the returned mask data URI.
- `maskToSelection.ts` — pure: mask RGBA (+ dimensions) → `Uint8Array` (0/1)
  in artwork pixel space. Threshold heuristic: if the mask image has meaningful
  alpha variation, use alpha > 127; otherwise luminance > 127. (fal may return
  a white-on-black mask or a cutout with transparency depending on model —
  handle both.) Unit-tested.
- Scaling: mask may come back at a different resolution than the artwork —
  draw to an artwork-sized canvas before thresholding.

### UI (Edit view)

- New tool **smart select**, the default tool. Radio row gains it; wand stays.
- Sub-mode: **include / exclude** taps (SAM labels 1/0), mirroring the wand's
  add/remove UI pattern.
- Tap flow: taps accumulate; each tap fires a segment request (in-flight
  request cancelled/superseded by the newest tap — last write wins); the
  returned mask renders as a **proposal overlay** (cyan, distinct from the
  committed-mask pink) with floating **Add foil / Remove foil / Cancel**
  buttons and small point markers at tap locations.
- Add/Remove routes through `editor.applySelection(sel, 'add'|'remove')` —
  undo, highlight view, live material update all unchanged. Commit or Cancel
  clears points + proposal.
- Busy state: subtle spinner near the buttons while a request is in flight;
  taps stay responsive (they queue the next request).
- Failure state: error banner (reuses existing `.error`) + tool falls back to
  suggesting the wand; 503 (unconfigured) hides the tool entirely.
- Disclosure line under the tool radio when smart select is active:
  "Sends the card image to our segmentation service."

## Out of scope (YAGNI)

- Embedding reuse / websocket realtime mode (later, only if refinement latency annoys)
- Box prompts, multi-mask ranking UI
- Rate limiting beyond body-size caps (personal-scale deployment; revisit at Phase 4)
- Depth parallax (next spec — reuses this proxy pattern for Depth Anything)

## Testing

- Unit (Vitest): `maskToSelection` thresholds (alpha path, luminance path,
  scaling), point-accumulation reducer if extracted pure.
- `api/segment.ts`: validation-path unit tests if trivially separable; the fal
  round-trip is verified manually (needs `FAL_KEY`).
- Manual: desktop `vercel dev` with a real key — tap monogram → proposal →
  add; exclude-tap refinement; cancel; wand still works; airplane-mode/503
  degradation. On-device (iPhone + Android) against production.

## Operational requirements

- **User action:** create a fal.ai account, generate an API key, add it as
  Vercel env var `FAL_KEY` (production + preview + development).
- Optional env `SAM_MODEL` (default `fal-ai/sam2/image`).
- Cost expectation: fractions of a cent per segmentation call at personal scale.
