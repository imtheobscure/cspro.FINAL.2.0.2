import React, { useCallback, useMemo, useRef } from "react";
import { MediaPlayer, MediaProvider } from "@vidstack/react";
import type { Activity, Episode, Lesson, MediaTrack, SubtitleCue } from "../../types";
import { findCueIndex, sentenceBounds, formatClock } from "../../lib/subtitles";
import { media, pipeline } from "../../lib/media/control";
import { usePlayerStore } from "../../store/player";
import { Button, Chip } from "../ui";
import { Controls } from "./Controls";
import { SubtitleOverlay } from "./SubtitleOverlay";

/**
 * The player stage.
 *
 * Vidstack's `<MediaPlayer>` owns the surface (its store, gestures, fullscreen
 * and PiP adapters, the poster layer and the aspect box) while our own pipeline
 * owns the bytes: the `<video>` inside `MediaProvider` is the element Shaka/hls.js
 * attach to, and every control in `Controls.tsx` talks to that element through
 * the imperative bridge rather than through Vidstack's provider assumptions.
 *
 * Captions are OUR overlay on purpose — dual tracks, word highlighting and
 * click-to-seek are not something a generic caption renderer can do.
 */
export const PlayerStage: React.FC<{
  episode: Episode;
  lesson: Lesson | null;
  cues: SubtitleCue[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Set when the active source is a platform embed; see lib/media/embed.ts. */
  embedRef: React.RefObject<HTMLIFrameElement | null>;
  embedUrl: string | null;
  ready: boolean;
  notice: string | null;
  onRetry: () => void;
  onOpenSettings: () => void;
  completed: Set<string>;
  onPlayLine: (cue: SubtitleCue, options?: { slow?: boolean }) => void;
  onSeekActivity: (activity: Activity) => void;
  textTracks: MediaTrack[];
}> = ({ episode, lesson, cues, videoRef, embedRef, embedUrl, ready, notice, onRetry, onOpenSettings, completed, onPlayLine, onSeekActivity, textTracks }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const time = usePlayerStore((s) => s.time);
  const loop = usePlayerStore((s) => s.loop);
  const poster = episode.poster;

  const activeIndex = useMemo(() => findCueIndex(cues, time), [cues, time]);
  const active = activeIndex >= 0 ? cues[activeIndex] : null;

  const markers = useMemo(
    () =>
      (lesson?.segments ?? [])
        .flatMap((segment) => segment.activities)
        .map((activity) => ({
          time: activity.timestamp,
          emoji: activity.emoji,
          label: activity.title,
          color: activity.color,
          done: completed.has(activity.id),
        })),
    [lesson, completed],
  );

  const segments = useMemo(() => (lesson?.segments ?? []).map((segment) => ({ start: segment.startTime, end: segment.endTime, title: segment.title })), [lesson]);

  /** Sentence navigation works on the subtitle track, not on fixed 30s jumps. */
  const gotoSentence = useCallback(
    (delta: number) => {
      if (!cues.length) return;
      const current = activeIndex >= 0 ? activeIndex : findCueIndex(cues, time);
      const next = Math.max(0, Math.min(cues.length - 1, (current < 0 ? 0 : current) + delta));
      const cue = cues[next];
      if (cue) media.seek(cue.startTime + 0.01);
    },
    [cues, activeIndex, time],
  );

  const toggleLoop = useCallback(() => {
    const store = usePlayerStore.getState();
    if (store.loop) {
      store.setLoop(null);
      return;
    }
    const index = activeIndex >= 0 ? activeIndex : 0;
    const bounds = sentenceBounds(cues, index);
    store.setLoop({ start: bounds.start, end: Math.max(bounds.end, bounds.start + 0.6), label: cues[index]?.text.slice(0, 48) });
  }, [cues, activeIndex]);

  return (
    // `flex-1` matters: without it the card is only as tall as its content, and a
    // player whose picture is a 300×150 placeholder — an empty <video>, or an embed
    // iframe that contributes no intrinsic height — collapses to a sliver.
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-tf-line)", background: "#05060a" }}>
      <div ref={hostRef} className="relative min-h-0 flex-1" style={{ background: "#05060a" }}>
        <MediaPlayer
          title={episode.title}
          poster={poster}
          className="h-full w-full"
          style={{ width: "100%", height: "100%", ["--media-object-fit" as string]: "contain" }}
        >
          <MediaProvider>
            <video
              ref={videoRef}
              className="h-full w-full"
              playsInline
              preload="metadata"
              style={{ background: "#000", display: embedUrl ? "none" : undefined }}
            />
          </MediaProvider>
        </MediaPlayer>

        {/*
          A YouTube / Dailymotion / Vimeo source plays in the platform's own player.
          Those platforms do not publish a file to fetch — handing the id to their
          embed is the only licensed way to show the video, and the engine drives this
          iframe through the platform's API so our timeline and captions still work.
        */}
        {embedUrl && (
          <iframe
            ref={embedRef}
            src={embedUrl}
            title={episode.title}
            className="absolute inset-0 h-full w-full border-0 bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}

        <SubtitleOverlay
          original={active}
          // A fresh cue object: spreading the original would carry its `lines`
          // (and word timings) into the translation and render the original
          // text a second time.
          translation={
            active?.translation
              ? { id: `${active.id}-t`, startTime: active.startTime, endTime: active.endTime, text: active.translation, speaker: active.speaker }
              : null
          }
          onSeek={(t) => media.seek(t)}
          onHold={() => media.pause()}
        />

        {!ready && (
          <div className="absolute inset-0 grid place-items-center" style={{ background: "rgba(4,5,8,0.72)" }}>
            <div className="text-center">
              <div className="mb-2 text-3xl">🎞</div>
              <div className="text-sm font-bold">Preparing the stream…</div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--color-tf-sub)" }}>
                Shaka Player for HLS/DASH · hls.js fallback · native for mp4
              </div>
            </div>
          </div>
        )}

        {notice && (
          <div className="absolute left-3 top-3 max-w-[70%] rounded-xl px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(0,0,0,0.72)", color: "var(--color-tf-gold)", border: "1px solid color-mix(in srgb, var(--color-tf-gold) 40%, transparent)" }}>
            {notice}
            {!ready && (
              <Button size="sm" kind="ghost" className="ml-2" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}

        <div className="absolute right-3 top-3 flex gap-1.5">
          <Chip tone="muted">{formatClock(time)}</Chip>
          {loop && (
            <Chip tone="gold">
              🔂 {formatClock(loop.start)}–{formatClock(loop.end)}
              <button className="ml-1" onClick={() => usePlayerStore.getState().setLoop(null)} aria-label="clear loop">
                ✕
              </button>
            </Chip>
          )}
        </div>
      </div>

      <Controls
        title={episode.title}
        cues={cues}
        textTracks={textTracks}
        markers={markers}
        segments={segments}
        playerHost={hostRef.current}
        loopActive={!!loop}
        onSeek={(t) => media.seek(t)}
        onTogglePlay={() => media.toggle()}
        onReplaySentence={() => active && onPlayLine(active)}
        onSlowReplay={() => active && onPlayLine(active, { slow: true })}
        onPrevSentence={() => gotoSentence(-1)}
        onNextSentence={() => gotoSentence(1)}
        onToggleLoop={toggleLoop}
        onOpenSettings={onOpenSettings}
        onPlaybackRate={(rate) => {
          usePlayerStore.getState().setPreference({ rate });
          media.setRate(rate);
        }}
        onSelectQuality={(id) => pipeline.selectQuality(id)}
        onSelectAudio={(id) => pipeline.selectAudioTrack(id)}
        onSelectText={(id) => pipeline.selectTextTrack(id)}
      />

      {/* Activity markers under the player: a one-click jump to any activity. */}
      {markers.length > 0 && (
        <div className="tf-scroll flex gap-1.5 overflow-x-auto border-t px-2.5 py-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
          {(lesson?.segments ?? []).flatMap((segment) =>
            segment.activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => onSeekActivity(activity)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={{
                  borderColor: completed.has(activity.id) ? "var(--color-tf-green)" : "var(--color-tf-line)",
                  background: completed.has(activity.id) ? "color-mix(in srgb, var(--color-tf-green) 14%, transparent)" : "var(--color-tf-panel-2)",
                  color: "var(--color-tf-text)",
                }}
                title={`${activity.title} — ${formatClock(activity.timestamp)}`}
              >
                <span>{activity.emoji}</span>
                <span className="tabular-nums" style={{ color: "var(--color-tf-sub)" }}>
                  {formatClock(activity.timestamp)}
                </span>
                <span className="max-w-[120px] truncate">{activity.title}</span>
              </button>
            )),
          )}
        </div>
      )}
    </div>
  );
};
