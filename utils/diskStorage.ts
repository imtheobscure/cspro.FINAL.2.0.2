import { get, set, del } from 'idb-keyval';
import LZString from 'lz-string';
import { exportAllCustomAvatars, saveCustomAvatar } from '../services/customAvatarStore';

const HANDLE_KEY = 'tutor-crafter-disk-directory-handle';
const DISK_MODE_KEY = 'tutor-crafter-disk-mode-enabled';
const BACKUP_MANIFEST = 'tutorly_backup_manifest.json';
/**
 * The last-resort safety copy of the core workspace, kept in IndexedDB.
 *
 * Zero-Memory Mode deliberately erases browser memory and trusts the connected
 * folder — which is exactly how a whole library disappears when the folder is
 * unavailable (USB unplugged, permission lapsed, different origin). This key is
 * NEVER written to the folder and NEVER cleared by a purge, so there is always a
 * local copy to fall back on. It holds the core business data only (profiles,
 * sessions/feedback, schedules, bookings, settings) — never generated lesson HTML,
 * which belongs on the hard disk.
 */
const SAFETY_SNAPSHOT_KEY = 'tutorly_safety_snapshot_v1';
// Version 3 backs up lesson content per learner (adult_dashboard/lesson_content/)
// so a single edit never rewrites the whole library.
const BACKUP_VERSION = 3;
const KIDS_STORAGE_KEY = 'kids_learning_kingdom_v2';
const KIDS_IDB_KEY = 'kids_learning_kingdom_v2';
const COMBAT_KEY = 'combat_arena_storybook_v1';
const COMBAT_IDB_KEY = 'combat_arena_storybook_v1';

/**
 * ── Change detection ────────────────────────────────────────────────────────
 * Every backup used to rewrite the whole library (all learner folders, all
 * avatars, both content maps) on each edit, which is slow and throws away disk
 * writes for data that did not change. Instead every payload gets a cheap
 * fingerprint: unchanged files/folders are skipped and only the affected
 * learner folders are written.
 *
 * Fingerprints are cached in memory for the session and persisted in the backup
 * manifest, so a page reload still knows what is already on disk.
 */
const fileHashCache = new Map<string, string>();

/** FNV-1a style fingerprint — fast on large JSON strings, collision-safe enough here. */
function cheapHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b1;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ c, 0x85ebca6b) + i) >>> 0;
  }
  return `${h1.toString(36)}${h2.toString(36)}${text.length.toString(36)}`;
}

type WriteMode = 'full' | 'incremental';
type WriteOutcome = 'written' | 'skipped' | 'failed';

export interface DiskSyncSummary {
  at: number;
  full: boolean;
  written: number;
  skipped: number;
  learnersUpdated: number;
  learnersUpToDate: number;
  /**
   * The pass was REFUSED on purpose: the folder holds more learners than this
   * browser, so writing would have replaced a real backup with empty state.
   * The UI shows a specific "restore first" message instead of a generic failure.
   */
  blocked?: boolean;
}

let lastSyncSummary: DiskSyncSummary | null = null;

/** What the most recent backup actually touched (used by the reminder card). */
export function getLastSyncSummary(): DiskSyncSummary | null {
  return lastSyncSummary;
}

async function seedHashCache(directoryHandle: any, force = false): Promise<void> {
  if (force) fileHashCache.clear();
  if (fileHashCache.size > 0) return;
  const manifest = await readJsonFromDisk(directoryHandle, BACKUP_MANIFEST);
  const hashes = manifest?.hashes;
  if (hashes && typeof hashes === 'object') {
    for (const [key, value] of Object.entries(hashes)) {
      if (typeof value === 'string') fileHashCache.set(key, value);
    }
  }
}

/**
 * The File System Access API is deliberately feature-detected. It is available
 * in Chromium desktop browsers, but not in every mobile browser or iframe.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function getStoredDirectoryHandle(): Promise<any> {
  try {
    return await get(HANDLE_KEY) || null;
  } catch (err) {
    console.error('Failed to get directory handle from IDB:', err);
    return null;
  }
}

export async function storeDirectoryHandle(handle: any): Promise<void> {
  try {
    await set(HANDLE_KEY, handle);
  } catch (err) {
    console.error('Failed to store directory handle in IDB:', err);
  }
}

export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    await del(HANDLE_KEY);
  } catch (err) {
    console.error('Failed to clear stored directory handle:', err);
  }
}

/** Requests permission only from an explicit user action. */
export async function verifyDirectoryPermission(handle: any, readWrite = true): Promise<boolean> {
  if (!handle) return false;
  const options: any = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    const state = await handle.queryPermission(options);
    if (state === 'granted') return true;
    const newState = await handle.requestPermission(options);
    return newState === 'granted';
  } catch (err) {
    console.error('Failed to verify directory permission:', err);
    return false;
  }
}

/** Checks permission without requesting it (safe for background timers). */
export async function hasDirectoryPermission(handle: any, readWrite = true): Promise<boolean> {
  if (!handle) return false;
  try {
    return (await handle.queryPermission({ mode: readWrite ? 'readwrite' : 'read' })) === 'granted';
  } catch {
    return false;
  }
}

export function isDiskModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISK_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDiskModeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISK_MODE_KEY, String(enabled));
  } catch {
    // This flag is only a convenience. The directory handle remains in IDB.
  }
}

const safeFilePart = (value: unknown): string => String(value ?? 'unknown').replace(/[\\/:*?"<>|]/g, '_');
const learnerFolderName = (learnerId: unknown): string => `learner_${safeFilePart(learnerId)}`;

function parseJson(text: unknown): any | null {
  if (typeof text !== 'string' || !text.trim()) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function parseStoredPayload(raw: unknown): any | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return raw;
  const direct = parseJson(raw);
  if (direct !== null) return direct;
  try {
    const decompressed = LZString.decompressFromUTF16(raw);
    return decompressed ? parseJson(decompressed) : null;
  } catch {
    return null;
  }
}

function readLocalJson(key: string, fallback: any = null): any {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseStoredPayload(raw);
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

const PROTECTED_STORAGE_KEYS = new Set([
  DISK_MODE_KEY,
  SAFETY_SNAPSHOT_KEY,
  'tutor-crafter-api-settings',
  'tutomy_auth_state_v1',
  'fb_az_key',
  'fb_az_region',
]);

function shouldBackupStorageKey(key: string): boolean {
  return !PROTECTED_STORAGE_KEYS.has(key) && !key.toLowerCase().includes('auth');
}

function snapshotBrowserStorage(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !shouldBackupStorageKey(key)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) snapshot[key] = value;
    }
  } catch (err) {
    console.warn('[Disk Sync] Could not snapshot all browser storage:', err);
  }
  return snapshot;
}

/**
 * Keys (and prefixes) that already have a dedicated backup file or folder.
 * Snapshotting them here again would duplicate multi-megabyte payloads — the
 * lesson content maps, the learner database and every custom profile photo —
 * on each and every backup.
 */
const EXPLICITLY_BACKED_UP_KEYS = new Set([
  'tutor-crafter-content',
  'tutor-crafter-group-content',
  'tutor-crafter-platform-content',
  'learner-profile-storage',
  'classroom-layout',
  KIDS_IDB_KEY,
  KIDS_STORAGE_KEY,
  COMBAT_IDB_KEY,
  COMBAT_KEY,
]);
const EXPLICITLY_BACKED_UP_PREFIXES = ['custom-avatar-'];

function isBackedUpSeparately(key: string): boolean {
  return EXPLICITLY_BACKED_UP_KEYS.has(key) || EXPLICITLY_BACKED_UP_PREFIXES.some(prefix => key.startsWith(prefix));
}

async function snapshotIndexedDb(idbModule: typeof import('idb-keyval')): Promise<Record<string, any>> {
  const snapshot: Record<string, any> = {};
  try {
    for (const key of await idbModule.keys()) {
      if (typeof key !== 'string' || key === HANDLE_KEY || !shouldBackupStorageKey(key)) continue;
      if (isBackedUpSeparately(key)) continue;
      const value = await idbModule.get(key);
      try {
        JSON.stringify(value);
        snapshot[key] = value;
      } catch {
        console.warn(`[Disk Sync] Skipping non-serializable IndexedDB key ${key}.`);
      }
    }
  } catch (err) {
    console.warn('[Disk Sync] Could not snapshot all IndexedDB data:', err);
  }
  return snapshot;
}

/**
 * ── Sibling apps sharing this origin ─────────────────────────────────────────
 * The Preply Success Advisor (`/preply-success-advisor/`) runs on this same
 * origin. It keeps its own state under `psa.*`, saves itself into its own file in
 * a folder it picks (`tutorly-advisor-data.json`) and stores its folder handle in
 * its own IndexedDB database — so the two apps never cross-write files.
 *
 * Both still show up in THIS app's backup, which is the good half: one restore
 * brings everything back on a new machine. The dangerous half was the return trip.
 * `restoreBrowserStorage` wrote every snapshot key back, so restoring an older
 * backup silently rolled the advisor's newer data back to an older copy and the
 * tutor lost whatever they had entered since.
 *
 * The rule now: each app is the authority on its own keys. A restore only SEEDS a
 * sibling app's key when the browser has nothing for it; it never overwrites live
 * sibling data. Nothing is lost either way.
 */
const SIBLING_APP_PREFIXES = ['psa.', 'psa-', 'preply-', 'tutorly-advisor'];
const ADVISOR_STATE_KEY = 'psa.state.v2';
const ADVISOR_FOLDER_FILE = 'tutorly-advisor-data.json';

function isSiblingAppKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SIBLING_APP_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Restore a single key out of a `browser_storage.json` snapshot.
 * Exported so the merge rules stay testable without a browser — the interesting
 * behaviour here is which keys are allowed to overwrite what.
 */
export function restoreSnapshotKey(key: string, value: string): 'restored' | 'seeded' | 'kept-live-sibling' | 'skipped' {
  if (!shouldBackupStorageKey(key) || typeof value !== 'string') return 'skipped';
  if (isSiblingAppKey(key)) {
    try {
      if (window.localStorage.getItem(key) !== null) return 'kept-live-sibling';
      window.localStorage.setItem(key, value);
      return 'seeded';
    } catch {
      return 'skipped';
    }
  }
  try { window.localStorage.setItem(key, value); return 'restored'; } catch { return 'skipped'; }
}

function restoreBrowserStorage(snapshot: any): void {
  if (!snapshot || typeof snapshot !== 'object') return;
  for (const [key, value] of Object.entries(snapshot)) {
    if (restoreSnapshotKey(key, value as string) === 'seeded') {
      console.info(`[Disk Sync] Seeded ${key} from the backup (this browser had nothing for it).`);
    }
  }
}

/**
 * The advisor writes its state into the folder the tutor picked. When that is this
 * app's backup folder — the recommended setup, one folder for everything — its file
 * is read back here too, so a fresh machine is fully restored in a single step.
 * Same guard as above: only ever seeds, never overwrites. */
async function restoreSiblingAppsFromDisk(directoryHandle: any): Promise<void> {
  try {
    if (window.localStorage.getItem(ADVISOR_STATE_KEY)) return;
    const advisorState = await readJsonFromDisk(directoryHandle, ADVISOR_FOLDER_FILE);
    if (!advisorState || typeof advisorState !== 'object') return;
    window.localStorage.setItem(ADVISOR_STATE_KEY, JSON.stringify(advisorState));
    console.info('[Disk Sync] Advisor state restored from ' + ADVISOR_FOLDER_FILE + ' — reload that app to see it.');
  } catch (err) {
    console.warn('[Disk Sync] Could not read the sibling advisor file:', err);
  }
}

async function restoreIndexedDb(idbModule: typeof import('idb-keyval'), snapshot: any): Promise<void> {
  if (!snapshot || typeof snapshot !== 'object') return;
  for (const [key, value] of Object.entries(snapshot)) {
    if (key === HANDLE_KEY || !shouldBackupStorageKey(key)) continue;
    try { await idbModule.set(key, value); } catch { /* keep restoring other keys */ }
  }
}

function setLocalJson(key: string, value: any): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Disk Sync] Could not mirror ${key} to browser storage:`, err);
  }
}

async function readKidsState(): Promise<any | null> {
  try {
    const idbValue = await get(KIDS_IDB_KEY);
    const parsed = parseStoredPayload(idbValue);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Fall through to the legacy browser key.
  }
  try {
    const localValue = window.localStorage.getItem(KIDS_STORAGE_KEY);
    const parsed = parseStoredPayload(localValue);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeKidsState(state: any): Promise<void> {
  const payload = JSON.stringify(state);
  const compressed = LZString.compressToUTF16(payload);
  // IDB is the source of truth; localStorage is retained as a migration/fallback mirror.
  try {
    await set(KIDS_IDB_KEY, compressed);
  } catch (err) {
    console.warn('[Kids Storage] IndexedDB write failed; keeping the browser mirror:', err);
  }
  try { window.localStorage.setItem(KIDS_STORAGE_KEY, compressed); } catch { /* IDB is enough */ }
}

async function readCombatHistory(): Promise<any> {
  try {
    const fromIdb = await get(COMBAT_IDB_KEY);
    if (fromIdb !== undefined && fromIdb !== null) return parseStoredPayload(fromIdb) ?? [];
  } catch { /* fall through */ }
  return readLocalJson(COMBAT_KEY, []);
}

async function writeCombatHistory(history: any): Promise<void> {
  const serialized = JSON.stringify(history ?? []);
  await set(COMBAT_IDB_KEY, serialized);
  try { window.localStorage.setItem(COMBAT_KEY, serialized); } catch { /* IDB is enough */ }
}

/** Storage bridge used by the React kids dashboard. IDB prevents the kingdom
 * payload (which can contain photos and long histories) from hitting the 5MB
 * localStorage ceiling. */
export async function readKidsStateFromStorage(): Promise<any | null> {
  return readKidsState();
}

export async function persistKidsState(state: any): Promise<void> {
  await writeKidsState(state);
}

export async function readCombatHistoryFromStorage(): Promise<any[]> {
  const value = await readCombatHistory();
  return Array.isArray(value) ? value : [];
}

export async function persistCombatHistory(history: any[]): Promise<void> {
  await writeCombatHistory(history);
}

export async function clearKidsStorage(): Promise<void> {
  try { await del(KIDS_IDB_KEY); } catch { /* best effort */ }
  try { await del(COMBAT_IDB_KEY); } catch { /* best effort */ }
  try {
    window.localStorage.removeItem(KIDS_STORAGE_KEY);
    window.localStorage.removeItem(COMBAT_KEY);
    window.localStorage.removeItem('kids_custom_teacher_stamps');
  } catch { /* best effort */ }
}

/**
 * Writes a text document, optionally skipping it entirely when the content is
 * byte-identical to what is already on disk (fingerprint comparison).
 */
async function writeScopedText(
  directoryHandle: any,
  fileName: string,
  text: string,
  mode: WriteMode,
  hashKey: string,
): Promise<WriteOutcome> {
  const fingerprint = cheapHash(text);
  if (mode === 'incremental' && fileHashCache.get(hashKey) === fingerprint) {
    // Never trust the fingerprint blindly: if the file was deleted on disk
    // (cleanup, sync app, manual delete) it has to be written again.
    try {
      await getFileHandleAtPath(directoryHandle, fileName);
      return 'skipped';
    } catch {
      fileHashCache.delete(hashKey);
    }
  }
  let writable: any = null;
  try {
    const fileHandle = await getFileHandleAtPath(directoryHandle, fileName, true);
    writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
    fileHashCache.set(hashKey, fingerprint);
    return 'written';
  } catch (err) {
    try { await writable?.abort?.(); } catch { /* best effort */ }
    console.error(`Failed to write file ${fileName} to disk:`, err);
    return 'failed';
  }
}

/**
 * Writes one JSON document. Callers that are saving a complete backup check the
 * boolean result, so a permission/quota error can never be reported as success.
 */
export async function writeJsonToDisk(directoryHandle: any, fileName: string, data: any): Promise<boolean> {
  const outcome = await writeScopedText(directoryHandle, fileName, JSON.stringify(data, null, 2), 'full', fileName);
  return outcome === 'written';
}

async function getFileHandleAtPath(directoryHandle: any, filePath: string, create = false): Promise<any> {
  const parts = String(filePath).split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error('A file name is required.');
  let current = directoryHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }
  return current.getFileHandle(fileName, { create });
}

export async function readJsonFromDisk(directoryHandle: any, fileName: string): Promise<any> {
  try {
    const fileHandle = await getFileHandleAtPath(directoryHandle, fileName);
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

export async function deleteFileFromDisk(directoryHandle: any, fileName: string): Promise<boolean> {
  try {
    const parts = String(fileName).split('/').filter(Boolean);
    const name = parts.pop();
    let current = directoryHandle;
    for (const part of parts) current = await current.getDirectoryHandle(part);
    await current.removeEntry(name);
    return true;
  } catch (err) {
    console.error(`Failed to delete file ${fileName} from disk:`, err);
    return false;
  }
}

export async function writeBase64ImageToDisk(directoryHandle: any, fileName: string, base64DataUrl: string): Promise<boolean> {
  let writable: any = null;
  try {
    if (!base64DataUrl || !base64DataUrl.startsWith('data:')) return false;
    const response = await fetch(base64DataUrl);
    const blob = await response.blob();
    const fileHandle = await getFileHandleAtPath(directoryHandle, fileName, true);
    writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    try { await writable?.abort?.(); } catch { /* best effort */ }
    console.error(`Failed to write image file ${fileName} to disk:`, err);
    return false;
  }
}

export async function readImageAsBase64FromDisk(directoryHandle: any, fileName: string): Promise<string | null> {
  try {
    const fileHandle = await getFileHandleAtPath(directoryHandle, fileName);
    const file = await fileHandle.getFile();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } catch {
    return null;
  }
}

interface LearnerFolderPayload {
  data: { profile: any; content: any };
  avatars: Array<{ fileName: string; dataUrl: string }>;
  fingerprint: string;
}

/**
 * Builds the exact folder payload and the fingerprint used for change detection.
 * The profile photos are part of the fingerprint, so re-uploading a photo for the
 * same learner (same avatar id, new bytes) is still detected as a change.
 */
async function buildLearnerFolderPayload(learnerData: any): Promise<LearnerFolderPayload> {
  const profile = learnerData?.profile || {};
  const avatars: Array<{ fileName: string; dataUrl: string }> = [];
  const avatarId = profile?.avatarId || profile?.avatar;
  const avatarIds = Array.isArray(profile?.avatarIds) ? profile.avatarIds : [];
  const needsAvatarLookup = (avatarId && String(avatarId).startsWith('custom:')) || avatarIds.some((id: any) => id && String(id).startsWith('custom:'));
  if (needsAvatarLookup) {
    const { getCustomAvatar } = await import('../services/customAvatarStore');
    if (avatarId && String(avatarId).startsWith('custom:')) {
      const base64 = getCustomAvatar(String(avatarId));
      if (base64) avatars.push({ fileName: 'avatar.png', dataUrl: base64 });
    }
    for (const id of avatarIds) {
      if (!id || !String(id).startsWith('custom:')) continue;
      const base64 = getCustomAvatar(String(id));
      if (base64) avatars.push({ fileName: `avatar_${safeFilePart(id)}.png`, dataUrl: base64 });
    }
  }
  const data = { profile, content: learnerData?.content ?? null };
  const photoSignature = avatars.map(a => `${a.fileName}:${cheapHash(a.dataUrl)}`).join('|');
  return { data, avatars, fingerprint: cheapHash(`${JSON.stringify(data)}::${photoSignature}`) };
}

/** Writes (or skips) one learner folder inside a dashboard scope. */
async function writeLearnerFolderInScope(
  scopeDir: any,
  scopeLabel: string,
  learnerId: string,
  learnerData: any,
  mode: WriteMode,
): Promise<WriteOutcome> {
  const folderName = learnerFolderName(learnerId);
  const hashKey = `${scopeLabel}/${folderName}`;
  try {
    const payload = await buildLearnerFolderPayload(learnerData);
    if (mode === 'incremental' && fileHashCache.get(hashKey) === payload.fingerprint) {
      // Same guard as for plain files: a folder removed on disk is recreated.
      try {
        const existing = await scopeDir.getDirectoryHandle(folderName);
        await existing.getFileHandle('profile.json');
        return 'skipped';
      } catch {
        fileHashCache.delete(hashKey);
      }
    }

    const subDir = await scopeDir.getDirectoryHandle(folderName, { create: true });
    // Keep the legacy per-learner image files for compatibility. The complete
    // custom-avatar map is also saved at the backup root by the backup root files.
    for (const avatar of payload.avatars) {
      await writeBase64ImageToDisk(subDir, avatar.fileName, avatar.dataUrl);
    }
    const ok = await writeJsonToDisk(subDir, 'profile.json', payload.data);
    if (!ok) throw new Error(`Could not write ${folderName}/profile.json`);
    fileHashCache.set(hashKey, payload.fingerprint);
    return 'written';
  } catch (err) {
    console.error(`Failed to write learner folder for ${learnerId}:`, err);
    return 'failed';
  }
}

/** Saves a learner folder while retaining the complete profile/content object. */
export async function writeLearnerFolderToDisk(directoryHandle: any, learnerId: string, learnerData: any): Promise<boolean> {
  const outcome = await writeLearnerFolderInScope(directoryHandle, 'learner', learnerId, learnerData, 'full');
  return outcome === 'written';
}

export async function readLearnerFolderFromDisk(directoryHandle: any, folderName: string): Promise<any | null> {
  try {
    const subDir = await directoryHandle.getDirectoryHandle(folderName);
    const learnerData = await readJsonFromDisk(subDir, 'profile.json');
    if (!learnerData || !learnerData.profile) return null;

    // Restore legacy per-learner images and preserve their exact profile IDs.
    try {
      const { saveCustomAvatar } = await import('../services/customAvatarStore');
      for await (const entry of subDir.values()) {
        if (entry.kind !== 'file' || !entry.name.startsWith('avatar') || !entry.name.endsWith('.png')) continue;
        const avatarBase64 = await readImageAsBase64FromDisk(subDir, entry.name);
        if (!avatarBase64) continue;
        const storedId = entry.name === 'avatar.png'
          ? `custom:${learnerData.profile.id}`
          : entry.name.replace(/^avatar_/, '').replace(/\.png$/, '');
        const normalized = storedId.startsWith('custom:') ? storedId.slice('custom:'.length) : storedId;
        await saveCustomAvatar(normalized, avatarBase64);
      }
    } catch (err) {
      console.warn('Error restoring custom avatars from learner folder:', err);
    }
    return learnerData;
  } catch {
    return null;
  }
}

/**
 * Explicit destructive action used by the UI after a confirmed backup.
 *
 * It refuses to run unless a **complete** backup can be verified on the connected
 * folder — purging browser memory while the last backup is missing, partial or
 * stale is exactly how a whole library disappears. Returns true only when the
 * browser data was actually cleared.
 */
export async function purgeBrowserMemory(): Promise<boolean> {
  try {
    if (!isDiskModeEnabled()) return false;
    const handle = await getStoredDirectoryHandle();
    if (!handle || !(await hasDirectoryPermission(handle, true))) return false;
    // First make sure the folder holds the newest revision of everything…
    const saved = await saveAllToDisk(handle, undefined, { full: true });
    if (!saved) return false;
    // …and that the write finished, i.e. the manifest is not an interrupted one.
    const manifest = await readJsonFromDisk(handle, BACKUP_MANIFEST);
    if (!manifest || manifest.complete !== true) return false;
  } catch (err) {
    console.error('Refused to purge browser memory because no verified backup is available:', err);
    return false;
  }
  try {
    const itemsToKeep: Record<string, string> = {};
    for (const key of [DISK_MODE_KEY]) {
      const value = window.localStorage.getItem(key);
      if (value !== null) itemsToKeep[key] = value;
    }
    window.localStorage.clear();
    Object.entries(itemsToKeep).forEach(([key, value]) => window.localStorage.setItem(key, value));

    const allKeys = await (await import('idb-keyval')).keys();
    for (const key of allKeys) {
      // The folder handle keeps the connection; the safety snapshot keeps the data.
      // Everything else may be dropped — the two of them together mean a purge can
      // never leave the tutor with nothing.
      if (key !== HANDLE_KEY && key !== SAFETY_SNAPSHOT_KEY) await del(key);
    }
    const { customAvatarsCache } = await import('../services/customAvatarStore');
    customAvatarsCache.clear();
  } catch (err) {
    console.error('Purging browser memory failed:', err);
  }
}

function serializableState(value: any): any {
  try { return JSON.parse(JSON.stringify(value)); } catch { return null; }
}

interface SaveStats {
  written: number;
  skipped: number;
  learnersUpdated: number;
  learnersUpToDate: number;
}

/**
 * One backup pass. In incremental mode (`full` not set) every payload is compared
 * against the fingerprint recorded for it, so a small edit only rewrites the
 * affected learner folder(s) plus the few small metadata files whose content
 * actually changed — instead of re-saving the entire library, every avatar and
 * both content maps on every keystroke.
 */
async function saveAllToDiskUnlocked(
  directoryHandle: any,
  onProgress?: (done: number, total: number, label: string) => void,
  options?: { full?: boolean },
): Promise<boolean> {
  const full = !!options?.full;
  const mode: WriteMode = full ? 'full' : 'incremental';
  const stats: SaveStats = { written: 0, skipped: 0, learnersUpdated: 0, learnersUpToDate: 0 };
  try {
    await seedHashCache(directoryHandle, full);

    // ── Never overwrite a good backup with an empty, not-yet-restored browser ──
    // After a browser memory flush (or on a different origin) the app can come up
    // with zero learners while the folder still holds the tutor's real library. An
    // incremental background sync in that state used to overwrite workspace_state
    // (todos, calendar, bookings, automations) with empty data. Refuse instead.
    if (!full) {
      const priorManifest = await readJsonFromDisk(directoryHandle, BACKUP_MANIFEST);
      const priorLearners = Number(priorManifest?.learnerCount || 0);
      const { useLearnerStore: learnerStoreForGuard } = await import('../store/useLearnerStore');
      const browserLearners = (learnerStoreForGuard.getState().learners || []).length;
      if (priorLearners > 0 && browserLearners === 0) {
        console.warn('[Disk Sync] Refusing to overwrite a backup that holds ' + priorLearners + ' learner(s) with an empty browser state. Restore from the folder first (or use Export All).');
        lastSyncSummary = { at: Date.now(), full, written: 0, skipped: 0, learnersUpdated: 0, learnersUpToDate: 0, blocked: true };
        return false;
      }
    }

    const [learnerModule, appModule, todoModule, calendarModule, bookingModule, automationModule, coursebookModule] = await Promise.all([
      import('../store/useLearnerStore'),
      import('../store/useAppStore'),
      import('../store/useTodoStore'),
      import('../store/useCalendarStore'),
      import('../store/useBookingStore'),
      import('../store/useAutomationStore'),
      import('../store/useCoursebookStore'),
    ]);
    const { useLearnerStore } = learnerModule;
    const { useAppStore } = appModule;
    const learnersList = useLearnerStore.getState().learners || [];
    const kidsData = await readKidsState();
    const kidsLearners = Array.isArray(kidsData?.learners) ? kidsData.learners : [];
    // Hoisted so the never-purged local safety copy can include the kingdom's
    // settings even though the writer is scoped to the kids block below.
    let kidsSettingsForSafety: any = null;
    // One shared progress total: the fixed metadata files, every learner folder,
    // the young learners kingdom and (added below) one file per learner's lessons.
    let total = Math.max(1, 4 + learnersList.length + (kidsData ? 1 + kidsLearners.length : 0));
    let done = 0;
    const report = (label: string) => {
      done += 1;
      onProgress?.(Math.min(done, total), total, label);
    };

    /** Writes a JSON document only when its content changed; never claims success on failure. */
    const writeFile = async (dir: any, fileName: string, data: any, hashKey: string, label: string, required = true) => {
      const outcome = await writeScopedText(dir, fileName, JSON.stringify(data, null, 2), mode, hashKey);
      if (outcome === 'failed') {
        if (required) throw new Error(`Could not write ${hashKey}. Check folder permission and available disk space.`);
        report(label);
        return outcome;
      }
      if (outcome === 'skipped') stats.skipped += 1; else stats.written += 1;
      report(label);
      return outcome;
    };

    const writeLearner = async (scopeDir: any, scopeLabel: string, learner: any, content: any, label: string) => {
      const learnerId = String(learner?.id || 'unknown');
      const outcome = await writeLearnerFolderInScope(scopeDir, scopeLabel, learnerId, { profile: learner, content }, mode);
      if (outcome === 'failed') throw new Error(`Could not save learner ${learnerId}.`);
      if (outcome === 'skipped') stats.learnersUpToDate += 1; else stats.learnersUpdated += 1;
      report(label);
    };

    const idb = await import('idb-keyval');
    const [learnerContent, groupContent, platformContent, classroomLayout] = await Promise.all([
      idb.get('tutor-crafter-content'),
      idb.get('tutor-crafter-group-content'),
      idb.get('tutor-crafter-platform-content'),
      idb.get('classroom-layout'),
    ]);
    const browserStorage = snapshotBrowserStorage();
    const idbStorage = await snapshotIndexedDb(idb);

    const classroomSettings = {
      version: BACKUP_VERSION,
      shortcuts: readLocalJson('classroom-shortcuts', []),
      background: readLocalJson('classroom-bg', null),
      timeOffset: readLocalJson('classroom-time-offset', 0),
      theme: readLocalJson('classroom-theme', 'dark'),
      mapCities: readLocalJson('classroom-map-cities', []),
      soundBoardPads: readLocalJson('classroom-sound-board-pads', readLocalJson('classroom-sound-board-v2', null)),
      soundBoardVolume: readLocalJson('classroom-sound-board-volume', null),
      zenMode: readLocalJson('classroom-zen-mode', false),
      animateBg: readLocalJson('classroom-bg-animate', false),
      weatherCity: (() => { try { return window.localStorage.getItem('classroom-weather-city') || 'New York'; } catch { return 'New York'; } })(),
      tutorlyPremium: window.localStorage.getItem('tutorly_premium') === 'true',
      tutorlyVip: window.localStorage.getItem('tutorly_vip') === 'true',
      appState: serializableState(useAppStore.getState()),
      layout: serializableState(classroomLayout),
    };
    await writeFile(directoryHandle, 'classroom_settings.json', classroomSettings, 'classroom_settings.json', 'Classroom settings & layout');

    const adultDir = await directoryHandle.getDirectoryHandle('adult_dashboard', { create: true });
    const platforms = readLocalJson('tutor-crafter-platforms', []);
    // No volatile timestamps in here: the file must stay byte-identical when the
    // content is identical, otherwise every backup would rewrite it.
    const workspaceState = {
      version: BACKUP_VERSION,
      groupClasses: serializableState(useLearnerStore.getState().groupClasses || []),
      tutorInfo: serializableState(useAppStore.getState().tutorInfo || {}),
      appState: serializableState(useAppStore.getState()),
      todos: serializableState(todoModule.useTodoStore.getState().todos || []),
      calendar: serializableState(calendarModule.useCalendarStore.getState()),
      booking: serializableState(bookingModule.useBookingStore.getState()),
      automation: serializableState(automationModule.useAutomationStore.getState()),
      coursebooks: serializableState(coursebookModule.useCoursebookStore.getState()),
      platforms,
    };
    await writeFile(adultDir, 'workspace_state.json', workspaceState, 'adult_dashboard/workspace_state.json', 'Adult dashboard workspace');
    // Lesson content is written one file per learner inside lesson_content/, so
    // editing one learner's lessons rewrites only that learner's file instead of
    // a multi-megabyte map holding everybody's lessons. (Older backups wrote a
    // single lesson_content.json; the loader still reads that file too, and
    // per-learner content is additionally embedded in each learner folder.)
    const fullContentMap: Record<string, any> = (learnerContent && typeof learnerContent === 'object')
      ? serializableState(learnerContent) || {}
      : {};
    const contentDir = await adultDir.getDirectoryHandle('lesson_content', { create: true });
    total += Object.keys(fullContentMap).length;
    for (const [contentKey, contentValue] of Object.entries(fullContentMap)) {
      const contentFileName = `${safeFilePart(contentKey)}.json`;
      const outcome = await writeScopedText(
        contentDir,
        contentFileName,
        JSON.stringify({ id: contentKey, content: contentValue }, null, 2),
        mode,
        `adult_dashboard/lesson_content/${contentFileName}`,
      );
      if (outcome === 'failed') throw new Error(`Could not save the lessons of ${contentKey}.`);
      if (outcome === 'skipped') stats.skipped += 1; else stats.written += 1;
    }
    // Migrate away from the older single-file map: its content is now fully
    // represented by the per-learner files above, and a stale copy left behind
    // would shadow newer lessons on the next restore.
    const legacyContentFile = await adultDir.getFileHandle('lesson_content.json').catch(() => null);
    if (legacyContentFile) await adultDir.removeEntry('lesson_content.json').catch(() => { /* older backup, best effort */ });
    await writeFile(adultDir, 'platforms.json', platforms, 'adult_dashboard/platforms.json', 'Teaching platforms');
    await writeFile(adultDir, 'group_classes.json', workspaceState.groupClasses, 'adult_dashboard/group_classes.json', 'Group classes');
    await writeFile(adultDir, 'tutor_profile.json', workspaceState.tutorInfo, 'adult_dashboard/tutor_profile.json', 'Tutor profile');
    await writeFile(adultDir, 'group_content.json', serializableState(groupContent || {}), 'adult_dashboard/group_content.json', 'Group lesson content');
    await writeFile(adultDir, 'platform_content.json', serializableState(platformContent || {}), 'adult_dashboard/platform_content.json', 'Platform lesson content');

    const contentMap: Record<string, any> = (learnerContent && typeof learnerContent === 'object') ? learnerContent as any : {};
    for (const learner of learnersList) {
      await writeLearner(adultDir, 'adult_dashboard', learner, contentMap[String((learner as any).id)] ?? null, `Learner: ${String((learner as any).name || (learner as any).id)}`);
    }
    await writeFile(adultDir, 'manifest.json', {
      version: BACKUP_VERSION,
      learnerIds: learnersList.map((learner: any) => learner.id),
    }, 'adult_dashboard/manifest.json', 'Adult learner index');

    if (kidsData) {
      const kidsDir = await directoryHandle.getDirectoryHandle('kids_dashboard', { create: true });
      const combatHistory = await readCombatHistory();
      const kidsSettings = {
        storeItems: kidsData.storeItems || [],
        teacher: kidsData.teacher || null,
        theme: kidsData.theme || 'fairy',
        combat_arena_storybook_v1: combatHistory || [],
        customTeacherStamps: readLocalJson('kids_custom_teacher_stamps', []),
      };
      kidsSettingsForSafety = kidsSettings;
      await writeFile(kidsDir, 'kingdom_state.json', serializableState(kidsData), 'kids_dashboard/kingdom_state.json', 'Young learners kingdom');
      await writeFile(kidsDir, 'kids_settings.json', kidsSettings, 'kids_dashboard/kids_settings.json', 'Kingdom settings & Combat Arena');
      for (const learner of kidsLearners) {
        await writeLearner(kidsDir, 'kids_dashboard', learner, null, `Young learner: ${String(learner?.name || learner?.id)}`);
      }
      await writeFile(kidsDir, 'manifest.json', {
        version: BACKUP_VERSION,
        learnerIds: kidsLearners.map((learner: any) => learner.id),
      }, 'kids_dashboard/manifest.json', 'Young learner index');
    }

    const avatars = await exportAllCustomAvatars();
    await writeFile(directoryHandle, 'custom_avatars.json', avatars, 'custom_avatars.json', 'Custom profile photos');
    await writeFile(directoryHandle, 'browser_storage.json', browserStorage, 'browser_storage.json', 'Browser settings');
    await writeFile(directoryHandle, 'indexeddb_storage.json', idbStorage, 'indexeddb_storage.json', 'App storage');
    const manifestPayload = {
      version: BACKUP_VERSION,
      complete: true,
      full,
      updatedAt: new Date().toISOString(),
      learnerCount: learnersList.length,
      kidsLearnerCount: kidsData ? kidsLearners.length : 0,
      hashes: Object.fromEntries(fileHashCache),
      sections: { classroom: true, adultDashboard: true, kidsDashboard: !!kidsData, customAvatars: true },
    };
    // A backup run in which not a single file changed should not touch the disk at
    // all — the fingerprint list in the manifest is already accurate then, and the
    // background auto-sync runs on every edit.
    const previousManifest = await readJsonFromDisk(directoryHandle, BACKUP_MANIFEST);
    const manifestIsCurrent = !full
      && stats.written === 0
      && previousManifest?.complete === true
      && previousManifest?.version === BACKUP_VERSION
      && previousManifest?.learnerCount === learnersList.length
      && previousManifest?.sections?.kidsDashboard === !!kidsData;
    if (manifestIsCurrent) stats.skipped += 1;
    else await writeFile(directoryHandle, BACKUP_MANIFEST, manifestPayload, BACKUP_MANIFEST, 'Backup index');

    // The backup on disk now matches this browser, so refresh the never-purged
    // local safety copy. It is the reason a lost folder (or a memory flush) can no
    // longer mean a lost library.
    await writeSafetySnapshot({
      version: BACKUP_VERSION,
      at: new Date().toISOString(),
      learners: serializableState(learnersList) || [],
      kidsLearners: serializableState(kidsLearners) || [],
      workspace: workspaceState,
      classroom: classroomSettings,
      kidsState: serializableState(kidsData) || null,
      kidsSettings: kidsSettingsForSafety,
      browserStorage,
    });

    lastSyncSummary = {
      at: Date.now(),
      full,
      written: stats.written,
      skipped: stats.skipped,
      learnersUpdated: stats.learnersUpdated,
      learnersUpToDate: stats.learnersUpToDate,
    };
    const changed = [
      stats.learnersUpdated > 0 ? `${stats.learnersUpdated} learner${stats.learnersUpdated === 1 ? '' : 's'} updated` : '',
      stats.learnersUpToDate > 0 ? `${stats.learnersUpToDate} already up to date` : '',
    ].filter(Boolean).join(' · ');
    report(changed ? `Backup complete — ${changed}` : 'Backup complete');
    return true;
  } catch (err) {
    console.error('Backup to disk failed:', err);
    return false;
  }
}

let diskOperationQueue: Promise<unknown> = Promise.resolve();
function enqueueDiskOperation<T>(operation: () => Promise<T>): Promise<T> {
  const next = diskOperationQueue.then(operation, operation);
  diskOperationQueue = next.then(() => undefined, () => undefined);
  return next;
}

/**
 * Backs up to disk. Serialized so two rapid edits can never overwrite each other
 * out of order, and incremental by default: only the files and learner folders
 * whose content actually changed are written. Pass `{ full: true }` for an
 * explicit “export everything” action (initial export, repair, backup now).
 */
export function saveAllToDisk(
  directoryHandle: any,
  onProgress?: (done: number, total: number, label: string) => void,
  options?: { full?: boolean },
): Promise<boolean> {
  return enqueueDiskOperation(() => saveAllToDiskUnlocked(directoryHandle, onProgress, options));
}

export function applyClassroomSettings(settings: any): void {
  if (!settings) return;
  const jsonKeys = ['classroom-shortcuts', 'classroom-bg', 'classroom-time-offset', 'classroom-theme', 'classroom-map-cities', 'classroom-sound-board-pads', 'classroom-sound-board-volume', 'classroom-zen-mode', 'classroom-bg-animate'];
  const values: Record<string, any> = {
    'classroom-shortcuts': settings.shortcuts,
    'classroom-bg': settings.background,
    'classroom-time-offset': settings.timeOffset,
    'classroom-theme': settings.theme,
    'classroom-map-cities': settings.mapCities,
    'classroom-sound-board-pads': settings.soundBoardPads,
    'classroom-sound-board-volume': settings.soundBoardVolume,
    'classroom-zen-mode': settings.zenMode,
    'classroom-bg-animate': settings.animateBg,
  };
  jsonKeys.forEach(key => { if (values[key] !== undefined && values[key] !== null) setLocalJson(key, values[key]); });
  if (settings.weatherCity) {
    try { window.localStorage.setItem('classroom-weather-city', String(settings.weatherCity)); } catch { /* ignore */ }
  }
  try {
    if (settings.tutorlyPremium !== undefined) window.localStorage.setItem('tutorly_premium', String(!!settings.tutorlyPremium));
    if (settings.tutorlyVip !== undefined) window.localStorage.setItem('tutorly_vip', String(!!settings.tutorlyVip));
  } catch { /* ignore */ }
}

async function applyCustomAvatarsMap(avatars: any): Promise<boolean> {
  if (!avatars || typeof avatars !== 'object') return false;
  let restored = false;
  for (const [avatarId, dataUrl] of Object.entries(avatars)) {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) continue;
    const learnerId = avatarId.startsWith('custom:') ? avatarId.slice('custom:'.length) : avatarId;
    await saveCustomAvatar(learnerId, dataUrl);
    restored = true;
  }
  return restored;
}

async function restoreCustomAvatars(directoryHandle: any): Promise<boolean> {
  // Structure-agnostic: accept the avatars file from the root or anywhere in the tree.
  return applyCustomAvatarsMap(await readJsonFromTree(directoryHandle, 'custom_avatars.json'));
}

/** Core workspace data kept as the last-resort local safety copy. */
export interface SafetySnapshot {
  version: number;
  at: string;
  learners: any[];
  kidsLearners: any[];
  workspace: any;
  classroom: any;
  kidsState: any;
  kidsSettings: any;
  browserStorage: Record<string, string>;
}

/**
 * Writes the never-purged safety copy into IndexedDB. Fire-and-forget: a quota
 * failure here must never fail the backup itself.
 */
async function writeSafetySnapshot(snapshot: SafetySnapshot): Promise<void> {
  try {
    const idb = await import('idb-keyval');
    await idb.set(SAFETY_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[Disk Sync] Could not write the local safety copy:', err);
  }
}

/** Reads the last-resort safety copy, or null when there is none. */
export async function readSafetySnapshot(): Promise<SafetySnapshot | null> {
  try {
    const idb = await import('idb-keyval');
    const raw = await idb.get(SAFETY_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? (parsed as SafetySnapshot) : null;
  } catch {
    return null;
  }
}

let rescueCopyTimer: ReturnType<typeof setTimeout> | null = null;
let rescueCopyInFlight = false;

/**
 * Refreshes the local rescue copy of the learner roster, with no folder and no
 * cloud required.
 *
 * The safety copy used to be written in exactly one place: at the end of a
 * successful `saveAllToDisk`. That made it a reward for connecting a backup folder
 * — which means the tutor who had NOT connected one — the tutor with the least
 * protection — had no local recovery copy whatsoever. If their browser was evicted,
 * cleared, or opened in a different profile, the Adult Dashboard came up empty with
 * literally nothing to restore from.
 *
 * This runs on a debounce whenever the roster changes, so a usable copy of the
 * learners exists within seconds of the first learner being created, folder or no
 * folder. Two rules keep it strictly additive:
 *
 *  - it never writes an empty roster over a populated copy (an empty store is a
 *    hydration race or a purge, not the tutor deleting their own library), and
 *  - it preserves whichever other sections a folder backup already put in the
 *    snapshot, so the two writers cannot clobber each other.
 */
export async function refreshLocalRescueCopy(): Promise<void> {
  if (rescueCopyInFlight) return;
  rescueCopyInFlight = true;
  try {
    const { useLearnerStore } = await import('../store/useLearnerStore');
    const learners = serializableState(useLearnerStore.getState().learners);
    if (!Array.isArray(learners) || learners.length === 0) return;

    const existing = await readSafetySnapshot();
    await writeSafetySnapshot({
      version: BACKUP_VERSION,
      at: new Date().toISOString(),
      learners,
      kidsLearners: existing?.kidsLearners ?? [],
      workspace: existing?.workspace ?? null,
      classroom: existing?.classroom ?? null,
      kidsState: existing?.kidsState ?? null,
      kidsSettings: existing?.kidsSettings ?? null,
      browserStorage: existing?.browserStorage ?? {},
    });
  } catch (err) {
    console.warn('[Storage Guard] Could not refresh the local rescue copy:', err);
  } finally {
    rescueCopyInFlight = false;
  }
}

/**
 * Debounced `refreshLocalRescueCopy`. Called from the roster subscription so a
 * burst of edits costs one write, not one per keystroke.
 */
export function scheduleLocalRescueCopy(delay = 4000): void {
  if (typeof window === 'undefined') return;
  if (rescueCopyTimer) clearTimeout(rescueCopyTimer);
  rescueCopyTimer = setTimeout(() => {
    rescueCopyTimer = null;
    void refreshLocalRescueCopy();
  }, delay);
}

/**
 * Applies one workspace payload (todos, calendar, bookings, automations,
 * coursebooks, platforms, tutor profile, app settings) to the live stores.
 *
 * Extracted so the disk restore, the local safety copy and the cloud restore all
 * apply the SAME shape instead of three near-copies drifting apart. Arrays are
 * only applied when they carry data: an empty list in a partial backup must never
 * blank out a populated one.
 */
export async function applyWorkspaceToStores(
  ws: any,
  overrides?: { groupClasses?: any; platforms?: any; tutorInfo?: any },
): Promise<boolean> {
  const source = ws && typeof ws === 'object' ? ws : {};
  const groups = overrides && 'groupClasses' in overrides ? overrides.groupClasses : source.groupClasses;
  const platforms = overrides && 'platforms' in overrides ? overrides.platforms : source.platforms;
  const tutorInfo = overrides && 'tutorInfo' in overrides ? overrides.tutorInfo : source.tutorInfo;

  const [learnerModule, appModule, todoModule, calendarModule, bookingModule, automationModule, coursebookModule] = await Promise.all([
    import('../store/useLearnerStore'),
    import('../store/useAppStore'),
    import('../store/useTodoStore'),
    import('../store/useCalendarStore'),
    import('../store/useBookingStore'),
    import('../store/useAutomationStore'),
    import('../store/useCoursebookStore'),
  ]);

  let applied = false;
  if (Array.isArray(groups) && groups.length > 0) {
    learnerModule.useLearnerStore.setState({ groupClasses: groups });
    applied = true;
  }
  if (platforms !== null && platforms !== undefined) {
    setLocalJson('tutor-crafter-platforms', platforms);
    applied = true;
  }
  if (tutorInfo && typeof tutorInfo === 'object' && Object.keys(tutorInfo).length > 0) {
    appModule.useAppStore.setState({ tutorInfo } as any);
    applied = true;
  }
  if (source.appState && typeof source.appState === 'object') {
    const appState = { ...source.appState };
    delete (appState as any).loading;
    appModule.useAppStore.setState(appState as any);
    applied = true;
  }
  if (Array.isArray(source.todos) && source.todos.length > 0) {
    todoModule.useTodoStore.setState({ todos: source.todos });
    applied = true;
  }
  if (source.calendar && typeof source.calendar === 'object') {
    const { calendarEvents, syncedCalendars, hiddenEventIds, calendarTimezone } = source.calendar;
    calendarModule.useCalendarStore.setState({ calendarEvents, syncedCalendars, hiddenEventIds, calendarTimezone } as any);
    applied = true;
  }
  if (source.booking && typeof source.booking === 'object') {
    const { packages, cancellationPolicy, bufferSettings, blockedTimes, recurringRules, autoBookWeeks, learnerData } = source.booking;
    bookingModule.useBookingStore.setState({ packages, cancellationPolicy, bufferSettings, blockedTimes, recurringRules, autoBookWeeks, learnerData } as any);
    applied = true;
  }
  if (source.automation && typeof source.automation === 'object') {
    const automation = { ...source.automation };
    Object.keys(automation).forEach(key => { if (typeof automation[key] === 'function') delete automation[key]; });
    automationModule.useAutomationStore.setState(automation as any);
    applied = true;
  }
  if (source.coursebooks && typeof source.coursebooks === 'object') {
    const { coursebooks, coverOverrides, editedOfficialIds } = source.coursebooks;
    coursebookModule.useCoursebookStore.setState({ coursebooks, coverOverrides, editedOfficialIds } as any);
    applied = true;
  }
  return applied;
}

/**
 * Applies a young-learners kingdom payload (roster + settings + Combat Arena).
 * Same guard as the adult roster: a partial backup with no learners must never
 * replace the kingdom that is already here.
 */
export async function applyKidsState(kidsState: any, kidsSettings: any, replaceLearners = false): Promise<boolean> {
  let applied = false;
  if (kidsState && typeof kidsState === 'object') {
    const kingdomLearners = Array.isArray(kidsState.learners) ? kidsState.learners : [];
    const current = await readKidsState();
    const currentLearners = Array.isArray(current?.learners) ? current.learners : [];
    let nextState = kidsState;
    if (kingdomLearners.length === 0) {
      if (currentLearners.length > 0) {
        console.warn('[Disk Sync] The kids backup has no learners — keeping the kingdom already in this browser.');
        nextState = { ...kidsState, learners: currentLearners };
      }
    } else if (!replaceLearners && currentLearners.length > 0) {
      const byId = new Map(currentLearners.map((learner: any) => [String(learner?.id), learner]));
      kingdomLearners.forEach((learner: any) => byId.set(String(learner?.id), learner));
      nextState = { ...kidsState, learners: Array.from(byId.values()) };
    }
    await writeKidsState(nextState);
    applied = true;
  }
  if (kidsSettings?.combat_arena_storybook_v1 !== undefined) {
    await writeCombatHistory(kidsSettings.combat_arena_storybook_v1);
    applied = true;
  }
  if (Array.isArray(kidsSettings?.customTeacherStamps)) {
    setLocalJson('kids_custom_teacher_stamps', kidsSettings.customTeacherStamps);
    applied = true;
  }
  return applied;
}

/**
 * Applies the last-resort safety copy. Called when the connected folder cannot be
 * read (no handle, permission lapsed, wrong origin) so the app never opens onto
 * an empty library while the tutor's own data still exists somewhere.
 */
export async function restoreSafetySnapshot(options?: { replaceLearners?: boolean }): Promise<boolean> {
  const snapshot = await readSafetySnapshot();
  if (!snapshot) return false;
  const replaceLearners = options?.replaceLearners !== false;
  try {
    const { useLearnerStore } = await import('../store/useLearnerStore');
    const { useAppStore } = await import('../store/useAppStore');
    if (Array.isArray(snapshot.learners) && snapshot.learners.length > 0) {
      const next = replaceLearners
        ? snapshot.learners
        : Array.from(new Map([
            ...(useLearnerStore.getState().learners || []).map((learner: any) => [String(learner.id), learner] as const),
            ...snapshot.learners.map((learner: any) => [String(learner.id), learner] as const),
          ]).values());
      useLearnerStore.setState({ learners: next });
    }
    restoreBrowserStorage(snapshot.browserStorage);
    if (snapshot.classroom) applyClassroomSettings(snapshot.classroom);
    await applyWorkspaceToStores(snapshot.workspace);
    await applyKidsState(snapshot.kidsState, snapshot.kidsSettings, replaceLearners);
    lastRestoreSummary = {
      at: Date.now(),
      source: 'safety',
      learners: Array.isArray(snapshot.learners) ? snapshot.learners.length : 0,
      incomplete: false,
    };
    console.info('[Disk Sync] Restored the local safety copy — reconnect your backup folder to sync it back to disk.');
    return true;
  } catch (err) {
    console.error('[Disk Sync] Could not apply the local safety copy:', err);
    return false;
  }
}

export interface DiskRestoreSummary {
  at: number;
  source: 'folder' | 'safety' | 'file';
  learners: number;
  /** The folder's manifest said the backup was incomplete / interrupted. */
  incomplete: boolean;
}

let lastRestoreSummary: DiskRestoreSummary | null = null;

/** What the most recent restore actually did (used for honest status messages). */
export function getLastRestoreSummary(): DiskRestoreSummary | null {
  return lastRestoreSummary;
}

async function loadAllFromDiskUnlocked(directoryHandle: any, options?: { replaceLearners?: boolean }): Promise<boolean> {
  const replaceLearners = options?.replaceLearners === true;
  let applied = false;
  let restoredLearners = 0;
  try {
    // ── Structure-agnostic restore ─────────────────────────────────────────
    // The folder a tutor picks does not have to BE the backup folder: an older
    // sync may have written everything one level down, a cloud-drive client
    // (Dropbox, OneDrive, Google Drive) may have nested it, or the tutor may have
    // picked a parent directory. Find the directory that actually holds a backup
    // and read from there — never giving up while the data sits in a subfolder.
    directoryHandle = await resolveBackupRoot(directoryHandle);

    // A manual Back-up Suite file dropped into the folder restores exactly like
    // the folder layout does — but ONLY when there is no folder layout to prefer,
    // so an old file sitting next to a live backup can never shadow it.
    if (!(await dirHasFolderLayout(directoryHandle))) {
      const bundleFile = await findBundleFile(directoryHandle);
      if (bundleFile) {
        const fromFile = await applyFullBackupBundle(bundleFile, { replaceLearners, source: 'folder' });
        if (fromFile.ok) return true;
      }
    }

    const manifest = await readJsonFromDisk(directoryHandle, BACKUP_MANIFEST);
    const browserStorage = await readJsonFromTree(directoryHandle, 'browser_storage.json');
    const indexedDbStorage = await readJsonFromTree(directoryHandle, 'indexeddb_storage.json');
    const idb = await import('idb-keyval');
    restoreBrowserStorage(browserStorage);
    await restoreIndexedDb(idb, indexedDbStorage);
    if (browserStorage && typeof browserStorage === 'object' && Object.keys(browserStorage).length > 0) applied = true;
    if (indexedDbStorage && typeof indexedDbStorage === 'object' && Object.keys(indexedDbStorage).length > 0) applied = true;
    // Sibling app (Preply Success Advisor) — seed only, never overwrite. See the
    // SIBLING_APP_PREFIXES note above.
    await restoreSiblingAppsFromDisk(directoryHandle);
    const classroomSettings = await readJsonFromTree(directoryHandle, 'classroom_settings.json');
    if (classroomSettings) {
      applied = true;
      applyClassroomSettings(classroomSettings);
      if (classroomSettings.layout !== undefined) await set('classroom-layout', classroomSettings.layout);
      if (classroomSettings.appState) {
        const { useAppStore } = await import('../store/useAppStore');
        const appState = { ...classroomSettings.appState };
        delete (appState as any).loading;
        useAppStore.setState(appState as any);
      }
    }

    let adultDir = await directoryHandle.getDirectoryHandle('adult_dashboard').catch(() => null);
    if (!adultDir) adultDir = await findDirRecursively(directoryHandle, 'adult_dashboard');
    if (adultDir) {
      const [workspaceState, groupClassesFile, platformsFile, tutorFile, groupContentFile, platformContentFile, adultManifest, lessonContentFile] = await Promise.all([
        readJsonFromDisk(adultDir, 'workspace_state.json'),
        readJsonFromDisk(adultDir, 'group_classes.json'),
        readJsonFromDisk(adultDir, 'platforms.json'),
        readJsonFromDisk(adultDir, 'tutor_profile.json'),
        readJsonFromDisk(adultDir, 'group_content.json'),
        readJsonFromDisk(adultDir, 'platform_content.json'),
        readJsonFromDisk(adultDir, 'manifest.json'),
        readJsonFromDisk(adultDir, 'lesson_content.json'),
      ]);
      const adultLearners: any[] = [];
      const adultContent: Record<string, any> = {};
      const adultIds = new Set<string>(Array.isArray(adultManifest?.learnerIds) ? adultManifest.learnerIds.map(String) : []);
      for await (const entry of adultDir.values()) {
        if (entry.kind !== 'directory' || !entry.name.startsWith('learner_')) continue;
        const data = await readLearnerFolderFromDisk(adultDir, entry.name);
        if (data?.profile?.id && (adultIds.size === 0 || adultIds.has(String(data.profile.id)))) {
          adultLearners.push(data.profile);
          if (data.content !== undefined && data.content !== null) adultContent[data.profile.id] = data.content;
        }
      }

      const hasAdultBackup = !!workspaceState || !!groupClassesFile || !!platformsFile || !!tutorFile || !!adultManifest || adultLearners.length > 0;
      if (hasAdultBackup) {
        const idb = await import('idb-keyval');
        const { useLearnerStore } = await import('../store/useLearnerStore');
        const ws = workspaceState || {};
        // A backup that contains no learners must never wipe the library: an older,
        // partial or wrong folder would otherwise look like “all data gone”.
        // Automatic (startup) restores merge by id and keep browser-only learners;
        // the explicit “Restore All” action replaces the browser roster.
        const browserLearners = useLearnerStore.getState().learners || [];
        if (adultLearners.length > 0) {
          let nextLearners = adultLearners;
          if (!replaceLearners) {
            const byId = new Map(browserLearners.map((learner: any) => [String(learner.id), learner]));
            adultLearners.forEach((learner: any) => byId.set(String(learner.id), learner));
            nextLearners = Array.from(byId.values());
          }
          useLearnerStore.setState({ learners: nextLearners });
          restoredLearners = adultLearners.length;
          applied = true;
        } else if (browserLearners.length > 0) {
          console.warn('[Disk Sync] The connected folder contains no learner folders — keeping the learners already in this browser.');
        }
        const workspaceOverrides: any = {};
        const groups = ws.groupClasses ?? groupClassesFile;
        const platforms = ws.platforms ?? platformsFile;
        const tutorInfo = ws.tutorInfo ?? tutorFile;
        if (groups !== undefined) workspaceOverrides.groupClasses = groups;
        if (platforms !== undefined) workspaceOverrides.platforms = platforms;
        if (tutorInfo !== undefined) workspaceOverrides.tutorInfo = tutorInfo;
        if (await applyWorkspaceToStores(ws, workspaceOverrides)) applied = true;
        // Lesson content is stored both in each learner folder and in the
        // workspace map, so restore merges them (folder content first, map on top)
        // instead of letting one stale copy blank out the other.
        // lesson_content.json is the current location; older backups embedded the
        // same map inside workspace_state.json, so both are accepted.
        const perLearnerDiskContent: Record<string, any> = {};
        const lessonContentDir = await adultDir.getDirectoryHandle('lesson_content').catch(() => null);
        if (lessonContentDir) {
          for await (const entry of lessonContentDir.values()) {
            if (entry.kind !== 'file' || !entry.name.endsWith('.json')) continue;
            const parsedContent = await readJsonFromDisk(lessonContentDir, entry.name);
            if (!parsedContent || typeof parsedContent !== 'object') continue;
            const contentKey = typeof parsedContent.id === 'string' ? parsedContent.id : entry.name.replace(/\.json$/, '');
            perLearnerDiskContent[contentKey] = parsedContent.content;
          }
        }
        const legacyDiskContent = (lessonContentFile && typeof lessonContentFile === 'object')
          ? lessonContentFile
          : ((ws.content && typeof ws.content === 'object') ? ws.content : {});
        const diskContent = { ...legacyDiskContent, ...perLearnerDiskContent };
        if (Object.keys(diskContent).length > 0 || Object.keys(adultContent).length > 0) applied = true;
        const existingContent = await idb.get('tutor-crafter-content') || {};
        await idb.set('tutor-crafter-content', serializableState({
          ...(existingContent as any),
          ...adultContent,
          ...diskContent,
        }) || {});
        if (groupContentFile !== null) await idb.set('tutor-crafter-group-content', groupContentFile || {});
        if (platformContentFile !== null) await idb.set('tutor-crafter-platform-content', platformContentFile || {});
      }
    }

    let kidsDir = await directoryHandle.getDirectoryHandle('kids_dashboard').catch(() => null);
    if (!kidsDir) kidsDir = await findDirRecursively(directoryHandle, 'kids_dashboard');
    if (kidsDir) {
        const [kingdomState, kidsSettings, kidsManifest] = await Promise.all([
        readJsonFromDisk(kidsDir, 'kingdom_state.json'),
        readJsonFromDisk(kidsDir, 'kids_settings.json'),
        readJsonFromDisk(kidsDir, 'manifest.json'),
      ]);
      let kidsState = kingdomState;
      if (!kidsState) {
        const kidsLearners: any[] = [];
        const kidsIds = new Set<string>(Array.isArray(kidsManifest?.learnerIds) ? kidsManifest.learnerIds.map(String) : []);
        for await (const entry of kidsDir.values()) {
          if (entry.kind !== 'directory' || !entry.name.startsWith('learner_')) continue;
          const data = await readLearnerFolderFromDisk(kidsDir, entry.name);
          if (data?.profile?.id && (kidsIds.size === 0 || kidsIds.has(String(data.profile.id)))) kidsLearners.push(data.profile);
        }
        if (kidsSettings || kidsLearners.length > 0) {
          kidsState = {
            learners: kidsLearners,
            storeItems: kidsSettings?.storeItems || [],
            teacher: kidsSettings?.teacher || null,
            theme: kidsSettings?.theme || 'fairy',
          };
        }
      }
      // Same guard for the kingdom: never replace existing young learners with
      // an empty roster coming from a partial backup, and keep browser-only heroes
      // unless this is an explicit “Restore All”.
      if (await applyKidsState(kidsState, kidsSettings, replaceLearners)) applied = true;
    }

    if (await restoreCustomAvatars(directoryHandle)) applied = true;
    // A missing manifest is supported for old backups. The manifest only marks a
    // backup INTERRUPTED; whether a restore succeeded is decided by whether data
    // was actually applied — the old code returned false here after already
    // restoring, which is why a good restore reported “nothing could be restored”.
    const incomplete = !!manifest && manifest.complete === false;
    lastRestoreSummary = { at: Date.now(), source: 'folder', learners: restoredLearners, incomplete };
    if (!applied && incomplete) return false;
    return applied;
  } catch (err) {
    console.error('Failed to load entire workspace from disk:', err);
    return false;
  }
}

/**
 * Restores all dashboard data and serializes it with any pending disk write.
 * By default the learner rosters are merged (the folder copy wins on conflicts,
 * browser-only learners are kept) so an automatic restore can never drop work.
 * Pass `{ replaceLearners: true }` for an explicit “Restore All from Folder”.
 */
export function loadAllFromDisk(directoryHandle: any, options?: { replaceLearners?: boolean }): Promise<boolean> {
  return enqueueDiskOperation(() => loadAllFromDiskUnlocked(directoryHandle, options));
}

export async function syncLearnerToDisk(learner: any, content?: any): Promise<boolean> {
  if (typeof window === 'undefined' || !isDiskModeEnabled()) return false;
  return enqueueDiskOperation(async () => {
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle || !(await hasDirectoryPermission(handle, true))) return false;
      // Seed the fingerprints so an immediate single-learner write also lets the
      // next background backup skip everything that did not change.
      await seedHashCache(handle);
      const adultDir = await handle.getDirectoryHandle('adult_dashboard', { create: true });
      let learnerContent = content;
      if (learnerContent === undefined) {
        learnerContent = (await get('tutor-crafter-content') as any)?.[learner?.id] ?? null;
      }
      const outcome = await writeLearnerFolderInScope(adultDir, 'adult_dashboard', learner.id, { profile: learner, content: learnerContent }, 'incremental');
      return outcome !== 'failed';
    } catch (err) {
      console.error(`[AutoSync] Failed to sync learner ${learner?.id} to disk:`, err);
      return false;
    }
  });
}

/**
 * Why the last startup restore did (or did not) bring data back. The UI uses this
 * to tell the tutor to reconnect the folder instead of silently showing an empty
 * dashboard — the exact failure that reads as “all my data is gone”.
 */
export type DiskRestoreStatus =
  | 'idle'
  | 'restored'      // folder read back in successfully
  | 'safety'        // folder was unreachable; the local safety copy was used
  | 'needs-permission' // a folder is remembered but permission has to be re-granted
  | 'no-folder'      // disk mode is on but no folder is connected
  | 'empty-folder';  // the folder is reachable but holds nothing to restore

let diskRestoreStatus: DiskRestoreStatus = 'idle';

/** Current startup-restore state (see {@link DiskRestoreStatus}). */
export function getDiskRestoreStatus(): DiskRestoreStatus {
  return diskRestoreStatus;
}

let startupRestorePromise: Promise<boolean> | null = null;
let startupRestoreListenersAttached = false;

/**
 * Single-flight startup restore shared by both dashboard routes. This is
 * important because /kids and the adult shell can mount at the same time and
 * must not race a browser rehydration against a disk restore.
 *
 * If the folder cannot be read — no handle, or the browser has reset the folder
 * permission to “ask” (which it does after a restart, and which cannot be granted
 * without a user gesture) — the never-purged safety copy is applied instead of
 * opening onto an empty app. The tutor only has to click once to reconnect the
 * folder and sync everything back to disk.
 */
export function ensureStartupDiskRestore(): Promise<boolean> {
  if (startupRestorePromise) return startupRestorePromise;
  startupRestorePromise = (async () => {
    if (typeof window === 'undefined' || !isDiskModeEnabled()) return false;
    const [learnerModule, appModule] = await Promise.all([
      import('../store/useLearnerStore'),
      import('../store/useAppStore'),
    ]);
    await Promise.all([
      learnerModule.useLearnerStore.persist.rehydrate(),
      appModule.useAppStore.persist.rehydrate(),
    ]);
    const handle = await getStoredDirectoryHandle();
    if (handle && (await hasDirectoryPermission(handle, true))) {
      const restored = await loadAllFromDisk(handle);
      diskRestoreStatus = restored ? 'restored' : 'empty-folder';
      return restored;
    }

    // No usable folder. Before giving up, check whether the browser is simply
    // empty because a purge / memory flush ran: the safety copy is the fix.
    const snapshot = await readSafetySnapshot();
    const liveLearners = learnerModule.useLearnerStore.getState().learners || [];
    const snapshotLearners = Array.isArray(snapshot?.learners) ? snapshot!.learners.length : 0;
    if (snapshotLearners > 0 && liveLearners.length === 0) {
      const ok = await restoreSafetySnapshot({ replaceLearners: true });
      diskRestoreStatus = ok ? 'safety' : (handle ? 'needs-permission' : 'no-folder');
      return ok;
    }
    diskRestoreStatus = handle ? 'needs-permission' : 'no-folder';
    return false;
  })().catch(err => {
    console.warn('[Disk Sync] Startup restore skipped:', err);
    return false;
  });
  if (!startupRestoreListenersAttached && typeof window !== 'undefined') {
    startupRestoreListenersAttached = true;
    // A folder permission granted later in the session (from any screen) should
    // immediately pull the disk copy in, without a reload.
    window.addEventListener('focus', () => {
      if (!startupRestorePromise) return;
      void (async () => {
        const handle = await getStoredDirectoryHandle();
        if (!handle) return;
        if (!(await hasDirectoryPermission(handle, true))) return;
        if (diskRestoreStatus === 'restored') return;
        const restored = await loadAllFromDisk(handle);
        diskRestoreStatus = restored ? 'restored' : 'empty-folder';
      })();
    });
  }
  return startupRestorePromise;
}

/** Restores straight from the never-purged safety copy (used by the UI). */
export function restoreFromSafetyCopy(options?: { replaceLearners?: boolean }): Promise<boolean> {
  return enqueueDiskOperation(() => restoreSafetySnapshot(options));
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let syncDeadline: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;
let syncPending = false;

async function performAutoSync(): Promise<boolean> {
  if (syncInFlight) {
    syncPending = true;
    return false;
  }
  syncInFlight = true;
  try {
    const handle = await getStoredDirectoryHandle();
    if (!handle || !(await hasDirectoryPermission(handle, true))) return false;
    return await saveAllToDisk(handle);
  } catch (err) {
    console.warn('[AutoSync] Background sync failed:', err);
    return false;
  } finally {
    syncInFlight = false;
    if (syncPending) {
      syncPending = false;
      triggerAutoSync(false);
    }
  }
}

export async function triggerAutoSyncImmediate(): Promise<boolean> {
  if (typeof window === 'undefined' || !isDiskModeEnabled()) return false;
  syncPending = false;
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (syncDeadline) { clearTimeout(syncDeadline); syncDeadline = null; }
  return performAutoSync();
}

export function triggerAutoSync(forceImmediate = false): void {
  if (typeof window === 'undefined' || !isDiskModeEnabled()) return;
  syncPending = true;

  const run = () => {
    syncTimeout = null;
    syncDeadline = null;
    if (!syncPending) return;
    syncPending = false;
    void performAutoSync();
  };

  if (forceImmediate) {
    run();
    return;
  }
  if (!syncTimeout) syncTimeout = setTimeout(run, 4000);
  // The deadline is measured from the first unsaved edit, not reset by every keystroke.
  if (!syncDeadline) syncDeadline = setTimeout(run, 45000);
}

/* ════════════════════════════════════════════════════════════════════════════
   BACK-UP SUITE — one file with EVERYTHING, and a folder restore that does not
   care how the folder is arranged
   ════════════════════════════════════════════════════════════════════════════

   The folder backup is a set of files with a fixed layout (adult_dashboard/,
   kids_dashboard/, classroom_settings.json, …). That layout is great for a
   human and for the incremental sync, but it is fragile in two ways:

     1. A tutor can only export it by having a connected folder, and there was no
        way to carry the whole workspace to another machine in ONE file.
     2. A restore assumed the layout. If the tutor picked a parent folder, or an
        older build/sync client nested the files, the restore read nothing and
        reported “nothing could be restored”.

   This section fixes both. `buildFullBackupBundle` produces a single JSON file
   holding the classroom, the adult dashboard (learners, lessons, schedules,
   todos, bookings, automations, coursebooks, platforms, tutor profile), the
   young-learners kingdom, custom photos, the raw browser + app storage (which is
   where the Game Hub and every other widget keep their state) — i.e. everything
   the folder backup writes, in one portable document. `importFullBackupFile`
   reads it back through the same store-application helpers the folder restore
   uses, so the two paths can never drift. And `resolveBackupRoot` lets the
   folder restore find the backup wherever it actually lives.

   Nothing is ever applied from an empty payload: every array is guarded the same
   way the disk restore guards it, so importing an old or partial file can add
   data but can never blank out a populated workspace. */

export const BACKUP_BUNDLE_KIND = 'tutorly-backup-suite';
export const BACKUP_BUNDLE_VERSION = 1;

export interface FullBackupBundle {
  kind: string;
  version: number;
  at: string;
  device: string;
  manifest: {
    learnerCount: number;
    kidsLearnerCount: number;
    sections: Record<string, number | boolean>;
  };
  classroom: any;
  adult: {
    workspace: any;
    platforms: any;
    groupClasses: any;
    tutorInfo: any;
    groupContent: any;
    platformContent: any;
    lessonContent: Record<string, any>;
    learners: Array<{ profile: any; content: any }>;
  };
  kids: {
    state: any;
    settings: any;
    combatHistory: any[];
    learners: any[];
  } | null;
  customAvatars: Record<string, string>;
  browserStorage: Record<string, string>;
  indexedDbStorage: Record<string, any>;
}

/** Best-effort device label so a bundle says which computer wrote it. */
function deviceLabel(): string {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const platform = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Device';
    return `${browser} on ${platform}`;
  } catch {
    return 'Browser';
  }
}

/**
 * Collects the ENTIRE workspace into one portable, self-describing document.
 *
 * This is intentionally the same set of sources `saveAllToDiskUnlocked` writes,
 * assembled the same way, so a file export and a folder backup hold the same
 * data. The one addition is the raw browser storage snapshot, which is what
 * carries the Game Hub and any other widget that keeps its own key.
 */
export async function buildFullBackupBundle(): Promise<FullBackupBundle> {
  const [learnerModule, appModule, todoModule, calendarModule, bookingModule, automationModule, coursebookModule] = await Promise.all([
    import('../store/useLearnerStore'),
    import('../store/useAppStore'),
    import('../store/useTodoStore'),
    import('../store/useCalendarStore'),
    import('../store/useBookingStore'),
    import('../store/useAutomationStore'),
    import('../store/useCoursebookStore'),
  ]);
  const idb = await import('idb-keyval');
  const [learnerContent, groupContent, platformContent, classroomLayout] = await Promise.all([
    idb.get('tutor-crafter-content'),
    idb.get('tutor-crafter-group-content'),
    idb.get('tutor-crafter-platform-content'),
    idb.get('classroom-layout'),
  ]);

  const appState = appModule.useAppStore.getState();
  const learnerState = learnerModule.useLearnerStore.getState();
  const learners = (learnerState.learners || []) as any[];
  const contentMap = (learnerContent && typeof learnerContent === 'object') ? (learnerContent as Record<string, any>) : {};
  const platforms = readLocalJson('tutor-crafter-platforms', []);
  const kidsState = await readKidsState();
  const kidsLearners = Array.isArray(kidsState?.learners) ? kidsState.learners : [];
  const combatHistory = await readCombatHistory();
  const browserStorage = snapshotBrowserStorage();
  const indexedDbStorage = await snapshotIndexedDb(idb);
  const customAvatars = await exportAllCustomAvatars();

  const classroom = {
    version: BACKUP_VERSION,
    shortcuts: readLocalJson('classroom-shortcuts', []),
    background: readLocalJson('classroom-bg', null),
    timeOffset: readLocalJson('classroom-time-offset', 0),
    theme: readLocalJson('classroom-theme', 'dark'),
    mapCities: readLocalJson('classroom-map-cities', []),
    soundBoardPads: readLocalJson('classroom-sound-board-pads', readLocalJson('classroom-sound-board-v2', null)),
    soundBoardVolume: readLocalJson('classroom-sound-board-volume', null),
    zenMode: readLocalJson('classroom-zen-mode', false),
    animateBg: readLocalJson('classroom-bg-animate', false),
    weatherCity: (() => { try { return window.localStorage.getItem('classroom-weather-city') || 'New York'; } catch { return 'New York'; } })(),
    tutorlyPremium: (() => { try { return window.localStorage.getItem('tutorly_premium') === 'true'; } catch { return false; } })(),
    tutorlyVip: (() => { try { return window.localStorage.getItem('tutorly_vip') === 'true'; } catch { return false; } })(),
    appState: serializableState(appState),
    layout: serializableState(classroomLayout),
  };

  const workspace = {
    version: BACKUP_VERSION,
    groupClasses: serializableState(learnerState.groupClasses || []),
    tutorInfo: serializableState(appState.tutorInfo || {}),
    appState: serializableState(appState),
    todos: serializableState(todoModule.useTodoStore.getState().todos || []),
    calendar: serializableState(calendarModule.useCalendarStore.getState()),
    booking: serializableState(bookingModule.useBookingStore.getState()),
    automation: serializableState(automationModule.useAutomationStore.getState()),
    coursebooks: serializableState(coursebookModule.useCoursebookStore.getState()),
    platforms,
  };

  return {
    kind: BACKUP_BUNDLE_KIND,
    version: BACKUP_BUNDLE_VERSION,
    at: new Date().toISOString(),
    device: deviceLabel(),
    manifest: {
      learnerCount: learners.length,
      kidsLearnerCount: kidsLearners.length,
      sections: {
        adultLearners: learners.length,
        kidsLearners: kidsLearners.length,
        lessons: Object.keys(contentMap).length,
        customAvatars: Object.keys(customAvatars).length,
        browserKeys: Object.keys(browserStorage).length,
        appStorageKeys: Object.keys(indexedDbStorage).length,
        kidsKingdom: kidsState ? 1 : 0,
      },
    },
    classroom,
    adult: {
      workspace,
      platforms: serializableState(platforms),
      groupClasses: serializableState(learnerState.groupClasses || []),
      tutorInfo: serializableState(appState.tutorInfo || {}),
      groupContent: serializableState(groupContent || {}),
      platformContent: serializableState(platformContent || {}),
      lessonContent: serializableState(contentMap) || {},
      learners: learners.map((learner) => ({
        profile: serializableState(learner),
        content: serializableState(contentMap[String(learner?.id)] ?? null),
      })),
    },
    kids: kidsState ? {
      state: serializableState(kidsState),
      settings: {
        storeItems: kidsState.storeItems || [],
        teacher: kidsState.teacher || null,
        theme: kidsState.theme || 'fairy',
        combat_arena_storybook_v1: combatHistory || [],
        customTeacherStamps: readLocalJson('kids_custom_teacher_stamps', []),
      },
      combatHistory: serializableState(combatHistory) || [],
      learners: serializableState(kidsLearners) || [],
    } : null,
    customAvatars,
    browserStorage,
    indexedDbStorage,
  };
}

/**
 * Accepts a bundle written by this build AND every older/other backup shape a
 * tutor might still have lying around, and normalises it to the current bundle.
 * Returns null when the document is not recognisably a Tutorly backup, so the
 * import can say so instead of silently doing nothing.
 */
export function coerceBackupBundle(raw: any): FullBackupBundle | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.kind === BACKUP_BUNDLE_KIND) return raw as FullBackupBundle;

  const out: FullBackupBundle = {
    kind: BACKUP_BUNDLE_KIND,
    version: Number(raw.version) || BACKUP_BUNDLE_VERSION,
    at: typeof raw.at === 'string' ? raw.at : (typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString()),
    device: typeof raw.device === 'string' ? raw.device : 'Imported file',
    manifest: { learnerCount: 0, kidsLearnerCount: 0, sections: {} },
    classroom: raw.classroom || raw.classroom_settings || null,
    adult: { workspace: null, platforms: null, groupClasses: null, tutorInfo: null, groupContent: null, platformContent: null, lessonContent: {}, learners: [] },
    kids: null,
    customAvatars: raw.customAvatars || raw.custom_avatars || {},
    browserStorage: raw.browserStorage || raw.browser_storage || {},
    indexedDbStorage: raw.indexedDbStorage || raw.indexeddb_storage || {},
  };
  let recognised = false;

  // A Back-up Suite bundle from an earlier build (no `kind`, keyed by section).
  if (raw.adult && typeof raw.adult === 'object') {
    Object.assign(out.adult, raw.adult);
    out.adult.learners = Array.isArray(raw.adult.learners) ? raw.adult.learners : [];
    out.adult.lessonContent = raw.adult.lessonContent && typeof raw.adult.lessonContent === 'object' ? raw.adult.lessonContent : {};
    recognised = true;
  }
  if (raw.kids && typeof raw.kids === 'object') { out.kids = raw.kids; recognised = true; }

  // Cloud payload shape: { learners, workspace, classroom, kidsState, kidsSettings }.
  if (Array.isArray(raw.learners) && raw.workspace && typeof raw.workspace === 'object') {
    out.adult.workspace = raw.workspace;
    out.adult.learners = raw.learners.map((profile: any) => ({ profile, content: null }));
    out.adult.platforms = raw.workspace.platforms ?? null;
    out.adult.groupClasses = raw.workspace.groupClasses ?? null;
    out.adult.tutorInfo = raw.workspace.tutorInfo ?? null;
    if (raw.kidsState || raw.kidsSettings) {
      out.kids = {
        state: raw.kidsState || null,
        settings: raw.kidsSettings || null,
        combatHistory: raw.kidsSettings?.combat_arena_storybook_v1 || [],
        learners: Array.isArray(raw.kidsState?.learners) ? raw.kidsState.learners : [],
      };
    }
    recognised = true;
  }

  // Kids-only legacy export (\"Export ALL Data\" in the kingdom settings).
  if (!recognised && (raw._format === 'KidsLearningKingdom_FullBackup'
      || (Array.isArray(raw.learners) && (raw.storeItems || raw.combatArenaHistory) && !raw.workspace && !raw.content))) {
    out.kids = {
      state: { learners: Array.isArray(raw.learners) ? raw.learners : [], storeItems: raw.storeItems || [], teacher: raw.teacher ?? null, theme: raw.theme || 'fairy' },
      settings: { storeItems: raw.storeItems || [], teacher: raw.teacher ?? null, theme: raw.theme || 'fairy', combat_arena_storybook_v1: raw.combatArenaHistory || [] },
      combatHistory: raw.combatArenaHistory || [],
      learners: Array.isArray(raw.learners) ? raw.learners : [],
    };
    recognised = true;
  }

  // Adult manual export (the older “Download a backup file” / dashboard export).
  if (!recognised && Array.isArray(raw.learners)) {
    const lessonContent = (raw.content && typeof raw.content === 'object') ? raw.content : {};
    out.adult.lessonContent = lessonContent;
    out.adult.learners = raw.learners.map((profile: any) => ({ profile, content: lessonContent[String(profile?.id)] ?? null }));
    out.adult.groupContent = raw.groupContent ?? null;
    out.adult.platformContent = raw.platformContent ?? null;
    out.adult.platforms = raw.platforms ?? null;
    out.adult.groupClasses = raw.groupClasses ?? null;
    out.adult.tutorInfo = raw.tutorProfile ?? null;
    out.adult.workspace = {
      version: BACKUP_VERSION,
      groupClasses: raw.groupClasses ?? [],
      tutorInfo: raw.tutorProfile ?? {},
      platforms: raw.platforms ?? [],
      appName: raw.appName,
      appAddress: raw.appAddress,
    };
    recognised = true;
  }

  // A folder itself saved as one JSON ({classroom_settings, adult_dashboard, kids_dashboard}).
  if (!recognised && (raw.adult_dashboard || raw.kids_dashboard || raw.classroom_settings)) {
    out.classroom = raw.classroom_settings ?? out.classroom;
    if (raw.adult_dashboard) {
      const a = raw.adult_dashboard;
      out.adult.workspace = a.workspace_state ?? null;
      out.adult.platforms = a.platforms ?? null;
      out.adult.groupClasses = a.group_classes ?? null;
      out.adult.tutorInfo = a.tutor_profile ?? null;
      out.adult.groupContent = a.group_content ?? null;
      out.adult.platformContent = a.platform_content ?? null;
      out.adult.lessonContent = a.lesson_content ?? {};
    }
    if (raw.kids_dashboard) {
      out.kids = {
        state: raw.kids_dashboard.kingdom_state ?? null,
        settings: raw.kids_dashboard.kids_settings ?? null,
        combatHistory: raw.kids_dashboard.kids_settings?.combat_arena_storybook_v1 ?? [],
        learners: raw.kids_dashboard.kingdom_state?.learners ?? [],
      };
    }
    recognised = true;
  }

  return recognised ? out : null;
}

/**
 * Applies a (possibly older-shaped) backup document to the live stores.
 *
 * Every section goes through the same helpers the folder restore uses
 * (`applyWorkspaceToStores`, `applyClassroomSettings`, `applyKidsState`) so a file
 * import and a folder restore can never disagree about how data is merged. Empty
 * arrays in a partial backup are ignored by those helpers, which is why importing
 * an incomplete file can only fill gaps, never erase work.
 */
export async function applyFullBackupBundle(
  raw: any,
  options?: { replaceLearners?: boolean; source?: 'file' | 'folder' },
): Promise<{ ok: boolean; learners: number; bundle: FullBackupBundle | null }> {
  const bundle = coerceBackupBundle(raw);
  if (!bundle) return { ok: false, learners: 0, bundle: null };
  const replaceLearners = options?.replaceLearners !== false;
  let applied = false;
  let restored = 0;
  try {
    const idb = await import('idb-keyval');

    // Lesson content first, so a restored profile can find its lessons.
    if (bundle.adult.lessonContent && Object.keys(bundle.adult.lessonContent).length > 0) {
      const existing = (await idb.get('tutor-crafter-content')) || {};
      await idb.set('tutor-crafter-content', serializableState({ ...(existing as any), ...bundle.adult.lessonContent }) || {});
      applied = true;
    }
    if (bundle.adult.groupContent) { await idb.set('tutor-crafter-group-content', bundle.adult.groupContent); applied = true; }
    if (bundle.adult.platformContent) { await idb.set('tutor-crafter-platform-content', bundle.adult.platformContent); applied = true; }

    const incoming = (bundle.adult.learners || []).map((entry) => entry?.profile).filter(Boolean);
    if (incoming.length > 0) {
      const { useLearnerStore } = await import('../store/useLearnerStore');
      const store = useLearnerStore.getState();
      const next = replaceLearners
        ? incoming
        : Array.from(new Map([
            ...(store.learners || []).map((learner: any) => [String(learner.id), learner] as const),
            ...incoming.map((learner: any) => [String(learner.id), learner] as const),
          ]).values());
      useLearnerStore.setState({ learners: next });
      restored = incoming.length;
      applied = true;
    }

    if (bundle.browserStorage && Object.keys(bundle.browserStorage).length > 0) { restoreBrowserStorage(bundle.browserStorage); applied = true; }
    if (bundle.indexedDbStorage && Object.keys(bundle.indexedDbStorage).length > 0) { await restoreIndexedDb(idb, bundle.indexedDbStorage); applied = true; }

    if (bundle.classroom) {
      applyClassroomSettings(bundle.classroom);
      if (bundle.classroom.layout !== undefined) await set('classroom-layout', bundle.classroom.layout);
      applied = true;
    }

    const overrides: any = {};
    if (bundle.adult.groupClasses !== null && bundle.adult.groupClasses !== undefined) overrides.groupClasses = bundle.adult.groupClasses;
    if (bundle.adult.platforms !== null && bundle.adult.platforms !== undefined) overrides.platforms = bundle.adult.platforms;
    if (bundle.adult.tutorInfo !== null && bundle.adult.tutorInfo !== undefined) overrides.tutorInfo = bundle.adult.tutorInfo;
    if (await applyWorkspaceToStores(bundle.adult.workspace || {}, overrides)) applied = true;

    if (bundle.kids) {
      const kidsApplied = await applyKidsState(bundle.kids.state, bundle.kids.settings, replaceLearners);
      if (kidsApplied) applied = true;
      else if (Array.isArray(bundle.kids.combatHistory) && bundle.kids.combatHistory.length > 0) {
        await writeCombatHistory(bundle.kids.combatHistory);
        applied = true;
      }
    }

    if (await applyCustomAvatarsMap(bundle.customAvatars)) applied = true;

    lastRestoreSummary = {
      at: Date.now(),
      source: options?.source === 'file' ? 'file' : 'folder',
      learners: restored,
      incomplete: false,
    };
    return { ok: applied, learners: restored, bundle };
  } catch (err) {
    console.error('Failed to apply the backup bundle:', err);
    return { ok: false, learners: restored, bundle };
  }
}

/**
 * Downloads every bit of the workspace as a single JSON file. Works with no
 * folder connected at all, which is the case on a phone or a locked-down browser.
 */
export async function downloadFullBackupFile(): Promise<{ ok: boolean; error?: string; bytes?: number; learners?: number }> {
  try {
    const bundle = await buildFullBackupBundle();
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tutorly-backup-suite-${stamp}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, bytes: blob.size, learners: bundle.manifest.learnerCount };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Reads a backup file (in any supported shape) back into the workspace. Serialized
 * with every other disk operation so it cannot race a background sync.
 */
export async function importFullBackupFile(file: Blob): Promise<{ ok: boolean; error?: string; learners?: number }> {
  try {
    const text = await file.text();
    if (!text.trim()) return { ok: false, error: 'The file is empty.' };
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'The file is not valid JSON.' }; }
    const res = await enqueueDiskOperation(() => applyFullBackupBundle(parsed, { replaceLearners: true, source: 'file' }));
    if (!res.ok) {
      return { ok: false, error: "This file doesn't look like a Tutorly back-up — no learners, workspace or kingdom were found in it." };
    }
    return { ok: true, learners: res.learners };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'The file could not be read.' };
  }
}

/* ── Structure-agnostic folder discovery ─────────────────────────────────── */

const BACKUP_SCAN_MAX_DEPTH = 3;
const BACKUP_SCAN_MAX_ENTRIES = 4000;
const BACKUP_SCAN_MAX_DIRS_TESTED = 80;

interface TreeEntry { handle: any; kind: 'file' | 'directory'; name: string; path: string }

/**
 * Breadth-first walk of a directory tree, bounded in both depth and total entries
 * so pointing the backup at a huge folder (a Downloads directory, a drive root)
 * can never hang the UI. Unreadable entries are skipped rather than thrown.
 */
async function* walkTree(root: any, maxDepth = BACKUP_SCAN_MAX_DEPTH): AsyncGenerator<TreeEntry> {
  if (!root || typeof root.values !== 'function') return;
  let visited = 0;
  const queue: Array<{ dir: any; depth: number; prefix: string }> = [{ dir: root, depth: 0, prefix: '' }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth > maxDepth) continue;
    let iterator: any;
    try { iterator = current.dir.values(); } catch { continue; }
    try {
      for await (const entry of iterator) {
        if (visited >= BACKUP_SCAN_MAX_ENTRIES) return;
        visited += 1;
        const path = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
        yield { handle: entry, kind: entry.kind, name: entry.name, path };
        if (entry.kind === 'directory' && current.depth + 1 <= maxDepth) {
          queue.push({ dir: entry, depth: current.depth + 1, prefix: path });
        }
      }
    } catch {
      // A permission error on one branch must not stop the whole scan.
    }
  }
}

async function readJsonFromFileHandle(fileHandle: any): Promise<any> {
  try {
    const file = await fileHandle.getFile();
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

/** Reads a JSON file from the root, or from anywhere in the tree as a fallback. */
async function readJsonFromTree(root: any, fileName: string): Promise<any> {
  const direct = await readJsonFromDisk(root, fileName);
  if (direct !== null && direct !== undefined) return direct;
  for await (const entry of walkTree(root, 2)) {
    if (entry.kind === 'file' && entry.name === fileName) return readJsonFromFileHandle(entry.handle);
  }
  return null;
}

async function findDirRecursively(root: any, name: string): Promise<any | null> {
  for await (const entry of walkTree(root, BACKUP_SCAN_MAX_DEPTH)) {
    if (entry.kind === 'directory' && entry.name === name) return entry.handle;
  }
  return null;
}

const BACKUP_SIGNATURE_DIRS = ['adult_dashboard', 'kids_dashboard'];
const BACKUP_SIGNATURE_FILES = [BACKUP_MANIFEST, 'classroom_settings.json', 'browser_storage.json', 'custom_avatars.json', 'indexeddb_storage.json'];

/** True when the directory holds the folder backup layout the engine writes. */
async function dirHasFolderLayout(dir: any): Promise<boolean> {
  if (!dir || typeof dir.getDirectoryHandle !== 'function') return false;
  for (const name of BACKUP_SIGNATURE_DIRS) {
    if (await dir.getDirectoryHandle(name).then(() => true).catch(() => false)) return true;
  }
  for (const name of [BACKUP_MANIFEST, 'classroom_settings.json', 'browser_storage.json', 'custom_avatars.json']) {
    if (await dir.getFileHandle(name).then(() => true).catch(() => false)) return true;
  }
  return false;
}

/** True when this directory looks like the root of a backup (layout OR a file). */
async function dirLooksLikeBackup(dir: any): Promise<boolean> {
  if (!dir || typeof dir.getDirectoryHandle !== 'function') return false;
  for (const name of BACKUP_SIGNATURE_DIRS) {
    if (await dir.getDirectoryHandle(name).then(() => true).catch(() => false)) return true;
  }
  for (const name of BACKUP_SIGNATURE_FILES) {
    if (await dir.getFileHandle(name).then(() => true).catch(() => false)) return true;
  }
  // A Back-up Suite file (or an older export) sitting in this directory also counts.
  try {
    let seen = 0;
    for await (const entry of dir.values()) {
      if (seen++ > 200) break;
      if (entry.kind === 'file' && /\.json$/i.test(entry.name) && /backup|bundle|kingdom|export|tutorly/i.test(entry.name)) return true;
    }
  } catch { /* not scannable */ }
  return false;
}

/**
 * Finds the directory the restore should actually read.
 *
 * Picks the folder the tutor connected when it already holds a backup; otherwise
 * searches (bounded) for the subfolder that does. Falls back to the connected
 * folder so legacy layouts keep working exactly as before.
 */
export async function resolveBackupRoot(root: any): Promise<any> {
  try {
    if (await dirLooksLikeBackup(root)) return root;
    let tested = 0;
    for await (const entry of walkTree(root, BACKUP_SCAN_MAX_DEPTH)) {
      if (entry.kind !== 'directory') continue;
      if (tested >= BACKUP_SCAN_MAX_DIRS_TESTED) break;
      tested += 1;
      if (await dirLooksLikeBackup(entry.handle)) {
        console.info(`[Back-up Suite] Reading the backup from "${entry.path}" inside the connected folder.`);
        return entry.handle;
      }
    }
  } catch (err) {
    console.warn('[Back-up Suite] Folder discovery skipped:', err);
  }
  return root;
}

/**
 * Finds a manual Back-up Suite / legacy export file anywhere near the root, so a
 * file the tutor dropped into their sync folder can be restored with the same
 * “Restore from folder” button.
 */
async function findBundleFile(root: any): Promise<any | null> {
  for await (const entry of walkTree(root, 2)) {
    if (entry.kind !== 'file' || !/\.json$/i.test(entry.name)) continue;
    if (!/backup|bundle|kingdom|export|tutorly/i.test(entry.name)) continue;
    const parsed = await readJsonFromFileHandle(entry.handle);
    if (parsed && coerceBackupBundle(parsed)) return parsed;
  }
  return null;
}
