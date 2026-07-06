# Pokémon Holo Card — Gyro on Phone, Hosted on Vercel

**Date:** 2026-07-06
**Status:** SUPERSEDED — executed, then retired. The fork now lives as a
reference (see `2026-07-06-foil-studio-design.md`); its Vercel deployment is
replaced by the Foil Studio app at repo root.

## Goal

Render realistic holographic Pokémon cards on the web, viewable on a phone with
working gyroscope (device-tilt) motion, hosted on Vercel at a public HTTPS URL.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Base code | Fork `simeydotme/pokemon-cards-css` **whole app as-is** | Fastest to a live, full-featured demo; user chose this over trimming/rebuilding. |
| Host | **Vercel** | Auto-detects Vite (zero config), instant HTTPS, preview URL per commit. |
| Target phones | **iPhone + Android** | Add the iOS motion-permission button; it is a no-op on Android. |
| License | GPL-3.0, personal use | No source-disclosure trigger for private/personal use. |

## Background: what the repo is

- Plain **Vite + Svelte 3 SPA** (NOT SvelteKit). Entry `index.html` → `src/main.js` → `src/App.svelte`.
- Build: `vite build` → outputs to `dist/`. Dev: `vite --host`. Preview: `vite preview`.
- Cards data loaded at runtime from `/data/cards.json` (in `public/`); holo CSS and
  foil/mask textures live under `public/`.
- Gyro today: `src/lib/stores/orientation.js` is a Svelte `readable` store that adds a
  global `window.addEventListener("deviceorientation", …)` and exposes absolute +
  relative (`beta`/`gamma` minus a captured baseline) orientation. It is consumed in
  `src/lib/components/Card.svelte` (`orientate($orientation)` ~line 353).
- `index.html` references `%VITE_GA%` for Google Analytics; with no env var it resolves
  to empty and the build still succeeds. We leave GA unset.

## The one real gap: iOS gyroscope permission

The repo **never calls `DeviceOrientationEvent.requestPermission()`** (verified: no
match anywhere in `src/`). Consequences:

- **Android** — `deviceorientation` fires directly over HTTPS. Works unchanged.
- **iOS 13+** — Safari/Chrome require an explicit `requestPermission()` call triggered
  by a real user gesture (tap). Without it, the event never fires and the card sits still.

### Fix (minimal, additive)

Add a small "Enable motion" affordance that, on tap:

1. Feature-detects `typeof DeviceOrientationEvent.requestPermission === 'function'`.
2. If present (iOS): call `requestPermission()`; on `'granted'`, the existing
   `orientation` store's listener starts producing values. On Android/older the check
   is false, so we do nothing extra — the store already works.
3. Optionally call `resetBaseOrientation()` (already exported from `orientation.js`) so
   the baseline is captured from the user's current hold position.

Placement: a single button in `App.svelte` (or a tiny `MotionPermission.svelte`
component), shown on touch devices. ~15 lines, isolated, does not alter the holo/tilt
engine or `Card.svelte` internals. On Android the button is harmless (no-op branch);
we may hide it when `requestPermission` is absent to keep the UI clean.

Requirement in all cases: **served over HTTPS** — Vercel provides this automatically.

## Deployment flow

1. Establish the fork as its own project at repo root (fresh git history; the upstream
   `LICENSE` (GPL-3.0) is retained). Research `.md` files and `CLAUDE.md` may remain at
   root or be moved to `docs/` — they do not affect the Vite build.
2. `npm install` → `npm run build` locally to confirm a clean `dist/`.
3. Push to a GitHub repo.
4. Import to Vercel (dashboard or `vercel` CLI). Framework preset: Vite / Other; build
   command `vite build`, output dir `dist`. No env vars required.
5. Open the resulting `https://<name>.vercel.app` on the phone; on iPhone tap "Enable
   motion" and grant; tilt the phone to see the holo shift.

## Testing / verification

- **Build:** `npm run build` succeeds, `dist/` produced.
- **Local dev:** `npm run dev -- --host`, load in desktop browser, confirm pointer-driven
  holo + tilt work (mouse fallback).
- **Live Android:** open Vercel URL, tilt phone, holo reacts with no prompt.
- **Live iPhone:** open Vercel URL, tap "Enable motion", grant permission, tilt phone,
  holo reacts. Confirm graceful state before granting (card still works via touch).
- **Regression:** the rest of the gallery (search, all rarities) renders as upstream.

## Out of scope (YAGNI)

- Trimming the gallery down to specific cards, or embedding into ashantanu.com — a
  possible later phase; not part of this deploy.
- Rebuilding the effect to escape GPL / any WebGL/shader route.
- Custom domain, analytics, PWA, or per-rarity customization.

## Risks / notes

- `mix-blend-mode` renders slightly differently between Chrome (Blink) and Safari
  (WebKit); expect minor visual variance — acceptable.
- Some low-end phones lack a gyroscope; `beta/gamma` may be `null`. Touch/pointer
  fallback (already in the app) covers this.
- Shipping actual Pokémon artwork is fine for a personal, non-commercial demo; would be
  an IP concern if ever commercialized.
