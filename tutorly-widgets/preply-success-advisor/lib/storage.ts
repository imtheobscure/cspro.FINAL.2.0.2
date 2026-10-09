import type { AppState, Task, Tutor } from "../types";
import { DEFAULT_RIAL_PER_USD } from "./format";
import { emptyAccount, newTask, newTutor, uniquePlatformIds } from "./domain";

/**
 * Persistence: nothing you type is ever lost.
 *
 * Three layers, in order of how much you have to trust them:
 *
 * 1. **localStorage** — written on every change, debounced. This is what survives a
 *    refresh and a closed tab.
 * 2. **A folder on your disk** — with one click you pick a folder (the File System
 *    Access API) and from then on every change is written into
 *    `tutorly-advisor-data.json` inside it. That file is your real backup: it sits in
 *    your OneDrive/Dropbox folder if you want it to, and it syncs itself.
 * 3. **Manual export/import** — a plain JSON file, for moving between machines.
 *
 * The folder handle is stored in IndexedDB because a `FileSystemDirectoryHandle` is
 * structured-cloneable but not JSON-serializable.
 *
 * ── Sharing an origin with the main app ──────────────────────────────────────
 * This build is served from the same origin as the tutor app (which has its own
 * "save to hard disk" feature), so both apps sit in one browser profile. That is
 * deliberate: one backup folder holds everything, and a single restore on a new
 * machine brings back both apps.
 *
 * The contract that keeps them from stepping on each other — do not break it:
 *
 *   - This app owns `psa.*` (and the legacy `tutorProfiles`) and the file
 *     `tutorly-advisor-data.json`. It must never write, clear or rename any other
 *     key or file: no `localStorage.clear()`, no `removeItem` for foreign keys, no
 *     writing `browser_storage.json` or anything under `adult_dashboard/`.
 *   - It also owns its own IndexedDB database (`psa-handles`), separate from the
 *     main app's idb-keyval store, so its folder handle can never be clobbered by
 *     the main app's IndexedDB restore.
 *   - In the other direction, the main app snapshots this app's localStorage into
 *     its own backup, but on restore it only *seeds* `psa.*` when the browser has
 *     nothing for it — it never rolls live advisor data back to an older copy.
 *     So restoring the main app can never lose advisor work.
 */

export const STORAGE_KEY = "psa.state.v2";
export const LEGACY_KEY = "tutorProfiles"; // the previous version of this app
export const DATA_FILE = "tutorly-advisor-data.json";
const IDB_NAME = "psa-handles";
const IDB_STORE = "handles";/*
 * 3 — the mentor's own tasks and reminders joined the state (`tasks`). A file written by
 * version 2 simply has no `tasks` key, which reads as an empty list, so nothing to move.
 */
export const STATE_VERSION = 3;

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    tutors: [],
    tasks: [],
    customPlatforms: [],
    toman: { rialPerUsd: DEFAULT_RIAL_PER_USD, updatedAt: new Date().toISOString(), source: "app default", live: false },
    prefs: { keepRawLogs: false, autoRateRefresh: true },
  };
}

/* ------------------------------------------------------------- localStorage -- */

/**
 * Read the saved state.
 *
 * Also migrates the previous version of this app: it kept an array of profiles under
 * `tutorProfiles`, and throwing those away because the schema changed would be
 * exactly the data loss this app exists to prevent.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return coerceState(parsed);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const profiles = JSON.parse(legacy) as Record<string, unknown>[];
      const migrated = profiles.map((p) => migrateLegacyProfile(p));
      if (migrated.length) {
        const state: AppState = { ...emptyState(), tutors: migrated };
        saveLocal(state);
        return state;
      }
    }
  } catch (error) {
    console.error("Could not read saved state:", error);
  }
  return emptyState();
}

function migrateLegacyProfile(p: Record<string, unknown>): Tutor {
  const asStrings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return newTutor({
    name: String(p.name ?? "Unnamed tutor"),
    sourceText: String(p.sourceText ?? ""),
    phase: "preparing",
    account: {
      ...emptyAccount(),
      headlines: asStrings(p.headlines),
      description: String(p.description ?? ""),
      videoScripts: Array.isArray(p.videoScripts)
        ? (p.videoScripts as Record<string, unknown>[]).map((s) => ({
            plain: String(s?.plain ?? ""),
            pronunciation: String(s?.pronunciation ?? ""),
          }))
        : [],
      yearsOfExperience: Number(p.yearsOfExperience ?? 0),
      subjects: Array.isArray(p.subjects)
        ? (p.subjects as Record<string, unknown>[]).map((s) => ({
            name: String(s?.name ?? ""),
            description: String(s?.description ?? ""),
          }))
        : [],
      proficiencyLevels: asStrings(p.proficiencyLevels),
      ageGroups: asStrings(p.ageGroups),
    },
    tags: ["imported from the previous version"],
  });
}

/** Fill in anything a hand-edited or older file is missing. */
export function coerceState(parsed: Partial<AppState>): AppState {
  const base = emptyState();
  return {
    ...base,
    ...parsed,
    version: STATE_VERSION,
    tutors: Array.isArray(parsed.tutors) ? parsed.tutors.map((t) => coerceTutor(t)) : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((t) => coerceTask(t)) : [],
    customPlatforms: Array.isArray(parsed.customPlatforms) ? parsed.customPlatforms : [],
    toman: {
      rialPerUsd: Number(parsed.toman?.rialPerUsd) || DEFAULT_RIAL_PER_USD,
      updatedAt: parsed.toman?.updatedAt || new Date().toISOString(),
      source: parsed.toman?.source ?? "you",
      live: parsed.toman?.live ?? false,
    },
    prefs: {
      keepRawLogs: parsed.prefs?.keepRawLogs ?? false,
      autoRateRefresh: parsed.prefs?.autoRateRefresh ?? true,
    },
  };
}

/**
 * Fill in whatever a hand-edited, older or AI-written task record is missing.
 *
 * The one thing worth repairing rather than trusting: a task must have a date. A record
 * with none would vanish from every sorted list in the app, so it is dated today — which
 * puts it in front of the mentor, where a task belongs.
 */
export function coerceTask(t: Partial<Task>): Task {
  const fresh = newTask();
  const dueAt = typeof t.dueAt === "string" && t.dueAt ? t.dueAt : fresh.dueAt;
  return {
    ...fresh,
    ...t,
    id: typeof t.id === "string" && t.id ? t.id : fresh.id,
    title: typeof t.title === "string" ? t.title : "",
    detail: typeof t.detail === "string" ? t.detail : "",
    dueAt: dueAt.length >= 10 ? dueAt.slice(0, 10) : dueAt,
    remindDaysBefore: Number.isFinite(Number(t.remindDaysBefore)) ? Math.max(0, Number(t.remindDaysBefore)) : fresh.remindDaysBefore,
    tutorId: typeof t.tutorId === "string" ? t.tutorId : "",
    kind: t.kind === "reminder" ? "reminder" : "task",
    done: t.done === true,
    createdAt: typeof t.createdAt === "string" && t.createdAt ? t.createdAt : fresh.createdAt,
  };
}

function coerceTutor(t: Partial<Tutor>): Tutor {
  const fresh = newTutor();
  const account = { ...emptyAccount(), ...(t.account ?? {}) };
  return {
    ...fresh,
    ...t,
    // Records saved before multi-platform existed have no `platformIds`. Deriving it from
    // the primary keeps one rule everywhere: the list always contains `platformId`.
    latinName: typeof t.latinName === "string" ? t.latinName : "",
    platformIds: uniquePlatformIds(
      typeof t.platformId === "string" && t.platformId ? t.platformId : fresh.platformId,
      Array.isArray(t.platformIds) ? t.platformIds.filter((id): id is string => typeof id === "string") : [],
    ),
    account: {
      ...account,
      extra: account.extra ?? {},
      videoScripts: Array.isArray(account.videoScripts) ? account.videoScripts : [],
      headlines: Array.isArray(account.headlines) ? account.headlines : [],
      subjects: Array.isArray(account.subjects) ? account.subjects : [],
      certificates: Array.isArray(account.certificates) ? account.certificates : [],
      specialties: Array.isArray(account.specialties) ? account.specialties : [],
      proficiencyLevels: Array.isArray(account.proficiencyLevels) ? account.proficiencyLevels : [],
      ageGroups: Array.isArray(account.ageGroups) ? account.ageGroups : [],
    },
    sourceText: typeof t.sourceText === "string" ? t.sourceText : "",
    notes: typeof t.notes === "string" ? t.notes : "",
    // The reason a tutor is on hold, and when it was written. Kept as `undefined` rather than an
    // empty string so "no reason written yet" stays distinguishable from "the reason was cleared".
    holdNote: typeof t.holdNote === "string" ? t.holdNote : undefined,
    holdNoteAt: typeof t.holdNoteAt === "string" ? t.holdNoteAt : undefined,
    snapshots: Array.isArray(t.snapshots) ? t.snapshots : [],
    // Logs written before the clean-version change kept the pasted text in `raw`;
    // where there is no summary yet, that text becomes the log so nothing is lost.
    logs: (Array.isArray(t.logs) ? t.logs : []).map((l) => ({
      ...l,
      summary: l.summary || l.raw || "",
      language: l.language ?? "",
    })),
    messages: Array.isArray(t.messages) ? t.messages : [],
    auditHistory: Array.isArray(t.auditHistory)
      ? t.auditHistory
      : t.audit
        ? [{ at: t.audit.at ?? new Date().toISOString(), powerScore: t.audit.powerScore, successProbability: t.audit.successProbability }]
        : [],
    tags: Array.isArray(t.tags) ? t.tags : [],
    phase: t.phase ?? "preparing",
    phaseSince: t.phaseSince ?? t.createdAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

export function saveLocal(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Could not save to localStorage (is it full?):", error);
  }
}

/* ------------------------------------------------------- IndexedDB handles -- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const request = tx.objectStore(IDB_STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

/* -------------------------------------------------------- folder directory -- */

/** Minimal shapes for the File System Access API, so this compiles everywhere. */
interface FsWritable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FsFileHandle {
  createWritable(): Promise<FsWritable>;
  getFile(): Promise<File>;
}
interface FsDirectoryHandle {
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FsFileHandle>;
  queryPermission?(descriptor: { mode: string }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: string }): Promise<PermissionState>;
}
interface PickerWindow {
  showDirectoryPicker?: (options?: { mode?: string; id?: string }) => Promise<FsDirectoryHandle>;
}

export const folderSyncSupported = (): boolean =>
  typeof window !== "undefined" && typeof (window as unknown as PickerWindow).showDirectoryPicker === "function";

/** Ask the mentor to choose the folder the data file lives in. */
export async function pickFolder(): Promise<{ name: string; handle: FsDirectoryHandle } | null> {
  const picker = (window as unknown as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: "readwrite", id: "tutorly-advisor" });
    await idbSet("dir", handle);
    return { name: handle.name, handle };
  } catch {
    return null; // the mentor cancelled the picker
  }
}

export async function storedFolder(): Promise<FsDirectoryHandle | undefined> {
  try {
    return await idbGet<FsDirectoryHandle>("dir");
  } catch {
    return undefined;
  }
}

export async function forgetFolder(): Promise<void> {
  await idbSet("dir", undefined);
}

/**
 * A handle that survives a reload still needs permission, and permission can only be
 * requested from a user gesture — so this reports what state it is in and lets the
 * Settings screen offer the "Reconnect" button when needed.
 */
export async function folderPermission(handle: FsDirectoryHandle): Promise<"granted" | "prompt" | "denied"> {
  try {
    if (!handle.queryPermission) return "granted";
    const state = await handle.queryPermission({ mode: "readwrite" });
    return state === "granted" ? "granted" : state === "denied" ? "denied" : "prompt";
  } catch {
    return "prompt";
  }
}

export async function reconnectFolder(handle: FsDirectoryHandle): Promise<boolean> {
  try {
    if (!handle.requestPermission) return true;
    return (await handle.requestPermission({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/**
 * The main tutor app writes this file into the folder you give it. Finding it means
 * both apps are pointed at the same folder — which is the setup that makes a single
 * restore bring everything back. Nothing is ever read from it; it is only a signal,
 * so this app still owns exactly one file.
 */
export const MAIN_APP_MANIFEST = "tutorly_backup_manifest.json";

export async function folderSharedWithMainApp(handle: FsDirectoryHandle): Promise<boolean> {
  try {
    await handle.getFileHandle(MAIN_APP_MANIFEST);
    return true;
  } catch {
    return false;
  }
}

/** Write the whole state into the chosen folder. Returns the file name written. */
export async function writeToFolder(handle: FsDirectoryHandle, state: AppState): Promise<string> {
  const file = await handle.getFileHandle(DATA_FILE, { create: true });
  const writable = await file.createWritable();
  await writable.write(JSON.stringify({ ...state, savedAt: new Date().toISOString() }, null, 2));
  await writable.close();
  return `${handle.name}/${DATA_FILE}`;
}

/** Read the state back out of the folder (used when you move to a new machine). */
export async function readFromFolder(handle: FsDirectoryHandle): Promise<AppState | null> {
  try {
    const file = await handle.getFileHandle(DATA_FILE);
    const blob = await file.getFile();
    const text = await blob.text();
    return coerceState(JSON.parse(text) as Partial<AppState>);
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- export / import -- */

export function downloadJson(state: AppState, filename = "preply-success-advisor-backup.json"): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<AppState> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<AppState> & { savedAt?: string };
  // Accept a bare array of tutors too — an export from an earlier version, or a
  // hand-trimmed file, should still come back in.
  if (Array.isArray(parsed)) return coerceState({ tutors: parsed as Tutor[] });
  return coerceState(parsed);
}

/* ------------------------------------------------------------- auto-sync ---- */

/**
 * Debounced folder writer.
 *
 * Every keystroke-level change calls `schedule()`, and one write lands 1.2 seconds
 * after the last change — so typing in a description does not hammer the disk, and
 * nothing is lost if the tab is closed right after.
 */
export class FolderSync {
  private timer: number | null = null;
  private pending: AppState | null = null;
  private handle: FsDirectoryHandle | null = null;
  private shared = false;
  private onStatus: (status: { at: string; file: string; shared: boolean } | { error: string }) => void;

  constructor(onStatus: (status: { at: string; file: string; shared: boolean } | { error: string }) => void) {
    this.onStatus = onStatus;
  }

  attach(handle: FsDirectoryHandle | null) {
    this.handle = handle;
  }

  /** True when the folder is also the main tutor app's backup folder. */
  setShared(shared: boolean) {
    this.shared = shared;
  }

  get active(): boolean {
    return !!this.handle;
  }

  schedule(state: AppState) {
    if (!this.handle) return;
    this.pending = state;
    if (this.timer != null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), 1200);
  }

  async flush(): Promise<void> {
    if (!this.handle || !this.pending) return;
    const state = this.pending;
    this.pending = null;
    try {
      const file = await writeToFolder(this.handle, state);
      this.onStatus({ at: new Date().toISOString(), file, shared: this.shared });
    } catch (error) {
      this.onStatus({ error: error instanceof Error ? error.message : "write failed" });
    }
  }

  /** Write immediately — used before import/export so the folder is never behind. */
  async flushNow(state: AppState): Promise<void> {
    this.pending = state;
    await this.flush();
  }
}
