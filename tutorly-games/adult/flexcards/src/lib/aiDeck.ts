/*
 * Bringing your own deck.
 *
 * The app ships one demo deck and `FlexcardsTool` has always accepted a `payload` prop, but
 * nothing ever passed one — so a tutor who wanted their own lesson vocabulary had no way in.
 * This module is the two halves of that missing bridge:
 *
 *   1. `buildAiPrompt()` — the text a tutor copies into ChatGPT / Gemini / Claude. It asks the
 *      model for the whole deck, in the exact shape the twelve sections render, and it is
 *      deliberately explicit that the model must answer with JSON alone.
 *   2. `parseAiDeck()` — the way back in. Everything that comes out of a language model is
 *      treated as untrusted, so this repairs as much as it can (fields named `word`/`term`,
 *      synonyms as a comma-separated string, a bare array instead of an object, markdown
 *      fences, a doubly-encoded string) and reports what it could not use rather than throwing
 *      the whole deck away over one malformed card.
 *
 * The contracts live in `data/deck.ts` — `FlexItem` / `Payload`. Nothing here renames them.
 */

import type { Deploy, FlexItem, Payload } from "../data/deck";

/**
 * The twelve sections the app renders, and the fields each one reads.
 *
 * Grouped exactly as the card is, because the prompt has to tell the model what the app is going
 * to do with each field — an ungrouped list of twenty-six names gets a deck that is technically
 * valid and pedagogically empty.
 */
const PROMPT_SECTIONS: Array<{ title: string; purpose: string; fields: Array<{ field: string; note: string }> }> = [
  {
    title: "The word",
    purpose: "the card face — always shown",
    fields: [
      { field: "front", note: 'the headword or phrase, capitalised normally' },
      { field: "back", note: 'a short plain-English gloss, under 12 words' },
      { field: "pronunciation", note: 'respelled syllables, e.g. "ser·en·DIP·i·ty"' },
      { field: "phoneticIPA", note: 'IPA with slashes, e.g. "/ˌser.ənˈdɪp.ɪ.ti/"' },
      { field: "partOfSpeech", note: '"noun", "verb", "adjective", "phrase" …' },
      { field: "difficulty", note: "exactly one of A1 A2 B1 B2 C1 C2" },
      { field: "image", note: "a real, hot-linkable https image URL, or omit it" },
      { field: "imageAlt", note: "one sentence describing that image for a screen reader" },
    ],
  },
  {
    title: "What it means",
    purpose: "the meaning, with a check that the class understood it",
    fields: [
      { field: "definition", note: "the full definition, plus etymology if you know it" },
      { field: "synonyms", note: "array of 3-6 words" },
      { field: "antonyms", note: "array of 2-5 words" },
      { field: "ccq", note: "two concept-checking questions, each with its answer in brackets" },
    ],
  },
  {
    title: "How it is used",
    purpose: "register, partner words and a model sentence",
    fields: [
      { field: "usage", note: "where a learner will actually meet the word" },
      { field: "example", note: "one natural model sentence" },
      { field: "collocations", note: "array of 3-5 natural word partners" },
    ],
  },
  {
    title: "Register",
    purpose: "the same idea at five levels of formality",
    fields: [
      { field: "register", note: 'an object with all five keys: slang, casual, informal, neutral, formal' },
      { field: "registerSlider", note: "1 = very casual … 5 = very formal" },
    ],
  },
  {
    title: "In your language",
    purpose: "translations, spoken aloud over the audio",
    fields: [{ field: "nativeEquivalents", note: '{"Spanish": "…", "French": "…"} — only the languages you are sure of' }],
  },
  {
    title: "Do it",
    purpose: "a timed physical task, performed out loud",
    fields: [{ field: "challenge", note: "a task the class does in under 60 seconds" }],
  },
  {
    title: "Truth or dare",
    purpose: "speaking practice with a real stake",
    fields: [{ field: "truthOrDare", note: '{"truth": "…", "dare": "…"}' }],
  },
  {
    title: "Would you rather",
    purpose: "a forced choice worth arguing about",
    fields: [{ field: "wouldYou", note: "one dilemma built on the word" }],
  },
  {
    title: "Where it comes from",
    purpose: "etymology, culture and the mistakes learners make",
    fields: [
      { field: "culturalFact", note: "origin, culture or a surprising true fact" },
      { field: "commonErrors", note: "array of the mistakes learners actually make" },
    ],
  },
  {
    title: "On screen",
    purpose: "hear it used by a real speaker",
    fields: [{ field: "movie", note: "a quotable line that uses the word, with the source" }],
  },
  {
    title: "In song",
    purpose: "carry the rhythm",
    fields: [{ field: "song", note: "a lyric that carries the word, plus the artist or genre" }],
  },
  {
    title: "The joke",
    purpose: "reveal, laugh, then say it out loud",
    fields: [{ field: "joke", note: "one short, clean joke or pun" }],
  },
];

/** A minimal but complete card, shown in the prompt and in the import panel. */
export const SAMPLE_CARD = `{
  "id": "serendipity",
  "front": "Serendipity",
  "back": "A fortunate discovery made by accident",
  "pronunciation": "ser·en·DIP·i·ty",
  "phoneticIPA": "/ˌser.ənˈdɪp.ɪ.ti/",
  "partOfSpeech": "noun",
  "difficulty": "C1",
  "definition": "Finding something valuable without looking for it.",
  "example": "Finding that rare book at a garage sale was pure serendipity.",
  "synonyms": ["luck", "happy chance", "fluke"],
  "antonyms": ["misfortune", "design"],
  "nativeEquivalents": { "Spanish": "serendipia", "French": "sérendipité" },
  "image": "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1400&q=80"
}`;

/**
 * The prompt a tutor copies and hands to any AI chat.
 *
 * It is written to be pasted *before* the material: the model is told, in the same message, to
 * wait for lesson content or a PDF, which is what makes "here is a PDF, make me cards" work
 * without the tutor having to phrase anything themselves.
 */
export function buildAiPrompt(options: { count?: number; nativeLang?: string; title?: string } = {}): string {
  const count = options.count ?? 10;
  const nativeLang = options.nativeLang?.trim() || "the learner's own language";
  const sectionLines = PROMPT_SECTIONS.map(
    (section, index) =>
      `  ${index + 1}. "${section.title}" — ${section.purpose}\n` +
      section.fields.map((entry) => `       • "${entry.field}" — ${entry.note}`).join("\n")
  ).join("\n");

  return `You are an experienced English teacher building a FlexCards lesson.

I will give you either lesson content (text, a word list, an article, a transcript) or a PDF after this line. If I give you a topic instead of material, choose the vocabulary yourself. If I give you nothing at all, ask me for the topic before writing anything.

Build me a vocabulary deck of exactly ${count} cards from that material, and reply with ONE JSON object and nothing else.

THE JSON SHAPE
{
  "title": "short deck title, e.g. \\"Unit 4 — Travel and Delays\\"",
  "targetLang": "English",
  "nativeLang": "${nativeLang}",
  "items": [ { ...card... }, { ...card... } ]
}

EVERY CARD — required fields
  - "id"   — a short lowercase slug, unique in the deck
  - "front" — the word or phrase
  - "back"  — a short plain-English meaning

EVERY CARD — optional fields, grouped by the section of the card they appear in. The app HIDES a section whose fields are all empty, so fill as many as the material honestly supports and leave the rest out; it is far better to omit a field than to invent filler.
${sectionLines}

RULES
  1. Reply with the JSON object ONLY. No markdown code fences, no "here is your deck", no explanation before or after.
  2. It must be strictly valid JSON: double quotes everywhere, no trailing commas, inner quotes escaped.
  3. Choose words at the right level for the material. Set "difficulty" to the CEFR level of each word, not of the class.
  4. Write "back" and "definition" as a teacher explains them out loud — never copy a dictionary sentence wholesale.
  5. "nativeEquivalents" should be in ${nativeLang}, and only if you are confident the translation is right.
  6. "image" must be a real, hot-linkable https image URL. If you are not sure one exists, omit the field.
  7. Keep "challenge", "wouldYou" and "truthOrDare" safe and classroom-appropriate for adults and older teenagers.
  8. No emoji anywhere in the output.

NOW PASTE YOUR LESSON CONTENT OR ATTACH YOUR PDF BELOW THIS LINE, THEN SEND.`;
}

/** A compact skeleton to paste when the tutor would rather fill it in by hand. */
export function buildJsonTemplate(): string {
  const card = SAMPLE_CARD.split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  return `{\n  "title": "My lesson deck",\n  "targetLang": "English",\n  "nativeLang": "Spanish",\n  "items": [\n${card}\n  ]\n}`;
}

export interface DeckParseResult {
  deck: Payload | null;
  cardCount: number;
  warnings: string[];
  error: string | null;
}

const DIFFICULTIES = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

function text(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/** A list field: accepts a real array, or one delimited string ("luck, chance, fluke"). */
function list(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const out = value.map(text).filter((entry): entry is string => Boolean(entry));
    return out.length ? out : undefined;
  }
  if (typeof value === "string") {
    const out = value
      .split(/[,;\n]|\s\/\s/)
      .map((part) => part.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "card"
  );
}

/** Strip a BOM and any markdown fence a model wrapped around the JSON. */
function stripFences(raw: string): string {
  const body = raw.trim().replace(/^\uFEFF/, "");
  const fence = body.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  return (fence && fence[1] ? fence[1] : body).trim();
}

/**
 * Slice the outer `{…}` / `[…]` out of surrounding prose.
 *
 * A `"` at the start is left alone: that is a JSON-string reply (a model that double-encoded its
 * own answer), and slicing the braces out of it would leave the escaped inner quotes behind and
 * produce something unparseable. `parseLoose` unwraps that case on the second pass instead.
 */
function sliceBraces(body: string): string {
  if (body.startsWith('"') || body.startsWith("'") || body.startsWith("`")) return body;
  const firstBrace = body.indexOf("{");
  const firstBracket = body.indexOf("[");
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start <= 0) return body;
  const open = body[start];
  const close = open === "{" ? body.lastIndexOf("}") : body.lastIndexOf("]");
  return close > start ? body.slice(start, close + 1).trim() : body;
}

/**
 * Parse as generously as the input allows, then unwrap a JSON-string reply.
 *
 * Order matters: a fenced reply with prose around it needs the fence stripped first, while a
 * quoted reply needs to be parsed *as a string* before anything is sliced out of it.
 */
function parseLoose(raw: string): unknown {
  const fenced = stripFences(raw);
  let value: unknown;
  try {
    value = JSON.parse(fenced);
  } catch {
    value = JSON.parse(sliceBraces(fenced));
  }
  if (typeof value === "string") {
    const nested = sliceBraces(stripFences(value));
    value = JSON.parse(nested);
  }
  return value;
}

function coerceRegister(value: unknown): Deploy | undefined {
  if (Array.isArray(value) && value.length >= 5) {
    const parts = value.map(text);
    if (parts.every(Boolean)) {
      return {
        slang: parts[0] as string,
        casual: parts[1] as string,
        informal: parts[2] as string,
        neutral: parts[3] as string,
        formal: parts[4] as string,
      };
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Deploy = {
      slang: text(record.slang) ?? "",
      casual: text(record.casual) ?? "",
      informal: text(record.informal) ?? "",
      neutral: text(record.neutral) ?? "",
      formal: text(record.formal) ?? "",
    };
    return Object.values(out).some(Boolean) ? out : undefined;
  }
  return undefined;
}

function coerceTruthOrDare(value: unknown): { truth: string; dare: string } | undefined {
  if (Array.isArray(value) && value.length >= 2) {
    const truth = text(value[0]);
    const dare = text(value[1]);
    if (truth && dare) return { truth, dare };
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const truth = text(record.truth);
    const dare = text(record.dare);
    if (truth && dare) return { truth, dare };
  }
  return undefined;
}

function coerceEquivalents(value: unknown): Record<string, string> | undefined {
  const source = Array.isArray(value)
    ? Object.fromEntries(value.map((entry) => {
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          return [text(record.language) ?? text(record.lang) ?? "", text(record.word) ?? text(record.value) ?? ""];
        }
        return ["", ""];
      }))
    : value;
  if (!source || typeof source !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(source as Record<string, unknown>)) {
    const language = text(key);
    const word = text(raw);
    if (language && word) out[language] = word;
  }
  return Object.keys(out).length ? out : undefined;
}

function coerceCard(raw: unknown, index: number, warnings: string[]): FlexItem | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  const front = text(record.front) ?? text(record.word) ?? text(record.term) ?? text(record.question);
  const back =
    text(record.back) ??
    text(record.meaning) ??
    text(record.answer) ??
    text(record.gloss) ??
    text(record.translation) ??
    (text(record.definition) ? text(record.definition)!.split(/(?<=[.!?])\s/)[0] : undefined);

  if (!front || !back) {
    warnings.push(`Card ${index + 1} had no ${!front ? '"front"' : '"back"'} and was skipped.`);
    return null;
  }

  const difficultyRaw = text(record.difficulty)?.toUpperCase();
  const difficulty = DIFFICULTIES.find((entry) => entry === difficultyRaw);

  const sliderRaw = record.registerSlider;
  const registerSlider =
    typeof sliderRaw === "number" && Number.isFinite(sliderRaw)
      ? Math.min(5, Math.max(1, Math.round(sliderRaw)))
      : undefined;

  return {
    id: text(record.id) ? slug(text(record.id)!) : slug(front),
    front,
    back,
    pronunciation: text(record.pronunciation),
    phoneticIPA: text(record.phoneticIPA) ?? text(record.ipa) ?? text(record.phonetic),
    example: text(record.example),
    ccq: text(record.ccq) ?? text(record.ccqs),
    image: text(record.image) ?? text(record.imageUrl),
    imageCredit: text(record.imageCredit),
    imageAlt: text(record.imageAlt),
    challenge: text(record.challenge),
    joke: text(record.joke),
    song: text(record.song),
    movie: text(record.movie),
    usage: text(record.usage),
    definition: text(record.definition),
    synonyms: list(record.synonyms),
    antonyms: list(record.antonyms),
    culturalFact: text(record.culturalFact),
    commonErrors: list(record.commonErrors),
    wouldYou: text(record.wouldYou),
    truthOrDare: coerceTruthOrDare(record.truthOrDare),
    register: coerceRegister(record.register),
    registerSlider,
    partOfSpeech: text(record.partOfSpeech),
    difficulty,
    tags: list(record.tags),
    nativeEquivalents: coerceEquivalents(record.nativeEquivalents),
    collocations: list(record.collocations),
    videoQuery: text(record.videoQuery),
  };
}

/**
 * Turn whatever the model produced into a deck the app can play.
 *
 * Never throws: a tutor mid-lesson needs to be told which card was dropped, not shown a stack
 * trace. `warnings` is the honest list of what was repaired or skipped.
 */
export function parseAiDeck(raw: string, fallbackTitle?: string): DeckParseResult {
  const warnings: string[] = [];
  if (!raw || !raw.trim()) {
    return { deck: null, cardCount: 0, warnings, error: "Nothing was pasted. Copy the AI's reply and paste the whole thing here." };
  }

  let parsed: unknown;
  try {
    parsed = parseLoose(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      deck: null,
      cardCount: 0,
      warnings,
      error: `That is not valid JSON (${message}). Copy the AI's reply again — it must start with { and end with }.`,
    };
  }

  if (typeof parsed === "string") warnings.push("The reply arrived as a quoted string and was unwrapped.");

  if (!parsed || typeof parsed !== "object") {
    return { deck: null, cardCount: 0, warnings, error: "The pasted JSON is not an object. It should look like { \"items\": [ … ] }." };
  }

  const root = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(parsed)
    ? parsed
    : (root.items ?? root.cards ?? root.flexcards ?? root.deck ?? root.vocabulary);

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      deck: null,
      cardCount: 0,
      warnings,
      error: 'No cards found. The JSON needs an "items" array — { "items": [ { "front": "…", "back": "…" } ] }.',
    };
  }

  const items: FlexItem[] = [];
  const seen = new Map<string, number>();
  rawItems.forEach((raw, index) => {
    const card = coerceCard(raw, index, warnings);
    if (!card) return;
    const count = seen.get(card.id) ?? 0;
    seen.set(card.id, count + 1);
    if (count > 0) card.id = `${card.id}-${count + 1}`;
    items.push(card);
  });

  if (items.length === 0) {
    return { deck: null, cardCount: 0, warnings, error: "Every card was missing a front or back, so nothing could be built." };
  }

  const title = text(root.title) ?? text(root.deckTitle) ?? text(root.name) ?? fallbackTitle ?? "My deck";
  const deck: Payload = {
    title,
    targetLang: text(root.targetLang) ?? text(root.language) ?? "English",
    nativeLang: text(root.nativeLang) ?? text(root.translationLanguage),
    deckId: text(root.deckId) ?? `ai-${slug(title)}-${items.length}`,
    items,
  };

  return { deck, cardCount: items.length, warnings, error: null };
}

/* ─────────────────────────────────────────────────────────────
 * Persistence
 *
 * The built deck is the tutor's own work, so it has to survive a reload — a lesson that loses
 * its vocabulary when the laptop sleeps is worse than no import at all. Kept in localStorage
 * under one key, beside the SRS store that `lib/srs.ts` owns.
 * ───────────────────────────────────────────────────────────── */

const DECK_KEY = "flexcards.aideck.v1";

export function saveSavedDeck(deck: Payload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DECK_KEY, JSON.stringify(deck));
  } catch {
    /* private mode or a full quota — the deck still plays for this session */
  }
}

export function loadSavedDeck(): Payload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DECK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Payload;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedDeck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DECK_KEY);
  } catch {
    /* nothing to do */
  }
}

/** Clipboard with a fallback for a non-secure origin, which is where `writeText` is absent. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
