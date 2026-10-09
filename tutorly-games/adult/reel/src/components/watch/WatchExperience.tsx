"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Flame, GraduationCap, MessageCircle, Sparkles, Users, X } from "lucide-react";
import { formatTime } from "@/modules/lessons/types";
import { PlayerController, usePlayerStore, type PanelTab, type SubtitleMode } from "@/modules/player/store";
import { Button, ProgressBar, cx, RARITY_COLORS } from "@/components/ui";
import { ActivityOverlay } from "./ActivityOverlay";
import { LessonPanel, Transcript, VocabPanel } from "./Panels";
import { PartyPanel, TutorPanel, type TutorContextInput } from "./SocialPanels";
import { useLessonEngine, isDone } from "./useLessonEngine";
import { VideoPlayer, type TimelineMarker } from "./VideoPlayer";
import type { AttemptResponse, WatchData, WordContext } from "./types";

function useMediaQuery(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

const TABS: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
  { id: "transcript", label: "Transcript", icon: <BookOpen size={14} /> },
  { id: "lesson", label: "Lesson", icon: <GraduationCap size={14} /> },
  { id: "vocab", label: "Words", icon: <Sparkles size={14} /> },
  { id: "tutor", label: "Tutor", icon: <MessageCircle size={14} /> },
  { id: "party", label: "Party", icon: <Users size={14} /> },
];

export function WatchExperience({ data }: { data: WatchData }) {
  const router = useRouter();
  const controller = useMemo(() => new PlayerController(), []);

  // Dev aid: the controller (engine, sources, transport) is reachable from the
  // console so playback can be driven and inspected without a debugger.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __tutoflixController?: PlayerController }).__tutoflixController = controller;
    return () => {
      delete (window as unknown as { __tutoflixController?: PlayerController }).__tutoflixController;
    };
  }, [controller]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [prefs, setPrefs] = useState(data.prefs);
  const [savedWords, setSavedWords] = useState(() => new Set(data.savedWords));
  const [selectedWord, setSelectedWord] = useState<WordContext | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [resumeAt, setResumeAt] = useState<number | null>(() => (data.watchProgress && data.watchProgress.position > 20 && !data.watchProgress.completed ? data.watchProgress.position : null));
  const [watchAgain, setWatchAgain] = useState(() => !!data.watchProgress?.completed);
  const [autoNext, setAutoNext] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [celebrate, setCelebrate] = useState<AttemptResponse["newBadges"]>([]);
  const [hud, setHud] = useState({ xp: data.learner.xp, level: data.learner.level, streak: 0, daily: data.learner.dailyStreak });
  const panel = usePlayerStore((s) => s.panel);
  const theater = usePlayerStore((s) => s.theater);
  const toast = usePlayerStore((s) => s.toast);
  const set = usePlayerStore((s) => s.set);
  const origTrack = data.tracks.find((t) => t.isOriginal);
  const transTrack = data.tracks.find((t) => t.isTranslation);

  const onOutcome = useCallback((res: AttemptResponse) => {
    setHud({ xp: res.xp, level: res.level, streak: res.correctStreak, daily: res.dailyStreak });
    if (res.newBadges.length) setCelebrate(res.newBadges);
  }, []);

  const engine = useLessonEngine({ lessonId: data.lesson?.id ?? null, lesson: data.lesson?.data ?? null, initialStates: data.lessonProgress?.activityStates ?? {}, controller, onOutcome });

  /* ---- boot: preferences, sources ---- */
  useEffect(() => {
    set({
      subtitleMode: (data.prefs.subtitleMode as SubtitleMode) ?? "dual",
      subtitleFontSize: (data.prefs.subtitleFontSize as "sm" | "md" | "lg") ?? "md",
      subtitleBackground: data.prefs.subtitleBackground,
      theater: data.prefs.theaterMode,
      volume: data.prefs.volume,
      rate: data.prefs.playbackRate,
      panel: data.partyCode ? "party" : data.lesson ? "lesson" : "transcript",
      settingsOpen: false,
      episodesOpen: false,
      abLoop: null,
      ended: false,
    });
    const pick = controller.setSources(data.sources.map((s) => ({ id: s.id, url: s.url, type: s.type, label: s.label, qualityLabel: s.qualityLabel })));
    controller.onSourceFallback = (from, to) => usePlayerStore.getState().toastMessage(`Source “${from.label}” failed — switched to “${to.label}”, resuming at ${formatTime(controller.resumeTarget)}`, "warn");
    const start = data.watchProgress && !data.watchProgress.completed && data.watchProgress.position > 20 ? data.watchProgress.position : 0;
    if (pick) controller.loadSource(pick, start, false);
    controller.setRate(data.prefs.playbackRate);
    controller.setVolume(data.prefs.volume);
    controller.bus.emit("EPISODE_CHANGE", { episodeId: data.episode.id });
    if (data.lesson) controller.bus.emit("LESSON_START", { lessonId: data.lesson.id });
    return () => {
      controller.detach();
      controller.bus.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.episode.id]);

  /* ---- cue / chapter events ---- */
  const currentTime = usePlayerStore((s) => s.currentTime);
  const lastCue = useRef<number>(-1);
  const lastChapter = useRef<string | null>(null);
  useEffect(() => {
    if (!origTrack) return;
    const idx = origTrack.cues.findIndex((c) => currentTime >= c.startTime && currentTime <= c.endTime);
    if (idx !== lastCue.current) {
      if (lastCue.current >= 0) controller.bus.emit("CUE_EXIT", { cueId: origTrack.cues[lastCue.current].id, index: lastCue.current });
      if (idx >= 0) controller.bus.emit("CUE_ENTER", { cueId: origTrack.cues[idx].id, index: idx });
      lastCue.current = idx;
    }
    const ch = data.chapters.find((c) => currentTime >= c.startTime && currentTime < c.endTime)?.id ?? null;
    if (ch !== lastChapter.current) {
      lastChapter.current = ch;
      controller.bus.emit("CHAPTER_CHANGE", { chapterId: ch });
    }
  }, [currentTime, origTrack, data.chapters, controller]);

  /* ---- watch progress persistence (throttled) ---- */
  useEffect(() => {
    const payload = (completed?: boolean) => {
      const dur = usePlayerStore.getState().duration || data.episode.duration;
      const t = controller.currentTime;
      const cueIdx = origTrack ? origTrack.cues.findIndex((c) => t >= c.startTime && t <= c.endTime) : -1;
      return JSON.stringify({ episodeId: data.episode.id, position: t, duration: dur, completed, lastSubtitleId: cueIdx >= 0 ? origTrack!.cues[cueIdx].id : null, lastChapterId: lastChapter.current });
    };
    const save = (completed?: boolean) => fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(completed), keepalive: true }).catch(() => undefined);
    const interval = setInterval(() => {
      if (!usePlayerStore.getState().paused && controller.currentTime > 0) void save();
    }, 10000);
    let seekTimer: ReturnType<typeof setTimeout> | null = null;
    const offs = [
      controller.bus.on("PAUSE", () => controller.currentTime > 0 && void save()),
      controller.bus.on("SEEK", ({ source }) => {
        if (source === "sync") return;
        if (seekTimer) clearTimeout(seekTimer);
        seekTimer = setTimeout(() => void save(), 1500);
      }),
      controller.bus.on("ENDED", () => {
        void save(true);
        if (prefs.autoplayNext && data.neighbors.next) setAutoNext(8);
      }),
    ];
    const onHide = () => {
      if (document.visibilityState === "hidden" && controller.currentTime > 0) navigator.sendBeacon?.("/api/progress", new Blob([payload()], { type: "text/plain" }));
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(interval);
      offs.forEach((o) => o());
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [controller, data.episode.id, data.episode.duration, data.neighbors.next, origTrack, prefs.autoplayNext]);

  /* ---- autoplay next countdown ---- */
  useEffect(() => {
    if (autoNext === null) return;
    if (autoNext <= 0) {
      router.push(`/watch/${data.neighbors.next!.id}`);
      return;
    }
    const id = setTimeout(() => setAutoNext((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(id);
  }, [autoNext, router, data.neighbors.next]);

  /* ---- keyboard shortcuts ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (engine.active) return;
      const s = usePlayerStore.getState();
      const cues = origTrack?.cues ?? [];
      const idx = cues.findIndex((c) => controller.currentTime >= c.startTime && controller.currentTime <= c.endTime);
      const key = e.key.toLowerCase();
      const handled = true;
      switch (key) {
        case " ":
        case "k":
          if (!locked) controller.toggle();
          break;
        case "j":
          if (!locked) controller.skip(-10);
          break;
        case "l":
          if (!locked) controller.skip(10);
          break;
        case "arrowleft":
          if (!locked) controller.skip(-5);
          break;
        case "arrowright":
          if (!locked) controller.skip(5);
          break;
        case "arrowup":
          controller.setVolume(Math.min(1, s.volume + 0.1));
          break;
        case "arrowdown":
          controller.setVolume(Math.max(0, s.volume - 0.1));
          break;
        case "m":
          controller.setMuted(!s.muted);
          break;
        case "f":
          void controller.toggleFullscreen(containerRef.current);
          break;
        case "t":
          s.set({ theater: !s.theater });
          break;
        case "c": {
          const modes: SubtitleMode[] = transTrack ? ["off", "original", "translation", "dual"] : ["off", "original"];
          onPrefChange({ subtitleMode: modes[(modes.indexOf(s.subtitleMode) + 1) % modes.length] });
          break;
        }
        case "r":
          if (idx >= 0) controller.playRange(cues[idx].startTime, cues[idx].endTime);
          break;
        case "s":
          if (idx >= 0) controller.playRange(cues[idx].startTime, cues[idx].endTime, { rate: 0.7 });
          break;
        case ",": {
          const prev = idx > 0 ? cues[idx - 1] : cues.slice().reverse().find((c) => c.startTime < controller.currentTime - 1);
          if (prev) controller.seek(prev.startTime, "engine");
          break;
        }
        case ".": {
          const next = cues.find((c) => c.startTime > controller.currentTime + 0.2);
          if (next) controller.seek(next.startTime, "engine");
          break;
        }
        case "?":
          s.set({ shortcutsOpen: !s.shortcutsOpen });
          break;
        case "escape":
          s.set({ settingsOpen: false, episodesOpen: false, shortcutsOpen: false });
          break;
        default:
          if (/^[0-9]$/.test(key) && !locked) controller.seek((Number(key) / 10) * (s.duration || data.episode.duration));
          else return;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, engine.active, locked, origTrack, transTrack, data.episode.duration]);

  /* ---- preferences ---- */
  const prefTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrefs = useRef<Record<string, unknown>>({});
  const onPrefChange = useCallback(
    (patch: Record<string, unknown>) => {
      setPrefs((p) => ({ ...p, ...patch }));
      const storePatch: Record<string, unknown> = {};
      if ("subtitleMode" in patch) {
        storePatch.subtitleMode = patch.subtitleMode;
        controller.bus.emit("SUBTITLE_CHANGE", { mode: String(patch.subtitleMode) });
      }
      if ("subtitleFontSize" in patch) storePatch.subtitleFontSize = patch.subtitleFontSize;
      if ("subtitleBackground" in patch) storePatch.subtitleBackground = patch.subtitleBackground;
      if ("theaterMode" in patch) storePatch.theater = patch.theaterMode;
      if (Object.keys(storePatch).length) usePlayerStore.getState().set(storePatch);
      pendingPrefs.current = { ...pendingPrefs.current, ...patch };
      if (prefTimer.current) clearTimeout(prefTimer.current);
      prefTimer.current = setTimeout(() => {
        const body = pendingPrefs.current;
        pendingPrefs.current = {};
        void fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ player: body }) }).catch(() => undefined);
      }, 800);
    },
    [controller],
  );

  /* ---- words, vocabulary, tutor context ---- */
  const saveWord = useCallback(
    async (word: string, ctx: WordContext) => {
      const clean = word.toLowerCase().replace(/[^\p{L}'-]/gu, "");
      if (!clean) return;
      const tcue = transTrack?.cues.find((c) => ctx.time >= c.startTime && ctx.time <= c.endTime);
      const res = await fetch("/api/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word: clean, example: ctx.sentence, translation: tcue ? `(línea) ${tcue.text}` : undefined, episodeId: data.episode.id, timestamp: ctx.time, cueId: ctx.cueId }) }).catch(() => null);
      if (res?.ok) {
        const json = (await res.json()) as { created: boolean; newBadges?: AttemptResponse["newBadges"] };
        setSavedWords((s) => new Set(s).add(clean));
        usePlayerStore.getState().toastMessage(json.created ? `Saved “${clean}” to your vocabulary` : `“${clean}” is already in your vocabulary`, "success");
        if (json.newBadges?.length) setCelebrate(json.newBadges);
      }
    },
    [data.episode.id, transTrack],
  );

  const onWordClick = useCallback(
    (ctx: WordContext) => {
      controller.pause();
      const clean = ctx.word.replace(/[^\p{L}'-]/gu, "");
      setSelectedWord(ctx);
      set({ panel: "tutor" });
      setPendingQuestion(`What does “${clean}” mean in “${ctx.sentence}”?`);
      controller.bus.emit("WORD_CLICK", { cueId: ctx.cueId, wordIndex: ctx.wordIndex, word: ctx.word, time: ctx.time });
    },
    [controller, set],
  );

  const getContext = useCallback((): TutorContextInput => {
    const t = controller.currentTime;
    const cues = origTrack?.cues ?? [];
    let idx = cues.findIndex((c) => t >= c.startTime && t <= c.endTime);
    if (idx < 0) idx = cues.reduce((best, c, i) => (c.startTime <= t ? i : best), -1);
    const seg = data.lesson?.data.segments.find((s) => t >= s.startTime && t < s.endTime);
    return {
      episodeTitle: data.episode.title,
      timestamp: t,
      currentCue: idx >= 0 ? cues[idx].text : null,
      previousCues: cues.slice(Math.max(0, idx - 3), Math.max(0, idx)).map((c) => c.text),
      nextCues: cues.slice(idx + 1, idx + 4).map((c) => c.text),
      translationCue: transTrack?.cues.find((c) => t >= c.startTime && t <= c.endTime)?.text ?? null,
      selectedWord: selectedWord?.word ?? null,
      selectedSentence: selectedWord?.sentence ?? null,
      speaker: idx >= 0 ? cues[idx].speaker : null,
      chapter: data.chapters.find((c) => t >= c.startTime && t < c.endTime)?.title ?? null,
      lessonTitle: data.lesson?.data.metadata.title ?? null,
      segmentFocus: seg?.focus ?? null,
    };
  }, [controller, origTrack, transTrack, data, selectedWord]);

  const bookmark = useCallback(async () => {
    const t = controller.currentTime;
    const cue = origTrack?.cues.find((c) => t >= c.startTime && t <= c.endTime);
    await fetch("/api/bookmarks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ episodeId: data.episode.id, time: t, cueId: cue?.id, note: cue?.text }) }).catch(() => null);
    usePlayerStore.getState().toastMessage(`Bookmarked ${formatTime(t)}${cue ? ` — “${cue.text}”` : ""}`, "success");
  }, [controller, origTrack, data.episode.id]);

  const generateLesson = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/lessons/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ episodeId: data.episode.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      usePlayerStore.getState().toastMessage(`Lesson ready: ${json.segments} segments, ${json.activities} activities (${json.generatedBy === "ai" ? "AI" : "transcript rules"})`, "success");
      router.refresh();
    } catch (e) {
      usePlayerStore.getState().toastMessage((e as Error).message, "warn");
    } finally {
      setGenerating(false);
    }
  }, [data.episode.id, router]);

  const markers: TimelineMarker[] = useMemo(
    () => (data.lesson ? data.lesson.data.segments.flatMap((s) => s.activities.map((a) => ({ id: a.id, time: a.timestamp, color: a.color, done: isDone(engine.states[a.id]), required: a.requiredForNext, title: a.title }))) : []),
    [data.lesson, engine.states],
  );

  const levelInto = hud.xp % 500;
  const lessonSettings = data.lesson?.data.globalSettings;

  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      <div className={cx("mx-auto w-full", theater ? "" : "max-w-[1600px] px-0 py-0 md:px-4 md:py-4")}>
        <div className={cx("grid gap-4", theater ? "grid-cols-1" : "lg:grid-cols-[minmax(0,1fr)_400px]")}>
          <div className="min-w-0">
            <VideoPlayer data={{ ...data, prefs }} controller={controller} containerRef={containerRef} markers={markers} onMarkerClick={engine.jumpTo} onWordClick={onWordClick} onBookmark={bookmark} onPrefChange={onPrefChange} locked={locked}>
              {resumeAt !== null && (
                <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101018] p-6 text-center">
                    <div className="text-xs uppercase tracking-widest text-violet-300">Continue watching</div>
                    <div className="mt-1 text-2xl font-bold">Resume at {formatTime(resumeAt)}?</div>
                    <p className="mt-1 text-sm text-zinc-400">{data.episode.title}</p>
                    <div className="mt-5 flex gap-2">
                      <Button className="flex-1" onClick={() => { setResumeAt(null); controller.seek(resumeAt, "engine"); void controller.play(); }}>
                        Resume
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => { setResumeAt(null); controller.seek(0, "engine"); void controller.play(); }}>
                        Start over
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {watchAgain && resumeAt === null && (
                <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#101018] p-6 text-center">
                    <div className="text-xs uppercase tracking-widest text-emerald-300">Completed ✓</div>
                    <div className="mt-1 text-2xl font-bold">{data.episode.title}</div>
                    <div className="mt-5 flex gap-2">
                      <Button className="flex-1" onClick={() => { setWatchAgain(false); controller.seek(0, "engine"); void controller.play(); }}>
                        Watch again
                      </Button>
                      {data.neighbors.next && (
                        <Link href={`/watch/${data.neighbors.next.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">Next episode</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {engine.active && (
                <ActivityOverlay activity={engine.active.activity} segment={engine.active.segment} result={engine.lastResult} submitting={engine.submitting} allowRetry={lessonSettings?.allowRetry ?? true} sounds={lessonSettings?.suspenseSounds ?? true} controller={controller} onSubmit={(a) => void engine.submit(a)} onSkip={() => void engine.skip()} onRetry={engine.retry} onContinue={() => engine.close(true)} fullscreenMobile={isMobile} />
              )}
              {autoNext !== null && data.neighbors.next && (
                <div className="absolute bottom-20 right-4 z-40 w-72 rounded-2xl border border-white/10 bg-black/85 p-4 backdrop-blur" onClick={(e) => e.stopPropagation()}>
                  <div className="text-xs uppercase tracking-widest text-zinc-400">Up next in {autoNext}s</div>
                  <div className="mt-1 font-semibold">E{data.neighbors.next.episodeNumber} · {data.neighbors.next.title}</div>
                  <ProgressBar value={((8 - autoNext) / 8) * 100} className="mt-2" />
                  <div className="mt-3 flex gap-2">
                    <Link href={`/watch/${data.neighbors.next.id}`} className="flex-1"><Button size="sm" className="w-full">Play now</Button></Link>
                    <Button size="sm" variant="outline" onClick={() => setAutoNext(null)}>Cancel</Button>
                  </div>
                </div>
              )}
              {engine.completedModal && (
                <div className="absolute inset-0 z-40 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-[#101018] p-6 text-center">
                    <div className="text-5xl">🏆</div>
                    <h3 className="mt-2 text-2xl font-bold">Lesson complete!</h3>
                    <p className="mt-1 text-sm text-zinc-400">{data.lesson?.data.metadata.title}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-bold text-amber-300">+{engine.sessionXp}</div><div className="text-xs text-zinc-400">XP this session</div></div>
                      <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-bold text-emerald-300">{engine.progress.correct}/{engine.progress.total}</div><div className="text-xs text-zinc-400">correct</div></div>
                      <div className="rounded-xl bg-white/5 p-3"><div className="text-xl font-bold text-violet-300">Lv {hud.level}</div><div className="text-xs text-zinc-400">{levelInto}/500 XP</div></div>
                    </div>
                    <div className="mt-5 flex gap-2">
                      <Link href="/progress" className="flex-1"><Button variant="outline" className="w-full">Learning path</Button></Link>
                      {data.neighbors.next ? <Link href={`/watch/${data.neighbors.next.id}`} className="flex-1"><Button className="w-full">Next episode ▶</Button></Link> : <Button className="flex-1" onClick={() => engine.setCompletedModal(false)}>Keep watching</Button>}
                    </div>
                    <button type="button" className="mt-3 text-xs text-zinc-500 hover:text-white" onClick={() => engine.setCompletedModal(false)}>Close</button>
                  </div>
                </div>
              )}
            </VideoPlayer>

            {/* HUD */}
            <div className="mt-3 flex flex-wrap items-center gap-3 px-3 md:px-0">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                <span className="font-bold text-violet-300">Lv {hud.level}</span>
                <ProgressBar value={(levelInto / 500) * 100} className="w-24" height={5} />
                <span className="tabular-nums text-zinc-300">{hud.xp} XP</span>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-orange-300"><Flame size={13} /> {hud.daily}-day streak{hud.streak >= 2 && <span className="ml-1 text-zinc-300">· {hud.streak} correct in a row</span>}</div>
              {data.lesson && <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"><GraduationCap size={13} className="text-fuchsia-300" /> Lesson {engine.progress.percentage}%</div>}
            </div>
            <div className="mt-3 px-3 md:px-0">
              <h1 className="text-xl font-bold">{data.episode.title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-400">{data.episode.description}</p>
              {data.episode.attribution && <p className="mt-2 text-[11px] text-zinc-500">{data.episode.attribution} · {data.episode.license}</p>}
            </div>
          </div>

          {/* Panels */}
          <aside className={cx("flex flex-col overflow-hidden border-white/10 bg-white/[0.03] md:rounded-2xl md:border", theater ? "mt-4 h-[70vh]" : "h-[70vh] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]")}>
            <div className="flex border-b border-white/10" role="tablist">
              {TABS.map((tb) => (
                <button key={tb.id} role="tab" aria-selected={panel === tb.id} type="button" onClick={() => set({ panel: tb.id })} className={cx("flex flex-1 items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-semibold transition sm:text-xs", panel === tb.id ? "border-b-2 border-violet-400 text-white" : "text-zinc-400 hover:text-white")}>
                  {tb.icon} {tb.label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {panel === "transcript" && <Transcript track={origTrack} translation={transTrack} chapters={data.chapters} controller={controller} onWordClick={onWordClick} savedWords={savedWords} episodeId={data.episode.id} />}
              {panel === "lesson" && <LessonPanel lesson={data.lesson?.data ?? null} generatedBy={data.lesson?.generatedBy} personal={data.lesson?.personal} states={engine.states} progress={engine.progress} sessionXp={engine.sessionXp} onJump={engine.jumpTo} onGenerate={generateLesson} generating={generating} hasTranscript={!!origTrack} learner={data.learner} />}
              {panel === "vocab" && <VocabPanel track={origTrack} savedWords={savedWords} onSave={saveWord} episodeId={data.episode.id} />}
              {panel === "tutor" && <TutorPanel getContext={getContext} selected={selectedWord} savedWords={savedWords} onSaveWord={saveWord} pendingQuestion={pendingQuestion} onQuestionConsumed={() => setPendingQuestion(null)} />}
              {panel === "party" && <PartyPanel data={data} controller={controller} onLockChange={setLocked} onCodeChange={(c) => { const url = new URL(window.location.href); if (c) url.searchParams.set("party", c); else url.searchParams.delete("party"); window.history.replaceState(null, "", url.toString()); }} />}
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div key={toast.id} className={cx("fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-2xl backdrop-blur", toast.tone === "warn" ? "border-amber-400/40 bg-amber-500/20 text-amber-100" : toast.tone === "success" ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100" : "border-white/10 bg-black/80 text-white")} role="status" onAnimationEnd={() => set({ toast: null })} style={{ animation: "toastfade 3.5s forwards" }}>
          {toast.text}
        </div>
      )}
      {celebrate.length > 0 && (
        <div className="fixed right-4 top-4 z-50 w-80 space-y-2">
          {celebrate.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl border bg-[#101018]/95 p-3 shadow-2xl backdrop-blur" style={{ borderColor: `${RARITY_COLORS[b.rarity]}66` }}>
              <span className="text-3xl">{b.emoji}</span>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest" style={{ color: RARITY_COLORS[b.rarity] }}>{b.rarity} badge unlocked</div>
                <div className="font-bold">{b.name}</div>
                <div className="text-xs text-zinc-400">{b.description}</div>
              </div>
              <button type="button" onClick={() => setCelebrate((c) => c.filter((x) => x.id !== b.id))} aria-label="Dismiss"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
