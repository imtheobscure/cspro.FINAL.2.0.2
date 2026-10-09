# Coursebook covers (stored locally on this device)

Official cover artwork lives here as plain image files so the Coursebook Catalog
never depends on a remote image that can break or show the wrong book.

## How covers are resolved (priority order)

1. **Tutor override** — uploaded/pasted via the **🖼️ Set Cover** button in the
   catalog's book detail view. Stored in the app's local storage
   (`coursebook-storage-v2` → `coverOverrides`), survives restarts, and is
   included in the catalog backup.
2. **This folder** — a record's `coverImage` points at `/coursebook-covers/<file>`.
3. **Neutral fallback** — a generic placeholder (if the file is missing, the UI
   swaps to it automatically instead of showing a broken image).

## Current files

| File | Book | Source |
| --- | --- | --- |
| `flagship-1.jpg` | Flagship (Pearson) Level 1 Student's Book, Latin American ed. | Pearson DAM cover (480×600) |
| `impact-2e.jpg` | Impact 1 with the Spark platform, 2nd ed. (NGL, ISBN 9798214176178) | Cengage cover servlet (150×188) |
| `survival-english.jpg` | Survival English for Travelers — official Learn Hot English "Travel English" booklet cover | PocketMags cover CDN (362×512) |

## Adding a cover for another book

Drop the official image in this folder and set the record's `coverImage` in
`data/CoursebookManagerData.ts` to `/coursebook-covers/<your-file>`, **or** just
use the **Set Cover** button in the app (upload a photo or paste a URL) — that
needs no file editing and persists on this computer.

- Get On (Express Publishing) has no verifiable published edition yet — expected
  drop-in name: `get-on-1.jpg`.