/**
 * Lesson maker — the AI prompt.
 *
 * This is the existing Video-Lesson "master prompt" flow, integrated into
 * Flix and upgraded in the two ways that matter in a streaming UI:
 *
 *  1. THE SUBTITLES ARE ALREADY IN IT. The transcript is taken from the loaded
 *     subtitle track (or the segment/cue under the playhead), not pasted by
 *     hand, and every cue keeps its real timestamp so activities land on the
 *     moment they teach. `buildLessonPrompt` for the whole episode,
 *     `buildSegmentPrompt` for one segment at a time (smaller prompt, better
 *     output), `buildCuePrompt` for the line the learner is stuck on.
 *  2. IT DEMANDS SCORABLE, HARD CONTENT. The prompt carries the activity
 *     registry, the feedback triad, the anti-guessing rules and the difficulty
 *     mix, and returns the schema `validateLesson` then audits — so a bad pack
 *     is caught before class instead of halfway through it.
 */

import type { ActivityType, LearnerProfile, Lesson, SubtitleCue } from "../../types";
import { ALL_ACTIVITY_TYPES } from "../lesson/validate";
import { cuesToTranscript, formatClock, secondsToTimecode } from "../subtitles";

export interface LessonMakerInput {
  episodeTitle: string;
  show?: string;
  videoUrl?: string;
  durationSeconds: number;
  cefrLevel: string;
  targetLanguage: string;
  learnerL1: string;
  learner: LearnerProfile;
  cues: SubtitleCue[];
  /** 8–16 per the lesson schema. */
  segmentCount?: number;
  /** Types to force in — defaults to all of them. */
  activityTypes?: ActivityType[];
  /** How many activities per segment. */
  activitiesPerSegment?: number;
  /** Optional per-episode angle ("past tenses", "job interviews", …). */
  focus?: string;
  /** Where the captions came from, for the prompt's own provenance note. */
  transcriptSource?: string;
  /** Only include these types as the "must appear" list, but never ban others. */
  includeTranslation?: boolean;
}

export interface SegmentPromptInput extends LessonMakerInput {
  segment: { index: number; title: string; startTime: number; endTime: number; cues: SubtitleCue[] };
}

const L1_NAMES: Record<string, string> = {
  fa: "Persian (Farsi)",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ar: "Arabic",
  tr: "Turkish",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  it: "Italian",
  hi: "Hindi",
  pl: "Polish",
  vi: "Vietnamese",
  th: "Thai",
};

const l1Name = (code: string) => L1_NAMES[code.toLowerCase()] ?? code;

const ACTIVITY_CONTRACT: Record<ActivityType, string> = {
  flashcard: 'content.cards[] ≥4: { front, back, example, pronunciation, translation }. Front = the target word/phrase from THIS video.',
  multipleChoice: 'content.question + content.options[] (3–5, exactly one isCorrect:true). Distractors = mistakes speakers of the L1 actually make.',
  trueFalse: 'content.question (a statement from the video) + content.answer (boolean). Write half of them FALSE, and make the false ones believable.',
  fillBlanks: 'content.sentence with ___ blanks (1–3) + content.blanks[] in order. Every blank must be recoverable from the video.',
  dragDrop: 'content.items[] (4–6) + content.targets[] (2–4 categories). Items must be quotable from the transcript.',
  matching: 'content.pairs[] ≥4: { left, right } — matching speakers to lines, words to meanings, or causes to consequences.',
  speaking: 'content.expectedSentence (a real line from the video) + content.pronunciation (stress pattern) + content.translation.',
  discussion: 'content.discussionPrompt demanding opinion + evidence from the video + a counter-argument.',
  ordering: 'content.orderedItems[] (4–6) in the CORRECT order — plot beats or the steps of an argument.',
  wordScramble: 'content.scrambledWord + content.correctWord (a key word from this segment, ≥6 letters).',
  reflection: 'content.reflectionPrompt — personal, journaled, uses this segment\'s grammar.',
  hotspot: 'content.hotspot { x (0–100), y (0–100), question, options[], hint } tied to a visible moment on screen.',
  videoPause: 'content.videoPausePrompt — an open prediction/annotation task, "will" vs "might" style.',
  readingChallenge: 'content.reading { title, genre (fiction|factual|whatIf), text (120–220 words), translation, questions[] (2–3 MC with explanation) }.',
  listeningComprehension: 'content.listening { title, genre, audioText (60–120 words from the transcript), translation, showTranscript, questions[] (2–3 MC with timestamp) }.',
};

function sharedHeader(input: LessonMakerInput): string {
  return `You are a world-class ESL curriculum designer and film analyst building a "Super Lesson" JSON for Flix, an interactive video-learning platform.

## WHO IS LEARNING
- Name: ${input.learner.name || "the student"}
- CEFR level: ${input.cefrLevel}
- Native language (L1): ${l1Name(input.learnerL1)} (${input.learnerL1})
- Goals: ${input.learner.goals || "speak more fluently"}
- Interests: ${input.learner.interests || "films, everyday topics"}
- Personal facts to reuse in examples and feedback: ${input.learner.facts || "(none given)"}

## THE EPISODE
- Title: ${input.episodeTitle}${input.show ? `\n- Series: ${input.show}` : ""}
- Language being taught: ${input.targetLanguage}
- Duration: ${formatClock(input.durationSeconds)} (${Math.round(input.durationSeconds)}s)
${input.videoUrl ? `- Video: ${input.videoUrl}` : ""}
${input.focus ? `- Teaching focus for this pack: ${input.focus}` : ""}

## THE SUBTITLES (already extracted — these timestamps are REAL, use them verbatim)
${input.transcriptSource ? `Source: ${input.transcriptSource}\n` : ""}\`\`\`
${cuesToTranscript(input.cues, { withTimestamps: true, withSpeakers: true, withTranslation: false, maxChars: 40_000 })}
\`\`\`

## NON-NEGOTIABLE RULES
1. Output ONE JSON object. No markdown, no code fences, no commentary, no trailing commas.
2. Every activity's \`timestamp\` must be a real number INSIDE its segment and must sit on the subtitle line it teaches. Never invent a timestamp beyond ${Math.round(input.durationSeconds)}s.
3. Quote the video: every question, distractor, flashcard and feedback line must be anchored to something actually said or shown. If the transcript is thin in a segment, write comprehension of WHAT IS VISIBLE rather than inventing dialogue.
4. Translations: include ${l1Name(input.learnerL1)} for every vocabulary term, flashcard back and key sentence (\`translation\` fields).
5. Personalisation belongs in EXAMPLES and FEEDBACK (use ${input.learner.name || "the learner"}'s real facts, city, interests). The target language itself must stay general English.
6. Hard, not decorative. If a question can be answered without watching, delete it and write a better one.`;
}

const qualityBar = (l1: string) => `## QUALITY BAR (this is what the teacher judges)
- **Evidence rule**: every answer must be justifiable by pointing at a moment in the video or a subtitle line.
- **Anti-guessing**: all options in a choice activity must be SIMILAR IN LENGTH, all plausible, and the correct one must NOT always sit in the same position. Never use "all of the above" / "none of the above".
- **Difficulty mix**: about 40% easy, 40% medium, 20% hard. Hard = inference (a cause, a motive, a contradiction between two lines), never trivia.
- **Feedback triad** on EVERY activity: \`correctFeedback\` (why it is right), \`incorrectFeedback\` (why the chosen answer is tempting but wrong), \`comprehensiveFeedback\` (the deep one: grammar form, meaning in ${l1}, common mistakes by L1 speakers, and a memory hook).
- **No duplicate activities**: never reuse the same question, option set or example twice in one pack.
- **Speaking exam shape**: every open question should push claim → evidence → counter-argument ("I see your point, but…").
- **Classroom safety**: no spoilers beyond the video, no slurs, no adult content, no real person's private data.`;

export function buildLessonPrompt(input: LessonMakerInput): string {
  const segmentCount = Math.min(16, Math.max(8, input.segmentCount ?? 10));
  const perSegment = Math.max(2, Math.min(6, input.activitiesPerSegment ?? 3));
  const types = input.activityTypes?.length ? input.activityTypes : ALL_ACTIVITY_TYPES;
  const registry = types.map((type) => `- **${type}** → ${ACTIVITY_CONTRACT[type]}`).join("\n");
  const needed = Math.round(segmentCount * perSegment);

  return `${sharedHeader(input)}

## YOUR TASK
Split the video into ${segmentCount} teaching segments that cover the timeline evenly, and attach ${perSegment} activities to each (≈${needed} activities in total, minimum ${Math.max(24, needed - 4)}), timestamped inside their segment.

Every segment needs:
\`\`\`
{ "id": "s1", "title": "short scene title (0:42–1:10)", "startTime": <seconds>, "endTime": <seconds>,
  "summary": "one line, in English", "focus": { "grammar": [...], "vocabulary": [...], "pronunciation": [...] },
  "activities": [ ... ] }
\`\`\`

## ACTIVITY REGISTRY (use these types; use as many different ones as the segment supports)
${registry}

## ${qualityBar(l1Name(input.learnerL1))}

## REQUIRED JSON SCHEMA
\`\`\`json
{
  "schemaVersion": "1.0",
  "metadata": {
    "title": "lesson title",
    "targetLanguage": "${input.targetLanguage}",
    "cefrLevel": "${input.cefrLevel}",
    "estimatedDurationSeconds": ${Math.round(input.durationSeconds)},
    "videoUrl": ${input.videoUrl ? JSON.stringify(input.videoUrl) : "null"},
    "learnerL1": "${input.learnerL1}"
  },
  "segments": [
    {
      "id": "s1",
      "title": "…",
      "startTime": 0,
      "endTime": 42,
      "summary": "…",
      "focus": { "grammar": ["…"], "vocabulary": ["…"], "pronunciation": ["…"] },
      "activities": [
        {
          "id": "s1a1",
          "type": "multipleChoice",
          "timestamp": 12.5,
          "title": "…",
          "emoji": "🎯",
          "color": "teal",
          "points": 50,
          "difficulty": "medium",
          "requiredForNext": true,
          "onReach": "pause",
          "content": { "question": "…", "options": [ { "id": "o1", "text": "…", "isCorrect": false }, { "id": "o2", "text": "…", "isCorrect": true } ] },
          "lessonContent": { "warmUp": "…", "form": "…", "meaning": "…", "use": "…", "personalizedExamples": ["…", "…"], "lifeApplication": "…" },
          "correctFeedback": "…",
          "incorrectFeedback": "…",
          "comprehensiveFeedback": "…"
        }
      ]
    }
  ],
  "globalSettings": { "pointsToLevelUp": 500, "enableStreak": true, "suspenseSounds": true, "activitiesPerSegment": ${perSegment} },
  "badges": [ { "id": "b1", "name": "…", "emoji": "🏅", "rarity": "rare", "condition": "…", "description": "…" } ],
  "learnerProfile": {
    "name": ${JSON.stringify(input.learner.name || "")},
    "level": "${input.cefrLevel}",
    "nativeLanguage": "${input.learnerL1}",
    "goals": ${JSON.stringify(input.learner.goals || "")},
    "interests": ${JSON.stringify(input.learner.interests || "")},
    "facts": ${JSON.stringify(input.learner.facts || "")}
  }
}
\`\`\`

Return only the JSON.`;
}

export function buildSegmentPrompt(input: SegmentPromptInput): string {
  const { segment } = input;
  const perSegment = Math.max(2, Math.min(6, input.activitiesPerSegment ?? 3));
  const types = (input.activityTypes?.length ? input.activityTypes : ALL_ACTIVITY_TYPES).slice(0, 12);
  const registry = types.map((type) => `- **${type}** → ${ACTIVITY_CONTRACT[type]}`).join("\n");

  return `${sharedHeader({ ...input, cues: segment.cues })}

## YOUR TASK — ONE SEGMENT ONLY
Write the activities for **segment ${segment.index + 1}: ${segment.title}** (${secondsToTimecode(segment.startTime)} → ${secondsToTimecode(segment.endTime)}).
Produce exactly ${perSegment} activities, every \`timestamp\` between ${segment.startTime.toFixed(1)} and ${segment.endTime.toFixed(1)} seconds.

${registry}

## ${qualityBar(l1Name(input.learnerL1))}

## OUTPUT
A single JSON object of the form:
\`{ "segment": { "id": "s${segment.index + 1}", "title": "${segment.title.replace(/"/g, "'")}", "startTime": ${segment.startTime}, "endTime": ${segment.endTime}, "summary": "…", "focus": { "grammar": [], "vocabulary": [], "pronunciation": [] }, "activities": [ … ] } }\`
Every activity uses the same shape as the schema below (id, type, timestamp, title, emoji, color, points, difficulty, requiredForNext, onReach, content, lessonContent, correctFeedback, incorrectFeedback, comprehensiveFeedback).
Return only the JSON.`;
}

/** Micro-lesson for the single line under the playhead — the "I am stuck here" button. */
export function buildCuePrompt(input: LessonMakerInput, cue: SubtitleCue, neighbours: SubtitleCue[] = []): string {
  const context = [cue, ...neighbours].slice(0, 5);
  return `You are an ESL teacher making a MICRO-LESSON from one line of a video.

## LINE (${secondsToTimecode(cue.startTime)} → ${secondsToTimecode(cue.endTime)})${cue.speaker ? ` — speaker: ${cue.speaker}` : ""}
"${cue.text}"
${context.length > 1 ? `\n## CONTEXT AROUND IT\n\`\`\`\n${cuesToTranscript(context, { withSpeakers: true })}\n\`\`\`` : ""}

## LEARNER
${input.learner.name || "Student"}, CEFR ${input.cefrLevel}, L1 ${l1Name(input.learnerL1)}. Interests: ${input.learner.interests || "general"}.

## WRITE EXACTLY THIS JSON
{
  "line": ${JSON.stringify(cue.text)},
  "startTime": ${cue.startTime.toFixed(2)},
  "endTime": ${cue.endTime.toFixed(2)},
  "plainEnglish": "the same meaning in simple A2 words",
  "keyWords": [ { "word": "…", "meaning": "…", "translation": "…", "pronunciation": "…" } ],
  "grammar": { "point": "the structure used", "form": "…", "commonMistake": "what ${l1Name(input.learnerL1)} speakers usually get wrong here", "example": "another sentence with the same structure about ${input.learner.interests || "the learner's life"}" },
  "activities": [
    { "type": "multipleChoice", "prompt": "…", "options": ["…", "…", "…"], "correctIndex": 1, "why": "…" },
    { "type": "fillBlanks", "prompt": "… ___ …", "answer": "…", "why": "…" },
    { "type": "speaking", "prompt": "Say the line with stress on …", "expectedSentence": ${JSON.stringify(cue.text)} }
  ],
  "shadowing": { "chunks": ["…", "…"], "tip": "…" }
}
Rules: 3 activities, options of similar length, no giveaway options, everything tied to this line. Return only the JSON.`;
}

/* ─────────────────────── prompt packaging for the clipboard ─────────────────────── */

export interface BuiltPrompt {
  id: string;
  kind: "full" | "segment" | "cue";
  label: string;
  /** Where it applies in the timeline, so the maker can list it. */
  range?: { start: number; end: number };
  text: string;
  /** Rough size, so a teacher can see what they are about to paste into ChatGPT. */
  tokensEstimate: number;
  createdAt: number;
}

export function estimateTokens(text: string): number {
  return Math.round(text.length / 4);
}

export function packPrompt(kind: BuiltPrompt["kind"], label: string, text: string, range?: BuiltPrompt["range"]): BuiltPrompt {
  return {
    id: `p-${kind}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    label,
    range,
    text,
    tokensEstimate: estimateTokens(text),
    createdAt: Date.now(),
  };
}

/**
 * The maker's "auto" pack: a full-episode prompt, one prompt per segment, and a
 * micro-prompt for the busiest cue in each segment. Everything is generated from
 * the loaded subtitle track — nothing is typed by hand.
 */
export function buildPromptPack(input: LessonMakerInput, segments: SegmentPromptInput[]): BuiltPrompt[] {
  const prompts: BuiltPrompt[] = [packPrompt("full", `Whole episode · ${segments.length} segments`, buildLessonPrompt(input))];
  for (const segment of segments) {
    prompts.push(
      packPrompt("segment", `Segment ${segment.segment.index + 1} · ${segment.segment.title}`, buildSegmentPrompt(segment), {
        start: segment.segment.startTime,
        end: segment.segment.endTime,
      }),
    );
  }
  return prompts;
}

/** Everything the maker shows in the "what will the AI receive?" panel. */
export function describePromptCoverage(lesson: Lesson | null): string {
  if (!lesson) return "No lesson loaded yet.";
  const activities = lesson.segments.reduce((n, s) => n + s.activities.length, 0);
  const span = lesson.segments.length ? `${formatClock(lesson.segments[0].startTime)}–${formatClock(lesson.segments.at(-1)!.endTime)}` : "—";
  return `${activities} activities · ${lesson.segments.length} segments · covers ${span}`;
}

export const ACTIVITY_TYPES_ORDERED = ALL_ACTIVITY_TYPES;
export const SUPPORTED_EXPORTS = ["vtt", "srt"] as const;
