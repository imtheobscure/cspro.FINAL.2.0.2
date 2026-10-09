/**
 * Shared helpers for rendering subtitles consistently across the docked bar,
 * the draggable floating overlay, and the Document Picture-in-Picture window.
 *
 * The "live line" for a speaker is the ACCUMULATED line:
 *   1. pending text  — finalised words sitting in the silence buffer, shown
 *      immediately so the last subtitle doesn't lag behind by silenceGapMs
 *   2. + interim text — the partial words being recognised right now, merged
 *      onto the end of it (see `mergeLiveText`)
 *
 * Both parts are always shown together. Showing the interim alone was the bug: the
 * line flickered word by word and reset on every new partial, so a tutor could
 * never read a learner's sentence as it was spoken.
 */
import type { SpeakerRole, SubtitleSettings, TranscriptEntry } from '../types';

export interface LiveLine {
  speaker: SpeakerRole;
  text: string;
}

/**
 * Merge the text recognised so far with the browser's current partial result.
 *
 * The Web Speech API does not hand over one growing string per utterance: it emits
 * a separate partial result per phrase, and the words of the finished phrase come
 * back again at the start of the next one. So the live line has to ACCUMULATE.
 *
 * `accumulated` is the finalised text; `partial` is the in-flight fragment. The
 * words of `partial` that `accumulated` already ends with are dropped, which is what
 * stops the two overlap cases a recogniser actually produces:
 *
 *   "hello how"  + "how are you"   → "hello how are you"   (not "…how how are you")
 *   "hello"      + "hello world"   → "hello world"         (not "hello hello world")
 *
 * A partial that shares no leading words with the tail of the accumulated line is a
 * genuine continuation, so it is appended — which is why a learner talking without
 * pausing keeps building one readable line instead of resetting to one word.
 */
export function mergeLiveText(accumulated: string, partial: string): string {
  const accWords = accumulated.trim().split(/\s+/).filter(Boolean);
  const partWords = partial.trim().split(/\s+/).filter(Boolean);

  if (partWords.length === 0) return accWords.join(' ');
  if (accWords.length === 0) return partWords.join(' ');

  // Longest run of words that ends the accumulated text AND starts the partial.
  // Longest-first so "you are" wins over a coincidental single shared word.
  const maxOverlap = Math.min(accWords.length, partWords.length);
  for (let n = maxOverlap; n > 0; n--) {
    const tail = accWords.slice(-n).join(' ').toLowerCase();
    const head = partWords.slice(0, n).join(' ').toLowerCase();
    if (tail === head) return [...accWords, ...partWords.slice(n)].join(' ');
  }

  return [...accWords, ...partWords].join(' ');
}

export interface SubtitleContent {
  /** Up to two live lines (one per role), most-recent speaker first. */
  live: LiveLine[];
  /** Scrollback history lines (already flushed chunks). */
  history: { id: string; speaker: SpeakerRole; text: string; translation?: string }[];
}

interface StoreSnapshot {
  currentlySpeaking: 'tutor' | 'learner' | null;
  interimTextTutor: string;
  interimTextLearner: string;
  pendingTextTutor: string;
  pendingTextLearner: string;
}

/**
 * Build the subtitle content from a store snapshot + transcript window.
 * Pure function — safe to call from React or the PIP `postMessage` bridge.
 */
export function buildSubtitleContent(
  snap: StoreSnapshot,
  transcript: TranscriptEntry[],
  settings: SubtitleSettings,
): SubtitleContent {
  const liveFor = (role: SpeakerRole): string =>
    role === 'tutor'
      ? mergeLiveText(snap.pendingTextTutor, snap.interimTextTutor)
      : mergeLiveText(snap.pendingTextLearner, snap.interimTextLearner);

  const tutorLive = liveFor('tutor');
  const learnerLive = liveFor('learner');

  // Order live lines so the currently-speaking role appears first.
  const live: LiveLine[] = [];
  if (snap.currentlySpeaking === 'tutor' && tutorLive) {
    live.push({ speaker: 'tutor', text: tutorLive });
    if (learnerLive) live.push({ speaker: 'learner', text: learnerLive });
  } else if (snap.currentlySpeaking === 'learner' && learnerLive) {
    live.push({ speaker: 'learner', text: learnerLive });
    if (tutorLive) live.push({ speaker: 'tutor', text: tutorLive });
  } else {
    // No active speaker — show whichever buffered text exists.
    if (tutorLive) live.push({ speaker: 'tutor', text: tutorLive });
    if (learnerLive) live.push({ speaker: 'learner', text: learnerLive });
  }

  const maxLines = Math.max(1, settings.maxLines || 4);
  const history = transcript.slice(-maxLines).map(e => ({
    id: e.id,
    speaker: e.speaker,
    text: e.text,
    translation: settings.showTranslation ? e.translation : undefined,
  }));

  return { live, history };
}

/** Escape text for safe insertion into innerHTML (used by the PIP window). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
