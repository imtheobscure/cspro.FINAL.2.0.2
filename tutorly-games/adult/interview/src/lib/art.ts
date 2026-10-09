import { publicFile } from './basePath';
import { IMAGE_MANIFEST } from './imageManifest';

/*
 * ── Character artwork ────────────────────────────────────────────────────────
 *
 * Every interviewer has a portrait in `public/images/characters/<id>.<ext>`, and
 * the dashboard hero art is `public/images/tutorly-hero.<ext>`.
 *
 * The app used to ask for `/images/characters/<id>.jpg` directly. That had two
 * problems: the files were never shipped, so all twenty-four portraits were
 * broken images, and — because a plain `<img src="/…">` is NOT rewritten for
 * `basePath` — even a present file would have 404'd under the deployed
 * sub-path.
 *
 * So:
 *   · the manifest (written at build time by `scripts/manifest-images.mjs`) says
 *     which real file exists, and the real file wins;
 *   · a `.jpg` is preferred, but `.png`, `.webp` and `.avif` work, so artwork does
 *     not have to be renamed to fit;
 *   · **both naming conventions resolve.** The ORIGINAL app asked for
 *     `/images/characters/01.jpg` — zero-padded — and this one ships
 *     `characters/1.jpg`. The manifest canonicalises the key, so `01.jpg` and
 *     `1.jpg` are the same character and the tutor's own files can keep the name
 *     they already have;
 *   · the generated `.svg` illustrations are the last resort, and
 *     `ImageGuard` walks the chain when a file is missing so nothing ever shows
 *     a broken-image icon.
 */
export const ART_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;

/** The portrait for interviewer `id`. */
export function characterImage(id: number): string {
  return scene(`characters/${id}`);
}

/** The dashboard hero illustration. */
export function heroImage(): string {
  return scene('tutorly-hero');
}

/**
 * Resolve a scene by its path under `images/`, without the extension.
 *
 * The manifest holds the real file name — `characters/01.jpg`, `characters/7.png`
 * — so whatever the tutor called the picture (and whichever of the two numbering
 * conventions they used) is exactly what the browser asks for. With nothing in the
 * manifest the generated `.svg` is the answer, which is always present.
 */
export function scene(name: string): string {
  const file = IMAGE_MANIFEST[name];
  return publicFile(file ? `images/${file}` : `images/${name}.svg`);
}

/**
 * The next file to try after an image failed to load, or null when there is
 * nothing left. The generated `.svg` is the end of the line: if that failed the
 * element keeps what it has rather than looping.
 */
export function nextImageCandidate(src: string, tried: readonly string[] = []): string | null {
  const path = src.split(/[?#]/)[0];
  const match = /^(.*\/images\/[^/]+?)\.(jpg|jpeg|png|webp|avif|svg)$/i.exec(path);
  if (!match) return null;
  const [, stem, ext] = match;
  const attempted = [...tried, ext.toLowerCase()];
  if (attempted.includes('svg')) return null;
  const next = ART_EXTENSIONS.find((candidate) => !attempted.includes(candidate));
  return next ? `${stem}.${next}` : `${stem}.svg`;
}
