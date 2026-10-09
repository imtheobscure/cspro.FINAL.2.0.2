/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LESSON INSIGHT — EXTERNAL-AI PIPELINE
 *
 * This app used to require a Gemini API key before it would do anything: it
 * recorded (or uploaded) the lesson audio, sent the audio to Gemini for
 * transcription, then sent the transcript back to Gemini for analysis. That
 * made the whole widget unusable without a key, unusable offline, and made the
 * tutor wait through two round trips.
 *
 * It now works the way the rest of the platform's generators do — a COPY
 * PROMPT and a PASTE-BACK:
 *
 *   1. The learner's facts arrive from the profile (see `saveHandoff` below).
 *   2. The tutor pastes the raw, messy class transcript.
 *   3. `buildAnalysisPrompt` produces ONE detailed prompt holding the learner
 *      facts, the transcript, and the full output contract.
 *   4. The tutor pastes that prompt into any external AI.
 *   5. The AI returns the report JSON, which the tutor pastes back into
 *      `parseTeacherFeedback`, and the app renders the full insight report.
 *
 * The transcript is expected to be MESSY. Real class transcripts come from
 * auto-captions, phone recordings, or a tutor typing quickly — they mangle
 * names, drop word endings and mis-hear words. The prompt therefore asks the
 * model to reconstruct what the learner MEANT (so it can judge the real
 * grammar) while explicitly forbidding it from CORRECTING the learner's
 * mistakes, because those mistakes are the entire point of the report.
 */

import { TeacherFeedback, StudentProfile } from "../types";

/* ------------------------------------------------------------------ *
 * Learner-facts handoff (profile page -> this widget)
 * ------------------------------------------------------------------ */

/**
 * The key the profile pages write before opening this widget in a new tab.
 *
 * The profile and this widget are served from the same origin, so
 * `localStorage` is the handoff channel: a new tab cannot receive a
 * `postMessage` that was sent before it existed, and stuffing a whole learner
 * profile into a query string is both ugly and length-limited.
 */
export const HANDOFF_KEY = "tutorly_lesson_insight_handoff";

export interface LessonInsightHandoff {
  /** Learner display name. */
  name: string;
  /** Tutor's own display name, used to separate the two speakers. */
  tutorName?: string;
  nationality?: string;
  /** Learner's native language. */
  l1?: string;
  /** Target language being learned. */
  l2?: string;
  focusedLanguage?: string;
  /** The free-text "profile facts" block — the important one. */
  facts: string;
  /** Where the handoff came from, for the "loaded from X" hint. */
  source?: string;
  /** Epoch ms, so a stale handoff can be ignored. */
  ts: number;
}

/** Write the learner facts for the widget to pick up. */
export const saveHandoff = (payload: Omit<LessonInsightHandoff, "ts">): void => {
  try {
    localStorage.setItem(HANDOFF_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
  } catch (e) {
    console.error("Could not save the Lesson Insight handoff:", e);
  }
};

/**
 * Read (and clear) the pending handoff.
 *
 * A handoff older than `maxAgeMs` is discarded: a tutor who clicks the tab,
 * closes it without using it, then opens the widget directly an hour later
 * should not silently get someone else's learner pre-filled.
 */
export const consumeHandoff = (maxAgeMs = 6 * 60 * 60 * 1000): LessonInsightHandoff | null => {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    localStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as LessonInsightHandoff;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.ts === "number" && Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed;
  } catch (e) {
    console.error("Could not read the Lesson Insight handoff:", e);
    return null;
  }
};

/** Turn a handoff into the widget's `StudentProfile` shape. */
export const handoffToStudent = (h: LessonInsightHandoff): StudentProfile => ({
  name: h.name || "",
  tutorName: h.tutorName || "",
  nationality: h.nationality || "",
  l1: h.l1 || "",
  addL1Translations: true,
  l2: h.l2 || "",
  explanationsInEnglish: true,
  focusedLanguage: h.focusedLanguage || "",
  facts: h.facts || "",
});

/* ------------------------------------------------------------------ *
 * Draft persistence — the tutor's work survives a reload
 * ------------------------------------------------------------------ */

const DRAFT_KEY = "tutorly_lesson_insight_draft";

export interface LessonInsightDraft {
  student: StudentProfile;
  transcript: string;
}

export const saveDraft = (draft: LessonInsightDraft): void => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Quota errors are not worth interrupting the lesson for. */
  }
};

export const loadDraft = (): LessonInsightDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LessonInsightDraft;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      student: parsed.student,
      transcript: typeof parsed.transcript === "string" ? parsed.transcript : "",
    };
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ *
 * Loose JSON parsing
 * ------------------------------------------------------------------ */

/**
 * Pull a JSON object out of whatever the external AI returned.
 *
 * Models wrap JSON in ```json fences, prefix it with "Here is the report:",
 * or both. All three shapes are common enough that the app must not depend on
 * a bare object arriving.
 */
export const parseJsonLoose = (text: string): any | null => {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  const candidates: string[] = [trimmed];

  // ```json … ``` (and bare ``` … ```) fences.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidates.push(fence[1].trim());

  // Widest brace-to-brace slice, for prose wrapped around the object.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));

  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object") return value;
    } catch {
      /* Try the next shape. */
    }
  }
  return null;
};

/* ------------------------------------------------------------------ *
 * Report normalisation
 * ------------------------------------------------------------------ */

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : value == null ? fallback : String(value);
const asNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Coerce a parsed object into a complete `TeacherFeedback`.
 *
 * An external model can omit a key, rename one, or return `null` where an
 * array belongs. Without this the report renders as a blank screen or throws
 * on `.map`, which looks like the widget is broken rather than like the AI
 * skipped a section. Every collection gets a safe empty default, so a partial
 * answer still shows whatever DID come back.
 */
export const normalizeTeacherFeedback = (raw: any): TeacherFeedback => {
  const v = raw?.vocabulary ?? {};
  const cefr = raw?.cefrLevel ?? {};
  const grammar = raw?.grammarInsights ?? {};
  const metrics = raw?.speakingMetrics ?? {};
  const filler = metrics?.fillerWordDensity ?? {};
  const advanced = raw?.advancedVocab?.idiomsPhrasalDashboard ?? {};
  const connected = raw?.connectedFeatures ?? {};

  return {
    generalLessonTopic: asString(raw?.generalLessonTopic, "Untitled lesson"),

    subtopicClustering: asArray<any>(raw?.subtopicClustering).map((s) => ({
      title: asString(s?.title),
      description: asString(s?.description),
      timestamp: asString(s?.timestamp),
    })),

    keyTakeaways: {
      wins: asArray<string>(raw?.keyTakeaways?.wins).map((w) => asString(w)),
      futureFocus: asArray<string>(raw?.keyTakeaways?.futureFocus).map((w) => asString(w)),
    },

    vocabulary: {
      totalWords: asNumber(v.totalWords),
      newWordsCount: asNumber(v.newWordsCount),
      passiveVocab: asArray<string>(v.passiveVocab).map((w) => asString(w)),
      activeVocab: asArray<string>(v.activeVocab).map((w) => asString(w)),
      overusedWords: asArray<any>(v.overusedWords).map((w) => ({
        word: asString(w?.word),
        count: asNumber(w?.count),
        alternatives: asArray<string>(w?.alternatives).map((a) => asString(a)),
      })),
      wordFamilyExpansion: asArray<any>(v.wordFamilyExpansion).map((w) => ({
        base: asString(w?.base),
        family: asArray<string>(w?.family).map((f) => asString(f)),
      })),
      falseFriends: asArray<any>(v.falseFriends).map((f) => ({
        word: asString(f?.word),
        l1Meaning: asString(f?.l1Meaning),
        actualMeaning: asString(f?.actualMeaning),
        warning: asString(f?.warning),
      })),
    },

    cefrLevel: {
      level: (["A1", "A2", "B1", "B2", "C1", "C2"].includes(cefr.level)
        ? cefr.level
        : "B1") as TeacherFeedback["cefrLevel"]["level"],
      targetLevelProjection: asString(cefr.targetLevelProjection),
      missingWordsList: asArray<string>(cefr.missingWordsList).map((w) => asString(w)),
    },

    advancedVocab: {
      idiomsPhrasalDashboard: {
        attempted: asNumber(advanced.attempted),
        usedCorrectly: asNumber(advanced.usedCorrectly),
        list: asArray<any>(advanced.list).map((i) => ({
          idiom: asString(i?.idiom),
          definition: asString(i?.definition),
          status: (["attempted", "correct", "recommended"].includes(i?.status)
            ? i.status
            : "recommended") as "attempted" | "correct" | "recommended",
        })),
      },
    },

    synonymSuggestions: asArray<any>(raw?.synonymSuggestions).map((s) => ({
      studentSpoke: asString(s?.studentSpoke),
      formalVersion: asString(s?.formalVersion),
      casualVersion: asString(s?.casualVersion),
      note: asString(s?.note),
    })),

    grammarInsights: {
      mistakes: asArray<any>(grammar.mistakes).map((m, i) => ({
        id: asString(m?.id, `mistake_${i + 1}`),
        timestamp: asString(m?.timestamp),
        type: (["article", "preposition", "subject-verb agreement", "tense", "word choice", "pronunciation"].includes(
          m?.type,
        )
          ? m.type
          : "word choice") as TeacherFeedback["grammarInsights"]["mistakes"][number]["type"],
        error: asString(m?.error),
        correction: asString(m?.correction),
        explanation: asString(m?.explanation),
        ruleId: asString(m?.ruleId, "rule_general"),
        persistenceCount: asNumber(m?.persistenceCount, 1),
      })),
      ruleBank: asArray<any>(grammar.ruleBank).map((r, i) => ({
        id: asString(r?.id, `rule_${i + 1}`),
        title: asString(r?.title),
        content: asString(r?.content),
      })),
      positiveReinforcement: asArray<string>(grammar.positiveReinforcement).map((p) => asString(p)),
    },

    speakingMetrics: {
      speakingTimeRatio: {
        student: asNumber(metrics?.speakingTimeRatio?.student),
        tutor: asNumber(metrics?.speakingTimeRatio?.tutor),
      },
      turnTakingFairnessScore: asNumber(metrics.turnTakingFairnessScore),
      fillerWordDensity: {
        averageDensity: asNumber(filler.averageDensity),
        trendData: asArray<any>(filler.trendData).map((t) => ({
          minute: asNumber(t?.minute),
          count: asNumber(t?.count),
        })),
        fillerWords: asArray<any>(filler.fillerWords).map((f) => ({
          word: asString(f?.word),
          count: asNumber(f?.count),
        })),
      },
      standoutSentence: {
        sentence: asString(metrics?.standoutSentence?.sentence),
        analysis: asString(metrics?.standoutSentence?.analysis),
        structurallySound: Boolean(metrics?.standoutSentence?.structurallySound),
      },
    },

    pronunciationFeedback: asArray<any>(raw?.pronunciationFeedback).map((p) => ({
      word: asString(p?.word),
      phoneticGuidance: asString(p?.phoneticGuidance),
      mispronounced: p?.mispronounced === undefined ? true : Boolean(p.mispronounced),
      timestamp: asString(p?.timestamp),
    })),

    connectedFeatures: {
      dailyExercises: asArray<any>(connected.dailyExercises).map((e, i) => ({
        day: asNumber(e?.day, i + 1),
        type: (["drag-drop", "fill-blank", "multiple-choice"].includes(e?.type)
          ? e.type
          : "fill-blank") as "drag-drop" | "fill-blank" | "multiple-choice",
        question: asString(e?.question),
        options: asArray<string>(e?.options).map((o) => asString(o)),
        correctAnswer: asString(e?.correctAnswer),
        explanation: asString(e?.explanation),
      })),
      scenarios: asArray<any>(connected.scenarios).map((s) => ({
        title: asString(s?.title),
        basic: {
          description: asString(s?.basic?.description),
          tasks: asArray<string>(s?.basic?.tasks).map((t) => asString(t)),
        },
        intermediate: {
          description: asString(s?.intermediate?.description),
          tasks: asArray<string>(s?.intermediate?.tasks).map((t) => asString(t)),
        },
        advanced: {
          description: asString(s?.advanced?.description),
          tasks: asArray<string>(s?.advanced?.tasks).map((t) => asString(t)),
        },
      })),
    },
  };
};

/**
 * Parse the AI's reply into a report.
 *
 * Throws with a message written for a tutor, not a developer, because the
 * error is shown in the paste box where the tutor can act on it.
 */
export const parseTeacherFeedback = (text: string): TeacherFeedback => {
  const parsed = parseJsonLoose(text);
  if (!parsed) {
    throw new Error(
      "That does not look like JSON. Paste the AI's full reply — it should start with { and end with }.",
    );
  }
  const report = normalizeTeacherFeedback(parsed);
  const hasSubstance =
    report.generalLessonTopic !== "Untitled lesson" ||
    report.grammarInsights.mistakes.length > 0 ||
    report.vocabulary.activeVocab.length > 0 ||
    report.keyTakeaways.wins.length > 0;
  if (!hasSubstance) {
    throw new Error(
      "The JSON parsed, but it has none of the expected report sections. Re-copy the prompt and ask the AI to return the full schema.",
    );
  }
  return report;
};

/* ------------------------------------------------------------------ *
 * The copy prompt
 * ------------------------------------------------------------------ */

/** Human-readable context block, shared by both prompts. */
const learnerBlock = (student: StudentProfile): string => {
  const tutorName = student.tutorName?.trim() || "the tutor";
  return `LEARNER PROFILE (authoritative — trust this over anything you infer from the transcript)
- Learner name: ${student.name?.trim() || "(not given)"}
- Tutor name: ${tutorName}
- Nationality: ${student.nationality?.trim() || "(not given)"}
- L1 (native language): ${student.l1?.trim() || "(not given)"}
- L2 (target language being learned): ${student.l2?.trim() || "(not given)"}
- Current focus / recent topics: ${student.focusedLanguage?.trim() || "(not given)"}

LEARNER FACTS, GOALS & HISTORY
"""
${student.facts?.trim() || "(no facts supplied — infer cautiously from the transcript and say so in the report where it matters)"}
"""`;
};

/** Rules for handling the messy transcript. Shared by both prompts. */
const transcriptRules = (student: StudentProfile): string => {
  const learner = student.name?.trim() || "the learner";
  const tutor = student.tutorName?.trim() || "the tutor";
  return `HOW TO READ THE TRANSCRIPT (read this twice — it is the most important instruction here)

The transcript below is RAW and MESSY. It comes from auto-captions, a phone
recording, or a tutor typing at speed. Expect and tolerate:
- mangled proper nouns and place names;
- dropped word endings, missing articles, missing punctuation;
- words mis-heard as similar-sounding words;
- run-on blocks with no speaker labels, or wrong speaker labels.

Because of that noise you must do TWO things at once:

1. RECONSTRUCT THE INTENT. Work out what ${learner} was actually trying to say.
   Repair transcription artefacts (a mangled name, an obvious mis-hearing, a
   missing comma) so you are judging the learner's real language and not the
   transcriber's mistakes. If a line is genuinely unintelligible, skip it
   rather than inventing content for it.

2. DO NOT CORRECT THE LEARNER'S MISTAKES. This is critical and easy to get
   wrong. A genuine learner error — a wrong tense, a missing article, a
   mispronounced word, a false friend — must be preserved EXACTLY as the
   learner produced it and reported as an error. Never silently fix it, never
   smooth it into the "correct" version, and never leave it out because the
   sentence reads better without it. The errors ARE the report.

   The test: if a mistake would still be a mistake when a human heard the
   audio clearly, it is a learner error → report it. If it only exists because
   the transcriber mis-heard, it is noise → repair it.

SPEAKER ATTRIBUTION
- ${learner} is the learner. ${tutor} is the tutor.
- Attribute every analysed item to ${learner}. If the transcript has no
  reliable speaker labels, use the profile above plus conversational logic
  (who asks, who answers, who is being corrected) to work out who spoke.
- Anything that cannot be confidently attributed to ${learner} must NOT be
  reported as one of their errors.`;
};

/** Instructions about which language to write the report in. */
const languageInstruction = (student: StudentProfile): string => {
  const parts: string[] = [];
  parts.push(
    student.explanationsInEnglish
      ? `Write all pedagogical explanations, rule cards, summaries and homework instructions in English.`
      : `Write all summaries, key takeaways, error explanations, grammar card rules, standout-sentence analyses and homework instructions ENTIRELY in the target language L2 (${student.l2?.trim() || "the target language"}). Use English only where a comparison genuinely requires it.`,
  );
  parts.push(
    student.addL1Translations
      ? `The learner's L1 is ${student.l1?.trim() || "unknown"}. Include L1↔L2 structural comparisons where they explain a mistake, and fill the "falseFriends" array with real L1/L2 false friends this learner is at risk of (leave it empty rather than inventing weak ones).`
      : `Do not add L1 translations or L1↔L2 comparisons. Leave "falseFriends" empty unless a false friend is genuinely central to the lesson.`,
  );
  return parts.join("\n");
};

/** The JSON contract, spelled out so an external model has no excuse to improvise. */
const jsonContract = (student: StudentProfile): string => {
  const learner = student.name?.trim() || "the learner";
  const tutor = student.tutorName?.trim() || "the tutor";
  return `{
  "generalLessonTopic": "Subject of the lesson, e.g. 'Weekend plans and travel problems'",
  "subtopicClustering": [
    { "title": "Subtopic title", "description": "What shifted in the conversation", "timestamp": "00:00" }
  ],
  "keyTakeaways": {
    "wins": ["What ${learner} genuinely did well, quoting them"],
    "futureFocus": ["The exact thing to reinforce next lesson"]
  },
  "vocabulary": {
    "totalWords": 150,
    "newWordsCount": 8,
    "passiveVocab": ["words understood from context or taught by ${tutor} but not produced by ${learner}"],
    "activeVocab": ["harder words ${learner} produced correctly"],
    "overusedWords": [
      { "word": "nice", "count": 4, "alternatives": ["compelling", "worthwhile", "striking"] }
    ],
    "wordFamilyExpansion": [
      { "base": "decide", "family": ["decision", "decisive", "undecided"] }
    ],
    "falseFriends": [
      { "word": "actually", "l1Meaning": "currently (L1 sense)", "actualMeaning": "in fact", "warning": "Comparison warning" }
    ]
  },
  "cefrLevel": {
    "level": "A1 | A2 | B1 | B2 | C1 | C2",
    "targetLevelProjection": "Concrete advice for reaching the next band, naming the vocabulary gap",
    "missingWordsList": ["word or structure the learner needed but did not have"]
  },
  "advancedVocab": {
    "idiomsPhrasalDashboard": {
      "attempted": 2,
      "usedCorrectly": 1,
      "list": [
        { "idiom": "put off", "definition": "to postpone", "status": "attempted | correct | recommended" }
      ]
    }
  },
  "synonymSuggestions": [
    {
      "studentSpoke": "the plain phrase ${learner} actually used",
      "formalVersion": "higher-register alternative",
      "casualVersion": "more conversational alternative",
      "note": "brief usage note"
    }
  ],
  "grammarInsights": {
    "mistakes": [
      {
        "id": "unique_id_1",
        "timestamp": "00:15",
        "type": "article | preposition | subject-verb agreement | tense | word choice | pronunciation",
        "error": "EXACTLY what ${learner} said, mistakes intact",
        "correction": "the accurate version",
        "explanation": "why the original is wrong",
        "ruleId": "rule_sv_agreement",
        "persistenceCount": 2
      }
    ],
    "ruleBank": [
      { "id": "rule_sv_agreement", "title": "Rule Card: Subject-Verb Agreement", "content": "Short teachable rule text." }
    ],
    "positiveReinforcement": ["A genuinely complex structure ${learner} produced flawlessly"]
  },
  "speakingMetrics": {
    "speakingTimeRatio": { "student": 55, "tutor": 45 },
    "turnTakingFairnessScore": 85,
    "fillerWordDensity": {
      "averageDensity": 2.4,
      "trendData": [ { "minute": 1, "count": 2 } ],
      "fillerWords": [ { "word": "um", "count": 3 } ]
    },
    "standoutSentence": {
      "sentence": "${learner}'s most impressive sentence, verbatim",
      "analysis": "What makes it work structurally",
      "structurallySound": true
    }
  },
  "pronunciationFeedback": [
    { "word": "mispronounced word", "phoneticGuidance": "IPA or phonetic guide", "mispronounced": true, "timestamp": "01:20" }
  ],
  "connectedFeatures": {
    "dailyExercises": [
      {
        "day": 1,
        "type": "drag-drop | fill-blank | multiple-choice",
        "question": "task built on this lesson's actual mistakes",
        "options": ["option A", "option B", "option C"],
        "correctAnswer": "the answer",
        "explanation": "why, tied back to the rule"
      }
    ],
    "scenarios": [
      {
        "title": "Roleplay scenario title",
        "basic": { "description": "Simple version", "tasks": ["task 1"] },
        "intermediate": { "description": "Harder version", "tasks": ["task 1"] },
        "advanced": { "description": "Hardest version", "tasks": ["task 1"] }
      }
    ]
  }
}`;
};

/**
 * Build the single prompt the tutor pastes into an external AI.
 *
 * Everything the model needs is inlined — the learner facts, the transcript,
 * the rules, and the exact JSON contract — so the tutor never has to assemble
 * context by hand or explain the task twice.
 */
export const buildAnalysisPrompt = (student: StudentProfile, transcript: string): string => {
  const learner = student.name?.trim() || "the learner";
  const tutor = student.tutorName?.trim() || "the tutor";

  return `You are an elite language-teaching analyst. You are given one lesson transcript and one learner profile. Produce a deep, honest, pedagogically useful spoken-language report on the LEARNER only, and return it as a single JSON object.

${learnerBlock(student)}

RAW CLASS TRANSCRIPT
"""
${transcript?.trim() || "(empty — no transcript was pasted)"}
"""

${transcriptRules(student)}

CRITICAL PEDAGOGICAL DIRECTIVE
- Analyse ${learner} ONLY. ${tutor} is the tutor: acknowledge their turns so the conversation makes sense, but never report the tutor's grammar, vocabulary, CEFR level or pronunciation as a finding.
- Every item in "grammarInsights.mistakes", "pronunciationFeedback", "vocabulary", "cefrLevel", "synonymSuggestions" and the exercises must be something ${learner} actually said or demonstrably needs.
- Be specific and quote the learner's real words. Never invent a mistake that is not in the transcript, and never pad the report with generic advice.
- The "overusedWords" entries are words the learner used MORE THAN THREE TIMES. Count from the transcript.
- "turnTakingFairnessScore" is 0-100, where 100 means the learner talked 40-60% of the time.
- "fillerWordDensity.trendData" buckets filler words by lesson minute; "averageDensity" is fillers per minute.

${languageInstruction(student)}

OUTPUT FORMAT — return EXACTLY this shape, with every key present:

${jsonContract(student)}

Return VALID JSON ONLY. No markdown fences, no commentary, no "Here is the report". The first character must be { and the last must be }.`;
};

/**
 * Build the prompt that asks an external AI for the interactive HTML5 lesson
 * notes (the "Lesson Notes" tab), from the same transcript.
 */
export const buildLessonNotesPrompt = (student: StudentProfile, transcript: string): string => {
  const learner = student.name?.trim() || "the learner";
  const tutor = student.tutorName?.trim() || "the tutor";

  return `Act as an elite interactive curriculum designer and full-stack educational developer. Produce ONE self-contained, highly interactive HTML5 lesson based on what ${tutor} taught in the transcript below, personalised for ${learner}.

${learnerBlock(student)}

WHAT ${tutor} TAUGHT (raw, messy transcript — reconstruct the intent, ignore transcription noise)
"""
${transcript?.trim() || "(empty — no transcript was pasted)"}
"""

DESIGN REQUIREMENTS
1. DESIGN & STRUCTURE
   - Polished, modern containers: rounded panels, soft shadows, clear typographic hierarchy.
   - Use inline utility-style CSS or a single <style> block — the file must render with no network access.
   - Coloured side cards, alert boxes, "Expert Insight" callouts and strategy highlights.
   - A header banner with the lesson objective, a "Masterclass" concept board with at least one comparison table, and a review checklist.
2. IMMERSIVE INTERACTIVITY
   - READ-ALOUD: a Web Speech API reader so the learner can hear sentences and vocabulary in a native accent.
   - CONCEPT CHECKING (CCQs): at least 3 multiple-choice items with clickable answers that flash green/red and slide open an explanation panel.
   - ROLEPLAY PRACTICE: a short dialogue with clickable branches that show different outcomes.
3. CONTENT ACCURACY
   - Build the exercises on what was ACTUALLY taught and on ${learner}'s real difficulties, not on generic grammar.
   - Use realistic free stock image URLs (e.g. Unsplash) as visual anchors, with descriptive alt text.
   - All JavaScript must be inline and dependency-free.

OUTPUT
Return ONLY the raw HTML for the lesson component. Do not wrap it in <html>, <head> or <body>, and do not use markdown fences. Start with a root element such as <div> or <article> and end with its closing tag.`;
};

/* ------------------------------------------------------------------ *
 * Small helpers used by the UI
 * ------------------------------------------------------------------ */

/** Rough word count of a pasted transcript, for the UI's progress hint. */
export const countWords = (text: string): number =>
  (text.match(/\b[\w'’-]+\b/g) || []).length;

/** A short, human label for where a handoff came from. */
export const handoffSourceLabel = (source?: string): string => {
  if (!source) return "the learner profile";
  return source;
};
