/**
 * Race-against-time quizzes.
 *
 * The reference pages already let a learner *read* the course; these quizzes make
 * them produce it, under a clock, with a lot of questions drawn from everything the
 * pack holds. Each builder produces ONE question per item and never repeats the same
 * prompt twice — the same rule the AI prompt demands of the lesson content itself.
 */
import type { ContentPack, Conversation } from "@/content/tutolingo";

export interface RaceQuestion {
  id: string;
  /** `choose` = pick the right option; `order` = rebuild a sequence. */
  kind: "choose" | "order";
  /** What the learner has to do, e.g. “Which word means “journey”?”. */
  title: string;
  /** Small print under the title (a translation, a setting, a speaker). */
  hint?: string;
  /** The big line on the card (target-language text, or the meaning to match). */
  prompt?: string;
  /** Text to read aloud when the card opens. */
  speak?: string;
  /** For dialogue replies: the lines that came before, so the reply has context. */
  context?: { speaker?: string; target: string; native?: string }[];
  options?: string[];
  answer?: string;
  /** For `order` questions: the correct sequence, top to bottom. */
  sequence?: string[];
  /** Shown after the timer or an answer. */
  explain?: string;
}

export const RACE_LIMIT = 40;
/** An ordering round is long to read, so those quizzes ask fewer (but longer) questions. */
export const ORDER_LIMIT = 24;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** `count` distractors, deduplicated and never equal to the answer. */
function distractors(pool: string[], answer: string, count = 3): string[] {
  const clean = Array.from(new Set(pool.map((p) => (p || "").trim()).filter(Boolean))).filter(
    (p) => p.toLowerCase() !== answer.trim().toLowerCase(),
  );
  return shuffle(clean).slice(0, count);
}

function optionsFor(pool: string[], answer: string, count = 4): string[] | undefined {
  const others = distractors(pool, answer, count - 1);
  if (others.length < 1) return undefined;
  return shuffle([answer, ...others]);
}

const blankOut = (sentence: string, term: string): string | undefined => {
  const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*\\b`, "i");
  return re.test(sentence) ? sentence.replace(re, "______") : undefined;
};

/* ------------------------------- vocabulary ------------------------------- */

/**
 * Four question shapes per word: meaning → word, word → meaning, word → gap, and
 * listening. Every applicable shape becomes a candidate, so a long pack keeps
 * producing fresh runs and a short one still fills a full quiz.
 */
export function buildVocabRace(pack: ContentPack, limit = RACE_LIMIT): RaceQuestion[] {
  const terms = pack.vocabulary.map((v) => v.term);
  const meanings = pack.vocabulary.map((v) => v.translation || v.nativeNote || v.definition || "").filter(Boolean);
  const out: RaceQuestion[] = [];

  pack.vocabulary.forEach((word) => {
    const meaning = word.translation || word.nativeNote || word.definition || "";

    if (meaning) {
      const options = optionsFor(terms, word.term);
      if (options) {
        out.push({
          id: `v-word-${word.term}`,
          kind: "choose",
          title: "Which word means this?",
          prompt: meaning,
          answer: word.term,
          options,
          explain: `${word.term} — ${meaning}`,
        });
      }
    }

    if (meaning) {
      const options = optionsFor(meanings, meaning);
      if (options) {
        out.push({
          id: `v-mean-${word.term}`,
          kind: "choose",
          title: "What does this mean?",
          prompt: word.term,
          speak: word.term,
          answer: meaning,
          options,
          explain: `${word.term} — ${meaning}`,
        });
      }
    }

    if (word.example?.target) {
      const gapped = blankOut(word.example.target, word.term);
      const options = optionsFor(terms, word.term);
      if (gapped && options) {
        out.push({
          id: `v-gap-${word.term}`,
          kind: "choose",
          title: "Which word completes the sentence?",
          prompt: gapped,
          hint: word.example.native,
          answer: word.term,
          options,
          explain: word.example.target,
        });
      }
    }

    const listenOptions = optionsFor(terms, word.term);
    if (listenOptions) {
      out.push({
        id: `v-listen-${word.term}`,
        kind: "choose",
        title: "Listen — which word do you hear?",
        speak: word.term,
        hint: meaning || undefined,
        answer: word.term,
        options: listenOptions,
        explain: meaning ? `${word.term} — ${meaning}` : word.term,
      });
    }
  });

  return shuffle(out).slice(0, limit);
}

/* --------------------------------- idioms --------------------------------- */

export function buildIdiomRace(pack: ContentPack, limit = RACE_LIMIT): RaceQuestion[] {
  const expressions = pack.idioms.map((i) => i.expression);
  const meanings = pack.idioms.map((i) => i.meaning || i.nativeMeaning || "").filter(Boolean);
  const out: RaceQuestion[] = [];

  pack.idioms.forEach((idiom) => {
    const meaning = idiom.meaning || idiom.nativeMeaning || "";
    const native = idiom.nativeMeaning;

    if (meaning) {
      const options = optionsFor(meanings, meaning);
      if (options) {
        out.push({
          id: `i-mean-${idiom.expression}`,
          kind: "choose",
          title: "What does this expression mean?",
          prompt: idiom.expression,
          speak: idiom.expression,
          hint: native,
          answer: meaning,
          options,
          explain: idiom.example?.target,
        });
      }
    }

    if (meaning) {
      const options = optionsFor(expressions, idiom.expression);
      if (options) {
        out.push({
          id: `i-match-${idiom.expression}`,
          kind: "choose",
          title: "Which expression means this?",
          prompt: meaning,
          hint: native,
          answer: idiom.expression,
          options,
          explain: idiom.example?.target,
        });
      }
    }

    if (idiom.example?.target) {
      const gapped = blankOut(idiom.example.target, idiom.expression.split(/\s+/)[0]);
      const options = optionsFor(expressions, idiom.expression);
      if (gapped && options) {
        out.push({
          id: `i-gap-${idiom.expression}`,
          kind: "choose",
          title: "Which expression fits the gap?",
          prompt: gapped,
          hint: idiom.example.native,
          answer: idiom.expression,
          options,
          explain: idiom.example.target,
        });
      }
    }
  });

  return shuffle(out).slice(0, limit);
}

/* -------------------------------- dialogues ------------------------------- */

const speakerOf = (turn: Conversation["turns"][number], conversation: Conversation): string =>
  turn.name?.trim() || (turn.speaker ? `${conversation.title} · ${turn.speaker}` : "Speaker");

/**
 * “Choose the best reply”: every turn that answers somebody becomes a question, and
 * the wrong options are real lines from elsewhere in the course — so the only way to
 * win is to understand what was actually said.
 */
export function buildReplyRace(pack: ContentPack, limit = RACE_LIMIT): RaceQuestion[] {
  const allLines = pack.conversations.flatMap((c) => c.turns.map((t) => t.target));
  const out: RaceQuestion[] = [];

  for (const conversation of pack.conversations) {
    conversation.turns.forEach((turn, i) => {
      if (i === 0) return;
      const correct = turn.target;
      const others = distractors(allLines, correct).length >= 3 ? distractors(allLines, correct) : [];
      if (others.length < 3) return;
      const before = conversation.turns.slice(Math.max(0, i - 2), i).map((t) => ({
        speaker: t.speaker === turn.speaker ? undefined : speakerOf(t, conversation),
        target: t.target,
        native: t.native,
      }));
      out.push({
        id: `c-reply-${conversation.id ?? conversation.title}-${i}`,
        kind: "choose",
        title: conversation.turns[i - 1].speaker === turn.speaker ? "What comes next?" : "Choose the best reply",
        hint: conversation.setting,
        context: before,
        answer: correct,
        options: shuffle([correct, ...others]),
        explain: turn.native,
      });
    });
  }

  return shuffle(out).slice(0, limit);
}

/**
 * “Rebuild the conversation”: four consecutive lines, shuffled, put back in order.
 * Thinking about who answers whom is the whole exercise.
 */
export function buildOrderRace(pack: ContentPack, limit = ORDER_LIMIT): RaceQuestion[] {
  const out: RaceQuestion[] = [];

  for (const conversation of pack.conversations) {
    for (let start = 0; start + 4 <= conversation.turns.length; start += 2) {
      const slice = conversation.turns.slice(start, start + 4);
      if (slice.some((t) => !t.target.trim())) continue;
      out.push({
        id: `c-order-${conversation.id ?? conversation.title}-${start}`,
        kind: "order",
        title: "Reorder the conversation",
        hint: conversation.goal || conversation.setting,
        sequence: slice.map((t) => t.target),
        explain: slice.map((t) => `${speakerOf(t, conversation)}: ${t.target}`).join("\n"),
      });
    }
  }

  return shuffle(out).slice(0, limit);
}
