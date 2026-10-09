/**
 * Lingo content model.
 *
 * The whole app is driven by ONE massive JSON file that an AI agent produces from
 * a source PDF (see the "AI Prompt" page). Nothing is hard-coded anymore: if the
 * file only contains grammar, only grammar activities are shown, and so on.
 *
 * File location:  public/content/tutolingo-content.json
 * Runtime URL:    <basePath>/content/tutolingo-content.json
 */

/** Every activity the player can render. The content pack maps to these. */
export const ACTIVITY_KINDS = [
  "match",
  "select_translation",
  "fill_blank",
  "type_hear",
  "reorder",
  "listen_select",
  "speak",
  "tap_complete",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  match: "Match pairs",
  select_translation: "Choose the translation",
  fill_blank: "Fill in the blank",
  type_hear: "Listen and type",
  reorder: "Put the words in order",
  listen_select: "Listen and choose",
  speak: "Speak out loud",
  tap_complete: "Grammar tap-complete",
};

/* ------------------------------------------------------------------ */
/* Raw shapes (exactly what the AI agent must output)                  */
/* ------------------------------------------------------------------ */

/** A line of text in the target language with an optional L1 translation. */
export interface Bilingual {
  target: string;
  native?: string;
}

/**
 * The mini lesson the app shows after an answer.
 *
 * Every teachable item can carry one. `meaning`, `form` and `use` are written in
 * the learner's first language because they are the explanation; `examples` stay in
 * the language being learned (they are the model to copy), and `ccq` is a question
 * the learner answers out loud to check their own understanding.
 */
export interface Feedback {
  /** How the item is built — written or spoken. In the learner's first language. */
  form?: string;
  /** What it means, in plain learner-facing language. In the learner's first language. */
  meaning?: string;
  /** Where, when and how this learner will actually use it. In their first language. */
  use?: string;
  /** 2–4 unique model sentences in the language being learned. */
  examples?: string[];
  /** A question the learner answers out loud (a concept-check question). */
  ccq?: string;
  /** One-line practical tip. In the learner's first language. */
  tip?: string;
}

export interface VocabEntry {
  id?: string | number;
  term: string;
  pos?: string;
  level?: string;
  definition?: string;
  translation?: string;
  /** Short explanation of the word written in the learner's first language. */
  nativeNote?: string;
  /** Mini lesson shown after an answer: form, meaning, use, examples, CCQ. */
  feedback?: Feedback;
  pronunciation?: string;
  example?: Bilingual | null;
  collocations?: string[];
  synonyms?: string[];
  antonyms?: string[];
  unit?: string;
  sourceRef?: string;
  /** Verbatim line from the source document this item comes from. */
  sourceQuote?: string;
  tags?: string[];
}

export interface GrammarExercise {
  /** multiple_choice | fill_blank | error_correction | transform | reorder | true_false */
  type?: string;
  prompt: string;
  options?: string[];
  answer: string;
  explanation?: string;
  nativeExplanation?: string;
}

export interface GrammarTopic {
  id?: string | number;
  title: string;
  level?: string;
  rule: string;
  nativeRule?: string;
  structure?: string;
  examples: Bilingual[];
  commonMistakes?: string[];
  exercises: GrammarExercise[];
  unit?: string;
  sourceRef?: string;
  /** Verbatim line from the source document this point comes from. */
  sourceQuote?: string;
  tags?: string[];
  /** Mini lesson shown after an answer: form, meaning, use, examples, CCQ. */
  feedback?: Feedback;
}

export interface IdiomEntry {
  id?: string | number;
  expression: string;
  /** idiom | phrasal_verb | collocation | proverb | slang | expression */
  type?: string;
  meaning: string;
  literalMeaning?: string;
  nativeMeaning?: string;
  /** Short explanation written in the learner's first language. */
  nativeNote?: string;
  /** Mini lesson shown after an answer: form, meaning, use, examples, CCQ. */
  feedback?: Feedback;
  example?: Bilingual | null;
  register?: string;
  usageNotes?: string;
  unit?: string;
  sourceRef?: string;
  /** Verbatim line from the source document this expression comes from. */
  sourceQuote?: string;
  tags?: string[];
}

export interface ConversationTurn {
  speaker?: string;
  name?: string;
  target: string;
  native?: string;
  /** Mini lesson for this exact line: form, meaning, use, examples, CCQ. */
  feedback?: Feedback;
}

export interface Conversation {
  id?: string | number;
  title: string;
  setting?: string;
  level?: string;
  goal?: string;
  nativeSummary?: string;
  turns: ConversationTurn[];
  keyPhrases?: Bilingual[];
  sourceRef?: string;
  /** Verbatim extract from the source document this dialogue comes from. */
  sourceQuote?: string;
  tags?: string[];
}

export interface SentencePair {
  id?: string | number;
  target: string;
  native?: string;
  nativeNote?: string;
  /** Mini lesson shown after an answer: form, meaning, use, examples, CCQ. */
  feedback?: Feedback;
  sourceRef?: string;
  /** Verbatim line from the source document this sentence comes from. */
  sourceQuote?: string;
  tags?: string[];
}

/** Optional explicit activity bank, when the agent wants full control. */
export interface ActivityBank {
  matchPairs?: Array<{ pairs: Array<{ target: string; native?: string }>; sourceRef?: string }>;
  fillBlank?: Array<{ sentence: string; answer: string; options?: string[]; native?: string }>;
  reorder?: Array<{ sentence: string; native?: string }>;
  listenSelect?: Array<{ prompt: string; answer: string; options?: string[]; native?: string }>;
  typeHear?: Array<{ sentence: string; native?: string }>;
  speak?: Array<{ sentence: string; native?: string }>;
  tapComplete?: Array<{ prompt: string; options?: string[]; answer: string; explanation?: string; native?: string }>;
}

export interface ContentPackMeta {
  app?: string;
  version?: string;
  sourceDocument?: string;
  /** ISO code of the learner's first language, e.g. "fa", "es", "ar". */
  l1?: string;
  /** Human readable name of the learner's first language, e.g. "Persian". */
  l1Name?: string;
  /** Language being learned (defaults to English). */
  targetLanguage?: string;
  level?: string;
  learnerProfile?: string;
  theme?: string;
  createdAt?: string;
  coverage?: Record<string, unknown>;
  notes?: string;
}

export interface ContentPack {
  meta: ContentPackMeta;
  vocabulary: VocabEntry[];
  grammar: GrammarTopic[];
  idioms: IdiomEntry[];
  conversations: Conversation[];
  sentences: SentencePair[];
  activities: ActivityBank;
}

export const EMPTY_PACK: ContentPack = {
  meta: {},
  vocabulary: [],
  grammar: [],
  idioms: [],
  conversations: [],
  sentences: [],
  activities: {},
};

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const clean = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Keeps whatever id the agent produced, falling back to the position. */
function idOf(v: unknown, fallback: number): string | number {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return fallback;
}

function normalizeBilingual(v: unknown): Bilingual | null {
  if (!v || typeof v !== "object") return null;
  const raw = v as Record<string, unknown>;
  const target = clean(raw.target) || clean(raw.text) || clean(raw.en) || clean(raw.english);
  const native = clean(raw.native) || clean(raw.translation) || clean(raw.fa) || clean(raw.l1);
  if (!target) return null;
  return native ? { target, native } : { target };
}

function strList(v: unknown): string[] | undefined {
  const list = asArray<unknown>(v).map((x) => clean(x)).filter(Boolean);
  return list.length ? list : undefined;
}

/**
 * The AI writes feedback as an object (or, when it is in a hurry, as a single
 * string). Both shapes are accepted, and a missing block simply means “no extra
 * mini lesson”, never “empty white box”.
 */
function normalizeFeedback(v: unknown): Feedback | undefined {
  if (!v) return undefined;
  const raw = typeof v === "string" ? ({ meaning: v } as Record<string, unknown>) : (v as Record<string, unknown>);
  if (typeof raw !== "object") return undefined;

  /** Examples may be plain strings or { target, native } pairs. */
  const examples = asArray<unknown>(raw.examples ?? raw.exampleSentences)
    .map((x) => {
      if (typeof x === "string") return clean(x);
      if (x && typeof x === "object") {
        const pair = x as Record<string, unknown>;
        const target = clean(pair.target) || clean(pair.text) || clean(pair.en);
        const native = clean(pair.native) || clean(pair.translation);
        return native ? `${target} — ${native}` : target;
      }
      return "";
    })
    .filter(Boolean);

  const out: Feedback = {
    form: clean(raw.form) || clean(raw.formNote) || clean(raw.structure) || undefined,
    meaning: clean(raw.meaning) || clean(raw.meaningNote) || clean(raw.whatItMeans) || undefined,
    use: clean(raw.use) || clean(raw.usage) || clean(raw.whenToUse) || clean(raw.whereToUse) || undefined,
    examples: examples.length ? examples : undefined,
    ccq: clean(raw.ccq) || clean(raw.checkQuestion) || clean(raw.speakingQuestion) || undefined,
    tip: clean(raw.tip) || clean(raw.coachTip) || undefined,
  };
  const anything = out.form || out.meaning || out.use || out.ccq || out.tip || out.examples?.length;
  return anything ? out : undefined;
}

export function normalizePack(raw: unknown): ContentPack {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PACK };
  const r = raw as Record<string, unknown>;

  const vocabulary: VocabEntry[] = asArray<Record<string, unknown>>(r.vocabulary)
    .map((v, i): VocabEntry | null => {
      const term = clean(v.term) || clean(v.word) || clean(v.english);
      if (!term) return null;
      const entry: VocabEntry = {
        id: idOf(v.id, i + 1),
        term,
        pos: clean(v.pos) || clean(v.partOfSpeech) || undefined,
        level: clean(v.level) || clean(v.cefr) || undefined,
        definition: clean(v.definition) || clean(v.meaning) || undefined,
        translation: clean(v.translation) || clean(v.native) || undefined,
        nativeNote: clean(v.nativeNote) || clean(v.nativeExplanation) || clean(v.explanationL1) || undefined,
        feedback: normalizeFeedback(v.feedback) ?? normalizeFeedback(v.coach) ?? undefined,
        pronunciation: clean(v.pronunciation) || clean(v.ipa) || undefined,
        example: normalizeBilingual(v.example),
        collocations: strList(v.collocations),
        synonyms: strList(v.synonyms),
        antonyms: strList(v.antonyms),
        unit: clean(v.unit) || undefined,
        sourceRef: clean(v.sourceRef) || clean(v.source) || undefined,
        sourceQuote: clean(v.sourceQuote) || clean(v.quote) || undefined,
        tags: strList(v.tags),
      };
      return entry;
    })
    .filter((x): x is VocabEntry => !!x);

  const grammar: GrammarTopic[] = asArray<Record<string, unknown>>(r.grammar)
    .map((g, i): GrammarTopic | null => {
      const title = clean(g.title) || clean(g.topic);
      const rule = clean(g.rule) || clean(g.explanation) || clean(g.nativeRule);
      if (!title || !rule) return null;
      const exercises: GrammarExercise[] = asArray<Record<string, unknown>>(g.exercises)
        .map((e): GrammarExercise | null => {
          const prompt = clean(e.prompt) || clean(e.question) || clean(e.sentence);
          const answer = clean(e.answer);
          if (!prompt || !answer) return null;
          return {
            type: clean(e.type) || undefined,
            prompt,
            options: strList(e.options),
            answer,
            explanation: clean(e.explanation) || undefined,
            nativeExplanation: clean(e.nativeExplanation) || undefined,
          };
        })
        .filter((x): x is GrammarExercise => !!x);
      return {
        id: idOf(g.id, i + 1),
        title,
        level: clean(g.level) || clean(g.cefr) || undefined,
        rule,
        nativeRule: clean(g.nativeRule) || undefined,
        feedback: normalizeFeedback(g.feedback) ?? normalizeFeedback(g.coach) ?? undefined,
        structure: clean(g.structure) || undefined,
        examples: asArray<unknown>(g.examples).map(normalizeBilingual).filter((x): x is Bilingual => !!x),
        commonMistakes: strList(g.commonMistakes),
        exercises,
        unit: clean(g.unit) || undefined,
        sourceRef: clean(g.sourceRef) || undefined,
        sourceQuote: clean(g.sourceQuote) || clean(g.quote) || undefined,
        tags: strList(g.tags),
      };
    })
    .filter((x): x is GrammarTopic => !!x);

  const idioms: IdiomEntry[] = asArray<Record<string, unknown>>(r.idioms)
    .map((x, i): IdiomEntry | null => {
      const expression = clean(x.expression) || clean(x.english) || clean(x.phrase);
      const meaning = clean(x.meaning) || clean(x.definition) || clean(x.nativeMeaning);
      if (!expression || !meaning) return null;
      return {
        id: idOf(x.id, i + 1),
        expression,
        type: clean(x.type) || "idiom",
        meaning,
        literalMeaning: clean(x.literalMeaning) || undefined,
        nativeMeaning: clean(x.nativeMeaning) || undefined,
        nativeNote: clean(x.nativeNote) || clean(x.nativeExplanation) || clean(x.explanationL1) || undefined,
        feedback: normalizeFeedback(x.feedback) ?? normalizeFeedback(x.coach) ?? undefined,
        example: normalizeBilingual(x.example),
        register: clean(x.register) || undefined,
        usageNotes: clean(x.usageNotes) || undefined,
        unit: clean(x.unit) || undefined,
        sourceRef: clean(x.sourceRef) || undefined,
        sourceQuote: clean(x.sourceQuote) || clean(x.quote) || undefined,
        tags: strList(x.tags),
      };
    })
    .filter((x): x is IdiomEntry => !!x);

  const conversations: Conversation[] = asArray<Record<string, unknown>>(r.conversations)
    .map((c, i): Conversation | null => {
      const title = clean(c.title);
      const turns: ConversationTurn[] = asArray<Record<string, unknown>>(c.turns || c.dialogue)
        .map((t): ConversationTurn | null => {
          const target = clean(t.target) || clean(t.text) || clean(t.english);
          if (!target) return null;
          const native = clean(t.native) || clean(t.translation) || clean(t.persian);
          const feedback = normalizeFeedback(t.feedback) ?? normalizeFeedback(t.coach);
          return {
            speaker: clean(t.speaker) || undefined,
            name: clean(t.name) || undefined,
            target,
            ...(native ? { native } : {}),
            ...(feedback ? { feedback } : {}),
          } as ConversationTurn;
        })
        .filter((x): x is ConversationTurn => !!x);
      if (!title && turns.length === 0) return null;
      return {
        id: idOf(c.id, i + 1),
        title: title || `Conversation ${i + 1}`,
        setting: clean(c.setting) || undefined,
        level: clean(c.level) || undefined,
        goal: clean(c.goal) || undefined,
        nativeSummary: clean(c.nativeSummary) || undefined,
        turns,
        keyPhrases: asArray<unknown>(c.keyPhrases).map(normalizeBilingual).filter((x): x is Bilingual => !!x),
        sourceRef: clean(c.sourceRef) || undefined,
        sourceQuote: clean(c.sourceQuote) || clean(c.quote) || undefined,
        tags: strList(c.tags),
      };
    })
    .filter((x): x is Conversation => !!x);

  const sentences: SentencePair[] = asArray<string | Record<string, unknown>>(r.sentences)
    .map((s, i): SentencePair | null => {
      if (typeof s === "string") return { id: i + 1, target: s.trim() };
      const target = clean(s.target) || clean(s.sentence) || clean(s.english);
      if (!target) return null;
      const native = clean(s.native) || clean(s.translation);
      const nativeNote = clean(s.nativeNote) || clean(s.nativeExplanation);
      const sourceQuote = clean(s.sourceQuote) || clean(s.quote);
      const feedback = normalizeFeedback(s.feedback) ?? normalizeFeedback(s.coach);
      return {
        id: idOf(s.id, i + 1),
        target,
        ...(native ? { native } : {}),
        ...(nativeNote ? { nativeNote } : {}),
        ...(feedback ? { feedback } : {}),
        ...(sourceQuote ? { sourceQuote } : {}),
        sourceRef: clean(s.sourceRef) || undefined,
        tags: strList(s.tags),
      };
    })
    .filter((x): x is SentencePair => !!x);

  const ab = (r.activities && typeof r.activities === "object" ? r.activities : {}) as Record<string, unknown>;
  type BankSentence = { sentence: string; native?: string };
  type BankListen = { prompt: string; answer: string; options?: string[]; native?: string };
  type BankTap = { prompt: string; answer: string; options?: string[]; explanation?: string; native?: string };

  const activities: ActivityBank = {
    matchPairs: asArray<Record<string, unknown>>(ab.matchPairs)
      .map((m) => ({
        pairs: asArray<unknown>(m.pairs).map(normalizeBilingual).filter((x): x is Bilingual => !!x),
        sourceRef: clean(m.sourceRef) || undefined,
      }))
      .filter((m) => m.pairs.length >= 2),
    fillBlank: asArray<Record<string, unknown>>(ab.fillBlank)
      .map((m): (BankSentence & { answer: string; options?: string[] }) | null => {
        const sentence = clean(m.sentence) || clean(m.prompt);
        const answer = clean(m.answer);
        if (!sentence || !answer) return null;
        return { sentence, answer, options: strList(m.options), native: clean(m.native) || undefined };
      })
      .filter((x): x is BankSentence & { answer: string; options?: string[] } => !!x),
    reorder: asArray<Record<string, unknown>>(ab.reorder)
      .map((m): BankSentence | null => {
        const sentence = clean(m.sentence) || clean(m.target);
        if (!sentence) return null;
        return { sentence, native: clean(m.native) || undefined };
      })
      .filter((x): x is BankSentence => !!x),
    listenSelect: asArray<Record<string, unknown>>(ab.listenSelect)
      .map((m): BankListen | null => {
        const answer = clean(m.answer);
        if (!answer) return null;
        return {
          prompt: clean(m.prompt) || answer,
          answer,
          options: strList(m.options),
          native: clean(m.native) || undefined,
        };
      })
      .filter((x): x is BankListen => !!x),
    typeHear: asArray<Record<string, unknown>>(ab.typeHear)
      .map((m): BankSentence | null => {
        const sentence = clean(m.sentence) || clean(m.target);
        if (!sentence) return null;
        return { sentence, native: clean(m.native) || undefined };
      })
      .filter((x): x is BankSentence => !!x),
    speak: asArray<Record<string, unknown>>(ab.speak)
      .map((m): BankSentence | null => {
        const sentence = clean(m.sentence) || clean(m.target);
        if (!sentence) return null;
        return { sentence, native: clean(m.native) || undefined };
      })
      .filter((x): x is BankSentence => !!x),
    tapComplete: asArray<Record<string, unknown>>(ab.tapComplete)
      .map((m): BankTap | null => {
        const prompt = clean(m.prompt) || clean(m.sentence);
        const answer = clean(m.answer);
        if (!prompt || !answer) return null;
        return {
          prompt,
          answer,
          options: strList(m.options),
          explanation: clean(m.explanation) || undefined,
          native: clean(m.native) || undefined,
        };
      })
      .filter((x): x is BankTap => !!x),
  };

  const metaRaw = (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>;
  const meta: ContentPackMeta = {
    app: clean(metaRaw.app) || "Lingo",
    version: clean(metaRaw.version) || undefined,
    sourceDocument: clean(metaRaw.sourceDocument) || undefined,
    l1: clean(metaRaw.l1).toLowerCase() || undefined,
    l1Name: clean(metaRaw.l1Name) || undefined,
    targetLanguage: clean(metaRaw.targetLanguage) || "English",
    level: clean(metaRaw.level) || undefined,
    learnerProfile: clean(metaRaw.learnerProfile) || undefined,
    theme: clean(metaRaw.theme) || undefined,
    createdAt: clean(metaRaw.createdAt) || undefined,
    coverage: (metaRaw.coverage && typeof metaRaw.coverage === "object" ? (metaRaw.coverage as Record<string, unknown>) : undefined),
    notes: clean(metaRaw.notes) || undefined,
  };

  return { meta, vocabulary, grammar, idioms, conversations, sentences, activities };
}

export interface PackCounts {
  vocabulary: number;
  grammar: number;
  grammarExercises: number;
  idioms: number;
  conversations: number;
  turns: number;
  sentences: number;
}

export function packCounts(pack: ContentPack): PackCounts {
  return {
    vocabulary: pack.vocabulary.length,
    grammar: pack.grammar.length,
    grammarExercises: pack.grammar.reduce((a, g) => a + g.exercises.length, 0),
    idioms: pack.idioms.length,
    conversations: pack.conversations.length,
    turns: pack.conversations.reduce((a, c) => a + c.turns.length, 0),
    sentences: pack.sentences.length,
  };
}

/** Total number of learnable items — drives how long the learning path is. */
export function packItemCount(pack: ContentPack): number {
  const c = packCounts(pack);
  return (
    c.vocabulary +
    c.grammarExercises +
    c.idioms +
    c.turns +
    c.sentences +
    (pack.activities.matchPairs?.length ?? 0) +
    (pack.activities.fillBlank?.length ?? 0) +
    (pack.activities.reorder?.length ?? 0) +
    (pack.activities.listenSelect?.length ?? 0) +
    (pack.activities.typeHear?.length ?? 0) +
    (pack.activities.speak?.length ?? 0) +
    (pack.activities.tapComplete?.length ?? 0)
  );
}

export function isPackEmpty(pack: ContentPack): boolean {
  return packItemCount(pack) === 0;
}
