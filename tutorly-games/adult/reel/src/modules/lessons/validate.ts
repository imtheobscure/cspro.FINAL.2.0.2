import { z } from "zod";
import {
  ACTIVITY_TYPES,
  CEFR_LEVELS,
  POINT_RANGES,
  type Activity,
  type VideoLesson,
} from "./types";

/* ------------------------------------------------------------------ */
/* Zod schemas                                                         */
/* ------------------------------------------------------------------ */

const nonEmpty = z.string().trim().min(1);
const option = z.object({ id: nonEmpty, text: nonEmpty, isCorrect: z.boolean() });
const question = z.object({
  id: nonEmpty,
  question: nonEmpty,
  options: z.array(option).min(2).max(5),
  explanation: z.string().optional(),
});

export const contentSchemas = {
  flashcard: z.object({
    cards: z
      .array(
        z.object({
          front: nonEmpty,
          back: nonEmpty,
          pronunciation: z.string().optional(),
          translation: z.string().optional(),
          example: z.string().optional(),
        }),
      )
      .min(1),
  }),
  multipleChoice: z.object({ question: nonEmpty, options: z.array(option).min(3).max(5) }),
  trueFalse: z.object({ question: nonEmpty, answer: z.boolean() }),
  fillBlanks: z.object({
    sentence: z.string().includes("___"),
    blanks: z.array(nonEmpty).min(1),
    hint: z.string().optional(),
    translation: z.string().optional(),
  }),
  dragDrop: z.object({
    items: z.array(z.object({ id: nonEmpty, text: nonEmpty })).min(2),
    targets: z.array(z.object({ id: nonEmpty, label: nonEmpty })).min(2),
    pairs: z.array(z.object({ itemId: nonEmpty, targetId: nonEmpty })).min(2),
  }),
  matching: z.object({ pairs: z.array(z.object({ left: nonEmpty, right: nonEmpty })).min(2) }),
  speaking: z.object({ expectedSentence: nonEmpty, translation: z.string().optional(), tip: z.string().optional() }),
  truthOrDare: z.object({ truth: nonEmpty, dare: nonEmpty }),
  wouldYouRather: z.object({ wouldYouOption1: nonEmpty, wouldYouOption2: nonEmpty }),
  discussion: z.object({ discussionPrompt: nonEmpty, guidingQuestions: z.array(nonEmpty).optional() }),
  predictNext: z.object({
    question: nonEmpty,
    predictOptions: z
      .array(z.object({ text: nonEmpty, consequence: nonEmpty, isCorrect: z.boolean().optional() }))
      .min(2),
  }),
  voiceOver: z.object({
    question: nonEmpty,
    line: nonEmpty,
    startTime: z.number().nonnegative().optional(),
    endTime: z.number().nonnegative().optional(),
  }),
  ordering: z.object({ orderedItems: z.array(nonEmpty).min(3), instruction: z.string().optional() }),
  wordScramble: z.object({ scrambledWord: nonEmpty, correctWord: nonEmpty, hint: z.string().optional() }),
  reflection: z.object({ reflectionPrompt: nonEmpty }),
  hotspot: z.object({
    hotspot: z.object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      question: nonEmpty,
      options: z.array(option).min(2).max(5),
    }),
  }),
  videoPause: z.object({ videoPausePrompt: nonEmpty, modelAnswer: z.string().optional() }),
  readingChallenge: z.object({
    reading: z.object({
      title: nonEmpty,
      genre: z.enum(["fiction", "factual", "whatIf"]),
      text: z.string().min(40),
      translation: z.string().optional(),
      questions: z.array(question).min(1),
    }),
  }),
  listeningComprehension: z.object({
    listening: z.object({
      title: nonEmpty,
      genre: z.enum(["podcast", "dialogue", "talk", "interview", "story"]),
      audioText: z.string().min(20),
      showTranscript: z.boolean(),
      questions: z.array(question).min(1),
    }),
  }),
} as const;

const activityBase = z.object({
  id: z.string().regex(/^seg-\d+-act-\d+$/),
  timestamp: z.number().nonnegative(),
  title: nonEmpty,
  emoji: nonEmpty,
  color: nonEmpty,
  points: z.number().int().min(5).max(25),
  requiredForNext: z.boolean(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  kind: z.enum(["core", "optional", "review", "bonus"]).optional(),
  skill: z.string().optional(),
  behavior: z.enum(["pause", "overlay"]).optional(),
  correctFeedback: z.string().min(10),
  incorrectFeedback: z.string().min(10),
  comprehensiveFeedback: z.string().min(40),
  sourceCueIds: z.array(z.string()).optional(),
  sourceText: z.string().optional(),
  vocabulary: z.array(z.string()).optional(),
  grammar: z.array(z.string()).optional(),
  pronunciation: z.array(z.string()).optional(),
});

export const activitySchema = z.discriminatedUnion(
  "type",
  ACTIVITY_TYPES.map((t) => activityBase.extend({ type: z.literal(t), content: contentSchemas[t] })) as unknown as [
    z.ZodObject<z.ZodRawShape>,
    ...z.ZodObject<z.ZodRawShape>[],
  ],
);

export const segmentSchema = z.object({
  id: z.string().regex(/^seg-\d+$/),
  title: nonEmpty,
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  summary: z.string().optional(),
  focus: z.object({
    grammar: z.array(z.string()),
    vocabulary: z.array(z.string()),
    pronunciation: z.array(z.string()),
  }),
  activities: z.array(activitySchema).min(1),
});

export const lessonSchema = z.object({
  metadata: z.object({
    title: nonEmpty,
    lessonType: nonEmpty,
    targetLanguage: nonEmpty,
    nativeLanguage: nonEmpty,
    cefrLevel: z.enum(CEFR_LEVELS as [string, ...string[]]),
    estimatedDurationSeconds: z.number().nonnegative(),
    videoUrl: z.string().optional(),
    episodeId: z.string().optional(),
    courseId: z.string().optional(),
    seriesId: z.string().optional(),
    seasonId: z.string().optional(),
    generatedBy: z.enum(["manual", "ai", "rules"]).optional(),
    reviewRatio: z.number().min(0).max(1).optional(),
  }),
  globalSettings: z.object({
    pointsToLevelUp: z.number().int().positive(),
    enableStreak: z.boolean(),
    suspenseSounds: z.boolean(),
    allowRetry: z.boolean(),
    showProgress: z.boolean(),
    showXP: z.boolean(),
  }),
  badges: z.array(
    z.object({
      id: nonEmpty,
      name: nonEmpty,
      emoji: nonEmpty,
      rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
      condition: nonEmpty,
      description: nonEmpty,
    }),
  ),
  learnerProfile: z.object({
    cefrLevel: z.enum(CEFR_LEVELS as [string, ...string[]]),
    nativeLanguage: nonEmpty,
    targetLanguage: nonEmpty,
    interests: z.array(z.string()).optional(),
    goals: z.array(z.string()).optional(),
  }),
  objectives: z.array(nonEmpty).min(1),
  segments: z.array(segmentSchema).min(1),
  settings: z.object({
    lessonName: nonEmpty,
    lessonTimeRange: nonEmpty,
    teacherNotes: z.string(),
    homeworkChecklist: z.string(),
    materialLinks: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    lessonImages: z.array(z.string()).optional(),
    lessonVideos: z.array(z.string()).optional(),
    lessonMedia: z.array(z.object({ id: nonEmpty, url: nonEmpty, type: nonEmpty, caption: z.string().optional() })).optional(),
  }),
});

/* ------------------------------------------------------------------ */
/* Pedagogical quality control                                         */
/* ------------------------------------------------------------------ */

export type Issue = { level: "error" | "warning"; path: string; message: string };
export type ValidationResult = { valid: boolean; errors: Issue[]; warnings: Issue[]; lesson?: VideoLesson };

const PLACEHOLDER = /(^|\s)(\.\.\.|…|your answer here|lorem ipsum|placeholder|todo|tbd)(\s|$)/i;
const BANNED_OPTIONS = /^(all|none) of the above/i;

function wordCount(s: string) {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function checkPlaceholders(value: unknown, path: string, out: Issue[]) {
  if (typeof value === "string") {
    if (PLACEHOLDER.test(value) && value.trim().length < 40) out.push({ level: "error", path, message: `Placeholder content: "${value}"` });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkPlaceholders(v, `${path}[${i}]`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) checkPlaceholders(v, `${path}.${k}`, out);
  }
}

function collectChoiceQuestions(activity: Activity): { question: string; options: { text: string; isCorrect: boolean }[] }[] {
  switch (activity.type) {
    case "multipleChoice":
      return [activity.content];
    case "hotspot":
      return [{ question: activity.content.hotspot.question, options: activity.content.hotspot.options }];
    case "readingChallenge":
      return activity.content.reading.questions;
    case "listeningComprehension":
      return activity.content.listening.questions;
    default:
      return [];
  }
}

export function validateLesson(input: unknown, opts: { videoDuration?: number } = {}): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ level: "error", path: issue.path.join("."), message: issue.message });
    }
    return { valid: false, errors, warnings };
  }
  const lesson = parsed.data as unknown as VideoLesson;

  checkPlaceholders(lesson.segments, "segments", errors);

  const seenIds = new Set<string>();
  const typeSequence: string[] = [];
  const correctPositions: number[] = [];
  let mcCount = 0;
  let longestIsCorrect = 0;

  lesson.segments.forEach((seg, si) => {
    const sp = `segments[${si}]`;
    if (seenIds.has(seg.id)) errors.push({ level: "error", path: sp, message: `Duplicate id ${seg.id}` });
    seenIds.add(seg.id);
    if (seg.endTime <= seg.startTime) errors.push({ level: "error", path: sp, message: "Segment endTime must be after startTime" });
    if (si > 0 && seg.startTime < lesson.segments[si - 1].endTime - 0.5) {
      errors.push({ level: "error", path: sp, message: "Segments overlap or are not in chronological order" });
    }
    if (opts.videoDuration && seg.endTime > opts.videoDuration + 5) {
      errors.push({ level: "error", path: sp, message: `Segment ends after the video (${opts.videoDuration}s)` });
    }
    if (!seg.focus.grammar.length && !seg.focus.vocabulary.length && !seg.focus.pronunciation.length) {
      warnings.push({ level: "warning", path: sp, message: "Segment has no focus metadata" });
    }

    seg.activities.forEach((act, ai) => {
      const ap = `${sp}.activities[${ai}]`;
      if (seenIds.has(act.id)) errors.push({ level: "error", path: ap, message: `Duplicate id ${act.id}` });
      seenIds.add(act.id);
      if (!act.id.startsWith(`${seg.id}-act-`)) errors.push({ level: "error", path: ap, message: `Activity id ${act.id} does not belong to ${seg.id}` });
      if (act.timestamp < seg.startTime || act.timestamp > seg.endTime) {
        errors.push({ level: "error", path: ap, message: `Activity timestamp ${act.timestamp} is outside its segment (${seg.startTime}-${seg.endTime})` });
      }
      const [min, max] = POINT_RANGES[act.difficulty];
      if (act.points < min || act.points > max) {
        warnings.push({ level: "warning", path: ap, message: `Points ${act.points} outside the ${act.difficulty} range ${min}-${max}` });
      }
      if (act.comprehensiveFeedback.length < act.correctFeedback.length) {
        warnings.push({ level: "warning", path: ap, message: "comprehensiveFeedback should be more detailed than correctFeedback" });
      }
      typeSequence.push(act.type);

      for (const q of collectChoiceQuestions(act)) {
        mcCount++;
        const correct = q.options.filter((o) => o.isCorrect);
        if (correct.length !== 1) errors.push({ level: "error", path: ap, message: "Exactly one option must be correct" });
        if (q.options.some((o) => BANNED_OPTIONS.test(o.text))) errors.push({ level: "error", path: ap, message: '"All/None of the above" is not allowed' });
        const texts = q.options.map((o) => o.text.trim().toLowerCase());
        if (new Set(texts).size !== texts.length) errors.push({ level: "error", path: ap, message: "Duplicate options" });
        if (correct[0] && q.question.toLowerCase().includes(correct[0].text.toLowerCase()) && correct[0].text.length > 3) {
          errors.push({ level: "error", path: ap, message: "The correct answer is exposed inside the question" });
        }
        const lengths = q.options.map((o) => wordCount(o.text));
        const maxLen = Math.max(...lengths);
        const minLen = Math.min(...lengths);
        if (maxLen - minLen > 3) warnings.push({ level: "warning", path: ap, message: "Option lengths differ by more than ~2 words" });
        const idx = q.options.findIndex((o) => o.isCorrect);
        correctPositions.push(idx);
        if (correct[0] && wordCount(correct[0].text) === maxLen && lengths.filter((l) => l === maxLen).length === 1) longestIsCorrect++;
      }

      if (act.type === "fillBlanks") {
        const blanksInSentence = (act.content.sentence.match(/___/g) ?? []).length;
        if (blanksInSentence !== act.content.blanks.length) errors.push({ level: "error", path: ap, message: "Number of ___ does not match blanks" });
      }
      if (act.type === "dragDrop") {
        const itemIds = new Set(act.content.items.map((i) => i.id));
        const targetIds = new Set(act.content.targets.map((t) => t.id));
        for (const p of act.content.pairs) {
          if (!itemIds.has(p.itemId) || !targetIds.has(p.targetId)) errors.push({ level: "error", path: ap, message: "dragDrop pair references unknown item/target" });
        }
      }
      if (act.type === "wordScramble") {
        const a = act.content.scrambledWord.toLowerCase().split("").sort().join("");
        const b = act.content.correctWord.toLowerCase().split("").sort().join("");
        if (a !== b) errors.push({ level: "error", path: ap, message: "scrambledWord is not an anagram of correctWord" });
        if (act.content.scrambledWord.toLowerCase() === act.content.correctWord.toLowerCase()) errors.push({ level: "error", path: ap, message: "scrambledWord equals correctWord" });
      }
    });
  });

  for (let i = 1; i < typeSequence.length; i++) {
    if (typeSequence[i] === typeSequence[i - 1]) warnings.push({ level: "warning", path: "segments", message: `Activity type "${typeSequence[i]}" used twice consecutively` });
  }
  const distinct = new Set(typeSequence).size;
  if (lesson.segments.length >= 8 && distinct < 10) warnings.push({ level: "warning", path: "segments", message: `Only ${distinct} distinct activity types (target ≥10)` });
  if (lesson.segments.length < 8 || lesson.segments.length > 16) warnings.push({ level: "warning", path: "segments", message: `${lesson.segments.length} segments (recommended 8-16 for a full video lesson)` });

  if (mcCount >= 4) {
    const counts = new Map<number, number>();
    for (const p of correctPositions) counts.set(p, (counts.get(p) ?? 0) + 1);
    for (const [pos, c] of counts) {
      if (c / mcCount > 0.6) errors.push({ level: "error", path: "segments", message: `Correct answers occupy position ${pos + 1} in ${Math.round((c / mcCount) * 100)}% of choice questions` });
    }
    if (longestIsCorrect / mcCount > 0.6) errors.push({ level: "error", path: "segments", message: "The longest option is the correct answer too often" });
  }

  return { valid: errors.length === 0, errors, warnings, lesson };
}

/** Attempt a controlled repair of common LLM output problems before validation. */
export function repairLessonJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first > 0 || last < text.length - 1) text = text.slice(first, last + 1);
  text = text.replace(/,\s*([}\]])/g, "$1");
  return JSON.parse(text);
}
