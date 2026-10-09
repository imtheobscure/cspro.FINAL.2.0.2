import { useCallback, useEffect, useMemo, useState } from "react";
import type { CatalogKeys, CatalogStatus, CatalogTitle } from "../../lib/catalog/types";
import { WATCH_LABEL } from "../../lib/catalog/types";
import { browseCatalog, catalogStatuses, loadSubtitleTrack, lookupTitle, searchCatalog, toEpisode, type CatalogError, type TitleLookup } from "../../lib/catalog/service";
import { useProfileStore } from "../../store/profile";
import { useSaveEpisode } from "../../lib/api";
import { Button, Chip, Input, Panel, cx } from "../ui";

type KindFilter = "any" | "movie" | "series";

const KIND_LABEL: Record<KindFilter, string> = { any: "Everything", movie: "Movies", series: "TV series" };

const LICENCE_TONE: Record<string, string> = {
  "public-domain": "var(--color-tf-teal, #0d9488)",
  "creative-commons": "#2563eb",
  "official-embed": "#7c3aed",
  owned: "#b45309",
  licensed: "#b45309",
};

/**
 * Discover — find any movie or TV series, read everything about it, and play the
 * copies we are allowed to play.
 *
 * Two honest halves on purpose:
 *
 *   1. Catalog search (TMDB, with a free key) covers every film and series ever
 *      released, and shows each title's cast, crew, seasons, trailers, ratings
 *      and its OFFICIAL streaming destinations.
 *   2. The platform catalogs (Dailymotion needs no key at all; YouTube and Vimeo
 *      unlock with a free key) supply the videos that actually play in this player,
 *      each in its platform's official embedded player with the licence alongside.
 *
 * Nothing here resolves a pirate stream: a title we cannot legally play shows its
 * official destinations instead, which is the useful answer rather than a broken
 * play button.
 */
export const CatalogView: React.FC<{ onOpen: (episodeId: string) => void }> = ({ onOpen }) => {
  const tmdbKey = useProfileStore((s) => s.tmdbKey);
  const catalogRegion = useProfileStore((s) => s.catalogRegion);
  const setCatalogKeys = useProfileStore((s) => s.setCatalogKeys);
  const level = useProfileStore((s) => s.level);
  const learner = useProfileStore((s) => s.learner);
  const youtubeKey = useProfileStore((s) => s.youtubeKey);
  const vimeoKey = useProfileStore((s) => s.vimeoKey);
  const saveEpisode = useSaveEpisode();

  const keys: CatalogKeys = useMemo(() => ({ tmdb: tmdbKey, youtube: youtubeKey, vimeo: vimeoKey, region: catalogRegion || "US" }), [tmdbKey, youtubeKey, vimeoKey, catalogRegion]);

  const [term, setTerm] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [kind, setKind] = useState<KindFilter>("any");
  const [titles, setTitles] = useState<CatalogTitle[]>([]);
  const [statuses, setStatuses] = useState<CatalogStatus[]>([]);
  const [errors, setErrors] = useState<CatalogError[]>([]);
  const [searching, setSearching] = useState(false);
  const [inspected, setInspected] = useState<CatalogTitle | null>(null);
  const [lookup, setLookup] = useState<TitleLookup | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);

  /* Statuses on mount so the sources strip is never empty. */
  useEffect(() => {
    void catalogStatuses(keys).then(setStatuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(
    async (query: string, filter: KindFilter) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setTitles([]);
        return;
      }
      setSearching(true);
      setNotice(null);
      try {
        const result = await searchCatalog(keys, trimmed, filter, 12);
        setTitles(result.titles);
        setStatuses(result.statuses);
        setErrors(result.errors);
      } catch (err) {
        setErrors([{ source: "catalog", message: (err as Error).message }]);
      } finally {
        setSearching(false);
      }
    },
    [keys],
  );

  useEffect(() => {
    if (!submitted) return;
    void runSearch(submitted, kind);
  }, [submitted, kind, runSearch]);

  const inspect = useCallback(
    async (title: CatalogTitle) => {
      setInspected(title);
      setLookup(null);
      setLookingUp(true);
      try {
        const result = await lookupTitle(keys, title.id, title);
        setLookup(result);
      } catch (err) {
        setNotice((err as Error).message);
      } finally {
        setLookingUp(false);
      }
    },
    [keys],
  );

  /** Add a licensed copy to the library (with its published subtitles) and open it. */
  const addAndPlay = useCallback(
    async (title: CatalogTitle, sourceUrl?: string) => {
      if (!title.sources.length) return;
      setNotice(`Adding “${title.title}”…`);
      const profile = learner();
      const tracks = (
        await Promise.all(title.subtitles.slice(0, 2).map((subtitle) => loadSubtitleTrack(subtitle, profile.nativeLanguage === subtitle.language ? "en" : "en")))
      ).filter((track): track is NonNullable<typeof track> => !!track);
      const episode = toEpisode(title, { targetLanguage: "English", cefrLevel: level || "B1", tracks }, sourceUrl);
      await saveEpisode.mutateAsync(episode);
      setNotice(null);
      onOpen(episode.id);
    },
    [learner, level, onOpen, saveEpisode],
  );

  const playable = titles.filter((t) => t.sources.length > 0);
  const catalogOnly = titles.filter((t) => !t.sources.length);
  const [feed, setFeed] = useState<{ id: string; label: string; query: string; titles: CatalogTitle[] }[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  /*
   * The keyless opening feed. Discover used to be empty until you typed something,
   * which read as "there are no videos here" — Dailymotion needs no key, so real
   * playable videos are shown from the first load.
   */
  useEffect(() => {
    let cancelled = false;
    void browseCatalog(keys)
      .then((sections) => {
        if (!cancelled) setFeed(sections);
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--color-tf-bg)" }}>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">🔎 Discover films &amp; series</h1>
            <p className="mt-1 max-w-3xl text-[13px]" style={{ color: "var(--color-tf-sub)" }}>
              Search any movie or TV series and read everything about it — cast, crew, seasons, trailers, ratings and where it streams officially. Anything with a green
              licence badge plays right here with dual subtitles and the interactive transcript.
            </p>
          </div>
          <Button size="sm" onClick={() => setKeysOpen((open) => !open)}>
            {keysOpen ? "Hide keys" : "🔑 Catalog keys"}
          </Button>
        </header>

        {/* Sources strip */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          {statuses.map((s) => (
            <span
              key={s.id}
              title={s.note}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)", color: "var(--color-tf-sub)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.configured ? (s.reachable === false ? "#f59e0b" : "#10b981") : "#94a3b8" }} />
              <b style={{ color: "var(--color-tf-text)" }}>{s.label}</b>
              {/* The provider names its own gap — OMDb is gone, so hard-coding a
                  second name here would advertise a key nothing reads. */}
              {s.needsKey ? `needs ${s.label} key` : s.role === "playable" ? "playable" : "ratings"}
            </span>
          ))}
          {errors.map((e) => (
            <span key={e.source} className="text-[11px]" style={{ color: "#b45309" }}>
              {e.source}: {e.message}
            </span>
          ))}
        </div>

        {/* Keys */}
        {keysOpen && (
          <Panel className="mt-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-[12px] font-bold">
                TMDB API key
                <Input className="mt-1" value={tmdbKey} onChange={(e) => setCatalogKeys({ tmdbKey: e.target.value.trim() })} placeholder="paste your v3 key" />
              </label>
              <label className="text-[12px] font-bold">
                YouTube Data API key
                <Input className="mt-1" value={youtubeKey} onChange={(e) => setCatalogKeys({ youtubeKey: e.target.value.trim() })} placeholder="optional" />
              </label>
              <label className="text-[12px] font-bold">
                Vimeo access token
                <Input className="mt-1" value={vimeoKey} onChange={(e) => setCatalogKeys({ vimeoKey: e.target.value.trim() })} placeholder="optional" />
              </label>
              <label className="text-[12px] font-bold">
                Availability region
                <Input className="mt-1" value={catalogRegion} onChange={(e) => setCatalogKeys({ catalogRegion: e.target.value.trim().toUpperCase().slice(0, 2) })} placeholder="US" />
              </label>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
              Free keys: <a className="underline" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">themoviedb.org</a> (every movie and TV series), a{" "}
              <a className="underline" href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noreferrer">YouTube Data API key</a> (YouTube
              search — playback needs no key) and a{" "}
              <a className="underline" href="https://developers.vimeo.com" target="_blank" rel="noreferrer">Vimeo access token</a> (documentary catalog). Keys live in this browser
              only, never in the shipped app, and Dailymotion search and playback work with no key at all.
            </p>
          </Panel>
        )}

        {/* Search */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form
            className="flex min-w-[260px] flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(term);
            }}
          >
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Night of the Living Dead · Planet Earth · Modern Times · NASA documentary…" aria-label="Search films and series" />
            <Button type="submit" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>
          {(Object.keys(KIND_LABEL) as KindFilter[]).map((k) => (
            <Chip key={k} tone={kind === k ? "brand" : "muted"} active={kind === k} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </Chip>
          ))}
        </div>

        {notice && (
          <div className="mt-3 rounded-xl border px-3 py-2 text-[12px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
            {notice}
          </div>
        )}

        {!submitted && (
          <div className="mt-5">
            {feedLoading && <p className="text-[12px]" style={{ color: "var(--color-tf-sub)" }}>Loading videos you can play right now…</p>}
            {feed.map((section) => (
              <div key={section.id} className="mb-6">
                <div className="mb-2 flex items-baseline gap-2">
                  <h2 className="text-[12px] font-black uppercase tracking-widest">{section.label}</h2>
                  <button type="button" onClick={() => setTerm(section.query)} className="text-[11px] underline" style={{ color: "var(--color-tf-sub)" }}>
                    see more
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {section.titles.slice(0, 4).map((title) => (
                    <TitleCard key={title.id} title={title} onInspect={() => void inspect(title)} onPlay={() => void addAndPlay(title)} busy={saveEpisode.isPending} />
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[12px]" style={{ color: "var(--color-tf-sub)" }}>
              These play here in the platform&apos;s own official player. Dailymotion needs no key at all; YouTube search needs a free Data API key (playback never does). You can
              also paste a YouTube, Dailymotion or Vimeo link into ＋ Add video in the library.
            </p>
          </div>
        )}

        {!!playable.length && (
          <>
            <h2 className="mt-6 mb-2 text-[12px] font-black uppercase tracking-widest" style={{ color: "#0f766e" }}>
              ✅ Free &amp; licensed — play now
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {playable.map((title) => (
                <TitleCard key={title.id} title={title} onInspect={() => void inspect(title)} onPlay={() => void addAndPlay(title)} busy={saveEpisode.isPending} />
              ))}
            </div>
          </>
        )}

        {!!catalogOnly.length && (
          <>
            <h2 className="mt-7 mb-2 text-[12px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              🌍 Catalog information &amp; official availability
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {catalogOnly.map((title) => (
                <TitleCard key={title.id} title={title} onInspect={() => void inspect(title)} onPlay={undefined} busy={false} />
              ))}
            </div>
          </>
        )}

        {submitted.length >= 2 && !searching && !titles.length && (
          <Panel className="mt-5 text-[12px]">
            Nothing matched “{submitted}”. Try a shorter query — platform videos are titled as sentences, so “chaplin” finds more than the full film name. A TMDB key
            also unlocks every film and series with its official streaming destinations.
          </Panel>
        )}
      </div>

      {inspected && (
        <DetailSheet
          title={inspected}
          lookup={lookup}
          loading={lookingUp}
          onClose={() => setInspected(null)}
          onPlay={(t, url) => void addAndPlay(t, url)}
          busy={saveEpisode.isPending}
        />
      )}
    </div>
  );
};

const TitleCard: React.FC<{ title: CatalogTitle; onInspect: () => void; onPlay?: () => void; busy: boolean }> = ({ title, onInspect, onPlay, busy }) => (
  <div className="group flex gap-2.5 rounded-2xl border p-2.5" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
    <button type="button" onClick={onInspect} aria-label={`About ${title.title}`} className="h-28 w-20 shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-tf-line)" }}>
      {title.poster ? (
        <img src={title.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="grid h-full w-full place-items-center text-lg">🎞</span>
      )}
    </button>
    <div className="flex min-w-0 flex-1 flex-col">
      <button type="button" onClick={onInspect} className="truncate text-left text-[13px] font-bold hover:underline">
        {title.title}
      </button>
      <div className="mt-1 flex flex-wrap gap-1">
        {title.year && <Chip tone="muted">{title.year}</Chip>}
        {title.tmdbRating && <Chip tone="gold">★ {title.tmdbRating}</Chip>}
        {title.sources.length > 0 && (
          <span className="rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: LICENCE_TONE[title.licence] ?? "#475569" }}>
            {title.licenceLabel.slice(0, 22)}
          </span>
        )}
        {title.runtimeMinutes && <Chip tone="muted">{title.runtimeMinutes} min</Chip>}
      </div>
      <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
        {title.overview || title.attribution}
      </p>
      <div className="mt-auto flex items-center gap-2 pt-2">
        {onPlay && title.sources.length > 0 ? (
          <Button size="sm" onClick={onPlay} disabled={busy}>
            ▶ Play
          </Button>
        ) : (
          <Button size="sm" onClick={onInspect}>
            ℹ Info
          </Button>
        )}
        <span className="truncate text-[10px]" style={{ color: "var(--color-tf-sub)" }}>
          {title.providerLabel}
        </span>
      </div>
    </div>
  </div>
);

const DetailSheet: React.FC<{
  title: CatalogTitle;
  lookup: TitleLookup | null;
  loading: boolean;
  onClose: () => void;
  onPlay: (title: CatalogTitle, sourceUrl?: string) => void;
  busy: boolean;
}> = ({ title, lookup, loading, onClose, onPlay, busy }) => {
  const shown = lookup?.title ?? title;
  const [openSeason, setOpenSeason] = useState<number | null>(null);
  const [showFreeSearches, setShowFreeSearches] = useState(false);
  const imdb = shown.imdb;
  const rating = imdb?.rating ?? (shown.tmdbRating ? String(shown.tmdbRating) : null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border p-4 sm:rounded-3xl"
        style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={shown.title}
      >
        <div className="flex gap-3">
          <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl border" style={{ borderColor: "var(--color-tf-line)" }}>
            {shown.poster ? <img src={shown.poster} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-2xl">🎞</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">{shown.title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {shown.year && <Chip tone="muted">{shown.year}</Chip>}
              <Chip tone="muted">{shown.kind === "series" ? "TV series" : "Movie"}</Chip>
              {rating && <Chip tone="gold">★ {rating}{imdb?.rating ? ` · IMDb${imdb.votes ? ` ${imdb.votes}` : ""}` : " · TMDB"}</Chip>}
              {shown.contentRating && <Chip tone="muted">{shown.contentRating}</Chip>}
              {shown.kind === "movie"
                ? shown.runtimeMinutes && <Chip tone="muted">{shown.runtimeMinutes} min</Chip>
                : (shown.seasonsCount || shown.episodesCount) && <Chip tone="muted">{shown.seasonsCount ?? "?"} seasons · {shown.episodesCount ?? "?"} eps</Chip>}
              {shown.genres.map((g) => (
                <Chip key={g} tone="purple">
                  {g}
                </Chip>
              ))}
            </div>
            {shown.tagline && <p className="mt-1.5 text-[12px] italic">{shown.tagline}</p>}
            <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--color-tf-sub)" }}>
              {shown.overview || "No synopsis published for this title."}
            </p>
            {imdb?.awards && <p className="mt-1 text-[11px]" style={{ color: "var(--color-tf-gold)" }}>{imdb.awards}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="self-start text-lg">
            ✕
          </button>
        </div>

        {loading && <p className="mt-3 text-[12px]" style={{ color: "var(--color-tf-sub)" }}>Loading cast, seasons and official availability…</p>}

        {/* Licensed copies — the only thing that plays here */}
        {lookup && (
          <section className="mt-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              Free &amp; licensed copies
            </h3>
            {lookup.playable.length ? (
              <div className="mt-2 space-y-2">
                {lookup.playable.map((candidate) => (
                  <div key={candidate.id} className="flex items-center gap-2.5 rounded-xl border p-2" style={{ borderColor: "var(--color-tf-line)" }}>
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg border" style={{ borderColor: "var(--color-tf-line)" }}>
                      {candidate.poster ? <img src={candidate.poster} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full place-items-center">🎞</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-bold">{candidate.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        {candidate.year && <Chip tone="muted">{candidate.year}</Chip>}
                        <span className="rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: LICENCE_TONE[candidate.licence] ?? "#475569" }}>
                          {candidate.licenceLabel.slice(0, 30)}
                        </span>
                        <Chip tone="muted">{candidate.sources.length} source{candidate.sources.length === 1 ? "" : "s"}</Chip>
                        {candidate.subtitles.length > 0 && <Chip tone="teal">{candidate.subtitles.length} subs</Chip>}
                      </div>
                      {candidate.attribution && <div className="mt-0.5 truncate text-[10px]" style={{ color: "var(--color-tf-sub)" }}>{candidate.attribution}</div>}
                    </div>
                    <Button size="sm" disabled={busy} onClick={() => onPlay(candidate, candidate.sources[0]?.url)}>
                      Add &amp; play
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[12px]" style={{ color: "var(--color-tf-sub)" }}>
                No first-party upload of this title was found on YouTube or Dailymotion — use an official destination below.
              </p>
            )}
          </section>
        )}

        {/* Official destinations */}
        <section className="mt-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
            Where to watch officially
          </h3>
          {shown.watch.length ? (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {shown.watch.map((w, i) => (
                  <a
                    key={`${w.kind}-${w.provider}-${i}`}
                    href={w.link ?? shown.watchLink ?? shown.externalUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[11.5px] hover:underline"
                    style={{ borderColor: "var(--color-tf-line)" }}
                    title={WATCH_LABEL[w.kind]}
                  >
                    {w.logo ? <img src={w.logo} alt="" className="h-4 w-4 rounded" /> : null}
                    <b>{w.provider}</b>
                    <span style={{ color: w.kind === "free" || w.kind === "ads" ? "#0f766e" : "var(--color-tf-sub)" }}>{WATCH_LABEL[w.kind]}</span>
                  </a>
                ))}
              </div>
              {shown.watch.some((w) => w.kind === "free" || w.kind === "ads") && (
                <p className="mt-1.5 text-[11px]" style={{ color: "#0f766e" }}>✅ Free and legal in your region — no account needed for the “free / with ads” entries.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12px]" style={{ color: "var(--color-tf-sub)" }}>
              No region availability published. Check the{" "}
              {shown.externalUrl ? (
                <a className="underline" href={shown.externalUrl} target="_blank" rel="noreferrer">
                  official page
                </a>
              ) : (
                "official page"
              )}
              .
            </p>
          )}
        </section>

        {/* Free without paying, and without pirating */}
        {lookup?.free && (
          <section className="mt-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              Watch free — licensed services
            </h3>
            <p className="mt-1.5 text-[11.5px]" style={{ color: lookup.free.confirmed.length ? "#0f766e" : "var(--color-tf-sub)" }}>
              {lookup.free.confirmed.length ? "✅ " : "ℹ️ "}
              {lookup.free.summary}
            </p>

            {!!lookup.free.confirmed.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lookup.free.confirmed.map((d) => (
                  <a
                    key={d.serviceId}
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    title={d.basis}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[11.5px] hover:underline"
                    style={{ borderColor: "#0f766e55", background: "#0f766e14" }}
                  >
                    {d.logo ? <img src={d.logo} alt="" className="h-4 w-4 rounded" /> : null}
                    <b>{d.name}</b>
                    <span style={{ color: "#0f766e" }}>
                      {d.kind === "ads" ? "free with ads" : d.kind === "library" ? "library card" : "public domain"}
                    </span>
                    {d.playableInApp && <span style={{ color: "#0369a1" }}>· plays here</span>}
                  </a>
                ))}
              </div>
            )}

            {!!lookup.free.trySearch.length && (
              <div className="mt-2">
                <button type="button" className="text-[11px] underline" style={{ color: "#6d28d9" }} onClick={() => setShowFreeSearches((v) => !v)}>
                  {showFreeSearches ? "Hide" : "Search"} the other {lookup.free.trySearch.length} free services for “{shown.title}”
                </button>
                {showFreeSearches && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lookup.free.trySearch.map((d) => (
                      <a
                        key={d.serviceId}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Search ${d.name} — ${d.basis}`}
                        className="rounded-lg border px-2 py-1 text-[11px] hover:underline"
                        style={{ borderColor: "var(--color-tf-line)" }}
                      >
                        <b>{d.name}</b>
                        <span className="ml-1" style={{ color: "var(--color-tf-sub)" }}>
                          {d.kind === "ads" ? "ads" : d.kind === "library" ? "library card" : "open"}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="mt-1.5 text-[10.5px] leading-relaxed" style={{ color: "var(--color-tf-sub)" }}>
              Region: {lookup.free.region}. Unlicensed streaming sites that serve commercial films and TV without a licence are deliberately not integrated — every option here pays the rights holder.
            </p>
          </section>
        )}

        {/* Cast */}
        {!!shown.cast.length && (
          <section className="mt-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              Cast
            </h3>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {shown.cast.map((person) => (
                <div key={`${person.name}-${person.role}`} className="w-[76px] shrink-0 text-center">
                  <div className="mx-auto h-[76px] w-[76px] overflow-hidden rounded-full border" style={{ borderColor: "var(--color-tf-line)" }}>
                    {person.photo ? <img src={person.photo} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="grid h-full place-items-center text-[11px]">{person.name.slice(0, 2)}</span>}
                  </div>
                  <div className="mt-1 truncate text-[11px] font-bold">{person.name}</div>
                  <div className="truncate text-[10px]" style={{ color: "var(--color-tf-sub)" }}>{person.role}</div>
                </div>
              ))}
            </div>
            {!!shown.crew.length && (
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                {shown.crew.slice(0, 6).map((c) => `${c.role}: ${c.name}`).join(" · ")}
              </p>
            )}
          </section>
        )}

        {/* Seasons */}
        {shown.kind === "series" && !!shown.seasons.length && (
          <section className="mt-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              Seasons
            </h3>
            <div className="mt-2 space-y-1.5">
              {shown.seasons.map((s) => (
                <button
                  key={s.seasonNumber}
                  type="button"
                  onClick={() => setOpenSeason(openSeason === s.seasonNumber ? null : s.seasonNumber)}
                  className={cx("flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left", openSeason === s.seasonNumber && "ring-1")}
                  style={{ borderColor: "var(--color-tf-line)" }}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black" style={{ background: "var(--color-tf-panel-2)" }}>
                    {s.seasonNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{s.name}</span>
                  <span className="text-[10.5px]" style={{ color: "var(--color-tf-sub)" }}>
                    {s.episodeCount} eps{s.airDate ? ` · ${s.airDate}` : ""}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Trailers */}
        {!!shown.trailers.length && (
          <section className="mt-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--color-tf-sub)" }}>
              Official trailers &amp; clips
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shown.trailers.map((t) => (
                <a
                  key={t.youtubeId}
                  href={`https://www.youtube.com/watch?v=${t.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-2 py-1 text-[11px] hover:underline"
                  style={{ borderColor: "var(--color-tf-line)" }}
                >
                  ▶ {t.name.slice(0, 40)}{t.official ? " ✅" : ""}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Provenance */}
        <section className="mt-4 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
          <div>
            Information from {shown.providerId === "tmdb" ? "TMDB" : shown.providerLabel}
            {shown.imdb ? " + OMDb" : ""}
            {shown.imdbId ? ` · IMDb ${shown.imdbId}` : ""}
            {shown.externalUrl ? (
              <>
                {" · "}
                <a className="underline" href={shown.externalUrl} target="_blank" rel="noreferrer">
                  official page
                </a>
              </>
            ) : null}
          </div>
          {lookup?.notes.map((note) => (
            <div key={note} className="mt-1">
              {note}
            </div>
          ))}
          <div className="mt-1">Playing a title here always means a public-domain, Creative Commons, owned or officially embedded copy — never a pirate stream.</div>
        </section>
      </div>
    </div>
  );
};
