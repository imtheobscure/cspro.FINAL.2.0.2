/**
 * Subtitle engine: normalization of VTT / SRT / WhisperX JSON into
 * { cues, words } plus efficient time-indexed lookups.
 */

export type ParsedWord = { text: string; startTime: number; endTime: number; confidence: number | null; speaker?: string | null };
export type ParsedCue = { startTime: number; endTime: number; text: string; speaker?: string | null; words: ParsedWord[] };
export type ParsedTrack = { cues: ParsedCue[]; alignment: "word" | "estimated" | "cue" };

export function parseTimecode(tc: string): number {
  const t = tc.trim().replace(",", ".");
  const parts = t.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/** Estimate word timings inside a cue proportionally to character length (used when no aligner output exists). */
export function estimateWordTimings(text: string, start: number, end: number): ParsedWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const total = tokens.reduce((a, t) => a + t.length + 1, 0);
  let cursor = start;
  const duration = Math.max(0.05, end - start);
  return tokens.map((tok) => {
    const share = ((tok.length + 1) / total) * duration;
    const w = { text: tok, startTime: cursor, endTime: cursor + share, confidence: null };
    cursor += share;
    return w;
  });
}

function cleanCueText(raw: string): { text: string; speaker: string | null } {
  let text = raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  let speaker: string | null = null;
  const m = text.match(/^([A-Z][A-Za-z .']{0,24}):\s+(.*)$/);
  if (m) {
    speaker = m[1];
    text = m[2];
  }
  return { text, speaker };
}

export function parseVttOrSrt(input: string): ParsedTrack {
  const lines = input.replace(/\r/g, "").split("\n");
  const cues: ParsedCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes("-->")) {
      const [a, b] = line.split("-->");
      const startTime = parseTimecode(a);
      const endTime = parseTimecode(b.split(" ")[0] === "" ? b.trim().split(/\s+/)[0] : b.trim().split(/\s+/)[0]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "") {
        textLines.push(lines[i]);
        i++;
      }
      const { text, speaker } = cleanCueText(textLines.join(" "));
      if (text && Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
        cues.push({ startTime, endTime, text, speaker, words: estimateWordTimings(text, startTime, endTime) });
      }
    } else {
      i++;
    }
  }
  return { cues, alignment: "estimated" };
}

type WhisperXOutput = {
  segments: {
    start: number;
    end: number;
    text: string;
    speaker?: string;
    words?: { word: string; start?: number; end?: number; score?: number; speaker?: string }[];
  }[];
};

/** WhisperX JSON (word-level timestamps + diarization) → normalized track */
export function parseWhisperX(json: WhisperXOutput): ParsedTrack {
  const cues: ParsedCue[] = json.segments.map((seg) => {
    const words: ParsedWord[] = [];
    let lastEnd = seg.start;
    for (const w of seg.words ?? []) {
      const start = w.start ?? lastEnd;
      const end = w.end ?? start + 0.2;
      lastEnd = end;
      words.push({ text: w.word.trim(), startTime: start, endTime: end, confidence: w.score ?? null, speaker: w.speaker ?? seg.speaker ?? null });
    }
    return {
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text.trim(),
      speaker: seg.speaker ?? null,
      words: words.length ? words : estimateWordTimings(seg.text.trim(), seg.start, seg.end),
    };
  });
  return { cues, alignment: "word" };
}

/* ------------------------------------------------------------------ */
/* ASS / SSA                                                           */
/* ------------------------------------------------------------------ */

const ASS_TAG = /\{[^}]*\}/g;

/**
 * ASS/SSA dialogue lines: `Dialogue: 0,0:00:01.00,0:00:03.20,Default,,0,0,0,,Text`
 * Style, positioning and karaoke tags are stripped so the engine sees plain text,
 * matching what Subtitle Edit does before it re-exports to VTT/SRT.
 */
export function parseAss(input: string): ParsedTrack {
  const lines = input.replace(/\r/g, "").split("\n");
  const cues: ParsedCue[] = [];
  let format: string[] = ["Layer", "Start", "End", "Style", "Name", "MarginL", "MarginR", "MarginV", "Effect", "Text"];
  for (const line of lines) {
    if (/^Format:/i.test(line)) {
      format = line.slice(line.indexOf(":") + 1).split(",").map((f) => f.trim());
      continue;
    }
    if (!/^Dialogue:/i.test(line)) continue;
    const payload = line.slice(line.indexOf(":") + 1);
    const fields = payload.split(",");
    // Text is always last and may contain commas.
    const textIndex = format.findIndex((f) => f.toLowerCase() === "text");
    const keep = textIndex >= 0 ? textIndex : 9;
    const head = fields.slice(0, keep);
    const text = fields.slice(keep).join(",");
    const startIdx = format.findIndex((f) => /^start$/i.test(f));
    const endIdx = format.findIndex((f) => /^end$/i.test(f));
    const startTime = parseTimecode(head[startIdx >= 0 ? startIdx : 1] ?? "");
    const endTime = parseTimecode(head[endIdx >= 0 ? endIdx : 2] ?? "");
    const nameIdx = format.findIndex((f) => /^name$/i.test(f));
    const { text: clean, speaker } = cleanCueText(text.replace(ASS_TAG, "").replace(/\\[Nnh]/g, " ").replace(/\s+/g, " ").trim());
    const actor = nameIdx >= 0 ? (head[nameIdx] ?? "").trim() : "";
    if (clean && Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime) {
      cues.push({ startTime, endTime, text: clean, speaker: speaker ?? (actor || null), words: estimateWordTimings(clean, startTime, endTime) });
    }
  }
  return { cues: cues.sort((a, b) => a.startTime - b.startTime), alignment: "estimated" };
}

export type SubtitleFormat = "vtt" | "srt" | "ass" | "json" | "unknown";

export function detectFormat(input: string): SubtitleFormat {
  const t = input.trim();
  if (t.startsWith("WEBVTT")) return "vtt";
  if (t.startsWith("{")) return "json";
  if (/^\[Script Info\]|\[Events\]|^Dialogue:/im.test(t)) return "ass";
  if (/^\d+\s*\n\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(t) || t.includes("-->")) return "srt";
  return "unknown";
}

export function detectAndParse(input: string): ParsedTrack {
  const trimmed = input.trim();
  const format = detectFormat(trimmed);
  if (format === "json") return parseWhisperX(JSON.parse(trimmed) as WhisperXOutput);
  if (format === "ass") return parseAss(trimmed);
  return parseVttOrSrt(trimmed);
}

/* ------------------------------------------------------------------ */
/* QA / repair (Subtitle Edit-style)                                    */
/* ------------------------------------------------------------------ */

export type SubtitleIssue = {
  code: "overlap" | "too_long" | "too_fast" | "too_short" | "empty" | "duplicate" | "negative_time" | "unreadable";
  severity: "error" | "warning";
  cueIndex: number;
  message: string;
};

export type QaReport = {
  cues: number;
  words: number;
  durationSeconds: number;
  charactersPerSecond: number;
  readingSpeedOk: boolean;
  issues: SubtitleIssue[];
  counts: Record<SubtitleIssue["severity"], number>;
};

/**
 * Subtitle Edit's core QA pass, distilled: overlaps, reading speed, line length,
 * empty and duplicated cues. Returns the numbers the UI shows after an import so a
 * learner (or a teacher) can see whether the file is actually usable.
 */
export function qaReport(parsed: ParsedTrack, opts: { maxCps?: number; maxChars?: number; minDuration?: number; maxDuration?: number } = {}): QaReport {
  const maxCps = opts.maxCps ?? 21;
  const maxChars = opts.maxChars ?? 84;
  const minDuration = opts.minDuration ?? 0.7;
  const maxDuration = opts.maxDuration ?? 7.5;
  const issues: SubtitleIssue[] = [];
  const seen = new Map<string, number>();
  let characters = 0;
  let speech = 0;
  let words = 0;

  parsed.cues.forEach((cue, index) => {
    const duration = cue.endTime - cue.startTime;
    const chars = cue.text.length;
    characters += chars;
    words += cue.words.length || cue.text.split(/\s+/).filter(Boolean).length;
    if (duration > 0) speech += duration;

    if (len(cue.text) === 0) issues.push({ code: "empty", severity: "error", cueIndex: index, message: "Cue has no text" });
    if (cue.startTime < 0 || cue.endTime <= cue.startTime)
      issues.push({ code: "negative_time", severity: "error", cueIndex: index, message: "Cue ends before it starts" });
    if (duration > 0 && chars / duration > maxCps)
      issues.push({ code: "too_fast", severity: "warning", cueIndex: index, message: `${(chars / duration).toFixed(1)} chars/sec (limit ${maxCps})` });
    if (chars > maxChars) issues.push({ code: "too_long", severity: "warning", cueIndex: index, message: `${chars} characters on screen (limit ${maxChars})` });
    if (duration > 0 && duration < minDuration)
      issues.push({ code: "too_short", severity: "warning", cueIndex: index, message: `${duration.toFixed(2)}s on screen (min ${minDuration}s)` });
    if (duration > maxDuration) issues.push({ code: "too_long", severity: "warning", cueIndex: index, message: `${duration.toFixed(1)}s on screen (max ${maxDuration}s)` });
    const key = cue.text.toLowerCase().trim();
    if (key && seen.has(key)) issues.push({ code: "duplicate", severity: "warning", cueIndex: index, message: `Same text as cue ${seen.get(key)! + 1}` });
    else if (key) seen.set(key, index);

    const prev = parsed.cues[index - 1];
    if (prev && cue.startTime < prev.endTime - 0.001)
      issues.push({ code: "overlap", severity: "warning", cueIndex: index, message: `Overlaps cue ${index}` });
  });

  return {
    cues: parsed.cues.length,
    words,
    durationSeconds: speech,
    charactersPerSecond: speech > 0 ? Number((characters / speech).toFixed(2)) : 0,
    readingSpeedOk: !issues.some((i) => i.code === "too_fast"),
    issues: issues.slice(0, 60),
    counts: { error: issues.filter((i) => i.severity === "error").length, warning: issues.filter((i) => i.severity === "warning").length },
  };

  function len(s: string) {
    return s.replace(/\s+/g, " ").trim().length;
  }
}

/** Shifts every cue (and its word timings) by `offsetSeconds` — never below zero. */
export function shiftTrack(parsed: ParsedTrack, offsetSeconds: number): ParsedTrack {
  const shift = (t: number) => Math.max(0, t + offsetSeconds);
  return {
    alignment: parsed.alignment,
    cues: parsed.cues.map((c) => ({ ...c, startTime: shift(c.startTime), endTime: shift(c.endTime), words: c.words.map((w) => ({ ...w, startTime: shift(w.startTime), endTime: shift(w.endTime) })) })),
  };
}

/** Rescales cues to fit a different runtime (frame-rate / PAL-speed corrections). */
export function stretchTrack(parsed: ParsedTrack, factor: number): ParsedTrack {
  const f = (t: number) => t * factor;
  return {
    alignment: parsed.alignment,
    cues: parsed.cues.map((c) => ({ ...c, startTime: f(c.startTime), endTime: f(c.endTime), words: c.words.map((w) => ({ ...w, startTime: f(w.startTime), endTime: f(w.endTime) })) })),
  };
}

export function toSrt(cues: { startTime: number; endTime: number; text: string }[]): string {
  const f = (t: number) => {
    const ms = Math.max(0, Math.round(t * 1000));
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const milli = ms % 1000;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
  };
  return cues.map((c, i) => `${i + 1}\n${f(c.startTime)} --> ${f(c.endTime)}\n${c.text}\n`).join("\n");
}

/** Merges several tracks into one bilingual track (translation appended under the original). */
export function mergeBilingual(original: ParsedTrack, translation: ParsedTrack): ParsedTrack {
  const cues = original.cues.map((cue) => {
    const other = translation.cues.find((t) => Math.abs(t.startTime - cue.startTime) < 0.6) ?? translation.cues.find((t) => t.startTime >= cue.startTime && t.startTime < cue.endTime);
    if (!other) return cue;
    const text = `${cue.text}\n${other.text}`;
    return { ...cue, text, words: estimateWordTimings(text, cue.startTime, cue.endTime) };
  });
  return { cues, alignment: "estimated" };
}

/* ------------------------------------------------------------------ */
/* Runtime lookup (client)                                             */
/* ------------------------------------------------------------------ */

export type RuntimeWord = { id: number; text: string; startTime: number; endTime: number };
export type RuntimeCue = {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string | null;
  words: RuntimeWord[];
};

/** Binary search: index of the cue active at `time` (or -1). Cues must be sorted by startTime. */
export function findCueIndex(cues: RuntimeCue[], time: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (time < c.startTime) hi = mid - 1;
    else if (time > c.endTime) lo = mid + 1;
    else return mid;
  }
  return -1;
}

/** Cue whose start is nearest before `time` — useful for "previous sentence" */
export function findNearestCueBefore(cues: RuntimeCue[], time: number): number {
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].startTime <= time) idx = i;
    else break;
  }
  return idx;
}

export function toVtt(cues: { startTime: number; endTime: number; text: string }[]): string {
  const f = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = (t % 60).toFixed(3).padStart(6, "0");
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s}`;
  };
  return "WEBVTT\n\n" + cues.map((c) => `${f(c.startTime)} --> ${f(c.endTime)}\n${c.text}\n`).join("\n");
}
