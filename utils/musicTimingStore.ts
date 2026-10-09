import type { PremiumLesson, SubtitleLine } from '../pages/music/musicTypes';

/**
 * Lyric-timing hand-off between the players and the Lesson Creator.
 *
 * A tutor syncs the lyrics in whichever player they prefer (the standalone HTML
 * lesson or the React live presenter). Those timings are written to localStorage
 * under ONE shared key per song, and the Lesson Creator re-applies them every
 * time it renders the lesson — so re-rendering never throws the tutor's work
 * away.
 *
 * Key shape: `tutorly-music-sync-<lesson id or song title>`.
 */
export const MUSIC_TIMING_PREFIX = 'tutorly-music-sync-';

type LessonLike = { id?: string; songTitle?: string } | null | undefined;

export function musicTimingKey(lesson: LessonLike): string {
  const id = (lesson?.id || lesson?.songTitle || 'lesson').toString().trim() || 'lesson';
  return MUSIC_TIMING_PREFIX + id;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function isSubtitleLine(v: any): v is SubtitleLine {
  return v && typeof v === 'object' && typeof v.text === 'string' && isFinite(Number(v.start));
}

/** Timings a tutor saved for this song, or null when there are none. */
export function loadSavedTimings(lesson: LessonLike): SubtitleLine[] | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(musicTimingKey(lesson));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const lines: any[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.subtitles) ? parsed.subtitles : []);
    const clean = lines.filter(isSubtitleLine).map(line => ({
      ...line,
      start: Math.max(0, Number(line.start) || 0),
      end: Math.max(0, Number(line.end) || 0),
    }));
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}

/** Remember the tutor's timings for this song. Returns false when storage is blocked. */
export function saveTimings(lesson: LessonLike, subtitles: SubtitleLine[] | null | undefined): boolean {
  const store = storage();
  if (!store) return false;
  try {
    if (!subtitles || subtitles.length === 0) {
      store.removeItem(musicTimingKey(lesson));
      return true;
    }
    store.setItem(musicTimingKey(lesson), JSON.stringify(subtitles));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedTimings(lesson: LessonLike): void {
  const store = storage();
  try {
    store?.removeItem(musicTimingKey(lesson));
  } catch {
    /* storage blocked — nothing to clear */
  }
}

/**
 * Overlay the tutor's synced timings onto a lesson's own lyric lines.
 *
 * The saved line wins on timing (that is the whole point) and on text when the
 * tutor typed one, but the lesson keeps ownership of its L1 translation and
 * vocabulary highlights unless the saved line carries its own.
 */
export function applySavedTimings<T extends Pick<PremiumLesson, 'subtitles'>>(
  lesson: T,
  saved?: SubtitleLine[] | null
): { lesson: T; lines: number; applied: boolean } {
  const stored = saved === undefined ? loadSavedTimings(lesson as LessonLike) : saved;
  if (!stored || stored.length === 0) return { lesson, lines: 0, applied: false };

  const own: SubtitleLine[] = Array.isArray(lesson.subtitles) ? lesson.subtitles : [];
  const merged: SubtitleLine[] = stored.map((line, i) => {
    const base = own[i];
    if (!base) return line;
    return {
      start: isFinite(line.start) ? line.start : base.start,
      end: isFinite(line.end) && line.end > 0 ? line.end : base.end,
      text: line.text?.trim() ? line.text : base.text,
      translation: line.translation || base.translation,
      highlights: line.highlights?.length ? line.highlights : base.highlights,
    };
  });
  // Anything the lesson had beyond the synced range stays at the end.
  for (let i = stored.length; i < own.length; i++) merged.push(own[i]);

  return { lesson: { ...lesson, subtitles: merged }, lines: stored.length, applied: true };
}
