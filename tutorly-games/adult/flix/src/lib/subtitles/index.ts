/**
 * Subtitle engine — the operations every screen needs, built on the cue model:
 * active-cue lookup at 60fps, word hit-testing for karaoke, dual-track
 * alignment, sentence navigation, search, QA (Subtitle-Edit style checks),
 * export, and the segmentation used by the lesson maker.
 */

import type { MediaTrack, SubtitleCue, SubtitleWord } from "../../types";
import { normaliseCues, parseSubtitles, secondsToTimecode } from "./parse";

export * from "./parse";

/* ────────────────────────────── lookup ────────────────────────────── */

/** Binary search: index of the cue playing at `time`, else -1. */
export function findCueIndex(cues: SubtitleCue[], time: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (time < cue.startTime) hi = mid - 1;
    else if (time > cue.endTime) lo = mid + 1;
    else return mid;
  }
  // Between cues: keep the previous one highlighted for a short grace period so
  // the overlay does not flicker during 200 ms gaps.
  const prev = cues[Math.max(0, lo - 1)];
  if (prev && time - prev.endTime <= 0.35) return lo - 1;
  return -1;
}

export function activeCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  const index = findCueIndex(cues, time);
  return index >= 0 ? cues[index] : null;
}

export function wordIndexAt(cue: SubtitleCue | null, time: number): number {
  if (!cue?.words?.length) return -1;
  for (let i = 0; i < cue.words.length; i++) {
    if (time >= cue.words[i].startTime && time <= cue.words[i].endTime) return i;
  }
  if (time < cue.words[0].startTime) return -1;
  return cue.words.length - 1;
}

export function wordAt(cue: SubtitleCue | null, time: number): SubtitleWord | null {
  const i = wordIndexAt(cue, time);
  return i >= 0 && cue?.words ? cue.words[i] : null;
}

/** Index of the last cue that has already started (for transcripts that follow along). */
export function lastStartedIndex(cues: SubtitleCue[], time: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let answer = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].startTime <= time) {
      answer = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return answer;
}

/* ─────────────────────────── sentence navigation ─────────────────────────── */

export interface SentenceCursor {
  index: number;
  cue: SubtitleCue;
  /** Gap to the previous cue — a long gap usually means a new sentence/beat. */
  gapBefore: number;
  isSentenceStart: boolean;
}

/** Sentences ≈ cues here, but a cue counts as a new sentence when the previous one ended with terminal punctuation or a long pause. */
export function sentenceCursor(cues: SubtitleCue[], index: number): SentenceCursor | null {
  const cue = cues[index];
  if (!cue) return null;
  const before = cues[index - 1];
  const gapBefore = before ? cue.startTime - before.endTime : 0;
  const prevEndsSentence = !before || /[.!?…]["')\]]?$/.test(before.text.trim());
  return { index, cue, gapBefore, isSentenceStart: prevEndsSentence || gapBefore > 1.2 };
}

export function sentenceBounds(cues: SubtitleCue[], index: number): { start: number; end: number; endIndex: number } {
  const cue = cues[index];
  if (!cue) return { start: 0, end: 0, endIndex: index };
  let end = cue.endTime;
  let i = index;
  // Absorb following cues until one ends with terminal punctuation.
  while (i + 1 < cues.length && !/[.!?…]["')\]]?$/.test(cues[i].text.trim()) && cues[i + 1].startTime - cues[i].endTime < 1.2) {
    i += 1;
    end = cues[i].endTime;
  }
  return { start: cue.startTime, end, endIndex: i };
}

/* ─────────────────────────────── search ─────────────────────────────── */

export interface TranscriptMatch {
  cueIndex: number;
  cue: SubtitleCue;
  /** Character index of the match inside the cue text. */
  at: number;
  length: number;
  /** ±60 characters of readable context. */
  context: string;
  /** Surrounding cues, so a "jump to this line" search result has meaning. */
  speaker?: string;
}

export function searchCues(cues: SubtitleCue[], query: string, limit = 200): TranscriptMatch[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const results: TranscriptMatch[] = [];
  for (let i = 0; i < cues.length && results.length < limit; i++) {
    const text = cues[i].text;
    const at = text.toLowerCase().indexOf(needle);
    if (at === -1) continue;
    const from = Math.max(0, at - 60);
    results.push({
      cueIndex: i,
      cue: cues[i],
      at,
      length: needle.length,
      context: `${from > 0 ? "…" : ""}${text.slice(from, at + needle.length + 60)}${at + needle.length + 60 < text.length ? "…" : ""}`,
      speaker: cues[i].speaker,
    });
  }
  return results;
}

/** Total occurrences, for the search box ("3 of 412"). */
export function countMatches(cues: SubtitleCue[], query: string): number {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return 0;
  let count = 0;
  for (const cue of cues) {
    let from = 0;
    for (;;) {
      const at = cue.text.toLowerCase().indexOf(needle, from);
      if (at === -1) break;
      count += 1;
      from = at + needle.length;
    }
  }
  return count;
}

/* ───────────────────────────── dual subtitles ───────────────────────────── */

/**
 * Align a translation track onto the original one. Prefers exact start-time
 * matches, then nearest cue within 2.5 s, then positional fallback — the same
 * ladder Subtitle Edit uses when syncing two files.
 */
export function attachTranslations(original: SubtitleCue[], translation: SubtitleCue[]): SubtitleCue[] {
  if (!translation.length) return original;
  const used = new Set<number>();
  return original.map((cue, i) => {
    let best = -1;
    let bestDelta = Infinity;
    for (let j = 0; j < translation.length; j++) {
      if (used.has(j)) continue;
      const delta = Math.abs(translation[j].startTime - cue.startTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = j;
      }
    }
    if (best >= 0 && bestDelta <= 2.5) {
      used.add(best);
      return { ...cue, translation: translation[best].text };
    }
    const positional = translation[i];
    return positional ? { ...cue, translation: positional.text } : cue;
  });
}

export function trackPair(tracks: MediaTrack[]): { original: MediaTrack | null; translation: MediaTrack | null } {
  const texts = tracks.filter((t) => t.kind === "text");
  return {
    original: texts.find((t) => t.role === "original") ?? texts[0] ?? null,
    translation: texts.find((t) => t.role === "translation") ?? null,
  };
}

/** Cues for a track, parsing `raw` on first use. */
export function cuesOf(track: MediaTrack | null): SubtitleCue[] {
  if (!track) return [];
  if (track.cues?.length) return track.cues;
  if (!track.raw) return [];
  return parseSubtitles(track.raw, `${track.id}.${track.format ?? "vtt"}`).cues;
}

/* ─────────────────────────── timing / sync tools ─────────────────────────── */

export function shiftCues(cues: SubtitleCue[], deltaSeconds: number): SubtitleCue[] {
  return normaliseCues(
    cues.map((cue) => ({
      ...cue,
      startTime: cue.startTime + deltaSeconds,
      endTime: cue.endTime + deltaSeconds,
      words: cue.words?.map((w) => ({
        ...w,
        startTime: w.startTime + deltaSeconds,
        endTime: w.endTime + deltaSeconds,
      })),
    })),
  );
}

/** Stretch to fit a new duration (e.g. after re-encoding). */
export function scaleCues(cues: SubtitleCue[], factor: number): SubtitleCue[] {
  return normaliseCues(
    cues.map((cue) => ({
      ...cue,
      startTime: cue.startTime * factor,
      endTime: cue.endTime * factor,
      words: cue.words?.map((w) => ({
        ...w,
        startTime: w.startTime * factor,
        endTime: w.endTime * factor,
      })),
    })),
  );
}

export function clampCues(cues: SubtitleCue[], duration: number): SubtitleCue[] {
  if (!Number.isFinite(duration) || duration <= 0) return cues;
  return cues.map((cue) => ({
    ...cue,
    startTime: Math.min(cue.startTime, duration - 0.3),
    endTime: Math.min(cue.endTime, duration),
  }));
}

/* ───────────────────────────────── QA ───────────────────────────────── */

export interface SubtitleQaIssue {
  level: "error" | "warning" | "info";
  cueIndex: number;
  message: string;
}

export interface SubtitleQaReport {
  cues: number;
  duration: number;
  words: number;
  issues: SubtitleQaIssue[];
  /** Percentage of cues with no issue — "subtitle health". */
  health: number;
  readingSpeedMax: number;
}

/**
 * The checks a subtitle editor would run: reading speed (chars/second), line
 * length, cue duration, overlaps and gaps. Returned as data so the UI can list
 * each problem with a jump-to-cue button.
 */
export function qaCues(cues: SubtitleCue[]): SubtitleQaReport {
  const issues: SubtitleQaIssue[] = [];
  let words = 0;
  let cpsMax = 0;
  cues.forEach((cue, i) => {
    const duration = Math.max(0.1, cue.endTime - cue.startTime);
    const chars = cue.text.replace(/\s+/g, " ").length;
    const cps = chars / duration;
    cpsMax = Math.max(cpsMax, cps);
    words += cue.text.split(/\s+/).filter(Boolean).length;

    if (cps > 25) issues.push({ level: "error", cueIndex: i, message: `Too fast to read: ${cps.toFixed(0)} chars/sec (max 21–25)` });
    else if (cps > 21) issues.push({ level: "warning", cueIndex: i, message: `Fast: ${cps.toFixed(0)} chars/sec` });

    if (duration < 0.8) issues.push({ level: "warning", cueIndex: i, message: `Short cue: ${duration.toFixed(2)}s (min 0.8s)` });
    if (duration > 7) issues.push({ level: "warning", cueIndex: i, message: `Long cue: ${duration.toFixed(1)}s (max 7s)` });
    if (chars > 84) issues.push({ level: "warning", cueIndex: i, message: `${chars} characters (max 84, two lines of 42)` });
    if ((cue.lines?.length ?? 1) > 2) issues.push({ level: "warning", cueIndex: i, message: `${cue.lines?.length} lines (max 2)` });
    if (/[a-zà-ÿ]\s*$/.test(cue.text) && i < cues.length - 1 && cues[i + 1].startTime - cue.endTime > 2.5) {
      issues.push({ level: "info", cueIndex: i, message: "Line does not end with punctuation before a long pause" });
    }
    if (i > 0) {
      const gap = cue.startTime - cues[i - 1].endTime;
      if (gap < 0) issues.push({ level: "error", cueIndex: i, message: `Overlaps the previous cue by ${Math.abs(gap).toFixed(2)}s` });
      else if (gap > 8) issues.push({ level: "info", cueIndex: i, message: `${gap.toFixed(0)}s without subtitles (possible missing dialogue)` });
    }
    if (!cue.text.trim()) issues.push({ level: "error", cueIndex: i, message: "Empty cue" });
  });

  const errorCount = issues.filter((x) => x.level === "error").length;
  const warningCount = issues.filter((x) => x.level === "warning").length;
  const health = cues.length
    ? Math.round(Math.max(0, 100 - ((errorCount * 2 + warningCount) / Math.max(1, cues.length)) * 40))
    : 0;

  return {
    cues: cues.length,
    duration: cues.length ? cues[cues.length - 1].endTime : 0,
    words,
    issues,
    health,
    readingSpeedMax: Number(cpsMax.toFixed(1)),
  };
}

/* ─────────────────────────────── export ─────────────────────────────── */

export function serializeCues(cues: SubtitleCue[], format: "vtt" | "srt", withTranslation = false): string {
  const body = cues
    .map((cue, i) => {
      const times = `${secondsToTimecode(cue.startTime, format === "srt")} --> ${secondsToTimecode(cue.endTime, format === "srt")}`;
      const lines = cue.lines?.length ? cue.lines : [cue.text];
      const text = withTranslation && cue.translation ? `${lines.join("\n")}\n${cue.translation}` : lines.join("\n");
      return format === "srt" ? `${i + 1}\n${times}\n${text}` : `${times}\n${text}`;
    })
    .join("\n\n");
  return format === "srt" ? `${body}\n` : `WEBVTT\n\n${body}\n`;
}

/* ─────────────────────────── prompt helpers ─────────────────────────── */

/**
 * The transcript the AI receives. Timestamps are kept (the AI must place
 * activities on real moments), and optional speaker labels preserve dialogue
 * turns, which is what makes "who said this?" activities possible.
 */
export function cuesToTranscript(
  cues: SubtitleCue[],
  options: { withTimestamps?: boolean; withSpeakers?: boolean; withTranslation?: boolean; maxChars?: number } = {},
): string {
  const { withTimestamps = true, withSpeakers = true, withTranslation = false, maxChars = 120_000 } = options;
  const lines: string[] = [];
  for (const cue of cues) {
    const parts: string[] = [];
    if (withTimestamps) parts.push(`[${secondsToTimecode(cue.startTime)}]`);
    if (withSpeakers && cue.speaker) parts.push(`${cue.speaker}:`);
    parts.push(cue.text);
    if (withTranslation && cue.translation) parts.push(`\n    → ${cue.translation}`);
    lines.push(parts.join(" "));
    if (lines.join("\n").length > maxChars) {
      lines.push("… [transcript truncated to fit the prompt budget] …");
      break;
    }
  }
  return lines.join("\n");
}

export interface CueSegment {
  index: number;
  startTime: number;
  endTime: number;
  startCue: number;
  endCue: number;
  title: string;
  transcript: string;
  wordCount: number;
}

/**
 * Split the transcript into 8–16 teaching segments (the lesson schema's unit).
 * Boundaries prefer long pauses and sentence endings, never land mid-sentence
 * when a better boundary exists within ±2 cues, and the last segment always
 * reaches the end of the media.
 */
export function segmentCues(cues: SubtitleCue[], targetSegments = 10, options: { topicHint?: string } = {}): CueSegment[] {
  if (!cues.length) return [];
  const segments = Math.max(1, Math.min(16, Math.round(targetSegments)));
  const total = cues[cues.length - 1].endTime;
  const idealSpan = total / segments;
  const boundaries: number[] = [0];

  for (let s = 1; s < segments; s++) {
    const target = idealSpan * s;
    let best = -1;
    let bestScore = Infinity;
    const window = Math.max(3, Math.floor(cues.length / (segments * 4)));
    const centre = cues.findIndex((c) => c.startTime >= target);
    const from = Math.max(boundaries[boundaries.length - 1] + 1, centre - window);
    const to = Math.min(cues.length - 1, centre + window);
    for (let i = from; i <= to; i++) {
      const prev = cues[i - 1];
      const pause = cues[i].startTime - prev.endTime;
      const sentenceBonus = /[.!?…]["')\]]?$/.test(prev.text.trim()) ? 1 : 0;
      const score = Math.abs(cues[i].startTime - target) - pause * 2 - sentenceBonus * 4;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best > 0 && best > boundaries[boundaries.length - 1]) boundaries.push(best);
  }

  return boundaries.map((startCue, i) => {
    const endCue = i + 1 < boundaries.length ? boundaries[i + 1] - 1 : cues.length - 1;
    const slice = cues.slice(startCue, endCue + 1);
    const words = slice.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0);
    const startTime = slice[0].startTime;
    const endTime = slice[slice.length - 1].endTime;
    const speakers = [...new Set(slice.map((c) => c.speaker).filter(Boolean))];
    return {
      index: i,
      startTime,
      endTime,
      startCue,
      endCue,
      title:
        options.topicHint ??
        `Segment ${i + 1} · ${formatSegmentTitle(slice[0]?.text ?? "")}`,
      transcript: cuesToTranscript(slice, { withSpeakers: speakers.length > 1 }),
      wordCount: words,
    };
  });
}

function formatSegmentTitle(text: string): string {
  const clean = text.replace(/^[-–\s]+/, "").trim();
  const words = clean.split(/\s+/).slice(0, 6).join(" ");
  return words.length ? `${words}${clean.split(/\s+/).length > 6 ? "…" : ""}` : "";
}

/** Transcript text for one prompt call (whole episode, a segment, or the current cue). */
export function transcriptForRange(cues: SubtitleCue[], start: number, end: number): string {
  return cuesToTranscript(
    cues.filter((c) => c.endTime > start && c.startTime < end),
    { withTimestamps: true, withSpeakers: true },
  );
}
