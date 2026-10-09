/**
 * Lesson validation — the gate between "the AI returned some JSON" and "the
 * class can run this lesson".
 *
 * Three jobs:
 *   1. SCHEMA   — every activity has the fields the renderer needs, or it is dropped.
 *   2. REPAIR   — missing points/emoji/colour/difficulty get sane values instead
 *                 of failing the whole pack.
 *   3. QUALITY  — the report the teacher reads before class: type coverage,
 *                 difficulty mix, feedback completeness, and the ANTI-GUESSING
 *                 checks (option lengths, position of the correct answer,
 *                 "all of the above" traps, answer distribution).
 */

import type {
  Activity,
  ActivityOption,
  ActivityType,
  Lesson,
  LessonQualityReport,
  Segment,
} from "../../types";

export const ALL_ACTIVITY_TYPES: ActivityType[] = [
  "flashcard",
  "multipleChoice",
  "trueFalse",
  "fillBlanks",
  "dragDrop",
  "matching",
  "speaking",
  "discussion",
  "ordering",
  "wordScramble",
  "reflection",
  "hotspot",
  "videoPause",
  "readingChallenge",
  "listeningComprehension",
];

const COLOR_CYCLE = ["gold", "teal", "purple", "orange", "green", "pink", "blue"] as const;

const EMOJI_BY_TYPE: Record<ActivityType, string> = {
  flashcard: "🃏",
  multipleChoice: "🎯",
  trueFalse: "⚖️",
  fillBlanks: "✏️",
  dragDrop: "🧩",
  matching: "🔗",
  speaking: "🎤",
  discussion: "💬",
  ordering: "🔢",
  wordScramble: "🔤",
  reflection: "🪞",
  hotspot: "📍",
  videoPause: "⏸️",
  readingChallenge: "📖",
  listeningComprehension: "🎧",
};

const POINTS_BY_DIFFICULTY: Record<string, number> = { easy: 35, medium: 60, hard: 90 };

const ANTI_GUESS_BANNED = /^(all of the above|none of the above|both a and b|any of the above)\.?$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const num = (value: unknown, fallback: number): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function normaliseOptions(raw: unknown): ActivityOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option, index) => {
      if (typeof option === "string") {
        return { id: `o${index}`, text: option.trim() } as ActivityOption;
      }
      if (!isRecord(option)) return null;
      const text = str(option.text);
      if (!text) return null;
      return {
        id: str(option.id) || `o${index}`,
        text,
        isCorrect: option.isCorrect === true || option.correct === true,
      } as ActivityOption;
    })
    .filter((option): option is ActivityOption => !!option);
}

/** Does this activity have enough content to actually run? */
function contentProblems(type: ActivityType, content: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const needs = (ok: boolean, what: string) => {
    if (!ok) problems.push(`missing ${what}`);
  };
  switch (type) {
    case "flashcard":
      needs(Array.isArray(content.cards) && content.cards.length >= 1, "cards[]");
      break;
    case "multipleChoice":
      needs(!!str(content.question), "question");
      needs(normaliseOptions(content.options).length >= 2, "2+ options");
      needs(normaliseOptions(content.options).some((o) => o.isCorrect), "a correct option");
      break;
    case "trueFalse":
      needs(!!str(content.question), "question/statement");
      needs(typeof content.answer === "boolean", "answer (true/false)");
      break;
    case "fillBlanks":
      needs(!!str(content.sentence), "sentence");
      needs(Array.isArray(content.blanks) && content.blanks.length >= 1, "blanks[]");
      break;
    case "dragDrop":
      needs(Array.isArray(content.items) && content.items.length >= 2, "items[]");
      needs(Array.isArray(content.targets) && content.targets.length >= 2, "targets[]");
      break;
    case "matching":
      needs(Array.isArray(content.pairs) && content.pairs.length >= 2, "pairs[]");
      break;
    case "speaking":
      needs(!!str(content.expectedSentence), "expectedSentence");
      break;
    case "discussion":
    case "videoPause":
      needs(!!str(content.discussionPrompt ?? content.videoPausePrompt ?? content.question), "prompt");
      break;
    case "ordering":
      needs(Array.isArray(content.orderedItems) && content.orderedItems.length >= 3, "orderedItems[] (3+)");
      break;
    case "wordScramble":
      needs(!!str(content.correctWord ?? content.scrambledWord), "correctWord");
      break;
    case "reflection":
      needs(!!str(content.reflectionPrompt ?? content.question), "reflectionPrompt");
      break;
    case "hotspot":
      needs(isRecord(content.hotspot), "hotspot {x,y,question}");
      break;
    case "readingChallenge":
      needs(isRecord(content.reading) && !!str((content.reading as Record<string, unknown>).text), "reading.text");
      break;
    case "listeningComprehension":
      needs(isRecord(content.listening) && !!str((content.listening as Record<string, unknown>).audioText), "listening.audioText");
      break;
    default:
      break;
  }
  return problems;
}

/* ─────────────────────────────── anti-guessing ─────────────────────────────── */

function guessingWarnings(activities: Activity[]): string[] {
  const warnings: string[] = [];
  let correctFirst = 0;
  let correctLast = 0;
  let counted = 0;

  for (const activity of activities) {
    const options = activity.content.options ?? [];
    if (options.length < 3) continue;

    for (const option of options) {
      if (ANTI_GUESS_BANNED.test(option.text)) {
        warnings.push(`${activity.title}: "${option.text}" is a giveaway option — the AI must avoid it`);
      }
    }

    const lengths = options.map((o) => o.text.length);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);
    if (min > 0 && max / min > 2.4) {
      warnings.push(`${activity.title}: option lengths vary ${min}–${max} chars — the longest option is guessable`);
    }

    const correctIndex = options.findIndex((o) => o.isCorrect);
    if (correctIndex === -1) continue;
    counted += 1;
    if (correctIndex === 0) correctFirst += 1;
    if (correctIndex === options.length - 1) correctLast += 1;
    if (correctIndex === 0 && options[correctIndex].text.length > Math.max(...lengths.slice(1)) * 1.3) {
      warnings.push(`${activity.title}: the correct answer is the longest and first — trivially guessable`);
    }
  }

  if (counted >= 8) {
    if (correctFirst / counted > 0.45) warnings.push(`${Math.round((correctFirst / counted) * 100)}% of answers sit in position 1 — shuffle them`);
    if (correctLast / counted > 0.45) warnings.push(`${Math.round((correctLast / counted) * 100)}% of answers sit in the last position — shuffle them`);
  }
  return warnings;
}

/* ──────────────────────────────── repair ──────────────────────────────── */

function repairActivity(raw: Record<string, unknown>, index: number, segmentStart: number, errors: string[]): Activity | null {
  const type = str(raw.type) as ActivityType;
  if (!ALL_ACTIVITY_TYPES.includes(type)) {
    errors.push(`activity ${index + 1}: unknown type "${str(raw.type)}" — dropped`);
    return null;
  }
  const content = isRecord(raw.content) ? raw.content : {};
  const problems = contentProblems(type, content);
  if (problems.length) {
    errors.push(`${str(raw.title) || `${type} #${index + 1}`}: ${problems.join(", ")} — dropped`);
    return null;
  }

  const difficulty = ["easy", "medium", "hard"].includes(str(raw.difficulty)) ? (str(raw.difficulty) as Activity["difficulty"]) : "medium";
  const options = normaliseOptions(content.options);
  const hasCorrect = options.some((o) => o.isCorrect);

  return {
    id: str(raw.id) || `a${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    timestamp: Math.max(segmentStart, num(raw.timestamp, segmentStart)),
    title: str(raw.title) || `${type} activity`,
    emoji: str(raw.emoji) || EMOJI_BY_TYPE[type],
    color: (COLOR_CYCLE.includes(str(raw.color) as (typeof COLOR_CYCLE)[number]) ? str(raw.color) : COLOR_CYCLE[index % COLOR_CYCLE.length]) as Activity["color"],
    points: Math.max(5, num(raw.points, POINTS_BY_DIFFICULTY[difficulty] ?? 50)),
    difficulty,
    requiredForNext: raw.requiredForNext !== false,
    onReach: str(raw.onReach) === "continue" ? "continue" : "pause",
    durationHintSeconds: num(raw.durationHintSeconds, 0) || undefined,
    lessonContent: isRecord(raw.lessonContent) ? (raw.lessonContent as Activity["lessonContent"]) : undefined,
    audioText: str(raw.audioText) || undefined,
    correctFeedback: str(raw.correctFeedback) || "Correct — nice work.",
    incorrectFeedback: str(raw.incorrectFeedback) || "Not quite — listen to that part again and try once more.",
    comprehensiveFeedback: str(raw.comprehensiveFeedback) || undefined,
    catFeedback: isRecord(raw.catFeedback) ? (raw.catFeedback as Activity["catFeedback"]) : undefined,
    // `contentProblems` already rejected any choice activity without a correct
    // option, so `hasCorrect` is true whenever options survive — never invent an
    // answer key by guessing position, that teaches the wrong word.
    content: { ...content, options: options.length && hasCorrect ? options : undefined },
  };
}

/* ──────────────────────────────── validate ──────────────────────────────── */

export interface ValidationResult {
  lesson: Lesson | null;
  report: LessonQualityReport;
}

export function validateLesson(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(raw)) {
    return {
      lesson: null,
      report: emptyReport(["The pasted JSON is not an object."]),
    };
  }

  const metadataRaw = isRecord(raw.metadata) ? raw.metadata : {};
  const segmentsRaw = Array.isArray(raw.segments) ? raw.segments : [];
  if (!segmentsRaw.length) errors.push('No "segments" array — that is the part the lesson player needs.');

  const segments: Segment[] = segmentsRaw.map((segmentRaw, segmentIndex) => {
    const segment = isRecord(segmentRaw) ? segmentRaw : {};
    const startTime = num(segment.startTime, 0);
    const activitiesRaw = Array.isArray(segment.activities) ? segment.activities : [];
    const activities = activitiesRaw
      .map((activityRaw, activityIndex) => repairActivity(isRecord(activityRaw) ? activityRaw : {}, activityIndex, startTime, errors))
      .filter((activity): activity is Activity => !!activity)
      .sort((a, b) => a.timestamp - b.timestamp);
    return {
      id: str(segment.id) || `s${segmentIndex + 1}`,
      title: str(segment.title) || `Segment ${segmentIndex + 1}`,
      startTime,
      endTime: num(segment.endTime, startTime + 60),
      summary: str(segment.summary) || undefined,
      focus: isRecord(segment.focus) ? (segment.focus as Segment["focus"]) : undefined,
      activities,
    } satisfies Segment;
  });

  // Timestamps must live inside their segment; nudge them in rather than drop.
  for (const segment of segments) {
    for (const activity of segment.activities) {
      if (activity.timestamp < segment.startTime || activity.timestamp > segment.endTime) {
        activity.timestamp = Math.min(Math.max(activity.timestamp, segment.startTime), Math.max(segment.startTime, segment.endTime - 0.5));
      }
    }
  }

  const allActivities = segments.flatMap((s) => s.activities);
  const byType = allActivities.reduce<Partial<Record<ActivityType, number>>>((acc, activity) => {
    acc[activity.type] = (acc[activity.type] ?? 0) + 1;
    return acc;
  }, {});
  const missingTypes = ALL_ACTIVITY_TYPES.filter((type) => !byType[type]);
  const hardCount = allActivities.filter((a) => a.difficulty === "hard").length;
  const averagePoints = allActivities.length
    ? Math.round(allActivities.reduce((n, a) => n + a.points, 0) / allActivities.length)
    : 0;

  if (segments.length < 8) warnings.push(`Only ${segments.length} segments — the lesson schema asks for 8–16.`);
  if (segments.length > 16) warnings.push(`${segments.length} segments — more than 16 makes the timeline hard to read.`);
  if (allActivities.length < 24) warnings.push(`${allActivities.length} activities is thin — aim for 35+ for a full class.`);
  if (hardCount < 4) warnings.push(`Only ${hardCount} hard activities — the pack should include 4+ to stretch stronger learners.`);
  if (missingTypes.length) warnings.push(`Activity types never used: ${missingTypes.join(", ")}.`);
  const noFeedback = allActivities.filter((a) => !a.correctFeedback || !a.incorrectFeedback);
  if (noFeedback.length) warnings.push(`${noFeedback.length} activities have empty feedback text.`);
  const noDeepFeedback = allActivities.filter((a) => !a.comprehensiveFeedback);
  if (noDeepFeedback.length > allActivities.length / 2) {
    warnings.push(`${noDeepFeedback.length} activities have no comprehensiveFeedback (the "why", grammar note and translation).`);
  }
  warnings.push(...guessingWarnings(allActivities));

  const lesson: Lesson | null = errors.some((e) => e.includes("No \"segments\"")) || !allActivities.length
    ? null
    : {
        schemaVersion: str(raw.schemaVersion) || "1.0",
        metadata: {
          title: str(metadataRaw.title) || "Video lesson",
          targetLanguage: str(metadataRaw.targetLanguage) || "English",
          cefrLevel: str(metadataRaw.cefrLevel) || "B1",
          estimatedDurationSeconds: num(metadataRaw.estimatedDurationSeconds, segments.at(-1)?.endTime ?? 0),
          videoUrl: str(metadataRaw.videoUrl) || undefined,
          posterUrl: str(metadataRaw.posterUrl) || undefined,
          learnerL1: str(metadataRaw.learnerL1) || undefined,
          episodeId: str(metadataRaw.episodeId) || undefined,
        },
        segments,
        globalSettings: {
          pointsToLevelUp: num((isRecord(raw.globalSettings) ? raw.globalSettings.pointsToLevelUp : 500), 500),
          enableStreak: (isRecord(raw.globalSettings) ? raw.globalSettings.enableStreak : true) !== false,
          suspenseSounds: (isRecord(raw.globalSettings) ? raw.globalSettings.suspenseSounds : false) === true,
        },
        badges: Array.isArray(raw.badges) ? (raw.badges as Lesson["badges"]) : [],
        learnerProfile: isRecord(raw.learnerProfile) ? (raw.learnerProfile as unknown as Lesson["learnerProfile"]) : undefined,
      };

  const report: LessonQualityReport = {
    ...emptyReport(errors),
    warnings,
    activityCount: allActivities.length,
    segmentCount: segments.length,
    byType,
    missingTypes,
    hardCount,
    averagePoints,
    score: qualityScore({ errors: errors.length, warnings: warnings.length, activities: allActivities.length, covered: ALL_ACTIVITY_TYPES.length - missingTypes.length, hardCount }),
  };

  if (lesson) lesson.quality = report;
  return { lesson, report };
}

function qualityScore(input: { errors: number; warnings: number; activities: number; covered: number; hardCount: number }): number {
  const volume = Math.min(1, input.activities / 35);
  const coverage = input.covered / ALL_ACTIVITY_TYPES.length;
  const hardness = Math.min(1, input.hardCount / 4);
  const penalties = Math.min(0.4, input.errors * 0.05 + input.warnings * 0.01);
  return Math.max(0, Math.round((volume * 0.45 + coverage * 0.35 + hardness * 0.2 - penalties) * 100));
}

function emptyReport(errors: string[]): LessonQualityReport {
  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    activityCount: 0,
    segmentCount: 0,
    byType: {},
    missingTypes: [...ALL_ACTIVITY_TYPES],
    hardCount: 0,
    averagePoints: 0,
    score: 0,
  };
}

/** Human summary for the paste box. */
export function describeReport(report: LessonQualityReport): string {
  if (report.errors.length) return `❌ ${report.errors.slice(0, 3).join(" · ")}${report.errors.length > 3 ? ` (+${report.errors.length - 3} more)` : ""}`;
  const bits = [
    `✅ ${report.activityCount} activities in ${report.segmentCount} segments`,
    `quality ${report.score}/100`,
    `${report.hardCount} hard`,
    `${Object.keys(report.byType).length}/${ALL_ACTIVITY_TYPES.length} activity types`,
  ];
  if (report.warnings.length) bits.push(`⚠️ ${report.warnings.length} warning${report.warnings.length === 1 ? "" : "s"}`);
  return bits.join(" · ");
}
