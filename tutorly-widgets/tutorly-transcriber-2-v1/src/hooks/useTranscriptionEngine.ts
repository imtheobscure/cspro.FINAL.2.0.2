import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { TranscriptEntry, SpeakerRole } from '../types';
import { useAppStore } from '../store/appStore';
import { loadTranscriptRecent } from '../utils/storage';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface SilenceBuffer {
  texts: string[];
  lastTime: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export function useTranscriptionEngine(_autoSave: boolean, silenceGapMs: number, maxEntries: number = 50) {
  const silenceGapRef = useRef<number>(silenceGapMs);
  silenceGapRef.current = silenceGapMs;

  /**
   * Targeted selectors.
   *
   * Previously this hook did `const { chunks, ... } = useAppStore()`, which
   * subscribed to the ENTIRE store. Because interim (partial) speech results
   * update the store many times per second, the engine AND App re-rendered on
   * every partial word — unnecessary jank.
   *
   * Now we only subscribe to `chunks` (the array that actually matters for the
   * rendered transcript). The action setters are grabbed once via `getState()`
   * and are stable references (Zustand never recreates them), so they don't
   * need to be reactive dependencies.
   */
  const transcript = useAppStore(s => s.chunks);
  const storeActions = useRef(useAppStore.getState()).current;
  const { addChunk, clearChunks, updateChunk, deleteChunk, setInterimText, setChunks, appendPendingText, clearPendingText } = storeActions;

  const silenceBuffersRef = useRef<{ tutor: SilenceBuffer; learner: SilenceBuffer }>({
    tutor: { texts: [], lastTime: 0, timer: null },
    learner: { texts: [], lastTime: 0, timer: null },
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Load the recent transcript from the (now-working) chunked store instead
    // of the legacy leaky single key.
    loadTranscriptRecent(maxEntries)
      .then(allChunks => {
        if (mountedRef.current && allChunks && allChunks.length > 0) {
          setChunks(allChunks.slice(-maxEntries));
        }
      })
      .catch(() => { /* non-fatal */ });

    return () => {
      mountedRef.current = false;
      const buffers = silenceBuffersRef.current;
      if (buffers.tutor.timer) clearTimeout(buffers.tutor.timer);
      if (buffers.learner.timer) clearTimeout(buffers.learner.timer);
    };
  }, [maxEntries, setChunks]);

  const flushSpeaker = useCallback((speaker: SpeakerRole) => {
    const buf = silenceBuffersRef.current[speaker];

    if (buf.timer) {
      clearTimeout(buf.timer);
      buf.timer = null;
    }

    if (buf.texts.length === 0) return;

    const combined = buf.texts.join(' ').trim();
    buf.texts = [];

    if (!combined) {
      buf.lastTime = 0;
      return;
    }

    const entry: TranscriptEntry = {
      id: generateId(),
      speaker,
      text: combined,
      timestamp: buf.lastTime || Date.now(),
      isFinal: true,
    };

    buf.lastTime = 0;
    addChunk(entry);
    setInterimText(speaker, '');
    clearPendingText(speaker);
  }, [addChunk, setInterimText, clearPendingText]);

  const handleResult = useCallback((speaker: SpeakerRole, text: string, isFinal: boolean) => {
    if (!text.trim()) return;

    if (!isFinal) {
      setInterimText(speaker, text);
      return;
    }

    const buf = silenceBuffersRef.current[speaker];
    buf.texts.push(text.trim());
    if (!buf.lastTime) buf.lastTime = Date.now();

    // Show the just-finalised text immediately in the subtitle panels —
    // don't wait for the silence-gap flush. We clear the interim line and
    // surface the accumulating buffer as the "live" line instead.
    setInterimText(speaker, '');
    appendPendingText(speaker, text.trim());

    if (buf.timer) clearTimeout(buf.timer);
    const gap = Math.max(1000, silenceGapRef.current || 10000);
    buf.timer = setTimeout(() => flushSpeaker(speaker), gap);
  }, [flushSpeaker, setInterimText, appendPendingText]);

  const flushAll = useCallback(() => {
    flushSpeaker('tutor');
    flushSpeaker('learner');
  }, [flushSpeaker]);

  const clearTranscriptData = useCallback(async () => {
    flushAll();
    clearChunks();
    setInterimText('tutor', '');
    setInterimText('learner', '');
    clearPendingText('tutor');
    clearPendingText('learner');
    silenceBuffersRef.current = {
      tutor: { texts: [], lastTime: 0, timer: null },
      learner: { texts: [], lastTime: 0, timer: null },
    };
  }, [flushAll, clearChunks, setInterimText, clearPendingText]);

  const editEntry = useCallback((id: string, newText: string) => {
    updateChunk(id, { text: newText });
  }, [updateChunk]);

  const updateEntryTranslation = useCallback((id: string, translation: string, lang: string) => {
    updateChunk(id, { translation, translatedLang: lang });
  }, [updateChunk]);

  return useMemo(() => ({
    transcript,
    handleResult,
    flushAll,
    clearTranscriptData,
    deleteEntry: deleteChunk,
    editEntry,
    updateEntryTranslation,
    totalCount: transcript.length,
  }), [transcript, handleResult, flushAll, clearTranscriptData, deleteChunk, editEntry, updateEntryTranslation]);
}
