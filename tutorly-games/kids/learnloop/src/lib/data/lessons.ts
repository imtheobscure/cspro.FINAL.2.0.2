import { CHANT_MAP } from "./chants";
import { getCcqs, getDrills, sentenceFor } from "./ccq";
import { PHRASES, t } from "./phrases";
import { UNIT_MAP, WORDS, label, unitTheme } from "./index";
import type { Lang, Unit, Word } from "./types";

/**
 * LESSON PLANS — LearnLoop's own plan per unit, plus the tutor's own.
 *
 * Every unit already has a plan LearnLoop writes by itself: a timed run through
 * the teaching arc (warm-up → meet the words → talk → practise → chant → wrap
 * up) whose steps are built from the unit's OWN material — its words, its
 * concept-check questions, its repetition drills and its theme chant. Nothing
 * here is invented filler: every step names the words it teaches.
 *
 * A tutor can then paste a plan of their own, produced with the AI prompt on the
 * 📋 AI Prompt & JSON screen. It layers on top: the AI supplies the teaching
 * (objectives, materials, stages, steps, extension, review) and this file keeps
 * supplying everything that must stay in sync with the game — the unit, its
 * vocabulary, its theme colour, the linked modes.
 *
 * Only the OVERRIDE is stored, never a frozen lesson. That is what lets a pasted
 * plan keep following a language switch, and lets a unit's words change later
 * without the plan going stale. customPack.ts persists it in localStorage under
 * `learnloop.customLessons.v1` and calls `registerLesson()` on boot.
 */

export type Step = {
  minutes: number;
  /** literal tutor script, in the language being taught */
  script?: string;
  /** concept-check question */
  ccq?: string;
  /** what the child answers — English, so the tutor can read it at a glance */
  expected?: string;
  /** the physical move: a gesture, a toy, a walk to the window */
  action?: string;
  wordIds?: string[];
};

export type LessonStage = {
  /** i18n phrase key */
  key: string;
  color: string;
  icon: string;
  steps: Step[];
};

export type LessonPlan = {
  unit: Unit;
  themeId: string;
  themeNameKey: string;
  color: string;
  objectives: string[];
  materials: string[];
  vocab: Word[];
  stages: LessonStage[];
  totalMinutes: number;
  extension: string;
  review: string[];
  /** the modes this plan points the tutor at, in order */
  linkedModes: string[];
};

const MATERIAL_POOL = [
  "a soft ball or a rolled sock",
  "a small mirror (or the front camera)",
  "a basket of 4–6 real objects from this unit",
  "a picture card for every target word",
  "colouring pencils and one blank sheet",
  "a puppet or favourite soft toy",
  "an empty box to hide things in",
];

const OBJECTIVES = [
  "Say {n} new words from {unit} clearly.",
  "Point to the right picture when they hear the word.",
  "Answer Yes/No questions about {unit}.",
  "Use the sentence frame “{frame}” on their own.",
  "Ask one simple question back to the tutor.",
];

/** Six stages, the same arc every time so a child knows what comes next. */
const STAGE_COLORS = ["#f5c453", "#7fb2de", "#e86a8a", "#8fbe9b", "#b394d6", "#35302a"];

function objectivesFor(unit: Unit, frame: string): string[] {
  const n = Math.min(6, unit.words.length);
  return OBJECTIVES.map((s) =>
    s.replace("{n}", String(n)).replace("{unit}", t(unit.name, "en")).replace("{frame}", frame),
  );
}

function warmUp(unit: Unit, theme: ReturnType<typeof unitTheme>, lang: Lang): LessonStage {
  const chant = CHANT_MAP[theme.chantId];
  const lines = chant?.lines[lang] ?? chant?.lines.en ?? [];
  const steps: Step[] = [
    {
      minutes: 2,
      script: t("frame.thisIs", lang, { w: label(unit.words[0], lang) }),
      expected: "The child waves and answers with one word.",
      action: "Same hello every lesson: big wave, then the child copies it. Then name the two words you will learn today.",
      wordIds: unit.words.slice(0, 2).map((w) => w.id),
    },
    {
      minutes: 1,
      action: "Clap 1, 2 or 3 times — the child copies and counts out loud. It settles them and warms up the mouth.",
    },
  ];
  if (lines.length) {
    steps.push({
      minutes: 2,
      script: lines[0],
      action: `Sing the “${t(theme.name, "en")}” chant once with actions, then let the child join in on the second run.`,
    });
  }
  return { key: "les.warmup", color: STAGE_COLORS[0], icon: "👋", steps };
}

function meetTheWords(unit: Unit, lang: Lang, mono: boolean): LessonStage {
  // Four words is a full presentation block for this age group; a longer unit is
  // covered by the practise and chant stages instead of a longer sit-down.
  const steps: Step[] = [];
  unit.words.slice(0, 4).forEach((word) => {
    steps.push({
      minutes: 2,
      script: sentenceFor(word, lang),
      action: "Show the card, say the word three times (loud, quiet, slow) and have the child repeat each time.",
      wordIds: [word.id],
    });
    const drill = getDrills(word, lang)[2];
    if (drill) {
      steps.push({
        minutes: 1,
        ccq: t(drill.key, lang, drill.vars),
        expected: "The child repeats the word in that voice.",
        action: drill.note ?? "Keep it playful — the child copies your voice exactly.",
        wordIds: [word.id],
      });
    }
    if (!mono && lang !== "en") {
      steps.push({
        minutes: 1,
        script: label(word, "en"),
        expected: "The child listens, then says it again in the language they are learning.",
        action: "Give the tutor's language ONCE, then go straight back to the target language.",
        wordIds: [word.id],
      });
    }
  });
  return { key: "les.learn", color: STAGE_COLORS[1], icon: "🃏", steps };
}

function talkTime(unit: Unit, lang: Lang): LessonStage {
  const steps: Step[] = [];
  unit.words.slice(0, 4).forEach((word) => {
    const q = getCcqs(word, lang)[0];
    if (!q) return;
    steps.push({
      minutes: 1,
      ccq: t(q.key, lang, q.vars),
      expected:
        q.type === "yesno"
          ? `${q.answer === "yes" ? "Yes" : "No"} — then repeat the word.`
          : q.type === "choice"
            ? "The child picks the right option and says it."
            : (q.note ?? "A full sentence, or at least two words."),
      action: "Praise the try, not just the right answer, then move on quickly.",
      wordIds: [word.id],
    });
  });
  steps.push({
    minutes: 2,
    ccq: t("ccq.findInRoom", lang, { w: label(unit.words[0], lang) }),
    expected: "The child points at or fetches the real thing.",
    action: "Send them (or the camera) to find the real object. Celebrate loudly when they do.",
  });
  return { key: "les.talk", color: STAGE_COLORS[2], icon: "💬", steps };
}

function practise(unit: Unit, lang: Lang): LessonStage {
  const ids = unit.words.slice(0, 4).map((w) => w.id);
  return {
    key: "les.practise",
    color: STAGE_COLORS[3],
    icon: "🧲",
    steps: [
      { minutes: 3, action: "Open 🧲 Match It with these four words: the child drags each word onto its picture.", wordIds: ids },
      { minutes: 2, action: "Open 🂠 Memory with the same four words. Say the word out loud every time a pair is turned over.", wordIds: ids },
      { minutes: 2, action: "Say one word while the child's eyes are closed, then ask which one is missing from the row.", wordIds: ids },
    ],
  };
}

function chant(unit: Unit, theme: ReturnType<typeof unitTheme>, lang: Lang): LessonStage {
  const lines = CHANT_MAP[theme.chantId]?.lines[lang] ?? [];
  const steps: Step[] = [
    ...lines.slice(0, 2).map((line) => ({
      minutes: 2,
      script: line,
      action: "One line at a time, clapping the beat. Then the whole chant together, twice.",
    })),
    { minutes: 2, action: `Open 🎵 Chant and run the words of ${t(unit.name, "en")} as a call-and-response.`, wordIds: unit.words.slice(0, 5).map((w) => w.id) },
  ];
  return { key: "les.chant", color: STAGE_COLORS[4], icon: "🎵", steps };
}

function wrapUp(unit: Unit, lang: Lang): LessonStage {
  const words = unit.words.slice(0, 4);
  const steps: Step[] = [
    { minutes: 2, ccq: t("ccq.whatIsThis", lang), expected: "The child names each card on their own.", action: "Lay the cards out and point at them one last time. No prompting this round.", wordIds: words.map((w) => w.id) },
    { minutes: 1, ccq: t("say.ask", lang), expected: "The child asks you one of the questions.", action: "Role reversal: hand the question cards to the child." },
    { minutes: 1, script: t("ui.great", lang), action: "Say goodbye exactly the same way every lesson, then tell the grown-up which words to practise before next time." },
  ];
  return { key: "les.wrap", color: STAGE_COLORS[5], icon: "⭐", steps };
}

/* ═════════════════════ the pasted plan ═════════════════════ */

export type LessonOverride = {
  /** AI-written stage titles, one row per language. */
  stages?: { title?: Record<Lang, string> | string; icon?: string; color?: string; steps: Step[] }[];
  objectives?: string[];
  materials?: string[];
  extension?: string;
  review?: string[];
  /** Word ids the AI wants highlighted; anything unknown falls back to the unit. */
  vocab?: string[];
  source?: "ai" | "tutor";
};

const CUSTOM_LESSONS: Record<string, LessonOverride> = {};

export function registerLesson(unitId: string, override: LessonOverride): void {
  CUSTOM_LESSONS[unitId] = override;
}

export function unregisterLesson(unitId: string): void {
  delete CUSTOM_LESSONS[unitId];
}

export function hasCustomLesson(unitId: string): boolean {
  return Boolean(CUSTOM_LESSONS[unitId]);
}

export function customLessonIds(): string[] {
  return Object.keys(CUSTOM_LESSONS);
}

/**
 * Every unit a lesson can be attached to, LIVE.
 *
 * A function, not a const: `UNIT_MAP` grows when a tutor installs a theme from
 * pasted JSON, and a snapshot taken at module load would reject a plan written
 * for a unit they added themselves.
 */
export function allUnitIds(): string[] {
  return Object.keys(UNIT_MAP);
}

/** Build a full, tutor-ready lesson plan for one unit (a pasted plan wins). */
export function buildLesson(unitId: string, lang: Lang, mono: boolean): LessonPlan | null {
  const base = autoLesson(unitId, lang, mono);
  if (!base) return null;
  const override = CUSTOM_LESSONS[unitId];
  return override ? applyOverride(base, unitId, override) : base;
}

/** Lay a pasted plan over the generated one, keeping the game-linked fields. */
function applyOverride(base: LessonPlan, unitId: string, o: LessonOverride): LessonPlan {
  const stages: LessonStage[] = o.stages?.length
    ? o.stages.map((st, i) => {
        const key = `les.x.${unitId}.${i}`;
        PHRASES[key] = stageTitleRow(st.title, base.stages[i % base.stages.length]?.key ?? "les.practise");
        return {
          key,
          color: st.color && /^#[0-9a-f]{3,8}$/i.test(st.color) ? st.color : STAGE_COLORS[i % STAGE_COLORS.length],
          icon: st.icon || base.stages[i % base.stages.length]?.icon || "⭐",
          steps: st.steps,
        };
      })
    : base.stages;

  const vocab = o.vocab?.length
    ? o.vocab.map((id) => WORDS.find((w) => w.id === id)).filter((w): w is Word => Boolean(w))
    : base.vocab;

  return {
    ...base,
    objectives: o.objectives?.length ? o.objectives : base.objectives,
    materials: o.materials?.length ? o.materials : base.materials,
    vocab: vocab.length ? vocab : base.vocab,
    stages,
    totalMinutes: stages.reduce((a, st) => a + st.steps.reduce((b, s2) => b + s2.minutes, 0), 0),
    extension: o.extension?.trim() || base.extension,
    review: o.review?.length ? o.review : base.review,
  };
}

/** A pasted stage title in every language; untranslated rows reuse the English one. */
function stageTitleRow(
  raw: Record<Lang, string> | string | undefined,
  fallbackKey: string,
): Record<Lang, string> {
  const en = typeof raw === "string" ? raw.trim() : raw?.en?.trim() || "";
  if (!en) {
    return {
      en: t(fallbackKey, "en"),
      zh: t(fallbackKey, "zh"),
      fr: t(fallbackKey, "fr"),
      it: t(fallbackKey, "it"),
      de: t(fallbackKey, "de"),
      tr: t(fallbackKey, "tr"),
    };
  }
  const src = typeof raw === "string" ? undefined : raw;
  return {
    en,
    zh: src?.zh?.trim() || en,
    fr: src?.fr?.trim() || en,
    it: src?.it?.trim() || en,
    de: src?.de?.trim() || en,
    tr: src?.tr?.trim() || en,
  };
}

/** The plan LearnLoop writes by itself — the base a pasted plan is layered onto. */
export function autoLesson(unitId: string, lang: Lang, mono: boolean): LessonPlan | null {
  const unit = UNIT_MAP[unitId];
  if (!unit) return null;
  const theme = unitTheme(unitId);
  if (!theme) return null;

  const stages: LessonStage[] = [
    warmUp(unit, theme, lang),
    meetTheWords(unit, lang, mono),
    talkTime(unit, lang),
    practise(unit, lang),
    chant(unit, theme, lang),
    wrapUp(unit, lang),
  ];

  // `frame` is a phrase key on the built-in themes and a literal sentence on an
  // imported one — `t()` returns the key unchanged when there is no row, so
  // resolving it covers both.
  const frame = theme.frame ? t(theme.frame, "en", { w: "…" }) : "This is a …";
  const review = unit.words.slice(0, 4).map((w) => sentenceFor(w, lang));

  return {
    unit,
    themeId: theme.id,
    themeNameKey: theme.name,
    color: theme.color,
    objectives: objectivesFor(unit, frame),
    materials: MATERIAL_POOL.slice(0, 4),
    vocab: unit.words,
    stages,
    totalMinutes: stages.reduce((a, st) => a + st.steps.reduce((b, s) => b + s.minutes, 0), 0),
    extension: `Before next time, ask the grown-up to point at ${unit.words
      .slice(0, 2)
      .map((w) => t("frame.thisIs", "en", { w: label(w, "en") }))
      .join(" and ")} round the house.`,
    review,
    linkedModes: ["learn", "talk", "match", "memory", "chant", "quiz"],
  };
}
