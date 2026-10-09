# Classroom Screen artwork — real people

The classroom screen has to show **a real person** for every character: the chat
prints a character's photo beside every bubble, the floating widget shows who is
speaking, and a class recognises a face long before it reads a name. So this app
does not generate cartoon avatars — it ships photographs.

| file | what it is |
| --- | --- |
| `01.jpg` … `24.jpg` | one professional portrait per character, 640 × 640 JPEG, numbered in order |

They are the **tutor's own headshots**, copied byte-for-byte (nothing resized or
re-encoded) from the interview studio's set in this repo:

```
tutorly-games/adult/interview/public/images/characters/01.jpg … 24.jpg
```

That collection is documented in
`tutorly-games/adult/interview/public/images/README.md`, including the import
scripts (`npm run portraits -- --from "folder-or.zip"`).

## How the app uses them

- `src/lib/avatars.ts` is the only place the list lives. Paths are **relative**
  (`avatars/01.jpg`, no leading slash) because the published app is served from
  `/Tutorly-cscreen-v1/`, where a root-absolute path would 404.
- New participants, new learners and the tutor profile all start on one of these
  photos, and the participant editor shows the whole set as a grid to pick from.
- An old room that still holds a generated avatar (or no avatar at all) is
  migrated to a real photo the next time it loads — a real photo a tutor chose is
  never overwritten.
- Paste, file upload and image-URL still work and always win: a tutor can put a
  photo of the actual classmate behind the character name.

## Replacing the set

Drop your own pictures in as `01.jpg` … `24.jpg` (or any names, adjusted in
`src/lib/avatars.ts`) and rebuild:

```bash
npm run build:cscreen        # from the repo root
```

Square pictures around 640 × 640 look best: the chat renders them in a circle
between 26 px and 44 px wide, and the lightbox can open them full size.
