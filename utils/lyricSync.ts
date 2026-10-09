/**
 * Lyrics/song helpers shared by the Lyrics and AI Karaoke widgets.
 *
 * The server resolves songs through LRCLIB, which can return *synced* lyrics as
 * LRC (`[00:12.67] line`). Those timestamps let the widget follow the real video
 * clock instead of advancing on a blind timer, which is the difference between a
 * karaoke sing-along and a slideshow.
 */

export interface SyncedLine {
  /** Seconds from the start of the track. */
  time: number;
  text: string;
}

export interface VideoCandidate {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
}

export interface SongPayload {
  song: string;
  artist: string;
  /** Plain lyrics (empty string when nothing was found — never a placeholder). */
  lyrics: string;
  /** Raw LRC text, or "" when the track has no timings. */
  syncedLyrics: string;
  /** Where the lyrics came from ("LRCLIB", "lyrics.ovh", or "" for none). */
  lyricsSource: string;
  instrumental: boolean;
  durationSeconds: number;
  /** Best embeddable video id, or "" when none was verified. */
  youtubeVideoId: string;
  video: VideoCandidate | null;
  /** Other verified, embeddable videos so a teacher can switch. */
  videos: VideoCandidate[];
  meaning: string;
}

/** `[mm:ss.xx]` / `[mm:ss:xx]` / `[hh:mm:ss.xx]` → seconds. */
function lrcTime(raw: string): number | null {
  const parts = raw.trim().replace(",", ".").split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => parseFloat(p));
  if (nums.some((n) => Number.isNaN(n))) return null;
  return nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
}

/**
 * Parse LRC into time-stamped lines.
 *
 * Handles multiple timestamps on one line (`[00:10.00][01:20.00] chorus`), which
 * LRCLIB uses for repeated hooks, and drops the metadata tags (`[ar:]`, `[ti:]`).
 */
export function parseLrc(lrc: string | undefined | null): SyncedLine[] {
  if (!lrc) return [];
  const out: SyncedLine[] = [];
  for (const rawLine of lrc.split(/\r?\n/)) {
    const stamps = [...rawLine.matchAll(/\[([0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?(?:[.,][0-9]{1,3})?)\]/g)];
    if (!stamps.length) continue;
    const text = rawLine.replace(/\[[^\]]*\]/g, "").trim();
    if (!text) continue;
    for (const s of stamps) {
      const t = lrcTime(s[1]);
      if (t !== null) out.push({ time: t, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

/** Index of the line that should be highlighted at `time` (-1 before the first line). */
export function activeLineIndex(lines: SyncedLine[], time: number): number {
  if (!lines.length) return -1;
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Lines for the scrolling display, whether or not timings are available. */
export function toDisplayLines(lyrics: string): SyncedLine[] {
  return lyrics
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => ({ time: -1, text }));
}
