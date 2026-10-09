/**
 * "Who am I playing as?" — read the dashboards.
 *
 * The console is collected into the main Tutorly app's `dist/` (see
 * `scripts/collect-standalone-apps.mjs`), so it is served from the *same origin*
 * as the Adult Dashboard and the Kids Dashboard. That means the tutor's learners
 * are already sitting in this browser — and the tutor asked to be offered their
 * names **with their own faces** when typing into RANKINGS.
 *
 * So nothing is duplicated and nothing is copied: the console reads the learners
 * where they already live.
 *
 *   Adult Dashboard
 *     IndexedDB (idb-keyval) · `learner-profile-storage`
 *       The Zustand-persist payload: `{ state: { learners: [...] }, version }`.
 *       `learner.avatarId` is an emoji, `custom:<id>`, or an image URL/data URL.
 *     IndexedDB (idb-keyval) · `custom-avatar-custom:<id>` → the profile photo,
 *       stored as a data URL by `services/customAvatarStore.ts`.
 *
 *   Kids Dashboard
 *     IndexedDB (idb-keyval) · `kids_learning_kingdom_v2`, mirrored into
 *       localStorage under the same name. The payload is LZString-compressed
 *       UTF-16 JSON, shape `{ learners: [...] }`; a kid has `avatar` (an emoji)
 *       and may carry `photoDataUrl`.
 *
 * ── The rules this file must keep ────────────────────────────────────────────
 * It is READ ONLY. It never writes to either dashboard's keys, and it never
 * deletes anything. Every read is individually guarded: a missing key, a renamed
 * field, a still-compressed payload or a corrupt row degrades to "no suggestion"
 * and is reported as null — a console that cannot suggest names is a small
 * annoyance, a console that damages a learner store is not. That is also why the
 * storage imports are dynamic: `idb-keyval` and `lz-string` only load the moment
 * somebody actually opens the name field, so the console's first paint is
 * unchanged for everyone who never uses this.
 */

export type ContactSource = "adult" | "kids" | "console" | "guest";

export interface Contact {
  /** Stable within a source, so a picked contact keeps its identity. */
  id: string;
  name: string;
  /** An emoji, or a data/https URL ready to drop straight into an <img src>. */
  avatar: string;
  source: ContactSource;
}

const ADULT_STORE_KEY = "learner-profile-storage";
const KIDS_STORE_KEY = "kids_learning_kingdom_v2";
const CUSTOM_AVATAR_PREFIX = "custom-avatar-";

/* ------------------------------------------------------------------ avatars -- */

/**
 * A compact mirror of `services/avatarService.getAvatarUrl`, which lives in the
 * main app and cannot be imported from here (separate build). Deliberately the
 * same precedence, so a learner looks identical in both apps: a real photo beats
 * an emoji, an emoji beats initials.
 */
function adultAvatar(avatarId: unknown, name: string, photos: Map<string, string>): string {
  const id = typeof avatarId === "string" ? avatarId : "";
  if (id.startsWith("custom:")) {
    const photo = photos.get(id);
    if (photo) return photo;
  }
  if (id.startsWith("http") || id.startsWith("data:image/")) return id;

  // One or two code points means the tutor picked an emoji, not a preset name.
  const isEmoji = id ? Array.from(id).length <= 2 : false;
  if (isEmoji) return id;

  return initialsAvatar(name);
}

/** The same colour/initials fallback the main app uses, so the face is familiar. */
function initialsAvatar(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = Math.floor(Math.abs((Math.sin(hash) * 16777215) % 16777215))
    .toString(16)
    .padStart(6, "0");
  const initials = name.trim().slice(0, 2).toUpperCase() || "?";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">` +
    `<rect width="100" height="100" fill="#${color}" rx="50" ry="50"/>` +
    `<text x="50" y="54" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" ` +
    `font-family="sans-serif" font-size="40" font-weight="bold">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

/** `btoa` on a string that may contain non-Latin-1 characters (names, emoji). */
function toBase64(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------ payload parsing -- */

/**
 * Both dashboards store a JSON *string*. The kids' payload is additionally
 * LZString-compressed, and every value read back out of IndexedDB can arrive as
 * an object, a plain JSON string, or a compressed string depending on which
 * version of the app wrote it — so try the cheap path first, then decompress.
 */
async function parseStoredPayload(raw: unknown): Promise<any | null> {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  try {
    const { default: LZString } = await import("lz-string");
    const decompressed = LZString.decompressFromUTF16(raw);
    return decompressed ? JSON.parse(decompressed) : null;
  } catch {
    return null;
  }
}

/** Zustand-persist wraps state as `{ state: {...}, version }`; older files do not. */
function unwrapZustand(parsed: any): any {
  if (parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object") {
    return parsed.state;
  }
  return parsed;
}

function readLocalStorageRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ the scan -- */

async function readAdultContacts(): Promise<Contact[]> {
  try {
    const idb = await import("idb-keyval");

    const payload = await parseStoredPayload(await idb.get(ADULT_STORE_KEY));
    const state = unwrapZustand(payload);
    const learners: any[] = Array.isArray(state?.learners) ? state.learners : [];
    if (!learners.length) return [];

    // Every custom photo lives under `custom-avatar-custom:<learnerId>`. Read them
    // in one pass and index by the `custom:<id>` key the profile refers to.
    const photos = new Map<string, string>();
    try {
      for (const key of await idb.keys()) {
        if (typeof key !== "string" || !key.startsWith(CUSTOM_AVATAR_PREFIX)) continue;
        const value = await idb.get<string>(key);
        if (typeof value === "string" && value.startsWith("data:")) {
          photos.set(key.slice(CUSTOM_AVATAR_PREFIX.length), value);
        }
      }
    } catch {
      /* No photos is fine — avatars fall back to emoji/initials. */
    }

    return learners
      .filter((l) => l && typeof l.name === "string" && l.name.trim())
      .map((l) => ({
        id: `adult:${String(l.id ?? l.name)}`,
        name: String(l.name).trim(),
        avatar: adultAvatar(l.avatarId, String(l.name).trim(), photos),
        source: "adult" as const,
      }));
  } catch {
    return [];
  }
}

async function readKidsContacts(): Promise<Contact[]> {
  try {
    let payload: any = null;

    // IndexedDB is the source of truth; localStorage is the mirror the main app
    // keeps for migrations. Try IDB, then the mirror.
    try {
      const idb = await import("idb-keyval");
      payload = await parseStoredPayload(await idb.get(KIDS_STORE_KEY));
    } catch {
      payload = null;
    }
    if (!payload) payload = await parseStoredPayload(readLocalStorageRaw(KIDS_STORE_KEY));

    const learners: any[] = Array.isArray(payload?.learners) ? payload.learners : [];
    return learners
      .filter((l) => l && typeof l.name === "string" && l.name.trim())
      .map((l) => {
        const name = String(l.name).trim();
        const photo = typeof l.photoDataUrl === "string" && l.photoDataUrl.startsWith("data:") ? l.photoDataUrl : "";
        const emoji = typeof l.avatar === "string" && l.avatar ? l.avatar : "";
        return {
          id: `kids:${String(l.id ?? name)}`,
          name,
          avatar: photo || emoji || initialsAvatar(name),
          source: "kids" as const,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Everyone in the Adult and Kids dashboards, newest names last. Order is stable
 * (adults first) so the suggestion list does not reshuffle between keystrokes.
 */
export async function loadDashboardContacts(): Promise<Contact[]> {
  const [adults, kids] = await Promise.all([readAdultContacts(), readKidsContacts()]);
  const seen = new Set<string>();
  return [...adults, ...kids].filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A learner who is already in a dashboard, found by exact name.
 *
 * This is what stops a room showing the same person twice. A learner who joins
 * from their own phone types their name into the guest box — that name is all the
 * host has — and if it matches a learner the tutor already keeps, the result must
 * land on *that* learner's record, not on a second row called "Sofia" next to
 * their own "Sofia Reyes". Matching is exact after normalisation (case, accents,
 * spacing and punctuation), and deliberately conservative: a near-miss creates a
 * guest, because inventing a match would file one learner's score under another's
 * name, which is worse than an extra row.
 */
export function matchContactByName(contacts: Contact[], name: string): Contact | null {
  const target = normalizeName(name);
  if (!target || target.length < 3) return null;
  const exact = contacts.filter((c) => normalizeName(c.name) === target);
  if (!exact.length) return null;
  // Prefer the Adult Dashboard when a name exists in both — the tutor's own
  // learner list is the one they are watching during a lesson.
  return exact.find((c) => c.source === "adult") ?? exact[0];
}

/** `"Ana Müller"` → `"anamuller"`; used only to decide whether two names mean one person. */
export function normalizeName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Rank matches the way a name field should: names that *start* with what was
 * typed come before names that merely contain it, and first names before
 * surnames, so "sa" offers "Sam" before "Aissa".
 */
export function searchContacts(contacts: Contact[], query: string, limit = 6): Contact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (c: Contact): number => {
    const name = c.name.toLowerCase();
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    const firstWord = name.split(/\s+/)[0];
    if (firstWord.startsWith(q)) return 2;
    if (name.includes(q)) return 3;
    return 99;
  };
  return contacts
    .map((c) => ({ c, s: score(c) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.c.name.localeCompare(b.c.name))
    .slice(0, limit)
    .map((x) => x.c);
}
