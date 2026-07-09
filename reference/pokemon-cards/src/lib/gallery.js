// Gallery manifest — seed content.
//
// Each entry is a collapsible folder in the gallery. `cards` become flat
// thumbnails in the grid; clicking one opens the full holo card.
//
// NOTE (seed only): images load from the pokemontcg.io CDN. The real
// "drop photos into folders" pipeline is a later phase — see
// docs/superpowers/specs/2026-07-06-holo-card-gallery-redesign.md.
//
// Cards were chosen so the holo looks great without the (absent) per-card
// foil/mask textures: "Rare Holo" builds its shine from pure CSS gradients,
// and the Rainbow/Secret picks have no per-card mask.

export const gallery = [
  {
    folder: "Kanto Holos",
    cards: [
      { id: "pgo-24", name: "Articuno", set: "pgo", number: "24", rarity: "Rare Holo", img: "https://images.pokemontcg.io/pgo/24_hires.png" },
      { id: "pgo-29", name: "Zapdos",   set: "pgo", number: "29", rarity: "Rare Holo", img: "https://images.pokemontcg.io/pgo/29_hires.png" },
      { id: "pgo-12", name: "Moltres",  set: "pgo", number: "12", rarity: "Rare Holo", img: "https://images.pokemontcg.io/pgo/12_hires.png" },
    ],
  },
  {
    folder: "Eeveelution VMAX",
    cards: [
      { id: "swshp-SWSH180", name: "Flareon VMAX",  set: "swshp", number: "SWSH180", rarity: "Rare Rainbow", img: "https://images.pokemontcg.io/swshp/SWSH180_hires.png" },
      { id: "swshp-SWSH182", name: "Vaporeon VMAX", set: "swshp", number: "SWSH182", rarity: "Rare Rainbow", img: "https://images.pokemontcg.io/swshp/SWSH182_hires.png" },
      { id: "swshp-SWSH184", name: "Jolteon VMAX",  set: "swshp", number: "SWSH184", rarity: "Rare Rainbow", img: "https://images.pokemontcg.io/swshp/SWSH184_hires.png" },
    ],
  },
  {
    folder: "Chase Cards",
    cards: [
      { id: "swsh12pt5-160", name: "Pikachu", set: "swsh12pt5", number: "160", rarity: "Rare Secret", img: "https://images.pokemontcg.io/swsh12pt5/160_hires.png" },
      { id: "swsh1-85",      name: "Gengar",  set: "swsh1",     number: "85",  rarity: "Rare Holo",   img: "https://images.pokemontcg.io/swsh1/85_hires.png" },
    ],
  },
];
