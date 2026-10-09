"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { ACTIVITY_META, type Activity, type LessonSegment } from "@/modules/lessons/types";
import type { PlayerController } from "@/modules/player/store";
import { ActivityRenderer } from "@/components/activities/registry";
import { Button, Pill, cx } from "@/components/ui";
import type { AttemptResponse } from "./types";

type Props = {
  activity: Activity;
  segment: LessonSegment;
  result: AttemptResponse | null;
  submitting: boolean;
  allowRetry: boolean;
  sounds: boolean;
  controller: PlayerController;
  onSubmit: (answer: unknown) => void;
  onSkip: () => void;
  onRetry: () => void;
  onContinue: () => void;
  fullscreenMobile: boolean;
};

function playTone(kind: "correct" | "incorrect" | "neutral") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = kind === "correct" ? [523, 659, 784] : kind === "incorrect" ? [330, 262] : [440, 554];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12);
      o.stop(ctx.currentTime + i * 0.12 + 0.3);
    });
  } catch {
    /* audio not available */
  }
}

export function ActivityOverlay({ activity, segment, result, submitting, allowRetry, sounds, controller, onSubmit, onSkip, onRetry, onContinue, fullscreenMobile }: Props) {
  const meta = ACTIVITY_META[activity.type];
  const [hotspotOpen, setHotspotOpen] = useState(activity.type !== "hotspot");
  const [showDeep, setShowDeep] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setHotspotOpen(activity.type !== "hotspot");
    setShowDeep(false);
    setRenderKey((k) => k + 1);
  }, [activity.id, activity.type]);

  useEffect(() => {
    if (!result || !sounds) return;
    playTone(result.correct === null ? "neutral" : result.correct ? "correct" : "incorrect");
  }, [result, sounds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !activity.requiredForNext && !result) onSkip();
      if (e.key === "Enter" && result && (e.target as HTMLElement)?.tagName !== "TEXTAREA") onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activity.requiredForNext, result, onSkip, onContinue]);

  if (!hotspotOpen && activity.type === "hotspot") {
    const { x, y } = activity.content.hotspot;
    return (
      <div className="absolute inset-0 z-30" aria-label="Hotspot activity">
        <button
          type="button"
          onClick={() => setHotspotOpen(true)}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-label="Open hotspot question"
        >
          <span className="absolute inset-0 -m-6 animate-ping rounded-full bg-rose-500/40" />
          <span className="relative grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-rose-500 text-xl shadow-2xl">📍</span>
        </button>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white backdrop-blur">Tap the marker on the scene</div>
      </div>
    );
  }

  const tone = result ? (result.correct === null ? "neutral" : result.correct ? "correct" : "incorrect") : null;

  return (
    <div className={cx("z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6", fullscreenMobile ? "fixed inset-0" : "absolute inset-0")} role="dialog" aria-modal="true" aria-labelledby="activity-title">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#101018] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3" style={{ background: `linear-gradient(90deg, ${activity.color}33, transparent)` }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl text-2xl" style={{ background: `${activity.color}33` }}>
            {activity.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="activity-title" className="truncate font-bold text-white">
              {activity.title}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
              <span>{meta.label}</span>
              <span>·</span>
              <span className="capitalize">{activity.difficulty}</span>
              <span>·</span>
              <span className="font-semibold text-amber-300">+{activity.points} XP</span>
              {activity.requiredForNext && <Pill color="#fb7185">Required</Pill>}
              {activity.kind === "review" && <Pill color="#34d399">Review</Pill>}
              {activity.kind === "bonus" && <Pill color="#fbbf24">Bonus</Pill>}
            </div>
          </div>
          {!activity.requiredForNext && !result && (
            <button type="button" onClick={onSkip} className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Skip activity">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activity.sourceText && (
            <p className="mb-3 text-xs text-zinc-400">
              <span className="uppercase tracking-widest">From the scene:</span> <span className="italic text-zinc-300">“{activity.sourceText}”</span>
            </p>
          )}
          <ActivityRenderer key={renderKey} activity={activity} onSubmit={onSubmit} submitted={!!result || submitting} controller={controller} />
          {submitting && <p className="mt-3 text-center text-xs text-zinc-400">Checking…</p>}

          {result && (
            <div className={cx("mt-5 rounded-2xl border p-4", tone === "correct" && "border-emerald-400/40 bg-emerald-500/10", tone === "incorrect" && "border-rose-400/40 bg-rose-500/10", tone === "neutral" && "border-violet-400/40 bg-violet-500/10")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-base font-bold text-white">{tone === "correct" ? "Correct!" : tone === "incorrect" ? "Not quite" : "Nice work"}</div>
                <div className="flex items-center gap-2 text-sm">
                  {result.detail && <span className="text-zinc-400">{result.detail}</span>}
                  <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 font-bold text-amber-300">+{result.xpEarned} XP</span>
                  {result.correctStreak >= 2 && <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">🔥 {result.correctStreak} streak</span>}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-100">{result.feedback.main}</p>
              <button type="button" onClick={() => setShowDeep((s) => !s)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200">
                <Sparkles size={12} /> {showDeep ? "Hide detailed explanation" : "Show detailed explanation"} {showDeep ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showDeep && <p className="mt-2 whitespace-pre-line rounded-xl bg-black/30 p-3 text-sm leading-relaxed text-zinc-200">{result.feedback.comprehensive}</p>}
              {result.newBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.newBadges.map((b) => (
                    <span key={b.id} className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                      {b.emoji} Badge unlocked: <b>{b.name}</b>
                    </span>
                  ))}
                </div>
              )}
              {result.leveledUp && <p className="mt-2 text-sm font-semibold text-fuchsia-300">⬆️ Level up! You're now level {result.level}.</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <span className="text-xs text-zinc-500">
            {segment.title} · {segment.id}
          </span>
          <div className="flex gap-2">
            {result && tone === "incorrect" && allowRetry && (
              <Button variant="outline" size="sm" type="button" onClick={onRetry}>
                Try again
              </Button>
            )}
            {result && (
              <Button size="sm" type="button" onClick={onContinue} autoFocus>
                Continue ▶
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
