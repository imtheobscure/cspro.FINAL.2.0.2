import React, { useMemo, useState } from "react";
import type { Episode, MediaSource, MediaTrack, SourceLicence, SubtitleFormat } from "../../types";
import { formatClock, cuesOf, parseSubtitles } from "../../lib/subtitles";
import { LICENCE_LABELS, detectKind, makeSource } from "../../lib/media/sources";
import { downloadJson } from "../../lib/api";
import { useDeleteEpisode, useEpisodes, useProgress, useSaveEpisode } from "../../lib/api";
import { useProfileStore } from "../../store/profile";
import { useLessonStore } from "../../store/lesson";
import { Button, Chip, Empty, Field, Input, Modal, ProgressBar, Textarea } from "../ui";

const LICENCES: SourceLicence[] = ["owned", "licensed", "public-domain", "creative-commons", "official-embed"];

/** The library: every episode in the IndexedDB "server", plus the importer. */
export const LibraryView: React.FC<{
  onOpen: (episodeId: string) => void;
  darkMode: boolean;
  onToggleDark: () => void;
}> = ({ onOpen, darkMode, onToggleDark }) => {
  const episodes = useEpisodes();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const list = episodes.data ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((episode) => `${episode.title} ${episode.show} ${episode.cefrLevel} ${episode.description}`.toLowerCase().includes(needle));
  }, [episodes.data, query]);

  return (
    <div className="tf-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-xl font-black">🎬 My library</div>
          <Chip tone="muted">{episodes.data?.length ?? 0} episodes</Chip>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, shows, levels…" className="max-w-[280px]" style={{ padding: "8px 10px", fontSize: 13 }} />
          <div className="ml-auto flex gap-1.5">
            <Button kind="primary" onClick={() => setAdding(true)}>
              ＋ Add video
            </Button>
            <Button onClick={onToggleDark} title="Light/dark theme">
              {darkMode ? "☀️" : "🌙"}
            </Button>
          </div>
        </div>

        {episodes.isLoading ? (
          <div className="p-6 text-center text-sm" style={{ color: "var(--color-tf-sub)" }}>
            Opening the local library…
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon="🍿"
            title="Nothing here yet"
            body="Add a video (HLS, DASH or mp4) with its subtitles, or paste a lesson JSON from the setup screen. Then generate the activities with the AI lesson maker."
            action={
              <Button kind="primary" onClick={() => setAdding(true)}>
                ＋ Add your first video
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(258px, 1fr))" }}>
            {filtered.map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} onOpen={() => onOpen(episode.id)} />
            ))}
          </div>
        )}
      </div>

      <AddEpisodeModal open={adding} onClose={() => setAdding(false)} onAdded={onOpen} />
    </div>
  );
};

const EpisodeCard: React.FC<{ episode: Episode; onOpen: () => void }> = ({ episode, onOpen }) => {
  const saveEpisode = useSaveEpisode();
  const deleteEpisode = useDeleteEpisode();
  const progress = useProgress(episode.id);
  const lesson = useLessonStore((s) => s.lesson);
  const hasLesson = !!episode.lessonId || lesson?.metadata.episodeId === episode.id;
  const completed = hasLesson && lesson?.metadata.episodeId === episode.id ? lesson.segments.flatMap((s) => s.activities).length : 0;

  const resumeAt = progress.data?.positionSeconds ?? 0;
  const percent = resumeAt && episode.durationSeconds ? (resumeAt / episode.durationSeconds) * 100 : 0;

  return (
    <div className="group overflow-hidden rounded-2xl border transition-transform hover:-translate-y-[2px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative" style={{ aspectRatio: "16 / 9", background: "linear-gradient(135deg,#1b2030,#0d1018)" }}>
          {episode.poster ? (
            <img src={episode.poster} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="grid h-full place-items-center text-4xl">🎞</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: "rgba(0,0,0,0.45)" }}>
            <div className="h-full" style={{ width: `${percent}%`, background: "var(--color-tf-brand)" }} />
          </div>
          <div className="absolute right-2 top-2 flex gap-1">
            <Chip tone="brand">{episode.cefrLevel}</Chip>
            {hasLesson && <Chip tone="teal">lesson ✓</Chip>}
          </div>
        </div>
        <div className="p-2.5">
          <div className="truncate text-[14.5px] font-black">{episode.title}</div>
          <div className="truncate text-[11.5px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
            {episode.show}
            {episode.episodeNumber ? ` · S${episode.season ?? 1}E${episode.episodeNumber}` : ""}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <Chip tone="muted">{formatClock(episode.durationSeconds)}</Chip>
            <Chip tone="muted">{episode.sources.length} source{episode.sources.length === 1 ? "" : "s"}</Chip>
            <Chip tone="muted">
              {episode.tracks.filter((t) => t.kind === "text").length} sub track{episode.tracks.filter((t) => t.kind === "text").length === 1 ? "" : "s"}
            </Chip>
            {resumeAt > 5 && <Chip tone="gold">resume {formatClock(resumeAt)}</Chip>}
          </div>
          {percent > 0 && (
            <div className="mt-1.5">
              <ProgressBar value={percent} height={4} />
            </div>
          )}
          {completed > 0 && (
            <div className="mt-1 text-[10.5px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              {completed} activities wired to this episode
            </div>
          )}
        </div>
      </button>
      <div className="flex gap-1.5 border-t px-2.5 py-2" style={{ borderColor: "var(--color-tf-line)" }}>
        <Button size="sm" kind="primary" onClick={onOpen}>
          {resumeAt > 5 ? "▶ Resume" : "▶ Watch"}
        </Button>
        <Button size="sm" onClick={() => downloadJson(`${episode.id}-episode.json`, episode)} title="Export this episode (sources + subtitles) as JSON">
          ⤓
        </Button>
        <Button
          size="sm"
          kind="danger"
          className="ml-auto"
          onClick={() => {
            if (window.confirm(`Delete “${episode.title}”? The subtitles and lesson for it are removed too.`)) void deleteEpisode.mutateAsync(episode.id);
          }}
        >
          🗑
        </Button>
      </div>
      <div className="hidden" aria-hidden>
        {saveEpisode.isPending ? "saving" : ""}
      </div>
    </div>
  );
};

/** Import a video: sources, subtitles (file or paste), poster and metadata. */
const AddEpisodeModal: React.FC<{ open: boolean; onClose: () => void; onAdded: (episodeId: string) => void }> = ({ open, onClose, onAdded }) => {
  const saveEpisode = useSaveEpisode();
  const defaultL1 = useProfileStore((s) => s.nativeLanguage);

  const [title, setTitle] = useState("");
  const [show, setShow] = useState("My videos");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("B1");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [poster, setPoster] = useState("");
  const [sources, setSources] = useState<{ url: string; label: string; licence: SourceLicence }[]>([{ url: "", label: "Main source", licence: "owned" }]);
  const [subs, setSubs] = useState<{ label: string; language: string; role: "original" | "translation"; text: string; format: SubtitleFormat }[]>([
    { label: "English (original)", language: "en", role: "original", text: "", format: "vtt" },
  ]);
  const [note, setNote] = useState<string | null>(null);

  const importFile = async (index: number, file: File) => {
    const text = await file.text();
    const format: SubtitleFormat = file.name.toLowerCase().endsWith(".srt") ? "srt" : file.name.toLowerCase().endsWith(".ass") || file.name.toLowerCase().endsWith(".ssa") ? "ass" : file.name.toLowerCase().endsWith(".json") ? "json" : "vtt";
    setSubs((current) => current.map((entry, i) => (i === index ? { ...entry, text, format, label: entry.label || file.name } : entry)));
    const parsed = parseSubtitles(text, file.name).cues.length;
    setNote(`${file.name}: ${parsed} cues detected.`);
  };

  const submit = async () => {
    const cleanSources: MediaSource[] = sources
      .filter((source) => source.url.trim())
      .map((source, index) => makeSource({ url: source.url.trim(), label: source.label || `Source ${index + 1}`, licence: source.licence, quality: 90 - index * 20 }));

    if (!title.trim() || !cleanSources.length) {
      setNote("A title and at least one source URL are required.");
      return;
    }

    const tracks: MediaTrack[] = subs
      .filter((entry) => entry.text.trim())
      .map((entry, index) => {
        const parsed = parseSubtitles(entry.text, `${entry.label || index}.${entry.format}`);
        return {
          id: `tr-${index}-${Math.random().toString(36).slice(2, 6)}`,
          kind: "text" as const,
          label: entry.label || `Track ${index + 1}`,
          language: entry.language,
          role: entry.role,
          format: parsed.format,
          raw: entry.text,
          cues: parsed.cues,
        };
      });

    const duration = Math.max(0, ...tracks.flatMap((track) => cuesOf(track).map((cue) => cue.endTime)));

    const episode: Episode = {
      id: `ep-${Date.now().toString(36)}`,
      title: title.trim(),
      show: show.trim() || "My videos",
      description: description.trim(),
      cefrLevel: level,
      targetLanguage,
      poster: poster.trim() || undefined,
      durationSeconds: duration,
      sources: cleanSources,
      tracks,
      createdAt: Date.now(),
    };

    await saveEpisode.mutateAsync(episode);
    onAdded(episode.id);
    onClose();
    setTitle("");
    setSources([{ url: "", label: "Main source", licence: "owned" }]);
    setSubs([{ label: "English (original)", language: "en", role: "original", text: "", format: "vtt" }]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="＋ Add a video"
      maxWidth={860}
      footer={
        <div className="flex items-center gap-2">
          <Button kind="primary" onClick={() => void submit()}>
            Save to my library
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          {note && (
            <span className="text-[11.5px] font-bold" style={{ color: "var(--color-tf-gold)" }}>
              {note}
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Episode or film title" />
          </Field>
          <Field label="Series / collection">
            <Input value={show} onChange={(event) => setShow(event.target.value)} placeholder="My videos" />
          </Field>
          <Field label="CEFR level">
            <Input value={level} onChange={(event) => setLevel(event.target.value)} placeholder="B1" />
          </Field>
          <Field label="Language being taught">
            <Input value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} placeholder="English" />
          </Field>
          <Field label="Poster image URL (optional)">
            <Input value={poster} onChange={(event) => setPoster(event.target.value)} placeholder="https://…/poster.jpg" />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="One line about this episode" />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
            Sources — only authorised material: owned, licensed, public domain, Creative Commons or an official embed
          </div>
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1.6fr_0.8fr_0.7fr_auto]">
                <Input
                  value={source.url}
                  onChange={(event) => setSources((current) => current.map((entry, i) => (i === index ? { ...entry, url: event.target.value } : entry)))}
                  placeholder="https://…/stream.m3u8  ·  .mpd  ·  .mp4"
                />
                <Input
                  value={source.label}
                  onChange={(event) => setSources((current) => current.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)))}
                  placeholder="Label"
                />
                <select
                  value={source.licence}
                  onChange={(event) => setSources((current) => current.map((entry, i) => (i === index ? { ...entry, licence: event.target.value as SourceLicence } : entry)))}
                  className="rounded-xl border px-2 py-2 text-[12px]"
                  style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)", color: "var(--color-tf-text)" }}
                >
                  {LICENCES.map((licence) => (
                    <option key={licence} value={licence}>
                      {LICENCE_LABELS[licence]}
                    </option>
                  ))}
                </select>
                <Button kind="danger" onClick={() => setSources((current) => (current.length > 1 ? current.filter((_, i) => i !== index) : current))} disabled={sources.length === 1}>
                  ✕
                </Button>
                <div className="text-[10.5px] font-bold sm:col-span-4" style={{ color: "var(--color-tf-sub)" }}>
                  detected: {source.url ? detectKind(source.url) : "—"} · sources are tried in order and playback state is preserved when one fails
                </div>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={() => setSources((current) => [...current, { url: "", label: `Fallback ${current.length + 1}`, licence: "owned" }])}>
            ＋ Add a fallback source
          </Button>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
            Subtitles — the lesson maker reads these
          </div>
          <div className="space-y-2">
            {subs.map((entry, index) => (
              <div key={index} className="rounded-xl border p-2.5" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                <div className="grid gap-2 sm:grid-cols-[1.2fr_0.6fr_auto_auto]">
                  <Input
                    value={entry.label}
                    onChange={(event) => setSubs((current) => current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
                    placeholder="Track label"
                  />
                  <Input
                    value={entry.language}
                    onChange={(event) => setSubs((current) => current.map((item, i) => (i === index ? { ...item, language: event.target.value } : item)))}
                    placeholder="en / fa"
                  />
                  <select
                    value={entry.role}
                    onChange={(event) => setSubs((current) => current.map((item, i) => (i === index ? { ...item, role: event.target.value as "original" | "translation" } : item)))}
                    className="rounded-xl border px-2 py-2 text-[12px]"
                    style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)", color: "var(--color-tf-text)" }}
                  >
                    <option value="original">original (taught)</option>
                    <option value="translation">{defaultL1} (L1)</option>
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[12px] font-bold" style={{ borderColor: "var(--color-tf-line)" }}>
                    ⤒ File
                    <input
                      type="file"
                      accept=".vtt,.srt,.ass,.ssa,.json,.txt"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void importFile(index, file);
                      }}
                    />
                  </label>
                </div>
                <Textarea
                  value={entry.text}
                  onChange={(event) => setSubs((current) => current.map((item, i) => (i === index ? { ...item, text: event.target.value } : item)))}
                  rows={3}
                  placeholder="…or paste the subtitle text here (WebVTT, SRT, ASS/SSA, JSON)"
                  style={{ marginTop: 8, fontFamily: "ui-monospace, monospace", fontSize: 11.5 }}
                />
                {entry.text.trim() && (
                  <div className="mt-1 text-[10.5px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
                    {parseSubtitles(entry.text, `x.${entry.format}`).cues.length} cues · {entry.format.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={() => setSubs((current) => [...current, { label: `${defaultL1} (translation)`, language: defaultL1, role: "translation", text: "", format: "vtt" }])}>
            ＋ Add a translation track
          </Button>
        </div>
      </div>
    </Modal>
  );
};
