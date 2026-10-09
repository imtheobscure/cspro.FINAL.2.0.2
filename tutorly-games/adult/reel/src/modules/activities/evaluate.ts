import type { Activity } from "@/modules/lessons/types";

export type EvaluationResult = {
  correct: boolean | null; // null = not objectively scorable (participation)
  score: number; // 0..1
  detail?: string;
};

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarity(a: string, b: string): number {
  const wa = normalizeText(a).split(" ").filter(Boolean);
  const wb = normalizeText(b).split(" ").filter(Boolean);
  if (!wa.length || !wb.length) return 0;
  const setB = new Map<string, number>();
  for (const w of wb) setB.set(w, (setB.get(w) ?? 0) + 1);
  let hits = 0;
  for (const w of wa) {
    const c = setB.get(w) ?? 0;
    if (c > 0) {
      hits++;
      setB.set(w, c - 1);
    }
  }
  return (2 * hits) / (wa.length + wb.length);
}

function questionSetScore(
  questions: { id: string; options: { id: string; isCorrect: boolean }[] }[],
  answer: Record<string, string>,
): EvaluationResult {
  let correct = 0;
  for (const q of questions) {
    const chosen = answer?.[q.id];
    if (chosen && q.options.find((o) => o.id === chosen)?.isCorrect) correct++;
  }
  const score = questions.length ? correct / questions.length : 0;
  return { correct: score >= 0.999, score, detail: `${correct}/${questions.length} correct` };
}

/**
 * Evaluate a learner answer against an activity definition.
 * Answer shapes are documented per type in the activity components.
 */
export function evaluateAnswer(activity: Activity, answer: unknown): EvaluationResult {
  switch (activity.type) {
    case "multipleChoice": {
      const ok = activity.content.options.find((o) => o.id === answer)?.isCorrect ?? false;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "trueFalse": {
      const ok = answer === activity.content.answer;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "fillBlanks": {
      const given = Array.isArray(answer) ? (answer as string[]) : [];
      const expected = activity.content.blanks;
      const hits = expected.filter((e, i) => normalizeText(e) === normalizeText(given[i] ?? "")).length;
      const score = hits / expected.length;
      return { correct: score === 1, score, detail: `${hits}/${expected.length} blanks` };
    }
    case "dragDrop": {
      const map = (answer ?? {}) as Record<string, string>;
      const hits = activity.content.pairs.filter((p) => map[p.itemId] === p.targetId).length;
      const score = hits / activity.content.pairs.length;
      return { correct: score === 1, score, detail: `${hits}/${activity.content.pairs.length} placed correctly` };
    }
    case "matching": {
      const map = (answer ?? {}) as Record<string, string>;
      const hits = activity.content.pairs.filter((p) => map[p.left] === p.right).length;
      const score = hits / activity.content.pairs.length;
      return { correct: score === 1, score, detail: `${hits}/${activity.content.pairs.length} matched` };
    }
    case "ordering": {
      const given = Array.isArray(answer) ? (answer as string[]) : [];
      const expected = activity.content.orderedItems;
      const hits = expected.filter((e, i) => given[i] === e).length;
      const score = hits / expected.length;
      return { correct: score === 1, score, detail: `${hits}/${expected.length} in position` };
    }
    case "wordScramble": {
      const ok = normalizeText(String(answer ?? "")) === normalizeText(activity.content.correctWord);
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "speaking": {
      const transcript = String((answer as { transcript?: string })?.transcript ?? "");
      const sim = similarity(transcript, activity.content.expectedSentence);
      return { correct: sim >= 0.7, score: sim, detail: `${Math.round(sim * 100)}% match` };
    }
    case "predictNext": {
      const opts = activity.content.predictOptions;
      const hasKey = opts.some((o) => o.isCorrect);
      const idx = typeof answer === "number" ? answer : -1;
      if (!hasKey) return { correct: null, score: idx >= 0 ? 1 : 0 };
      const ok = opts[idx]?.isCorrect ?? false;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "hotspot": {
      const ok = activity.content.hotspot.options.find((o) => o.id === answer)?.isCorrect ?? false;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "readingChallenge":
      return questionSetScore(activity.content.reading.questions, (answer ?? {}) as Record<string, string>);
    case "listeningComprehension":
      return questionSetScore(activity.content.listening.questions, (answer ?? {}) as Record<string, string>);
    case "flashcard":
    case "truthOrDare":
    case "wouldYouRather":
    case "discussion":
    case "voiceOver":
    case "reflection":
    case "videoPause": {
      const text = typeof answer === "string" ? answer : JSON.stringify(answer ?? "");
      return { correct: null, score: text.trim().length > 0 ? 1 : 0.5 };
    }
    default:
      return { correct: null, score: 0 };
  }
}

/** Points earned for an evaluation. Partial credit for partially correct answers. */
export function pointsFor(activity: Activity, result: EvaluationResult, attemptNumber = 1): number {
  const base = activity.points;
  if (result.correct === null) return Math.round(base * Math.max(0.5, result.score));
  const attemptPenalty = attemptNumber === 1 ? 1 : attemptNumber === 2 ? 0.6 : 0.35;
  if (result.correct) return Math.max(1, Math.round(base * attemptPenalty));
  if (result.score > 0) return Math.max(1, Math.round(base * result.score * 0.5 * attemptPenalty));
  return 0;
}
