# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Pre-implementation.** This repo currently contains only a research document —
`compass_artifact_wf-*_text_markdown.md` — a 2026 guide to building realistic
interactive holographic (Pokémon-style) trading cards on the web. There is no
source code, package manifest, build system, or tests yet. When implementation
starts, this file should be updated with real build/lint/test commands.

The goal is to build a web component/page that renders a holographic card with a
realistic foil "holo" shine, 3D tilt/parallax, and phone gyroscope support.
Intended embedding target is the user's personal site (ashantanu.com).

## Technical direction (decided in the research doc)

Read the research markdown for full detail; the load-bearing decisions are:

- **Default to CSS + a thin JS tilt layer, not WebGL.** Only escalate to
  Three.js/react-three-fiber if benchmarks show CSS can't deliver the needed
  depth/iridescence, or true 3D geometry is required.
- **The engine is: JS writes CSS custom properties from pointer/gyro input; pure
  CSS reacts.** Track pointer/touch relative to the card via
  `getBoundingClientRect()`, normalize, and `setProperty('--pointer-x', ...)`.
- **The holo look is a recipe, not one trick:** stacked rainbow gradient layers
  (oversized `background-size`, repositioned by the pointer vars) + a
  pointer-following radial glare + `mix-blend-mode: color-dodge` (plus overlay /
  hard-light / soft-light / luminosity) + an aggressive container
  `filter: brightness()/contrast()/saturate()` + per-rarity masks.
- **Tilt/parallax is solved by tiny libraries** — prefer one over hand-rolling:
  vanilla → `vanilla-tilt.js` or `atropos.js`; React → `react-parallax-tilt`;
  framework-agnostic → Simon Goellner's `hover-tilt` web component.
- **Smooth values before writing them** (spring/rAF) to avoid jank; the canonical
  reference uses Svelte `spring` stores.

## Gyroscope — the main gotcha

- Listen to `deviceorientation`; map `gamma` → horizontal (rotateY/glare) and
  `beta` → vertical (rotateX/glare), clamped (~±25–45°).
- **iOS 13+ requires `DeviceOrientationEvent.requestPermission()` called from a
  real user tap** (a button click) — it cannot fire on load or in a framework
  lifecycle hook. Feature-detect with
  `typeof DeviceOrientationEvent.requestPermission === 'function'` to branch
  iOS vs Android/older.
- **Must be served over HTTPS.** Always provide a mouse/touch fallback — some
  phones have no gyroscope and report `alpha/beta/gamma` as `null`.

## Licensing constraints (affects how code may be reused)

- `simeydotme/pokemon-cards-css` (the canonical reference) is **GPL-3.0**
  (copyleft). Safe to study/fork for personal use, but distributing a public
  product that incorporates its code triggers source-disclosure. For a
  commercial/proprietary ship, **rebuild the CSS from the techniques** (which
  aren't copyrightable) or use permissively-licensed libraries instead.
- `hover-tilt`, `atropos.js`, `vanilla-tilt.js`, `react-parallax-tilt` are
  MIT/MPL — safe. Verify `hover-tilt`'s actual `LICENSE` file (README says
  MPL-2.0, GitHub sidebar says MIT).
- **Do not ship real Pokémon artwork** — the technique is free, the art/name are
  Nintendo/TPC IP. Use original art for anything public.

## Performance / accessibility guardrails

- Prefer animating `transform`/`opacity`; the holo effect inherently animates
  `background-position`, so keep the count of blended layers modest on mobile.
- Add `will-change: transform` on the card/holo layers; throttle pointer/gyro
  handlers to `requestAnimationFrame`; watch for GPU "layer explosion" from too
  many `translateZ`/`will-change` layers.
- Honor `prefers-reduced-motion` (disable tilt/shimmer).
- `mix-blend-mode` renders differently in Blink vs WebKit — test both.
