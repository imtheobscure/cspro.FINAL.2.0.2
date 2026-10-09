import React from "react";
import type { Activity, Lesson } from "../../types";
import { formatClock } from "../../lib/subtitles";
import { progressPercent } from "../../lib/lesson/engine";
import { useLearnerLevel, useLessonStore } from "../../store/lesson";
import { Button, Chip, ProgressBar } from "../ui";
import { ACTIVITY_ACCENT } from "./activities";

/**
 * The lesson rail: what this episode teaches, where each activity sits on the
 * timeline, what is done, and what the learner has earned. Every row is a
 * button — clicking an activity seeks to its moment and opens it (review mode
 * once it is complete).
 */
export const LessonPanel: React.FC<{
  lesson: Lesson | null;
  time: number;
  onOpenActivity: (activity: Activity, options?: { review?: boolean }) => void;
  onSeek: (time: number) => void;
}> = ({ lesson, time, onOpenActivity, onSeek }) => {
  const completed = useLessonStore((s) => s.completed);
  const attempts = useLessonStore((s) => s.attempts);
  const journal = useLessonStore((s) => s.journal);
  const badges = useLessonStore((s) => s.badges);
  const xp = useLessonStore((s) => s.xp);
  const streak = useLessonStore((s) => s.streak);
  const reset = useLessonStore((s) => s.reset);
  const level = useLearnerLevel();

  if (!lesson) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="text-4xl">🎓</div>
        <div className="font-black">No lesson attached to this episode</div>
        <p className="max-w-sm text-sm" style={{ color: "var(--color-tf-sub)" }}>
          Open the <b>AI Lesson Maker</b> tab, copy the prompt (it already contains this video's subtitles), paste the JSON the AI returns, and the
          activities appear here on the timeline.
        </p>
      </div>
    );
  }

  const all = lesson.segments.flatMap((segment) => segment.activities);
  const doneSet = new Set(completed);

  return (
    <div className="tf-scroll min-h-0 flex-1 overflow-y-auto">
      <div className="border-b p-3" style={{ borderColor: "var(--color-tf-line)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black">{lesson.metadata.title}</span>
          <Chip tone="brand">{lesson.metadata.cefrLevel}</Chip>
          {lesson.quality && <Chip tone={lesson.quality.score >= 70 ? "teal" : "gold"}>quality {lesson.quality.score}/100</Chip>}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border p-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
              Progress
            </div>
            <ProgressBar value={progressPercent(lesson, doneSet, time)} height={6} />
            <div className="mt-1 text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              {completed.length} / {all.length} activities
            </div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
              Level {level.level}
            </div>
            <ProgressBar value={level.progress * 100} color="var(--color-tf-gold)" height={6} />
            <div className="mt-1 text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              {xp} XP · {level.into}/{level.needed} to next
            </div>
          </div>
          <div className="rounded-xl border p-2" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
            <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
              Streak
            </div>
            <div className="text-lg font-black">{streak >= 3 ? `🔥 ${streak}` : streak}</div>
            <div className="text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              {badges.length}/{lesson.badges.length} badges
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {lesson.badges.map((badge) => (
            <Chip key={badge.id} tone={badges.includes(badge.id) ? "gold" : "muted"} active={badges.includes(badge.id)}>
              {badge.emoji} {badge.name}
            </Chip>
          ))}
          {!!journal.length && <Chip tone="purple">📓 {journal.length} journal entries</Chip>}
          <Button size="sm" kind="ghost" className="ml-auto" onClick={reset} title="Clear XP, streaks and completed activities for this device">
            Reset progress
          </Button>
        </div>
      </div>

      <div className="p-2">
        {lesson.segments.map((segment, index) => {
          const isNow = time >= segment.startTime && time < segment.endTime;
          return (
            <div key={segment.id} className="mb-2 rounded-xl border" style={{ borderColor: isNow ? "var(--color-tf-brand)" : "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              <button className="flex w-full items-center gap-2 px-2.5 py-2 text-left" onClick={() => onSeek(segment.startTime)}>
                <span className="grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black" style={{ background: isNow ? "var(--color-tf-brand)" : "var(--color-tf-line)", color: isNow ? "#fff" : "var(--color-tf-sub)" }}>
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-black">{segment.title}</span>
                  <span className="block text-[10.5px] font-bold tabular-nums" style={{ color: "var(--color-tf-sub)" }}>
                    {formatClock(segment.startTime)}–{formatClock(segment.endTime)} · {segment.activities.length} activities
                  </span>
                </span>
                {segment.focus?.grammar?.length ? <Chip tone="muted">{segment.focus.grammar[0]}</Chip> : null}
              </button>

              {segment.activities.length > 0 && (
                <div className="flex flex-col gap-1 px-2.5 pb-2.5">
                  {segment.activities.map((activity) => {
                    const isDone = doneSet.has(activity.id);
                    const attempt = attempts[activity.id];
                    const accent = ACTIVITY_ACCENT[activity.color] ?? "var(--color-tf-brand)";
                    return (
                      <button
                        key={activity.id}
                        onClick={() => onOpenActivity(activity, { review: isDone })}
                        className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left hover:-translate-y-[1px]"
                        style={{
                          borderColor: isDone ? "color-mix(in srgb, var(--color-tf-green) 45%, transparent)" : "var(--color-tf-line)",
                          background: "var(--color-tf-panel)",
                        }}
                      >
                        <span>{activity.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-bold">{activity.title}</span>
                          <span className="block text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--color-tf-sub)" }}>
                            {activity.type} · {activity.difficulty} · {activity.points} pts
                            {attempt ? ` · tried ${attempt.attempts}×` : ""}
                          </span>
                        </span>
                        <span className="text-[10px] font-black tabular-nums" style={{ color: "var(--color-tf-sub)" }}>
                          {formatClock(activity.timestamp)}
                        </span>
                        <span
                          className="grid h-5 w-5 place-items-center rounded-md text-[10px]"
                          style={{ background: isDone ? "var(--color-tf-green)" : "var(--color-tf-line)", color: isDone ? "#052e16" : accent }}
                        >
                          {isDone ? "✓" : "▶"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {journal.length > 0 && (
        <div className="border-t p-3" style={{ borderColor: "var(--color-tf-line)" }}>
          <div className="mb-1.5 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-sub)" }}>
            📓 Reflection journal
          </div>
          <div className="space-y-1.5">
            {journal.slice(-6).reverse().map((entry) => (
              <div key={entry.id} className="rounded-xl border p-2 text-[12.5px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                <div className="font-bold" style={{ color: "var(--color-tf-pink)" }}>
                  {entry.prompt}
                </div>
                <div style={{ color: "var(--color-tf-text)" }}>{entry.answer || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
