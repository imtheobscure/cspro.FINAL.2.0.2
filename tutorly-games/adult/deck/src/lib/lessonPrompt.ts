/**
 * The lesson-to-deck prompt.
 *
 * A tutor arrives with a lesson — a PDF, a handout, a page of notes — and leaves with a
 * deck that the app's seven modes can actually play. That is the job of the string this
 * module builds, and the string is the product: the app cannot generate better content
 * than the briefing it gives.
 *
 * Three things make this materially different from a generic "make me flashcards" prompt:
 *
 *  1. **It is written for one learner.** Name, first language and a few facts are injected
 *     into the instructions, and the model is told where each of them goes. Personal
 *     examples are what makes a deck feel like it was made for you rather than about a
 *     topic, and that is most of the difference in whether a learner comes back.
 *  2. **It grades the language, not just the content.** Each CEFR band has concrete
 *     constraints below — sentence shape, clause count, vocabulary ceiling — because
 *     "simplify to A2" means nothing to a model without them, and a definition the learner
 *     cannot parse is not a definition.
 *  3. **It asks for fields the *game* needs.** Every field in the schema is consumed by a
 *     specific mode, and the prompt says which. `ccq` drives the Battle mode, `back` is
 *     what Race shows as a distractor, `hint` is the Typing mode's only crutch. Content
 *     that ignores the schema produces a deck that half-works.
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1";

/**
 * What "grade this to the level" actually means, band by band.
 *
 * Written as *instructions with numbers* rather than adjectives. A model told to write
 * "simply" will still produce subordinate clauses; a model told to keep every sentence to
 * one clause and twelve words will not.
 */
const LEVEL_RULES: Record<CefrLevel, string> = {
  A1: [
    "Write for a complete beginner.",
    "Vocabulary: roughly the 500 most frequent words only. If a definition needs a rarer word, use a different word.",
    "Sentences: one clause, present simple or 'to be', 5–10 words. No relative clauses, no conditionals, no passive.",
    "Definitions must work as a picture: name the category and the one thing that separates it ('a chair is furniture you sit on').",
    "The personal example must be about something in the learner's immediate world — their home, family, food, town, school.",
  ].join("\n"),
  A2: [
    "Write for an elementary learner.",
    "Vocabulary: roughly the 1,000 most frequent words. You may use 'because', 'but' and 'when'.",
    "Sentences: at most one subordinate clause, 8–14 words. Past simple and future with 'going to' are fine.",
    "Definitions should be one concrete sentence, then at most one clause of extra detail.",
    "The personal example must connect the word to the learner's daily routine or a recent experience.",
  ].join("\n"),
  B1: [
    "Write for an intermediate learner.",
    "Vocabulary: the 2,000 most frequent words plus the topic's own vocabulary. Add nothing decorative.",
    "Sentences: up to 18 words, one subordinate clause. Perfect tenses and first conditionals are fine.",
    "Definitions may name a nuance or a contrast with a near-synonym, but must stay concrete.",
    "The personal example should connect the word to the learner's study, work or plans.",
  ].join("\n"),
  B2: [
    "Write for an upper-intermediate learner.",
    "Vocabulary: general and academic words up to roughly the 4,000 most frequent. Keep idiom out of definitions.",
    "Sentences: up to 24 words, two clauses. Note register and connotation where they matter.",
    "Definitions must distinguish the word from its nearest synonyms — an upper-intermediate learner already knows the easy half of the meaning.",
    "The personal example should connect the word to the learner's field of study or opinions.",
  ].join("\n"),
  C1: [
    "Write for an advanced learner.",
    "Vocabulary: unconstrained, but never vague. Prefer precision over decoration.",
    "Sentences: up to 30 words. Nuance, register, collocation and connotation are the point.",
    "Definitions should place the word against its synonyms and note where a near-synonym would be wrong.",
    "The personal example should let the learner use the word about their own expertise or argument.",
  ].join("\n"),
};

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1"];

/** First-language codes that the live translation line and the prompt both understand. */
export const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  ar: "Arabic",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  uk: "Ukrainian",
};

export interface LessonBrief {
  learner: string;
  l1: string;
  level: CefrLevel;
  topic: string;
  count: number;
  facts: string;
  lessonText: string;
}

export const EMPTY_BRIEF: LessonBrief = {
  learner: "",
  l1: "es",
  level: "B1",
  topic: "",
  count: 12,
  facts: "",
  lessonText: "",
};

/** The JSON contract, described field by field, with the session mode each field feeds. */
const SCHEMA = `{
  "title": "Short deck title, e.g. 'Negotiating a Deadline'",
  "description": "One sentence naming the lesson and the learner it was built for.",
  "language": "The language being taught, e.g. 'English'",
  "learner": "The learner's name, exactly as given",
  "level": "The CEFR band this deck targets",
  "source": "Where the lesson came from, e.g. 'Unit 4 handout - Supply Chains'",
  "items": [
    {
      "id": "1",
      "front": "The word or expression exactly as it appears in the lesson",
      "back": "The definition. ONE sentence, written at the target CEFR band. Used as a distractor in the Time Race mode, so it must read correctly out of context and must never be circular.",
      "pronunciation": "IPA inside slashes, e.g. /ˌserənˈdipəti/. Real IPA - never a respelling.",
      "partOfSpeech": "noun | verb | adjective | adverb | phrase | phrasal verb ...",
      "register": "neutral | informal | formal | academic | dated | offensive - say if it is unsafe to use freely",
      "cefr": "The band THIS card is written at (may be lower than the deck's if the item is easy)",
      "example": "A personal example about THIS learner, using their name and at least one of their stated facts. Must sound like something a person would actually say to them.",
      "examples": [
        { "text": "A sentence from real published English, quoted accurately", "source": "News | Book: Title | Movie: Title | Academic | Business | Conversation" },
        { "text": "A second real sentence from a different source, or from the lesson itself", "source": "The source" },
        { "text": "A third sentence showing the item in a different register or sense", "source": "The source" }
      ],
      "l1Translation": "The meaning in the learner's first language, as a native speaker would say it - not a dictionary gloss",
      "etymology": {
        "root": "The root the word actually comes from",
        "origin": "Language of origin, e.g. 'Latin via Old French'",
        "meaning": "How the meaning developed, in 2 sentences at the target band",
        "relatedWords": ["2-4 words from the same root, all worth knowing"]
      },
      "wordFamily": ["word (n)", "word (v)", "wordish (adj)"],
      "synonyms": ["2-4 words that would work in most contexts"],
      "antonyms": ["1-3 real opposites, or an empty array if the word has none"],
      "collocations": ["3-4 words this one is usually paired with, so it can be used naturally"],
      "hint": "A hint for the free-recall mode that gives away the meaning or shape without naming the word - maximum 8 words.",
      "image": "A direct https:// URL to a photograph that shows this word.",
      "imageCredit": "The photographer or site name, for the credit line under the photo.",
      "imageAlt": "What the photograph shows, for a screen reader."
      "rarity": "common | rare | epic | legendary",
      "ccq": [
        { "question": "A yes/no question that tests one specific part of the meaning.", "answer": true },
        { "question": "A yes/no question about a common misunderstanding of the word.", "answer": false },
        { "question": "A yes/no question about using the word in a real situation.", "answer": true }
      ]
    }
  ]
}`;

/**
 * Build the prompt.
 *
 * The lesson text is embedded when the tutor pasted it, and referred to as an attachment
 * when they did not — so the same string works for a PDF dropped into the chat and for a
 * transcript pasted in.
 */
export function buildLessonPrompt(brief: LessonBrief): string {
  const learner = brief.learner.trim() || "the learner";
  const language = LANGUAGE_NAMES[brief.l1] ?? brief.l1.toUpperCase();
  const topic = brief.topic.trim() || "the lesson provided";
  const count = Math.max(1, Math.min(60, Math.floor(brief.count) || 12));
  const facts = brief.facts.trim();
  const lesson = brief.lessonText.trim();

  return `You are an experienced language teacher, lexicographer and CEFR assessor. You are building a study deck for ONE specific learner from ONE lesson. Everything you write is for them.

═══════════════════════════════════════════════════════════════
THE LEARNER
═══════════════════════════════════════════════════════════════
Name: ${learner}
First language (L1): ${language}
Target level: ${brief.level} (CEFR)
${facts ? `Facts to personalise with — use these, and do not invent others:\n${facts.split("\n").map((line) => `  • ${line.trim()}`).filter((line) => line.length > 3).join("\n")}` : "No personal facts were supplied: keep examples general but still written in the second person, addressed to the learner."}

═══════════════════════════════════════════════════════════════
THE LESSON
═══════════════════════════════════════════════════════════════
Topic: ${topic}
${lesson ? `The lesson text is pasted below. It is the ONLY source of content.\n\n----- BEGIN LESSON -----\n${lesson}\n----- END LESSON -----` : "The lesson is attached (PDF or text). Read it in full before writing anything."}

Your job is to read every word of that lesson and extract the language a learner at ${brief.level} would actually need in order to talk about it. That means the topic vocabulary, the expressions, and the verb + preposition patterns — not a list of every long word you can find.

Produce ${count} cards. If the lesson contains fewer than ${count} items worth learning, produce fewer and do not pad. If it contains more, choose the ${count} that carry the most meaning.

═══════════════════════════════════════════════════════════════
HOW TO WRITE FOR LEVEL ${brief.level}
═══════════════════════════════════════════════════════════════
${LEVEL_RULES[brief.level]}

This applies to \`back\`, \`hint\`, \`etymology.meaning\` and every question in \`ccq\`. It does NOT apply to \`front\` or to the quoted sentences in \`examples\`, which must stay exactly as the lesson or the source wrote them.

═══════════════════════════════════════════════════════════════
PERSONALISATION
═══════════════════════════════════════════════════════════════
The \`example\` field is the most important field in this deck. It must:
  • use ${learner}'s name, or address them directly;
  • be built on one of their stated facts wherever possible, rather than a generic situation;
  • be a sentence someone would really say out loud to them, not an illustration of a definition;
  • be different in kind from the sentences in \`examples\` — those are published English, this one is theirs.

Never invent a fact about ${learner} that was not supplied. If the facts do not cover a word, connect it to the lesson topic instead.

═══════════════════════════════════════════════════════════════
HOW EACH FIELD IS USED (fill it for the game, not for decoration)
═══════════════════════════════════════════════════════════════
  • front / back — the card itself. \`back\` also appears as a wrong answer in a multiple-choice race, so it must make sense with no other context.
  • example — shown on the FRONT of the card. This is what makes the word readable in use before it is defined.
  • pronunciation — shown under the word. Real IPA.
  • hint — the only help in the free-recall (typing) mode. Give away the meaning, never the spelling.
  • collocations / synonyms / antonyms / register — the reference panel, and how a learner moves from knowing the word to using it.
  • ccq — three yes/no questions. In the battle mode these become the questions the learner must answer, so each must be answerable from \`back\` alone, and the \`answer\` must be a real boolean: true for yes, false for no.
  • rarity — the game's tier. It drives points and screen time, so use it honestly: "common" for words the learner will meet constantly, "legendary" for the genuinely rare but valuable. Target roughly 50% common, 25% rare, 15% epic, 10% legendary — a deck that is all legendary is a deck that lies.
  • id — unique strings "1", "2", "3" …
  • image — a direct https:// URL to a *photograph* of the thing the word names. This is what
    fills the swipe deck, so a card without one looks finished but generic. Follow these rules
    or leave the field as an empty string:
      – the URL must end in .jpg, .jpeg, .png or .webp, and must load with no login, no API
        key and no redirect through an ad page. Wikimedia Commons upload URLs
        (upload.wikimedia.org) are the safest choice and are free to hot-link;
      – it must be a photograph or a clear illustration of the *object, action or place*,
        never a stock picture of a person looking thoughtful, and never a text graphic,
        logo, chart, flag, coat of arms or PDF;
      – if the word is abstract (courage, serendipity, although) there is no honest
        photograph, so leave \`image\` empty rather than attaching something unrelated — the
        card falls back to its own artwork and looks deliberate, whereas a wrong picture
        looks like a mistake;
      – \`imageAlt\` describes the picture in one short phrase; \`imageCredit\` names the
        photographer or site. Never leave \`imageCredit\` empty when \`image\` is filled.
  • An empty string is the correct value for any optional field you cannot fill honestly.

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT — THIS IS THE PART PEOPLE GET WRONG
═══════════════════════════════════════════════════════════════
Return ONE JSON object and nothing else. No markdown code fences, no \`\`\`json, no explanation before or after, no comments. Every field shown below must be present on every item. Use double quotes everywhere; no trailing commas; escape quotes inside strings.

${SCHEMA}

Write the JSON now.`;
}
