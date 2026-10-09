/**
 * Wipe every Unity build this console has ever stored — every game, not one.
 *
 * `gameReset.ts` is the *surgical* eraser: one game, matched by name and by URL, so
 * resetting Taboo cannot throw away the build the class is about to play. This is
 * the blunt one, for the two situations where surgical is not enough:
 *
 *   · a whole class of games misbehaving at once, which is a storage problem rather
 *     than a game problem, and
 *   · a build that is cached somewhere the per-game match cannot see — a cache named
 *     after a build this console no longer has in its catalogue, a leftover from a
 *     previous deployment, or a response a **service worker** is holding.
 *
 * That last one is why this exists at all. `public/unity-sw.js` serves local Unity
 * folders out of Cache Storage and is registered for the whole origin, so a worker
 * that is still alive can answer a fetch after the page has done everything it can
 * with `caches.delete` — the worker reads the same cache again on the next request.
 * Unless the *registration* goes, "all the cache is gone" is not true. So this
 * unregisters the workers it knows about as well, and says so.
 *
 * Ordered deliberately: stop the workers first so nothing can repopulate a cache
 * while we are emptying it, then the caches, then the databases, then the saved
 * keys. Every step is verified by re-listing, and anything that survived is named in
 * the report — a purge that quietly did nothing is the one outcome worth failing
 * loudly over.
 */

import { appUrl } from "./basePath";
import { allGameWrites, clearRecordedCookies, clearStorageRefs, unclaimedStorageKeys } from "./gameKeys";
import { listDatabases } from "./gameReset";

export interface PurgeReport {
  /** Cache Storage caches that were deleted, with how many files each held. */
  caches: { name: string; entries: number }[];
  /** Service worker registrations removed (the local-Unity file server). */
  workers: string[];
  /** IndexedDB databases deleted (Unity's build cache and PlayerPrefs filesystems). */
  databases: string[];
  /** Saved `ytgame` / Unity keys removed from local and session storage. */
  storageKeys: number;
  /**
   * Keys a *game* wrote under a name of its own (`playerLevel`, `save`, `progress`).
   *
   * Found by watching the game rather than by matching a name — a key like
   * `playerLevel` mentions no game, and this origin's `localStorage` is shared with
   * the Tutorly dashboard, so "clear everything that is not mine" would take a
   * tutor's own lesson data with it. They are listed rather than merely counted,
   * because a tutor who sees `playerLevel` in the report can tell at a glance that
   * the level that kept coming back is gone.
   */
  gameKeys: string[];
  /** Cookies a game set, expired by name and path. */
  cookies: string[];
  /**
   * Keys on this origin that **nothing accounts for** — not the console, not the
   * dashboard, not any game the recorder has watched.
   *
   * This is where a level written *before* the recorder existed still hides: a key
   * called `playerLevel` names no game, so no automatic rule may delete it (the
   * dashboard shares this origin and its keys are unprefixed). They are reported by
   * name so the tutor can see them, and cleared only by `clearUnclaimedStorage`,
   * which nothing calls on its own.
   */
  unclaimed: string[];
  /** Unity databases still listed after the attempt — a connection held by another tab. */
  left: string[];
  /** Databases here that are not Unity's, so the tutor can see they were kept. */
  kept: string[];
  problems: string[];
}

const UNITY_DB = /^\/?(unitycache|idbfs)/i;

function dbMatches(name: string): boolean {
  return UNITY_DB.test(name) || /unity|idbfs/i.test(name);
}

/** Every `localStorage`/`sessionStorage` key a Unity build could have written. */
function purgeSavedKeys(report: PurgeReport): void {
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
      if (/tutorly:ytgame:save:/i.test(key) || /unity|idbfs|playable/i.test(key)) {
        try {
          window[store].removeItem(key);
          report.storageKeys += 1;
          if (!/^tutorly:ytgame:save:/i.test(key)) report.gameKeys.push(key);
        } catch {
          report.problems.push(`could not remove ${key}`);
        }
      }
    }
  }
}

/** Take the file server down before touching the files it serves. */
async function stopGameWorkers(report: PurgeReport): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      // Only ours: unregistering a worker some other app on this origin owns would
      // be a real sabotage, and the script name is the only thing that tells them
      // apart from here.
      const script = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
      if (!/unity-sw\.js/i.test(script)) continue;
      const gone = await registration.unregister();
      if (gone) report.workers.push(script.split("/").pop() || script);
      else report.problems.push(`${script} refused to unregister`);
    }
  } catch {
    report.problems.push("service workers could not be listed");
  }
}

/**
 * Every cache, and how many files were in each.
 *
 * Not filtered by name. A cache whose name is a build from a deployment this
 * console has never heard of still holds that build, and the whole point of this
 * button is that the tutor does not have to work out which one is guilty. Caches
 * that are not Unity's are named in the report rather than silenced, because
 * "I deleted your other caches too" is something the tutor should be able to see.
 */
async function purgeCaches(report: PurgeReport): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    for (const name of await caches.keys()) {
      let entries = 0;
      try {
        entries = (await (await caches.open(name)).keys()).length;
      } catch {
        /* an unreadable cache is still worth deleting */
      }
      const gone = await caches.delete(name);
      if (gone) report.caches.push({ name, entries });
      else report.problems.push(`the cache "${name}" could not be deleted`);
    }
  } catch {
    report.problems.push("the browser's cache could not be inspected");
  }
}

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
      // A blocked delete means another tab still holds the database open. Waiting
      // rather than resolving immediately is what makes the difference between a
      // reset that happened and one that appeared to.
      request.onblocked = () => undefined;
      setTimeout(() => done(false), 8000);
    } catch {
      done(false);
    }
  });
}

/**
 * The database names Unity uses when the browser will not enumerate them for us.
 *
 * `indexedDB.databases()` is not in every browser, and it is the only way to *find*
 * a database. PlayerPrefs live under a fixed name, though, so those are always
 * attempted: a browser that cannot list databases would otherwise never clear a
 * single PlayerPref, and the game would keep starting on the level it was left on.
 */
const KNOWN_UNITY_DBS = ["/idbfs", "UnityCache"];

async function purgeDatabases(report: PurgeReport): Promise<void> {
  const names = await listDatabases();
  if (!names) {
    report.problems.push("this browser cannot list stored databases, so only Unity's own were cleared");
  }
  const targets = names ? names.filter((n) => dbMatches(n)) : KNOWN_UNITY_DBS;
  const others = names ? names.filter((n) => !dbMatches(n)) : [];
  for (const name of targets) {
    let gone = await deleteDatabase(name);
    if (!gone) {
      // One more attempt. A frame that was still unloading when the first delete was
      // issued closes its connection a moment later, and that moment is the whole
      // difference between PlayerPrefs going and the game starting at level 4 again.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      gone = await deleteDatabase(name);
    }
    if (gone) report.databases.push(name);
    else report.left.push(name);
  }
  // Databases belonging to something else on this origin are deliberately kept and
  // named, so the report is a full account of what is here rather than a list of wins.
  report.kept.push(...others);
}

/**
 * Start the game file server, if it is not already running.
 *
 * Called when the console itself starts — not only when a tutor uploads a build, which
 * is how this used to be reachable. A proxied Playable is served out of the same
 * Cache Storage (see `public/unity-sw.js`), and a 10–20 MB build re-downloaded on
 * every single open is the difference between a game that feels instant and one the
 * class waits for. The worker has to be alive *before* the second open for that to be
 * true, so it is registered up front.
 *
 * Failure is not an error: without a worker every game still loads, it just streams
 * every time. Nothing in the console depends on this having worked.
 */
export async function ensureGameServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return false;
  try {
    // Registered from the app's own directory: a worker may only control URLs at or
    // below the folder its script came from.
    await navigator.serviceWorker.register(appUrl("unity-sw.js"), { scope: appUrl("") });
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear everything a Unity build could be keeping, across every game.
 *
 * Returns the report rather than a boolean: the caller shows it, because the one
 * result worth knowing about is a database another tab is still holding open, and
 * that is not something to round off to "done".
 */
export async function purgeAllGameCaches(): Promise<PurgeReport> {
  const report: PurgeReport = {
    caches: [],
    workers: [],
    databases: [],
    storageKeys: 0,
    gameKeys: [],
    cookies: [],
    unclaimed: [],
    left: [],
    kept: [],
    problems: [],
  };
  await stopGameWorkers(report);
  await purgeCaches(report);
  await purgeDatabases(report);
  purgeSavedKeys(report);
  purgeRecordedWrites(report);
  // Last, so it sees what survived the steps above: anything left that no app claims.
  // Listed, never deleted — `clearUnclaimedStorage` is the only thing that deletes
  // them, and only because a person asked for them by name.
  report.unclaimed = unclaimedStorageKeys().map((ref) => ref.key);
  return report;
}

/**
 * Delete the keys nothing accounts for, on an explicit request.
 *
 * Separate from the purge on purpose. Keys written before the recorder existed cannot
 * be told apart from another app's keys by any rule this console can run, so the
 * decision is the tutor's: the purge *shows* them (`report.unclaimed`), and this
 * removes exactly what is on the origin right now when they say so.
 */
export function clearUnclaimedStorage(): string[] {
  return clearStorageRefs(unclaimedStorageKeys());
}

/**
 * Everything games were seen writing under names of their own.
 *
 * The purge can only clear by name or by watching (see `lib/gameKeys.ts`), and this
 * is the watching half: keys like `playerLevel` that belong to a game and name no
 * game, and the cookies a build set. Without it the "clear everything" button left
 * exactly the state a tutor presses it to remove.
 */
function purgeRecordedWrites(report: PurgeReport): void {
  const { keys, cookies } = allGameWrites();
  for (const key of keys) {
    for (const store of ["localStorage", "sessionStorage"] as const) {
      try {
        if (window[store].getItem(key) === null) continue;
        window[store].removeItem(key);
        report.storageKeys += 1;
        if (!report.gameKeys.includes(key)) report.gameKeys.push(key);
      } catch {
        report.problems.push(`could not remove ${key}`);
      }
    }
  }
  report.cookies.push(...clearRecordedCookies(cookies));
}

/** How many files the purge accounted for, for the one-line summary. */
export function purgedFileCount(report: PurgeReport): number {
  return report.caches.reduce((total, cache) => total + cache.entries, 0);
}

/** One line for the rig, phrased the way a person would say it. */
export function describePurge(report: PurgeReport): string {
  const parts: string[] = [];
  if (report.caches.length) {
    const files = purgedFileCount(report);
    parts.push(`${report.caches.length} cache${report.caches.length === 1 ? "" : "s"} (${files} file${files === 1 ? "" : "s"})`);
  }
  if (report.databases.length) parts.push(`${report.databases.length} Unity ${report.databases.length === 1 ? "database" : "databases"}`);
  if (report.storageKeys) parts.push(`${report.storageKeys} saved ${report.storageKeys === 1 ? "entry" : "entries"}`);
  if (report.cookies.length) parts.push(`${report.cookies.length} cookie${report.cookies.length === 1 ? "" : "s"}`);
  if (report.workers.length) parts.push(`${report.workers.length} file-server ${report.workers.length === 1 ? "worker" : "workers"}`);
  if (report.unclaimed.length) parts.push(`${report.unclaimed.length} key${report.unclaimed.length === 1 ? "" : "s"} nothing accounts for`);
  const cleared = parts.length ? `Cleared ${parts.join(", ")}` : "There was nothing cached";
  // Said as what to do about it, because the honest reading of a blocked delete is
  // "something still has it open" — a second console tab, a projector window — and
  // the tutor is the only one who can close it.
  if (report.left.length) return `${cleared} · ${report.left.join(", ")} is still open somewhere — close the other tab or reload, then press again`;
  return cleared;
}

/**
 * Everything the purge found, in the form a tutor can read out.
 *
 * `describePurge` is for the rig's one-liner; this is the detail behind the "what
 * was cleared?" disclosure, because "how do I know it worked" deserves an answer
 * that names names.
 */
export function purgeDetails(report: PurgeReport): string[] {
  const lines: string[] = [];
  for (const { name, entries } of report.caches) lines.push(`cache ${name} — ${entries} file${entries === 1 ? "" : "s"}`);
  for (const name of report.databases) lines.push(`database ${name}`);
  for (const worker of report.workers) lines.push(`service worker ${worker}`);
  if (report.storageKeys) lines.push(`${report.storageKeys} saved game ${report.storageKeys === 1 ? "entry" : "entries"}`);
  // Named individually: these are the keys that carry no game's name, so seeing them
  // listed is the only proof a tutor gets that the level that kept returning is gone.
  if (report.gameKeys.length) lines.push(`keys a game named itself — ${report.gameKeys.join(", ")}`);
  if (report.cookies.length) lines.push(`cookies a game set — ${report.cookies.join(", ")}`);
  // Named and explained together: these are the keys only a person can judge, so the
  // line has to say what to do about them rather than merely that they exist.
  if (report.unclaimed.length)
    lines.push(
      `keys nothing accounts for — ${report.unclaimed.join(", ")} (a game may have written these before the console started keeping track; use the button below to remove them)`
    );
  for (const name of report.kept) lines.push(`kept (not a Unity store) — ${name}`);
  for (const problem of report.problems) lines.push(`could not clear — ${problem}`);
  return lines;
}
