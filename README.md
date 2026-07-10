# Foil Studio

Upload a card (e.g. a wedding invitation), paint which parts are gold foil,
and view it as an interactive card — tilt your phone (or move the mouse) and
the foil catches the light like the real thing.

**Live:** https://card-foil.vercel.app

- `npm run dev` — local dev · `npm run build` — production build · `npm run test` — unit tests
- Brush, eraser, and color-wand masking are fully client-side. The **smart
  select (AI)** tool sends the card image to `/api/segment`, which proxies it
  to [fal.ai](https://fal.ai)'s SAM model (pass-through, never stored by us).
  Without a `FAL_KEY` env var the tool hides itself and everything else stays
  local-only.
- Full-stack local dev (API included): `npx vercel dev` with `FAL_KEY` set.
- `reference/pokemon-cards/` — retired fork of
  [pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css) (GPL-3.0),
  kept as a study/benchmark reference. This repo is GPL-3.0 (see LICENSE).
- Roadmap and specs: `docs/superpowers/specs/`.
