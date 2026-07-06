# Holo Card Gallery — Redesign

**Date:** 2026-07-06
**Status:** Implemented, then retired to reference — the gallery app moves to
`reference/pokemon-cards/` and its deployment is replaced by Foil Studio (see
`2026-07-06-foil-studio-design.md`).
**Supersedes the UI of:** 2026-07-06-pokemon-card-gyro-vercel-design.md (keeps its holo engine + deploy)

## Goal

Replace the forked Pokémon showcase site with a clean, minimal, **light & airy**
gallery of holographic cards. One page, collapsible folder sections, flat
thumbnails; clicking a card opens it large with the full holo + tilt + gyro effect.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Layout | Single page. Collapsible **folder sections**, expanded by default, all cards visible (no drill-down navigation). |
| Holo scope | Grid shows **flat** thumbnails (fast). Full holo + tilt + gyro fires **only in the opened card view**. |
| Content (now) | Seed with ~6–9 existing Pokémon cards grouped into 2–3 folders. Real photo pipeline deferred. |
| Aesthetic | **Light & airy**: off-white background, hairline borders, soft light shadows, generous whitespace, clean typography. |
| Opened card stage | Card opens on a **dark translucent scrim** so the holo pops even though the gallery is light. |
| Reuse | Keep `Card.svelte` (holo engine), `orientation.js` (gyro store), `MotionPermission.svelte`. |
| Deploy | Same Vercel project (`card-foil`), auto-deploy on push. |

## Architecture

Reuse the holo engine as-is; replace all the surrounding Pokémon chrome.

**Kept (unchanged):**
- `src/lib/components/Card.svelte` — the holo/tilt/gyro card. Reused verbatim as the
  opened-card renderer. (It already reads pointer + `$orientation`.)
- `src/lib/stores/orientation.js`, `src/lib/stores/activeCard.js` — gyro + active-card state.
- `src/lib/components/MotionPermission.svelte` — iOS gyro permission tap.
- `public/css/**` and `public/img/**` — holo textures + per-rarity CSS (loaded at runtime).

**New components:**
- `src/lib/gallery.js` — the seed manifest. Shape:
  `[{ folder: string, cards: [{ id, name, set, number, rarity, img }] }]`.
  `img` uses the existing pokemontcg.io CDN URLs (already proven to load). Pick
  rarities whose textures are present (rare holo, cosmos, secret rare, rainbow) so
  the opened holo looks perfect.
- `src/lib/components/Gallery.svelte` — page root: a title/header (minimal) + a stack
  of `Folder` sections built from the manifest. Owns "which card is open" state and
  renders `CardOverlay` when a card is open.
- `src/lib/components/Folder.svelte` — one collapsible section: header (folder name,
  card count, chevron) + a responsive CSS-grid of `Thumb`s. Expanded by default;
  clicking the header toggles collapse with a smooth height/opacity animation.
  Local `expanded` state (in-session only).
- `src/lib/components/Thumb.svelte` — flat thumbnail: the card image, rounded corners,
  soft shadow, subtle hover-lift/scale. No blend-modes/holo. Emits a click with its
  card + folder context.
- `src/lib/components/CardOverlay.svelte` — full-screen overlay: dark translucent
  scrim + centered `Card.svelte` (full holo/tilt/gyro) + close affordances + prev/next.

**Rewritten:**
- `src/App.svelte` — strip header/intro/search/author/rarity sections. Render
  `<MotionPermission />` + `<Gallery />` only. Keep the card-data-free; the manifest
  replaces the `cards.json` fetch + slicing logic.

## Data flow

1. `App` mounts `Gallery`; `Gallery` imports the static `gallery.js` manifest.
2. `Gallery` renders one `Folder` per manifest entry; each `Folder` renders `Thumb`s.
3. Click a `Thumb` → bubbles `{folder, index}` to `Gallery` → sets `openCard`.
4. `Gallery` renders `CardOverlay` for the open card, passing the card props into
   `Card.svelte`. Pointer move tilts it; on phone, `MotionPermission` → gyro tilts it.
5. Close (✕ / Esc / backdrop) clears `openCard`. `←/→` change index within the folder.

## Interaction & accessibility

- Folder header is a real `<button>` with `aria-expanded`; chevron rotates on toggle.
- Overlay: focus-trapped, `Esc` closes, backdrop click closes, `←/→` navigate,
  `role="dialog"` + `aria-modal`. Restore focus to the originating thumb on close.
- Respect `prefers-reduced-motion`: disable the showcase auto-spin / soften transitions.
- Flat grid + single opened holo keeps mobile GPU load low.

## Aesthetic notes (light & airy)

- Off-white page (`~#f7f7f5`), ink text (`~#1a1a1a`), one restrained accent for the
  chevron/hover/focus ring. Hairline (`1px`, low-opacity) borders; soft, low-spread
  shadows; generous section spacing. Responsive `auto-fill` grid, `minmax(~160px,1fr)`.
- Typography: clean system stack (or one tasteful web-safe family), clear hierarchy —
  gallery title > folder name > (optional) card caption. Restraint over ornament.
- Opened overlay uses a dark scrim (`rgba(10,10,15,.82)` + slight blur) as the card's stage.
- Frontend-design skill guides final type/scale/spacing at implementation time.

## Out of scope (YAGNI / later)

- Real local-photo pipeline + auto-generated manifest (a later spec).
- Upload UI, per-folder cover art, editable captions/metadata, search/filter, tags.
- Persisting collapse state across sessions.

## Verification

- `npm run build` succeeds; deploy to Vercel.
- In-browser: gallery renders light & airy; folders collapse/expand smoothly; clicking a
  thumb opens the holo card on the dark scrim; pointer tilts it; `←/→`, `Esc`, backdrop
  all work; no console errors. Gyro confirmed manually on a phone.

## Risks / notes

- Card art still loads from the pokemontcg.io CDN (offline = blank thumbs). Acceptable
  for the seed; the local-photo pipeline removes this dependency later.
- `Card.svelte` carries some Pokémon-specific markup (rarity badges, set/number). In the
  opened view that's fine; if any of it looks off for non-Pokémon photos later, it gets
  addressed in the content-pipeline spec, not here.
