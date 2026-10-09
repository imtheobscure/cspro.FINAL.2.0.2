"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Film, Loader2, Play, Plus, Star, Tv, Users } from "lucide-react";
import { Button, Card, Pill, cx } from "@/components/ui";
import type { FreeAvailability, FreeServiceKind } from "@/modules/discovery/free-services";
import type { TitleInfo, WatchKind } from "@/modules/discovery/metadata";
import type { DiscoverTitle } from "@/modules/discovery/types";

type InfoResponse = {
  info: TitleInfo | null;
  playable: DiscoverTitle[];
  playableNote: string | null;
  /** Free, licensed destinations: confirmed by TMDB, plus search links. */
  free: FreeAvailability | null;
  /** Live reachability per free service, keyed by service id. */
  serviceReachable: Record<string, boolean> | null;
  error: string | null;
  missingKeys: string[];
};

const FREE_KIND_LABEL: Record<FreeServiceKind, string> = {
  ads: "Free with ads",
  library: "Free with a library card",
};

const FREE_KIND_TONE: Record<FreeServiceKind, string> = {
  ads: "#34d399",
  library: "#fbbf24",
};

const WATCH_LABEL: Record<WatchKind, string> = {
  free: "Free",
  ads: "Free with ads",
  flatrate: "Included with a subscription",
  rent: "Rent",
  buy: "Buy",
};

const WATCH_TONE: Record<WatchKind, string> = {
  free: "#34d399",
  ads: "#34d399",
  flatrate: "#60a5fa",
  rent: "#fbbf24",
  buy: "#a1a1aa",
};

/**
 * Everything known about one title, and every legitimate way to watch it.
 *
 * Reads `/api/discover/info`, which is TMDB (catalog, cast, crew, seasons,
 * trailers, official availability) enriched with OMDb (IMDb rating, Metascore)
 * and cross-matched against the freely licensed catalogs. A title with no
 * licensed copy still gets a full page of information plus its official
 * destinations — that is the honest answer for a film we may not stream, and it
 * is deliberately louder than a dead "play" button would be.
 */
export function TitleInformation({
  titleId,
  onAdd,
  addingId,
  /** What the browser already knows about this row — lets a non-TMDB copy resolve. */
  known,
}: {
  titleId: string;
  onAdd: (title: DiscoverTitle) => void;
  addingId?: string;
  known?: { title: string; year: number | null; kind: string } | null;
}) {
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [showSearchLinks, setShowSearchLinks] = useState(false);
  const query = useQuery({
    queryKey: ["discover-info", titleId, known?.title ?? "", known?.year ?? ""],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const params = new URLSearchParams({ titleId });
      // A platform-hosted video carries no TMDB id; the title text is what lets the
      // server find the matching entry, so the panel is not empty for the very videos
      // this app can actually play.
      if (known?.title && !titleId.startsWith("tmdb:")) {
        params.set("title", known.title);
        if (known.year) params.set("year", String(known.year));
        if (known.kind === "movie" || known.kind === "series") params.set("kind", known.kind);
      }
      const res = await fetch(`/api/discover/info?${params}`);
      const json = (await res.json()) as InfoResponse;
      if (!res.ok && !json.info) throw new Error(json.error || "Could not load title information");
      return json;
    },
  });

  if (query.isLoading) {
    return (
      <div className="mt-5 flex items-center gap-2 text-xs text-zinc-400">
        <Loader2 size={14} className="animate-spin text-violet-300" /> Loading cast, ratings and official availability…
      </div>
    );
  }

  const data = query.data;
  if (!data || (!data.info && data.error)) {
    return (
      <Card className="mt-5 text-xs text-amber-200/90">
        {query.isError ? (query.error as Error).message : data?.error}
        {!!data?.missingKeys.length && (
          <div className="mt-1 text-zinc-400">
            Missing key{data.missingKeys.length > 1 ? "s" : ""}: {data.missingKeys.join(", ")} — set them in the app's environment to unlock full catalog information.
          </div>
        )}
      </Card>
    );
  }

  const info = data.info;
  if (!info) return null;

  const rating = info.imdb?.rating ?? (info.tmdbRating ? info.tmdbRating.toFixed(1) : null);
  const ratingSource = info.imdb?.rating ? `IMDb${info.imdb.votes ? ` · ${info.imdb.votes}` : ""}` : info.tmdbRating ? `TMDB · ${info.tmdbVotes ?? 0} votes` : null;

  return (
    <div className="mt-5 space-y-5">
      {/* Facts row */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        {rating && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 font-semibold text-amber-200">
            <Star size={11} /> {rating} <span className="font-normal opacity-70">{ratingSource}</span>
          </span>
        )}
        {info.kind === "movie"
          ? info.runtimeMinutes && <Pill>{info.runtimeMinutes} min</Pill>
          : (info.seasonsCount || info.episodesCount) && <Pill>{info.seasonsCount ?? "?"} seasons · {info.episodesCount ?? "?"} episodes</Pill>}
        {info.contentRating && <Pill>{info.contentRating}</Pill>}
        {info.releaseDate && <Pill>{info.releaseDate.slice(0, 10)}</Pill>}
        {info.status && <Pill>{info.status}</Pill>}
        {info.originalLanguage && <Pill>{info.originalLanguage.toUpperCase()}</Pill>}
        {info.genres.map((g) => (
          <Pill key={g}>{g}</Pill>
        ))}
      </div>

      {info.tagline && <p className="text-sm italic text-violet-200/90">“{info.tagline}”</p>}
      {info.overview && <p className="text-sm text-zinc-300">{info.overview}</p>}
      {info.imdb?.plot && info.imdb.plot !== info.overview && <p className="text-xs text-zinc-400">{info.imdb.plot}</p>}

      {/* Official destinations — the answer for anything we may not stream */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Where to watch officially</h4>
        {info.watch.length ? (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {info.watch.map((w, i) => (
                <a
                  key={`${w.kind}-${w.providerName}-${i}`}
                  href={w.link ?? info.watchLink ?? info.tmdbUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={`${w.providerName} · ${WATCH_LABEL[w.kind]}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs hover:border-violet-300/40 hover:bg-white/10"
                >
                  {w.logo ? <img src={w.logo} alt="" className="h-5 w-5 rounded" /> : null}
                  <span className="font-medium text-zinc-100">{w.providerName}</span>
                  <span className="text-[10px]" style={{ color: WATCH_TONE[w.kind] }}>
                    {WATCH_LABEL[w.kind]}
                  </span>
                </a>
              ))}
            </div>
            {info.freeLegallyAvailable && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-300">
                <BadgeCheck size={12} /> Available free and legally in your region — no account needed for the “free / with ads” entries.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">
            No region availability was published for this title.{" "}
            <a href={info.watchLink ?? info.tmdbUrl} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
              Check on TMDB
            </a>
            .
          </p>
        )}
      </section>

      {/* Free without paying, and without pirating */}
      {data.free && (
        <section>
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Watch free — licensed services</h4>
          <p className={cx("mt-2 flex items-start gap-1.5 text-xs", data.free.confirmed.length ? "text-emerald-300" : "text-zinc-400")}>
            <BadgeCheck size={13} className="mt-0.5 shrink-0" />
            {data.free.summary}
          </p>

          {data.free.confirmed.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.free.confirmed.map((d) => {
                const down = data.serviceReachable?.[d.serviceId] === false;
                return (
                  <a
                    key={d.serviceId}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${d.name} — ${d.basis}${down ? " (did not answer from this network)" : ""}`}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs",
                      down ? "border-white/10 bg-white/5 opacity-60" : "border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20",
                    )}
                  >
                    {d.logo ? <img src={d.logo} alt="" className="h-5 w-5 rounded" /> : <span className="grid h-5 w-5 place-items-center rounded bg-emerald-400/20 text-[10px] font-bold text-emerald-200">{d.name.slice(0, 1)}</span>}
                    <span className="font-semibold text-zinc-100">{d.name}</span>
                    <span className="text-[10px] font-semibold" style={{ color: FREE_KIND_TONE[d.kind] }}>
                      {FREE_KIND_LABEL[d.kind]}
                    </span>
                    {d.playableInApp && <span className="text-[10px] text-sky-300">plays in-app</span>}
                  </a>
                );
              })}
            </div>
          )}

          {!!data.free.trySearch.length && (
            <div className="mt-2">
              <button type="button" onClick={() => setShowSearchLinks((v) => !v)} className="text-[11px] text-violet-300 hover:underline">
                {showSearchLinks ? "Hide" : "Search"} the other {data.free.trySearch.length} free services for “{info.title}”
              </button>
              {showSearchLinks && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.free.trySearch.map((d) => {
                    const down = data.serviceReachable?.[d.serviceId] === false;
                    return (
                      <a
                        key={d.serviceId}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Search ${d.name} — ${d.basis}${down ? " (did not answer from this network)" : ""}`}
                        className={cx("rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300 hover:border-violet-300/40", down && "opacity-50")}
                      >
                        <span className="font-medium text-zinc-200">{d.name}</span>
                        <span className="ml-1 text-[10px] text-zinc-500">{FREE_KIND_LABEL[d.kind].replace("Free with ", "")}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!!data.free.paidFallback.length && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Not free anywhere? Cheapest legal fallback: {data.free.paidFallback.slice(0, 4).map((w) => `${w.providerName} (${WATCH_LABEL[w.kind]})`).join(", ")}.
            </p>
          )}
          <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-600">
            Region: {data.free.region}. Unlicensed streaming sites that serve commercial films and TV without a licence are deliberately not integrated — every option here pays the rights holder.
          </p>
        </section>
      )}

      {/* Playable licensed copies of the same title */}
      <section>
        <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Free & licensed copies of this title</h4>
        {data.playable.length ? (
          <div className="mt-2 space-y-2">
            {data.playable.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {t.poster ? <img src={t.poster} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-zinc-600"><Film size={14} /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-zinc-100">{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px]">
                    {t.year && <Pill>{t.year}</Pill>}
                    <Pill color="#34d399">{t.licenseLabel}</Pill>
                    <Pill>{t.sources.length} rendition{t.sources.length === 1 ? "" : "s"}</Pill>
                  </div>
                </div>
                {t.inLibrary ? (
                  <a href={`/watch/${t.inLibrary.episodeId}`} className="shrink-0 text-xs font-semibold text-emerald-300 hover:underline">
                    Play →
                  </a>
                ) : (
                  <Button size="sm" className="shrink-0" disabled={addingId === t.id} onClick={() => onAdd(t)}>
                    {addingId === t.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-400">
            {data.playableNote ?? "No public-domain or Creative Commons print of this title exists in the licensed catalogs — use an official destination above."}
          </p>
        )}
      </section>

      {/* Cast + crew */}
      {!!info.cast.length && (
        <section>
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <Users size={13} /> Cast
          </h4>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {info.cast.map((person) => (
              <div key={`${person.id ?? person.name}-${person.role}`} className="w-20 shrink-0 text-center">
                <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {person.photo ? (
                    <img src={person.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] text-zinc-500">{person.name.slice(0, 2)}</div>
                  )}
                </div>
                <div className="mt-1 truncate text-[11px] font-medium text-zinc-200">{person.name}</div>
                <div className="truncate text-[10px] text-zinc-500">{person.role}</div>
              </div>
            ))}
          </div>
          {!!info.crew.length && (
            <p className="mt-2 text-[11px] text-zinc-400">
              {info.crew.slice(0, 6).map((c) => `${c.role}: ${c.name}`).join(" · ")}
            </p>
          )}
        </section>
      )}

      {/* Seasons */}
      {info.kind === "series" && !!info.seasons.length && (
        <section>
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <Tv size={13} /> Seasons
          </h4>
          <div className="mt-2 space-y-1.5">
            {info.seasons.map((s) => (
              <div key={s.seasonNumber} className="rounded-xl border border-white/10 bg-white/[0.03]">
                <button type="button" onClick={() => setOpenSeason(openSeason === s.seasonNumber ? null : s.seasonNumber)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold">{s.seasonNumber}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-zinc-100">{s.name}</span>
                    <span className="block text-[10px] text-zinc-500">
                      {s.episodeCount} episode{s.episodeCount === 1 ? "" : "s"}
                      {s.airDate ? ` · ${s.airDate}` : ""}
                    </span>
                  </span>
                </button>
                {openSeason === s.seasonNumber && (
                  <p className={cx("border-t border-white/5 px-3 py-2 text-[11px] text-zinc-400")}>{s.overview || "No season synopsis published."}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Official trailers */}
      {!!info.trailers.length && (
        <section>
          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Official trailers &amp; clips</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {info.trailers.map((t) => (
              <a
                key={t.youtubeId}
                href={`https://www.youtube.com/watch?v=${t.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] hover:bg-white/10"
              >
                <Play size={12} /> {t.name.slice(0, 40)}
                {t.official && <BadgeCheck size={11} className="text-emerald-300" />}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Provenance + what is missing */}
      <section className="text-[11px] text-zinc-500">
        <div>
          Information from {info.sources.join(" + ")}
          {info.imdbId ? ` · IMDb ${info.imdbId}` : ""} ·{" "}
          <a href={info.tmdbUrl} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
            official page
          </a>
          {info.homepage ? (
            <>
              {" · "}
              <a href={info.homepage} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
                home page
              </a>
            </>
          ) : null}
        </div>
        {!!info.notes.length && <div className="mt-1 text-amber-300/80">{info.notes.join(" · ")}</div>}
        <div className="mt-1">
          Playing a video here always means a first-party upload on YouTube, Dailymotion or Vimeo, played in that platform's own official player — never a pirate stream.
        </div>
      </section>
    </div>
  );
}
