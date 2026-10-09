import { THEMES, getSubtheme, wordsOf, themeOfSubtheme, type SubthemeRef } from "@/data/dictionary";
import { CCQS, fill } from "@/data/talk";
import { ph } from "@/data/ui-phrases";
import type { LangCode, Subtheme, Theme, Word } from "@/data/types";
import type { ModeId } from "@/lib/studio";

/**
 * LESSON PLANS — BiliBuddies' own plan per word set, plus the tutor's own.
 *
 * Every word set already has a plan BiliBuddies writes by itself: a timed run
 * through the arc this game already teaches in (welcome → meet the words →
 * chant → match & sort → talk time → wrap up) whose steps are built from the
 * set's OWN material — its words, the concept-check questions in `data/talk.ts`,
 * the theme's own multilingual chant, and the modes the child can actually play.
 * Nothing here is invented filler: every step names its words.
 *
 * A tutor can then paste a plan of their own, made with the AI prompt on the
 * 📋 AI Prompt & JSON screen. It layers on top: the AI supplies the teaching
 * (objectives, materials, stages, steps, extension, review) and this file keeps
 * supplying the things that must stay in sync with the game — the word set, its
 * words, its theme colour.
 *
 * Only the OVERRIDE is stored, never a frozen lesson: a pasted plan keeps
 * following a language switch, and editing a theme later never leaves the plan
 * stale. customPack.ts persists it under `bilibuddies.customLessons.v1`.
 *
 * A word set is the natural unit here (a Subtheme): that is what the studio's
 * deck is built from, so a plan can be written for any of them — including one
 * that arrived a moment ago in a pasted pack.
 */

export type Step = {
  minutes: number;
  /** literal tutor script, in the language being taught */
  script?: string;
  /** concept-check question */
  ccq?: string;
  /** what the child answers */
  expected?: string;
  /** the physical move: a gesture, a toy, a walk to the window */
  action?: string;
  wordIds?: string[];
};

export type LessonStage = {
  /** already-localised stage title */
  title: Record<LangCode, string>;
  color: string;
  icon: string;
  steps: Step[];
};

export type LessonPlan = {
  subthemeId: string;
  subtheme: Subtheme;
  themeId: string;
  theme: Theme;
  color: string;
  objectives: string[];
  materials: string[];
  vocab: Word[];
  stages: LessonStage[];
  totalMinutes: number;
  extension: string;
  review: string[];
  /** the studio modes this plan points the tutor at, in order */
  linkedModes: ModeId[];
};

const STAGE_COLORS = ["#f5c453", "#7fb2de", "#e86a8a", "#8fbe9b", "#b394d6", "#35302a"];

/** Stage titles in all six languages, so a pasted plan's names are translatable. */
const STAGE_TITLES: Record<string, Record<LangCode, string>> = {
  warmup: { en: "Warm-up", zh: "热身", fr: "Échauffement", it: "Riscaldamento", de: "Aufwärmen", tr: "Isınma" },
  learn: { en: "Meet the words", zh: "认识单词", fr: "Découvrir les mots", it: "Conosci le parole", de: "Wörter kennenlernen", tr: "Kelimeleri tanı" },
  chant: { en: "Chant & sing", zh: "歌谣", fr: "Comptine", it: "Filastrocca", de: "Reim & Gesang", tr: "Tekerleme" },
  practise: { en: "Match & sort", zh: "配对与分类", fr: "Associer et trier", it: "Abbina e ordina", de: "Zuordnen & Sortieren", tr: "Eşleştir ve ayır" },
  talk: { en: "Talk time", zh: "说话时间", fr: "On parle", it: "Parliamo", de: "Sprechzeit", tr: "Konuşma zamanı" },
  wrap: { en: "Wrap up", zh: "总结", fr: "Bilan", it: "Conclusione", de: "Abschluss", tr: "Kapanış" },
};

export const STAGE_ORDER: (keyof typeof STAGE_TITLES)[] = ["warmup", "learn", "chant", "practise", "talk", "wrap"];

/** `["Warm-up", "Meet the words", …]` — the headings a pasted plan may rename. */
export function defaultStageNames(): string[] {
  return STAGE_ORDER.map((k) => STAGE_TITLES[k].en);
}

function stageTitleRow(key: keyof typeof STAGE_TITLES): Record<LangCode, string> {
  return { ...STAGE_TITLES[key] };
}

const OBJECTIVES: Record<LangCode, string[]> = {
  en: [
    "Say {n} new words from {topic} clearly.",
    "Point to the right picture when they hear the word.",
    "Join in the theme's chant and clap the beat.",
    "Match each word to its picture, then sort it into the right basket.",
    "Answer one question about each word in a full sentence.",
  ],
  zh: [
    "清楚地说出 {topic} 的 {n} 个新词。",
    "听到单词时能指出对应的图片。",
    "一起念主题歌谣并拍手打节拍。",
    "把每个词和图片配对，再放进正确的篮子。",
    "用完整的句子回答每个词的问题。",
  ],
  fr: [
    "Dire clairement {n} nouveaux mots de {topic}.",
    "Montrer la bonne image en entendant le mot.",
    "Reprendre la comptine du thème en tapant le rythme.",
    "Associer chaque mot à son image, puis le trier.",
    "Répondre à une question sur chaque mot en une phrase.",
  ],
  it: [
    "Dire chiaramente {n} parole nuove di {topic}.",
    "Indicare l'immagine giusta sentendo la parola.",
    "Unirsi alla filastrocca del tema battendo il tempo.",
    "Abbinare ogni parola alla sua immagine, poi ordinarla.",
    "Rispondere in una frase intera su ogni parola.",
  ],
  de: [
    "{n} neue Wörter aus {topic} klar sagen.",
    "Beim Hören auf das richtige Bild zeigen.",
    "Beim Reim des Themas mitklatschen.",
    "Jedes Wort seinem Bild zuordnen und dann einsortieren.",
    "Eine Frage zu jedem Wort in einem ganzen Satz beantworten.",
  ],
  tr: [
    "{topic} konusundan {n} yeni kelimeyi net söyle.",
    "Kelimeyi duyunca doğru resmi göster.",
    "Temanın tekerlemesine katılıp ritimle alkışla.",
    "Her kelimeyi resmiyle eşleştir, sonra doğru sepete koy.",
    "Her kelime hakkında tam cümleyle cevap ver.",
  ],
};

const MATERIAL_POOL = [
  "a soft toy or a puppet",
  "a basket or an empty box for sorting",
  "a real object for the first two words",
  "a picture card for every target word",
  "a ball or a rolled sock",
  "colouring pencils and one blank sheet",
];

function objectivesFor(theme: Theme, n: number, lang: LangCode): string[] {
  const topic = theme.t[lang] || theme.t.en;
  return OBJECTIVES[lang].map((s) => s.replace("{n}", String(n)).replace("{topic}", topic));
}

/** A concept-check question from the game's own bank, filled with one word. */
function ccqFor(kindIndex: number, word: Word, lang: LangCode): { q: string; hint: string } {
  const ccq = CCQS[kindIndex % CCQS.length];
  return { q: fill(ccq.t[lang] || ccq.t.en, word.t[lang] || word.t.en), hint: ccq.hint };
}

/* ── the six stages ── */

function warmUp(theme: Theme, lang: LangCode): LessonStage {
  const first = wordsOf(theme.subthemes[0] ?? ({ words: [] } as unknown as Subtheme))[0];
  const c = CCQS.find((x) => x.id === "turn") ?? CCQS[0];
  // Every question in the bank is a template — `{w}` must be filled, or the
  // tutor reads a literal "{w}" out loud.
  const turn = fill(c.t[lang] || c.t.en, first ? first.t[lang] || first.t.en : "");
  return {
    title: stageTitleRow("warmup"),
    color: STAGE_COLORS[0],
    icon: "👋",
    steps: [
      {
        minutes: 2,
        script: ph("talkTime", lang),
        expected: "The child answers with one word or a wave.",
        action: `Same hello every lesson: big wave, the child copies it, then name today's word set: “${theme.t[lang] || theme.t.en}”.`,
        wordIds: first ? [first.id] : undefined,
      },
      {
        minutes: 1,
        ccq: turn,
        expected: "A word, a point, or any attempt — praise the try.",
        action: "Clap 1, 2 or 3 times and have the child copy and count out loud. It settles them and warms up the mouth.",
        wordIds: first ? [first.id] : undefined,
      },
    ],
  };
}

function meetTheWords(words: Word[], lang: LangCode, support: LangCode | "none"): LessonStage {
  const steps: Step[] = [];
  // Three words is a full presentation block at this age (about ten minutes with
  // their questions); a bigger set is covered by the chant, the games and the
  // talk-time stage instead of a longer sit-down.
  words.slice(0, 3).forEach((word) => {
    steps.push({
      minutes: 2,
      script: word.t[lang] || word.t.en,
      action: "Show the card, say the word three times (loud, quiet, slow) and have the child repeat each time.",
      wordIds: [word.id],
    });
    const { q, hint } = ccqFor(0, word, lang);
    steps.push({
      minutes: 1,
      ccq: q,
      expected: "Any attempt — the point is that they speak.",
      action: hint,
      wordIds: [word.id],
    });
    if (support !== "none" && support !== lang) {
      steps.push({
        minutes: 1,
        script: word.t[support] || word.t.en,
        action: "Give the home-language word once, then go straight back to the language being taught.",
        wordIds: [word.id],
      });
    }
  });
  return { title: stageTitleRow("learn"), color: STAGE_COLORS[1], icon: "🃏", steps };
}

function chantStage(theme: Theme, lang: LangCode): LessonStage {
  // The theme's own chant is already written in all six languages — that is the
  // real content here, not a template.
  const lines = theme.chant.slice(0, 4);
  const steps: Step[] = lines.map((line, i) => ({
    minutes: 1,
    script: line[lang] || line.en,
    action:
      i === 0
        ? `Say the line once, the child answers it back — then both together. Open 🎶 Chant so they hear it in time.`
        : "Same line again with a big gesture: point at the card, clap the beat, stamp on the last word.",
  }));
  if (!steps.length) {
    steps.push({
      minutes: 2,
      script: ph("singWithMe", lang),
      action: "Open 🎶 Chant and run the whole word set as a call-and-response: you say the word, the child answers.",
    });
  }
  steps.push({
    minutes: 2,
    script: ph("singWithMe", lang),
    action: "Run the whole chant start to finish with the claps — twice if they are still enjoying it.",
    wordIds: lines.length ? wordsOf(theme.subthemes[0] ?? ({ words: [] } as unknown as Subtheme)).slice(0, 4).map((w) => w.id) : undefined,
  });
  return { title: stageTitleRow("chant"), color: STAGE_COLORS[2], icon: "🎶", steps };
}

function practiseStage(words: Word[], lang: LangCode, hasBins: boolean): LessonStage {
  const ids = words.slice(0, 4).map((w) => w.id);
  const steps: Step[] = [
    {
      minutes: 3,
      script: ph("matchTheWord", lang),
      action: "Open 🧲 Match with these four words: the child drags each word onto its picture.",
      wordIds: ids,
    },
  ];
  if (hasBins) {
    steps.push({
      minutes: 3,
      script: ph("whichBasket", lang),
      action: "Open 🧺 Sort it and let the child talk through each choice out loud before they drop it in.",
      wordIds: ids,
    });
  } else {
    steps.push({
      minutes: 3,
      script: ph("findIt", lang),
      action: "Open 🎯 Quiz and let the child answer four in a row without help.",
      wordIds: ids,
    });
  }
  steps.push({
    minutes: 2,
    script: ph("wait", lang),
    action: "Say one word while the child's eyes are closed, then ask which one is missing from the row.",
    wordIds: ids,
  });
  return { title: stageTitleRow("practise"), color: STAGE_COLORS[3], icon: "🧲", steps };
}

function talkStage(words: Word[], lang: LangCode): LessonStage {
  const ids = words.slice(0, 3).map((w) => w.id);
  const steps: Step[] = [];
  words.slice(0, 3).forEach((word, i) => {
    // Three different question types from the game's bank, so the child hears the
    // word asked about in more than one way.
    const { q, hint } = ccqFor(i + 1, word, lang);
    steps.push({
      minutes: 2,
      ccq: q,
      expected: "A word, or a full sentence if they can.",
      action: `${hint} Open 💬 Talk time if the child wants to see the cards while they answer.`,
      wordIds: [word.id],
    });
  });
  return { title: stageTitleRow("talk"), color: STAGE_COLORS[4], icon: "💬", steps };
}

function wrapUp(words: Word[], lang: LangCode): LessonStage {
  const ids = words.slice(0, 4).map((w) => w.id);
  return {
    title: stageTitleRow("wrap"),
    color: STAGE_COLORS[5],
    icon: "⭐",
    steps: [
      {
        minutes: 2,
        script: ph("allDone", lang),
        action: "Open 🃏 Learn for one last, easy win — the child names each card they already know.",
        wordIds: ids,
      },
      {
        minutes: 1,
        script: ph("great", lang),
        action: "Say goodbye exactly the same way every lesson, then tell the grown-up which words to practise before next time.",
      },
    ],
  };
}

/* ═════════════════════════ the pasted plan ═════════════════════════ */

export type LessonOverride = {
  /** AI-written stage titles, one row per language. */
  stages?: { title?: Record<LangCode, string> | string; icon?: string; color?: string; steps: Step[] }[];
  objectives?: string[];
  materials?: string[];
  extension?: string;
  review?: string[];
  /** Word ids the AI wants highlighted; anything unknown falls back to the set. */
  vocab?: string[];
  source?: "ai" | "tutor";
};

const CUSTOM_LESSONS: Record<string, LessonOverride> = {};

export function registerLesson(subthemeId: string, override: LessonOverride): void {
  CUSTOM_LESSONS[subthemeId] = override;
}

export function unregisterLesson(subthemeId: string): void {
  delete CUSTOM_LESSONS[subthemeId];
}

export function hasCustomLesson(subthemeId: string): boolean {
  return Boolean(CUSTOM_LESSONS[subthemeId]);
}

export function customLessonIds(): string[] {
  return Object.keys(CUSTOM_LESSONS);
}

/** Build a full, tutor-ready lesson plan for one word set (a pasted plan wins). */
export function buildLesson(
  subthemeId: string,
  lang: LangCode,
  support: LangCode | "none" = "none",
  override?: LessonOverride,
): LessonPlan | null {
  const base = autoLesson(subthemeId, lang, support);
  if (!base) return null;
  const o = override ?? CUSTOM_LESSONS[subthemeId];
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

  const vocab = o.vocab?.length ? base.vocab.filter((w) => o.vocab!.includes(w.id)) : base.vocab;

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
function titleRow(
  raw: Record<LangCode, string> | string | undefined,
  fallback: Record<LangCode, string>,
): Record<LangCode, string> {
  // An AI often answers with a plain string where the sample shows an object
  // (`"title": "Warm-up"` instead of `"title": { "en": "Warm-up", … }`). That is a
  // perfectly good title, so use it for every language — NOT a reason to show
  // "Stage 3".
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

/** The plan BiliBuddies writes by itself — the base a pasted plan is layered onto. */
export function autoLesson(subthemeId: string, lang: LangCode, support: LangCode | "none" = "none"): LessonPlan | null {
  const subtheme = getSubtheme(subthemeId);
  if (!subtheme) return null;
  const theme = themeOfSubtheme(subthemeId);
  const words = wordsOf(subtheme);

  const stages: LessonStage[] = [
    warmUp(theme, lang),
    meetTheWords(words, lang, support),
    chantStage(theme, lang),
    practiseStage(words, lang, Boolean(subtheme.bins?.length)),
    talkStage(words, lang),
    wrapUp(words, lang),
  ];

  return {
    subthemeId,
    subtheme,
    themeId: theme.id,
    theme,
    color: theme.color,
    objectives: objectivesFor(theme, Math.min(6, words.length), lang),
    materials: MATERIAL_POOL.slice(0, 4),
    vocab: words,
    stages,
    totalMinutes: stages.reduce((a, st) => a + st.steps.reduce((b, s) => b + s.minutes, 0), 0),
    extension: `Before next time, ask the grown-up to point at “${words[0]?.t.en ?? ""}” and ${
      words[1]?.t.en ?? "the next word"
    } round the house, and to sing the ${theme.t.en} chant once.`,
    review: words.slice(0, 4).map((w) => w.t[lang] || w.t.en),
    linkedModes: ["learn", "chant", "match", "quiz", "talk"],
  };
}

/**
 * Every word set that can be taught, across the live dictionary.
 *
 * THEMES is a mutable array that `installThemes()` pushes pasted packs into, so
 * reading it here (rather than snapshotting it at module load) is what lets a
 * plan be written for a word set that arrived a moment ago.
 */
export function teachableSets(): SubthemeRef[] {
  return THEMES.flatMap((theme) => theme.subthemes.map((s) => ({ ...s, themeId: theme.id })));
}
