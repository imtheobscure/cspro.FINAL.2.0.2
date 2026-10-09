import { chantFor, ccqFor, ui } from "./i18n";
import { Kind, Lang, Theme, Word } from "./types";

/**
 * LESSON PLANS — WordPop's own plan per topic, plus the tutor's own.
 *
 * Every topic already has a plan WordPop writes by itself: a timed run through
 * the arc this game already teaches in (warm-up → meet the words → chant →
 * match & memory → quiz → wrap up) whose steps are built from the topic's OWN
 * material — its words, the concept-check questions `ccqFor()` generates, the
 * clap-along chant `chantFor()` writes, and the six activities the child can
 * actually play. Nothing here is invented filler: every step names its words.
 *
 * A tutor can then paste a plan of their own, made with the AI prompt on the
 * 📋 AI Prompt & JSON screen. It layers on top: the AI supplies the teaching
 * (objectives, materials, stages, steps, extension, review) and this file keeps
 * supplying the things that must stay in sync with the game — the topic, its
 * words, its colour.
 *
 * Only the OVERRIDE is stored, never a frozen lesson: a pasted plan keeps
 * following a language switch, and editing a topic's words later never leaves
 * the plan stale. customPack.ts persists it under `wordpop.customLessons.v1`.
 *
 * NOTE ON SHAPE: WordPop's library is the built-in `THEMES` PLUS whatever the
 * tutor installed from pasted JSON, and the two are merged in a React hook
 * (`useCatalogue`). So the theme is passed IN here rather than looked up
 * globally — that is what lets a plan be written for an imported topic.
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
  /** already-localised stage title */
  title: Record<Lang, string>;
  color: string;
  icon: string;
  steps: Step[];
};

export type LessonPlan = {
  theme: Theme;
  color: string;
  objectives: string[];
  materials: string[];
  vocab: Word[];
  stages: LessonStage[];
  totalMinutes: number;
  extension: string;
  review: string[];
  /** the activities this plan points the tutor at, in order */
  linkedActivities: string[];
};

const LANG_TAG: Record<Lang, string> = {
  en: "English",
  zh: "Chinese",
  fr: "French",
  it: "Italian",
  de: "German",
  tr: "Turkish",
};

const MATERIAL_POOL = [
  "a soft ball or a rolled sock",
  "a small mirror (or the front camera)",
  "a basket of 4–6 real objects from this topic",
  "a picture card for every target word",
  "colouring pencils and one blank sheet",
  "a puppet or favourite soft toy",
  "an empty box to hide things in",
];

/** Stage colours, straight from the game's own palette (see app/globals.css). */
const STAGE_COLORS = ["#f5c453", "#7fb2de", "#e86a8a", "#8fbe9b", "#b394d6", "#35302a"];

/** Stage titles in all six languages, so a pasted plan's names are translatable. */
const STAGE_TITLES: Record<string, Record<Lang, string>> = {
  warmup: { en: "Warm-up", zh: "热身", fr: "Échauffement", it: "Riscaldamento", de: "Aufwärmen", tr: "Isınma" },
  learn: { en: "Meet the words", zh: "认识单词", fr: "Découvrir les mots", it: "Conosci le parole", de: "Wörter kennenlernen", tr: "Kelimeleri tanı" },
  chant: { en: "Chant", zh: "歌谣", fr: "Comptine", it: "Filastrocca", de: "Sprechgesang", tr: "Tekerleme" },
  practise: { en: "Match & memory", zh: "配对与记忆", fr: "Associer et mémoire", it: "Abbina e memory", de: "Zuordnen & Memory", tr: "Eşleştir ve hafıza" },
  quiz: { en: "Quiz", zh: "小测验", fr: "Quiz", it: "Quiz", de: "Quiz", tr: "Bilmece" },
  wrap: { en: "Wrap up", zh: "总结", fr: "Bilan", it: "Conclusione", de: "Abschluss", tr: "Kapanış" },
};

export function stageTitle(key: keyof typeof STAGE_TITLES, lang: Lang): string {
  return STAGE_TITLES[key][lang] ?? STAGE_TITLES[key].en;
}

/** The stage arc in teaching order — what the AI prompt asks the AI to follow. */
export const STAGE_ORDER: (keyof typeof STAGE_TITLES)[] = [
  "warmup",
  "learn",
  "chant",
  "practise",
  "quiz",
  "wrap",
];

/** `["Warm-up", "Meet the words", …]` — the headings a pasted plan may rename. */
export function defaultStageNames(): string[] {
  return STAGE_ORDER.map((k) => STAGE_TITLES[k].en);
}

export function stageTitleRow(key: keyof typeof STAGE_TITLES): Record<Lang, string> {
  return { ...STAGE_TITLES[key] };
}

const OBJECTIVES: Record<Lang, string[]> = {
  en: [
    "Say {n} new words from {topic} clearly.",
    "Point to the right picture when they hear the word.",
    "Join in the chant and clap the beat.",
    "Match each word to its picture on their own.",
    "Answer one simple question about each word.",
  ],
  zh: [
    "清楚地说出 {topic} 的 {n} 个新词。",
    "听到单词时能指出对应的图片。",
    "一起念歌谣并拍手打节拍。",
    "独立把每个词和图片配对。",
    "就每个词回答一个简单问题。",
  ],
  fr: [
    "Dire clairement {n} nouveaux mots de {topic}.",
    "Montrer la bonne image en entendant le mot.",
    "Reprendre la comptine en tapant le rythme.",
    "Associer chaque mot à son image seul.",
    "Répondre à une question simple sur chaque mot.",
  ],
  it: [
    "Dire chiaramente {n} parole nuove di {topic}.",
    "Indicare l'immagine giusta sentendo la parola.",
    "Unirsi alla filastrocca battendo il tempo.",
    "Abbinare da solo ogni parola alla sua immagine.",
    "Rispondere a una domanda semplice su ogni parola.",
  ],
  de: [
    "{n} neue Wörter aus {topic} klar sagen.",
    "Beim Hören auf das richtige Bild zeigen.",
    "Beim Sprechgesang mitklatschen.",
    "Jedes Wort allein seinem Bild zuordnen.",
    "Eine einfache Frage zu jedem Wort beantworten.",
  ],
  tr: [
    "{topic} konusundan {n} yeni kelimeyi net söyle.",
    "Kelimeyi duyunca doğru resmi göster.",
    "Tekerlemeye katılıp ritimle alkışla.",
    "Her kelimeyi kendi başına resmiyle eşleştir.",
    "Her kelime hakkında basit bir soruya cevap ver.",
  ],
};

function objectivesFor(theme: Theme, lang: Lang): string[] {
  const n = Math.min(6, theme.words.length);
  const topic = theme.title[lang] ?? theme.title.en;
  return OBJECTIVES[lang].map((s) => s.replace("{n}", String(n)).replace("{topic}", topic));
}

/* ── the six stages ── */

function warmUp(theme: Theme, lang: Lang): LessonStage {
  const first = theme.words[0];
  return {
    title: stageTitleRow("warmup"),
    color: STAGE_COLORS[0],
    icon: "👋",
    steps: [
      {
        minutes: 2,
        script: ui(lang, "letsLearn"),
        expected: "The child waves and answers with one word.",
        action: `Same hello every lesson: big wave, the child copies it, then name the topic: “${theme.title[lang] ?? theme.title.en}”.`,
        wordIds: first ? [first.id] : undefined,
      },
      {
        minutes: 1,
        action: "Clap 1, 2 or 3 times — the child copies and counts out loud. It settles them and warms up the mouth.",
      },
    ],
  };
}

function meetTheWords(theme: Theme, lang: Lang, support: Lang | "none"): LessonStage {
  const steps: Step[] = [];
  // Three words is a full presentation block at this age (about ten minutes
  // with their questions); a richer topic is covered by the chant and the game
  // stages instead of a longer sit-down.
  theme.words.slice(0, 3).forEach((word) => {
    const ccqs = ccqFor(lang, word, theme.kind);
    steps.push({
      minutes: 2,
      script: word.t[lang] ?? word.t.en,
      action: "Show the card, say the word three times (loud, quiet, slow) and have the child repeat each time.",
      wordIds: [word.id],
    });
    if (ccqs[0]) {
      steps.push({
        minutes: 1,
        ccq: ccqs[0],
        expected: "A word or a short answer — the point is that they speak.",
        action: "Praise the try, not just the right answer, then move on quickly.",
        wordIds: [word.id],
      });
    }
    if (support !== "none" && support !== lang) {
      steps.push({
        minutes: 1,
        script: word.t[support],
        action: `Give the ${LANG_TAG[support]} word once, then go straight back to the language being taught.`,
        wordIds: [word.id],
      });
    }
  });
  return { title: stageTitleRow("learn"), color: STAGE_COLORS[1], icon: "🖼️", steps };
}

function chantStage(theme: Theme, lang: Lang): LessonStage {
  const verses = chantFor(lang, theme.words.slice(0, 5), theme.kind);
  const steps: Step[] = verses.slice(0, 2).flatMap((v) => [
    { minutes: 1, script: v.lines[0], action: "Clap the beat and say the line together, twice.", wordIds: [v.word.id] },
    { minutes: 1, script: v.lines[1], action: "Second line with a big gesture — point at the card as you say it.", wordIds: [v.word.id] },
  ]);
  steps.push({
    minutes: 2,
    action: "Open 🎵 Chant and run the whole topic as a call-and-response: you say the line, the child answers.",
    wordIds: theme.words.slice(0, 5).map((w) => w.id),
  });
  return { title: stageTitleRow("chant"), color: STAGE_COLORS[2], icon: "🎵", steps };
}

function practise(theme: Theme, lang: Lang): LessonStage {
  const ids = theme.words.slice(0, 4).map((w) => w.id);
  return {
    title: stageTitleRow("practise"),
    color: STAGE_COLORS[3],
    icon: "🧩",
    steps: [
      { minutes: 3, action: "Open 🧩 Match with these four words: the child drags each word onto its picture.", wordIds: ids },
      { minutes: 2, action: "Open 👂 Touch it! with the same words — the child hears a word and touches the right picture.", wordIds: ids },
      { minutes: 1, action: "Say one word while the child's eyes are closed, then ask which one is missing from the row.", wordIds: ids },
    ],
  };
}

function quizStage(theme: Theme, lang: Lang): LessonStage {
  const ids = theme.words.slice(0, 5).map((w) => w.id);
  return {
    title: stageTitleRow("quiz"),
    color: STAGE_COLORS[4],
    icon: "❓",
    steps: [
      { minutes: 3, action: "Open ❓ Quiz and let the child answer four in a row without help.", wordIds: ids },
      {
        minutes: 2,
        ccq: ccqFor(lang, theme.words[0], theme.kind)[0],
        expected: "The child answers on their own this time.",
        action: "No prompting this round — let them think, then celebrate either way.",
        wordIds: ids.slice(0, 2),
      },
    ],
  };
}

function wrapUp(theme: Theme, lang: Lang): LessonStage {
  const ids = theme.words.slice(0, 4).map((w) => w.id);
  return {
    title: stageTitleRow("wrap"),
    color: STAGE_COLORS[5],
    icon: "⭐",
    steps: [
      {
        minutes: 2,
        action: "Open 🃏 Memory for one last, easy win — the child finds the pairs they already know.",
        wordIds: ids,
      },
      { minutes: 1, ccq: ui(lang, "whatIsThis"), expected: "The child names each card on their own.", action: "Lay the cards out and point at them one last time.", wordIds: ids },
      { minutes: 1, script: ui(lang, "greatJob"), action: "Say goodbye exactly the same way every lesson, then tell the grown-up which words to practise before next time." },
    ],
  };
}

/* ═════════════════════ the pasted plan ═════════════════════ */

export type LessonOverride = {
  /** AI-written stage titles, one row per language. */
  stages?: { title?: Record<Lang, string> | string; icon?: string; color?: string; steps: Step[] }[];
  objectives?: string[];
  materials?: string[];
  extension?: string;
  review?: string[];
  /** Word ids the AI wants highlighted; anything unknown falls back to the topic. */
  vocab?: string[];
  source?: "ai" | "tutor";
};

const CUSTOM_LESSONS: Record<string, LessonOverride> = {};

export function registerLesson(themeId: string, override: LessonOverride): void {
  CUSTOM_LESSONS[themeId] = override;
}

export function unregisterLesson(themeId: string): void {
  delete CUSTOM_LESSONS[themeId];
}

export function hasCustomLesson(themeId: string): boolean {
  return Boolean(CUSTOM_LESSONS[themeId]);
}

export function customLessonIds(): string[] {
  return Object.keys(CUSTOM_LESSONS);
}

/** Build a full, tutor-ready lesson plan for one topic (a pasted plan wins). */
export function buildLesson(
  theme: Theme,
  lang: Lang,
  support: Lang | "none" = "none",
  override?: LessonOverride,
): LessonPlan {
  const base = autoLesson(theme, lang, support);
  const o = override ?? CUSTOM_LESSONS[theme.id];
  return o ? applyOverride(base, o) : base;
}

/** Lay a pasted plan over the generated one, keeping the game-linked fields. */
function applyOverride(base: LessonPlan, o: LessonOverride): LessonPlan {
  const stages: LessonStage[] = o.stages?.length
    ? o.stages.map((st, i) => ({
        title: titleRow(st.title, base.stages[i % base.stages.length]?.title ?? STAGE_TITLES.practise),
        color: st.color && /^#[0-9a-f]{3,8}$/i.test(st.color) ? st.color : STAGE_COLORS[i % STAGE_COLORS.length],
        icon: st.icon || base.stages[i % base.stages.length]?.icon || "⭐",
        steps: st.steps,
      }))
    : base.stages;

  const vocab = o.vocab?.length
    ? base.theme.words.filter((w) => o.vocab!.includes(w.id))
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
function titleRow(raw: Record<Lang, string> | string | undefined, fallback: Record<Lang, string>): Record<Lang, string> {
  const en = (typeof raw === "string" ? raw : raw?.en ?? "").trim();
  if (!en) return fallback;
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

/** The plan WordPop writes by itself — the base a pasted plan is layered onto. */
export function autoLesson(theme: Theme, lang: Lang, support: Lang | "none" = "none"): LessonPlan {
  const stages: LessonStage[] = [
    warmUp(theme, lang),
    meetTheWords(theme, lang, support),
    chantStage(theme, lang),
    practise(theme, lang),
    quizStage(theme, lang),
    wrapUp(theme, lang),
  ];

  return {
    theme,
    color: STAGE_COLORS[1],
    objectives: objectivesFor(theme, lang),
    materials: MATERIAL_POOL.slice(0, 4),
    vocab: theme.words,
    stages,
    totalMinutes: stages.reduce((a, st) => a + st.steps.reduce((b, s) => b + s.minutes, 0), 0),
    extension: `Before next time, ask the grown-up to point at “${theme.words[0]?.t.en ?? ""}” and ${
      theme.words[1]?.t.en ?? "the next word"
    } round the house.`,
    review: theme.words.slice(0, 4).map((w) => w.t[lang] ?? w.t.en),
    linkedActivities: ["learn", "chant", "match", "quiz", "listen"],
  };
}
