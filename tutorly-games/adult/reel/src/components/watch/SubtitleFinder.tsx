"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Languages, LinkIcon, Loader2, Search, Wand2 } from "lucide-react";
import { Button, Pill, cx } from "@/components/ui";
import type { SubtitleProviderStatus, SubtitleSearchResult } from "@/modules/subtitles/providers";
import type { QaReport } from "@/modules/subtitles/engine";

type SearchResponse = { results: SubtitleSearchResult[]; errors: { provider: string; message: string }[]; providers: SubtitleProviderStatus[] };
type AttachResponse = { ok: true; trackId: string; cues: number; words: number; replaced: boolean; qa: QaReport; filename: string; provider: string; language: string; note?: string | null };

const LANGUAGES = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["tr", "Turkish"],
  ["ar", "Arabic"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["ru", "Russian"],
] as const;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/**
 * Subtitle search and attach.
 *
 * Searches every configured provider for this episode (or a free-text title),
 * attaches a chosen result through the normalizing engine, and shows the QA report
 * — reading speed, problem cues, overlaps — with sync tools to nudge a track that
 * is a second or two out. Pasted text and remote VTT/SRT URLs work too, so this is
 * never a dead end when a provider is unconfigured.
 */
export function SubtitleFinder({ episodeId, episodeTitle, onDone }: { episodeId?: string; episodeTitle?: string; onDone?: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"search" | "manual">("search");
  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [providers, setProviders] = useState<string[]>([]);
  const [term, setTerm] = useState(episodeTitle ?? "");
  const [pasted, setPasted] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualLanguage, setManualLanguage] = useState("en");
  const [report, setReport] = useState<AttachResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["subtitle-providers"],
    queryFn: async () => {
      const res = await fetch("/api/subtitles/providers");
      if (!res.ok) throw new Error("Could not read subtitle provider status");
      return (await res.json()) as { providers: SubtitleProviderStatus[]; whisperx: { configured: boolean; hint: string } };
    },
  });

  const search = useMutation({
    mutationFn: async () =>
      postJson<SearchResponse>("/api/subtitles/search", {
        episodeId,
        query: term.trim(),
        languages,
        providers: providers.length ? providers : undefined,
        limit: 20,
      }),
    onMutate: () => setError(null),
    onError: (err: Error) => setError(err.message),
  });

  const attach = useMutation({
    mutationFn: async (result: SubtitleSearchResult) => postJson<AttachResponse>("/api/subtitles/fetch", { episodeId, result }),
    onSuccess: async (res) => {
      setReport(res);
      await qc.invalidateQueries({ queryKey: ["subtitle-providers"] });
      router.refresh();
      onDone?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  const importManual = useMutation({
    mutationFn: async () => {
      let content = pasted.trim();
      if (!content && manualUrl.trim()) {
        const res = await fetch(manualUrl.trim());
        if (!res.ok) throw new Error(`Could not download that URL (${res.status})`);
        content = await res.text();
      }
      if (!content) throw new Error("Paste subtitle text or give a VTT/SRT URL");
      return postJson<{ trackId: string; cues: number; words: number }>("/api/subtitles/import", {
        episodeId,
        language: manualLanguage,
        label: `${manualLanguage.toUpperCase()} (manual)`,
        content,
        source: manualUrl.trim() ? "url" : "paste",
      });
    },
    onSuccess: async () => {
      setPasted("");
      setManualUrl("");
      setError(null);
      await qc.invalidateQueries({ queryKey: ["subtitle-providers"] });
      router.refresh();
      onDone?.();
    },
    onError: (err: Error) => setError(err.message),
  });

  const sync = useMutation({
    mutationFn: async (amount: number) =>
      postJson<{ qa: QaReport; cues: number }>("/api/subtitles/track", { trackId: report!.trackId, action: "shift", amount }),
    onSuccess: async (res) => {
      setReport((r) => (r ? { ...r, qa: res.qa, cues: res.cues } : r));
      router.refresh();
    },
    onError: (err: Error) => setError(err.message),
  });

  const providersKnown = search.data?.providers ?? status.data?.providers ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 text-sm">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setTab("search")} className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", tab === "search" ? "bg-violet-500/25 text-white" : "text-zinc-400 hover:text-white")}>
          <Search size={12} className="mr-1 inline" /> Search providers
        </button>
        <button type="button" onClick={() => setTab("manual")} className={cx("rounded-lg px-2.5 py-1 text-xs font-semibold", tab === "manual" ? "bg-violet-500/25 text-white" : "text-zinc-400 hover:text-white")}>
          <LinkIcon size={12} className="mr-1 inline" /> Paste / URL
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="mt-3 flex gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Title to search for (defaults to this episode)"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
              aria-label="Subtitle search title"
            />
            <Button size="sm" onClick={() => search.mutate()} disabled={search.isPending}>
              {search.isPending ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />} Find
            </Button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {LANGUAGES.map(([code, label]) => {
              const on = languages.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguages((prev) => (on ? prev.filter((l) => l !== code) : [...prev, code]))}
                  className={cx("rounded-full border px-2 py-0.5 text-[11px]", on ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400 hover:text-white")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {providersKnown.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.configured ? p.note : `Set ${p.requiresEnv}`}
                onClick={() => setProviders((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))}
                className={cx(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  providers.includes(p.id) ? "border-violet-400/60 bg-violet-500/20 text-white" : "border-white/10 text-zinc-400 hover:text-white",
                  !p.configured && "opacity-60",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.configured ? "#34d399" : "#64748b" }} />
                {p.name}
              </button>
            ))}
          </div>

          {providersKnown.some((p) => !p.configured) && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Add a key to unlock more sources: {providersKnown.filter((p) => !p.configured).map((p) => p.requiresEnv).filter(Boolean).join(", ")}. Or paste a subtitle file below.
            </p>
          )}

          {search.data?.errors.length ? <p className="mt-2 text-[11px] text-amber-300/90">{search.data.errors.map((e) => `${e.provider}: ${e.message}`).join(" · ")}</p> : null}
          {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

          <div className="mt-3 space-y-1.5">
            {(search.data?.results ?? []).map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Languages size={12} className="text-violet-300" /> {r.languageLabel}
                    <span className="text-[10px] text-zinc-500">{r.providerName}</span>
                    {r.hearingImpaired && <Pill>HI</Pill>}
                    {r.automatic && <Pill color="#fbbf24">auto</Pill>}
                  </div>
                  <div className="truncate text-[11px] text-zinc-500">{r.release ?? r.title}{r.downloads ? ` · ${r.downloads.toLocaleString()} downloads` : ""}</div>
                </div>
                <Button size="sm" variant="ghost" disabled={attach.isPending || !episodeId} onClick={() => attach.mutate(r)}>
                  {attach.isPending && attach.variables?.id === r.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Add
                </Button>
              </div>
            ))}
            {search.data && !search.data.results.length && <p className="text-xs text-zinc-500">No results. Try another title, more languages, or the paste/URL tab.</p>}
          </div>
        </>
      )}

      {tab === "manual" && (
        <>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder={"Paste VTT, SRT, ASS/SSA or WhisperX JSON here…"}
            className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
            aria-label="Subtitle text"
          />
          <div className="mt-2 flex gap-2">
            <input
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="…or https://example.com/subtitles.srt"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none"
              aria-label="Subtitle URL"
            />
            <select value={manualLanguage} onChange={(e) => setManualLanguage(e.target.value)} aria-label="Language" className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white">
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => importManual.mutate()} disabled={importManual.isPending || !episodeId}>
              {importManual.isPending ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Import
            </Button>
          </div>
          {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}
        </>
      )}

      {report && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <CheckCircle2 size={14} /> {report.provider} · {report.language.toUpperCase()} attached
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            {report.cues} cues · {report.words} words · {report.qa.durationSeconds.toFixed(0)}s of speech · {report.qa.charactersPerSecond} chars/sec
          </div>
          {report.note && <div className="mt-1 text-[11px] text-amber-300/90">{report.note}</div>}
          <div className={cx("mt-2 flex items-center gap-2 text-[11px]", report.qa.readingSpeedOk ? "text-emerald-300" : "text-amber-300")}>
            {report.qa.readingSpeedOk ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            {report.qa.readingSpeedOk ? "Reading speed is comfortable" : "Some cues are faster than the 21 chars/sec comfort limit"}
            <span className="text-zinc-500">
              · {report.qa.counts.error} error{report.qa.counts.error === 1 ? "" : "s"} · {report.qa.counts.warning} warning{report.qa.counts.warning === 1 ? "" : "s"}
            </span>
          </div>
          {report.qa.issues.length > 0 && (
            <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto text-[10px] text-zinc-500">
              {report.qa.issues.slice(0, 8).map((i, idx) => (
                <li key={`${i.code}-${i.cueIndex}-${idx}`}>
                  cue {i.cueIndex + 1}: {i.message}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400">Sync nudge:</span>
            {[-2, -1, -0.5, 0.5, 1, 2].map((delta) => (
              <button
                key={delta}
                type="button"
                disabled={sync.isPending}
                onClick={() => sync.mutate(delta)}
                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/10 disabled:opacity-50"
              >
                {delta > 0 ? `+${delta}` : delta}s
              </button>
            ))}
            {sync.isPending && <Loader2 size={12} className="animate-spin text-violet-300" />}
          </div>
        </div>
      )}

      {!episodeId && <p className="mt-3 text-[11px] text-zinc-500">Open a title first to attach subtitles to it.</p>}
    </div>
  );
}
