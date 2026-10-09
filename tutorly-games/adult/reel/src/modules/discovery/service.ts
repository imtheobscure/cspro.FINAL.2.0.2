import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { courses, discoveryImports, episodes, providers as providerTable, seasons, series, videoSources } from "@/db/schema";
import { detectAndParse, detectFormat } from "@/modules/subtitles/engine";
import { persistTrack } from "@/modules/subtitles/store";
import { dailymotionProvider } from "./dailymotion";
import { tmdbProvider } from "./tmdb";
import { vimeoProvider } from "./vimeo";
import { youtubeProvider } from "./youtube";
import { normalizeTitleKey, type DiscoverSearchOptions, type DiscoverTitle, type ProviderStatus, type SearchResponse, type VideoProvider } from "./types";

/**
 * Discovery service.
 *
 * One search fans out to every provider in parallel, tolerant of failures: a
 * provider that is unreachable, unkeyed or rate-limited contributes nothing but a
 * line in `errors`, and the page still renders. Results are deduplicated by
 * title+year preferring a *playable* copy over metadata, enriched with the top
 * items' real rendition ladders, and cross-checked against the local library so
 * the UI can say "in your library" instead of offering a second import.
 */
/**
 * The catalogs, in the order a learner should see them: the two platforms that play
 * with no configuration at all, then the ones that light up when a free key is set,
 * then TMDB, which supplies information rather than playback.
 */
export const PROVIDERS: VideoProvider[] = [youtubeProvider, dailymotionProvider, vimeoProvider, tmdbProvider];

/** Providers whose entries carry their own official player (an embed source). */
export const PLAYABLE_PROVIDER_IDS = new Set(["youtube", "dailymotion", "vimeo"]);

export function providerById(id: string): VideoProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export async function providerStatuses(): Promise<ProviderStatus[]> {
  const statuses = await Promise.all(
    PROVIDERS.map((p) =>
      p.status().catch(() => ({
        id: p.id,
        name: p.name,
        authorizationType: p.authorizationType,
        configured: p.configured(),
        requiresEnv: p.requiresEnv,
        note: p.note,
        reachable: false,
      })),
    ),
  );
  return statuses;
}

/** Playable first, then free, then popular, then newest. */
function rank(a: DiscoverTitle, b: DiscoverTitle): number {
  const byPlayable = Number(b.sources.length > 0) - Number(a.sources.length > 0);
  if (byPlayable) return byPlayable;
  const byFree = Number(b.availability === "FREE") - Number(a.availability === "FREE");
  if (byFree) return byFree;
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
function pageByRankWithCoverage(ranked: DiscoverTitle[], take: number): DiscoverTitle[] {
  const byProvider = new Map<string, DiscoverTitle[]>();
  for (const title of ranked) {
    const queue = byProvider.get(title.providerId);
    if (queue) queue.push(title);
    else byProvider.set(title.providerId, [title]);
  }
  if (byProvider.size < 2) return ranked.slice(0, take);

  const seatsEach = Math.max(1, Math.min(3, Math.floor(take / byProvider.size)));
  const reserved = new Set<DiscoverTitle>();
  const page: DiscoverTitle[] = [];
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

export async function searchCatalog(opts: DiscoverSearchOptions): Promise<SearchResponse> {
  const limit = Math.min(opts.limit ?? 12, 24);
  const selected = opts.providers?.length ? PROVIDERS.filter((p) => opts.providers!.includes(p.id)) : PROVIDERS;
  const errors: { provider: string; message: string }[] = [];

  const [statuses, settled] = await Promise.all([
    providerStatuses(),
    Promise.all(
      selected.map(async (p) => {
        if (!p.configured()) return [] as DiscoverTitle[];
        try {
          return await p.search({ ...opts, limit });
        } catch (err) {
          errors.push({ provider: p.id, message: (err as Error).message });
          return [] as DiscoverTitle[];
        }
      }),
    ),
  ]);

  const merged = new Map<string, DiscoverTitle>();
  for (const title of settled.flat()) {
    const key = normalizeTitleKey(title.title, title.year);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, title);
      continue;
    }
    const existingPlayable = PLAYABLE_PROVIDER_IDS.has(existing.providerId);
    const candidatePlayable = PLAYABLE_PROVIDER_IDS.has(title.providerId);
    existing.popularity = Math.max(existing.popularity, title.popularity);
    if (!existingPlayable && candidatePlayable) {
      // Keep the playable copy, borrow the richer metadata.
      title.poster = title.poster ?? existing.poster;
      title.backdrop = title.backdrop ?? existing.backdrop;
      title.overview = title.overview || existing.overview;
      title.resolvableVia = existing.providerId;
      merged.set(key, title);
    } else if (existingPlayable && !candidatePlayable) {
      existing.poster = existing.poster ?? title.poster;
      existing.backdrop = existing.backdrop ?? title.backdrop;
      existing.overview = existing.overview || title.overview;
      existing.externalUrl = existing.externalUrl ?? title.externalUrl;
      existing.resolvableVia = title.providerId;
    }
  }

  const titles = pageByRankWithCoverage([...merged.values()].sort(rank), limit + 6);

  // Attach real sources for the top playable hits so "Play" works straight away.
  // Embed providers already build their source during search, so this only runs for
  // a provider that lists without resolving.
  await Promise.all(
    titles
      .filter((t) => PLAYABLE_PROVIDER_IDS.has(t.providerId) && !t.sources.length && t.resolvableVia === null)
      .slice(0, 6)
      .map(async (t) => {
        try {
          const { sources, subtitles } = await providerById(t.providerId)!.resolveSources(t.externalId);
          t.sources = sources;
          t.subtitles = subtitles;
        } catch {
          /* the detail endpoint can retry this on demand */
        }
      }),
  );

  await attachLibraryState(titles);

  return {
    query: opts.query,
    titles,
    providers: statuses,
    errors,
    metadataOnly: titles.filter((t) => !t.sources.length && t.resolvableVia).length,
  };
}

/**
 * The topics behind the Discover feed.
 *
 * Discover used to open on an empty page: nothing was listed until you typed a
 * query, and the only keyless catalog (Dailymotion) was invisible until then, so the
 * page read as "there are no videos here". A feed of real, playable, keyless videos
 * on topics a language learner actually wants is the honest fix — Dailymotion needs no
 * key at all, so this works on a fresh install.
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
 * A browsable feed: a handful of curated topics, each a real keyless search, with only
 * playable hits kept. One slow or broken topic degrades to an empty section rather
 * than blanking the page.
 */
export async function browseCatalog(topicLimit = 4): Promise<{ id: string; label: string; query: string; titles: DiscoverTitle[] }[]> {
  const topics = BROWSE_TOPICS.slice(0, topicLimit);
  const sections = await Promise.all(
    topics.map(async (topic) => {
      try {
        const { titles } = await searchCatalog({ query: topic.query, kind: "any", providers: ["dailymotion"], limit: 8 });
        return { id: topic.id, label: topic.label, query: topic.query, titles: titles.filter((t) => t.sources.length).slice(0, 8) };
      } catch {
        return { id: topic.id, label: topic.label, query: topic.query, titles: [] as DiscoverTitle[] };
      }
    }),
  );
  return sections.filter((section) => section.titles.length > 0);
}

/** Marks titles already imported so the UI links to the library instead of re-adding. */
async function attachLibraryState(titles: DiscoverTitle[]): Promise<void> {
  if (!titles.length) return;
  const ids = titles.map((t) => t.id);
  const rows = await db
    .select({ titleId: discoveryImports.titleId, episodeId: discoveryImports.episodeId, title: discoveryImports.title })
    .from(discoveryImports)
    .where(inArray(discoveryImports.titleId, ids));
  const byId = new Map(rows.map((r) => [r.titleId, r]));
  for (const t of titles) {
    const row = byId.get(t.id);
    if (row) t.inLibrary = { episodeId: row.episodeId, title: row.title };
  }
}

/** Full detail (sources + subtitle candidates) for one title, loaded on demand. */
/**
 * Detail view for one result: the rendition ladder and captions, resolved on demand.
 *
 * `known` is the row the caller already has from a search. It is used for the
 * presentation fields (title, year, kind, artwork) because the id alone is a guess —
 * `youtube:dQw4w9WgXcQ` reads as an id, not a title. Resolution only contributes the
 * sources; the presentation fields come from the row the caller already had.
 */
export async function resolveTitle(titleId: string, known?: Pick<DiscoverTitle, "title" | "year" | "kind" | "overview" | "poster" | "backdrop" | "duration" | "language">): Promise<{ title: DiscoverTitle | null; error: string | null }> {
  const sep = titleId.indexOf(":");
  if (sep < 0) return { title: null, error: "Malformed title id" };
  const providerId = titleId.slice(0, sep);
  const externalId = titleId.slice(sep + 1);
  const provider = providerById(providerId);
  if (!provider) return { title: null, error: `Unknown provider “${providerId}”` };
  try {
    // Opening an item by id used to fall back to the raw id as the title ("x2xh8yl"),
    // with no poster or duration, so a Dailymotion or YouTube row read as gibberish
    // in the detail sheet and in the library. Ask the provider what the item actually
    // is; a provider without a by-id endpoint simply returns null.
    const [detail, { sources, subtitles }] = await Promise.all([
      provider.detail ? provider.detail(externalId).catch(() => null) : Promise.resolve(null),
      provider.resolveSources(externalId),
    ]);
    return {
      title: {
        id: titleId,
        providerId,
        providerName: provider.name,
        externalId,
        kind: known?.kind ?? detail?.kind ?? "movie",
        title: known?.title ?? detail?.title ?? externalId.split("/").pop()?.replace(/[_-]+/g, " ") ?? externalId,
        year: known?.year ?? detail?.year ?? null,
        overview: known?.overview ?? detail?.overview ?? "",
        poster: known?.poster ?? detail?.poster ?? null,
        backdrop: known?.backdrop ?? detail?.backdrop ?? null,
        duration: known?.duration ?? detail?.duration ?? null,
        language: known?.language ?? detail?.language ?? null,
        licenseLabel: sources[0]?.licenseLabel ?? detail?.licenseLabel ?? "See source",
        licenseUrl: sources[0]?.licenseUrl ?? detail?.licenseUrl ?? null,
        authorizationType: sources[0]?.authorizationType ?? provider.authorizationType,
        attribution: detail?.attribution ?? provider.name,
        availability: detail?.availability ?? "FREE",
        externalUrl: detail?.externalUrl ?? null,
        popularity: detail?.popularity ?? 0,
        sources,
        subtitles,
        inLibrary: null,
        resolvableVia: null,
      },
      error: sources.length ? null : "This item exposes no playable file.",
    };
  } catch (err) {
    return { title: null, error: (err as Error).message };
  }
}

function stableId(prefix: string, seed: string): string {
  return `${prefix}-${createHash("sha1").update(seed).digest("hex").slice(0, 10)}`;
}

export type ImportResult = { episodeId: string; title: string; sources: number; subtitleTracks: number; warnings: string[] };

/**
 * Adds a discovered title to the local catalog: provider row, course, series,
 * season, episode, every playable rendition (with its licence and attribution)
 * and any caption files the provider published, parsed through the subtitle
 * engine so the transcript panel works immediately.
 */
export async function importTitle(input: { title: DiscoverTitle; userId: string; targetLanguage?: string; nativeLanguage?: string }): Promise<ImportResult> {
  const { title, userId } = input;
  const targetLanguage = input.targetLanguage ?? "English";
  const nativeLanguage = input.nativeLanguage ?? "Spanish";
  const warnings: string[] = [];

  const provider = providerById(title.providerId);
  if (!provider) throw new Error(`Unknown provider “${title.providerId}”`);

  let resolved = title;
  if (!resolved.sources.length) {
    const detail = await resolveTitle(title.id);
    if (detail.title?.sources.length) resolved = { ...title, ...detail.title, title: title.title, year: title.year, overview: title.overview, poster: title.poster };
  }
  if (!resolved.sources.length) throw new Error("No playable source is available for this title");

  const providerId = `prov-${resolved.providerId}`;
  await db
    .insert(providerTable)
    .values({
      id: providerId,
      name: provider.name,
      slug: `discover-${resolved.providerId}`,
      priority: 50,
      authorizationType: resolved.authorizationType,
      baseUrl: resolved.externalUrl ? new URL(resolved.externalUrl).origin : provider.licenseUrl,
      licenseUrl: resolved.licenseUrl ?? provider.licenseUrl,
      supportsDownload: resolved.sources.some((s) => s.downloadable),
    })
    .onConflictDoNothing();

  const courseId = `disc-${resolved.providerId}`;
  await db
    .insert(courses)
    .values({
      id: courseId,
      slug: `discover-${resolved.providerId}`,
      title: `Discover · ${provider.name}`,
      description: `Titles imported from ${provider.name}. ${provider.note}`,
      language: resolved.language ?? "English",
      targetLanguage,
      level: "B1",
      accent: "violet",
    })
    .onConflictDoNothing();

  const seriesId = stableId("disc-series", resolved.id);
  await db
    .insert(series)
    .values({
      id: seriesId,
      courseId,
      slug: stableId("disc-series-slug", resolved.id),
      title: resolved.title,
      description: resolved.overview.slice(0, 900),
      thumbnail: resolved.poster,
      language: resolved.language ?? "English",
      targetLanguage,
      sortOrder: 0,
    })
    .onConflictDoNothing();

  const seasonId = stableId("disc-season", resolved.id);
  await db
    .insert(seasons)
    .values({ id: seasonId, seriesId, seasonNumber: 1, title: resolved.year ? `${resolved.year} · ${resolved.kind}` : "Feature", description: resolved.attribution, thumbnail: resolved.poster })
    .onConflictDoNothing();

  const episodeId = stableId("disc-ep", resolved.id);
  const existing = await db.select({ id: episodes.id }).from(episodes).where(eq(episodes.id, episodeId)).limit(1);
  if (existing.length) {
    await db.delete(videoSources).where(eq(videoSources.episodeId, episodeId));
  } else {
    await db.insert(episodes).values({
      id: episodeId,
      seasonId,
      episodeNumber: 1,
      title: resolved.title,
      description: resolved.overview.slice(0, 900),
      thumbnail: resolved.poster,
      poster: resolved.poster ?? resolved.backdrop,
      duration: resolved.duration ?? 0,
      releaseDate: resolved.year ? String(resolved.year) : null,
      language: resolved.language ?? "English",
      targetLanguage,
      license: resolved.licenseLabel,
      attribution: resolved.attribution,
    });
  }

  await db.insert(videoSources).values(
    resolved.sources.map((s, index) => ({
      id: `${episodeId}-src-${index}`,
      episodeId,
      providerId,
      label: `${s.providerName} · ${s.label}`,
      url: s.url,
      // An embed is stored as its own type: the player routes it to the platform's
      // official iframe player instead of the <video> element.
      type: s.kind === "ogv" ? "mp4" : s.kind,
      quality: s.quality,
      width: s.width,
      height: s.height,
      bitrate: s.bitrate,
      qualities: s.qualities,
      audioTracks: [{ id: "und", language: resolved.language ?? "und", label: "Original" }],
      availability: resolved.availability === "FREE" ? "FREE" : "EXTERNAL",
      authorizationType: s.authorizationType,
      priority: index + 1,
      downloadable: s.downloadable,
    })),
  );

  let subtitleTracks = 0;
  for (const sub of resolved.subtitles.slice(0, 4)) {
    try {
      const res = await fetch(sub.url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.text();
      const parsed = detectAndParse(raw);
      if (!parsed.cues.length) throw new Error("no cues found");
      const isTranslation = (resolved.language ?? "en").slice(0, 2) !== sub.language;
      await persistTrack({
        episodeId,
        language: sub.language,
        label: sub.label.slice(0, 40),
        type: isTranslation ? "translation" : "original",
        format: detectFormat(raw),
        source: `discovery:${sub.provider}`,
        sourceUrl: sub.url,
        parsed,
      });
      subtitleTracks += 1;
    } catch (err) {
      warnings.push(`Subtitle ${sub.language} (${sub.label}) could not be imported: ${(err as Error).message}`);
    }
  }

  await db
    .insert(discoveryImports)
    .values({
      id: `imp-${randomUUID().slice(0, 8)}`,
      titleId: resolved.id,
      providerId: resolved.providerId,
      externalId: resolved.externalId,
      episodeId,
      userId,
      title: resolved.title,
      poster: resolved.poster,
      licenseLabel: resolved.licenseLabel,
    })
    .onConflictDoUpdate({ target: discoveryImports.titleId, set: { episodeId, title: resolved.title, poster: resolved.poster } });

  return { episodeId, title: resolved.title, sources: resolved.sources.length, subtitleTracks, warnings };
}

export async function recentImports(limit = 12) {
  return db
    .select({
      titleId: discoveryImports.titleId,
      title: discoveryImports.title,
      poster: discoveryImports.poster,
      licenseLabel: discoveryImports.licenseLabel,
      providerId: discoveryImports.providerId,
      episodeId: discoveryImports.episodeId,
      createdAt: discoveryImports.createdAt,
    })
    .from(discoveryImports)
    .orderBy(discoveryImports.createdAt)
    .limit(limit);
}
