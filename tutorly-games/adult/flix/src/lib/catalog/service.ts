/**
 * The catalog service.
 *
 * One search fans out to every source, tolerating failures: a catalog that is
 * unreachable or unkeyed contributes an error line, never a blank page. Results
 * are merged by title+year, and a *playable* entry always wins the merge so a
 * learner who searches a film that exists in the public domain gets the copy they
 * can actually watch, with the richer metadata borrowed on top.
 *
 * `lookupTitle` is the "find information about any movie" path: TMDB gives the
 * full picture (cast, crew, seasons, trailers, official destinations), OMDb adds
 * IMDb numbers, and the open catalogs are cross-searched for a copy we are
 * allowed to play. A title nothing free exists for still gets a complete page.
 */

import type { Episode, MediaTrack } from "../../types";
import { parseSubtitles } from "../subtitles";
import { dailymotionReachable, dailymotionResolve, dailymotionSearch } from "./dailymotion";
import { resolveFreeAvailability, type FreeAvailability } from "./free-services";
import { matchScore, normalizedTitle, titleCandidates } from "./matching";
import { tmdbInfo, tmdbReachable, tmdbSearch } from "./tmdb";
import { vimeoKeyPresent, vimeoReachable, vimeoResolve, vimeoSearch } from "./vimeo";
import { youtubeKeyPresent, youtubeReachable, youtubeResolve, youtubeSearch } from "./youtube";
import type { CatalogKeys, CatalogStatus, CatalogSubtitle, CatalogTitle } from "./types";
import { normaliseTitleKey } from "./types";

export type CatalogError = { source: string; message: string };

export type SearchResult = {
  query: string;
  titles: CatalogTitle[];
  statuses: CatalogStatus[];
  errors: CatalogError[];
};

export type TitleLookup = {
  title: CatalogTitle;
  /** Playable copies of the same title found in the open catalogs. */
  playable: CatalogTitle[];
  /**
   * Every free, *licensed* place this title can be watched: the services TMDB
   * confirms carry it, then search links into the rest. Null for an open-catalog
   * entry, which has no distribution data attached.
   */
  free: FreeAvailability | null;
  /** Non-fatal notes the panel should show (missing keys, no legal copy found). */
  notes: string[];
};

/** Providers whose entries carry their own official player. */
const PLAYABLE_PROVIDERS = new Set(["youtube", "dailymotion", "vimeo"]);

/** Which sources are live, and what each one is allowed to do. */
export async function catalogStatuses(keys: CatalogKeys): Promise<CatalogStatus[]> {
  const [tmdbOk, youtubeOk, dailymotionOk, vimeoOk] = await Promise.all([
    keys.tmdb ? tmdbReachable(keys.tmdb) : Promise.resolve(false),
    youtubeReachable(keys),
    dailymotionReachable(),
    vimeoReachable(keys),
  ]);
  return [
    {
      id: "youtube",
      label: "YouTube",
      configured: youtubeKeyPresent(keys),
      needsKey: !youtubeKeyPresent(keys),
      role: "playable",
      reachable: youtubeKeyPresent(keys) ? youtubeOk : null,
      note: "Every publicly embeddable video, played in YouTube's own player. Needs a free Data API v3 key from console.cloud.google.com.",
    },
    {
      id: "dailymotion",
      label: "Dailymotion",
      configured: true,
      needsKey: false,
      role: "playable",
      reachable: dailymotionOk,
      note: "Every embeddable video on Dailymotion, played in its official player. No key needed — this one works immediately.",
    },
    {
      id: "vimeo",
      label: "Vimeo",
      configured: vimeoKeyPresent(keys),
      needsKey: !vimeoKeyPresent(keys),
      role: "playable",
      reachable: vimeoKeyPresent(keys) ? vimeoOk : null,
      note: "Vimeo's public catalog — much of it documentary and educational — in Vimeo's own player. Optional; needs a free personal access token.",
    },
    {
      id: "tmdb",
      label: "TMDB",
      configured: !!keys.tmdb,
      needsKey: !keys.tmdb,
      role: "catalog",
      reachable: keys.tmdb ? tmdbOk : null,
      note: "Every movie and TV series: posters, cast, crew, seasons, trailers and each title's official streaming destinations. Free key at themoviedb.org.",
    },
    // OMDb used to sit here as a ratings-only source. It was removed: every IMDb
    // number came with a "needs OMDB_API_KEY" badge for a key nobody had to set, and
    // TMDB already carries the ratings the panel shows.
  ];
}

function rank(a: CatalogTitle, b: CatalogTitle): number {
  const byPlayable = Number(b.sources.length > 0) - Number(a.sources.length > 0);
  if (byPlayable) return byPlayable;
  const byPopularity = Math.log10(1 + b.popularity) - Math.log10(1 + a.popularity);
  if (Math.abs(byPopularity) > 0.05) return byPopularity;
  return (b.year ?? 0) - (a.year ?? 0);
}

/**
 * Rank decides the order, but ranking alone can hide a whole provider.
 *
 * `rank` breaks ties on popularity, and popularity is not comparable across
 * platforms: YouTube reports view counts in the millions while Vimeo reports play
 * counts in the dozens, so a global sort hands every slot to YouTube and Vimeo looks
 * broken even with a valid token. So each provider that answered keeps a few seats
 * off the top of its own ranked list, and the remaining seats go to the best of
 * everything else by rank. The visible page is then sorted by rank as usual.
 */
function pageByRankWithCoverage(ranked: CatalogTitle[], take: number): CatalogTitle[] {
  const byProvider = new Map<string, CatalogTitle[]>();
  for (const title of ranked) {
    const queue = byProvider.get(title.providerId);
    if (queue) queue.push(title);
    else byProvider.set(title.providerId, [title]);
  }
  if (byProvider.size < 2) return ranked.slice(0, take);

  const seatsEach = Math.max(1, Math.min(3, Math.floor(take / byProvider.size)));
  const reserved = new Set<CatalogTitle>();
  const page: CatalogTitle[] = [];
  for (const queue of byProvider.values()) {
    for (const title of queue.slice(0, seatsEach)) {
      reserved.add(title);
      page.push(title);
    }
  }
  for (const title of ranked) {
    if (page.length >= take) break;
    if (!reserved.has(title)) page.push(title);
  }
  return page.slice(0, take).sort(rank);
}

/**
 * Re-checks a platform entry's playback right before it is used.
 *
 * Every provider already builds its embed source during search, so this is a second
 * opinion on the one thing that changes after the fact: whether the owner still
 * allows embedding. Importing a video that has since been made unembeddable would
 * put a dead source in the library.
 */
async function hydrate(title: CatalogTitle, keys: CatalogKeys): Promise<CatalogTitle> {
  if (title.sources.length && title.providerId === "tmdb") return title;
  try {
    if (title.providerId === "youtube") title.sources = await youtubeResolve(title.externalId, keys);
    else if (title.providerId === "dailymotion") title.sources = await dailymotionResolve(title.externalId);
    else if (title.providerId === "vimeo") title.sources = await vimeoResolve(title.externalId, keys);
  } catch {
    // Keep whatever the search found; the player reports the problem if it is real.
  }
  return title;
}

/**
 * The topics behind the Discover opening feed.
 *
 * Discover used to be an empty page until you typed a query, which made it look as
 * though there were no YouTube or Dailymotion videos at all. Dailymotion needs no key,
 * so these searches always work and the page opens on real, playable videos.
 */
export const BROWSE_TOPICS: { id: string; label: string; query: string }[] = [
  { id: "conversation", label: "Everyday conversation", query: "english conversation practice with subtitles" },
  { id: "learning", label: "Learn English", query: "learn english lesson subtitles" },
  { id: "documentary", label: "Documentary", query: "documentary english subtitles" },
  { id: "science", label: "Science & nature", query: "science nature documentary english" },
  { id: "news", label: "News & current affairs", query: "news in english report" },
  { id: "stories", label: "Stories & shorts", query: "short film english subtitles" },
];

/**
 * A keyless browsing feed: curated topics, each a real search, playable hits only.
 * One failed topic degrades to an empty section instead of blanking the page.
 */
export async function browseCatalog(keys: CatalogKeys, topicLimit = 4): Promise<{ id: string; label: string; query: string; titles: CatalogTitle[] }[]> {
  const topics = BROWSE_TOPICS.slice(0, topicLimit);
  const sections = await Promise.all(
    topics.map(async (topic) => {
      try {
        const rows = await dailymotionSearch(topic.query, "any", 8);
        return { id: topic.id, label: topic.label, query: topic.query, titles: rows.filter((t) => t.sources.length).slice(0, 6) };
      } catch {
        return { id: topic.id, label: topic.label, query: topic.query, titles: [] as CatalogTitle[] };
      }
    }),
  );
  void keys;
  return sections.filter((section) => section.titles.length > 0);
}

export async function searchCatalog(keys: CatalogKeys, query: string, kind: "any" | "movie" | "series" = "any", limit = 12): Promise<SearchResult> {
  const errors: CatalogError[] = [];
  const settled = await Promise.all([
    youtubeSearch(query, kind, keys, limit).catch((err) => {
      errors.push({ source: "YouTube", message: (err as Error).message });
      return [] as CatalogTitle[];
    }),
    dailymotionSearch(query, kind, limit).catch((err) => {
      errors.push({ source: "Dailymotion", message: (err as Error).message });
      return [] as CatalogTitle[];
    }),
    vimeoSearch(query, kind, keys, limit).catch((err) => {
      errors.push({ source: "Vimeo", message: (err as Error).message });
      return [] as CatalogTitle[];
    }),
    (keys.tmdb ? tmdbSearch(query, kind, keys, limit) : Promise.resolve([] as CatalogTitle[])).catch((err) => {
      errors.push({ source: "TMDB", message: (err as Error).message });
      return [] as CatalogTitle[];
    }),
  ]);

  const merged = new Map<string, CatalogTitle>();
  for (const title of settled.flat()) {
    const key = normaliseTitleKey(title.title, title.year);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, title);
      continue;
    }
    const existingPlayable = PLAYABLE_PROVIDERS.has(existing.providerId);
    const candidatePlayable = PLAYABLE_PROVIDERS.has(title.providerId);
    if (!existingPlayable && candidatePlayable) {
      // Keep the free copy; borrow the richer metadata from the catalog entry —
      // including its watch data, so a public-domain film that also happens to be
      // free-with-ads on Tubi still shows those destinations instead of losing them
      // with the TMDB row that got merged away.
      title.overview = title.overview || existing.overview;
      title.poster = title.poster ?? existing.poster;
      title.backdrop = title.backdrop ?? existing.backdrop;
      title.tmdbRating = title.tmdbRating ?? existing.tmdbRating;
      title.imdbId = title.imdbId ?? existing.imdbId;
      title.watch = title.watch.length ? title.watch : existing.watch;
      title.watchLink = title.watchLink ?? existing.watchLink;
      title.popularity = Math.max(title.popularity, existing.popularity);
      merged.set(key, title);
    } else {
      existing.overview = existing.overview || title.overview;
      existing.poster = existing.poster ?? title.poster;
      existing.backdrop = existing.backdrop ?? title.backdrop;
      existing.tmdbRating = existing.tmdbRating ?? title.tmdbRating;
      existing.imdbId = existing.imdbId ?? title.imdbId;
      existing.watch = existing.watch.length ? existing.watch : title.watch;
      existing.watchLink = existing.watchLink ?? title.watchLink;
      existing.popularity = Math.max(existing.popularity, title.popularity);
    }
  }

  const titles = pageByRankWithCoverage([...merged.values()].sort(rank), limit + 4);
  // Only the top few are re-checked: each check is a request, and a learner almost
  // never opens anything below the fold.
  await Promise.all(
    titles
      .filter((t) => PLAYABLE_PROVIDERS.has(t.providerId))
      .slice(0, 4)
      .map((t) => hydrate(t, keys).catch(() => t)),
  );

  return { query, titles, statuses: await catalogStatuses(keys), errors };
}

/**
 * Full information for one title.
 *
 * `known` is the entry the caller already has (from a search result). It is what
 * makes an open-catalog title inspectable without a second lookup for its text.
 */
export async function lookupTitle(keys: CatalogKeys, id: string, known?: CatalogTitle): Promise<TitleLookup> {
  if (!id.startsWith("tmdb:")) {
    if (!known) throw new Error("This catalogue entry has to be opened from a search result");
    const title = await hydrate({ ...known }, keys);
    await ensureImdb(title, keys);
    const notes: string[] = [];
    // A platform card usually arrives with the TMDB row's watch data borrowed during
    // the merge. When it did not, ask TMDB once for the same title+year so the panel
    // can still answer "where is this free legally?" instead of nothing.
    if (!title.watch.length && keys.tmdb) {
      try {
        // A platform title is often a sentence ("His Girl Friday — Full Movie, HD"),
        // so several normalized readings are tried in order and the best-scoring TMDB
        // row is opened in full. Search rows carry no watch data, hence the second
        // request — on demand, only for a card that has none.
        const wantKind = title.kind === "series" ? "series" : "movie";
        const exactMatches: { id: string; yearDistance: number; relevance: number }[] = [];
        const looseMatches: { id: string; yearDistance: number; relevance: number }[] = [];
        for (const candidate of titleCandidates(title.title)) {
          const rows = await tmdbSearch(candidate, wantKind, keys, 8);
          rows.forEach((row, relevance) => {
            const score = matchScore({
              candidate,
              candidateTitle: row.title,
              candidateYear: row.year,
              year: title.year,
              kindMatches: row.kind === title.kind || (wantKind === "movie" && row.kind === "clip"),
            });
            if (score === null) return;
            const yearDistance = title.year && row.year ? Math.abs(row.year - title.year) : 0;
            const exact = normalizedTitle(row.title) === normalizedTitle(candidate);
            const entry = { id: row.id, yearDistance, relevance };
            (exact ? exactMatches : looseMatches).push(entry);
          });
          if (exactMatches.some((m) => m.yearDistance <= 3)) break;
        }
        // Year first, then TMDB's own relevance order. The fallback to an exact title
        // with a disagreeing year matters because these catalogs often report the
        // *upload* year — a 1940 film uploaded in 2015 says 2015.
        const byScore = (list: { id: string; yearDistance: number; relevance: number }[]) =>
          list.length ? [...list].sort((a, b) => a.yearDistance - b.yearDistance || a.relevance - b.relevance)[0] : null;
        const best = byScore(exactMatches.filter((m) => m.yearDistance <= 3)) ?? byScore(exactMatches) ?? byScore(looseMatches);
        if (best) {
          const detail = await tmdbInfo(best.id, keys);
          title.watch = detail.watch;
          title.watchLink = detail.watchLink;
        }
      } catch {
        notes.push("Could not check this title's official destinations.");
      }
    }
    return {
      title,
      playable: title.sources.length ? [title] : [],
      free: title.watch.length || title.watchLink ? resolveFreeAvailability({ title: title.title, watch: title.watch, watchLink: title.watchLink, region: keys.region || "US" }) : null,
      notes,
    };
  }

  const notes: string[] = [];
  const title = await tmdbInfo(id, keys);
  await ensureImdb(title, keys);
  notes.push("Playing a video here means a first-party upload on YouTube, Dailymotion or Vimeo, played in that platform's own player — otherwise use an official destination above.");

  // Free-and-legal destinations: pure computation over the TMDB data, so it works
  // with no extra keys and never fails.
  const free = resolveFreeAvailability({
    title: title.title,
    watch: title.watch,
    watchLink: title.watchLink,
    region: keys.region || "US",
  });

  // Cross-match the title against the video platforms, so a film people know is
  // offered as a first-party upload when one exists.
  const playable: CatalogTitle[] = [];
  try {
    const wantKind = title.kind === "series" ? "series" : "movie";
    const [fromYouTube, fromDailymotion] = await Promise.all([
      youtubeSearch(title.title, wantKind, keys, 8).catch(() => [] as CatalogTitle[]),
      dailymotionSearch(title.title, wantKind, 6).catch(() => [] as CatalogTitle[]),
    ]);
    const all = [...fromYouTube, ...fromDailymotion];
    // Same era first: remakes and re-uploads make the year the decisive filter.
    const sameEra = title.year ? all.filter((t) => t.year === null || Math.abs(t.year - title.year!) <= 1) : all;
    for (const candidate of (sameEra.length ? sameEra : all).slice(0, 4)) {
      await hydrate(candidate, keys).catch(() => candidate);
      if (candidate.sources.length) playable.push(candidate);
    }
  } catch (err) {
    notes.push(`The video platforms could not be searched: ${(err as Error).message}`);
  }
  if (!playable.length) notes.push("No first-party upload of this title was found on YouTube, Dailymotion or Vimeo — use an official destination above.");
  return { title, playable, free, notes };
}

/**
 * IMDb ratings are no longer fetched (the OMDb key is gone). TMDB still supplies the
 * IMDb id, which is what the information panel links to.
 */
async function ensureImdb(_title: CatalogTitle, _keys: CatalogKeys): Promise<void> {
  return;
}

export type EpisodeSeed = {
  targetLanguage: string;
  cefrLevel: string;
  /** Subtitle tracks already fetched, if the caller wanted them. */
  tracks?: MediaTrack[];
};

/**
 * Turn a discovered, playable title into a library episode.
 *
 * The id is derived from the provider + item, so adding the same title twice
 * updates one episode instead of duplicating it.
 */
export function toEpisode(title: CatalogTitle, seed: EpisodeSeed, preferredSourceUrl?: string): Episode {
  const sources = preferredSourceUrl ? [...title.sources].sort((a, b) => Number(b.url === preferredSourceUrl) - Number(a.url === preferredSourceUrl)) : title.sources;
  return {
    id: `cat-${title.providerId}-${title.externalId}`.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 90),
    title: title.title,
    show: title.providerLabel,
    episodeNumber: title.kind === "series" ? 1 : undefined,
    description: title.overview || title.attribution,
    cefrLevel: seed.cefrLevel,
    targetLanguage: seed.targetLanguage,
    poster: title.poster ?? undefined,
    durationSeconds: title.durationSeconds ?? 0,
    sources,
    tracks: seed.tracks ?? [],
    createdAt: Date.now(),
  };
}

/** Fetch and parse a published subtitle file so the transcript works immediately. */
export async function loadSubtitleTrack(subtitle: CatalogSubtitle, targetLanguage: string): Promise<MediaTrack | null> {
  try {
    const res = await fetch(subtitle.url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const raw = await res.text();
    const parsed = parseSubtitles(raw, subtitle.label);
    if (!parsed.cues.length) return null;
    const isTarget = !subtitle.language || targetLanguage.toLowerCase().startsWith(subtitle.language.slice(0, 2).toLowerCase()) || subtitle.language === "en";
    return {
      id: `cat-sub-${subtitle.language}-${subtitle.label.replace(/[^a-z0-9]/gi, "").slice(0, 12)}`,
      kind: "text",
      label: subtitle.label.slice(0, 40),
      language: subtitle.language,
      cues: parsed.cues,
      raw,
      format: parsed.format,
      role: isTarget ? "original" : "translation",
      cc: true,
    };
  } catch {
    return null;
  }
}
