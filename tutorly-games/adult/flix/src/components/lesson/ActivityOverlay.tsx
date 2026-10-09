import React, { useEffect, useMemo, useState } from "react";
import type { Activity } from "../../types";
import { evaluateActivity, scoreAttempt, type Evaluation } from "../../lib/lesson/engine";
import { ACTIVITY_TYPES_ORDERED } from "../../lib/ai/prompt";
import { useLessonStore } from "../../store/lesson";
import { events } from "../../lib/events";
import { useProfileStore } from "../../store/profile";
import { Button, Chip, ProgressBar } from "../ui";
import { ActivityBody } from "./activities";

export interface ActivityResult {
  activityId: string;
  correct: boolean;
  points: number;
  attempts: number;
}

const UNSCORED: Activity["type"][] = ["flashcard", "reflection", "discussion", "videoPause"];

/**
 * The activity overlay.
 *
 * Behaviour that matters in a classroom:
 *  • the video is already paused by the player before this opens (the overlay
 *    never fights the media element for control);
 *  • a WRONG answer on a `requiredForNext` activity invites one retry, and after
 *    two attempts the comprehensive explanation is shown so nobody is stuck —
 *    the lesson continues, the learner still learns;
 *  • every scored attempt goes through the lesson store, which is where XP,
 *    streaks and the persisted log live.
 */
export const ActivityOverlay: React.FC<{
  activity: Activity;
  index: number;
  total: number;
  /** Why the video stopped (shown to the learner, and restored on close). */
  pausedByActivity: boolean;
  onClose: (result: ActivityResult) => void;
  speak?: (text: string, rate?: number) => void;
  onSeek?: (time: number) => void;
}> = ({ activity, index, total, pausedByActivity, onClose, speak, onSeek }) => {
  const unscored = UNSCORED.includes(activity.type);

  const [value, setValue] = useState<unknown>(() => (unscored ? "" : activity.content.blanks ? new Array(activity.content.blanks.length).fill("") : null));
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [awarded, setAwarded] = useState<{ points: number; message: string } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const startedAt = useMemo(() => Date.now(), [activity.id]);

  const recordAttempt = useLessonStore((s) => s.recordAttempt);
  const addJournal = useLessonStore((s) => s.addJournal);
  const streak = useLessonStore((s) => s.streak);
  const learnerName = useProfileStore((s) => s.name);

  useEffect(() => {
    setValue(unscored ? "" : activity.content.blanks ? new Array(activity.content.blanks.length).fill("") : null);
    setEvaluation(null);
    setAttempts(0);
    setAwarded(null);
  }, [activity.id, unscored, activity.content.blanks]);

  const canCheck = unscored ? true : value !== null && !(Array.isArray(value) && value.every((v) => !v)) && String(value).trim().length > 0;

  const check = () => {
    const secondsTaken = Math.round((Date.now() - startedAt) / 1000);
    const result = evaluateActivity(activity, value);
    const attempt = attempts + 1;
    setAttempts(attempt);
    setEvaluation(result);

    const recorded = recordAttempt({ activity, evaluation: result, secondsTaken });

    if (result.unscored && activity.type === "reflection") {
      addJournal({ activityId: activity.id, prompt: activity.content.reflectionPrompt ?? activity.title, answer: String(value ?? "") });
    }
    if (activity.type === "discussion" || activity.type === "videoPause") {
      addJournal({ activityId: activity.id, prompt: activity.content.discussionPrompt ?? activity.content.videoPausePrompt ?? activity.title, answer: String(value ?? "") });
    }

    setAwarded({ points: recorded.result.points, message: recorded.result.message });
    events.emit("lesson:activity-answered", {
      activityId: activity.id,
      type: activity.type,
      correct: result.correct,
      attempts: attempt,
      points: recorded.result.points,
      unscored: result.unscored,
    });
  };

  const showComprehensive = !!evaluation && (evaluation.correct || attempts >= 2 || unscored);
  const blocked = !!evaluation && !evaluation.correct && !unscored && activity.requiredForNext && attempts < 2;

  /** The 1.15× difficulty/streak bonus is estimated for the button label only. */
  const potential = useMemo(
    () => (unscored ? 0 : scoreAttempt({ activity, correct: true, attempt: 1, secondsTaken: 12, streak }).points),
    [activity, streak, unscored],
  );

  return (
    <div className="tf-fixed-frame" style={{ background: "rgba(4,5,8,0.72)", backdropFilter: "blur(5px)", zIndex: 80 }}>
      <div
        className="tf-pop flex w-full flex-col overflow-hidden rounded-3xl border"
        style={{ maxWidth: 900, maxHeight: "94vh", background: "var(--color-tf-panel)", borderColor: "var(--color-tf-line)" }}
      >
        <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: "var(--color-tf-line)" }}>
          <Chip tone="muted">
            {index + 1} / {total} activities
          </Chip>
          <Chip tone="muted">{activity.difficulty}</Chip>
          {pausedByActivity && <Chip tone="gold">⏸ video paused here</Chip>}
          {!unscored && <Chip tone="brand">up to +{potential} XP</Chip>}
          {streak >= 3 && <Chip tone="gold">🔥 {streak} streak</Chip>}
          <div className="ml-auto flex items-center gap-2">
            {activity.lessonContent && (
              <Button size="sm" kind="ghost" onClick={() => setNotesOpen((v) => !v)}>
                {notesOpen ? "Hide notes" : "💡 Lesson notes"}
              </Button>
            )}
            <Button size="sm" kind="ghost" onClick={() => onClose({ activityId: activity.id, correct: evaluation?.correct ?? false, points: awarded?.points ?? 0, attempts })}>
              Close
            </Button>
          </div>
        </div>

        <div className="tf-scroll flex-1 overflow-y-auto px-4 py-3.5">
          {notesOpen && activity.lessonContent && (
            <div className="mb-3 grid gap-2 rounded-2xl border p-3 text-[13px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
              {activity.lessonContent.warmUp && <div>🔥 <b>Warm-up:</b> {activity.lessonContent.warmUp}</div>}
              {activity.lessonContent.form && <div>🧱 <b>Form:</b> {activity.lessonContent.form}</div>}
              {activity.lessonContent.meaning && <div>💡 <b>Meaning:</b> {activity.lessonContent.meaning}</div>}
              {activity.lessonContent.use && <div>🎯 <b>Use:</b> {activity.lessonContent.use}</div>}
              {activity.lessonContent.personalizedExamples?.length ? (
                <div>
                  ✨ <b>For {learnerName || "you"}:</b>
                  <ul className="ml-5 list-disc">
                    {activity.lessonContent.personalizedExamples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activity.lessonContent.lifeApplication && <div>🌍 <b>Life application:</b> {activity.lessonContent.lifeApplication}</div>}
            </div>
          )}

          <ActivityBody activity={activity} value={value} onChange={setValue} revealed={!!evaluation} evaluation={evaluation} speak={speak} onSeek={onSeek} />

          {evaluation && (
            <div className="mt-3 space-y-2">
              <div
                className="rounded-2xl border p-3 text-sm font-bold"
                style={{
                  borderColor: evaluation.correct ? "var(--color-tf-green)" : unscored ? "var(--color-tf-line)" : "#7f1d1d",
                  background: evaluation.correct
                    ? "color-mix(in srgb, var(--color-tf-green) 12%, transparent)"
                    : unscored
                      ? "var(--color-tf-panel-2)"
                      : "color-mix(in srgb, #e5484d 12%, transparent)",
                }}
              >
                {unscored ? "📝 Saved" : evaluation.correct ? "✅ Correct" : "❌ Not yet"}
                {awarded?.points ? <span style={{ color: "var(--color-tf-gold)" }}> · +{awarded.points} XP</span> : null}
                {awarded?.message ? <span className="font-semibold" style={{ color: "var(--color-tf-sub)" }}> · {awarded.message}</span> : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {evaluation.correct && activity.correctFeedback && (
                  <div className="rounded-xl border p-2.5 text-[13px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                    <b style={{ color: "var(--color-tf-green)" }}>Why it is right:</b> {activity.correctFeedback}
                  </div>
                )}
                {!evaluation.correct && activity.incorrectFeedback && (
                  <div className="rounded-xl border p-2.5 text-[13px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                    <b style={{ color: "#ff8a8a" }}>Why that is tempting:</b> {activity.incorrectFeedback}
                  </div>
                )}
                {evaluation.expected && !evaluation.correct && (
                  <div className="rounded-xl border p-2.5 text-[13px]" style={{ borderColor: "var(--color-tf-line)", background: "var(--color-tf-panel-2)" }}>
                    <b style={{ color: "var(--color-tf-gold)" }}>Expected:</b> {evaluation.expected}
                  </div>
                )}
              </div>

              {showComprehensive && activity.comprehensiveFeedback && (
                <div className="rounded-2xl border p-3 text-[13px] leading-relaxed" style={{ borderColor: "color-mix(in srgb, var(--color-tf-gold) 45%, transparent)", background: "color-mix(in srgb, var(--color-tf-gold) 8%, transparent)" }}>
                  <div className="mb-1 text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--color-tf-gold)" }}>
                    🧠 The deep explanation
                  </div>
                  {activity.comprehensiveFeedback}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3" style={{ borderColor: "var(--color-tf-line)" }}>
          <div className="mb-2">
            <ProgressBar value={index + (evaluation ? 1 : 0)} max={total} height={5} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!evaluation && (
              <Button kind="primary" size="lg" onClick={check} disabled={!canCheck}>
                {unscored ? "Save & continue" : "Check answer ✓"}
              </Button>
            )}
            {blocked && (
              <Button kind="primary" onClick={() => setEvaluation(null)}>
                🔁 Try again
              </Button>
            )}
            {evaluation && !blocked && (
              <Button kind="success" size="lg" onClick={() => onClose({ activityId: activity.id, correct: evaluation.correct, points: awarded?.points ?? 0, attempts })}>
                {pausedByActivity ? "▶ Continue watching" : "Continue →"}
              </Button>
            )}
            {evaluation && !evaluation.correct && !unscored && !blocked && (
              <Button onClick={() => setEvaluation(null)}>🔁 Try once more</Button>
            )}
            <div className="ml-auto text-[11px] font-bold" style={{ color: "var(--color-tf-sub)" }}>
              attempt {Math.max(1, attempts)} · {ACTIVITY_TYPES_ORDERED.includes(activity.type) ? activity.type : "activity"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
