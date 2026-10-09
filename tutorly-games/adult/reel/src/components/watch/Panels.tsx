"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookmarkPlus, Captions, Check, Copy, Locate, RotateCcw, Search, Sparkles, Wand2 } from "lucide-react";
import type { ActivityStateValue } from "@/db/schema";
import { ACTIVITY_META, formatTime, type VideoLesson } from "@/modules/lessons/types";
import { usePlayerStore, type PlayerController } from "@/modules/player/store";
import type { RuntimeCue } from "@/modules/subtitles/engine";
import { Button, Pill, ProgressBar, cx, CEFR_COLORS } from "@/components/ui";
import { isDone } from "./useLessonEngine";
import { SubtitleFinder } from "./SubtitleFinder";
import { useActiveCue } from "./VideoPlayer";
import type { TrackData, WatchData, WordContext } from "./types";

/* ------------------------------------------------------------------ */
/* Transcript                                                          */
/* ------------------------------------------------------------------ */

export function Transcript({ track, translation, chapters, controller, onWordClick, savedWords, episodeId }: { track?: TrackData; translation?: TrackData; chapters: WatchData["chapters"]; controller: PlayerController; onWordClick: (c: WordContext) => void; savedWords: Set<string>; episodeId: string }) {
  const [query, setQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const active = useActiveCue(track?.cues);
  const t = usePlayerStore((s) => s.currentTime);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const cues = track?.cues ?? [];
  const q = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (q) return cues.filter((c) => c.text.toLowerCase().includes(q));
    if (cues.length <= 400) return cues;
    const center = active >= 0 ? active : 0;
    return cues.slice(Math.max(0, center - 60), Math.min(cues.length, center + 120));
  }, [cues, q, active]);

  useEffect(() => {
    if (!autoScroll || q || active < 0) return;
    const el = rowRefs.current.get(cues[active]?.id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active, autoScroll, q, cues]);

  if (!track) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-3">
          <p className="text-sm text-zinc-300">No transcript yet for this episode.</p>
          <p className="mt-1 text-xs text-zinc-500">Search the subtitle providers for a matching file, paste one in, or generate a word-level transcript with WhisperX.</p>
        </div>
        <SubtitleFinder episodeId={episodeId} />
      </div>
    );
  }

  const translationFor = (cue: RuntimeCue) => {
    if (!translation) return null;
    const mid = (cue.startTime + cue.endTime) / 2;
    return translation.cues.find((c) => mid >= c.startTime && mid <= c.endTime) ?? null;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 p-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${cues.length} lines…`} className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-2 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400 focus:outline-none" aria-label="Search transcript" />
        </div>
        {translation && (
          <button type="button" onClick={() => setShowTranslation((s) => !s)} className={cx("rounded-lg px-2 py-1.5 text-xs", showTranslation ? "bg-fuchsia-500/30 text-fuchsia-100" : "bg-white/5 text-zinc-300 hover:bg-white/10")} title="Show translation">
            {translation.language.toUpperCase()}
          </button>
        )}
        <button type="button" onClick={() => setAutoScroll((a) => !a)} className={cx("rounded-lg p-1.5", autoScroll ? "bg-violet-500/30 text-violet-100" : "bg-white/5 text-zinc-300 hover:bg-white/10")} title="Follow video" aria-pressed={autoScroll} aria-label="Auto-scroll">
          <Locate size={14} />
        </button>
        <button
          type="button"
          onClick={() => setFinderOpen((f) => !f)}
          className={cx("rounded-lg p-1.5", finderOpen ? "bg-emerald-500/30 text-emerald-100" : "bg-white/5 text-zinc-300 hover:bg-white/10")}
          title="Find subtitles for this episode"
          aria-label="Find subtitles"
          aria-pressed={finderOpen}
        >
          <Captions size={14} />
        </button>
      </div>
      {finderOpen && (
        <div className="max-h-[60%] overflow-y-auto border-b border-white/10 bg-black/20">
          <SubtitleFinder episodeId={episodeId} onDone={() => setFinderOpen(false)} />
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-widest text-zinc-500">
        <span>
          {track.label} · {track.source} · {track.alignment === "word" ? "word-aligned" : "estimated word timing"}
        </span>
        {q && <span>{visible.length} matches</span>}
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-6">
        {visible.map((cue) => {
          const isActive = cue.index === active;
          const chapter = chapters.find((c) => Math.abs(c.startTime - cue.startTime) < 0.001 || (cue.index > 0 && cues[cue.index - 1].startTime < c.startTime && cue.startTime >= c.startTime));
          const tr = showTranslation ? translationFor(cue) : null;
          return (
            <div key={cue.id}>
              {chapter && !q && <div className="mt-3 px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">{chapter.title}</div>}
              <div
                ref={(el) => {
                  if (el) rowRefs.current.set(cue.id, el);
                }}
                className={cx("group/row flex gap-2 rounded-xl px-2 py-1.5 transition", isActive ? "bg-violet-500/15 ring-1 ring-violet-400/40" : "hover:bg-white/5")}
              >
                <button type="button" onClick={() => controller.seek(cue.startTime, "engine")} className="mt-0.5 w-11 shrink-0 text-left text-[11px] tabular-nums text-zinc-500 hover:text-violet-300" aria-label={`Seek to ${formatTime(cue.startTime)}`}>
                  {formatTime(cue.startTime)}
                </button>
                <div className="min-w-0 flex-1">
                  {cue.speaker && <span className="mr-1 text-[10px] font-semibold uppercase text-fuchsia-300">{cue.speaker}</span>}
                  <p className="text-sm leading-relaxed text-zinc-100">
                    {cue.words.map((w, wi) => {
                      const on = isActive && t >= w.startTime && t < w.endTime;
                      const clean = w.text.toLowerCase().replace(/[^\p{L}'-]/gu, "");
                      const saved = savedWords.has(clean);
                      const match = q && w.text.toLowerCase().includes(q);
                      return (
                        <span key={w.id}>
                          <button type="button" onClick={() => onWordClick({ cueId: cue.id, cueIndex: cue.index, word: w.text, wordIndex: wi, time: w.startTime, sentence: cue.text })} className={cx("rounded px-0.5 hover:bg-violet-500/40", on && "bg-violet-500/50 text-white", saved && "underline decoration-fuchsia-400 decoration-2 underline-offset-2", match && "bg-amber-400/30")}>
                            {w.text}
                          </button>{" "}
                        </span>
                      );
                    })}
                  </p>
                  {tr && <p className="text-xs text-fuchsia-200/80">{tr.text}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover/row:opacity-100">
                  <button type="button" onClick={() => controller.playRange(cue.startTime, cue.endTime)} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Replay line" title="Replay">
                    <RotateCcw size={12} />
                  </button>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(cue.text)} className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Copy line" title="Copy">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lesson panel                                                        */
/* ------------------------------------------------------------------ */

const STATE_ICON: Record<ActivityStateValue, string> = { not_started: "○", active: "◉", answered: "◐", correct: "✓", incorrect: "✗", skipped: "→", completed: "✓", locked: "🔒" };
const STATE_COLOR: Record<ActivityStateValue, string> = { not_started: "text-zinc-500", active: "text-violet-300", answered: "text-sky-300", correct: "text-emerald-300", incorrect: "text-rose-300", skipped: "text-zinc-400", completed: "text-emerald-300", locked: "text-zinc-500" };

export function LessonPanel({ lesson, generatedBy, personal, states, progress, sessionXp, onJump, onGenerate, generating, hasTranscript, learner }: { lesson: VideoLesson | null; generatedBy?: string; personal?: boolean; states: Record<string, ActivityStateValue>; progress: { total: number; done: number; correct: number; percentage: number }; sessionXp: number; onJump: (id: string) => void; onGenerate: () => void; generating: boolean; hasTranscript: boolean; learner: WatchData["learner"] }) {
  const t = usePlayerStore((s) => s.currentTime);
  const [showObjectives, setShowObjectives] = useState(true);
  if (!lesson) {
    return (
      <div className="space-y-4 p-5 text-sm text-zinc-300">
        <div className="rounded-2xl border border-dashed border-violet-400/40 bg-violet-500/5 p-5 text-center">
          <div className="text-3xl">🎓</div>
          <h3 className="mt-2 font-bold text-white">No lesson for this episode yet</h3>
          <p className="mt-1 text-xs text-zinc-400">The generator reads the real transcript, chapters and your learner profile ({learner.cefrLevel}, {learner.nativeLanguage} → {learner.targetLanguage}) and builds a timestamped, validated video lesson.</p>
          <Button className="mt-4" onClick={onGenerate} disabled={generating || !hasTranscript}>
            <Wand2 size={16} /> {generating ? "Generating…" : "Generate my lesson"}
          </Button>
          {!hasTranscript && <p className="mt-2 text-xs text-amber-300">Import a transcript first — lessons must be grounded in real dialogue.</p>}
        </div>
      </div>
    );
  }
  const currentSeg = lesson.segments.find((s) => t >= s.startTime && t < s.endTime);
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold leading-tight text-white">{lesson.metadata.title}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <Pill color={CEFR_COLORS[lesson.metadata.cefrLevel]}>{lesson.metadata.cefrLevel}</Pill>
              <Pill color="#94a3b8">{generatedBy === "ai" ? "AI-generated" : generatedBy === "rules" ? "Transcript-generated" : "Curated"}</Pill>
              {personal && <Pill color="#f472b6">Personalised</Pill>}
              <Pill color="#fbbf24">{lesson.segments.length} segments · {progress.total} activities</Pill>
            </div>
          </div>
          <button type="button" onClick={onGenerate} disabled={generating || !hasTranscript} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-40" title="Regenerate a personalised lesson from the transcript" aria-label="Regenerate lesson">
            <Sparkles size={16} className={generating ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar value={progress.percentage} className="flex-1" />
          <span className="text-xs tabular-nums text-zinc-300">{progress.percentage}%</span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
          <span>
            {progress.done}/{progress.total} done · {progress.correct} correct
          </span>
          <span className="text-amber-300">+{sessionXp} XP this session</span>
        </div>
      </div>

      <div className="border-b border-white/10 p-4">
        <button type="button" onClick={() => setShowObjectives((s) => !s)} className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
          Objectives <span>{showObjectives ? "−" : "+"}</span>
        </button>
        {showObjectives && (
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-300">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="space-y-2 p-3">
        {lesson.segments.map((seg, i) => {
          const isCurrent = currentSeg?.id === seg.id;
          const segDone = seg.activities.every((a) => isDone(states[a.id]));
          return (
            <div key={seg.id} className={cx("rounded-2xl border p-3 transition", isCurrent ? "border-violet-400/50 bg-violet-500/10" : "border-white/5 bg-white/[0.02]")}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Segment {i + 1} · {formatTime(seg.startTime)}–{formatTime(seg.endTime)} {segDone && <span className="text-emerald-300">· complete</span>}
                  </div>
                  <div className="truncate text-sm font-semibold text-white">{seg.title}</div>
                </div>
              </div>
              {seg.summary && <p className="mt-1 text-xs text-zinc-400">{seg.summary}</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                {seg.focus.grammar.map((g) => (
                  <Pill key={g} color="#60a5fa">
                    {g}
                  </Pill>
                ))}
                {seg.focus.vocabulary.map((v) => (
                  <Pill key={v} color="#a78bfa">
                    {v}
                  </Pill>
                ))}
                {seg.focus.pronunciation.map((p) => (
                  <Pill key={p} color="#fb7185">
                    {p}
                  </Pill>
                ))}
              </div>
              <ul className="mt-2 space-y-1">
                {seg.activities.map((a) => {
                  const st = states[a.id] ?? "not_started";
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => onJump(a.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/10">
                        <span className={cx("w-4 text-center font-bold", STATE_COLOR[st])}>{STATE_ICON[st]}</span>
                        <span className="text-base">{a.emoji}</span>
                        <span className="min-w-0 flex-1 truncate text-zinc-100">{a.title}</span>
                        <span className="text-[10px] text-zinc-500">{ACTIVITY_META[a.type].label}</span>
                        <span className="tabular-nums text-zinc-400">{formatTime(a.timestamp)}</span>
                        <span className="text-amber-300">+{a.points}</span>
                        {a.requiredForNext && <span className="text-rose-300" title="Required">•</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="p-4 text-xs text-zinc-500">
        <p className="font-semibold text-zinc-400">Teacher notes</p>
        <p className="mt-1">{lesson.settings.teacherNotes}</p>
        <p className="mt-2 font-semibold text-zinc-400">Homework</p>
        <p className="mt-1">{lesson.settings.homeworkChecklist}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vocabulary panel                                                    */
/* ------------------------------------------------------------------ */

export function VocabPanel({ track, savedWords, onSave, episodeId }: { track?: TrackData; savedWords: Set<string>; onSave: (word: string, ctx: WordContext) => Promise<void>; episodeId: string }) {
  const active = useActiveCue(track?.cues);
  const cue = active >= 0 ? track!.cues[active] : null;
  const [busy, setBusy] = useState<string | null>(null);
  const words = useMemo(() => {
    if (!cue) return [];
    const seen = new Set<string>();
    return cue.words
      .map((w, wi) => ({ raw: w.text, clean: w.text.toLowerCase().replace(/[^\p{L}'-]/gu, ""), wi, time: w.startTime }))
      .filter((w) => w.clean.length >= 3 && !seen.has(w.clean) && seen.add(w.clean));
  }, [cue]);
  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Words in the current line</h3>
      {cue ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {words.map((w) => {
            const saved = savedWords.has(w.clean);
            return (
              <button
                key={w.clean}
                type="button"
                disabled={saved || busy === w.clean}
                onClick={async () => {
                  setBusy(w.clean);
                  await onSave(w.raw, { cueId: cue.id, cueIndex: cue.index, word: w.raw, wordIndex: w.wi, time: w.time, sentence: cue.text });
                  setBusy(null);
                }}
                className={cx("inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm", saved ? "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200" : "border-white/10 bg-white/5 text-white hover:bg-white/10")}
              >
                {saved ? <Check size={12} /> : <BookmarkPlus size={12} />} {w.clean}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Play the video — words from each line appear here for one-tap saving.</p>
      )}
      <h3 className="mt-6 text-xs font-bold uppercase tracking-widest text-zinc-400">Your vocabulary ({savedWords.size})</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Array.from(savedWords)
          .slice(0, 60)
          .map((w) => (
            <span key={w} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-zinc-200">
              {w}
            </span>
          ))}
      </div>
      <Link href={`/vocabulary?episode=${episodeId}`} className="mt-4 inline-block text-xs font-semibold text-violet-300 hover:underline">
        Open vocabulary trainer →
      </Link>
    </div>
  );
}
