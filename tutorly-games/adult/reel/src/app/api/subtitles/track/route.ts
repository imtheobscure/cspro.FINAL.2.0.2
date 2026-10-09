import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subtitleCues, subtitleTracks } from "@/db/schema";
import { error, json, readJson } from "@/lib/api";
import { detectFormat, estimateWordTimings, qaReport, shiftTrack, stretchTrack, toSrt, toVtt, type ParsedTrack } from "@/modules/subtitles/engine";
import { persistTrack } from "@/modules/subtitles/store";

type Body = {
  trackId: string;
  action: "shift" | "stretch" | "editCue";
  /** Seconds for shift/stretch, or the new text for editCue. */
  amount?: number;
  text?: string;
  cueIndex?: number;
};

async function loadTrack(trackId: string) {
  const [track] = await db.select().from(subtitleTracks).where(eq(subtitleTracks.id, trackId)).limit(1);
  if (!track) return null;
  const cues = await db.select().from(subtitleCues).where(eq(subtitleCues.trackId, trackId)).orderBy(asc(subtitleCues.cueIndex));
  return { track, cues };
}

/** QA report + export for one stored track (the Subtitle Edit-style inspection view). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const trackId = url.searchParams.get("trackId");
  if (!trackId) return error("trackId is required");
  const loaded = await loadTrack(trackId);
  if (!loaded) return error("Track not found", 404);
  const parsed: ParsedTrack = {
    alignment: loaded.track.alignment === "word" ? "word" : loaded.track.alignment === "estimated" ? "estimated" : "cue",
    cues: loaded.cues.map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      text: c.text,
      speaker: c.speaker,
      words: estimateWordTimings(c.text, c.startTime, c.endTime),
    })),
  };
  const format = url.searchParams.get("export");
  if (format === "vtt" || format === "srt") {
    const body = format === "vtt" ? toVtt(parsed.cues) : toSrt(parsed.cues);
    return new Response(body, {
      headers: {
        "Content-Type": format === "vtt" ? "text/vtt; charset=utf-8" : "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${trackId}.${format}"`,
      },
    });
  }
  const limit = Number(url.searchParams.get("limit") ?? 400);
  return json({
    track: { id: loaded.track.id, language: loaded.track.language, label: loaded.track.label, type: loaded.track.type, source: loaded.track.source, format: loaded.track.format },
    cues: parsed.cues.slice(0, limit),
    qa: qaReport(parsed),
  });
}

/**
 * Sync repair: nudge or rescale a whole track (PAL speed-up, off-by-N-seconds) or
 * fix a single cue's text, then re-run the QA pass and report the new numbers.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body.trackId || !body.action) return error("trackId and action are required");
  const loaded = await loadTrack(body.trackId);
  if (!loaded) return error("Track not found", 404);

  let parsed: ParsedTrack = {
    alignment: loaded.track.alignment === "word" ? "word" : loaded.track.alignment === "estimated" ? "estimated" : "cue",
    cues: loaded.cues.map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      text: c.text,
      speaker: c.speaker,
      words: estimateWordTimings(c.text, c.startTime, c.endTime),
    })),
  };

  if (body.action === "shift") parsed = shiftTrack(parsed, Number(body.amount ?? 0));
  else if (body.action === "stretch") {
    const factor = Number(body.amount ?? 1);
    if (!Number.isFinite(factor) || factor <= 0.5 || factor >= 2) return error("Stretch factor must be between 0.5 and 2");
    parsed = stretchTrack(parsed, factor);
  } else if (body.action === "editCue") {
    const index = Number(body.cueIndex ?? -1);
    if (!parsed.cues[index]) return error("Cue not found", 404);
    const text = (body.text ?? "").trim();
    if (!text) return error("Cue text cannot be empty");
    const cue = parsed.cues[index];
    parsed.cues[index] = { ...cue, text, words: estimateWordTimings(text, cue.startTime, cue.endTime) };
  } else return error("Unknown action");

  const stored = await persistTrack({
    episodeId: loaded.track.episodeId,
    language: loaded.track.language,
    label: loaded.track.label,
    type: loaded.track.type as "original" | "translation" | "forced",
    format: loaded.track.format ?? detectFormat(""),
    source: loaded.track.source,
    sourceUrl: loaded.track.sourceUrl,
    parsed,
    replace: true,
  });

  return json({ ok: true, ...stored, trackId: loaded.track.id });
}
