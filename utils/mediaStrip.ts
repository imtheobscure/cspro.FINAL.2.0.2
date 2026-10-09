/**
 * Inlined-media strip.
 *
 * The tutor's workspace keeps its pictures inside the data it saves: a learner avatar
 * is a `data:` URL, a whiteboard snapshot is a base64 PNG, a kid's drawing is a data
 * URL again. On the tutor's own disk that is exactly right — it is one file in one
 * folder and nobody pays for the bytes twice. On a shared MySQL host it is the single
 * thing that decides whether a hundred tutors fit, so anything leaving for the server
 * goes through here first.
 *
 * This module is deliberately free of any app imports: it is pure, so it can be called
 * from the cloud payload builder, from an export, or from a test, and nobody has to
 * stand up the stores to check it.
 */

/**
 * Size at which a string is treated as media rather than data.
 *
 * 8 KB sits far above every legitimate text field in the workspace (long lesson HTML is
 * full of markup and would never match anyway, and it is not in the cloud payload) and
 * far below a real image: a downscaled avatar is tens of KB, a whiteboard snapshot is
 * hundreds. Small inline SVG icons live under this line and survive, which is why a
 * custom platform logo still comes back on another machine.
 */
export const INLINE_MEDIA_MIN_CHARS = 8 * 1024;

/** A prefix-less base64 blob has to be this big before the shape test runs on it. */
const BASE64_BLOB_MIN_CHARS = 64 * 1024;

/** Pure base64 — no markup, no spaces, no prose. */
const BASE64_SHAPE = /^[A-Za-z0-9+/=\r\n]+$/;

export interface MediaStripStats {
  /** How many image strings were blanked out. */
  count: number;
  /** How many characters of image data never left the browser. */
  bytes: number;
}

/** True when a string is inlined image bytes rather than something worth uploading. */
export function looksLikeInlinedMedia(value: string): boolean {
  if (value.length < INLINE_MEDIA_MIN_CHARS) return false;
  // Every data URL in this app — canvas snapshots, pasted photos, stamps — looks like this.
  if (value.startsWith('data:')) return true;
  // A blob without the prefix: only trusted when it is big and is pure base64, so a long
  // HTML lesson or chat transcript (which contain markup, spaces and newlines) can never
  // be mistaken for an image and silently deleted.
  return value.length >= BASE64_BLOB_MIN_CHARS && BASE64_SHAPE.test(value);
}

/**
 * Walk a value and blank out inlined image bytes.
 *
 * A deep pass rather than a list of known fields, because learner avatars, whiteboard
 * snapshots, kid artwork, teacher stamps, classroom backgrounds and custom platform
 * logos all live in different places and new ones appear as features are added. An
 * allow-list of image keys would silently stop working the moment somebody adds the
 * next one, and the failure mode is a server that quietly fills up.
 *
 * What is deliberately left alone: the key itself. Restoring a learner whose `avatar`
 * key is missing entirely is riskier than restoring one whose `avatar` is an empty
 * string — every reader in the app tests the value for truthiness, and an empty string
 * is falsy in exactly the same way `undefined` is, without changing the shape of the
 * record. Array entries are *removed* instead of blanked, because an empty slot in a
 * list of stamps renders as a broken image while a shorter list renders as one fewer.
 */
export function deepStripInlinedMedia<T>(
  value: T,
  stats: MediaStripStats = { count: 0, bytes: 0 },
  seen: Set<unknown> = new Set(),
): T {
  if (typeof value === 'string') {
    if (!looksLikeInlinedMedia(value)) return value;
    stats.count += 1;
    stats.bytes += value.length;
    return '' as unknown as T;
  }
  if (!value || typeof value !== 'object') return value;
  // Cyclic structures would otherwise recurse forever; real payloads are plain JSON, but
  // this is called on live store state before it is serialized in some callers.
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => deepStripInlinedMedia(item, stats, seen))
      .filter((item) => item !== '') as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = deepStripInlinedMedia(entry, stats, seen);
  }
  return out as unknown as T;
}

/** A short, human size for a stripped-bytes total: "1.8 MB", "640 KB", "0 B". */
export function formatStrippedBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
