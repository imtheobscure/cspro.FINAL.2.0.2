import { get, set, del } from 'idb-keyval';
import type { TranscriptEntry, AppSettings, SpeakerConfig, SessionProfile } from '../types';

const SETTINGS_KEY = 'tutorly_settings';
const SPEAKERS_KEY = 'tutorly_speakers';
const SESSIONS_KEY = 'tutorly_sessions';
const ACTIVE_SESSION_KEY = 'tutorly_active_session';
const CHUNK_SIZE = 50;

function metaKey(sid: string) { return `tm_${sid}`; }
function chunkKey(sid: string, i: number) { return `tc_${sid}_${i}`; }

interface ChunkMeta { chunkCount: number; totalEntries: number; }

// ── Session management (simple, no async init loops) ─────────────────────

let _activeId: string = localStorage.getItem(ACTIVE_SESSION_KEY) || '';
let _initDone = false;

// Synchronous getter – never triggers creation
export function getActiveSessionIdSync(): string { return _activeId; }

// Call once at app startup
export async function initStorage(): Promise<void> {
  if (_initDone) return;
  _initDone = true;
  if (!_activeId) {
    // First ever launch – create a default session
    _activeId = await createSession('Student');
  }
}

export async function createSession(learnerName: string): Promise<string> {
  const id = `s${Date.now()}`;
  const profile: SessionProfile = { id, learnerName, createdAt: Date.now(), entryCount: 0 };
  const list = await getSessions();
  list.push(profile);
  await set(SESSIONS_KEY, list);
  await set(metaKey(id), { chunkCount: 0, totalEntries: 0 } as ChunkMeta);
  _activeId = id;
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
  return id;
}

export async function getSessions(): Promise<SessionProfile[]> {
  try { return (await get<SessionProfile[]>(SESSIONS_KEY)) ?? []; }
  catch { return []; }
}

export async function switchSession(sessionId: string): Promise<void> {
  _activeId = sessionId;
  localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const m = await get<ChunkMeta>(metaKey(sessionId));
    if (m) { for (let i = 0; i < m.chunkCount; i++) await del(chunkKey(sessionId, i)); }
    await del(metaKey(sessionId));
  } catch {}
  const list = await getSessions();
  await set(SESSIONS_KEY, list.filter(p => p.id !== sessionId));
  if (_activeId === sessionId) { _activeId = ''; localStorage.removeItem(ACTIVE_SESSION_KEY); }
}

// ── Append (lightweight – max 2 IDB ops) ─────────────────────────────────

// Batch: collect entries, flush periodically
let _pendingEntries: TranscriptEntry[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

async function doFlush(): Promise<void> {
  _flushTimer = null;
  if (_pendingEntries.length === 0) return;
  const batch = _pendingEntries;
  _pendingEntries = [];

  const sid = _activeId;
  if (!sid) return;

  try {
    let m: ChunkMeta = (await get<ChunkMeta>(metaKey(sid))) ?? { chunkCount: 0, totalEntries: 0 };
    const idx = Math.max(0, m.chunkCount - 1);
    let chunk: TranscriptEntry[] = m.chunkCount === 0 ? [] : ((await get<TranscriptEntry[]>(chunkKey(sid, idx))) ?? []);

    for (const entry of batch) {
      chunk.push(entry);
      m.totalEntries++;
      if (chunk.length >= CHUNK_SIZE) {
        await set(chunkKey(sid, idx), chunk);
        m.chunkCount = idx + 1 + 1;
        chunk = [];
        await set(chunkKey(sid, m.chunkCount - 1), chunk);
      }
    }

    if (chunk.length > 0) {
      const ci = Math.max(0, m.chunkCount - 1);
      await set(chunkKey(sid, ci), chunk);
      if (m.chunkCount === 0) m.chunkCount = 1;
    }

    await set(metaKey(sid), m);

    // Update profile entry count (single write, not per-entry)
    try {
      const list = await getSessions();
      const p = list.find(x => x.id === sid);
      if (p) { p.entryCount = m.totalEntries; await set(SESSIONS_KEY, list); }
    } catch {}
  } catch (e) {
    console.warn('Storage flush failed:', e);
  }
}

export function appendTranscriptEntry(entry: TranscriptEntry): void {
  _pendingEntries.push(entry);
  // Debounce: flush every 3 seconds (not per-entry!)
  if (!_flushTimer) {
    _flushTimer = setTimeout(doFlush, 3000);
  }
}

export function forceFlush(): Promise<void> {
  if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
  return doFlush();
}

// ── Load ──────────────────────────────────────────────────────────────────

export async function loadTranscriptRecent(limit: number): Promise<TranscriptEntry[]> {
  const sid = _activeId;
  if (!sid) return [];
  const m = await get<ChunkMeta>(metaKey(sid));
  if (!m || m.chunkCount === 0) return [];

  const out: TranscriptEntry[] = [];
  for (let i = m.chunkCount - 1; i >= 0 && out.length < limit; i--) {
    const c = (await get<TranscriptEntry[]>(chunkKey(sid, i))) ?? [];
    if (c.length) out.unshift(...c);
  }
  return out.slice(-limit);
}

export async function loadSessionTranscript(sessionId: string): Promise<TranscriptEntry[]> {
  const m = await get<ChunkMeta>(metaKey(sessionId));
  if (!m || m.chunkCount === 0) return [];
  const out: TranscriptEntry[] = [];
  for (let i = 0; i < m.chunkCount; i++) {
    const c = (await get<TranscriptEntry[]>(chunkKey(sessionId, i))) ?? [];
    out.push(...c);
  }
  return out;
}

// ── Update recent entry ───────────────────────────────────────────────────

export async function updateTranscriptEntryRecent(
  id: string,
  patch: Partial<Pick<TranscriptEntry, 'text' | 'translation' | 'translatedLang'>>
): Promise<boolean> {
  const sid = _activeId;
  if (!sid) return false;
  const m = await get<ChunkMeta>(metaKey(sid));
  if (!m || m.chunkCount === 0) return false;

  for (let i = m.chunkCount - 1; i >= Math.max(0, m.chunkCount - 4); i--) {
    const c = (await get<TranscriptEntry[]>(chunkKey(sid, i))) ?? [];
    const idx = c.findIndex(e => e.id === id);
    if (idx !== -1) {
      c[idx] = { ...c[idx], ...patch };
      await set(chunkKey(sid, i), c);
      return true;
    }
  }
  return false;
}

// ── Clear current session transcript ──────────────────────────────────────

export async function clearTranscript(): Promise<void> {
  if (!_activeId) return;
  const m = await get<ChunkMeta>(metaKey(_activeId));
  if (m) {
    for (let i = 0; i < m.chunkCount; i++) await del(chunkKey(_activeId, i));
    await set(metaKey(_activeId), { chunkCount: 0, totalEntries: 0 });
  }
}

// ── Settings / Speakers ───────────────────────────────────────────────────

export function saveSettings(settings: AppSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

export function loadSettings(): AppSettings | null {
  try { const r = localStorage.getItem(SETTINGS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

export function saveSpeakers(speakers: SpeakerConfig[]): void {
  try { localStorage.setItem(SPEAKERS_KEY, JSON.stringify(speakers)); } catch {}
}

export function loadSpeakers(): SpeakerConfig[] | null {
  try { const r = localStorage.getItem(SPEAKERS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

// ── Offline Models Directory ───────────────────────────────────────────────────

const OFFLINE_MODELS_DIR_KEY = 'tutorly_offline_models_dir';
const OPFS_MODELS_DIR = 'tutorly_models';

export async function saveOfflineModelsDir(handle: FileSystemDirectoryHandle): Promise<void> {
  await set(OFFLINE_MODELS_DIR_KEY, handle);
}

export async function loadOfflineModelsDir(): Promise<FileSystemDirectoryHandle | null> {
  try { return (await get<FileSystemDirectoryHandle>(OFFLINE_MODELS_DIR_KEY)) ?? null; }
  catch { return null; }
}

export async function clearOfflineModelsDir(): Promise<void> {
  await del(OFFLINE_MODELS_DIR_KEY);
}

/**
 * Get or create the root models directory in OPFS (Origin Private File System).
 * Also persists it as the custom offline models dir so the worker uses it.
 */
export async function getOrCreateModelsDir(): Promise<FileSystemDirectoryHandle> {
  const opfsRoot = await navigator.storage.getDirectory();
  const modelsDir = await opfsRoot.getDirectoryHandle(OPFS_MODELS_DIR, { create: true });
  await saveOfflineModelsDir(modelsDir);
  return modelsDir;
}

/**
 * Write an uploaded File (from a file picker) into the correct path under the
 * given root directory handle. The file is written to:
 *   root / Xenova / <modelName> / <subpath...>
 *
 * Example: file "Xenova/whisper-tiny/onnx/encoder_model_quantized.onnx"
 *          → root / Xenova / whisper-tiny / onnx / encoder_model_quantized.onnx
 */
export async function writeModelFile(
  modelsDir: FileSystemDirectoryHandle,
  relativePath: string,
  file: File,
): Promise<void> {
  const parts = relativePath.split('/').filter(Boolean);
  let dir = modelsDir;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true });
  }
  const fileName = parts[parts.length - 1];
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

/**
 * Expected model file structure relative to the Xenova/ root.
 * Used to validate that a model directory is complete.
 */
export interface ModelFileEntry {
  path: string;
  size?: number;
}

export function getTranscriptionModelFiles(modelName: string): ModelFileEntry[] {
  const base = `Xenova/${modelName}`;
  return [
    { path: `${base}/config.json` },
    { path: `${base}/generation_config.json` },
    { path: `${base}/preprocessor_config.json` },
    { path: `${base}/tokenizer.json` },
    { path: `${base}/tokenizer_config.json` },
    { path: `${base}/onnx/encoder_model_quantized.onnx` },
    { path: `${base}/onnx/decoder_model_merged_quantized.onnx` },
  ];
}

export function getTranslationModelFiles(modelName: string): ModelFileEntry[] {
  const base = `Xenova/${modelName}`;
  return [
    { path: `${base}/config.json` },
    { path: `${base}/generation_config.json` },
    { path: `${base}/tokenizer.json` },
    { path: `${base}/tokenizer_config.json` },
    { path: `${base}/onnx/encoder_model_quantized.onnx` },
    { path: `${base}/onnx/decoder_model_merged_quantized.onnx` },
  ];
}

/**
 * Scan the OPFS/custom models dir and return which expected files are present.
 */
export async function scanModelFiles(
  modelsDir: FileSystemDirectoryHandle,
  files: ModelFileEntry[],
): Promise<{ path: string; present: boolean }[]> {
  const results: { path: string; present: boolean }[] = [];
  for (const entry of files) {
    const parts = entry.path.split('/').filter(Boolean);
    try {
      let dir = modelsDir;
      for (let i = 0; i < parts.length - 1; i++) {
        dir = await dir.getDirectoryHandle(parts[i], { create: false });
      }
      await dir.getFileHandle(parts[parts.length - 1], { create: false });
      results.push({ path: entry.path, present: true });
    } catch {
      results.push({ path: entry.path, present: false });
    }
  }
  return results;
}

// Legacy
export async function loadTranscript(): Promise<TranscriptEntry[]> { return loadTranscriptRecent(150); }
export async function saveTranscript(_e: TranscriptEntry[]): Promise<void> {}
