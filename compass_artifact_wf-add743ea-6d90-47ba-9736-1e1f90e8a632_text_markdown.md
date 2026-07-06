# Building Realistic Interactive Holographic Trading Cards on the Web (Pokémon-Style Holo + 3D Tilt + Gyroscope) — A Practical 2026 Guide

## TL;DR
- **Start by studying and (for personal/open-source use) forking Simon Goellner's `pokemon-cards-css` (GitHub, 7.6k stars, 747 forks, GPL-3.0)** — it is the canonical, most-referenced implementation of realistic Pokémon holo cards, built with pure CSS (gradients + `mix-blend-mode: color-dodge` + filters + masks) driven by CSS custom properties, with Svelte handling pointer/gyroscope input.
- **For most projects, pure CSS + a small JS tilt layer is the right choice, not WebGL.** Use CSS 3D transforms (`perspective`, `rotateX/Y`, `transform-style: preserve-3d`) for tilt and parallax; add a library like `vanilla-tilt.js`, `atropos.js`, or `react-parallax-tilt` (all have built-in gyroscope support) rather than hand-rolling. Reserve Three.js/react-three-fiber shader approaches for when you specifically need true 3D geometry or physically-based iridescence.
- **Gyroscope is the trickiest part:** use the `deviceorientation` event's `beta`/`gamma` values, serve over HTTPS, and on iOS 13+ call `DeviceOrientationEvent.requestPermission()` from a user tap (button click) — it cannot be auto-triggered on load. The old wrapper `gyronorm.js` is abandoned; prefer a tilt library's built-in gyroscope option or a few lines of your own code.

## Key Findings

1. **The definitive reference is `simeydotme/pokemon-cards-css`.** It nails the "Sword & Shield era" holo look using only CSS techniques driven by JS-set custom properties. It's GPL-3.0 (important for reuse), and Simon has since published a lighter, more permissively-licensed drop-in tilt component (`hover-tilt`).
2. **The holo effect is a recipe, not a single trick:** stacked gradient layers (rainbow linear/conic + radial "glare"), `mix-blend-mode: color-dodge` (plus `overlay`, `hard-light`, `screen`), aggressive `filter: brightness()/contrast()/saturate()`, and mask/clip images per rarity — all repositioned live via CSS variables set from pointer or gyroscope.
3. **Tilt/parallax is a solved problem** with mature, tiny, touch-and-gyro-aware libraries. Pick based on framework: vanilla → `vanilla-tilt.js` or `atropos.js`; React → `react-parallax-tilt`; any framework → Simon's `hover-tilt` web component.
4. **WebGL/shaders (Three.js) are optional and usually overkill** for a flat card, but they're the right tool for true thin-film iridescence, foil-flake sparkle, or characters that pop out in real 3D.

## Details

### 1. Canonical open-source references

**`simeydotme/pokemon-cards-css` (THE one)**
- Repo: https://github.com/simeydotme/pokemon-cards-css — **7.6k stars, 747 forks, GPL-3.0 license**. Language breakdown: CSS 56.2%, Svelte 31.8%, Shell 7.0%, HTML 2.6%, JavaScript 2.4%.
- Live demo: https://poke-holo.simey.me/ (view on a phone in Chrome/Firefox for the device-orientation animation).
- Featured on CSS-Tricks: https://css-tricks.com/holographic-trading-card-effect/
- How it works (confirmed from source + DeepWiki): Svelte sets CSS custom properties that drive everything. Real variable names in the current repo include `--pointer-x`, `--pointer-y`, `--pointer-from-center`, `--pointer-from-top`, `--pointer-from-left`, `--background-x`, `--background-y`, `--card-scale`, `--card-opacity`, `--rotate-x`, `--rotate-y`. Effect/config variables include `--grain`, `--glitter`, `--foil`, `--mask`, `--space`, `--angle`, `--scanlines-*`, `--cosmosbg`. (Note: the shorthand names `--mx`, `--my`, `--posx`, `--posy`, `--hyp` belong to Simon's *older jQuery CodePen*, not the current Svelte repo.)
- **DOM layer stack (BEM):** `.card` → `.card__translater` → `.card__rotator` → (`.card__front` [the image], `.card__shine`, `.card__glare`). The `.card__shine` and `.card__glare` layers each add `:before`/`:after` pseudo-elements, so a holo card composites roughly 6+ layers.
- **Smoothing:** uses `svelte/motion` `spring` stores to smooth pointer/rotate/glare/background values before writing them to the CSS variables. The pointer/touch handler is named `interact` (with `interactEnd` on leave). It reads both `e.clientX/Y` and `e.touches[0].clientX/Y`, computing position relative to `getBoundingClientRect()`.
- **Exact blend/filter values (from `public/css/cards/regular-holo.css`):** the main rainbow `.card__shine` uses a 15-color repeating gradient at 110deg, `background-size: 400% 400%`, `background-blend-mode: overlay`, `mix-blend-mode: color-dodge`, `filter: brightness(1.1) contrast(1.1) saturate(1.2)`, with `background-position` driven by `--background-x/--background-y`. The `.card__shine:before` bar pattern uses `mix-blend-mode: hard-light`; `.card__shine:after` radial highlight (centered at `var(--pointer-x) var(--pointer-y)`) uses `mix-blend-mode: luminosity; filter: brightness(0.6) contrast(4)`. Glare uses `mix-blend-mode: overlay`.

**Related official repos by the same author**
- `simeydotme/pokemon-cards-151` — Scarlet & Violet "151" era variant. Live: https://poke-151.simey.me/
- **`simeydotme/hover-tilt`** — https://github.com/simeydotme/hover-tilt (**111 stars, 8 forks, 42 commits**). A Svelte 5 **and** Web Component for a hoverable tilting card with optional glare/mask. `npm install hover-tilt`. Works in vanilla, React, Vue, Angular, Astro, jQuery via the web component. This is Simon's recommended "get the effect without much effort" path. **License note:** the repo README's License section states **MPL-2.0**, but GitHub's repo sidebar/file-nav detects it as **MIT** — verify the current `LICENSE` file before relying on either; both are far more permissive than the GPL-3.0 of the main cards repo.

**Forks / ports**
- React component: `@mountainpass/react-pokemon-cards` (npm) — `<ShinyCard rarity="rare holo">`, wraps the CSS effect for React.
- ClojureScript port: `joshmurr/css-card`.
- Community forks: `jonnyhoff/holographic-cards-css`, `kydkennedy/holo-cards`.
- React Native (bonus, not web): `DongGukMon/TiltHologramCard` (uses Skia shaders + gyroscope), and a Skia tutorial by Jerin John K. on Medium.
- Note: there is no official plain-npm package of the original; issue #18 documents that the intended reuse path is copying the CSS + reimplementing the event handlers in your framework, or using `hover-tilt`.

**Breakdown / teardown resources**
- Josh Dance's interactive breakdown (referenced by CSS-Tricks): https://www.joshdance.com/100/day50/ — shows two rainbow gradients moving in opposite directions with additive blending creating the "randomish" shifting pattern.

### 2. Core techniques (how to reproduce the holo + lighting look)

**a) Pointer → CSS variables (the engine).** Track pointer/touch relative to the card with `getBoundingClientRect()`, normalize to 0–100% (or -1..1), and write to CSS variables with `element.style.setProperty('--pointer-x', ...)`. Everything else is pure CSS reacting to those variables. Alex Chiu's tutorial (https://chiubaca.com/holograpic-cards-pt-1/) is the clearest step-by-step for this "soft spotlight" foundation.

**b) The glare/spotlight layer.** A `radial-gradient(farthest-corner circle at var(--x) var(--y), rgba(255,255,255,.8), transparent)` with `mix-blend-mode: soft-light` (or `overlay`) that follows the pointer — this is the moving "light reflection."

**c) The rainbow holo layer.** One or more `linear-gradient`/`repeating-linear-gradient`/`conic-gradient` rainbow layers, oversized (`background-size: 200%–400%`), repositioned via the pointer variables. Two rainbow layers moving in opposite directions + additive blending creates the shifting foil.

**d) Blend modes (the heart of it).** `mix-blend-mode`/`background-blend-mode` with `color-dodge` (brightens, creates metallic blown-out highlights — the signature Pokémon look), plus `overlay`, `hard-light`, `screen`, `soft-light`, `luminosity`, `color-burn`, `difference`. Robb Owen's article "Holograms, light-leaks and how to build CSS-only shaders" (https://robbowen.digital/wrote-about/css-blend-mode-shaders/) explains the "specular map" idea: use a dark image as a mask so light only falls where you want, then `color-dodge` a gradient over it.

**e) Filters.** A container-level `filter: brightness() contrast() saturate()` (often high contrast, e.g. `contrast(2–4)`) forces muddy blends into vivid, punchy rainbow foil. This is what makes CSS blends look "holographic" rather than washed-out.

**f) Masks / textures per rarity.** Different rarities (holo, reverse holo, galaxy/cosmos, rainbow, gold, radiant, V/VMAX) use different `mask-image`/`clip-path` and foil texture images (e.g. galaxy uses a "HoloSheet" texture; the repo credits `aschefield101` on DeviantArt and Vecteezy for backgrounds). Masks constrain the shine to the artwork window or the whole card.

**g) Compositing order.** Base image → shine layer(s) with blend modes → glare/spotlight on top → container contrast filter. Isolation (`isolation: isolate`) can prevent unwanted blending with the page.

**Reference tutorials for the CSS itself:**
- CSS-Tricks "Grainy Gradients" (SVG `feTurbulence` noise + blend) — https://css-tricks.com/grainy-gradients/
- Cloud Four "The Power of CSS Blend Modes" — https://cloudfour.com/thinks/the-power-of-css-blend-modes/
- OpenReplay "Creating Holographic Effects in CSS" — https://blog.openreplay.com/creating-holographic-effects-css/
- MDN `mix-blend-mode` / `<blend-mode>` reference.

### 3. 3D tilt and parallax

**Raw CSS 3D.** Put `perspective: 600–1000px` on a wrapper, `transform: rotateX(calc(...)) rotateY(calc(...))` on the card (driven by pointer/gyro variables), and `transform-style: preserve-3d`. For parallax "pop-out," give inner layers `transform: translateZ(20–50px)`. Lower perspective = more extreme tilt.

**Libraries (all touch-friendly; most support gyroscope):**
- **vanilla-tilt.js** — https://github.com/micku7zu/vanilla-tilt.js (GitHub: ~4k stars / ~180 forks), `npm i vanilla-tilt` (~24,870 weekly downloads, current version 1.8.1, MIT). Smooth vanilla-JS tilt (a fork of Gijs Rogé's original Tilt.js), built-in **glare** effect and **gyroscope** support. Gyro defaults: `gyroscope: true`, `gyroscopeMinAngleX: -45`, `gyroscopeMaxAngleX: 45` (and Y equivalents), plus `gyroscopeSamples: 10` (how many gyroscope moves to decide the starting position). Best all-round no-framework pick. Data-attribute driven (`data-tilt`).
- **atropos.js** — https://atroposjs.com / https://github.com/nolimits4web/atropos. ~2KB, zero deps, MIT. Excellent **multi-layer parallax** (`data-atropos-offset` on child elements to make them pop at different depths), Apple-tvOS-style. Vanilla, React, and Web Component builds. Best when you want layered depth/parallax specifically.
- **tilt.js** — https://github.com/gijsroge/tilt.js, ~3.7k stars. The original jQuery version (author Gijs Rogé; requires jQuery). Has glare and parallax (`translateZ` on children). Somewhat dated (last active ~years ago) — prefer vanilla-tilt (its direct descendant) for new work.
- **react-parallax-tilt** — https://github.com/mkosir/react-parallax-tilt, `npm i react-parallax-tilt`, ~3KB zero-deps, MIT, actively maintained. Props: `tiltMaxAngleX/Y`, `glareEnable`, `glareMaxOpacity`, `glarePosition`, `scale`, `perspective`, and **`gyroscope={true}`**. Best React pick. (`react-next-tilt` and `react-vanilla-tilt` are alternatives; `react-tilt` is the older port.)
- **hover-tilt** (Simon Goellner) — see above; framework-agnostic web component with tilt + glare + mask.

### 4. Phone gyroscope / device motion

**The API.** Listen to the `deviceorientation` event on `window`; it gives `alpha` (0–360, compass/Z), `beta` (front-back tilt, -180..180, X), `gamma` (left-right tilt, -90..90, Y). Map `gamma` → `rotateY`/horizontal glare and `beta` → `rotateX`/vertical glare, clamped to a comfortable range (e.g. ±25–45°). There's also `devicemotion` (acceleration/rotationRate) as a lower-level fallback.

**iOS 13+ permission gate (the #1 gotcha).** Since iOS 13, Safari requires an explicit, user-gesture-triggered permission call:
```js
function enableGyro() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(state => { if (state === 'granted')
        window.addEventListener('deviceorientation', handler); })
      .catch(console.error);
  } else {
    window.addEventListener('deviceorientation', handler); // Android / older
  }
}
// must be called from a real tap:
button.addEventListener('click', enableGyro);
```
- **Must be HTTPS** — `requestPermission`/the events won't work on insecure origins.
- **Must be from a user gesture** (tap/click) — cannot be auto-invoked on page load or in framework lifecycle hooks like `ngOnInit`.
- **Feature-detect** with `typeof DeviceOrientationEvent.requestPermission === 'function'` to distinguish iOS 13+ from Android/older.
- **Android** generally grants access without a prompt (but still HTTPS).
- Cross-device inconsistency: some low-end devices have an accelerometer but no gyroscope; `alpha/beta/gamma` may be `null`, so test and provide fallbacks. Chrome DevTools → Sensors panel lets you simulate orientation without a device.

**Wrapper libraries.** `gyronorm.js` (`dorukeker/gyronorm.js`, ~644 stars) normalizes gyro/accelerometer across devices **but is explicitly abandoned by its author and predates the iOS 13 permission model — do not rely on it for new projects.** Best current approach: use a tilt library's built-in `gyroscope` option (vanilla-tilt, react-parallax-tilt) which handles the mapping, or write the ~15 lines above yourself. Note: tilt libraries generally still leave the iOS `requestPermission` tap-to-enable step to you.

### 5. Framework-specific options & modern tooling (2025–2026)

- **React:** `react-parallax-tilt` (tilt + glare + gyroscope) is the go-to; combine with the `pokemon-cards-css` CSS (ported) or `@mountainpass/react-pokemon-cards` for the holo shine. `hover-tilt` web component also works in React.
- **Svelte:** the original repo is Svelte; `hover-tilt` is a native Svelte 5 component.
- **Tailwind / component libraries:** there's no canonical shadcn/Tailwind holo-card in the ecosystem; the common pattern is dropping a tilt component (react-parallax-tilt) and hand-writing the holo gradient layers with arbitrary-value Tailwind classes or a plain CSS file. FreeFrontend and CodePen host many copy-paste "Holographic 3D Interactive Card" snippets.
- **CSS Houdini `@property`:** modern pure-CSS builds register typed custom properties (`@property --ratio-x { syntax: '<number>'; inherits:false; initial-value:0; }`) so gradient positions/tilt can *transition smoothly* when the pointer leaves — something untyped CSS variables can't animate. Good broad support for `@property` today; use it for smoother reset animations.
- **Three.js / react-three-fiber (advanced):**
  - `ektogamat/threejs-holographic-material` — drop-in `<HolographicMaterial>` for R3F (Fresnel, scanlines, blinking); MIT. More sci-fi hologram than foil.
  - Three.js Journey "Hologram Shader" lesson — teaches Fresnel + stripe pattern + glitch.
  - Nikos Papadopoulos "Implementing a foil sticker effect" (https://www.4rknova.com/blog/2025/08/30/foil-sticker) — a proper shader recreating iridescent foil via angle-based hue shift + procedural flake sparkle + Fresnel; closest to "realistic foil" in WebGL.
  - Verdict: overkill for a flat card that only tilts. Use it when you need genuine 3D geometry, environment reflections, or physically-plausible iridescence, and can afford the bundle size and GPU cost.
- **Spline (no-code 3D):** https://spline.design — design a 3D card visually, add mouse/hover interactions, export via `<spline-viewer>` web component or React component; free tier, paid from ~$9/mo. Good for designers who want a 3D card with parallax without code, but heavier than CSS and less precise for the exact foil-shimmer look.

### 6. Tutorials & learning resources (best/most current)
- **Alex Chiu — "CSS Holographic cards" series** (https://chiubaca.com/holograpic-cards-pt-1/): best written line-by-line walkthrough of the pointer-driven soft spotlight + tilt.
- **Robb Owen — CSS-only shaders / blend modes** (https://robbowen.digital/wrote-about/css-blend-mode-shaders/): the specular-map + color-dodge theory.
- **CSS-Tricks — Holographic Trading Card Effect** (the announcement/breakdown) and **Josh Dance's interactive input breakdown** (joshdance.com/100/day50/).
- **Atropos** docs + video "Creating Touch-Friendly Parallax Effects with Atropos.js" (YouTube).
- **vanilla-tilt** demo/docs: https://micku7zu.github.io/vanilla-tilt.js/
- **Lee Martin — "How to Request Device Motion and Orientation Permission in iOS 13"** (Medium) and OpenReplay's "Understanding the Device Orientation API": the definitive gyro-permission guides.
- **Three.js Journey Hologram Shader** and **4rknova foil-sticker shader** for the WebGL route.
- CodePen: search "Pokemon holo" / "holographic" (Simon's `abYWJdX` v2 pen; many derivatives).

### 7. Practical tips

**Performance on mobile.**
- Animate only `transform` and `opacity` (GPU-composited); avoid animating `left/top/background-position` where possible — though the holo effect inherently animates `background-position`, so keep the number of blended layers modest on mobile.
- Stacked `mix-blend-mode` + `filter` layers are GPU-expensive; the community consistently reports needing `will-change: transform` on the card/holo layers to avoid stutter on high-DPI phones, and to limit how many cards render the full effect at once.
- Throttle gyro/pointer handlers to animation frames (`requestAnimationFrame`); the original smooths with spring physics which also naturally rate-limits visual updates.
- Respect `prefers-reduced-motion` (disable tilt/shimmer) for accessibility — motion can trigger vestibular issues.
- Beware "layer explosion" / GPU memory: too many `translateZ`/`will-change` layers can crash mobile browsers.

**CSS vs WebGL.** CSS wins for: flat cards, small bundle, easy theming, works everywhere, no GPU shader knowledge. WebGL/Three.js wins for: true 3D depth, environment reflections, physically-based thin-film iridescence, foil flakes, many cards with heavy effects batched on the GPU.

**Assets (holo masks / foil textures).** Grab the mask/texture PNGs and per-rarity CSS from the `pokemon-cards-css` repo's `public/` folder; galaxy/cosmos foil is a "HoloSheet" texture (credited to `aschefield101` on DeviantArt); generate your own grain/noise procedurally with SVG `feTurbulence` (see CSS-Tricks Grainy Gradients) to avoid image weight. Card data/images can come from the Pokémon TCG API.

**Licensing (important).**
- `pokemon-cards-css` is **GPL-3.0**: copyleft. You can use it commercially and privately, but if you **distribute** a work that incorporates its code, you must release that work's corresponding source under GPL-3.0. For internal-only/private use there's no source-disclosure trigger, but for a public product this is a real constraint. Get legal advice for commercial distribution.
- **`hover-tilt`** is labeled **MPL-2.0 in its README** but **MIT in GitHub's sidebar** — both are far more permissive than GPL for combining with proprietary code; confirm the actual `LICENSE` file before shipping.
- `atropos.js`, `vanilla-tilt.js`, `react-parallax-tilt`, `tilt.js`, `threejs-holographic-material` are **MIT** — safe for commercial/proprietary use with attribution.
- **Trademark/IP:** "Pokémon" card art and the Pokémon name are Nintendo/The Pokémon Company IP. The *technique* is free to reuse; shipping actual Pokémon artwork in a commercial product is a separate trademark/copyright risk. Use your own art for anything commercial.

## Recommendations

**Stage 1 — Prototype the look (½–1 day).** Fork/clone `pokemon-cards-css` and run it locally to see the layer structure, or start from Alex Chiu's tutorial to build a minimal card: base image + pointer-driven radial glare (`mix-blend-mode: soft-light`) + one rainbow gradient layer (`mix-blend-mode: color-dodge`) + a container `contrast()` filter. This teaches you the CSS-variable engine.

**Stage 2 — Add tilt + parallax (½ day).** Wrap the card in `perspective` and drive `rotateX/rotateY` from the same pointer variables, or drop in **vanilla-tilt.js** (vanilla) / **react-parallax-tilt** (React) / **atropos.js** (if you want multi-layer depth). Add `translateZ` to inner elements so the character/logo pops.

**Stage 3 — Wire up gyroscope (½ day).** Add a "Tap to enable motion" button that calls `DeviceOrientationEvent.requestPermission()` on iOS; map `beta`/`gamma` to your existing rotate/glare variables; serve over HTTPS; test on a real iPhone and a real Android. If using a tilt library, just set `gyroscope: true` / `gyroscope={true}` but still add the iOS permission tap.

**Stage 4 — Polish & ship.** Add per-rarity masks/textures, register `@property` for smooth reset transitions, add `will-change: transform`, throttle to rAF, honor `prefers-reduced-motion`, and confirm your license path (use `hover-tilt` or MIT tilt libs + your own holo CSS if GPL-3.0 is unacceptable; use your own artwork for commercial).

**Only escalate to WebGL/Three.js** if benchmarks show CSS can't deliver the depth/iridescence you need, or you require true 3D geometry — then use `threejs-holographic-material` (R3F) or the 4rknova foil shader.

**Benchmarks/thresholds that change the plan:** if you see <50fps or jank on mid-range phones with the CSS approach → cut the number of blended layers, reduce blurred/large gradients, or move to a single WebGL canvas. If you must ship real Pokémon art commercially → stop and resolve IP first. If GPL-3.0 distribution is a blocker → do not copy `pokemon-cards-css` code; rebuild the CSS yourself (techniques aren't copyrightable) or use `hover-tilt`.

## Caveats
- Device-orientation animation on the original demo is noted by the author as working in **Chrome/Firefox** on mobile; behavior varies by browser/device, and some phones lack a gyroscope entirely — always provide a touch/mouse fallback.
- Star counts and version numbers are as of mid-2026 and drift over time; treat them as popularity signals, not exact figures.
- `mix-blend-mode` renders slightly differently between Blink (Chrome) and WebKit (Safari); test across both and expect small visual tweaks.
- The exact spring stiffness/damping constants and the precise `deviceorientation` handler name inside the original repo's `Card.svelte` could not be verbatim-verified (GitHub blocked raw-file automated access); the variable names, layer structure, blend/filter values, and license ARE confirmed. Community reimplementations (e.g. Appwrite's) use rotate springs around `{stiffness: 0.066, damping: 0.25}` as an indicative reference.
- `gyronorm.js` and `tilt.js` still appear in search results but are effectively unmaintained; the recommendations above steer you to current alternatives.