/**
 * Single owner of the offline AI worker.
 *
 * Previously BOTH `utils/translate.ts` and `hooks/useSpeechRecognition.ts`
 * created their OWN `new Worker(ai.worker.ts)`. That meant two Web Workers,
 * two copies of the WASM models loaded into memory (hundreds of MB), and
 * models that never shared state. It also caused races and wasted RAM.
 *
 * This module owns exactly one worker for the whole app. Every caller
 * (translation, speech recognition, settings diagnostics) goes through here.
 *
 * It is also resilient: a message without a response within the timeout is
 * rejected, listeners are always cleaned up, and a crash in the worker can
 * never leak forever.
 */

import { loadOfflineModelsDir } from '../utils/storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: Worker | null = null;
let currentId = 0;

/** Resolves when the requested task's model is loaded. */
let loadPromise: Promise<void> | null = null;
const loadedTasks = new Set<string>();
/** Set to true only if loading genuinely failed (so callers can fall back). */
let workerDead = false;

interface Pending {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (value: any) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
const pending = new Map<number, Pending>();

/** Monotonically increasing generation counter. Incremented on every reset
 *  so callers can detect stale state after an async gap. */
let workerGeneration = 0;

/**
 * Tear down the current worker and reset all state. Used by the Settings
 * "Verify / retry" flow so a half-initialized or crashed worker is replaced
 * with a fresh one before retrying a model download.
 */
export function resetWorker(): void {
  if (worker) {
    try { worker.terminate(); } catch { /* ignore */ }
    worker = null;
  }
  for (const [, p] of pending) {
    clearTimeout(p.timeout);
    p.reject(new Error('Worker reset'));
  }
  pending.clear();
  loadedTasks.clear();
  loadPromise = null;
  workerDead = false;
  workerGeneration++;
}

/** Returns the current worker generation. If the generation changes between
 *  an async operation, the caller knows the worker was reset underneath. */
export function getWorkerGeneration(): number {
  return workerGeneration;
}

function getWorker(): Worker {
  if (worker) return worker;
  // Create a fresh worker. If the old one was dead, clear that flag since
  // we're starting fresh.
  workerDead = false;
  worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => {
    const data = e.data;
    // Progress messages (no numeric id) are handled by transient listeners
    // attached in ensureModelsLoaded. Ignore them here.
    if (!data || typeof data.id !== 'number') return;
    const p = pending.get(data.id);
    if (!p) return;
    clearTimeout(p.timeout);
    pending.delete(data.id);
    if (data.status === 'success') p.resolve(data.result);
    else p.reject(new Error(data.error || 'Worker error'));
  };
  worker.onerror = (err) => {
    console.error('[aiWorkerClient] worker.onerror:', err.message);
    workerDead = true;
    // Fail all pending requests — the worker is in a bad state.
    for (const [id, p] of pending) {
      clearTimeout(p.timeout);
      p.reject(new Error('Worker crashed: ' + err.message));
      pending.delete(id);
    }
  };
  // An unhandled message (e.g. a thrown error inside the worker that didn't
  // match a pending id) shouldn't crash anything, but log it for debugging.
  worker.onmessageerror = (e) => {
    console.warn('[aiWorkerClient] onmessageerror:', e);
  };
  return worker;
}

/**
 * Send a request to the worker and await its response.
 * `taskName` (optional) is used to auto-load the required model first.
 */
function request<T = unknown>(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  timeoutMs = 15000,
): Promise<T> {
  if (workerDead) {
    // Worker was marked dead. Try to create a fresh one — getWorker() clears
    // the dead flag automatically.
    console.warn('[aiWorkerClient] workerDead=true, attempting fresh worker');
    worker = null;
    workerDead = false;
  }
  const w = getWorker();
  const id = currentId++;
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Worker request "${type}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve: resolve as never, reject, timeout });
    w.postMessage({ id, type, data });
  });
}

function readSettings() {
  try {
    const raw = localStorage.getItem('tutorly_settings');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Ensure the models for the given tasks are loaded. Idempotent — calling it
 * again with the same tasks is a no-op. Safe to call concurrently.
 */
export async function ensureModelsLoaded(
  tasks: ('translate' | 'recognize')[],
  onProgress?: (info: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => void,
): Promise<void> {
  const needed = tasks.filter(t => !loadedTasks.has(t));
  if (needed.length === 0) return;

  if (loadPromise) {
    // Another load is in progress; attach our progress listener but wait.
    await loadPromise;
    // After it finishes, re-check what still needs loading.
    const stillNeeded = tasks.filter(t => !loadedTasks.has(t));
    if (stillNeeded.length === 0) return;
    // Fall through to load the remaining tasks.
  }

  loadPromise = (async () => {
    // Snapshot the generation BEFORE we start so we can detect a reset.
    const gen = workerGeneration;
    const s = readSettings();
    const translationModel = s.translationModel || 'Xenova/m2m100_418M';
    const transcriptionModel = s.transcriptionModel || 'Xenova/whisper-tiny';
    const modelMirror = s.modelMirror || 'https://huggingface.co';

    // 1. Custom cache dir (optional)
    try {
      const dirHandle = await loadOfflineModelsDir();
      if (dirHandle) {
        const dh = dirHandle as any;
        let perm = 'granted';
        if (dh.queryPermission) {
          perm = await dh.queryPermission({ mode: 'readwrite' });
        }
        if (perm === 'granted') {
          await request('setCacheDir', { dirHandle }, 10000);
        }
      }
    } catch (err) {
      console.warn('[aiWorkerClient] setCacheDir failed (non-fatal):', err);
    }

    // 2. Load models. Subscribe to progress messages while loading.
    const w = getWorker();
    const progressHandler = (e: MessageEvent) => {
      if (e.data?.type === 'progress' && onProgress) onProgress(e.data.data);
    };
    w.addEventListener('message', progressHandler);

    try {
      // Bail out if the worker was reset while we were setting up the cache dir.
      if (workerGeneration !== gen) {
        throw new Error('Worker was reset during model load setup');
      }
      await request(
        'load',
        { tasks: needed, translationModel, transcriptionModel, modelMirror },
        5 * 60 * 1000, // model download can take minutes on first run
      );
      // Another generation check — if reset happened during the long load,
      // don't mark these tasks as loaded in the NEW (empty) worker's context.
      if (workerGeneration !== gen) {
        throw new Error('Worker was reset during model load');
      }
      for (const t of needed) loadedTasks.add(t);
    } catch (err) {
      console.warn('[aiWorkerClient] model load failed:', err);
      // Don't mark as dead — translation/recognition callers will fall back.
      throw err;
    } finally {
      w.removeEventListener('message', progressHandler);
      // Only null loadPromise if we're still the same generation (not reset).
      if (workerGeneration === gen) {
        loadPromise = null;
      }
    }
  })();

  return loadPromise;
}

/** Is the worker loaded for a given task (i.e. ready to use offline)? */
export function isTaskReady(task: 'translate' | 'recognize'): boolean {
  return loadedTasks.has(task) && !workerDead;
}

export async function translateOffline(
  text: string,
  targetLang: string,
  sourceLang: string,
): Promise<string> {
  await ensureModelsLoaded(['translate']);
  return request<string>('translate', { text, targetLang, sourceLang }, 20000);
}

export async function recognizeOffline(audioData: Float32Array, language?: string): Promise<string> {
  await ensureModelsLoaded(['recognize']);
  return request<string>('recognize', { audioData, language, task: 'transcribe' }, 60000);
}

/** Used by Settings > Offline diagnostics and model downloads. */
export async function initAIWorker(
  tasks: ('translate' | 'recognize')[],
  onProgress?: (info: { status: string; file?: string; progress?: number; loaded?: number; total?: number }) => void,
): Promise<void> {
  await ensureModelsLoaded(tasks, onProgress);
}

export function isWorkerDead(): boolean {
  return workerDead;
}
