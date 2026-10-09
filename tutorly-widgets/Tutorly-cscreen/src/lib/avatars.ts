/**
 * The cast of real people.
 *
 * Every character in this room is a real person in front of a real class, and a
 * cartoon blob or a letter in a circle is the wrong face for that: the chat shows
 * a character's photo on every bubble, the floating widget shows who is talking,
 * and the class has to recognise at a glance who is speaking. So the app ships a
 * library of 24 **photographs** — the tutor's own professional headshots, the same
 * set the interview studio uses — and every default avatar comes from it.
 *
 * The files live in `public/avatars/01.jpg … 24.jpg` (640 × 640 JPEG, copied
 * byte-for-byte from `tutorly-games/adult/interview/public/images/characters/`;
 * see `public/avatars/README.md` for provenance and how to swap them).
 *
 * Paths are deliberately **relative** (`avatars/01.jpg`, no leading slash): the
 * published app is served from `/Tutorly-cscreen-v1/`, where a root-absolute
 * `/avatars/01.jpg` would 404 — and relative paths work in the dev server too.
 */

export const AVATAR_COUNT = 24;

export const REAL_AVATARS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_v, i) => `avatars/${String(i + 1).padStart(2, "0")}.jpg`,
);

/** A previously generated / placeholder avatar that should be replaced by a real one. */
export function isGeneratedAvatar(url?: string): boolean {
  if (!url) return true;
  return (
    /api\.dicebear\.com/i.test(url) ||
    /ui-avatars\.com|placehold\.|pravatar|robohash|thispersondoesnotexist/i.test(url) ||
    /^data:image\/svg/i.test(url)
  );
}

/**
 * Choose a portrait for a new character, preferring one nobody in the room is
 * already using — two identical faces in one lesson is exactly what makes an
 * avatar useless.
 */
export function pickAvatar(taken: (string | undefined)[] = []): string {
  const used = new Set(taken.filter(Boolean) as string[]);
  const free = REAL_AVATARS.filter((a) => !used.has(a));
  const pool = free.length ? free : REAL_AVATARS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Deterministic pick, for the very first character or a fixed slot. */
export function avatarAt(index: number): string {
  return REAL_AVATARS[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT];
}

/** Replace a missing or cartoon avatar with a real photo; leave real photos alone. */
export function ensureRealAvatar<T extends { avatar?: string }>(entity: T, index: number): T {
  if (!isGeneratedAvatar(entity.avatar)) return entity;
  return { ...entity, avatar: avatarAt(index) };
}

/**
 * A stable photo for a name.
 *
 * Chat bubbles carry their own copy of the author's face, and a room saved
 * before the library existed has a cartoon in each one. Anyone who cannot be
 * matched back to a participant (a learner who pasted a line, a guest) still gets
 * a real face — the same one every reload, so the class learns who is who.
 */
export function avatarForName(name: string, taken: (string | undefined)[] = []): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const used = new Set(taken.filter(Boolean) as string[]);
  const free = REAL_AVATARS.filter((a) => !used.has(a));
  const pool = free.length ? free : REAL_AVATARS;
  return pool[h % pool.length];
}
