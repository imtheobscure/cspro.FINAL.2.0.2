/**
 * What a game wrote under a name of its own — and how it gets cleared again.
 *
 * ── The problem this exists for ─────────────────────────────────────────────
 * A build that keeps its progress as `playerLevel`, `save` or `progress` says
 * nothing about which game it belongs to. The console's old rule was to clear
 * storage keys that *mention* the game (its id, build host, product name), which
 * cannot find a key that mentions nothing — so "Hard reset" and "CLEAR CACHE"
 * both cleared everything they could name and left the level sitting right there.
 * A Unity Playable keeps `PlayerPrefs` in IndexedDB instead, which is why the same
 * bug looked like it only affected some games.
 *
 * ── Why not clear every unrecognised key ────────────────────────────────────
 * Because on this origin the console shares `localStorage` with the Tutorly
 * dashboard, and the dashboard's keys are *not* prefixed (`dl_theme`,
 * `classroom-weather-city`, the disk-storage mirror). "Delete anything that is not
 * mine" would clear a tutor's own lessons to reset a game. Clearing by exclusion is
 * not available here.
 *
 * ── What this does instead ──────────────────────────────────────────────────
 * It watches. The frame runs on the same origin, so the parent can wrap that
 * frame's own `localStorage.setItem`, `sessionStorage.setItem` and cookie setter —
 * inside the frame's realm, where the game's calls actually land — and write down
 * what the game names. A reset then clears exactly those keys, plus everything the
 * console already knew how to name. Nothing outside a game's own writes is touched.
 *
 * The record is kept in `localStorage` (a game can write a lot, but a list of key
 * names is tiny) under one key of ours, so it survives the reset it is used for and
 * can be cleared afterwards.
 */

/**
 * The name a game is known by in storage.
 *
 * One definition, used by the recorder (which files writes under it), the reset
 * (which clears them) and the shim's own save key (`tutorly:ytgame:save:<key>`),
 * which derives the same value from the frame's URL. A build host when the game is
 * proxied, the game's own id otherwise — the two cases where they could disagree
 * are the ones worth never having.
 */
export function storageKeyFor(game: { id: string; buildHost?: string }): string {
  return game.buildHost || game.id;
}

/** Our own record of game-written keys: `{ [gameKey]: string[] }`. */
const REGISTRY_KEY = "tutorly:console:game-keys:v1";
/** Cookie names a game set, as `{ [gameKey]: { name, path }[] }`. */
const COOKIE_KEY = "tutorly:console:game-cookies:v1";
/** Every name a game has been loaded under, as `{ [gameId]: string[] }`. */
const HOST_KEY = "tutorly:console:game-hosts:v1";

export interface RecordedCookie {
  name: string;
  path: string;
}

type KeyRegistry = Record<string, string[]>;
type CookieRegistry = Record<string, RecordedCookie[]>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the record is best-effort, the reset still runs */
  }
}

/**
 * Keys are recorded only when they are the game's own.
 *
 * `tutorly:` is the console's namespace and the shim's save key lives under it, so
 * recording those would make the registry list the console's own storage as if a
 * game had written it.
 */
function isRecordableKey(key: string): boolean {
  return typeof key === "string" && key.length > 0 && key.length < 200 && !/^tutorly/i.test(key);
}

/** Note that `gameKey` wrote `key`. Called from inside the game's own frame. */
export function rememberGameKey(gameKey: string, key: string): void {
  if (!gameKey || !isRecordableKey(key)) return;
  const registry = readJson<KeyRegistry>(REGISTRY_KEY, {});
  const list = registry[gameKey] || [];
  if (list.includes(key)) return;
  registry[gameKey] = [...list, key].slice(-60);
  writeJson(REGISTRY_KEY, registry);
}

/** Note a cookie a game set, so it can be expired by name and path later. */
export function rememberGameCookie(gameKey: string, name: string, path: string): void {
  if (!gameKey || !name) return;
  const registry = readJson<CookieRegistry>(COOKIE_KEY, {});
  const list = registry[gameKey] || [];
  if (list.some((c) => c.name === name && c.path === path)) return;
  registry[gameKey] = [...list, { name, path: path || "/" }].slice(-40);
  writeJson(COOKIE_KEY, registry);
}

/** Keys this game was seen writing, without forgetting them. */
export function keysWrittenBy(gameKey: string): string[] {
  return readJson<KeyRegistry>(REGISTRY_KEY, {})[gameKey] || [];
}

/**
 * Every name this game has been loaded under, newest last.
 *
 * ── Why a game has more than one name ───────────────────────────────────────
 * A proxied Playable is named by its build host, and YouTube gives a republished
 * game a **new** build host. So the same game played last month carries its progress
 * under `tutorly:ytgame:save:1054220…` and today under `tutorly:ytgame:save:9983…`.
 * Found the hard way: Build a Queen's save sat at the host the *old* catalogue entry
 * pointed at, and a hard reset — which clears the name the game is using now — left
 * it there. Since the reset could not name it and the recorder cannot record it (it
 * lives under the console's own `tutorly:` prefix), that save was unreachable by
 * every button in the app.
 *
 * ── What this is not ────────────────────────────────────────────────────────
 * Not a rename and not a migration: the game keeps whatever name it derives from its
 * own URL, so a build that is republished still starts from an empty save until the
 * tutor says otherwise. This only gives the reset a list of names to clear, so
 * "start over" means the same thing for a game that has been republished as for one
 * that has not.
 */
export function rememberGameHost(gameId: string, gameKey: string): void {
  if (!gameId || !gameKey || gameId === gameKey) return;
  const registry = readJson<Record<string, string[]>>(HOST_KEY, {});
  const list = registry[gameId] || [];
  if (list.includes(gameKey)) return;
  registry[gameId] = [...list, gameKey].slice(-8);
  writeJson(HOST_KEY, registry);
}

/**
 * Every name this game is known by: the game's own id, plus every build host it has
 * been loaded from. Used by the reset, and by nothing else.
 */
export function gameNamesFor(gameId: string): string[] {
  const recorded = readJson<Record<string, string[]>>(HOST_KEY, {})[gameId] || [];
  return gameId ? [gameId, ...recorded] : recorded;
}

/** Keys and cookies this game was seen writing, and forget them. */
export function forgetGameWrites(gameKey: string): { keys: string[]; cookies: RecordedCookie[] } {
  const keys = readJson<KeyRegistry>(REGISTRY_KEY, {});
  const cookies = readJson<CookieRegistry>(COOKIE_KEY, {});
  const out = { keys: keys[gameKey] || [], cookies: cookies[gameKey] || [] };
  if (keys[gameKey]) {
    delete keys[gameKey];
    writeJson(REGISTRY_KEY, keys);
  }
  if (cookies[gameKey]) {
    delete cookies[gameKey];
    writeJson(COOKIE_KEY, cookies);
  }
  return out;
}

/** Every game's recorded writes — what `CLEAR CACHE` deletes, and forgets. */
export function allGameWrites(): { keys: string[]; cookies: RecordedCookie[] } {
  const keys = Object.values(readJson<KeyRegistry>(REGISTRY_KEY, {})).flat();
  const cookies = Object.values(readJson<CookieRegistry>(COOKIE_KEY, {})).flat();
  forgetAllGameWrites();
  return { keys, cookies };
}

/** Drop the record itself, once its contents have been cleared. */
export function forgetAllGameWrites(): void {
  try {
    localStorage.removeItem(REGISTRY_KEY);
    localStorage.removeItem(COOKIE_KEY);
  } catch {
    /* nothing to do */
  }
}

/**
 * Watch a running game's own storage writes.
 *
 * The wrapper is installed in the *frame's* realm, because that is where the
 * game's calls land: patching the parent's `Storage.prototype` would see nothing.
 * A function object carries its defining scope with it, so the recorder installed
 * here still writes to the parent's registry.
 *
 * Writes are recorded regardless of whether they succeed — a game that is refused
 * by a full disk still tried to save, and the key it tried is the key to clear.
 * Installation is idempotent and silent on failure: a cross-origin frame (a
 * direct-embed game) cannot be patched at all, and that is fine — the reset falls
 * back to clearing by name for those.
 */
export function installGameStorageRecorder(frame: HTMLIFrameElement | null, gameKey: string): void {
  if (!frame || !gameKey) return;
  try {
    const win = frame.contentWindow as (Window & typeof globalThis & { __tutorlyRecording?: boolean }) | null;
    if (!win || win.__tutorlyRecording) return;
    Object.defineProperty(win, "__tutorlyRecording", { value: true, configurable: true });

    for (const storeName of ["localStorage", "sessionStorage"] as const) {
      try {
        const store = win[storeName];
        if (!store) continue;
        const proto = Object.getPrototypeOf(store) as Storage;
        const original = proto.setItem;
        if (typeof original !== "function") continue;
        proto.setItem = function (this: Storage, key: string, value: string) {
          try {
            rememberGameKey(gameKey, String(key));
          } catch {
            /* the record is a courtesy; the game's write goes ahead regardless */
          }
          return original.call(this, key, value);
        };
      } catch {
        /* this store is not patchable; the others still are */
      }
    }

    try {
      const Doc = (win as unknown as { Document?: typeof Document }).Document;
      const descriptor = Doc && Object.getOwnPropertyDescriptor(Doc.prototype, "cookie");
      if (descriptor && descriptor.get && descriptor.set) {
        const { get, set } = descriptor;
        Object.defineProperty(Doc.prototype, "cookie", {
          configurable: true,
          get,
          set(this: Document, value: string) {
            try {
              const text = String(value);
              const name = text.split("=")[0]?.trim();
              const pathMatch = /;\s*path=([^;]*)/i.exec(text);
              if (name) rememberGameCookie(gameKey, name, pathMatch ? pathMatch[1].trim() : "/");
            } catch {
              /* recording is best-effort */
            }
            return set.call(this, value);
          },
        });
      }
    } catch {
      /* no cookie access in this frame */
    }
  } catch {
    /* a cross-origin frame: nothing to watch */
  }
}

/** Expire the cookies a game set. Best effort — a wrong path simply leaves it. */
export function clearRecordedCookies(cookies: RecordedCookie[]): string[] {
  const cleared: string[] = [];
  for (const { name, path } of cookies) {
    try {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path || "/"}`;
      if (!document.cookie.includes(`${name}=`)) cleared.push(name);
    } catch {
      /* one stubborn cookie is not worth failing the reset over */
    }
  }
  return cleared;
}

/** One key in one of the two string stores, said exactly enough to delete it. */
export interface StorageKeyRef {
  store: "localStorage" | "sessionStorage";
  key: string;
}

/**
 * Keys that belong to something else on this origin, so they are never even offered.
 *
 * The console is served from the Tutorly site's own origin, and that site's keys are
 * not prefixed (`dl_theme`, `classroom-weather-city`, `tutor-crafter-content`). Every
 * family the dashboard is known to use is listed here: leaving a stray coin in an
 * unexpected `classroom-…` key costs nothing, and deleting a tutor's lessons to reset
 * a game costs everything. Key names the dashboard adds later simply stop being
 * offered — a missed clean, never a broken dashboard.
 */
const CLAIMED_BY_ANOTHER_APP =
  /^(tutorly|app-storage|dl_|classroom|tutor-crafter|learner|kids_|combat_|psa[.\-]|preply|tutorly-advisor|__|next|chakra|amplitude|gtag|_ga|_gid|firebase|supabase|vercel|optimizely|clarity)/i;

/** Every key any game has been seen writing, across all games. */
export function allRecordedKeys(): string[] {
  return Object.values(readJson<KeyRegistry>(REGISTRY_KEY, {})).flat();
}

/**
 * Keys on this origin that no app accounts for.
 *
 * ── Why this exists when the recorder already exists ─────────────────────────
 * The recorder only knows what it watched. A key like `playerLevel` written *before*
 * the recorder was installed — a game played last month, on an older build of this
 * console — is not in the registry, names no game, and therefore survived both
 * "Hard reset" and "CLEAR CACHE". It is the last place a level can hide.
 *
 * ── Why they are listed rather than deleted ─────────────────────────────────
 * Being unfamiliar is not evidence of being a game's. This reports them so the tutor
 * can see `playerLevel` sitting there by name and decide; deleting them happens only
 * in `clearStorageRefs`, on an explicit request. Anything another app is known to
 * claim — and anything of the console's own under `tutorly` — is not even listed.
 */
export function unclaimedStorageKeys(): StorageKeyRef[] {
  const recorded = new Set(allRecordedKeys());
  const out: StorageKeyRef[] = [];
  for (const store of ["localStorage", "sessionStorage"] as const) {
    let length = 0;
    try {
      length = window[store].length;
    } catch {
      continue;
    }
    for (let i = 0; i < length; i++) {
      let key = "";
      try {
        key = window[store].key(i) || "";
      } catch {
        continue;
      }
      // `isRecordableKey` is the same rule the recorder uses to tell a game's key from
      // the console's own: no `tutorly:…`, nothing empty, nothing absurdly long.
      if (!isRecordableKey(key)) continue;
      if (recorded.has(key)) continue;
      if (CLAIMED_BY_ANOTHER_APP.test(key)) continue;
      out.push({ store, key });
    }
  }
  return out;
}

/** Delete exactly the keys that were offered, and say which ones went. */
export function clearStorageRefs(refs: StorageKeyRef[]): string[] {
  const cleared: string[] = [];
  for (const { store, key } of refs) {
    try {
      if (window[store].getItem(key) === null) continue;
      window[store].removeItem(key);
      cleared.push(key);
    } catch {
      /* one stubborn key is not worth failing a reset over */
    }
  }
  return cleared;
}
