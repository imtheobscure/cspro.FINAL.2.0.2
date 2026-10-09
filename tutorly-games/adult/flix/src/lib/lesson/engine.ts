/**
 * Lesson engine — turns `Lesson` JSON plus the player clock into what the
 * learner sees: the activity to run NOW, whether their answer was right, how
 * many points it earned, and how the video should behave afterwards.
 *
 * Pure functions only: the player owns the clock, the store owns progress, this
 * file owns the rules. That is what makes activities testable without a browser.
 */

import type {
  Activity,
  ActivityOption,
  Lesson,
  LearnerProfile,
} from "../../types";

/* ─────────────────────────────── scheduling ─────────────────────────────── */

export function segmentAt(lesson: Lesson | null, time: number) {
  if (!lesson) return null;
  return (
    lesson.segments.find((segment) => time >= segment.startTime && time < segment.endTime) ??
    (time >= (lesson.segments.at(-1)?.endTime ?? 0) ? lesson.segments.at(-1) ?? null : null)
  );
}

export function segmentIndexAt(lesson: Lesson | null, time: number): number {
  if (!lesson) return -1;
  const index = lesson.segments.findIndex((s) => time >= s.startTime && time < s.endTime);
  return index === -1 ? (time >= (lesson.segments.at(-1)?.endTime ?? 0) ? lesson.segments.length - 1 : 0) : index;
}

/** Activities whose timestamp has passed but which are not done yet. */
export function dueActivities(lesson: Lesson | null, time: number, completed: Set<string>, lookBackSeconds = 600): Activity[] {
  if (!lesson) return [];
  return lesson.segments
    .flatMap((segment) => segment.activities)
    .filter((activity) => !completed.has(activity.id) && activity.timestamp <= time && activity.timestamp >= time - lookBackSeconds)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** The single activity the player should open next (earliest due). */
export function nextDueActivity(lesson: Lesson | null, time: number, completed: Set<string>): Activity | null {
  return dueActivities(lesson, time, completed)[0] ?? null;
}

export function upcomingActivities(lesson: Lesson | null, time: number, limit = 5): Activity[] {
  if (!lesson) return [];
  return lesson.segments
    .flatMap((segment) => segment.activities)
    .filter((activity) => activity.timestamp > time)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(0, limit);
}

export function activitiesInRange(lesson: Lesson | null, start: number, end: number): Activity[] {
  if (!lesson) return [];
  return lesson.segments
    .flatMap((segment) => segment.activities)
    .filter((activity) => activity.timestamp >= start && activity.timestamp <= end)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/* ─────────────────────────────── evaluation ─────────────────────────────── */

export interface Evaluation {
  correct: boolean;
  /** What the learner should have answered, rendered for the feedback panel. */
  expected: string;
  /** Their answer, echoed back. */
  given: string;
  /** True when the activity is not scored (reflection, discussion, videoPause). */
  unscored: boolean;
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const correctOption = (options: ActivityOption[] = []) => options.find((option) => option.isCorrect);

export function evaluateActivity(activity: Activity, answer: unknown): Evaluation {
  const content = activity.content;
  const givenLabel = (() => {
    if (typeof answer === "string") {
      const match = content.options?.find((o) => o.id === answer);
      return match?.text ?? answer;
    }
    if (Array.isArray(answer)) return answer.join(", ");
    if (typeof answer === "boolean") return answer ? "True" : "False";
    if (answer && typeof answer === "object") return Object.entries(answer as Record<string, string>).map(([k, v]) => `${k} → ${v}`).join(", ");
    return "—";
  })();

  switch (activity.type) {
    case "multipleChoice":
    case "hotspot": {
      const options = activity.type === "hotspot" ? content.hotspot?.options ?? [] : content.options ?? [];
      const right = correctOption(options);
      return { correct: right?.id === answer, expected: right?.text ?? "—", given: givenLabel, unscored: !right };
    }
    case "trueFalse": {
      const right = content.answer === true;
      return { correct: answer === right, expected: right ? "True" : "False", given: givenLabel, unscored: typeof content.answer !== "boolean" };
    }
    case "fillBlanks": {
      const blanks = (content.blanks ?? []).map(normalise);
      const given = (Array.isArray(answer) ? answer : [String(answer ?? "")]).map(normalise);
      const correct = blanks.length > 0 && blanks.every((blank, i) => given[i] === blank);
      return { correct, expected: (content.blanks ?? []).join(" / "), given: givenLabel, unscored: !blanks.length };
    }
    case "matching": {
      const pairs = content.pairs ?? [];
      const given = (answer ?? {}) as Record<string, string>;
      const correct = pairs.length > 0 && pairs.every((pair) => normalise(given[pair.left] ?? "") === normalise(pair.right));
      return { correct, expected: pairs.map((p) => `${p.left} → ${p.right}`).join("; "), given: givenLabel, unscored: !pairs.length };
    }
    case "ordering": {
      const right = content.orderedItems ?? [];
      const given = Array.isArray(answer) ? answer.map(String) : [];
      const correct = right.length > 0 && right.every((item, i) => normalise(given[i] ?? "") === normalise(item));
      return { correct, expected: right.join(" → "), given: given.join(" → ") || "—", unscored: !right.length };
    }
    case "wordScramble": {
      const right = content.correctWord ?? "";
      return { correct: normalise(String(answer ?? "")) === normalise(right), expected: right, given: givenLabel, unscored: !right };
    }
    case "speaking": {
      const target = content.expectedSentence ?? "";
      const said = normalise(String(answer ?? ""));
      const targetWords = normalise(target).split(" ").filter((w) => w.length > 3);
      const hits = targetWords.filter((word) => said.includes(word));
      const ratio = targetWords.length ? hits.length / targetWords.length : 0;
      return {
        correct: ratio >= 0.7,
        expected: target,
        given: said || "(nothing recorded)",
        unscored: !target,
      };
    }
    case "dragDrop": {
      const items = content.items ?? [];
      const targets = content.targets ?? [];
      const given = (answer ?? {}) as Record<string, string>;
      const placed = Object.keys(given).length;
      const correct = placed >= Math.max(1, Math.min(items.length, targets.length)) && items.every((item, i) => normalise(given[item] ?? "") === normalise(targets[i] ?? ""));
      return { correct, expected: items.map((item, i) => `${item} → ${targets[i] ?? "?"}`).join("; "), given: givenLabel, unscored: !items.length };
    }
    case "readingChallenge": {
      const questions = content.reading?.questions ?? [];
      const given = Array.isArray(answer) ? answer.map(String) : [];
      const correct = questions.length > 0 && questions.every((question, i) => correctOption(question.options)?.id === given[i]);
      return {
        correct,
        expected: questions.map((q) => correctOption(q.options)?.text ?? "—").join(" | "),
        given: givenLabel,
        unscored: !questions.length,
      };
    }
    case "listeningComprehension": {
      const questions = content.listening?.questions ?? [];
      const given = Array.isArray(answer) ? answer.map(String) : [];
      const correct = questions.length > 0 && questions.every((question, i) => correctOption(question.options)?.id === given[i]);
      return {
        correct,
        expected: questions.map((q) => correctOption(q.options)?.text ?? "—").join(" | "),
        given: givenLabel,
        unscored: !questions.length,
      };
    }
    default: {
      // flashcard / reflection / discussion / videoPause: completion, not correctness.
      const text = String(answer ?? "").trim();
      return { correct: text.length > 0, expected: "", given: text || "(skipped)", unscored: true };
    }
  }
}

/* ───────────────────────────────── scoring ───────────────────────────────── */

export interface ScoreResult {
  points: number;
  base: number;
  streakBonus: number;
  speedBonus: number;
  message: string;
}

/**
 * Points for one attempt. A correct answer is worth the activity's points, plus
 * a small speed bonus (answered under 25 s) and a streak bonus. A wrong answer
 * on a REQUIRED activity must be retried and pays a retry penalty instead of
 * scoring nothing — a learner who fixes their mistake still learns something.
 */
export function scoreAttempt(input: {
  activity: Activity;
  correct: boolean;
  attempt: number;
  secondsTaken: number;
  streak: number;
}): ScoreResult {
  const { activity, correct, attempt, secondsTaken, streak } = input;
  if (!correct) {
    return { points: 0, base: 0, streakBonus: 0, speedBonus: 0, message: "No points this time — you can try again." };
  }
  const difficultyFactor = activity.difficulty === "hard" ? 1.15 : activity.difficulty === "easy" ? 0.9 : 1;
  const attemptPenalty = Math.max(0.4, 1 - (attempt - 1) * 0.2);
  const base = Math.round(activity.points * difficultyFactor * attemptPenalty);
  const speedBonus = secondsTaken > 0 && secondsTaken < 25 ? Math.round(activity.points * 0.1) : 0;
  const streakBonus = streak >= 3 ? Math.round(activity.points * Math.min(0.25, 0.05 * (streak - 2))) : 0;
  const points = base + speedBonus + streakBonus;
  const message = [base ? `+${base} base` : null, speedBonus ? `+${speedBonus} speed` : null, streakBonus ? `+${streakBonus} ×${streak} streak` : null]
    .filter(Boolean)
    .join(" · ");
  return { points, base, streakBonus, speedBonus, message };
}

export function levelFromXp(xp: number, pointsToLevelUp: number): { level: number; into: number; needed: number; progress: number } {
  const perLevel = Math.max(50, pointsToLevelUp || 500);
  const level = Math.floor(xp / perLevel) + 1;
  const into = xp % perLevel;
  return { level, into, needed: perLevel, progress: into / perLevel };
}

export function progressPercent(lesson: Lesson | null, completed: Set<string>, _time?: number): number {
  if (!lesson) return 0;
  const total = lesson.segments.reduce((n, s) => n + s.activities.length, 0);
  if (!total) return 0;
  return Math.min(100, Math.round((completed.size / total) * 100));
}

/* ─────────────────────────── prompt-side helpers ─────────────────────────── */

/** Learner block the AI prompt and the personalised examples both use. */
export function describeLearner(learner: LearnerProfile | undefined): string {
  if (!learner) return "No learner profile yet — write for a mixed-level adult class.";
  return [
    `Name: ${learner.name || "Student"}`,
    `CEFR: ${learner.level || "B1"}`,
    `L1: ${learner.nativeLanguage || "unspecified"}`,
    learner.goals ? `Goals: ${learner.goals}` : null,
    learner.interests ? `Interests: ${learner.interests}` : null,
    learner.facts ? `Facts to personalise with: ${learner.facts}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
