"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { EmbedFrame } from "./EmbedFrame";
import {
  ArrowLeft,
  Bookmark,
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RectangleHorizontal,
  Repeat,
  RotateCcw,
  RotateCw,
  Settings,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { findCueIndex, type RuntimeCue } from "@/modules/subtitles/engine";
import { formatTime } from "@/modules/lessons/types";
import { usePlayerStore, type PlayerController, type SubtitleMode } from "@/modules/player/store";
import { cx } from "@/components/ui";
import type { WatchData, WordContext } from "./types";

export type TimelineMarker = { id: string; time: number; color: string; done: boolean; required: boolean; title: string };

type Props = {
  data: WatchData;
  controller: PlayerController;
  containerRef: RefObject<HTMLDivElement | null>;
  markers: TimelineMarker[];
  onMarkerClick: (id: string) => void;
  onWordClick: (ctx: WordContext) => void;
  onBookmark: () => void;
  onPrefChange: (patch: Record<string, unknown>) => void;
  locked: boolean;
  children?: ReactNode;
};

export function useActiveCue(cues: RuntimeCue[] | undefined) {
  const t = usePlayerStore((s) => s.currentTime);
  return useMemo(() => (cues?.length ? findCueIndex(cues, t) : -1), [cues, t]);
}

/* ------------------------------------------------------------------ */
/* Subtitles                                                           */
/* ------------------------------------------------------------------ */

function SubtitleOverlay({ data, controller, onWordClick, controlsVisible }: { data: WatchData; controller: PlayerController; onWordClick: (c: WordContext) => void; controlsVisible: boolean }) {
  const mode = usePlayerStore((s) => s.subtitleMode);
  const fontSize = usePlayerStore((s) => s.subtitleFontSize);
  const bg = usePlayerStore((s) => s.subtitleBackground);
  const abLoop = usePlayerStore((s) => s.abLoop);
  const t = usePlayerStore((s) => s.currentTime);
  const orig = data.tracks.find((tr) => tr.isOriginal);
  const trans = data.tracks.find((tr) => tr.isTranslation);
  const oi = useActiveCue(orig?.cues);
  const ti = useActiveCue(trans?.cues);
  const [hover, setHover] = useState(false);
  const cue = oi >= 0 ? orig!.cues[oi] : null;
  const tcue = ti >= 0 ? trans!.cues[ti] : null;
  if (mode === "off") return null;
  const showOrig = (mode === "original" || mode === "dual") && cue;
  const showTrans = (mode === "translation" || mode === "dual") && tcue;
  if (!showOrig && !showTrans) return null;
  const size = fontSize === "sm" ? "text-sm sm:text-lg" : fontSize === "lg" ? "text-xl sm:text-3xl" : "text-base sm:text-2xl";
  const box = bg ? "rounded-xl bg-black/70 px-3 py-1.5 backdrop-blur-sm" : "[text-shadow:0_2px_6px_rgba(0,0,0,.9)]";
  const looping = !!cue && !!abLoop && Math.abs(abLoop.start - cue.startTime) < 0.01;

  const controls = cue && (
    <div className={cx("mb-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-white backdrop-blur transition", hover ? "opacity-100" : "opacity-0")} onClick={(e) => e.stopPropagation()}>
      <IconBtn label="Previous sentence" onClick={() => oi > 0 && controller.seek(orig!.cues[oi - 1].startTime, "engine")}>
        <ChevronLeft size={16} />
      </IconBtn>
      <IconBtn label="Replay sentence" onClick={() => controller.playRange(cue.startTime, cue.endTime)}>
        <RotateCcw size={15} />
      </IconBtn>
      <IconBtn label="Slow replay" onClick={() => controller.playRange(cue.startTime, cue.endTime, { rate: 0.7 })}>
        <span className="text-xs font-bold">0.7×</span>
      </IconBtn>
      <IconBtn label={looping ? "Stop A/B loop" : "Loop this sentence (A/B)"} active={looping} onClick={() => usePlayerStore.getState().set({ abLoop: looping ? null : { start: cue.startTime, end: cue.endTime } })}>
        <Repeat size={15} />
      </IconBtn>
      <IconBtn label="Next sentence" onClick={() => oi < orig!.cues.length - 1 && controller.seek(orig!.cues[oi + 1].startTime, "engine")}>
        <ChevronRight size={16} />
      </IconBtn>
    </div>
  );

  return (
    <div className={cx("pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center px-4 text-center transition-all duration-300", controlsVisible ? "bottom-20 sm:bottom-24" : "bottom-6")} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="pointer-events-auto flex flex-col items-center">
        {controls}
        {showOrig && (
          <p className={cx("max-w-4xl font-semibold leading-snug text-white", size, box)} lang={orig?.language}>
            {cue!.words.length ? (
              cue!.words.map((w, wi) => {
                const activeWord = t >= w.startTime && t < w.endTime;
                return (
                  <span key={w.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onWordClick({ cueId: cue!.id, cueIndex: oi, word: w.text, wordIndex: wi, time: w.startTime, sentence: cue!.text });
                      }}
                      className={cx("rounded px-0.5 transition-colors hover:bg-violet-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300", activeWord && "bg-violet-500/50 text-white")}
                    >
                      {w.text}
                    </button>{" "}
                  </span>
                );
              })
            ) : (
              <span>{cue!.text}</span>
            )}
          </p>
        )}
        {showTrans && (
          <p className={cx("mt-1 max-w-4xl text-fuchsia-100", fontSize === "lg" ? "text-lg sm:text-2xl" : fontSize === "sm" ? "text-xs sm:text-base" : "text-sm sm:text-xl", box)} lang={trans?.language}>
            {tcue!.text}
          </p>
        )}
      </div>
    </div>
  );
}

function IconBtn({ children, label, onClick, active, disabled, className }: { children: ReactNode; label: string; onClick?: () => void; active?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cx("grid h-9 w-9 place-items-center rounded-lg text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:opacity-40", active && "bg-violet-500/40", className)}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

function Timeline({ data, controller, markers, onMarkerClick, locked }: { data: WatchData; controller: PlayerController; markers: TimelineMarker[]; onMarkerClick: (id: string) => void; locked: boolean }) {
  const t = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration) || data.episode.duration || 1;
  const buffered = usePlayerStore((s) => s.buffered);
  const ref = useRef<HTMLDivElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const dragging = useRef(false);
  const ratioFromEvent = (e: React.PointerEvent | PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  const hoverTime = hoverX !== null ? hoverX * duration : null;
  const hoverChapter = hoverTime !== null ? data.chapters.find((c) => hoverTime >= c.startTime && hoverTime < c.endTime) : null;

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(t)}
      aria-valuetext={formatTime(t)}
      tabIndex={0}
      className={cx("group/tl relative h-6 w-full cursor-pointer touch-none select-none", locked && "cursor-not-allowed")}
      onPointerMove={(e) => {
        setHoverX(ratioFromEvent(e));
        if (dragging.current && !locked) controller.seek(ratioFromEvent(e) * duration);
      }}
      onPointerLeave={() => setHoverX(null)}
      onPointerDown={(e) => {
        if (locked) return;
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        controller.seek(ratioFromEvent(e) * duration);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-all group-hover/tl:h-2.5">
        <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${(buffered / duration) * 100}%` }} />
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${(t / duration) * 100}%` }} />
        {data.chapters.slice(1).map((c) => (
          <div key={c.id} className="absolute inset-y-0 w-0.5 bg-black/80" style={{ left: `${(c.startTime / duration) * 100}%` }} />
        ))}
      </div>
      {markers.map((m) => (
        <button
          key={m.id}
          type="button"
          title={`${m.title} · ${formatTime(m.time)}`}
          aria-label={`Activity: ${m.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onMarkerClick(m.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={cx("absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] border transition hover:scale-150", m.done ? "border-white/60" : "border-white")}
          style={{ left: `${(m.time / duration) * 100}%`, background: m.done ? `${m.color}99` : m.color, boxShadow: m.required && !m.done ? `0 0 0 2px ${m.color}55` : undefined }}
        />
      ))}
      <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover/tl:opacity-100" style={{ left: `${(t / duration) * 100}%` }} />
      {hoverTime !== null && (
        <div className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-lg bg-black/85 px-2 py-1 text-xs text-white" style={{ left: `${hoverX! * 100}%` }}>
          {hoverChapter && <div className="font-semibold">{hoverChapter.title}</div>}
          <div>{formatTime(hoverTime)}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

type Section = "root" | "quality" | "source" | "audio" | "subtitles" | "speed" | "skip" | "chapters";

function SettingsMenu({ data, controller, onPrefChange, prefs, onClose }: { data: WatchData; controller: PlayerController; onPrefChange: (p: Record<string, unknown>) => void; prefs: WatchData["prefs"]; onClose: () => void }) {
  const [section, setSection] = useState<Section>("root");
  const sourceId = usePlayerStore((s) => s.sourceId);
  const qualityLabel = usePlayerStore((s) => s.qualityLabel);
  const rate = usePlayerStore((s) => s.rate);
  const mode = usePlayerStore((s) => s.subtitleMode);
  const fontSize = usePlayerStore((s) => s.subtitleFontSize);
  const bg = usePlayerStore((s) => s.subtitleBackground);
  const source = data.sources.find((s) => s.id === sourceId) ?? data.sources[0];
  const hasTranslation = data.tracks.some((t) => t.isTranslation);
  const levels = usePlayerStore((s) => s.levels);
  const audioOptions = usePlayerStore((s) => s.audioOptions);
  const autoQuality = usePlayerStore((s) => s.autoQuality);
  const adaptiveLabel = usePlayerStore((s) => s.adaptiveLabel);
  const engine = usePlayerStore((s) => s.engine);
  const engineLoading = usePlayerStore((s) => s.engineLoading);
  const manifestQualities = source?.qualities ?? [];
  const adaptive = source ? (source.type === "hls" || source.type === "dash") : false;
  const activeAudio = audioOptions.find((a) => a.active);

  const Row = ({ label, value, onClick, selected, disabled }: { label: string; value?: string; onClick?: () => void; selected?: boolean; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40">
      <span className="flex items-center gap-2">
        {selected !== undefined && <span className="w-4">{selected ? <Check size={14} /> : ""}</span>}
        {label}
      </span>
      {value && <span className="text-xs text-zinc-400">{value} ›</span>}
    </button>
  );
  const Head = ({ title }: { title: string }) => (
    <button type="button" onClick={() => setSection("root")} className="mb-1 flex w-full items-center gap-2 border-b border-white/10 px-3 pb-2 text-sm font-semibold text-white">
      <ChevronLeft size={16} /> {title}
    </button>
  );

  return (
    <div className="absolute bottom-16 right-2 z-30 w-72 max-w-[calc(100%-1rem)] rounded-2xl border border-white/10 bg-black/90 p-2 text-white shadow-2xl backdrop-blur" role="menu" onClick={(e) => e.stopPropagation()}>
      {section === "root" && (
        <>
          <div className="mb-1 flex items-center justify-between px-3 pb-2 pt-1 text-sm font-semibold">
            Settings
            <button type="button" onClick={onClose} aria-label="Close settings">
              <X size={16} />
            </button>
          </div>
          <Row label="Quality" value={qualityLabel} onClick={() => setSection("quality")} />
          <Row label="Source" value={source?.label.split("·")[0].trim()} onClick={() => setSection("source")} />
          <Row label="Audio" value={source?.audioTracks[0]?.label ?? "Original"} onClick={() => setSection("audio")} />
          <Row label="Subtitles" value={mode} onClick={() => setSection("subtitles")} />
          <Row label="Playback speed" value={`${rate}×`} onClick={() => setSection("speed")} />
          <Row label="Skip segments" value={`${data.skipSegments.length}`} onClick={() => setSection("skip")} />
          <Row label="Chapters" value={`${data.chapters.length}`} onClick={() => setSection("chapters")} />
        </>
      )}
      {section === "quality" && (
        <>
          <Head title="Quality" />
          {adaptive ? (
            <>
              <Row label={`Auto${autoQuality && adaptiveLabel !== "auto" ? ` · ${adaptiveLabel}` : ""}`} selected={autoQuality} onClick={() => controller.setLevel(null)} />
              {levels.map((l) => (
                <Row key={l.id} label={`${l.label} · ${(l.bitrate / 1_000_000).toFixed(1)} Mbps`} selected={!autoQuality && l.active} onClick={() => controller.setLevel(l.id)} />
              ))}
              <p className="px-3 pt-2 text-[11px] text-zinc-500">
                {levels.length > 1 ? `Adaptive engine switching between ${levels.length} renditions from the manifest.` : "The manifest publishes a single rendition; the engine is loaded."}
              </p>
            </>
          ) : (
            <>
              {manifestQualities.length === 0 && <p className="px-3 py-2 text-xs text-zinc-400">This source exposes a single rendition.</p>}
              {manifestQualities.map((q) => (
                <Row key={q.label} label={q.label} selected={qualityLabel === q.label} onClick={() => controller.loadSource({ id: source.id, url: q.url, type: source.type, label: source.label, qualityLabel: q.label })} />
              ))}
              <p className="px-3 pt-2 text-[11px] text-zinc-500">Only renditions actually published by the provider are listed.</p>
            </>
          )}
        </>
      )}
      {section === "source" && (
        <>
          <Head title="Source" />
          {data.sources.map((s) => {
            const playable = controller.canPlay(s);
            const kind = s.type === "hls" || s.type === "dash" ? "adaptive" : s.type;
            return <Row key={s.id} label={`${s.label} · ${kind}`} selected={s.id === sourceId} disabled={!playable} onClick={() => controller.loadSource({ id: s.id, url: s.url, type: s.type, label: s.label, qualityLabel: s.qualityLabel })} />;
          })}
          <p className="px-3 pt-2 text-[11px] text-zinc-500">
            {engine === "shaka" ? "Shaka Player pipeline (HLS/DASH, ABR)" : "Native element pipeline"} · {source?.authorizationType.replace("_", " ")} · {source?.availability}
          </p>
        </>
      )}
      {section === "audio" && (
        <>
          <Head title="Audio" />
          {engineLoading && <p className="px-3 py-2 text-xs text-zinc-400">Reading the manifest…</p>}
          {audioOptions.length === 0 && !engineLoading && (
            <>
              {(source?.audioTracks ?? []).map((a) => (
                <Row key={a.id} label={a.label} selected onClick={() => controller.selectAudio(a.language)} />
              ))}
              {!(source?.audioTracks ?? []).length && <p className="px-3 py-2 text-xs text-zinc-400">This source declares a single audio track.</p>}
            </>
          )}
          {audioOptions.map((a) => (
            <Row key={a.id} label={a.label} value={a.language} selected={a === activeAudio} onClick={() => controller.selectAudio(a.language)} />
          ))}
        </>
      )}
      {section === "subtitles" && (
        <>
          <Head title="Subtitles" />
          {(["off", "original", "translation", "dual"] as SubtitleMode[]).map((m) => (
            <Row key={m} label={m === "off" ? "Off" : m === "original" ? "Original (EN)" : m === "translation" ? "Translation (ES)" : "Dual"} selected={mode === m} disabled={(m === "translation" || m === "dual") && !hasTranslation} onClick={() => onPrefChange({ subtitleMode: m })} />
          ))}
          <div className="mt-1 border-t border-white/10 px-3 pt-2 text-xs text-zinc-400">Size</div>
          <div className="flex gap-1 px-3 py-1">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button key={s} type="button" onClick={() => onPrefChange({ subtitleFontSize: s })} className={cx("flex-1 rounded-lg py-1 text-xs uppercase", fontSize === s ? "bg-violet-500/40" : "bg-white/5 hover:bg-white/10")}>
                {s}
              </button>
            ))}
          </div>
          <Row label="Background box" selected={bg} onClick={() => onPrefChange({ subtitleBackground: !bg })} />
        </>
      )}
      {section === "speed" && (
        <>
          <Head title="Playback speed" />
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
            <Row key={r} label={`${r}×`} selected={rate === r} onClick={() => { controller.setRate(r); onPrefChange({ playbackRate: r }); }} />
          ))}
        </>
      )}
      {section === "skip" && (
        <>
          <Head title="Skip segments" />
          {(["Intro", "Recap", "Outro", "Credits"] as const).map((k) => {
            const key = `autoSkip${k}` as keyof WatchData["prefs"];
            return <Row key={k} label={`Auto-skip ${k.toLowerCase()}`} selected={!!prefs[key]} onClick={() => onPrefChange({ [key]: !prefs[key] })} />;
          })}
          {data.skipSegments.map((s) => (
            <p key={s.id} className="px-3 py-1 text-xs text-zinc-400">
              {s.label}: {formatTime(s.startTime)}–{formatTime(s.endTime)}
            </p>
          ))}
        </>
      )}
      {section === "chapters" && (
        <>
          <Head title="Chapters" />
          <div className="max-h-64 overflow-y-auto">
            {data.chapters.map((c) => (
              <Row key={c.id} label={c.title} value={formatTime(c.startTime)} onClick={() => { controller.seek(c.startTime); onClose(); }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Episode drawer                                                      */
/* ------------------------------------------------------------------ */

function EpisodeDrawer({ data, onClose }: { data: WatchData; onClose: () => void }) {
  const [seasonId, setSeasonId] = useState(data.season.id);
  const season = data.seasons.find((s) => s.id === seasonId) ?? data.seasons[0];
  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-white/10 bg-black/90 backdrop-blur" role="dialog" aria-label="Episodes" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white" aria-label="Season">
          {data.seasons.map((s) => (
            <option key={s.id} value={s.id}>
              Season {s.seasonNumber} · {s.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={onClose} aria-label="Close episodes" className="rounded-lg p-2 hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {season?.episodes.map((ep) => {
          const current = ep.id === data.episode.id;
          return (
            <Link key={ep.id} href={`/watch/${ep.id}${data.partyCode ? `?party=${data.partyCode}` : ""}`} className={cx("mb-2 flex gap-3 rounded-xl border p-2 transition hover:bg-white/10", current ? "border-violet-400/60 bg-violet-500/15" : "border-white/5")}>
              <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                {ep.thumbnail && <img src={ep.thumbnail} alt="" className="h-full w-full object-cover" />}
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px]">{formatTime(ep.duration)}</span>
                {ep.progress > 0 && <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full bg-violet-400" style={{ width: `${ep.progress}%` }} /></div>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span>E{ep.episodeNumber}</span>
                  {ep.completed && <span className="text-emerald-300">✓ Completed</span>}
                  {current && <span className="text-violet-300">Now playing</span>}
                </div>
                <div className="truncate text-sm font-semibold text-white">{ep.title}</div>
                <div className="mt-0.5 flex gap-1 text-[10px] text-zinc-400">
                  {ep.hasSubtitles && <span className="rounded bg-white/10 px-1">CC</span>}
                  {ep.hasLesson && <span className="rounded bg-fuchsia-500/20 px-1 text-fuchsia-200">Lesson</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

const SHORTCUTS: [string, string][] = [["Space / K", "Play / pause"], ["J / L", "Back / forward 10s"], ["← / →", "Back / forward 5s"], ["↑ / ↓", "Volume"], ["M", "Mute"], ["F", "Fullscreen"], ["T", "Theater mode"], ["C", "Cycle subtitles"], ["R", "Replay sentence"], [", / .", "Previous / next sentence"], ["S", "Slow replay"], ["0–9", "Seek to %"], ["?", "Shortcuts"]];

export function VideoPlayer({ data, controller, containerRef, markers, onMarkerClick, onWordClick, onBookmark, onPrefChange, locked, children }: Props) {
  const paused = usePlayerStore((s) => s.paused);
  const ended = usePlayerStore((s) => s.ended);
  const buffering = usePlayerStore((s) => s.buffering);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration) || data.episode.duration;
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  const rate = usePlayerStore((s) => s.rate);
  const theater = usePlayerStore((s) => s.theater);
  const fullscreen = usePlayerStore((s) => s.fullscreen);
  const controlsVisible = usePlayerStore((s) => s.controlsVisible);
  const settingsOpen = usePlayerStore((s) => s.settingsOpen);
  const episodesOpen = usePlayerStore((s) => s.episodesOpen);
  const shortcutsOpen = usePlayerStore((s) => s.shortcutsOpen);
  const subtitleMode = usePlayerStore((s) => s.subtitleMode);
  const sourceId = usePlayerStore((s) => s.sourceId);
  const set = usePlayerStore((s) => s.set);
  const activeSource = data.sources.find((s) => s.id === sourceId) ?? data.sources[0];
  /**
   * True when the active source is a YouTube / Dailymotion / Vimeo embed. The player
   * surface then belongs to the platform: our <video> element is hidden and the
   * platform's own player is mounted in its place, driven through its API.
   */
  const isEmbed = activeSource?.type === "embed";
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skippedRef = useRef<Set<string>>(new Set());

  const videoRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) controller.attach(el);
    },
    [controller],
  );

  const poke = useCallback(() => {
    set({ controlsVisible: true });
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const s = usePlayerStore.getState();
      if (!s.paused && !s.settingsOpen && !s.episodesOpen) s.set({ controlsVisible: false });
    }, 2800);
  }, [set]);

  useEffect(() => {
    if (paused) set({ controlsVisible: true });
    else poke();
  }, [paused, poke, set]);

  useEffect(() => {
    const onFs = () => set({ fullscreen: !!document.fullscreenElement });
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [set]);

  // Skip segments: auto-skip according to preferences, otherwise offer a button
  const activeSkip = data.skipSegments.find((s) => currentTime >= s.startTime && currentTime < s.endTime - 1);
  useEffect(() => {
    if (!activeSkip) return;
    const key = `autoSkip${activeSkip.type.charAt(0).toUpperCase()}${activeSkip.type.slice(1)}` as keyof WatchData["prefs"];
    if (data.prefs[key] && !skippedRef.current.has(activeSkip.id)) {
      skippedRef.current.add(activeSkip.id);
      controller.seek(activeSkip.endTime, "engine");
      usePlayerStore.getState().toastMessage(`Skipped ${activeSkip.type}`);
    }
  }, [activeSkip, data.prefs, controller]);

  const currentChapter = data.chapters.find((c) => currentTime >= c.startTime && currentTime < c.endTime);
  const cycleSubs = () => {
    const modes: SubtitleMode[] = data.tracks.some((t) => t.isTranslation) ? ["off", "original", "translation", "dual"] : ["off", "original"];
    onPrefChange({ subtitleMode: modes[(modes.indexOf(subtitleMode) + 1) % modes.length] });
  };

  return (
    <div
      ref={containerRef}
      className={cx("group relative w-full select-none overflow-hidden bg-black text-white", fullscreen ? "h-screen" : theater ? "aspect-video max-h-[82vh]" : "aspect-video rounded-2xl", !controlsVisible && !paused && "cursor-none")}
      onMouseMove={poke}
      onTouchStart={poke}
      onClick={() => {
        if (settingsOpen || episodesOpen) {
          set({ settingsOpen: false, episodesOpen: false });
          return;
        }
        if (!locked) controller.toggle();
      }}
      onDoubleClick={() => controller.toggleFullscreen(containerRef.current)}
    >
      {/*
        A platform-hosted source is played by the platform, in its own embed, driven
        through its API by the controller. The <video> element stays mounted but empty
        in that case so switching back to a file source needs no remount.
      */}
      <video
        ref={videoRef}
        className={cx("h-full w-full bg-black", isEmbed && "hidden")}
        playsInline
        poster={data.episode.poster ?? undefined}
        preload="metadata"
      />
      {isEmbed && activeSource && <EmbedFrame src={activeSource.url} controller={controller} className="absolute inset-0 h-full w-full" />}

      {/* Top bar */}
      <div className={cx("absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-black/80 to-transparent px-3 py-3 transition-opacity sm:px-5", controlsVisible ? "opacity-100" : "pointer-events-none opacity-0")} onClick={(e) => e.stopPropagation()}>
        <Link href={`/series/${data.series.id}`} className="grid h-9 w-9 place-items-center rounded-full bg-black/40 hover:bg-white/15" aria-label="Back to series">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="hidden truncate text-[11px] text-zinc-300 sm:block">
            {data.course.title} › {data.series.title} › S{data.season.seasonNumber} · E{data.episode.episodeNumber}
          </div>
          <div className="truncate text-sm font-semibold sm:text-base">
            {data.episode.title}
            {currentChapter && <span className="ml-2 text-xs font-normal text-zinc-300">· {currentChapter.title}</span>}
          </div>
        </div>
        <IconBtn label="Bookmark this moment" onClick={onBookmark}>
          <Bookmark size={18} />
        </IconBtn>
        <IconBtn label="Keyboard shortcuts" onClick={() => set({ shortcutsOpen: !shortcutsOpen })}>
          <HelpCircle size={18} />
        </IconBtn>
      </div>

      {/* Center state */}
      {buffering && !paused && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-violet-400" />
        </div>
      )}
      {paused && !ended && !children && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-black/50 backdrop-blur transition group-hover:scale-105">
            <Play size={36} className="ml-1" />
          </div>
        </div>
      )}

      <SubtitleOverlay data={data} controller={controller} onWordClick={onWordClick} controlsVisible={controlsVisible} />

      {activeSkip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            controller.seek(activeSkip.endTime, "engine");
          }}
          className={cx("absolute right-4 z-20 rounded-xl border border-white/30 bg-black/70 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-white/20", controlsVisible ? "bottom-24" : "bottom-6")}
        >
          {activeSkip.label} <SkipForward size={14} className="ml-1 inline" />
        </button>
      )}

      {/* Bottom controls */}
      <div className={cx("absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-10 transition-opacity sm:px-4", controlsVisible ? "opacity-100" : "pointer-events-none opacity-0")} onClick={(e) => e.stopPropagation()}>
        <Timeline data={data} controller={controller} markers={markers} onMarkerClick={onMarkerClick} locked={locked} />
        <div className="mt-1 flex items-center gap-0.5 sm:gap-1">
          <IconBtn label={paused ? "Play" : "Pause"} onClick={() => controller.toggle()} disabled={locked}>
            {paused ? <Play size={20} className="ml-0.5" /> : <Pause size={20} />}
          </IconBtn>
          <IconBtn label="Rewind 10 seconds" onClick={() => controller.skip(-10)} disabled={locked}>
            <RotateCcw size={18} />
          </IconBtn>
          <IconBtn label="Forward 10 seconds" onClick={() => controller.skip(10)} disabled={locked}>
            <RotateCw size={18} />
          </IconBtn>
          <div className="group/vol flex items-center">
            <IconBtn label={muted ? "Unmute" : "Mute"} onClick={() => controller.setMuted(!muted)}>
              {muted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
            </IconBtn>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { controller.setVolume(Number(e.target.value)); onPrefChange({ volume: Number(e.target.value) }); }} aria-label="Volume" className="hidden w-0 accent-violet-400 transition-all group-hover/vol:w-20 sm:block" />
          </div>
          <span className="ml-1 text-xs tabular-nums text-zinc-200 sm:text-sm">
            {formatTime(currentTime)} <span className="text-zinc-500">/ {formatTime(duration)}</span>
          </span>
          <div className="flex-1" />
          {data.neighbors.next && (
            <Link href={`/watch/${data.neighbors.next.id}`} className="hidden h-9 items-center gap-1 rounded-lg px-2 text-xs hover:bg-white/15 sm:flex" aria-label="Next episode">
              <SkipForward size={16} /> Next
            </Link>
          )}
          <IconBtn label="Episodes" active={episodesOpen} onClick={() => set({ episodesOpen: !episodesOpen, settingsOpen: false })}>
            <ListVideo size={18} />
          </IconBtn>
          <IconBtn label={`Subtitles: ${subtitleMode}`} active={subtitleMode !== "off"} onClick={cycleSubs}>
            <Captions size={18} />
          </IconBtn>
          <IconBtn label="Settings" active={settingsOpen} onClick={() => set({ settingsOpen: !settingsOpen, episodesOpen: false })}>
            <Settings size={18} />
          </IconBtn>
          <span className="hidden text-xs text-zinc-300 md:inline">{rate !== 1 ? `${rate}×` : ""}</span>
          <IconBtn label="Picture in picture" onClick={() => controller.togglePip()} className="hidden sm:grid">
            <PictureInPicture2 size={18} />
          </IconBtn>
          <IconBtn label="Theater mode" active={theater} onClick={() => { set({ theater: !theater }); onPrefChange({ theaterMode: !theater }); }} className="hidden md:grid">
            <RectangleHorizontal size={18} />
          </IconBtn>
          <IconBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => controller.toggleFullscreen(containerRef.current)}>
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </IconBtn>
        </div>
      </div>

      {settingsOpen && <SettingsMenu data={data} controller={controller} onPrefChange={onPrefChange} prefs={data.prefs} onClose={() => set({ settingsOpen: false })} />}
      {episodesOpen && <EpisodeDrawer data={data} onClose={() => set({ episodesOpen: false })} />}
      {shortcutsOpen && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); set({ shortcutsOpen: false }); }}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101018] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between font-semibold">
              Keyboard shortcuts
              <button type="button" onClick={() => set({ shortcutsOpen: false })} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-white/5 py-1">
                  <span className="text-zinc-400">{v}</span>
                  <kbd className="rounded bg-white/10 px-1.5 text-xs">{k}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
