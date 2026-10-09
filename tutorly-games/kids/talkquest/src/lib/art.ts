import { publicFile } from './basePath';
import { IMAGE_MANIFEST } from './imageManifest';

/**
 * Convert an emoji to a Twemoji SVG URL (consistent, cute, free).
 *
 * The one subtlety is U+FE0F, the “render this as colour” marker. Dropping it
 * everywhere is the usual advice, but this asset tree names joined emoji WITH
 * the marker: 👩‍⚕️ is `1f469-200d-2695-fe0f.svg`, and asking for
 * `1f469-200d-2695.svg` is a 404 — so the doctor, pilot, pirate, mage and mermaid
 * icons silently dropped back to a flat system glyph. Keycaps are the opposite
 * way round (1️⃣ is `31-20e3.svg`), so the marker is kept only inside a joined
 * (ZWJ) sequence, which is exactly where this CDN wants it.
 *
 * `WordPic` still falls back to the bare emoji if an image ever fails, so a new
 * emoji nobody has checked yet can never show as a broken picture.
 */
export function twemojiUrl(emoji: string): string {
  const joined = emoji.includes('\u200d');
  const pts: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (!cp) continue;
    if (cp === 0xfe0f && !joined) continue;
    pts.push(cp.toString(16));
  }
  const hex = pts.join('-');
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${hex}.svg`;
}

/** DiceBear character portraits — free, no key. */
export function buddyUrl(seed: string, style: 'adventurer' | 'fun-emoji' | 'lorelei' | 'bottts' = 'adventurer') {
  const bg = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];
  const i = Math.abs(hash(seed)) % bg.length;
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg[i]}`;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

export function pickBuddy(name: string) {
  return buddyUrl(name, 'adventurer');
}

/*
 * ── The game artwork ──────────────────────────────────────────────────────────
 *
 * Every game has a hand-made backdrop picture in `public/images/`, named after
 * the game exactly as the original app named it:
 *
 *     whisper-wall.jpg   alien-cafe.jpg     parrot-delivery.jpg
 *     detective-office.jpg  animal-rescue.jpg  time-traveler.jpg
 *     monster-baby.jpg   magic-mirror.jpg   lost-found.jpg   robot-lab.jpg
 *
 * `scene()` therefore returns the .jpg path first — the artwork is the real
 * thing and it must win. `SceneImageGuard` (mounted in the layout) catches the
 * case where a file is missing and walks the fallbacks below, ending at the
 * generated `.svg` scene, so a card can never sit there showing a broken-image
 * icon.
 *
 * Two details that took a bug to learn:
 *
 * 1. A plain `<img src="/images/x.jpg">` is NOT rewritten by Next's basePath, so
 *    it asks the SITE ROOT and 404s even when the file is right there in
 *    `public/`. Every scene goes through `publicFile()` for this reason — under
 *    the deployed sub-path `/tutorly-games/kids/talkquest/`, that is the
 *    difference between the artwork showing and not showing for every child.
 * 2. The fallback order is a file-extension chain, not a folder, so a `.png` or
 *    `.webp` copy works without anyone renaming it to `.jpg`.
 */
export const SCENE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

/**
 * The backdrop for a game screen.
 *
 * `scripts/manifest-images.mjs` records which artwork files exist at build time,
 * so this returns the real picture with no wasted 404s and falls back to the
 * generated `.svg` scene when there is no picture yet. A URL that is already
 * absolute (or a data URI) is passed straight through.
 */
export function scene(name: string) {
  if (/^(?:https?:)?\/\//.test(name) || name.startsWith("data:")) return name;
  const ext = IMAGE_MANIFEST[name];
  return publicFile(`images/${name}.${ext ?? "svg"}`);
}

/** The generated scene used when no artwork file exists. */
export function sceneFallback(name: string) {
  return publicFile(`images/${name}.svg`);
}

/**
 * The next file to try after a scene failed to load, or null when there is
 * nothing left to try.
 *
 * The generated `.svg` is the end of the line — if that is what failed, the card
 * keeps whatever it has rather than looping — and the remaining raster extensions
 * are tried in preference order, which is what lets a `.png` or `.webp` copy work
 * without anyone renaming it to `.jpg`.
 */
export function nextSceneCandidate(src: string, tried: readonly string[] = []): string | null {
  const path = src.split(/[?#]/)[0];
  const m = /^(.*\/images\/[^/]+?)\.(jpg|jpeg|png|webp|avif|svg)$/i.exec(path);
  if (!m) return null;
  const [, stem, ext] = m;
  const attempted = [...tried, ext.toLowerCase()];
  if (attempted.includes("svg")) return null;
  const next = SCENE_EXTENSIONS.find((candidate) => !attempted.includes(candidate));
  return next ? `${stem}.${next}` : `${stem}.svg`;
}
