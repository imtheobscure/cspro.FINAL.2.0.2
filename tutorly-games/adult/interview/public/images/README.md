# Interview artwork

The 24 interviewers have **professional portrait photographs**, one per character,
in the same files and the same naming the original app always asked for:

| file | what it is |
| --- | --- |
| `characters/01.jpg` … `characters/24.jpg` | one portrait per interviewer, 640 × 640 JPEG, numbered in session order |
| `tutorly-hero.jpg` | the dashboard hero panel (1400 × 900): portraits 01, 09 and 07 on the interface's warm background |

The originals live in `tutorly-games/adult/images/` and were copied here
byte-for-byte — nothing was resized or re-encoded. `01.jpg` is session 1,
`02.jpg` is session 2, and so on; the name **is** the mapping.

## Which name the app asks for

The original app used zero-padded names (`/images/characters/01.jpg`); an earlier
build of this app used plain ones (`1.jpg`). Both resolve: the manifest
canonicalises the key, so `01.jpg` and `1.jpg` are the same character, and if both
are present the zero-padded name wins. Your files therefore drop in unchanged.

`.png`, `.webp` and `.avif` work too. If a file is missing, `ImageGuard` walks the
extension chain, so a missing picture can never show a broken-image icon.

## Replacing or extending the set

```bash
# import a folder or a .zip of pictures — any filenames, matched by name or order
npm run portraits -- --from "C:/path/to/photos"

# rebuild just the dashboard hero from portraits 1, 9 and 7
npm run portraits -- --hero

# draw photorealistic corporate-headshot portraits with AI instead (no keys needed)
npm run portraits:ai                 # only for characters with no picture
npm run portraits:ai -- --ids=10,11  # specific characters
npm run portraits:ai -- --sheet      # …and write .portrait-review.html to review them
```

Or simply copy `01.jpg` … `24.jpg` into this folder and run `npm run build` — the
manifest is regenerated and the real pictures are used.

## A note on the hero panel

`tutorly-hero.jpg` is composed from three portraits in this folder, so it always
matches the current cast. Rebuild it with `npm run portraits -- --hero` after
changing them. To use a photograph of your own instead, drop it in as
`tutorly-hero.jpg` and skip that command.

Use square images, at least 512 × 512. They appear at 166 px on the learning-path
cards, 74 px on the dashboard row and up to about 440 px in the practice room, so
640 px stays sharp on a high-density screen.
