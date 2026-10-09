/**
 * A content pack the learner loaded from their own computer.
 *
 * Lingo normally reads `content/tutolingo-content.json` next to the app. That
 * is fine on a laptop where the file can be dropped into the web root, but it is
 * useless on a phone or on a deployed site: there is nowhere to put the file.
 *
 * So a pack can also be loaded straight from the browser — dropped on Home, pasted
 * on the AI Prompt page, or handed over by the Checker — and it is kept in
 * IndexedDB. IndexedDB (not localStorage) because a real pack is a *massive* JSON
 * file: localStorage caps out around 5 MB per origin and silently throws when the
 * pack is bigger, while IndexedDB stores tens of megabytes happily.
 *
 * The stored record is the NORMALISED pack, pretty printed: it is exactly what the
 * app loads, so what the Checker reads and what the learner downloads is never a
 * different dialect from what the lesson engine sees.
 */
import { normalizePack, type ContentPack } from "@/content/tutolingo";

const DB_NAME = "tutolingo-content";
const DB_VERSION = 1;
const STORE = "packs";
const KEY = "active";

export interface LocalPackRecord {
  /** File name (or a short label such as "pasted on the AI Prompt page"). */
  name: string;
  /** The pack as pretty-printed JSON — what the app loads and offers for download. */
  json: string;
  savedAt: number;
}

/* ------------------------------- IndexedDB -------------------------------- */

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB is unavailable"));
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("The request failed"));
        tx.oncomplete = () => db.close();
        tx.onabort = () => db.close();
      }),
  );
}

/** The stored pack, or `null` when there is none (or storage is blocked). */
export async function readLocalPack(): Promise<LocalPackRecord | null> {
  if (!hasIndexedDb()) return null;
  try {
    const record = await run<LocalPackRecord | undefined>("readonly", (s) => s.get(KEY) as IDBRequest<LocalPackRecord | undefined>);
    if (!record || typeof record.json !== "string" || !record.json.trim()) return null;
    return { name: typeof record.name === "string" && record.name.trim() ? record.name : "uploaded pack", json: record.json, savedAt: record.savedAt || Date.now() };
  } catch {
    return null;
  }
}

/** Persist the pack so it survives a reload. Throws when the browser refuses. */
export async function saveLocalPack(record: LocalPackRecord): Promise<void> {
  if (!hasIndexedDb()) throw new Error("This browser cannot store the file locally");
  await run("readwrite", (s) => s.put(record, KEY));
}

export async function clearLocalPack(): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    /* nothing stored — nothing to clear */
  }
}

/* --------------------------------- parsing -------------------------------- */

/** Parse an already-clean pack (the stored record, or a `JSON.parse`-able file). */
export function parsePackJson(text: string): ContentPack {
  return normalizePack(JSON.parse(text));
}

/* --------------------------------- files ---------------------------------- */

/** Hand a text file to the browser's download manager. */
export function downloadTextFile(filename: string, text: string, mime = "application/json;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Read a dropped/selected file as text, with a size guard for the giant packs. */
export const MAX_PACK_BYTES = 40 * 1024 * 1024;

export async function readPackFile(file: File): Promise<string> {
  if (file.size > MAX_PACK_BYTES) {
    throw new Error(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB — the limit is ${MAX_PACK_BYTES / 1048576} MB`);
  }
  return file.text();
}
