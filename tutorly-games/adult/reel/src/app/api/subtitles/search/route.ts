import { eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, videoSources } from "@/db/schema";
import { error, json, readJson } from "@/lib/api";
import { searchSubtitles, subtitleProviderStatuses, type SubtitleQuery } from "@/modules/subtitles/providers";

type Body = Partial<SubtitleQuery> & { episodeId?: string; providers?: string[] };

/**
 * Searches every configured subtitle provider for a film, series or episode.
 *
 * When the request targets an episode it fills the query in from the local catalog,
 * so a learner pressing “Find subtitles” inside the player does not have to retype the
 * title. Platform-hosted sources (YouTube, Dailymotion, Vimeo) publish no caption file
 * to fetch, so nothing is scraped from them — the search is by title only.
 */
export async function POST(req: Request) {
  const body = await readJson<Body>(req);
  let query = (body.query ?? "").trim();
  let languages = body.languages?.length ? body.languages : ["en"];

  if (body.episodeId) {
    const [episode] = await db
      .select({ id: episodes.id, title: episodes.title, language: episodes.language, targetLanguage: episodes.targetLanguage })
      .from(episodes)
      .where(eq(episodes.id, body.episodeId))
      .limit(1);
    if (!episode) return error("Episode not found", 404);
    query = query || episode.title;
    if (!body.languages?.length) languages = ["en", (episode.targetLanguage ?? "en").slice(0, 2).toLowerCase()];
  }

  if (query.length < 2 && !body.imdbId && !body.tmdbId) return error("Provide a title to search for, or open this on an episode");
  const { results, errors } = await searchSubtitles({
    query,
    imdbId: body.imdbId ?? null,
    tmdbId: body.tmdbId ?? null,
    season: body.season ?? null,
    episode: body.episode ?? null,
    languages,
    limit: body.limit ?? 20,
    providers: body.providers,
  });
  return json({ results, errors, providers: subtitleProviderStatuses() });
}
