import { error, json } from "@/lib/api";
import { probeServices, resolveFreeAvailability, type FreeAvailability } from "@/modules/discovery/free-services";
import { lookupTitle, missingApiKeys } from "@/modules/discovery/metadata";
import { searchCatalog } from "@/modules/discovery/service";
import type { DiscoverTitle } from "@/modules/discovery/types";

/**
 * Everything about one title, and every legal way to watch it.
 *
 *   1. `info`     — TMDB + OMDb: cast, crew, ratings, seasons, trailers, and the
 *                   official destinations the title streams on in this region.
 *   2. `playable` — the same title cross-matched against the video platforms this
 *                   app can actually play (YouTube, Dailymotion, Vimeo). Only an
 *                   embeddable upload is offered, and it plays in the platform's own
 *                   player; for everything else the answer is an official deep link,
 *                   never a pirate stream.
 *   3. `free`     — every free, *licensed* place the title can be watched: the ones
 *                   TMDB confirms carry it, plus search links into the same
 *                   services for the rest, and which of them are reachable right
 *                   now. See modules/discovery/free-services.ts for why the
 *                   unlicensed aggregators are not in here.
 *
 * Providers that need a key report themselves in `missingKeys` so the UI can tell
 * the operator exactly which environment variable to set.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const titleId = params.get("titleId");
  if (!titleId) return error("A titleId is required");

  // A platform-hosted video has no TMDB id of its own, so the client passes the title
  // it already knows and the same information page is built from the match.
  const hintTitle = params.get("title");
  const hint = hintTitle
    ? {
        title: hintTitle,
        year: Number(params.get("year")) || null,
        kind: params.get("kind") === "series" ? ("series" as const) : params.get("kind") === "movie" ? ("movie" as const) : null,
      }
    : undefined;

  const { info, error: infoError, missingKeys } = await lookupTitle(titleId, hint);
  const playable: DiscoverTitle[] = [];
  let playableNote: string | null = null;

  if (info) {
    try {
      const found = await searchCatalog({
        query: info.title,
        kind: info.kind === "series" ? "series" : "movie",
        providers: ["youtube", "dailymotion", "vimeo"],
        limit: 10,
      });
      const year = Number(info.releaseDate?.slice(0, 4)) || null;
      const withSources = found.titles.filter((t) => t.sources.length > 0);
      // Prefer a copy from the same year — a 1968 print is usually what a teacher
      // means when they search "Night of the Living Dead".
      const sameEra = year ? withSources.filter((t) => t.year === null || Math.abs(t.year - year) <= 1) : withSources;
      playable.push(...(sameEra.length ? sameEra : withSources).slice(0, 4));
      if (!playable.length) playableNote = "No first-party upload of this title was found on YouTube, Dailymotion or Vimeo.";
    } catch (err) {
      playableNote = `Licensed catalogs could not be searched: ${(err as Error).message}`;
    }
  }

  // Free-and-legal destinations. Pure computation over the TMDB data, so it works
  // with no keys at all; the reachability probe is the only network call and its
  // failure is non-fatal.
  let free: FreeAvailability | null = null;
  let serviceReachable: Record<string, boolean> | null = null;
  if (info) {
    free = resolveFreeAvailability({
      title: info.title,
      watch: info.watch,
      watchLink: info.watchLink,
      region: (process.env.TMDB_REGION || "US").toUpperCase(),
    });
    try {
      serviceReachable = await probeServices();
    } catch {
      serviceReachable = null;
    }
  }

  return json({
    info,
    playable,
    playableNote,
    free,
    serviceReachable,
    error: infoError,
    missingKeys: missingApiKeys(),
  });
}
