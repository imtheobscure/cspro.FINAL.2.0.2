# Class portraits — source & licence

The five party-class portraits (`fighter.png`, `mage.png`, `marksman.png`,
`assassin.png`, `tank.png`) are **CC0 1.0 (public domain)** and are bundled here
rather than hot-linked, so the game works offline and no URL can rot.

| File | Class | Asset | Source |
| --- | --- | --- | --- |
| `fighter.png` | Fighter | `warrior-berserker-male` | FreeGameSprites — Anime JRPG |
| `mage.png` | Mage | `dark-wizard-hooded-red` | FreeGameSprites — Anime JRPG |
| `marksman.png` | Marksman | `ranger-elf-archer` | FreeGameSprites — Anime JRPG |
| `assassin.png` | Assassin | `assassin-masked-blade` | FreeGameSprites — Anime JRPG |
| `tank.png` | Tank | `sun-knight-radiant-helm` | FreeGameSprites — Anime JRPG |

- Library: <https://freegamesprites.com/en/styles/anime> (operator: *yoyo*)
- Licence: **CC0 1.0 — Public Domain.** "Use for anything. Commercial games,
  personal projects, game jams. No permission needed, no credit required."
  Credited here anyway, because knowing where art came from is worth more than
  the licence demands of us.
- Provenance: the library describes these as AI-generated sprites released under
  CC0. They are used as supplied — not traced from, or derived from, any
  third-party artwork.
- Each file is 384×512 PNG, so the set is consistent in size, framing and style.

## Swapping the art

Drop replacements in this folder with the same five names and nothing else needs
to change — the classes read them through `CLASS_ART()` in `src/flashcards.ts`.
Portraits are shown at 40 px (party bar) to ~200 px (party builder), framed with
the class colour, so any consistent 3:4 or 4:5 portrait set works.

## `vector/`

`vector/*.svg` are drawn from a single template by
`tools/make-class-art.mjs` (same stage, pose, palette; only the class colour and
kit differ). They are **fallbacks**: if a `.png` is ever missing, the class tile
shows the vector instead of a broken-image icon. Regenerate with:

```
node tools/make-class-art.mjs
```
