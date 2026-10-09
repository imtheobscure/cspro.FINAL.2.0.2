/**
 * Subtitle parsing — every format normalises into `SubtitleCue[]`.
 *
 * Supported (matching what Subtitle Edit / WhisperX and the streaming engines
 * hand us): WebVTT (with inline `<00:00:01.000>` word timings and `<v Name>`
 * speaker tags), SRT (incl. the `.vtt` variant with commas), ASS/SSA
 * `[Events] Dialogue:` lines (the format most "downloaded subtitles" come in),
 * Vidstack/Flix JSON captions, and bare transcripts
 * (`00:12 hello there` / `[00:12.500] hello`).
 *
 * Word-level timings matter: they drive karaoke highlighting, click-a-word to
 * seek, and the "replay this word" button. When a format has none we synthesise
 * them by weighting each word by its length inside the cue window, which keeps
 * the highlight moving at a believable speed.
 */

import type { SubtitleCue, SubtitleFormat, SubtitleWord } from "../../types";

const TIME_RE = /(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?/;

/** "01:02:03.400" / "02:03,40" / "62.5" → seconds. */
export function timeToSeconds(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const m = TIME_RE.exec(trimmed);
  if (!m) return 0;
  const [, hh, mm, ss, frac] = m;
  const hours = hh ? Number(hh) : 0;
  const minutes = mm ? Number(mm) : 0;
  const seconds = ss ? Number(ss) : 0;
  const fracSeconds = frac ? Number(`0.${frac.padEnd(3, "0")}`) : 0;
  return hours * 3600 + minutes * 60 + seconds + fracSeconds;
}

/** 3725.4 → "01:02:05.400" (WebVTT) */
export function secondsToTimecode(seconds: number, comma = false): string {
  const clamped = Math.max(0, seconds);
  const hh = Math.floor(clamped / 3600);
  const mm = Math.floor((clamped % 3600) / 60);
  const ss = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}${comma ? "," : "."}${pad(ms, 3)}`;
}

/** 3725 → "1:02:05", 65 → "1:05" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return hh > 0 ? `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${mm}:${String(ss).padStart(2, "0")}`;
}

/** Strip ASS override blocks / VTT tags but keep `<v Speaker>` and word timings. */
function stripMarkup(line: string): { text: string; speaker?: string } {
  let speaker: string | undefined;
  const speakerMatch = /<v\s+([^>]+)>/i.exec(line);
  if (speakerMatch) speaker = speakerMatch[1].trim();
  const cleaned = line
    .replace(/\{\\[^}]*\}/g, "") // ASS overrides {\an8}{\pos(…)}
    .replace(/<v\s+([^>]+)>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/\u200b/g, "")
    .trim();
  return { text: cleaned, speaker };
}

/** Words split for languages without spaces are best-effort. */
function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Even-distribution word timings. Longer words get longer slots, which is a
 * decent approximation of speech and much better than a constant rate.
 */
export function synthesiseWords(cue: Pick<SubtitleCue, "text" | "startTime" | "endTime">): SubtitleWord[] {
  const words = splitWords(cue.text);
  if (!words.length) return [];
  const span = Math.max(0.2, cue.endTime - cue.startTime);
  const weights = words.map((w) => Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, "").length));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = cue.startTime;
  return words.map((text, i) => {
    const share = (weights[i] / total) * span;
    const start = cursor;
    const end = i === words.length - 1 ? cue.endTime : Math.min(cue.endTime, start + share);
    cursor = end;
    return { text, startTime: start, endTime: end, confidence: 0.5 };
  });
}

/** Parse `<00:00:01.000>word<00:00:01.400>word` inline word timings. */
function parseInlineWords(line: string, cueStart: number, cueEnd: number): SubtitleWord[] | null {
  const parts = line.split(/(<\d{1,3}:\d{2}:\d{2}[.,]\d{1,3}>)/).filter(Boolean);
  if (parts.length < 3) return null;
  const words: SubtitleWord[] = [];
  let pendingStart: number | null = null;
  for (const part of parts) {
    const stamp = /^<(\d{1,3}:\d{2}:\d{2}[.,]\d{1,3})>$/.exec(part.trim());
    if (stamp) {
      const t = timeToSeconds(stamp[1]);
      if (pendingStart !== null && words.length) words[words.length - 1].endTime = t;
      pendingStart = t;
      continue;
    }
    const { text } = stripMarkup(part);
    if (text && pendingStart !== null) {
      for (const word of splitWords(text)) {
        words.push({ text: word, startTime: pendingStart, endTime: cueEnd, confidence: 0.9 });
      }
      pendingStart = null;
    }
  }
  if (!words.length) return null;
  words[words.length - 1].endTime = cueEnd;
  // Clamp to the cue window; some files drift.
  return words.map((w) => ({
    ...w,
    startTime: Math.max(cueStart, Math.min(w.startTime, cueEnd)),
    endTime: Math.max(cueStart, Math.min(w.endTime, cueEnd)),
  }));
}

/* ─────────────────────────────── VTT / SRT ─────────────────────────────── */

function parseCueBlocks(raw: string, comma: boolean): SubtitleCue[] {
  const normalised = raw.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const blocks = normalised.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) continue;
    const timeIndex = lines.findIndex((l) => l.includes("-->"));
    if (timeIndex === -1) continue;
    const [startRaw, endRaw] = lines[timeIndex].split("-->");
    const startTime = timeToSeconds(startRaw);
    // `endRaw` starts with the space before the timecode, and splitting a string
    // that begins with whitespace on /\s+/ yields a leading "" — which silently
    // made EVERY cue 0.2 s long. Trim first, then take the first token (the
    // second token, when present, is a VTT cue setting like `line:90%`).
    const endToken = (endRaw ?? "").trim().split(/\s+/)[0] ?? "";
    const endTime = Math.max(startTime + 0.2, timeToSeconds(endToken));
    const bodyLines = lines.slice(timeIndex + 1);
    const speakerRaw = /<(?:v|V)\s+([^>]+)>/.exec(lines[timeIndex + 1] ?? "")?.[1];
    let words: SubtitleWord[] | null = null;
    const textParts: string[] = [];
    for (const line of bodyLines) {
      const inline = parseInlineWords(line, startTime, endTime);
      if (inline) words = [...(words ?? []), ...inline];
      const { text } = stripMarkup(line);
      if (text) textParts.push(text);
    }
    const text = textParts.join(" ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    cues.push({
      id: `c${cues.length}`,
      startTime,
      endTime,
      text,
      lines: bodyLines.map((l) => stripMarkup(l).text).filter(Boolean),
      words: words ?? undefined,
      speaker: speakerRaw?.trim(),
    });
  }
  void comma; // accepted so callers can assert they passed the right format
  return cues;
}

export function parseVtt(raw: string): SubtitleCue[] {
  return parseCueBlocks(raw, false);
}

export function parseSrt(raw: string): SubtitleCue[] {
  return parseCueBlocks(raw, true);
}

/* ───────────────────────────────── ASS / SSA ───────────────────────────────── */

export function parseAss(raw: string): SubtitleCue[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const cues: SubtitleCue[] = [];
  let inEvents = false;
  let format: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[events\]/i.test(trimmed)) {
      inEvents = true;
      continue;
    }
    if (/^\[/.test(trimmed)) {
      inEvents = false;
      continue;
    }
    if (!inEvents) continue;
    if (/^format\s*:/i.test(trimmed)) {
      format = trimmed
        .slice(trimmed.indexOf(":") + 1)
        .split(",")
        .map((p) => p.trim().toLowerCase());
      continue;
    }
    if (!/^dialogue\s*:/i.test(trimmed)) continue;
    const payload = trimmed.slice(trimmed.indexOf(":") + 1);
    const cols = format.length
      ? format
      : ["layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text"];
    // The text field is last and may contain commas, so split with a limit.
    const parts: string[] = [];
    let rest = payload;
    for (let i = 0; i < cols.length - 1; i++) {
      const comma = rest.indexOf(",");
      if (comma === -1) break;
      parts.push(rest.slice(0, comma));
      rest = rest.slice(comma + 1);
    }
    parts.push(rest);
    const get = (key: string) => parts[cols.indexOf(key)]?.trim() ?? "";
    const startTime = timeToSeconds(get("start"));
    const endTime = Math.max(startTime + 0.2, timeToSeconds(get("end")));
    const { text, speaker } = stripMarkup(get("text").replace(/\\N|\\n/gi, "\n"));
    const explicitSpeaker = get("name") || speaker;
    if (!text) continue;
    cues.push({
      id: `c${cues.length}`,
      startTime,
      endTime,
      text: text.replace(/\n/g, " ").replace(/\s+/g, " ").trim(),
      lines: text.split("\n").map((l) => l.trim()).filter(Boolean),
      speaker: explicitSpeaker || undefined,
    });
  }
  return cues;
}

/* ───────────────────────────── JSON / transcripts ───────────────────────────── */

export function parseJsonCaptions(raw: string): SubtitleCue[] {
  const data: unknown = JSON.parse(raw);
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { cues?: unknown }).cues)
      ? (data as { cues: unknown[] }).cues
      : Array.isArray((data as { segments?: unknown }).segments)
        ? (data as { segments: unknown[] }).segments
        : [];
  const cues: SubtitleCue[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const start = Number(o.startTime ?? o.start ?? o.t) || 0;
    const end = Number(o.endTime ?? o.end ?? (start + 3));
    const text = String(o.text ?? o.content ?? o.transcript ?? "").trim();
    if (!text) continue;
    const words = Array.isArray(o.words)
      ? (o.words as Record<string, unknown>[]).map((w) => ({
          text: String(w.text ?? w.word ?? "").trim(),
          startTime: Number(w.startTime ?? w.start ?? start) || start,
          endTime: Number(w.endTime ?? w.end ?? end) || end,
          confidence: typeof w.confidence === "number" ? w.confidence : undefined,
        }))
      : undefined;
    cues.push({
      id: `c${cues.length}`,
      startTime: start,
      endTime: Math.max(start + 0.2, end),
      text,
      words,
      speaker: typeof o.speaker === "string" ? o.speaker : undefined,
    });
  }
  return cues;
}

/** Bare transcript: `00:12 hello`, `[00:12.5] hello`, `12 hello`, or plain lines. */
export function parsePlainTranscript(raw: string): SubtitleCue[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  const cues: SubtitleCue[] = [];
  let cursor = 0;
  for (const line of lines) {
    const stamped = /^\[?((?:\d{1,3}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?|\d+(?:\.\d+)?)\]?\s*[-–:]?\s*(.+)$/.exec(line);
    let start = cursor;
    let text = line;
    if (stamped && /[\d]/.test(stamped[1])) {
      const parsed = timeToSeconds(stamped[1]);
      // A bare number under 10 seconds is probably not a timestamp — keep the line.
      if (parsed > 0.5) {
        start = parsed;
        text = stamped[2].trim();
      }
    }
    if (!text) continue;
    const end = start + Math.max(1.6, Math.min(7, text.split(/\s+/).length / 2.4));
    cues.push({ id: `c${cues.length}`, startTime: start, endTime: end, text });
    cursor = end;
  }
  return cues;
}

/* ─────────────────────────────── entry point ─────────────────────────────── */

export function detectFormat(filename: string | undefined, raw: string): SubtitleFormat {
  const ext = filename?.toLowerCase().split(".").pop();
  if (ext === "vtt") return "vtt";
  if (ext === "srt") return "srt";
  if (ext === "ass") return "ass";
  if (ext === "ssa") return "ssa";
  if (ext === "json") return "json";
  if (/^WEBVTT/.test(raw.trim())) return "vtt";
  if (/^\[Script Info\]/i.test(raw) || /^Dialogue\s*:/im.test(raw)) return "ass";
  if (/-->/.test(raw)) return /-->[^\n]*,\d{1,3}/.test(raw) ? "srt" : "vtt";
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) return "json";
  return "text";
}

export function parseSubtitles(
  raw: string,
  filename?: string,
): { cues: SubtitleCue[]; format: SubtitleFormat } {
  const format = detectFormat(filename, raw);
  const parse = () => {
    switch (format) {
      case "vtt":
        return parseVtt(raw);
      case "srt":
        return parseSrt(raw);
      case "ass":
      case "ssa":
        return parseAss(raw);
      case "json":
        try {
          return parseJsonCaptions(raw);
        } catch {
          return parsePlainTranscript(raw);
        }
      default:
        return parsePlainTranscript(raw);
    }
  };
  const parsed = parse();
  const cues = normaliseCues(parsed);
  return { cues, format };
}

/** Sort, de-duplicate, drop empty/zero-length cues, fill in word timings. */
export function normaliseCues(cues: SubtitleCue[]): SubtitleCue[] {
  const cleaned = cues
    .filter((c) => c && typeof c.text === "string" && c.text.trim())
    .map((c) => ({
      ...c,
      text: c.text.replace(/\s+/g, " ").trim(),
      startTime: Math.max(0, c.startTime),
      endTime: Math.max(c.startTime + 0.2, c.endTime),
      lines: c.lines?.length ? c.lines : undefined,
    }))
    .sort((a, b) => a.startTime - b.startTime);

  const seen = new Set<string>();
  const deduped: SubtitleCue[] = [];
  for (const cue of cleaned) {
    const key = `${cue.startTime.toFixed(2)}|${cue.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...cue, id: `c${deduped.length}` });
  }

  // Kill impossible overlaps by trimming the previous cue's tail.
  for (let i = 1; i < deduped.length; i++) {
    const prev = deduped[i - 1];
    if (prev.endTime > deduped[i].startTime) prev.endTime = Math.max(prev.startTime + 0.2, deduped[i].startTime - 0.02);
  }

  return deduped.map((cue) => (cue.words?.length ? cue : { ...cue, words: synthesiseWords(cue) }));
}
