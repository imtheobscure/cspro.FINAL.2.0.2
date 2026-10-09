/**
 * Starting a game over, for real.
 *
 * A Unity Playable that has been played before does not always start from nothing.
 * Some of its state lives with the game itself — `PlayerPrefs` are kept in an
 * IndexedDB filesystem under `/idbfs` — some is kept by the `ytgame` SDK, which in
 * this console is our shim and stores its payload in `localStorage` under
 * `tutorly:ytgame:save:<gameKey>`, and a good deal is kept by **Unity's own cache
 * layer**: the loader stores build files in an IndexedDB database called
 * `UnityCache` and in Cache Storage caches named `UnityCache_<company>_<product>`.
 * That last one is invisible to an ordinary "clear site data" and it is the one
 * that matters most: a build file served out of it next to a freshly downloaded
 * file is exactly the mixed set that reports `RuntimeError: null function or
 * function signature mismatch`.
 *
 * ── What this cannot do ─────────────────────────────────────────────────────
 * JavaScript cannot clear the browser's HTTP cache, and no amount of storage
 * clearing evicts a response the browser decided to keep. That is why the console
 * does not rely on clearing: a reset also asks the proxy for a *freshly stamped*
 * build, so every build URL is one the browser has never seen and no cached copy —
 * in any layer — can be served. Clearing is for the game's state; stamping is for
 * the files.
 *
 * ── Two mistakes this is written to avoid ───────────────────────────────────
 *   · Deleting an IndexedDB database while the page holding it is still open makes
 *     the delete `blocked`, and it silently does nothing for as long as that page
 *     lives. The caller therefore tears the game frame down *before* calling this.
 *   · Claiming success. Every deletion here is verified by re-listing afterwards,
 *     and anything that survived is named in the report rather than glossed over.
 */

import { clearRecordedCookies, forgetGameWrites, gameNamesFor } from "./gameKeys";

export interface ResetReport {
  /** The `ytgame` save payload plus any other key carrying the game's own name. */
  storageKeys: string[];
  /**
   * Keys this game was seen writing under a name of its own (`playerLevel`, `save`).
   *
   * These are the ones no name-matching rule could ever find, so they are listed
   * separately: a tutor who reads `playerLevel` back in the report knows the level
   * that kept returning has actually gone.
   */
  gameKeys: string[];
  /** Cookies this game set, expired by name and path. */
  cookies: string[];
  /** Cached responses belonging to this game's build host, deleted by URL. */
  cachedFiles: number;
  /** Whole Cache Storage caches deleted because their *name* was this game's. */
  cachesDropped: string[];
  /** IndexedDB databases dropped outright (Unity's PlayerPrefs store). */
  databases: string[];
  /** Rows pruned out of Unity's shared `UnityCache` database. */
  unityCacheRows: number;
  /** Databases matching this game that were still there after the attempt. */
  databasesLeft: string[];
  /** Set when a store could not be cleared, so it is never claimed silently. */
  problems: string[];
}

/** The shim's key for this game, by the same rule the shim derives it. */
export function saveKeyFor(gameKey: string): string {
  return `tutorly:ytgame:save:${gameKey}`;
}

/**
 * The game key the shim derives from a frame *URL* — the same rule, in TypeScript.
 *
 * ── Why this has to exist at all ────────────────────────────────────────────
 * The shim (`public/ytgame-shim.js`) names the save from `location.pathname` inside the
 * frame. The console used to name it from `game.buildHost || game.id` instead, which
 * matches for a proxied Playable — `/play.php/<buildHost>/index.html`, and the console
 * knows `<buildHost>` — and matches for **nothing else**, because `PlayableStage` sets
 * `buildHost` to the literal strings `"local build"` and `"external host"` for a folder
 * the tutor uploaded and a URL they pasted. So for those two kinds of game the Save
 * editor wrote `tutorly:ytgame:save:external host` while the game read
 * `tutorly:ytgame:save:generic`: a correct write, to a key nothing had ever read. The
 * tutor pressed Write & reload and the game did not change. Both wrong strings are also
 * *shared* — every pasted URL in the console named the same key — so two different games
 * on that path would have inherited each other's save.
 *
 * ── The shape, and the one place it is mirrored ─────────────────────────────
 * `play.php/<buildHost>/…` and `…/local-unity/<gameId>/…` and `api/play/<buildHost>/…`
 * each put the game's own identifier in the segment after a known marker, found at *any*
 * depth because the console is served from a sub-path
 * (`/tutorly-games/adult/console/play.php/…`, so the marker is never `segs[0]`). Anything
 * else — a build pasted from a random host — falls back to a short hash of the pathname,
 * which is stable for that URL and different from every other URL.
 *
 * **`public/ytgame-shim.js` implements this identical rule in plain JS.** If you change
 * one, change the other; `.freebuff/console-check.ts` fails if they stop agreeing.
 */
export function gameKeyFromPath(pathname: string): string {
  const segments = String(pathname || "").split("/").filter(Boolean);
  const after = (marker: string): string => {
    const i = segments.indexOf(marker);
    return i >= 0 && segments[i + 1] ? segments[i + 1] : "";
  };

  const fromMarker = after("play.php") || after("local-unity") || (segments.indexOf("api") >= 0 ? segments[segments.indexOf("api") + 2] || "" : "") || after("unity");
  if (fromMarker) return fromMarker;

  // FNV-1a over the pathname: four hex-ish characters, no dependency, identical in the
  // shim. Collisions are possible in principle and harmless in practice — a collision
  // means two pasted URLs share a save slot, which is what the old rule did to *all* of
  // them.
  let hash = 0x811c9dc5;
  for (let i = 0; i < pathname.length; i += 1) {
    hash ^= pathname.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const tail = segments[segments.length - 2] || segments[segments.length - 1] || "game";
  return `${tail.replace(/[^a-z0-9_-]/gi, "")}-${hash.toString(36).slice(0, 6)}`;
}

/** The save key for a frame URL, and the game key it came from. */
export function saveKeyForFrameUrl(frameUrl: string): { gameKey: string; saveKey: string } {
  const pathname = (() => {
    try {
      return new URL(frameUrl, typeof location !== "undefined" ? location.href : "http://localhost/").pathname;
    } catch {
      return String(frameUrl || "").split("?")[0];
    }
  })();
  const gameKey = gameKeyFromPath(pathname);
  return { gameKey, saveKey: saveKeyFor(gameKey) };
}

function matches(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((n) => n && lower.includes(n.toLowerCase()));
}

/** IndexedDB keys can be strings, arrays, or records with a URL field. */
function searchableKey(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.url, record.request, record.key, record.path, record.name]
      .filter((part) => typeof part === "string")
      .join(" ");
  }
  return String(value ?? "");
}

/** Everything a hard reset counts as "this game". */
function needlesFor(gameKey: string, id: string, buildHost: string, productName: string): string[] {
  return [gameKey, id, buildHost, productName].filter(Boolean);
}

/**
 * This game's `ytgame` saves — under every name it has ever been loaded by.
 *
 * The shim names a save after the game's build host, and YouTube hands a republished
 * Playable a new build host, so one game accumulates one save per host it has been
 * opened on. `clearStorageKeys` can only clear the name the game is using *now*
 * (`saveKeyFor(gameKey)`), which left every earlier save behind — measurably: after a
 * hard reset of Build a Queen, `tutorly:ytgame:save:10649787444406743561` was still
 * there while the game had moved to `…:10542200469832840160`. A save under a name the
 * reset cannot derive is a level no button in the app can clear, which is the one
 * thing "start over" must never be true of.
 *
 * The names come from `rememberGameHost`, recorded each time the game is loaded — so
 * this covers the hosts this console has seen. A save left by a build host from before
 * that record existed is still unreachable here and is caught by the global CLEAR
 * CACHE, which clears every `tutorly:ytgame:save:` key there is.
 */
function clearSaveKeysFor(id: string, gameKey: string, report: ResetReport): void {
  const names = new Set([gameKey, ...gameNamesFor(id)]);
  for (const name of names) {
    const key = saveKeyFor(name);
    try {
      if (localStorage.getItem(key) === null) continue;
      localStorage.removeItem(key);
      report.storageKeys.push(`localStorage: ${key}`);
    } catch {
      report.problems.push(`could not remove ${key}`);
    }
  }
}

/**
 * `localStorage` and `sessionStorage` keys that belong to this game.
 *
 * The shim's own save key is matched exactly; anything else only when it carries
 * the game's id, build host or product name — a key belonging to another game is
 * never touched.
 */
function clearStorageKeys(needles: string[], gameKey: string, report: ResetReport): void {
  const exact = saveKeyFor(gameKey);
  for (const store of ["localStorage", "sessionStorage"] as const) {
    let keys: string[] = [];
    try {
      const s = window[store];
      keys = Array.from({ length: s.length }, (_, i) => s.key(i) || "");
    } catch {
      report.problems.push(`${store} is not readable in this browser`);
      continue;
    }
    for (const key of keys) {
      if (!key) continue;
      if (key === exact || matches(key, needles)) {
        try {
          window[store].removeItem(key);
          report.storageKeys.push(`${store}: ${key}`);
        } catch {
          report.problems.push(`could not remove ${key}`);
        }
      }
    }
  }
}

/**
 * Cached build files, cleared two ways.
 *
 * Unity names its Cache Storage caches after the game (`UnityCache_Polystation_Build
 * A Queen`), but the responses inside them are keyed by URL. Matching only the URL
 * misses a cache whose name is the game's and whose entries were stored under a
 * URL from an older deployment; matching only the name misses a shared cache that
 * happens to hold this build. So both are checked: entries by URL, whole caches by
 * name. A cache belonging to something else is left alone either way.
 */
/**
 * Files that are the *program*, not the game's state.
 *
 * A build the tutor uploaded from a folder (`/local-unity/<gameId>/…`, served out of
 * Cache Storage by `public/unity-sw.js`) is the one case where clearing cached files
 * destroys something that cannot be downloaded again. Resetting that game used to
 * delete its own `.wasm`/`.data`, and the next load answered "file not found in the
 * local Unity package" — a reset that broke the game instead of restarting it. Its
 * PlayerPrefs and saved keys are still cleared, because those are state; the build
 * files are left where they are.
 */
function isLocalBuildFile(url: string): boolean {
  return /\/local-unity\//i.test(url);
}

async function clearCachedFiles(needles: string[], report: ResetReport, preserveLocalBuild: boolean): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      let droppedHere = 0;
      for (const request of requests) {
        if (preserveLocalBuild && isLocalBuildFile(request.url)) continue;
        if (matches(request.url, needles)) {
          if (await cache.delete(request)) droppedHere += 1;
        }
      }
      report.cachedFiles += droppedHere;
      // The whole cache is this game's: drop it, so a leftover entry nobody
      // requested this time cannot come back later either. A local build is never
      // dropped wholesale — that cache is shared by every folder the tutor loaded.
      if (matches(name, needles) && !(preserveLocalBuild && /tutorly-local-unity/i.test(name))) {
        const gone = await caches.delete(name);
        if (gone) {
          report.cachesDropped.push(name);
          report.cachedFiles += requests.length - droppedHere;
        }
      }
    }
  } catch {
    report.problems.push("the browser's cache could not be inspected");
  }
}

/** One IndexedDB database, deleted without hanging on a connection someone still holds. */
function deleteDatabase(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => done(true);
      request.onerror = () => done(false);
      // A blocked delete is a notification, not a final result. The old code
      // resolved immediately here, remounted the game, and then the game reopened
      // the very database we had just claimed to clear. Keep waiting after the
      // frame has been navigated to about:blank; Chromium normally delivers
      // onsuccess as soon as the last Unity connection closes.
      request.onblocked = () => undefined;
      setTimeout(() => done(false), 10000);
    } catch {
      done(false);
    }
  });
}

/** Every IndexedDB database this browser will admit to having. */
export async function listDatabases(): Promise<string[] | null> {
  const anyIndexedDb = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> };
  if (typeof anyIndexedDb.databases !== "function") return null;
  try {
    return (await anyIndexedDb.databases()).map((db) => db.name || "").filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * Is this database part of starting the game over?
 *
 * `/idbfs` is Unity's `PlayerPrefs` filesystem and `UnityCache` is Unity's own
 * build cache — both are Unity's, and both are keyed by hand-built paths a game's
 * name does not appear in. Anything else has to name the game.
 */
function isResetTarget(name: string, needles: string[]): boolean {
  return /^\/?idbfs/i.test(name) || /^\/?unitycache/i.test(name) || matches(name, needles);
}

/** Unity's own database names, for browsers that will not enumerate what is stored. */
const KNOWN_UNITY_DBS = ["/idbfs"];

/**
 * Keys and cookies this game wrote under names of its own.
 *
 * Found by watching the game, not by matching its name — see `lib/gameKeys.ts` for
 * why a name rule can never find `playerLevel`, and why "delete everything that is
 * not ours" is not available on an origin shared with the Tutorly dashboard. A game
 * played before the recorder existed has no record; everything above still applies
 * to it.
 */
function clearRecordedWrites(gameKey: string, report: ResetReport): void {
  const { keys, cookies } = forgetGameWrites(gameKey);
  for (const key of keys) {
    for (const store of ["localStorage", "sessionStorage"] as const) {
      try {
        if (window[store].getItem(key) === null) continue;
        window[store].removeItem(key);
        if (!report.gameKeys.includes(key)) report.gameKeys.push(key);
      } catch {
        report.problems.push(`could not remove ${key}`);
      }
    }
  }
  report.cookies.push(...clearRecordedCookies(cookies));
}

/**
 * Unity's shared build cache, pruned instead of dropped.
 *
 * `UnityCache` is one database for every Unity game on this origin, so deleting it
 * would throw away other games' cached builds as a side effect of resetting this
 * one. Its object stores are keyed by the URL of each cached file, which means the
 * rows belonging to this game can be deleted precisely — and the cache name
 * `UnityCache_<company>_<product>` is handled as a whole by the Cache Storage pass
 * above.
 */
async function pruneUnityCache(needles: string[], report: ResetReport): Promise<void> {
  const names = await listDatabases();
  if (!names || !names.some((n) => /^\/?unitycache$/i.test(n))) return;
  await new Promise<void>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open("UnityCache");
    } catch {
      report.problems.push("Unity's build cache could not be opened");
      return resolve();
    }
    request.onerror = () => {
      report.problems.push("Unity's build cache is locked by another page");
      resolve();
    };
    request.onsuccess = () => {
      const db = request.result;
      const stores = Array.from(db.objectStoreNames);
      if (!stores.length) {
        db.close();
        return resolve();
      }
      let pending = stores.length;
      const finish = () => {
        if (--pending <= 0) {
          db.close();
          resolve();
        }
      };
      for (const storeName of stores) {
        try {
          const tx = db.transaction(storeName, "readwrite");
          const store = tx.objectStore(storeName);
          const keys = store.getAllKeys();
          keys.onsuccess = () => {
            for (const key of keys.result as IDBValidKey[]) {
              if (!matches(searchableKey(key), needles)) continue;
              try {
                store.delete(key);
                report.unityCacheRows += 1;
              } catch {
                /* one stubborn row is not worth failing the reset over */
              }
            }
          };
          keys.onerror = () => finish();
          tx.oncomplete = () => finish();
          tx.onerror = () => finish();
          tx.onabort = () => finish();
        } catch {
          finish();
        }
      }
      setTimeout(() => {
        try {
          db.close();
        } catch {
          /* already closed */
        }
        resolve();
      }, 3000);
    };
  });
}

/**
 * Unity's `PlayerPrefs` filesystem, Unity's build cache, and any database named
 * after the game.
 *
 * Every deletion is verified: whatever is still listed afterwards is named in the
 * report, because a reset that quietly did nothing is worse than one that says so.
 */
async function clearDatabases(needles: string[], report: ResetReport): Promise<void> {
  const names = await listDatabases();
  if (!names) {
    report.problems.push("this browser cannot list stored databases, so only Unity's own were cleared");
  }
  // Unity's databases have names we know. Attempting them by name matters where
  // `indexedDB.databases()` is missing (it arrived late in Firefox): without this,
  // such a browser cleared nothing at all and the game came back at the same level.
  const candidates = names ?? KNOWN_UNITY_DBS;
  for (const name of candidates) {
    if (name === "UnityCache" || !isResetTarget(name, needles)) continue;
    let gone = await deleteDatabase(name);
    if (!gone) {
      // One more attempt: a frame that was still unloading when the first delete was
      // issued lets go a moment later, and that moment is the whole difference.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      gone = await deleteDatabase(name);
    }
    if (gone) report.databases.push(name);
    else report.databasesLeft.push(name);
  }
  report.databasesLeft = report.databasesLeft.filter((n) => !!n);
}

/**
 * Read the game's own `productName` out of the framed page, which is what Unity
 * names its PlayerPrefs database and its Cache Storage cache after. Best effort: a
 * name we cannot read simply means the name cannot be used as a match. Must be
 * called *before* the frame is torn down.
 */
export function productNameFrom(frame: HTMLIFrameElement | null): string {
  try {
    const html = frame?.contentDocument?.documentElement?.innerHTML || "";
    const match = html.match(/productName\s*:\s*["']([^"']{2,60})["']/i);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

/**
 * Clear this game's saves, caches and PlayerPrefs, and say what was cleared.
 *
 * `crossOrigin` is for the case where the game ran on a proxy at another address:
 * its `localStorage`, Cache Storage and IndexedDB belong to *that* origin, and a
 * page may not touch another origin's storage. The report says so plainly instead
 * of implying a clean slate.
 */
export async function hardResetGame(opts: {
  gameKey: string;
  id: string;
  buildHost?: string;
  productName?: string;
  crossOrigin?: boolean;
  /**
   * True for a build the tutor uploaded from a folder. Its files are the program —
   * they cannot be re-downloaded — so the reset clears its *state* and leaves them.
   */
  preserveLocalBuild?: boolean;
}): Promise<ResetReport> {
  const needles = needlesFor(opts.gameKey, opts.id, opts.buildHost || "", opts.productName || "");
  const report: ResetReport = {
    storageKeys: [],
    gameKeys: [],
    cookies: [],
    cachedFiles: 0,
    cachesDropped: [],
    databases: [],
    unityCacheRows: 0,
    databasesLeft: [],
    problems: [],
  };
  if (opts.crossOrigin) {
    report.problems.push("the game ran on another origin, so only its files could be cleared from here");
  }
  if (opts.preserveLocalBuild) {
    report.problems.push("its own build files were kept: they are the game, not its state");
  }
  clearStorageKeys(needles, opts.gameKey, report);
  clearSaveKeysFor(opts.id, opts.gameKey, report);
  clearRecordedWrites(opts.gameKey, report);
  await clearCachedFiles(needles, report, !!opts.preserveLocalBuild);
  await pruneUnityCache(needles, report);
  await clearDatabases(needles, report);
  return report;
}

/**
 * One line for the rig, phrased the way a person would say it.
 *
 * Order matters. A store that was still open comes first, ahead of every "nothing
 * was stored" phrasing: a blocked delete is the one result that must never read as
 * a clean slate, because that is exactly how the first version of this button lied
 * — it did nothing, said nothing, and looked like it had worked.
 */
export function describeReset(report: ResetReport): string {
  const parts: string[] = [];
  if (report.storageKeys.length) parts.push(`${report.storageKeys.length} saved ${report.storageKeys.length === 1 ? "entry" : "entries"}`);
  if (report.gameKeys.length)
    parts.push(`${report.gameKeys.length} key${report.gameKeys.length === 1 ? "" : "s"} the game named itself (${report.gameKeys.join(", ")})`);
  if (report.cookies.length) parts.push(`${report.cookies.length} cookie${report.cookies.length === 1 ? "" : "s"}`);
  if (report.databases.length) parts.push(`Unity PlayerPrefs (${report.databases.join(", ")})`);
  if (report.unityCacheRows) parts.push(`${report.unityCacheRows} cached ${report.unityCacheRows === 1 ? "build file" : "build files"}`);
  if (report.cachedFiles) parts.push(`${report.cachedFiles} more cached ${report.cachedFiles === 1 ? "file" : "files"}`);

  const cleared = parts.length ? `Cleared ${parts.join(", ")}` : "Nothing was stored for this game";
  if (report.databasesLeft.length) {
    return `${cleared} · ${report.databasesLeft.join(", ")} is still open in this page — tap again`;
  }
  if (report.problems.length) {
    return parts.length ? `${cleared} · ${report.problems[0]}` : `${cleared} — ${report.problems[0]}`;
  }
  return parts.length
    ? `${cleared} — starting a fresh copy`
    : "Nothing was stored for this game yet — starting fresh, with a build the browser has never seen";
}

/** Reported separately, because a blocked delete is a real answer and not a success. */
export function resetWasComplete(report: ResetReport): boolean {
  return report.databasesLeft.length === 0;
}
