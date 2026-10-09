import * as idb from 'idb-keyval';
import LZString from 'lz-string';
import type { StateStorage } from 'zustand/middleware';

const memoryStorage: Record<string, string> = {};

function safeGetLocalStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {}
  return memoryStorage[key] || null;
}

function safeSetLocalStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {}
  memoryStorage[key] = value;
}

function safeRemoveLocalStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}
  delete memoryStorage[key];
}

/**
 * Robust IndexedDB-backed StateStorage adapter for Zustand persist middleware.
 * Bypasses the 5MB browser LocalStorage limit (providing 500MB+ safe storage).
 * Includes seamless backward compatibility and migration from LocalStorage.
 */
export const idbZustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      // 1. Check IndexedDB first
      const idbVal = await idb.get(name);
      if (idbVal !== undefined && idbVal !== null) {
        return typeof idbVal === 'string' ? idbVal : JSON.stringify(idbVal);
      }

      // 2. Migration fallback: check LocalStorage if not yet in IDB
      const localVal = safeGetLocalStorage(name);
      if (localVal) {
        try {
          let jsonString = localVal;
          const trimmed = localVal.trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            const decompressed = LZString.decompressFromUTF16(localVal);
            if (decompressed) {
              jsonString = decompressed;
            }
          }
          // Persist migrated value to IndexedDB
          try {
            await idb.set(name, jsonString);
          } catch (e) {}
          // Free LocalStorage quota immediately
          safeRemoveLocalStorage(name);
          return jsonString;
        } catch (e) {
          return localVal;
        }
      }
      return null;
    } catch (err) {
      return safeGetLocalStorage(name);
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // Always store directly into IndexedDB (virtually unlimited quota)
      await idb.set(name, value);
      // Clean up from LocalStorage to prevent duplicate consumption of 5MB quota
      safeRemoveLocalStorage(name);
    } catch (err) {
      // Fallback in-memory or compressed LocalStorage attempt
      try {
        const compressed = LZString.compressToUTF16(value);
        safeSetLocalStorage(name, compressed);
      } catch (lsErr) {
        memoryStorage[name] = value;
      }
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await idb.del(name);
    } catch (err) {}
    safeRemoveLocalStorage(name);
  },
};

/**
 * Startup cleanup function to purge old uncompressed snapshots and oversized temp keys
 * from localStorage, immediately returning 3-5MB of headroom to the browser.
 */
export const cleanupLegacyLocalStorageQuota = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const legacyKeysToRemove = [
    'tutorly_auto_backup_data', // Now saved securely in IndexedDB
    'tutor_dashboard_temp_search',
    'dashboard_tour_step_resume',
    'tutorly_ui_filter_cache',
  ];

  legacyKeysToRemove.forEach((key) => {
    try {
      if (window.localStorage.getItem(key)) {
        window.localStorage.removeItem(key);
        console.log(`[Storage Cleanup] Purged legacy key "${key}" from LocalStorage.`);
      }
    } catch (e) {}
  });

  /*
   * Migrate the learner database out of localStorage — but READ IT BACK before
   * deleting the original.
   *
   * This block used to be the single most dangerous line in the app's storage
   * path. It removed `learner-profile-storage` from localStorage the moment
   * `idb.set` resolved, so the entire learner database went through a one-shot
   * point of no return at every startup: if the IndexedDB write silently did
   * nothing, if the browser evicted IndexedDB under storage pressure, or if the
   * user was in a private window where IndexedDB is capped, the only surviving
   * copy had just been deleted — and the dashboard came up empty with nothing
   * left to restore from.
   *
   * Now the write is verified by reading it straight back, and the localStorage
   * original is kept whenever that verification does not come out clean. The
   * cost is one read, on the one startup that follows the migration; the payoff
   * is that a second copy survives any single storage failure.
   */
  try {
    const rawLearners = window.localStorage.getItem('learner-profile-storage');
    if (rawLearners) {
      let jsonString = rawLearners;
      const trimmed = rawLearners.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        const decompressed = LZString.decompressFromUTF16(rawLearners);
        if (decompressed) jsonString = decompressed;
      }
      idb.set('learner-profile-storage', jsonString)
        .then(() => idb.get('learner-profile-storage'))
        .then((writtenBack) => {
          if (typeof writtenBack !== 'string' || writtenBack.length === 0) {
            console.warn('[Storage Cleanup] IndexedDB copy could not be verified — keeping the LocalStorage original as a safety copy.');
            return;
          }
          try {
            window.localStorage.removeItem('learner-profile-storage');
            console.log(`[Storage Cleanup] Verified ${writtenBack.length} chars in IndexedDB; LocalStorage copy removed.`);
          } catch (e) {}
        })
        .catch(() => {
          /* IndexedDB unavailable — leave the LocalStorage copy untouched. */
        });
    }
  } catch (e) {}
};

/** What the browser said when we asked it to keep this origin's data. */
export interface PersistenceStatus {
  /** Whether the browser exposes the Storage Persistence API at all. */
  supported: boolean;
  /** True once storage is exempt from automatic eviction. */
  persisted: boolean;
  /** Bytes this origin currently uses, when the browser reports it. */
  usage: number | null;
  /** Bytes this origin is allowed, when the browser reports it. */
  quota: number | null;
}

let persistenceStatus: PersistenceStatus = { supported: false, persisted: false, usage: null, quota: null };
let persistencePromise: Promise<PersistenceStatus> | null = null;

/** The result of the last storage-persistence check (safe to read in render). */
export function getPersistenceStatus(): PersistenceStatus {
  return persistenceStatus;
}

/**
 * Automatically asks the browser to mark this origin's storage as persistent.
 *
 * This is the one setting that actually stops the cache being cleared “suddenly”
 * on its own. Browsers treat IndexedDB and localStorage as *best-effort* by
 * default: under storage pressure (or after a long gap, or through a “clear
 * browsing data” sweep that keeps site data) the whole origin's storage can be
 * evicted in one go. That is exactly the state a tutor comes back to as an empty
 * Adult Dashboard with nothing left to restore from.
 *
 * Granting persistence takes the origin off that eviction list. It is requested
 * automatically at startup — no switch for the tutor to find and turn on — and it
 * is safe to call repeatedly: `persisted()` is checked first so a browser that has
 * already granted it is never asked twice. Browsers that grant it silently do so
 * based on engagement heuristics; Firefox may instead show its own one-time
 * permission prompt. Nothing is ever deleted by calling this, and a browser that
 * refuses simply leaves storage best-effort (the backup folder and the local
 * rescue copy remain the second line of defence).
 */
export function ensurePersistentStorage(): Promise<PersistenceStatus> {
  if (persistencePromise) return persistencePromise;
  persistencePromise = (async () => {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
      persistenceStatus = { supported: false, persisted: false, usage: null, quota: null };
      return persistenceStatus;
    }
    try {
      let persisted = false;
      try {
        persisted = await navigator.storage.persisted();
      } catch (e) {}
      if (!persisted) {
        persisted = await navigator.storage.persist();
      }

      let usage: number | null = null;
      let quota: number | null = null;
      try {
        const estimate = await navigator.storage.estimate();
        usage = typeof estimate.usage === 'number' ? estimate.usage : null;
        quota = typeof estimate.quota === 'number' ? estimate.quota : null;
      } catch (e) {}

      persistenceStatus = { supported: true, persisted, usage, quota };
      if (persisted) {
        console.log(
          '[Storage Guard] Persistent storage granted — the browser will not evict this app’s database or settings under storage pressure.'
        );
      } else {
        console.warn(
          '[Storage Guard] The browser kept this origin on best-effort storage; it may clear it when the device runs low on space. ' +
            'Connect a backup folder in Settings ▸ Back-up Suite so a second copy always exists.'
        );
      }
    } catch (err) {
      console.warn('[Storage Guard] Could not request persistent storage:', err);
    }
    return persistenceStatus;
  })();
  return persistencePromise;
}
