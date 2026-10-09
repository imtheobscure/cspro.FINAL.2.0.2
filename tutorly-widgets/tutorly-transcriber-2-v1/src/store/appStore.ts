import { create } from 'zustand';
import { get, del } from 'idb-keyval';
import type { TranscriptEntry } from '../types';
import { mergeLiveText } from '../utils/subtitleContent';
import {
  appendTranscriptEntry,
  updateTranscriptEntryRecent,
  clearTranscript as clearStorageTranscript,
  getActiveSessionIdSync,
} from '../utils/storage';

/**
 * Bounded in-memory rolling window for the LIVE UI only.
 *
 * IMPORTANT — previous design (caused tab crashes):
 *   Every chunk did `get('live_pc_sync') -> push -> set('live_pc_sync')`,
 *   which is an O(n²) unbounded-growth pattern: each new chunk copied the
 *   ENTIRE accumulated history into RAM and wrote it all back to IDB.
 *   Long sessions ran the tab out of memory.
 *
 * New design:
 *   - The store keeps only the last MAX_CHUNKS_IN_MEMORY entries in RAM
 *     (enough for the live subtitle bar + dialogue view).
 *   - Persistence is delegated to `utils/storage.ts` (already-written,
 *     batched, chunked system that flushes every few seconds) via
 *     `appendTranscriptEntry`. Old session history now also works.
 *   - All storage calls are wrapped in try/catch so a transient IDB
 *     error (quota / locked transaction) can NEVER crash recognition.
 */
const MAX_CHUNKS_IN_MEMORY = 150;

// Legacy single-key used by the old leaky storage. Kept only so we can
// migrate any data once, then delete it forever.
const LEGACY_KEY = 'live_pc_sync';

export interface AppState {
  currentlySpeaking: 'tutor' | 'learner' | null;
  interimTextTutor: string;
  interimTextLearner: string;
  // Finalised-but-not-yet-flushed text (sitting in the silence buffer).
  // Showing this makes the "last" subtitle appear instantly instead of
  // waiting up to silenceGapMs for the chunk to commit.
  pendingTextTutor: string;
  pendingTextLearner: string;
  setCurrentlySpeaking: (role: 'tutor' | 'learner' | null) => void;
  setInterimText: (role: 'tutor' | 'learner', text: string) => void;
  appendPendingText: (role: 'tutor' | 'learner', text: string) => void;
  clearPendingText: (role: 'tutor' | 'learner') => void;
  chunks: TranscriptEntry[];
  addChunk: (chunk: TranscriptEntry) => void;
  setChunks: (chunks: TranscriptEntry[]) => void;
  updateChunk: (id: string, updates: Partial<TranscriptEntry>) => void;
  deleteChunk: (id: string) => void;
  clearChunks: () => void;
  loadOlderChunks: (count: number) => Promise<TranscriptEntry[]>;
}

/** Best-effort one-time migration of the legacy leaky key into the chunked store. */
let _migrated = false;
async function migrateLegacy(): Promise<void> {
  if (_migrated) return;
  _migrated = true;
  try {
    const legacy = (await get<TranscriptEntry[]>(LEGACY_KEY)) ?? [];
    if (!legacy.length) return;
    // Only migrate if we're in a real (non-empty) active session.
    if (!getActiveSessionIdSync()) return;
    for (const entry of legacy) {
      appendTranscriptEntry(entry); // batched — cheap
    }
    await del(LEGACY_KEY); // delete forever so it can never grow again
  } catch {
    // Migration is best-effort; never let it block the UI.
  }
}

export const useAppStore = create<AppState>((setStore, getStore) => ({
  currentlySpeaking: null,
  interimTextTutor: '',
  interimTextLearner: '',
  pendingTextTutor: '',
  pendingTextLearner: '',
  setCurrentlySpeaking: (role) => setStore({ currentlySpeaking: role }),
  setInterimText: (role, text) => {
    if (role === 'tutor') {
      setStore({ interimTextTutor: text, currentlySpeaking: text ? 'tutor' : null });
    } else {
      setStore({ interimTextLearner: text, currentlySpeaking: text ? 'learner' : null });
    }
  },
  appendPendingText: (role, text) => {
    const t = text.trim();
    if (!t) return;
    // `mergeLiveText`, not a plain `${prev} ${t}`: a recogniser re-emits the last few
    // words of a phrase at the start of the next result, and appending them verbatim
    // writes the duplication into the saved transcript, not just the live line.
    if (role === 'tutor') {
      const prev = getStore().pendingTextTutor;
      setStore({ pendingTextTutor: mergeLiveText(prev, t) });
    } else {
      const prev = getStore().pendingTextLearner;
      setStore({ pendingTextLearner: mergeLiveText(prev, t) });
    }
  },
  clearPendingText: (role) => {
    if (role === 'tutor') setStore({ pendingTextTutor: '' });
    else setStore({ pendingTextLearner: '' });
  },
  chunks: [],
  setChunks: (chunks) => setStore({ chunks }),

  /**
   * Add a finalised chunk.
   * - Keeps only the bounded rolling window in RAM (no unbounded growth).
   * - Delegates durable persistence to the batched chunked storage.
   */
  addChunk: (chunk) => {
    const current = getStore().chunks;
    const next = current.length >= MAX_CHUNKS_IN_MEMORY
      ? [...current.slice(current.length - MAX_CHUNKS_IN_MEMORY + 1), chunk]
      : [...current, chunk];
    setStore({ chunks: next });

    // Persist off the hot path. Never throw into the recognition loop.
    try {
      appendTranscriptEntry(chunk);
    } catch (e) {
      console.warn('[appStore] persist chunk failed (non-fatal):', e);
    }
  },

  /**
   * Update an entry (edit / translation). Patches the in-memory window and
   * the durable store via a bounded recent-only scan — never a full rewrite.
   */
  updateChunk: (id, updates) => {
    setStore({
      chunks: getStore().chunks.map(c => (c.id === id ? { ...c, ...updates } : c)),
    });
    try {
      void updateTranscriptEntryRecent(id, updates).catch(() => {});
    } catch (e) {
      console.warn('[appStore] update persist failed (non-fatal):', e);
    }
  },

  deleteChunk: (id) => {
    setStore({ chunks: getStore().chunks.filter(c => c.id !== id) });
    // No per-id delete in storage by design (low value, avoids a scan);
    // the in-memory window is the source of truth for live edits/deletes.
  },

  clearChunks: () => {
    setStore({ chunks: [], pendingTextTutor: '', pendingTextLearner: '', interimTextTutor: '', interimTextLearner: '' });
    try {
      void clearStorageTranscript().catch(() => {});
    } catch (e) {
      console.warn('[appStore] clear persist failed (non-fatal):', e);
    }
  },

  loadOlderChunks: async (count) => {
    // Exposed for completeness; live transcript is now loaded by the engine
    // via loadTranscriptRecent. Return the in-memory window as a fallback.
    return getStore().chunks.slice(-count);
  },
}));

// Kick off the legacy migration lazily (idempotent).
void migrateLegacy();
