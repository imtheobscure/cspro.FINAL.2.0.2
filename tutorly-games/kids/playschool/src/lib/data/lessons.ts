import { CHANT_MAP } from "./chants";
import { UNIT_MAP, WORD_MAP, unitTheme, label } from "./index";
import { registerPhrase, t } from "./phrases";
import { getCcqs, getDrills, sentenceFor } from "./ccq";
import { SOUND_MAP } from "./phonics";
import { WORDS } from "./index";
import type { Lang, Unit, Word } from "./types";

export type Step = {
  minutes: number;
  sayKey?: string;
  sayVars?: Record<string, string>;
  /** literal tutor script (target language) */
  script?: string;
  ccq?: string;
  /** what the child is expected to answer — always English for the tutor */
  expected?: string;
  action?: string;
  wordIds?: string[];
};

export type LessonStage = {
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
  linkedGames: { mode: string; labelKey: string; why: string }[];
};

const MATERIAL_POOL = [
  "a soft ball or rolled sock",
  "a small mirror (or the camera app)",
  "a sand tray, or a plate of flour/salt",
  "3 real objects from the unit (cup, toy, spoon…)",
  "a blanket for hiding games",
  "colouring pencils and one blank sheet",
  "a puppet or favourite soft toy",
  "an empty box",
];

const OBJECTIVE_TEMPLATES = [
  "Say {n} new {theme} words clearly.",
  "Point to the right picture when they hear the word.",
  "Answer simple Yes/No questions about {theme}.",
  "Use the sentence frame “{frame}” on their own.",
  "Follow one instruction with an action word.",
  "Count and name what they can see.",
  "Make the sound/action for each new word.",
  "Ask one simple question back to the tutor.",
];

function pickObjectives(unit: Unit, frame: string): string[] {
  const pool = [...OBJECTIVE_TEMPLATES];
  const out: string[] = [];
  const n = Math.min(4, unit.words.length);
  const wants = [0, 3, 1, 4];
  for (const i of wants) {
    out.push(
      pool[i]
        .replace("{n}", String(n))
        .replace("{theme}", t(unit.name, "en").toLowerCase())
        .replace("{frame}", frame),
    );
  }
  return out;
}

function stage2(unit: Unit, lang: Lang, mono: boolean): LessonStage {
  const steps: Step[] = [];
  const head = unit.words.slice(0, 4);
  head.forEach((wd, i) => {
    const ccqs = getCcqs(wd, lang);
    steps.push({
      minutes: 2,
      script: sentenceFor(wd, lang),
      sayKey: "frame.thisIs",
      sayVars: { w: label(wd, lang) },
      action: `Show the picture, then point to the real thing. Say it 3 times, louder each time.`,
      wordIds: [wd.id],
    });
    const q = ccqs[0];
    if (q) {
      steps.push({
        minutes: 1,
        ccq: t(q.key, lang, q.vars),
        expected: q.note ?? (q.type === "yesno" ? `${q.answer === "yes" ? "Yes" : "No"} + repeat the word` : "a one-word answer"),
      });
    }
    const d = getDrills(wd, lang)[i % 4];
    if (d) steps.push({ minutes: 1, sayKey: d.key, sayVars: d.vars, action: d.note });
    if (!mono && lang !== "en") steps.push({ minutes: 1, script: label(wd, "en"), action: "Give the English (or home-language) word once, then go straight back to the target language." });
  });
  return { key: "les.present", color: "#7fb2de", icon: "🎨", steps };
}

function stage5(unit: Unit, lang: Lang): LessonStage {
  const steps: Step[] = [
    { minutes: 3, action: "Spread 4–6 picture cards face up. Say one word — the child slaps the right card and says the word back." },
    { minutes: 3, action: "Hide one card behind your back. Ask “What is missing?” in the target language. Let the child peek and guess." },
    { minutes: 3, action: "Put 4 pictures in a row. Say them in order, then turn them over. The child repeats the order out loud." },
    { minutes: 2, action: "Roll a soft ball. Whoever catches it says the next word on the wall, or asks “Do you like…?”" },
    { minutes: 2, script: t("ccq.findInRoom", lang, { w: label(unit.words[0], lang) }), action: "Send the child (or the camera) to find the real object. Celebrate loudly." },
  ];
  return { key: "les.games", color: "#b394d6", icon: "🎲", steps };
}

/**
 * LESSON PLANS WRITTEN BY AN AI (or by the tutor) for a unit.
 *
 * PlaySchool already writes a complete six-stage lesson for every unit by itself.
 * A tutor can also paste one of their own — produced with the AI prompt on the
 * 📋 AI Prompt & JSON screen — and it layers on top of the generated plan: the AI
 * supplies the teaching (objectives, materials, stages, steps, extension, review)
 * and the generated plan keeps supplying everything that must stay in sync with
 * the game (the unit, its vocabulary, its theme colour, the linked game modes).
 *
 * Storing only the OVERRIDE (not a frozen lesson) is what lets a pasted plan
 * still follow a language switch, and lets a unit's words change later without
 * the plan going stale. customPack.ts persists it in localStorage under
 * `playschool.customLessons.v1` and calls `registerLesson()` on boot.
 */
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

/** Stage hues for AI-written stages (the tutor's own colour is honoured first). */
const STAGE_FALLBACK = ["#f5c453", "#7fb2de", "#8fbe9b", "#e86a8a", "#b394d6", "#35302a"];

/** Register a plan that arrived from pasted AI JSON (see lib/customPack.ts). */
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
        registerPhrase(key, stageTitleRow(st.title, base.stages[i % base.stages.length]?.key ?? "les.practise"));
        return {
          key,
          color: st.color && /^#[0-9a-f]{3,8}$/i.test(st.color) ? st.color : STAGE_FALLBACK[i % STAGE_FALLBACK.length],
          icon: st.icon || base.stages[i % base.stages.length]?.icon || "⭐",
          steps: st.steps,
        };
      })
    : base.stages;

  const vocab = o.vocab?.length
    ? o.vocab.map((id) => WORD_MAP[id]).filter((w): w is Word => Boolean(w))
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
function stageTitleRow(raw: Record<Lang, string> | string | undefined, fallbackKey: string): Record<Lang, string> {
  const en = typeof raw === "string" ? raw.trim() : raw?.en?.trim() || "";
  if (!en) return { en: t(fallbackKey, "en"), zh: t(fallbackKey, "zh"), fr: t(fallbackKey, "fr"), it: t(fallbackKey, "it"), de: t(fallbackKey, "de"), tr: t(fallbackKey, "tr") };
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

/** The plan PlaySchool writes by itself — the base a pasted plan is layered onto. */
export function autoLesson(unitId: string, lang: Lang, mono: boolean): LessonPlan | null {
  const unit = UNIT_MAP[unitId];
  if (!unit) return null;
  const theme = unitTheme(unitId);
  const chant = CHANT_MAP[theme.chantId];
  const lines = chant?.lines[lang] ?? chant?.lines.en ?? [];
  const vocab = unit.words;

  const letterUnits = unit.id === "alphabet";
  const soundRows = vocab.filter((w) => w.letter && SOUND_MAP[w.letter]).slice(0, 5);

  const warm: Step[] = [
    { minutes: 1, action: "Big smile, wave and say hello together. Use the same hello every single lesson so it becomes a routine." },
    ...(lines.length
      ? [
          {
            minutes: 2,
            script: lines[0],
            action: "Sing the theme chant with the actions. Point at the screen for each line. Repeat it twice.",
          } as Step,
        ]
      : []),
    {
      minutes: 2,
      action: "Play “Copy me”: clap 1, 2 or 3 times. The child copies and counts out loud in the target language.",
    },
    {
      minutes: 1,
      action: "Weather + feelings check: “How are you today?” — the child picks a face and says “I am …”.",
      ccq: t("ccq.isHappy", lang),
      expected: "the feeling word + “I am …”",
    },
  ];

  const practise: Step[] = [
    { minutes: 2, action: "Point-and-say: the tutor says the word, the child points at the picture and repeats. Do all words once." },
    { minutes: 2, action: "Flip it: the tutor points silently, the child says the word alone. Praise every attempt — sound first, perfection later." },
    { minutes: 2, action: "Odd one out: show 3 pictures from this unit + 1 from another unit. Ask “Which one is different?”" },
    { minutes: 2, ccq: t("ccq.pointTo", lang, { w: label(vocab[1] ?? vocab[0], lang) }), expected: "the child points and says the word", action: "Cover the screen and ask from memory." },
    { minutes: 2, action: "Slow/fast game: say the word slowly (stretch it), then super fast. The child copies both ways — great for pronunciation." },
    { minutes: 2, action: "Whisper game: whisper the word, then shout it. Add a gesture for every word — movement locks it in." },
  ];

  const produce: Step[] = [
    { minutes: 2, sayKey: "frame.thisIs", sayVars: { w: label(vocab[0], lang) }, action: "Model the sentence frame, then pass it over: the child says the whole sentence about 3 pictures." },
    { minutes: 2, ccq: t("ccq.doYouLike", lang, { w: label(vocab[2] ?? vocab[0], lang) }), expected: "“Yes, I do” / “No, I don't” + the word", action: "Use real photos of the child's own family/pets if you can — engagement doubles." },
    { minutes: 2, action: "Role reversal: the child is the teacher and asks YOU. Being the teacher is hugely motivating at this age." },
    { minutes: 2, action: "Guessing game: the tutor describes (“It is big. It is grey.”), the child names it. Then swap roles." },
  ];

  const wrap: Step[] = [
    { minutes: 1, action: "Quick review: run through the word wall one last time at speed. Count the stars together." },
    { minutes: 1, action: "Tidy-up song + goodbye routine. Same words every lesson: “Bye-bye! See you next time!”" },
    { minutes: 1, action: "Tell the parent ONE thing the child said well today, in the target language, so it can be practised at home." },
  ];

  const stages: LessonStage[] = [
    { key: "les.warmup", color: "#f5c453", icon: "👋", steps: warm },
    stage2(unit, lang, mono),
    { key: "les.practise", color: "#8fbe9b", icon: "🖐️", steps: practise },
    { key: "les.produce", color: "#e86a8a", icon: "💬", steps: produce },
    stage5(unit, lang),
    { key: "les.wrapup", color: "#35302a", icon: "🎁", steps: wrap },
  ];

  if (letterUnits) {
    stages.splice(2, 0, {
      key: "les.practise",
      color: "#8fbe9b",
      icon: "✍️",
      steps: soundRows.map((wd) => {
        const s = SOUND_MAP[wd.letter!];
        return {
          minutes: 2,
          script: `${wd.letter} — /${s.sound}/ — ${label(WORD_MAP[s.ex] ?? wd, lang)}`,
          action: `Trace the letter in the air, then on the floor with a finger. Action: ${s.action}.`,
          wordIds: [wd.id],
        } as Step;
      }),
    });
  }

  const totalMinutes = stages.reduce((a, st) => a + st.steps.reduce((b, s2) => b + s2.minutes, 0), 0);

  const materials = [
    ...MATERIAL_POOL.slice(0, 3),
    unit.words.some((w) => w.k === "food") ? "real fruit or a plate for tasting" : "a mirror for face games",
  ];

  return {
    unit,
    themeId: theme.id,
    themeNameKey: theme.name,
    color: theme.color,
    objectives: pickObjectives(unit, sentenceFor(vocab[0], lang)),
    materials,
    vocab,
    stages,
    totalMinutes,
    extension: `Ask the child to teach ${vocab.length > 2 ? 3 : 2} of today's words to someone at home. Next lesson, they are the teacher.`,
    review: [
      label(vocab[0], lang),
      label(vocab[1] ?? vocab[0], lang),
      label(vocab[2] ?? vocab[0], lang),
      sentenceFor(vocab[0], lang),
    ],
    linkedGames: [
      { mode: "trace", labelKey: "mode.trace", why: "Handwriting + letter sounds" },
      { mode: "echo", labelKey: "mode.echo", why: "Pronunciation and confidence" },
      { mode: "scavenger", labelKey: "mode.scavenger", why: "Find the words in the real world" },
      { mode: "train", labelKey: "mode.train", why: "Build full sentences" },
    ],
  };
}

/**
 * Every unit a lesson can be attached to, LIVE.
 *
 * This must be a function, not a const: `UNIT_MAP` grows when a tutor installs a
 * category from pasted JSON (see lib/customPack.ts), so a snapshot taken at module
 * load would reject a lesson plan written for a unit they added themselves.
 */
export function allUnitIds(): string[] {
  return Object.keys(UNIT_MAP);
}

/** Lesson-ready grouping: which units suit which game best. */
export const GAME_UNITS: Record<string, string[]> = {
  trace: ["alphabet", "numbers1to10", "numbers11to20", "shapes", "colors"],
  echo: ["family", "feelings", "pets", "farm", "wild"],
  smoothie: ["alphabet", "fruitveg", "food", "body", "clothes"],
  scavenger: ["colors", "shapes", "numbers1to10", "toys", "body", "food", "clothes", "feelings", "plants"],
  mirror: ["feelings", "senses", "body", "family"],
  charade: ["actions", "routine", "opposites", "senses", "hobbies"],
  train: ["food", "family", "toys", "places", "vehicles", "pets"],
  dollhouse: ["rooms", "furniture", "opposites", "toys"],
  dressing: ["clothes", "colors", "opposites", "body"],
};

export const DICT_WORDS = WORDS;
