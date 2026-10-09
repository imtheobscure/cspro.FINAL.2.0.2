/**
 * Lesson engine — turns the loaded content pack into playable exercises.
 *
 * Everything is deterministic: the same lesson always produces the same
 * exercises, and every activity kind (match, fill in the blank, listen & type,
 * reorder, listen & choose, speak, grammar tap-complete) is generated from the
 * content that is actually available in the pack.
 */
import type {
  ActivityKind,
  Bilingual,
  ContentPack,
  Conversation,
  Feedback,
  GrammarTopic,
  IdiomEntry,
  VocabEntry,
} from "@/content/tutolingo";
import type { LessonPlan } from "@/content/units";

export interface Exercise {
  id: string;
  type: ActivityKind;
  instruction: string;
  prompt?: Bilingual;
  options?: string[];
  answer?: string;
  pairs?: Bilingual[];
  words?: string[];
  sentence?: Bilingual;
  wordBank?: string[];
  hint?: string;
  explain?: string;
  /** Mini lesson shown after checking the answer, in the learner's first language. */
  coach?: Coach;
}

/**
 * The little lesson that follows every answer: what this item means, how it is
 * built, where this learner will use it, examples to copy and one question they
 * answer out loud. The AI supplies all of it per item (see the prompt's `feedback`
 * block); everything here has a graceful fallback for older packs.
 */
export interface Coach {
  title: string;
  /** Explanation in the learner's first language (the main body of the feedback). */
  native?: string;
  /** L1 translation of the item being practised. */
  translation?: string;
  /** Secondary explanation in the language being taught. */
  note?: string;
  /** What it means, in the learner's first language. */
  meaning?: string;
  /** How it is built (form / structure), in the learner's first language. */
  form?: string;
  /** Where, when and how the learner can use it in their own life. */
  use?: string;
  /** Unique model sentences in the language being learned. */
  examples?: string[];
  /** A question the learner answers out loud. */
  ccq?: string;
  /** Extra L1 sentences (e.g. the pack's examples for a grammar point). */
  extra?: string[];
  /** Where this item lives in the References hub, so feedback can deep-link to it. */
  ref?: CoachRef;
}

/** Pointer into the References hub: which tab, and which entry to land on. */
export interface CoachRef {
  tab: "vocabulary" | "grammar" | "dialogues" | "idioms";
  /** Term / title / expression to highlight once the tab opens. */
  key?: string;
}

/** Human label for each References tab (used by the “Study this” link). */
export const REF_TAB_LABEL: Record<CoachRef["tab"], string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  dialogues: "Dialogues",
  idioms: "Idioms",
};

/* --------------------------- deterministic random --------------------------- */

export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

export function pick<T>(rand: Rand, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

export function shuffle<T>(rand: Rand, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --------------------------------- helpers --------------------------------- */

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Uses the L1 translation when the pack provides one, otherwise the definition. */
function nativeOf(word: VocabEntry): string | undefined {
  return word.translation || word.definition;
}

function pairOf(target: string, native?: string): Bilingual {
  return native ? { target, native } : { target };
}

/** Build up to `size` options that include the answer. */
function buildOptions(rand: Rand, answer: string, pool: string[], size = 4): string[] {
  const clean = pool.filter((p) => p && p.toLowerCase() !== answer.toLowerCase());
  const distractors = pick(rand, Array.from(new Set(clean)), size - 1);
  return shuffle(rand, [answer, ...distractors]);
}

function pickSentence(rand: Rand, pool: Bilingual[]): Bilingual | undefined {
  const usable = pool.filter((s) => wordCount(s.target) >= 3);
  if (!usable.length) return undefined;
  return usable[Math.floor(rand() * usable.length)];
}

const sentenceKey = (s: Bilingual) => s.target.trim().toLowerCase();

/**
 * The bank item at position `n`, but never one this lesson already asked while
 * any other is still free. The lesson banks are sliced per unit, so a plain
 * `n % length` walk asks the same entry again as soon as a lesson runs the same
 * activity kind twice.
 */
function takeBank<T>(ctx: Ctx, bank: T[] | undefined, n: number, text: (x: T) => string): T | undefined {
  if (!bank?.length) return undefined;
  const start = n % bank.length;
  for (let i = 0; i < bank.length; i++) {
    const item = bank[(start + i) % bank.length];
    const key = text(item).trim().toLowerCase();
    if (key && !ctx.usedSentences.has(key)) {
      ctx.usedSentences.add(key);
      return item;
    }
  }
  return bank[start];
}

/**
 * The next sentence this lesson has not used yet.
 *
 * Every sentence-driven activity (listen, reorder, speak, dictate, sentence
 * listen-and-choose) draws from the same lesson pool, and a lesson runs each
 * activity kind twice — so picking randomly meant one sentence could be asked
 * six times in a lesson when the pack was thin. Preferring untouched sentences
 * makes "no repeated question inside a lesson" a property of the engine and
 * not something the content has to be trusted for. Only when the pool is
 * genuinely exhausted does it fall back to a repeat.
 */
function takeSentence(ctx: Ctx, pool: Bilingual[]): Bilingual | undefined {
  const usable = pool.filter((s) => wordCount(s.target) >= 3);
  if (!usable.length) return undefined;
  const fresh = usable.filter((s) => !ctx.usedSentences.has(sentenceKey(s)));
  const from = fresh.length ? fresh : usable;
  const chosen = from[Math.floor(ctx.rand() * from.length)] ?? from[0];
  ctx.usedSentences.add(sentenceKey(chosen));
  return chosen;
}

/* --------------------------- mini-lesson material --------------------------- */

/** "nativeNote" is the field the AI prompt asks for: a short L1 explanation. */
function l1Note(v: { nativeNote?: string }): string | undefined {
  return v.nativeNote?.trim() || undefined;
}

export function coachForWord(word: VocabEntry): Coach {
  const f = word.feedback;
  const translation = nativeOf(word) || undefined;
  const meaning = f?.meaning || l1Note(word) || translation;
  return {
    title: word.term,
    native: meaning,
    translation,
    meaning,
    form: f?.form,
    use: f?.use,
    examples: f?.examples?.length ? f.examples : word.example?.target ? [word.example.target] : undefined,
    ccq: f?.ccq,
    note:
      [f?.tip, word.definition && word.definition !== meaning ? word.definition : undefined].filter(Boolean).join("\n") ||
      undefined,
    ref: { tab: "vocabulary", key: word.term },
  };
}

export function coachForIdiom(idiom: IdiomEntry): Coach {
  const f = idiom.feedback;
  const note = [idiom.literalMeaning ? `Literally: ${idiom.literalMeaning}` : "", idiom.usageNotes ?? ""]
    .filter(Boolean)
    .join(" · ");
  const meaning = f?.meaning || l1Note(idiom) || idiom.nativeMeaning || idiom.meaning;
  return {
    title: idiom.expression,
    native: meaning,
    translation: idiom.nativeMeaning,
    meaning,
    form: f?.form,
    use: f?.use || idiom.usageNotes,
    examples: f?.examples?.length ? f.examples : idiom.example?.target ? [idiom.example.target] : undefined,
    ccq: f?.ccq,
    note: [f?.tip, note].filter(Boolean).join(" · ") || undefined,
    ref: { tab: "idioms", key: idiom.expression },
  };
}

/**
 * A spoken/typed sentence. When the pack carries a `feedback` block for this exact
 * sentence, the mini lesson explains it properly; otherwise the translation stands
 * in, which is what older packs have.
 */
export function coachForSentence(
  title: string,
  sentence: Bilingual,
  note?: string,
  ref?: CoachRef,
  feedback?: Feedback,
): Coach {
  return {
    title,
    native: sentence.native,
    meaning: feedback?.meaning || sentence.native,
    form: feedback?.form,
    use: feedback?.use,
    examples: feedback?.examples?.length ? feedback.examples : [sentence.target],
    ccq: feedback?.ccq,
    note: [feedback?.tip, note].filter(Boolean).join("\n") || undefined,
    ref: ref ?? { tab: "dialogues", key: sentence.target },
  };
}

export function coachForGrammar(topic: GrammarTopic, exercise?: GrammarTopic["exercises"][number]): Coach {
  const f = topic.feedback;
  const extra = topic.examples
    .map((e) => (e.native ? `${e.target} — ${e.native}` : e.target))
    .filter(Boolean)
    .slice(0, 3);
  return {
    title: topic.title,
    native: exercise?.nativeExplanation ?? topic.nativeRule,
    meaning: f?.meaning || exercise?.nativeExplanation || topic.nativeRule,
    form: f?.form || topic.structure,
    use: f?.use,
    examples: f?.examples?.length ? f.examples : undefined,
    ccq: f?.ccq,
    extra: extra.length ? extra : undefined,
    note: [f?.tip, exercise?.explanation, topic.rule].filter(Boolean).join("\n") || undefined,
    ref: { tab: "grammar", key: topic.title },
  };
}

function at<T>(arr: T[], i: number): T | undefined {
  return arr.length ? arr[i % arr.length] : undefined;
}

/* ---------------------------------- decks ---------------------------------- */

interface Deck {
  vocab: VocabEntry[];
  idioms: IdiomEntry[];
  grammar: GrammarTopic[];
  sentences: Bilingual[];
  conversations: Conversation[];
  /** Fallback pools taken from the whole pack, so short lessons still work. */
  allVocab: VocabEntry[];
  allGrammar: GrammarTopic[];
  allSentences: Bilingual[];
}

function collectSlice<T>(all: T[], indices: number[]): T[] {
  const out: T[] = [];
  for (const i of indices) {
    const item = all[i];
    if (item) out.push(item);
  }
  return out;
}

/** A lesson is at most 16 exercises, so no pool has to hold more than that. */
const LESSON_POOL_MIN = 16;

/**
 * Unit slices are proportional to the size of the pack, so a long document can
 * leave one unit holding two sentences. A lesson must never be able to run out
 * of material — when its own slice is too small it is topped up from the rest of
 * the pack (the unit's own items first) instead of asking one line over and
 * over. A pack that meets the per-unit floors never triggers this.
 */
function widenSlice<T>(slice: T[], all: T[], need: number, key: (x: T) => string): T[] {
  if (slice.length >= need || !all.length) return slice;
  const seen = new Set(slice.map(key));
  const extra = all.filter((x) => !seen.has(key(x)));
  return [...slice, ...extra].slice(0, need);
}

/** The lesson plan with banks big enough to fill a lesson. */
function widenedPlan(pack: ContentPack, plan: LessonPlan): LessonPlan {
  const bank = plan.slice.bank;
  const all = pack.activities;
  const top = <T,>(slice: T[] | undefined, whole: T[] | undefined, need: number) =>
    widenSlice(slice ?? [], whole ?? [], need, (x) => JSON.stringify(x));
  return {
    ...plan,
    slice: {
      ...plan.slice,
      bank: {
        matchPairs: top(bank.matchPairs, all.matchPairs, 2),
        fillBlank: top(bank.fillBlank, all.fillBlank, 8),
        reorder: top(bank.reorder, all.reorder, 8),
        typeHear: top(bank.typeHear, all.typeHear, 8),
        speak: top(bank.speak, all.speak, 8),
        listenSelect: top(bank.listenSelect, all.listenSelect, 8),
        tapComplete: top(bank.tapComplete, all.tapComplete, 8),
      },
    },
  };
}

function buildDeck(pack: ContentPack, plan: LessonPlan): Deck {
  const allSentences = pack.sentences.map((s) => pairOf(s.target, s.native));
  const turnSentences = pack.conversations.flatMap((c) => c.turns.map((t) => pairOf(t.target, t.native)));
  const bankSentences = [
    ...(plan.slice.bank.typeHear ?? []).map((x) => pairOf(x.sentence, x.native)),
    ...(plan.slice.bank.speak ?? []).map((x) => pairOf(x.sentence, x.native)),
    ...(plan.slice.bank.reorder ?? []).map((x) => pairOf(x.sentence, x.native)),
  ];

  const sentences = widenSlice(
    [...collectSlice(allSentences, plan.slice.sentences), ...bankSentences],
    [...allSentences, ...turnSentences],
    LESSON_POOL_MIN,
    (s) => s.target.trim().toLowerCase(),
  );
  return {
    vocab: collectSlice(pack.vocabulary, plan.slice.vocab),
    idioms: collectSlice(pack.idioms, plan.slice.idioms),
    grammar: collectSlice(pack.grammar, plan.slice.grammar),
    conversations: collectSlice(pack.conversations, plan.slice.conversations),
    sentences,
    allVocab: pack.vocabulary,
    allGrammar: pack.grammar,
    allSentences: sentences.length ? sentences : turnSentences.length ? turnSentences : allSentences,
  };
}

interface Ctx {
  deck: Deck;
  rand: Rand;
  plan: LessonPlan;
  /** Every answer in the pack — used to build distractor options. */
  grammarAnswers: string[];
  /**
   * Mini lessons keyed by the exact sentence they explain. Sentences live inside
   * several collections (the phrases list, dialogue lines, activity banks), so they
   * are indexed by text once instead of being carried through every pool.
   */
  sentenceFb: Map<string, Feedback>;
  /** Sentences already asked somewhere in this lesson, so none is asked twice. */
  usedSentences: Set<string>;
}

/** Index every sentence the pack can explain, so any exercise can find its lesson. */
function buildSentenceFeedback(pack: ContentPack): Map<string, Feedback> {
  const map = new Map<string, Feedback>();
  const put = (target: string | undefined, feedback: Feedback | undefined) => {
    const key = (target || "").trim().toLowerCase();
    if (key && feedback) map.set(key, feedback);
  };
  for (const s of pack.sentences) put(s.target, s.feedback);
  for (const c of pack.conversations) for (const t of c.turns) put(t.target, t.feedback);
  return map;
}

/** The mini lesson written for this exact sentence, when the pack has one. */
function fbFor(ctx: Ctx, sentence: Bilingual | undefined): Feedback | undefined {
  return sentence ? ctx.sentenceFb.get(sentence.target.trim().toLowerCase()) : undefined;
}

type Builder = (ctx: Ctx, n: number) => Exercise;

/* --------------------------- activity builders --------------------------- */

const makeMatch: Builder = (ctx, n) => {
  const { deck, rand } = ctx;
  const bankItems = ctx.plan.slice.bank.matchPairs ?? [];
  const bankItem = takeBank(ctx, bankItems, n, (x) => x.pairs.map((p) => `${p.target}|${p.native ?? ""}`).join("~"));

  const vocabPairs = pick(rand, deck.vocab, 5).map((v) => pairOf(v.term, nativeOf(v) ?? v.example?.target));
  const idiomPairs = pick(rand, deck.idioms, 5).map((v) => pairOf(v.expression, v.meaning));

  const pool = deck.vocab.length >= 2 ? vocabPairs : idiomPairs;
  const pairs = (bankItem?.pairs.length ?? 0) >= 2 ? bankItem!.pairs : pool;

  return {
    id: "",
    type: "match",
    instruction: "Match each item with its meaning",
    pairs,
    hint: "Tap an item on the left, then its match on the right",
    coach: {
      title: "Word ↔ meaning",
      native: pairs
        .filter((p) => p.native)
        .map((p) => `${p.target} = ${p.native}`)
        .join(" · ") || undefined,
      note: "Read each pair out loud: the word on the left, its meaning on the right.",
      ref: { tab: "vocabulary", key: pairs[0]?.target },
    },
  };
};

const makeSelectTranslation: Builder = (ctx, n) => {
  const { deck, rand } = ctx;
  const idiom = at(deck.idioms, n);
  const word = at(deck.vocab, n) ?? at(deck.allVocab, n);

  if (idiom && (!word || n % 3 === 2)) {
    const others = deck.allVocab.map((v) => v.term);
    return {
      id: "",
      type: "select_translation",
      instruction: "Which expression has this meaning?",
      prompt: pairOf(idiom.meaning, idiom.nativeMeaning),
      options: buildOptions(rand, idiom.expression, [...deck.idioms.map((i) => i.expression), ...others]),
      answer: idiom.expression,
      hint: idiom.literalMeaning ? `Literally: ${idiom.literalMeaning}` : idiom.usageNotes,
      coach: coachForIdiom(idiom),
    };
  }

  if (!word) return makeMatch(ctx, n);

  const native = nativeOf(word);
  if (!native) {
    return {
      id: "",
      type: "select_translation",
      instruction: "Which word does this definition describe?",
      prompt: pairOf(word.definition ?? word.term),
      options: buildOptions(rand, word.term, deck.allVocab.map((v) => v.term)),
      answer: word.term,
      hint: word.pos,
      coach: coachForWord(word),
    };
  }
  return {
    id: "",
    type: "select_translation",
    instruction: "Choose the correct translation",
    prompt: pairOf(native),
    options: buildOptions(rand, word.term, deck.allVocab.map((v) => v.term)),
    answer: word.term,
    hint: word.example?.target,
    coach: coachForWord(word),
  };
};

const makeFillBlank: Builder = (ctx, n) => {
  const { deck, rand } = ctx;
  const bankItems = ctx.plan.slice.bank.fillBlank ?? [];
  const fillBankItem = takeBank(ctx, n % 2 === 1 ? bankItems : [], n, (x) => x.sentence);
  if (fillBankItem) {
    const item = fillBankItem;
    const masked = item.sentence.replace(new RegExp(`\\b${escapeRe(item.answer)}\\b`, "i"), "______");
    return {
      id: "",
      type: "fill_blank",
      instruction: "Fill in the blank",
      sentence: pairOf(masked === item.sentence ? item.sentence : masked, item.native),
      options: buildOptions(rand, item.answer, item.options?.length ? item.options : deck.allVocab.map((v) => v.term)),
      answer: item.answer,
      hint: item.native,
      coach: { title: item.answer, native: item.native, translation: item.native, ref: { tab: "vocabulary", key: item.answer } },
    };
  }

  const withExample = deck.vocab.filter((v) => v.example?.target);
  const candidates = withExample.filter((v) => new RegExp(`\\b${escapeRe(v.term)}\\w*\\b`, "i").test(v.example!.target));
  const pool = candidates.length ? candidates : withExample;
  const word = at(pool, n) ?? at(deck.allVocab, n);

  if (word?.example?.target) {
    const re = new RegExp(`\\b${escapeRe(word.term)}\\w*\\b`, "i");
    const found = word.example.target.match(re);
    if (found) {
      return {
        id: "",
        type: "fill_blank",
        instruction: "Fill in the blank",
        sentence: pairOf(word.example.target.replace(re, "______"), word.example.native),
        options: buildOptions(rand, found[0], deck.allVocab.map((v) => v.term)),
        answer: found[0],
        hint: nativeOf(word),
        coach: coachForWord(word),
      };
    }
  }
  return makeSelectTranslation(ctx, n);
};

const makeTypeHear: Builder = (ctx, n) => {
  const { rand, deck } = ctx;
  const bankItems = ctx.plan.slice.bank.typeHear ?? [];
  const bankItem = takeBank(ctx, bankItems, n, (x) => x.sentence);
  const sentence = bankItem ? pairOf(bankItem.sentence, bankItem.native) : takeSentence(ctx, deck.sentences);
  if (!sentence) return makeSelectTranslation(ctx, n);
  return {
    id: "",
    type: "type_hear",
    instruction: "Listen and type what you hear",
    sentence,
    answer: sentence.target,
    hint: sentence.native,
    coach: coachForSentence("Listen and type", sentence, "Play it once more and repeat each word as you type it.", undefined, fbFor(ctx, sentence)),
  };
};

const makeReorder: Builder = (ctx, n) => {
  const { rand, deck } = ctx;
  const bankItems = ctx.plan.slice.bank.reorder ?? [];
  const reorderItem = takeBank(ctx, bankItems, n, (x) => x.sentence);
  const sentence = reorderItem ? pairOf(reorderItem.sentence, reorderItem.native) : takeSentence(ctx, deck.sentences);
  if (!sentence) return makeSelectTranslation(ctx, n);
  const bare = sentence.target.replace(/[.?!,]+$/, "");
  return {
    id: "",
    type: "reorder",
    instruction: "Put the words in the correct order",
    sentence,
    words: shuffle(rand, bare.split(/\s+/)),
    answer: bare,
    hint: sentence.native,
    coach: coachForSentence("Word order", sentence, "Say the whole sentence in one breath — the order you say it in is the order to tap.", undefined, fbFor(ctx, sentence)),
  };
};

const makeListenSelect: Builder = (ctx, n) => {
  const { rand, deck } = ctx;
  const bankItems = ctx.plan.slice.bank.listenSelect ?? [];
  const listenBankItem = takeBank(ctx, n % 2 === 0 ? bankItems : [], n, (x) => x.prompt);
  if (listenBankItem) {
    const item = listenBankItem;
    return {
      id: "",
      type: "listen_select",
      instruction: "Listen and choose the correct option",
      sentence: pairOf(item.prompt, item.native),
      options: buildOptions(rand, item.answer, item.options?.length ? item.options : deck.allVocab.map((v) => v.term)),
      answer: item.answer,
      hint: item.native,
      coach: { title: item.answer, native: item.native, translation: item.native, ref: { tab: "vocabulary", key: item.answer } },
    };
  }

  const word = at(deck.vocab, n) ?? at(deck.allVocab, n);
  if (!word) {
    const sentence = takeSentence(ctx, deck.sentences);
    if (!sentence) return makeSelectTranslation(ctx, n);
    return {
      id: "",
      type: "listen_select",
      instruction: "Listen and choose the sentence you hear",
      sentence,
      options: buildOptions(rand, sentence.target, deck.allSentences.map((x) => x.target)),
      answer: sentence.target,
      hint: sentence.native,
      coach: coachForSentence("Listen and choose", sentence, "Listen once for the sound, once for the meaning.", undefined, fbFor(ctx, sentence)),
    };
  }
  return {
    id: "",
    type: "listen_select",
    instruction: "Listen and choose the word you hear",
    sentence: pairOf(word.term, nativeOf(word)),
    options: buildOptions(rand, word.term, deck.allVocab.map((v) => v.term)),
    answer: word.term,
    hint: nativeOf(word),
    coach: coachForWord(word),
  };
};

const makeSpeak: Builder = (ctx, n) => {
  const { rand, deck } = ctx;
  const bankItems = ctx.plan.slice.bank.speak ?? [];
  const turns = deck.conversations.flatMap((c) => c.turns.map((t) => pairOf(t.target, t.native)));
  const pool = n % 2 === 0 && turns.length ? turns : deck.sentences;
  const speakBankItem = takeBank(ctx, bankItems, n, (x) => x.sentence);
  const sentence = speakBankItem ? pairOf(speakBankItem.sentence, speakBankItem.native) : takeSentence(ctx, pool);

  if (!sentence) {
    const word = at(deck.vocab, n) ?? at(deck.allVocab, n);
    if (!word) return makeSelectTranslation(ctx, n);
    return {
      id: "",
      type: "speak",
      instruction: "Say this word out loud",
      sentence: pairOf(word.term, nativeOf(word)),
      answer: word.term,
      hint: word.pronunciation,
      coach: coachForWord(word),
    };
  }
  return {
    id: "",
    type: "speak",
    instruction: "Read this sentence out loud",
    sentence,
    answer: sentence.target,
    hint: sentence.native,
    coach: coachForSentence("Speak it", sentence, "Tap 🔊 first, then copy the rhythm of the speaker.", undefined, fbFor(ctx, sentence)),
  };
};

const makeTapComplete: Builder = (ctx, n) => {
  const { rand, deck, grammarAnswers } = ctx;
  const bankItems = ctx.plan.slice.bank.tapComplete ?? [];
  const tapBankItem = takeBank(ctx, n % 2 === 1 ? bankItems : [], n, (x) => x.prompt);
  if (tapBankItem) {
    const item = tapBankItem;
    const options = item.options && item.options.length >= 2 ? shuffle(rand, item.options) : buildOptions(rand, item.answer, grammarAnswers);
    if (options.length < 2) return makeFillBlank(ctx, n);
    return {
      id: "",
      type: "tap_complete",
      instruction: "Grammar: choose the correct option",
      sentence: pairOf(item.prompt, item.native),
      wordBank: options,
      options,
      answer: item.answer,
      hint: item.native,
      explain: item.explanation,
      coach: { title: "Grammar", native: item.native ?? item.explanation, translation: item.native, note: item.explanation },
    };
  }

  const topic = at(deck.grammar, n) ?? at(deck.allGrammar, n);
  const exercise = topic?.exercises.length ? at(topic.exercises, n) : undefined;
  if (!topic || !exercise) return makeFillBlank(ctx, n);
  const options = exercise.options && exercise.options.length >= 2 ? shuffle(rand, exercise.options) : buildOptions(rand, exercise.answer, grammarAnswers);
  if (options.length < 2) return makeSelectTranslation(ctx, n);
  return {
    id: "",
    type: "tap_complete",
    instruction: `Grammar: ${topic.title} — choose the correct option`,
    sentence: pairOf(exercise.prompt, exercise.nativeExplanation ?? topic.nativeRule),
    wordBank: options,
    options,
    answer: exercise.answer,
    hint: exercise.explanation ?? topic.rule,
    explain: exercise.explanation,
    coach: coachForGrammar(topic, exercise),
  };
};

/* ------------------------------- orchestration ------------------------------ */

const BUILDERS: Record<ActivityKind, Builder> = {
  match: makeMatch,
  select_translation: makeSelectTranslation,
  fill_blank: makeFillBlank,
  type_hear: makeTypeHear,
  reorder: makeReorder,
  listen_select: makeListenSelect,
  speak: makeSpeak,
  tap_complete: makeTapComplete,
};

const ORDER_BY_LESSON: Record<LessonPlan["type"], ActivityKind[]> = {
  vocab: ["match", "select_translation", "fill_blank", "listen_select", "type_hear", "reorder", "speak", "tap_complete"],
  grammar: ["tap_complete", "fill_blank", "tap_complete", "reorder", "select_translation", "type_hear", "speak"],
  speaking: ["speak", "listen_select", "type_hear", "reorder", "select_translation", "match"],
  idiom: ["select_translation", "match", "fill_blank", "select_translation", "reorder", "speak", "listen_select"],
  review: ["match", "select_translation", "fill_blank", "type_hear", "reorder", "listen_select", "speak", "tap_complete"],
};

function makeCtx(pack: ContentPack, plan: LessonPlan, seed: number) {
  const rand = seededRandom(seed);
  const wide = widenedPlan(pack, plan);
  const grammarAnswers = [
    ...pack.grammar.flatMap((g) => g.exercises.flatMap((e) => [...(e.options ?? []), e.answer])),
    ...(wide.slice.bank.tapComplete ?? []).map((b) => b.answer),
  ].filter(Boolean);
  const ctx: Ctx = {
    deck: buildDeck(pack, wide),
    rand,
    plan: wide,
    grammarAnswers,
    sentenceFb: buildSentenceFeedback(pack),
    usedSentences: new Set<string>(),
  };
  return ctx;
}

export function buildLessonExercises(pack: ContentPack, plan: LessonPlan, count = 16): Exercise[] {
  const ctx = makeCtx(pack, plan, plan.id * 7919 + pack.vocabulary.length * 131 + plan.unitId * 17);
  const preferred = ORDER_BY_LESSON[plan.type] ?? ORDER_BY_LESSON.review;
  const exercises: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    const kind = preferred[i % preferred.length];
    const ex = BUILDERS[kind](ctx, i);
    if (!ex || ex.answer === undefined) continue;
    exercises.push({ ...ex, id: `${plan.id}-${i}-${ex.type}` });
  }
  return exercises;
}

function syntheticPlan(pack: ContentPack, unitId: number, id: number): LessonPlan {
  return {
    id,
    unitId,
    order: 7,
    type: "review",
    title: "Practice",
    level: "Mixed",
    xp: 20,
    gems: 5,
    slice: { vocab: [], grammar: [], idioms: [], sentences: [], conversations: [], bank: {} },
  };
}

/** General review drawn from the whole pack. */
export function buildReviewExercises(pack: ContentPack, count = 12, seedKey = 1): Exercise[] {
  return buildLessonExercises(pack, syntheticPlan(pack, 1, 900000 + (seedKey % 1000)), count);
}

/** Targeted practice: prioritises the items the learner struggled with. */
export function buildPracticeExercises(pack: ContentPack, hardTerms: string[], count = 12): Exercise[] {
  const hardSet = new Set(hardTerms.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const hardIndices = pack.vocabulary.map((v, i) => (hardSet.has(v.term.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  const fallback = pack.vocabulary.map((_, i) => i).slice(0, 40);

  const plan: LessonPlan = {
    id: 999999,
    unitId: 1,
    order: 7,
    type: "review",
    title: "Smart practice",
    level: "Mixed",
    xp: 20,
    gems: 5,
    slice: {
      vocab: hardIndices.length ? hardIndices : fallback,
      grammar: pack.grammar.map((_, i) => i).slice(0, 12),
      idioms: pack.idioms.map((_, i) => i).slice(0, 20),
      sentences: pack.sentences.map((_, i) => i).slice(0, 40),
      conversations: pack.conversations.map((_, i) => i).slice(0, 6),
      bank: {},
    },
  };
  return buildLessonExercises(pack, plan, count);
}

/** How many exercises a lesson will contain for a pack of this size. */
export function exercisesPerLesson(pack: ContentPack): number {
  const items = pack.vocabulary.length + pack.grammar.length + pack.idioms.length + pack.sentences.length + pack.conversations.length;
  return items < 60 ? 8 : 16;
}
