import { eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes } from "@/db/schema";
import { error, json, readJson } from "@/lib/api";
import { detectAndParse, detectFormat, shiftTrack } from "@/modules/subtitles/engine";
import { subtitleProviderById, type SubtitleSearchResult } from "@/modules/subtitles/providers";
import { persistTrack } from "@/modules/subtitles/store";

type Body = {
  episodeId: string;
  result: SubtitleSearchResult;
  type?: "original" | "translation" | "forced";
  label?: string;
  /** Sync nudge in seconds applied before the track is stored. */
  shiftSeconds?: number;
};

/**
 * Downloads one subtitle search result, normalizes it through the engine
 * (VTT/SRT/ASS, zipped or gzipped), optionally nudges it in sync, then stores it
 * with a QA report so the learner sees reading speed and problem cues right away.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  if (!body.episodeId || !body.result) return error("episodeId and result are required");
  const [episode] = await db
    .select({ id: episodes.id, language: episodes.language })
    .from(episodes)
    .where(eq(episodes.id, body.episodeId))
    .limit(1);
  if (!episode) return error("Episode not found", 404);

  const provider = subtitleProviderById(body.result.provider);
  if (!provider) return error(`Unknown subtitle provider “${body.result.provider}”`);
  if (!provider.configured()) return error(`${provider.name} is not configured${provider.requiresEnv ? ` (set ${provider.requiresEnv})` : ""}`, 400);

  let downloaded: { text: string; filename: string };
  try {
    downloaded = await provider.download(body.result);
  } catch (err) {
    return error((err as Error).message, 502);
  }

  let parsed;
  try {
    parsed = detectAndParse(downloaded.text);
  } catch (err) {
    return error(`Could not parse “${downloaded.filename}”: ${(err as Error).message}`, 422);
  }
  if (!parsed.cues.length) return error("No cues found in the downloaded file", 422);
  if (body.shiftSeconds) parsed = shiftTrack(parsed, body.shiftSeconds);

  const language = body.result.language;
  const episodeLanguage = (episode.language ?? "en").slice(0, 2).toLowerCase();
  const inferred: "original" | "translation" | "forced" = body.type ?? (language === episodeLanguage ? "original" : "translation");

  const stored = await persistTrack({
    episodeId: body.episodeId,
    language,
    label: body.label ?? `${provider.name} · ${body.result.languageLabel}`,
    type: inferred,
    format: detectFormat(downloaded.text),
    source: `subtitle-provider:${provider.id}`,
    sourceUrl: body.result.url ?? body.result.providerRef,
    parsed,
  });

  return json({
    ok: true,
    ...stored,
    filename: downloaded.filename,
    provider: provider.name,
    language,
    note: body.result.automatic ? "Automatic or machine-translated captions — expect errors." : body.result.note,
  });
}
