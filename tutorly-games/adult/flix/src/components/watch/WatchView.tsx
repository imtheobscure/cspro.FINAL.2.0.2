import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Activity, SubtitleCue } from "../../types";
import { useEpisode, useLesson, useProgress, useSaveProgress } from "../../lib/api";
import { captionSet, usePlaybackEngine } from "../../lib/media/usePlayback";
import { media } from "../../lib/media/control";
import { describeEvent, events, type FlixEventMap } from "../../lib/events";
import { nextDueActivity, segmentIndexAt } from "../../lib/lesson/engine";
import { sentenceBounds, lastStartedIndex, secondsToTimecode } from "../../lib/subtitles";
import { speak } from "../../lib/audio/tts";
import { usePlayerStore } from "../../store/player";
import { useLessonStore } from "../../store/lesson";
import { usePartyStore } from "../../store/party";
import { useProfileStore } from "../../store/profile";
import { expectedTime } from "../../lib/party/transport";
import { Button, Chip, Tabs } from "../ui";
import { PlayerStage } from "./Player";
import { TranscriptPanel } from "./TranscriptPanel";
import { LessonPanel } from "../lesson/LessonPanel";
import { ActivityOverlay, type ActivityResult } from "../lesson/ActivityOverlay";
import { LessonMaker } from "../maker/LessonMaker";
import { PartyPanel } from "../party/PartyPanel";
import { SUB_LABEL, nextSubtitleMode } from "./Controls";

type RailTab = "transcript" | "lesson" | "maker" | "party";

/**
 * The watch screen — where the three subsystems meet.
 *
 * Media Platform  → `usePlaybackEngine` (Shaka/hls.js/native, source fallback)
 * Lesson Engine   → due-activity scheduling, pauses, XP, progress persistence
 * AI Engine       → the maker tab, fed by the SAME cue list the overlay renders
 *
 * The layout is a two-column shell that never scrolls the page: the video column
 * fits the viewport height and only the panels scroll.
 */
export const WatchView: React.FC<{ episodeId: string; onBack: () => void }> = ({ episodeId, onBack }) => {
  const episodeQuery = useEpisode(episodeId);
  const lessonQuery = useLesson(episodeId);
  const saveProgress = useSaveProgress();

  const episode = episodeQuery.data ?? null;

  const preferEngine = useProfileStore((s) => s.preferEngine);
  const autoPlay = useProfileStore((s) => s.autoPlay);
  const studio = useProfileStore((s) => s.studio);

  const engine = usePlaybackEngine(episode, { preferEngine, autoPlay });

  const originalTrackId = usePlayerStore((s) => s.originalTrackId);
  const translationTrackId = usePlayerStore((s) => s.translationTrackId);
  const time = usePlayerStore((s) => s.time);
  const playing = usePlayerStore((s) => s.playing);
  const pauseAfterLine = usePlayerStore((s) => s.pauseAfterLine);
  const subtitleMode = usePlayerStore((s) => s.subtitleMode);

  const setLesson = useLessonStore((s) => s.setLesson);
  const lesson = useLessonStore((s) => s.lesson);
  const completed = useLessonStore((s) => s.completed);
  const xp = useLessonStore((s) => s.xp);
  const activeActivityId = useLessonStore((s) => s.activeActivityId);
  const openActivity = useLessonStore((s) => s.openActivity);
  const closeActivity = useLessonStore((s) => s.closeActivity);

  const [tab, setTab] = useState<RailTab>("transcript");
  const [pausedByActivity, setPausedByActivity] = useState(false);
  const [focusCue, setFocusCue] = useState<SubtitleCue | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const lastCueEndRef = useRef<number | null>(null);

  /* ── lesson: load from the library, keep the store in step ─────────────── */
  useEffect(() => {
    if (lessonQuery.data && lessonQuery.data.metadata) {
      setLesson(lessonQuery.data, episodeId);
      events.emit("lesson:loaded", {
        episodeId,
        activityCount: lessonQuery.data.segments.reduce((n, s) => n + s.activities.length, 0),
        segmentCount: lessonQuery.data.segments.length,
        qualityScore: lessonQuery.data.quality?.score ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonQuery.data, episodeId]);

  /* ── captions ─────────────────────────────────────────────────────────── */
  const captions = useMemo(() => captionSet(episode, originalTrackId, translationTrackId), [episode, originalTrackId, translationTrackId]);
  const cues = captions.cues;

  /* ── resume where the class stopped last time ────────────────────────── */
  const progressQuery = useProgress(episodeId);
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current || !engine.ready || !progressQuery.data) return;
    const position = progressQuery.data.positionSeconds;
    if (position > 5 && media.time() < 3) {
      resumedRef.current = true;
      media.seek(position);
      setLog((current) => [`${new Date().toLocaleTimeString()} · ⏱ resumed at ${position.toFixed(1)}s`, ...current].slice(0, 80));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.ready, progressQuery.data, episodeId]);

  /* ── engine log (studio mode) ─────────────────────────────────────────── */
  useEffect(() => {
    const types: (keyof FlixEventMap)[] = [
      "media:source",
      "media:ready",
      "media:error",
      "media:fallback",
      "lesson:loaded",
      "lesson:activity-open",
      "lesson:activity-answered",
      "maker:prompt-copied",
      "maker:lesson-parsed",
      "party:joined",
      "party:drift",
      "party:sync",
    ];
    const offs = types.map((type) =>
      events.on(type, (payload) => {
        setLog((current) => [`${new Date().toLocaleTimeString()} · ${describeEvent(type, payload)}`, ...current].slice(0, 80));
      }),
    );
    return () => offs.forEach((off) => off());
  }, []);

  /* ── activity scheduling ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!lesson || activeActivityId) return;
    const due = nextDueActivity(lesson, time, new Set(completed));
    if (!due) return;
    const shouldPause = due.onReach === "pause";
    if (shouldPause) {
      media.pause();
      setPausedByActivity(true);
    } else {
      setPausedByActivity(false);
    }
    openActivity(due.id);
    events.emit("lesson:activity-open", { activityId: due.id, type: due.type, timestamp: due.timestamp, pausedByActivity: shouldPause });
    setTab("lesson");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, lesson, activeActivityId, completed]);

  /* ── "pause after every line" listening mode ──────────────────────────── */
  useEffect(() => {
    if (!pauseAfterLine || !playing || !cues.length) return;
    const index = lastStartedIndex(cues, time);
    const previous = cues[index];
    if (previous && time > previous.endTime + 0.12 && lastCueEndRef.current !== previous.endTime) {
      lastCueEndRef.current = previous.endTime;
      media.pause();
    }
  }, [time, playing, pauseAfterLine, cues]);

  /* ── watch party: host publishes, followers correct drift ─────────────── */
  const partyMode = usePartyStore((s) => s.mode);
  const partyRoomId = usePartyStore((s) => s.roomId);
  const roomState = usePartyStore((s) => s.roomState);
  const publish = usePartyStore((s) => s.publish);
  const evaluateDrift = usePartyStore((s) => s.evaluateDrift);
  const clockOffset = usePartyStore((s) => s.clockOffset);

  useEffect(() => {
    if (!partyRoomId) return;
    const timer = window.setInterval(() => {
      const store = usePlayerStore.getState();
      if (partyMode === "host") {
        publish({
          isPlaying: store.playing,
          currentTime: store.time,
          playbackRate: store.rate,
          subtitleTrack: store.originalTrackId,
          subtitleMode: store.subtitleMode,
        });
        return;
      }
      if (partyMode !== "follow" || !roomState) return;
      const decision = evaluateDrift(store.time, store.playing);
      if (!decision || decision.action === "none") return;
      const expected = expectedTime(roomState, Date.now(), clockOffset());
      if (decision.action === "seek") {
        media.seek(expected);
        events.emit("party:sync", { applied: "seek", detail: `host at ${expected.toFixed(1)}s` });
      } else if (decision.action === "smooth" && decision.rate) {
        media.setRate(decision.rate);
        window.setTimeout(() => media.setRate(usePlayerStore.getState().rate), 2500);
        events.emit("party:drift", { drift: decision.drift, action: "smooth", detail: decision.detail });
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [partyRoomId, partyMode, roomState, publish, evaluateDrift, clockOffset]);

  /* ── progress persistence ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!episode) return;
    const write = () => {
      const store = usePlayerStore.getState();
      if (store.time < 3) return;
      saveProgress.mutate({
        episodeId: episode.id,
        lessonId: lesson ? episode.id : undefined,
        positionSeconds: store.time,
        completedActivityIds: useLessonStore.getState().completed,
        xp: useLessonStore.getState().xp,
        segmentIndex: segmentIndexAt(lesson, store.time),
        updatedAt: Date.now(),
      });
    };
    const timer = window.setInterval(write, 7000);
    return () => {
      window.clearInterval(timer);
      write();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode?.id, lesson]);

  /* ── keyboard shortcuts (the teacher's remote control) ────────────────── */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;
      const store = usePlayerStore.getState();
      switch (event.key) {
        case " ":
          event.preventDefault();
          media.toggle();
          break;
        case "ArrowRight":
          media.seekBy(event.shiftKey ? 1 : 5);
          break;
        case "ArrowLeft":
          media.seekBy(event.shiftKey ? -1 : -5);
          break;
        case "j":
          media.seekBy(-10);
          break;
        case "l":
          media.seekBy(10);
          break;
        case "m":
          store.setPreference({ muted: !store.muted });
          media.setVolume(store.volume, !store.muted);
          break;
        case "c":
          store.setSubtitleMode(nextSubtitleMode(store.subtitleMode));
          break;
        case "r": {
          const index = lastStartedIndex(cues, media.time());
          const cue = cues[index];
          if (cue) {
            const bounds = sentenceBounds(cues, index);
            media.playRange(bounds.start, bounds.end);
          }
          break;
        }
        case "s": {
          const index = lastStartedIndex(cues, media.time());
          const cue = cues[index];
          if (cue) {
            const bounds = sentenceBounds(cues, index);
            media.playRange(bounds.start, bounds.end, { slow: true });
          }
          break;
        }
        case "f": {
          const host = document.querySelector("[data-media-player]") ?? document.querySelector("video");
          if (!host) break;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void (host as HTMLElement).requestFullscreen?.().catch(() => undefined);
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cues]);

  /* ── keep the persisted rate/volume in step with the element ──────────── */
  const rate = usePlayerStore((s) => s.rate);
  const volume = usePlayerStore((s) => s.volume);
  const muted = usePlayerStore((s) => s.muted);
  useEffect(() => {
    media.setRate(rate);
  }, [rate]);
  useEffect(() => {
    media.setVolume(volume, muted);
  }, [volume, muted]);

  const activeActivity: Activity | null = useMemo(() => {
    if (!lesson || !activeActivityId) return null;
    return lesson.segments.flatMap((s) => s.activities).find((activity) => activity.id === activeActivityId) ?? null;
  }, [lesson, activeActivityId]);

  const activityIndex = useMemo(() => {
    if (!lesson || !activeActivity) return 0;
    return lesson.segments.flatMap((s) => s.activities).findIndex((activity) => activity.id === activeActivity.id);
  }, [lesson, activeActivity]);

  const activityTotal = lesson?.segments.reduce((n, s) => n + s.activities.length, 0) ?? 0;

  if (!episode) {
    return (
      <div className="grid flex-1 place-items-center text-center">
        <div>
          <div className="text-4xl">🎞</div>
          <div className="mt-2 font-black">{episodeQuery.isLoading ? "Opening the episode…" : "That episode is not in the library."}</div>
          <Button className="mt-3" kind="primary" onClick={onBack}>
            ← Back to the library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--color-tf-line)" }}>
        <Button size="sm" onClick={onBack}>
          ← Library
        </Button>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-black">{episode.title}</div>
          <div className="truncate text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
            {episode.show} · {episode.cefrLevel} · {cues.length} subtitle lines · {activityTotal} activities
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Chip tone="brand">
            {useProfileStore.getState().avatar} {useProfileStore.getState().name || "Learner"}
          </Chip>
          <Chip tone="gold">{xp} XP</Chip>
          <Chip tone="muted">{SUB_LABEL[subtitleMode]}</Chip>
          {partyRoomId && <Chip tone="teal">room {partyRoomId}</Chip>}
          <Button size="sm" kind={studio ? "primary" : "ghost"} onClick={() => useProfileStore.getState().setPreference({ studio: !studio })} title="Show the engine + lesson event log">
            🛠 Studio
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2.5 p-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(330px,30vw)]">
        <div className="flex min-h-0 flex-col gap-2.5">
          <PlayerStage
            episode={episode}
            lesson={lesson}
            cues={cues}
            videoRef={engine.videoRef}
            embedRef={engine.embedRef}
            embedUrl={engine.embedUrl}
            ready={engine.ready}
            notice={engine.notice}
            onRetry={engine.retry}
            onOpenSettings={() => setTab("maker")}
            completed={new Set(completed)}
            onPlayLine={(cue, options) => {
              const index = cues.findIndex((item) => item.id === cue.id);
              const bounds = sentenceBounds(cues, index);
              media.playRange(bounds.start, bounds.end, options);
            }}
            onSeekActivity={(activity) => {
              media.seek(activity.timestamp);
              openActivity(activity.id, { review: completed.includes(activity.id) });
              setPausedByActivity(false);
              media.pause();
            }}
            textTracks={episode.tracks.filter((track) => track.kind === "text")}
          />

          {studio && (
            <div className="rounded-2xl border p-2.5" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
                  Engine · lesson · AI events ({engine.sources.length} sources)
                </span>
                <Chip tone="teal">{usePlayerStore.getState().engine}</Chip>
                <Button size="sm" className="ml-auto" onClick={() => setLogOpen((v) => !v)}>
                  {logOpen ? "Hide log" : `Show log (${log.length})`}
                </Button>
              </div>
              {logOpen && (
                <div className="tf-scroll mt-2 max-h-[16vh] overflow-y-auto rounded-xl p-2 text-[11px] leading-relaxed" style={{ background: "var(--color-tf-panel-2)", color: "var(--color-tf-sub)" }}>
                  {log.length ? log.map((line, index) => <div key={index}>{line}</div>) : "Nothing yet — press play."}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel)" }}>
          <div className="border-b p-2" style={{ borderColor: "var(--color-tf-line)" }}>
            <Tabs
              value={tab}
              onChange={(id) => setTab(id as RailTab)}
              tabs={[
                { id: "transcript", label: "Transcript", icon: "📝" },
                { id: "lesson", label: "Lesson", icon: "🎓" },
                { id: "maker", label: "AI Maker", icon: "🤖" },
                { id: "party", label: "Party", icon: "👥" },
              ]}
            />
          </div>

          {tab === "transcript" && (
            <TranscriptPanel
              cues={cues}
              onSeek={(t) => media.seek(t)}
              onPlayLine={(cue, options) => {
                const index = cues.findIndex((item) => item.id === cue.id);
                const bounds = sentenceBounds(cues, index);
                media.playRange(bounds.start, bounds.end, options);
              }}
              onCuePrompt={(cue) => {
                setFocusCue(cue);
                setTab("maker");
              }}
              onSearchExternal={(query) => window.open(`https://www.google.com/search?q=${encodeURIComponent(`${query} subtitles srt vtt`)}`, "_blank", "noopener,noreferrer")}
            />
          )}

          {tab === "lesson" && (
            <LessonPanel
              lesson={lesson}
              time={time}
              onSeek={(t) => media.seek(t)}
              onOpenActivity={(activity, options) => {
                media.seek(activity.timestamp);
                media.pause();
                setPausedByActivity(!options?.review);
                openActivity(activity.id, options);
              }}
            />
          )}

          {tab === "maker" && (
            <LessonMaker
              episode={episode}
              cues={cues}
              lesson={lesson}
              time={time}
              focusCue={focusCue}
              onSeek={(t) => media.seek(t)}
              onLessonLoaded={() => setTab("lesson")}
              onCopyPrompt={({ label }) => {
                setLog((current) => [`${new Date().toLocaleTimeString()} · 📋 copied “${label}”`, ...current].slice(0, 80));
              }}
            />
          )}

          {tab === "party" && <PartyPanel episode={episode} onSeek={(t) => media.seek(t)} onTogglePlay={() => media.toggle()} />}
        </div>
      </div>

      {activeActivity && (
        <ActivityOverlay
          activity={activeActivity}
          index={Math.max(0, activityIndex)}
          total={activityTotal}
          pausedByActivity={pausedByActivity}
          speak={(text, rate) => speak(text, { rate, lang: episode.targetLanguage === "English" ? "en-US" : undefined })}
          onSeek={(t) => media.seek(t)}
          onClose={(result: ActivityResult) => {
            closeActivity();
            if (pausedByActivity && result.attempts >= 0) media.play();
            setPausedByActivity(false);
          }}
        />
      )}

      {/* A quiet reminder of the shortcut set a teacher discovers on the projector. */}
      <div className="hidden px-3 pb-2 text-[10.5px] font-bold lg:block" style={{ color: "var(--color-tf-sub)" }}>
        space play/pause · ←/→ 5s (shift 1s) · j/l 10s · r replay line · s slow replay · c subtitles · m mute · f fullscreen ·{" "}
        {cues.length ? secondsToTimecode(cues[Math.max(0, lastStartedIndex(cues, time))]?.startTime ?? 0) : "0:00"} in this scene
      </div>
    </div>
  );
};
