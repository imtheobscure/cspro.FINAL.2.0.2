"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Clapperboard, Compass, Film, Globe2, LinkIcon, Loader2, Play, Plus, Search, ShieldCheck, Tv, X } from "lucide-react";
import { Button, Card, Pill, cx } from "@/components/ui";
import type { DiscoverSource, DiscoverTitle, ProviderStatus, SearchResponse } from "@/modules/discovery/types";
import { TitleInformation } from "./TitleInformation";

type StatusResponse = { providers: ProviderStatus[]; recent: { titleId: string; title: string; poster: string | null; licenseLabel: string | null; episodeId: string }[] };
type BrowseResponse = { sections: { id: string; label: string; query: string; titles: DiscoverTitle[] }[] };

const KINDS: { id: "any" | "movie" | "series"; label: string; icon: React.ReactNode }[] = [
  { id: "any", label: "Everything", icon: <Compass size={14} /> },
  { id: "movie", label: "Movies", icon: <Film size={14} /> },
  { id: "series", label: "TV series", icon: <Tv size={14} /> },
];

const LICENSE_TONE: Record<string, string> = {
  PUBLIC_DOMAIN: "#34d399",
  CREATIVE_COMMONS: "#60a5fa",
  OFFICIAL_API: "#c084fc",
  OFFICIAL_EMBED: "#c084fc",
  OWNED: "#fbbf24",
  LICENSED: "#fbbf24",
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/**
 * Search-and-play browser.
 *
 * One query goes to every configured catalog; results carry their licence, their
 * playable renditions and whether they are already in the library. Anything from
 * a free catalog can be added and watched in one click; metadata-only results
 * (a famous film that no open catalog holds) link to the official destination
 * instead of pretending we can stream it.
 */
export function DiscoverBrowser() {
  const router = useRouter();
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [kind, setKind] = useState<"any" | "movie" | "series">("any");
  const [providers, setProviders] = useState<string[]>([]);
  const [detail, setDetail] = useState<DiscoverTitle | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "warn" | "success"; text: string } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 450);
    return () => clearTimeout(id);
  }, [term]);

  const status = useQuery({
    queryKey: ["discover-status"],
    queryFn: async () => {
      const res = await fetch("/api/discover/status");
      if (!res.ok) throw new Error("Could not read catalog status");
      return (await res.json()) as StatusResponse;
    },
  });

  /**
   * The opening feed. Discover used to lead with an empty page until you typed
   * something, which is why it looked as though neither YouTube nor Dailymotion had
   * any videos: nothing was listed. Dailymotion needs no key, so real playable
   * videos are shown from the first load.
   */
  const browse = useQuery({
    queryKey: ["discover-browse"],
    enabled: debounced.length < 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/discover/browse");
      if (!res.ok) throw new Error("Could not load the Discover feed");
      return (await res.json()) as BrowseResponse;
    },
  });

  const search = useQuery({
    queryKey: ["discover-search", debounced, kind, providers.join(",")],
    enabled: debounced.length >= 2,
    queryFn: async () => postJson<SearchResponse>("/api/discover/search", { query: debounced, kind, providers: providers.length ? providers : undefined, limit: 12 }),
  });

  const detailQuery = useQuery({
    queryKey: ["discover-title", detail?.id],
    enabled: !!detail,
    queryFn: async () => {
      const res = await fetch(`/api/discover/title?id=${encodeURIComponent(detail!.id)}`);
      const json = (await res.json()) as { title?: DiscoverTitle; warning?: string | null; error?: string };
      if (!res.ok || !json.title) throw new Error(json.error || "Could not resolve this title");
      return json;
    },
  });

  const importTitle = useMutation({
    mutationFn: async (title: DiscoverTitle) => postJson<{ episodeId: string; title: string; sources: number; subtitleTracks: number; warnings: string[] }>("/api/discover/import", { title }),
    onSuccess: async (result) => {
      setNotice({
        tone: result.warnings.length ? "warn" : "success",
        text: `Added “${result.title}” · ${result.sources} source${result.sources === 1 ? "" : "s"}${result.subtitleTracks ? `, ${result.subtitleTracks} subtitle track${result.subtitleTracks === 1 ? "" : "s"}` : ""}${result.warnings.length ? ` (${result.warnings.length} warning)` : ""}. Opening the player…`,
      });
      await qc.invalidateQueries({ queryKey: ["discover-status"] });
      router.push(`/watch/${result.episodeId}`);
    },
    onError: (err: Error) => setNotice({ tone: "warn", text: err.message }),
  });

  const titles = useMemo(() => search.data?.titles ?? [], [search.data]);
  const playable = useMemo(() => titles.filter((t) => t.sources.length || t.inLibrary), [titles]);
  const metaOnly = useMemo(() => titles.filter((t) => !t.sources.length && !t.inLibrary), [titles]);
  const shownDetail = detailQuery.data?.title ?? detail;

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-20 pt-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
            <Compass className="text-violet-300" /> Discover
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-400">
            Search YouTube, Dailymotion and Vimeo for anything, plus every movie and TV series through TMDB. Platform-hosted videos play right here in the platform's own official player, with
            interactive subtitles; everything else links to its official streaming destination.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Button key={k.id} size="sm" variant={kind === k.id ? "primary" : "outline"} onClick={() => setKind(k.id)}>
              {k.icon} {k.label}
            </Button>
          ))}
        </div>
      </header>

      {/* Search */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Night of the Living Dead · The Kid · ocean documentary · Planet Earth…"
            aria-label="Search catalogs"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-9 pr-9 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/60 focus:outline-none"
          />
          {term && (
            <button type="button" aria-label="Clear search" onClick={() => setTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X size={15} />
            </button>
          )}
        </div>
        {search.isFetching && <Loader2 size={18} className="animate-spin text-violet-300" />}
      </div>

      {/* Provider filters + status */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {(status.data?.providers ?? []).map((p) => {
          const on = providers.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              title={p.configured ? p.note : `Set ${p.requiresEnv} to enable`}
              onClick={() => setProviders((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
              className={cx(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition",
                on ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400 hover:text-white",
                !p.configured && "opacity-60",
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.configured ? (p.reachable === false ? "#f59e0b" : "#34d399") : "#64748b" }} />
              {p.name}
              {!p.configured && <span className="text-[10px]">needs {p.requiresEnv}</span>}
            </button>
          );
        })}
        {providers.length > 0 && (
          <button type="button" className="text-zinc-500 hover:text-white" onClick={() => setProviders([])}>
            clear filter
          </button>
        )}
      </div>

      {/*
        Catalog search needs one free key. Until it is set, only the open archives
        are searchable — say exactly what to do instead of failing quietly.
      */}
      {status.data?.providers.some((p) => p.id === "tmdb" && !p.configured) && (
        <Card className="mt-3 text-xs text-zinc-300">
          <div className="font-semibold text-white">Search every movie and TV series — add a free TMDB key</div>
          <p className="mt-1 text-zinc-400">
            Right now only the keyless sources are searchable — Dailymotion works out of the box. A free key from{" "}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
              themoviedb.org
            </a>{" "}
            unlocks every film and TV series with posters, cast, crew, seasons, trailers and each title's official streaming destinations. Set these in
            the app's environment and restart:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] text-emerald-200">{"TMDB_API_KEY=your_tmdb_key        # movies and TV series metadata\nYOUTUBE_API_KEY=your_key          # YouTube search (playback needs no key)\nVIMEO_ACCESS_TOKEN=your_token     # optional: Vimeo documentary catalog\nTMDB_REGION=US                    # optional: which country's availability to show"}</pre>
        </Card>
      )}

      {search.data?.errors?.length ? (
        <p className="mt-2 text-xs text-amber-300/90">
          {search.data.errors.map((e) => `${e.provider}: ${e.message}`).join(" · ")}
        </p>
      ) : null}

      {notice && (
        <div
          className={cx(
            "mt-4 rounded-xl border px-4 py-2 text-sm",
            notice.tone === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : notice.tone === "warn" ? "border-amber-400/30 bg-amber-500/10 text-amber-100" : "border-white/10 bg-white/5",
          )}
        >
          {notice.text}
        </div>
      )}

      {/* Results */}
      {search.isError && <p className="mt-6 text-sm text-rose-300">{(search.error as Error).message}</p>}
      {!search.isFetching && debounced.length >= 2 && !titles.length && !search.isError && (
        <Card className="mt-6 text-sm text-zinc-400">
          Nothing matched “{debounced}”. Try a shorter query — platform videos are titled as sentences, so “chaplin” finds more than the full film name. YouTube search also needs a free
          Data API key (playback never does), while Dailymotion search always works.
        </Card>
      )}

      {!!playable.length && (
        <>
          <h2 className="mt-7 mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-emerald-300">
            <ShieldCheck size={15} /> Plays here — official platform embed
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playable.map((t) => (
              <TitleCard key={t.id} title={t} onInspect={() => setDetail(t)} onAdd={() => importTitle.mutate(t)} adding={importTitle.isPending && importTitle.variables?.id === t.id} />
            ))}
          </div>
        </>
      )}

      {!!metaOnly.length && (
        <>
          <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <Globe2 size={15} /> Official availability
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {metaOnly.map((t) => (
              <TitleCard key={t.id} title={t} onInspect={() => setDetail(t)} onAdd={() => importTitle.mutate(t)} adding={false} />
            ))}
          </div>
        </>
      )}

      {!!status.data?.recent.length && !debounced && (
        <>
          <h2 className="mt-9 mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <Clapperboard size={15} /> Recently added to your library
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {status.data.recent.map((r) => (
              <a key={r.titleId} href={`/watch/${r.episodeId}`} className="group w-40 shrink-0">
                <div className="aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {r.poster ? <img src={r.poster} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : null}
                </div>
                <div className="mt-1 truncate text-xs font-medium">{r.title}</div>
                {r.licenseLabel && <div className="truncate text-[10px] text-zinc-500">{r.licenseLabel}</div>}
              </a>
            ))}
          </div>
        </>
      )}

      {/* The keyless feed: real videos, no search and no API key needed. */}
      {debounced.length < 2 && (
        <section className="mt-7">
          {browse.isLoading && (
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={15} className="animate-spin text-violet-300" /> Loading videos you can play right now…
            </p>
          )}
          {browse.data?.sections.map((section) => (
            <div key={section.id} className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-300">{section.label}</h2>
                <button type="button" onClick={() => setTerm(section.query)} className="text-[11px] text-violet-300 hover:underline">
                  see more
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.titles.slice(0, 4).map((t) => (
                  <TitleCard key={t.id} title={t} onInspect={() => setDetail(t)} onAdd={() => importTitle.mutate(t)} adding={importTitle.isPending && importTitle.variables?.id === t.id} />
                ))}
              </div>
            </div>
          ))}
          {browse.data && !browse.data.sections.length && (
            <Card className="text-sm text-zinc-400">
              The keyless catalog returned nothing just now. Type a search below, or paste a YouTube, Dailymotion or Vimeo link into your library with ＋ Add video.
            </Card>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            These play here in the platform's own official player. YouTube search needs a free Data API key (playback does not), Vimeo needs a free access token, and Dailymotion needs
            nothing at all.
          </p>
        </section>
      )}

      {/* Detail sheet */}
      {detail && shownDetail && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={() => setDetail(null)}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c0c12] p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label={shownDetail.title}
          >
            <div className="flex gap-4">
              <div className="h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {shownDetail.poster ? <img src={shownDetail.poster} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold">{shownDetail.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {shownDetail.year && <Pill>{shownDetail.year}</Pill>}
                  <Pill>{shownDetail.kind}</Pill>
                  <Pill color={LICENSE_TONE[shownDetail.authorizationType]}>{shownDetail.licenseLabel}</Pill>
                  <Pill>{shownDetail.providerName}</Pill>
                  {detailQuery.isFetching && <Loader2 size={13} className="animate-spin text-violet-300" />}
                </div>
                <p className="mt-2 line-clamp-4 text-sm text-zinc-400">{shownDetail.overview || "No synopsis published for this title."}</p>
                {shownDetail.licenseUrl && (
                  <a href={shownDetail.licenseUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-300 hover:underline">
                    <LinkIcon size={11} /> licence
                  </a>
                )}
              </div>
              <button type="button" aria-label="Close" onClick={() => setDetail(null)} className="self-start text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/*
              Catalog information: cast, ratings, seasons, official destinations and
              every free licensed place to watch it.

              This used to be restricted to TMDB rows, which meant the film you could
              actually play here — the YouTube or Dailymotion upload — was the one with
              no information page. The panel now appears for every row: for a
              non-TMDB id the request carries the title text and the server matches it
              to the TMDB entry, so both halves of the page work from one sheet.
            */}
            <TitleInformation
              titleId={shownDetail.id}
              known={{ title: shownDetail.title, year: shownDetail.year, kind: shownDetail.kind }}
              onAdd={(t) => importTitle.mutate(t)}
              addingId={importTitle.isPending ? importTitle.variables?.id : undefined}
            />

            <h4 className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">
              {shownDetail.sources.some((s) => s.kind === "embed") ? "Official player" : "Playable renditions"} ({shownDetail.sources.length})
            </h4>
            <div className="mt-2 space-y-1.5">
              {shownDetail.sources.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No licensed copy available to stream here. {shownDetail.externalUrl && "Use the official destination below."}
                </p>
              )}
              {shownDetail.sources.map((s) => (
                <SourceRow key={`${s.providerId}-${s.url}`} source={s} />
              ))}
            </div>

            {shownDetail.subtitles.length > 0 && (
              <>
                <h4 className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Subtitles published with this item</h4>
                <ul className="mt-2 space-y-1 text-xs text-zinc-300">
                  {shownDetail.subtitles.slice(0, 6).map((s) => (
                    <li key={s.url} className="flex items-center gap-2">
                      <BadgeCheck size={13} className="text-emerald-300" /> {s.language.toUpperCase()} · {s.label}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {shownDetail.inLibrary ? (
                <Button onClick={() => router.push(`/watch/${shownDetail.inLibrary!.episodeId}`)}>
                  <Play size={15} /> Play from library
                </Button>
              ) : (
                <Button disabled={!shownDetail.sources.length || importTitle.isPending} onClick={() => importTitle.mutate(shownDetail)}>
                  {importTitle.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add to library &amp; watch
                </Button>
              )}
              {shownDetail.externalUrl && (
                <a href={shownDetail.externalUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <LinkIcon size={14} /> Open source page
                  </Button>
                </a>
              )}
            </div>
            {detailQuery.data?.warning && <p className="mt-2 text-[11px] text-amber-300/90">{detailQuery.data.warning}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function TitleCard({ title, onInspect, onAdd, adding }: { title: DiscoverTitle; onInspect: () => void; onAdd: () => void; adding: boolean }) {
  const playableNow = title.sources.length > 0;
  return (
    <Card className="flex gap-3 p-3">
      <button type="button" onClick={onInspect} className="h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5" aria-label={`Inspect ${title.title}`}>
        {title.poster ? <img src={title.poster} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-zinc-600"><Film size={18} /></div>}
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <button type="button" onClick={onInspect} className="truncate text-left text-sm font-semibold hover:underline">
          {title.title}
        </button>
        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
          {title.year && <Pill>{title.year}</Pill>}
          <Pill color={LICENSE_TONE[title.authorizationType]}>{title.licenseLabel.slice(0, 28)}</Pill>
          {title.inLibrary && <Pill color="#34d399">in library</Pill>}
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{title.overview || title.attribution}</p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          {title.inLibrary ? (
            <a href={`/watch/${title.inLibrary.episodeId}`} className="text-xs font-semibold text-emerald-300 hover:underline">
              Play →
            </a>
          ) : playableNow ? (
            <Button size="sm" onClick={onAdd} disabled={adding}>
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Add &amp; play
            </Button>
          ) : (
            <button type="button" onClick={onInspect} className="text-xs font-semibold text-violet-300 hover:underline">
              Official availability →
            </button>
          )}
          <span className="text-[10px] text-zinc-600">{title.providerName}</span>
        </div>
      </div>
    </Card>
  );
}

function SourceRow({ source }: { source: DiscoverSource }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <div className="min-w-0">
        <div className="truncate font-medium text-zinc-200">{source.label}</div>
        <div className="truncate text-[10px] text-zinc-500">
          {source.kind.toUpperCase()} · {source.licenseLabel} {source.qualities.length > 1 ? `· ${source.qualities.length} renditions` : ""}
        </div>
      </div>
      <a href={source.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] text-violet-300 hover:underline">
        open
      </a>
    </div>
  );
}
