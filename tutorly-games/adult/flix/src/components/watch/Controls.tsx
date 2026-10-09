import React, { useEffect, useMemo, useRef, useState } from "react";
import type { MediaTrack, SubtitleCue } from "../../types";
import { formatClock } from "../../lib/subtitles";
import { usePlayerStore } from "../../store/player";
import { Button, Chip, cx } from "../ui";

export interface ControlsProps {
  title: string;
  cues: SubtitleCue[];
  textTracks: MediaTrack[];
  /** Segment rail markers (activity timestamps). */
  markers: { time: number; emoji: string; label: string; color: string; done: boolean }[];
  segments: { start: number; end: number; title: string }[];
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onReplaySentence: () => void;
  onSlowReplay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onToggleLoop: () => void;
  loopActive: boolean;
  onOpenSettings: () => void;
  onPlaybackRate: (rate: number) => void;
  onSelectQuality: (id: string) => void;
  onSelectAudio: (id: string) => void;
  onSelectText: (id: string) => void;
  onSnapshot?: () => void;
  playerHost: HTMLDivElement | null;
}

const RATES = [0.5, 0.65, 0.75, 0.9, 1, 1.15, 1.25, 1.5, 2];

/** A menu that closes on outside click / Escape. */
const Menu: React.FC<{ label: React.ReactNode; children: (close: () => void) => React.ReactNode; title: string; width?: number }> = ({
  label,
  children,
  title,
  width = 230,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button kind="ghost" size="sm" onClick={() => setOpen((v) => !v)} title={title} active={open}>
        {label}
      </Button>
      {open && (
        <div
          className="tf-fade-up tf-scroll absolute bottom-full right-0 z-40 mb-2 max-h-[60vh] overflow-y-auto rounded-xl border p-1.5 shadow-2xl"
          style={{ width, background: "var(--color-tf-panel)", borderColor: "var(--color-tf-line)" }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ active?: boolean; onClick: () => void; children: React.ReactNode; hint?: string }> = ({ active, onClick, children, hint }) => (
  <button
    onClick={onClick}
    className={cx("flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-white/5")}
    style={active ? { background: "color-mix(in srgb, var(--color-tf-brand) 28%, transparent)", color: "#fff" } : { color: "var(--color-tf-text)" }}
  >
    <span className="flex items-center gap-2">{children}</span>
    {hint && <span className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>{hint}</span>}
  </button>
);

/**
 * The control surface.
 *
 * Built in-house rather than reusing a player layout because half of these
 * controls only exist for language learning — replay this sentence, slow
 * replay, A/B loop, jump between subtitle lines, pause after every line — and
 * they must sit next to the standard play/seek/volume/fullscreen/PiP/rate
 * cluster. Keyboard: space, ←/→ (5s), shift+←/→ (1s), j/l, m, f, p, c, s.
 */
export const Controls: React.FC<ControlsProps> = (props) => {
  const {
    title,
    cues,
    textTracks,
    markers,
    segments,
    onSeek,
    onTogglePlay,
    onReplaySentence,
    onSlowReplay,
    onPrevSentence,
    onNextSentence,
    onToggleLoop,
    loopActive,
    onPlaybackRate,
    onSelectQuality,
    onSelectAudio,
    onSelectText,
    onOpenSettings,
    playerHost,
  } = props;

  const store = usePlayerStore();
  const barRef = useRef<HTMLDivElement>(null);
  const [scrub, setScrub] = useState<number | null>(null);

  const duration = store.duration || 0;
  const pct = duration ? ((scrub ?? store.time) / duration) * 100 : 0;

  const markPct = useMemo(
    () => (duration ? markers.map((marker) => ({ ...marker, left: (marker.time / duration) * 100 })) : []),
    [duration, markers],
  );
  const segmentBands = useMemo(() => (duration ? segments.map((s) => ({ ...s, left: (s.start / duration) * 100, width: ((s.end - s.start) / duration) * 100 })) : []), [duration, segments]);

  const toggleFullscreen = () => {
    // Vidstack renders the player root as `[data-media-player]` (it is a div, not
    // a custom element in this version) — querying `media-player` finds nothing.
    const host = playerHost?.querySelector("[data-media-player]") ?? playerHost;
    if (!host) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void host.requestFullscreen?.().catch(() => undefined);
  };

  const togglePip = async () => {
    const video = playerHost?.querySelector("video") as HTMLVideoElement | null;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* PiP unsupported for this stream */
    }
  };

  const onScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const bufferedPct = duration ? (store.buffered / duration) * 100 : 0;

  return (
    <div className="rounded-b-2xl border border-t-0 px-3 pb-2 pt-2" style={{ background: "var(--color-tf-panel)", borderColor: "var(--color-tf-line)" }}>
      {/* ── seek bar: segments, activity markers and the scrubber ── */}
      <div
        ref={barRef}
        onClick={onScrub}
        onMouseMove={(event) => {
          if (event.buttons !== 1 || !duration || !barRef.current) return;
          const rect = barRef.current.getBoundingClientRect();
          setScrub(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration);
        }}
        onMouseUp={() => setScrub(null)}
        className="group relative mb-2 h-3 w-full cursor-pointer select-none rounded-full"
        style={{ background: "var(--color-tf-panel-2)" }}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(store.time)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") onSeek(store.time + (event.shiftKey ? 1 : 5));
          if (event.key === "ArrowLeft") onSeek(store.time - (event.shiftKey ? 1 : 5));
        }}
      >
        {/* segment bands */}
        {segmentBands.map((band, index) => (
          <div
            key={`${band.title}-${index}`}
            title={band.title}
            className="absolute top-0 h-full"
            style={{ left: `${band.left}%`, width: `${band.width}%`, background: index % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)" }}
          />
        ))}
        {/* buffered */}
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, bufferedPct)}%`, background: "rgba(255,255,255,0.16)" }} />
        {/* played */}
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-tf-brand), var(--color-tf-brand-2))" }} />
        {/* A/B loop */}
        {store.loop && duration > 0 && (
          <div
            className="absolute inset-y-0 border-x-2"
            style={{
              left: `${(store.loop.start / duration) * 100}%`,
              width: `${((store.loop.end - store.loop.start) / duration) * 100}%`,
              borderColor: "var(--color-tf-gold)",
              background: "rgba(245,176,66,0.18)",
            }}
            title="A/B loop"
          />
        )}
        {/* activity markers */}
        {markPct.map((marker, index) => (
          <div
            key={`${marker.time}-${index}`}
            title={`${marker.emoji} ${marker.label} — ${formatClock(marker.time)}`}
            className="absolute -top-1.5 h-[18px] w-[3px] rounded-full"
            style={{ left: `calc(${marker.left}% - 1.5px)`, background: marker.done ? "var(--color-tf-green)" : "var(--color-tf-gold)", opacity: marker.done ? 0.75 : 1 }}
          />
        ))}
        {/* scrub head */}
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform group-hover:scale-110"
          style={{ left: `${pct}%`, background: "#fff", borderColor: "var(--color-tf-brand)" }}
        />
      </div>

      {/* ── buttons ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button kind="primary" size="sm" onClick={onTogglePlay} title="Play / pause (space)">
          {store.playing ? "⏸" : "▶"}
        </Button>
        <Button kind="ghost" size="sm" onClick={() => onSeek(store.time - 10)} title="Back 10s">
          ⏪10
        </Button>
        <Button kind="ghost" size="sm" onClick={() => onSeek(store.time + 10)} title="Forward 10s">
          10⏩
        </Button>

        <span className="px-1 text-xs font-bold tabular-nums" style={{ color: "var(--color-tf-sub)" }}>
          {formatClock(scrub ?? store.time)} / {formatClock(duration)}
        </span>

        <div className="mx-1 h-5 w-px" style={{ background: "var(--color-tf-line)" }} />

        {/* language-learning controls */}
        <Button kind="ghost" size="sm" onClick={onPrevSentence} title="Previous subtitle line (←)">
          ⏮ Line
        </Button>
        <Button kind="ghost" size="sm" onClick={onReplaySentence} title="Replay this line (R)">
          🔁 Line
        </Button>
        <Button kind="ghost" size="sm" onClick={onSlowReplay} title="Slow replay (0.7×) of this line">
          🐢 Slow
        </Button>
        <Button kind="ghost" size="sm" onClick={onNextSentence} title="Next subtitle line (→)">
          Line ⏭
        </Button>
        <Button kind={loopActive ? "primary" : "ghost"} size="sm" onClick={onToggleLoop} title="Loop this line (L)">
          {loopActive ? "🔂 Looping" : "🔂 Loop"}
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            kind="ghost"
            size="sm"
            onClick={() => usePlayerStore.getState().setSubtitleMode(nextSubtitleMode(store.subtitleMode))}
            title="Subtitles: off → original → translation → both (C)"
          >
            {SUB_LABEL[store.subtitleMode]}
          </Button>
          <Button kind="ghost" size="sm" onClick={() => usePlayerStore.getState().setPreference({ pauseAfterLine: !store.pauseAfterLine })} title="Pause after every line">
            {store.pauseAfterLine ? "⏸/line on" : "⏸/line off"}
          </Button>

          <Menu label={`⚙ ${store.rate}×`} title="Playback speed" width={160}>
            {(close) => (
              <>
                {RATES.map((rate) => (
                  <MenuItem
                    key={rate}
                    active={rate === store.rate}
                    onClick={() => {
                      onPlaybackRate(rate);
                      close();
                    }}
                  >
                    {rate}×
                    {rate === 1 ? " (normal)" : ""}
                  </MenuItem>
                ))}
              </>
            )}
          </Menu>

          <Menu label={`🎬 ${store.engine === "none" ? "source" : store.engine}`} title="Engine, quality and tracks" width={280}>
            {(close) => (
              <>
                <div className="px-2.5 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                  Engine
                </div>
                <div className="px-2.5 pb-2 text-[12px]" style={{ color: "var(--color-tf-sub)" }}>
                  {store.engine === "shaka"
                    ? "Shaka Player — DASH/HLS adaptive (ABR, track switching)"
                    : store.engine === "hlsjs"
                      ? "hls.js — HLS fallback engine"
                      : "Native media element — progressive file"}
                  {store.fallbackNote ? <div className="mt-1" style={{ color: "var(--color-tf-gold)" }}>{store.fallbackNote}</div> : null}
                </div>
                <div className="px-2.5 pb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                  Quality {store.bandwidth ? `· ~${(store.bandwidth / 1000).toFixed(0)} kbps` : ""}
                </div>
                {store.qualities.length ? (
                  store.qualities.map((quality) => (
                    <MenuItem
                      key={quality.id}
                      active={quality.active}
                      hint={quality.bitrate ? `${Math.round(quality.bitrate / 1000)}k` : undefined}
                      onClick={() => {
                        onSelectQuality(quality.id);
                        close();
                      }}
                    >
                      {quality.label}
                    </MenuItem>
                  ))
                ) : (
                  <div className="px-2.5 py-1 text-[12px]" style={{ color: "var(--color-tf-sub)" }}>
                    Single quality source
                  </div>
                )}
                {store.audioTracks.length > 1 && (
                  <>
                    <div className="px-2.5 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                      Audio
                    </div>
                    {store.audioTracks.map((track) => (
                      <MenuItem
                        key={track.id}
                        active={track.active}
                        onClick={() => {
                          onSelectAudio(track.id);
                          close();
                        }}
                      >
                        {track.label}
                      </MenuItem>
                    ))}
                  </>
                )}
                {store.embeddedTextTracks.length > 0 && (
                  <>
                    <div className="px-2.5 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                      Embedded subtitles (from the stream)
                    </div>
                    {store.embeddedTextTracks.map((track) => (
                      <MenuItem
                        key={track.id}
                        active={track.active}
                        onClick={() => {
                          onSelectText(track.id);
                          close();
                        }}
                      >
                        {track.label}
                      </MenuItem>
                    ))}
                  </>
                )}
              </>
            )}
          </Menu>

          <Menu label="🎧 Subs" title="Subtitle track and size" width={260}>
            {() => (
              <div className="space-y-2 p-2">
                <div className="flex flex-wrap gap-1">
                  {(["off", "original", "translation", "dual"] as const).map((mode) => (
                    <Chip key={mode} tone={store.subtitleMode === mode ? "brand" : "muted"} onClick={() => usePlayerStore.getState().setSubtitleMode(mode)} active={store.subtitleMode === mode}>
                      {SUB_LABEL[mode]}
                    </Chip>
                  ))}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                  Original track
                </div>
                <div className="flex flex-wrap gap-1">
                  {textTracks
                    .filter((track) => track.role === "original")
                    .map((track) => (
                      <Chip key={track.id} active={store.originalTrackId === track.id} onClick={() => usePlayerStore.getState().setSubtitleTracks({ originalTrackId: track.id })}>
                        {track.label}
                      </Chip>
                    ))}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                  Translation track
                </div>
                <div className="flex flex-wrap gap-1">
                  {textTracks.filter((track) => track.role === "translation").length ? (
                    textTracks
                      .filter((track) => track.role === "translation")
                      .map((track) => (
                        <Chip key={track.id} active={store.translationTrackId === track.id} onClick={() => usePlayerStore.getState().setSubtitleTracks({ translationTrackId: track.id })}>
                          {track.label}
                        </Chip>
                      ))
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                      No translation track loaded
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
                    Size {store.subtitleScale.toFixed(2)}×
                  </span>
                  <input
                    type="range"
                    min={0.7}
                    max={1.8}
                    step={0.05}
                    value={store.subtitleScale}
                    onChange={(event) => usePlayerStore.getState().setPreference({ subtitleScale: Number(event.target.value) })}
                    className="w-full accent-[var(--color-tf-brand)]"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <Chip tone={store.showWordHighlight ? "gold" : "muted"} onClick={() => usePlayerStore.getState().setPreference({ showWordHighlight: !store.showWordHighlight })}>
                    word tracking
                  </Chip>
                  <Chip tone="muted" onClick={() => usePlayerStore.getState().setPreference({ dualOrder: store.dualOrder === "original-first" ? "translation-first" : "original-first" })}>
                    {store.dualOrder === "original-first" ? "EN on top" : "L1 on top"}
                  </Chip>
                </div>
              </div>
            )}
          </Menu>

          <Button kind="ghost" size="sm" onClick={() => usePlayerStore.getState().setPreference({ muted: !store.muted })} title="Mute (m)">
            {store.muted ? "🔇" : "🔊"}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={store.volume}
            onChange={(event) => {
              const volume = Number(event.target.value);
              usePlayerStore.getState().setPreference({ volume, muted: volume === 0 });
              const video = playerHost?.querySelector("video") as HTMLVideoElement | null;
              if (video) {
                video.volume = volume;
                video.muted = volume === 0;
              }
            }}
            className="w-20 accent-[var(--color-tf-brand)]"
            aria-label="Volume"
          />
          <Button kind="ghost" size="sm" onClick={togglePip} title="Picture in picture (p)">
            🖼
          </Button>
          <Button kind="ghost" size="sm" onClick={toggleFullscreen} title="Fullscreen (f)">
            ⛶
          </Button>
          <Button kind="ghost" size="sm" onClick={onOpenSettings} title="Player settings">
            ⚙️
          </Button>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
        <span className="font-bold">{title}</span>
        <span>·</span>
        <span>{cues.length} subtitle lines</span>
        <span>·</span>
        <span>{markers.filter((m) => !m.done).length} activities ahead</span>
        {store.waiting && (
          <span className="ml-auto rounded-full px-2 py-0.5 font-black" style={{ background: "rgba(245,176,66,0.2)", color: "var(--color-tf-gold)" }}>
            buffering…
          </span>
        )}
      </div>
    </div>
  );
};

export const SUB_LABEL: Record<string, string> = { off: "🚫 CC", original: "CC EN", translation: "CC L1", dual: "CC dual" };

export function nextSubtitleMode(mode: "off" | "original" | "translation" | "dual") {
  const order = ["off", "original", "translation", "dual"] as const;
  return order[(order.indexOf(mode) + 1) % order.length];
}
