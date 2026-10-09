/**
 * Content-pack checker.
 *
 * The app tolerates nearly any JSON: `normalizePack` fixes aliases and silently
 * drops broken entries. That is great for robustness and terrible for finding
 * out — *before going live* — why the course looks thin. This module audits the
 * file an AI agent produced and reports, item by item:
 *
 *   · JSON validity (the usual agent mistakes are named explicitly)
 *   · schema problems: missing keys, wrong types, duplicate terms/ids
 *   · missing L1 translations
 *   · thin content: 1-exercise grammar points, 3-turn dialogues, empty examples
 *   · sections that are empty / declared but uncovered
 *   · which of the eight activity kinds this pack can actually run
 *   · the course it will build (units, lessons, exercises per lesson)
 *
 * Everything runs locally in the browser; nothing is uploaded.
 */
import { ACTIVITY_LABELS, normalizePack, type ActivityKind, type ContentPack } from "@/content/tutolingo";
import { exercisesPerLesson } from "@/lib/lesson-engine";
import { totalLessons, totalUnits } from "@/content/units";

export type Severity = "error" | "warning" | "info";

export type SectionKey = "vocabulary" | "grammar" | "idioms" | "conversations" | "sentences" | "activities";

export const SECTION_META: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: "vocabulary", label: "Vocabulary", icon: "📚" },
  { key: "grammar", label: "Grammar", icon: "📝" },
  { key: "idioms", label: "Idioms & expressions", icon: "🎭" },
  { key: "conversations", label: "Conversations", icon: "💬" },
  { key: "sentences", label: "Sentences", icon: "🔤" },
  { key: "activities", label: "Activity bank", icon: "🎮" },
];

export interface Issue {
  severity: Severity;
  section: SectionKey | "meta" | "json";
  /** Human pointer, e.g. `vocabulary[12] “luggage”`. */
  where: string;
  message: string;
  fix?: string;
  /** How many items share this exact problem (identical issues are grouped). */
  count?: number;
  /** Other locations with the same problem, when grouped. */
  samples?: string[];
}

export interface SectionReport {
  key: SectionKey;
  label: string;
  icon: string;
  /** The key exists and holds at least one item. */
  present: boolean;
  /** Count declared in meta.coverage, when the agent provided one. */
  declared: number | null;
  /** Items written in the JSON. */
  raw: number;
  /** Items the app will actually load. */
  kept: number;
  dropped: number;
  missingTranslations: number;
  /** Items too incomplete to feed their activities well. */
  thin: number;
  errors: number;
  warnings: number;
}

export interface ActivityReport {
  kind: ActivityKind;
  label: string;
  ready: boolean;
  /** How many pack items can feed this activity. */
  pool: number;
  sources: string[];
  /** Why it cannot run, when it cannot. */
  blocker?: string;
}

export interface CoursePreview {
  units: number;
  lessons: number;
  exercisesPerLesson: number;
  items: number;
}

export interface AuditReport {
  parseError: { message: string; line?: number; column?: number } | null;
  verdict: "ready" | "needs-work" | "broken";
  score: number;
  issues: Issue[];
  sections: SectionReport[];
  activities: ActivityReport[];
  emptySections: SectionKey[];
  coverage: {
    declaredSections: string[];
    omissions: string[];
    declared: Record<string, number>;
    actual: Record<string, number>;
    mismatches: string[];
  };
  meta: {
    app: string;
    version: string;
    sourceDocument: string;
    l1: string;
    l1Name: string;
    targetLanguage: string;
    level: string;
    learnerProfile: boolean;
  };
  course: CoursePreview;
  totals: {
    items: number;
    kept: number;
    dropped: number;
    missingTranslations: number;
    thin: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  generatedAt: string;
}

/* ------------------------------- primitives ------------------------------- */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** Mirrors the app's `clean()`: only strings survive. */
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const lc = (s: string) => s.trim().toLowerCase();
const typeName = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const short = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function bilingual(v: unknown): { target: string; native: string } | null {
  if (!isObj(v)) return null;
  const target = str(v.target) || str(v.text) || str(v.en) || str(v.english);
  const native = str(v.native) || str(v.translation) || str(v.l1);
  return target ? { target, native } : null;
}

/** Same alias resolution `normalizePack` applies, so counts agree. */
function vocabTerm(v: Record<string, unknown>) {
  return str(v.term) || str(v.word) || str(v.english);
}
function vocabTranslation(v: Record<string, unknown>) {
  return str(v.translation) || str(v.native);
}
function idiomExpression(v: Record<string, unknown>) {
  return str(v.expression) || str(v.english) || str(v.phrase);
}
function idiomMeaning(v: Record<string, unknown>) {
  return str(v.meaning) || str(v.definition) || str(v.nativeMeaning);
}
function sentenceTarget(v: Record<string, unknown>) {
  return str(v.target) || str(v.sentence) || str(v.english);
}
function sentenceNative(v: Record<string, unknown>) {
  return str(v.native) || str(v.translation);
}

/* ------------------------------ entry points ------------------------------ */

class Audit {
  issues: Issue[] = [];
  add(severity: Severity, section: Issue["section"], where: string, message: string, fix?: string) {
    this.issues.push(fix ? { severity, section, where, message, fix } : { severity, section, where, message });
  }
}

/**
 * A report for a file the app cannot use at all: either unparsable JSON
 * (`kind: "invalid"`) or valid JSON with the wrong shape (`kind: "shape"`).
 */
function parseFailure(text: string, message: string, kind: "invalid" | "shape" = "invalid"): AuditReport {
  const posMatch = message.match(/position\s+(\d+)/i);
  let line: number | undefined;
  let column: number | undefined;
  if (posMatch) {
    const pos = Math.min(Number(posMatch[1]), text.length);
    const before = text.slice(0, pos);
    line = before.split("\n").length;
    column = pos - before.lastIndexOf("\n");
  }
  const a = new Audit();
  if (kind === "invalid") {
    a.add("error", "json", "the file", `Not valid JSON — the app cannot load it at all. (${message})`);
  } else {
    a.add("error", "json", "root", message, 'The file must be one object: { "meta": { … }, "vocabulary": [ … ], "grammar": [ … ], … }.');
  }
  if (kind === "invalid" && /^```|```\s*$/.test(text.trim()))
    a.add("error", "json", "format", "The file contains markdown code fences (```).", "Remove the fences: the file must start with { and end with }.");
  if (/,\s*[}\]]/.test(text))
    a.add("error", "json", "format", "There is a trailing comma before a } or ].", "Delete the comma — JSON does not allow trailing commas.");
  if (/[“”‘’]/.test(text))
    a.add("error", "json", "format", "The file contains smart/curly quotes (“ ” ‘ ’).", "Replace them with plain \" characters.");
  if (/…|\.\.\./.test(text))
    a.add("warning", "json", "format", "The file contains an ellipsis / “…” placeholder.", "Enumerate every item instead of abbreviating.");
  if (/^\s*(Here|Sure|Certainly|Below|I)/i.test(text))
    a.add("warning", "json", "format", "The file seems to start with prose rather than JSON.", "Ask the agent to reply with the JSON object only.");

  return {
    parseError: kind === "invalid" ? { message, line, column } : null,
    verdict: "broken",
    score: 0,
    issues: a.issues,
    sections: SECTION_META.map((s) => ({
      ...s,
      present: false,
      declared: null,
      raw: 0,
      kept: 0,
      dropped: 0,
      missingTranslations: 0,
      thin: 0,
      errors: 0,
      warnings: 0,
    })),
    activities: emptyActivities(kind === "invalid" ? "the file is not valid JSON" : "the file has no sections to read"),
    emptySections: SECTION_META.filter((s) => s.key !== "activities").map((s) => s.key),
    coverage: { declaredSections: [], omissions: [], declared: {}, actual: {}, mismatches: [] },
    meta: { app: "", version: "", sourceDocument: "", l1: "", l1Name: "", targetLanguage: "", level: "", learnerProfile: false },
    course: { units: 0, lessons: 0, exercisesPerLesson: 0, items: 0 },
    totals: { items: 0, kept: 0, dropped: 0, missingTranslations: 0, thin: 0, errors: 1, warnings: 0, infos: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function emptyActivities(blocker: string): ActivityReport[] {
  return (Object.keys(ACTIVITY_LABELS) as ActivityKind[]).map((kind) => ({
    kind,
    label: ACTIVITY_LABELS[kind],
    ready: false,
    pool: 0,
    sources: [],
    blocker,
  }));
}

/** Audit a JSON string (what the user pastes or uploads). */
export function auditPackText(text: string): AuditReport {
  const trimmed = text.trim();
  if (!trimmed) return parseFailure("", "The input is empty — paste the JSON the agent produced.");
  try {
    return auditPack(JSON.parse(trimmed));
  } catch (e) {
    return parseFailure(trimmed, e instanceof Error ? e.message : "Invalid JSON");
  }
}

/* --------------------------------- audit ---------------------------------- */

export function auditPack(raw: unknown): AuditReport {
  const a = new Audit();

  if (!isObj(raw)) {
    return parseFailure(
      "",
      `The root value is ${typeName(raw)} — the app expects one object with meta / vocabulary / grammar / … keys.`,
      "shape",
    );
  }

  const r = raw as Record<string, unknown>;
  const known = ["meta", "vocabulary", "grammar", "idioms", "conversations", "sentences", "activities", "readme"];
  const unknownKeys = Object.keys(r).filter((k) => !known.includes(k));
  if (unknownKeys.length)
    a.add("warning", "json", "root", `Ignored top-level keys: ${unknownKeys.map((k) => `“${k}”`).join(", ")}.`, `The app only reads ${known.join(", ")}.`);

  /* ------------------------------- meta ------------------------------- */
  const metaRaw = isObj(r.meta) ? r.meta : {};
  if (!isObj(r.meta)) a.add("warning", "meta", "meta", 'The "meta" object is missing or is not an object.', 'Add meta with app, version, sourceDocument, l1, l1Name, targetLanguage, level and coverage.');
  const metaL1 = str(metaRaw.l1);
  const metaL1Name = str(metaRaw.l1Name);
  const targetLanguage = str(metaRaw.targetLanguage);
  if (!metaL1 && !metaL1Name)
    a.add("warning", "meta", "meta.l1", "The learner's first language is not declared (meta.l1 / meta.l1Name).", "Add \"l1\": \"fa\" (ISO code) and \"l1Name\": \"Persian\" so the app can label translations and generate matching league names.");
  if (metaL1 && lc(metaL1) === lc(targetLanguage))
    a.add("warning", "meta", "meta.l1", `meta.l1 and meta.targetLanguage are both “${targetLanguage}”.`, "Translations must be in the learner's own language, not the language being taught.");
  if (!str(metaRaw.sourceDocument)) a.add("info", "meta", "meta.sourceDocument", "No source document recorded, so the Profile page cannot show where this pack came from.");
  if (!str(metaRaw.learnerProfile)) a.add("info", "meta", "meta.learnerProfile", "No learner profile recorded, so examples cannot be traced back to a specific learner.");

  /* ----------------------------- coverage ----------------------------- */
  const covRaw = isObj(metaRaw.coverage) ? metaRaw.coverage : {};
  const declaredSections = arr(covRaw.sectionsCovered).map((s) => str(s)).filter(Boolean);
  const omissions = arr(covRaw.omissions).map((s) => str(s)).filter(Boolean);
  if (!isObj(metaRaw.coverage))
    a.add("info", "meta", "meta.coverage", "No coverage report from the agent.", "Ask the agent for meta.coverage with per-section counts and an omissions list — it is how you know the PDF was covered 100%.");
  if (omissions.length)
    a.add("info", "meta", "meta.coverage.omissions", `The agent reported ${omissions.length} omission(s): ${omissions.slice(0, 3).map((o) => short(o, 60)).join(" · ")}${omissions.length > 3 ? " …" : ""}.`, "Anything listed here is NOT in the app — re-run that part of the document or accept the gap knowingly.");

  const declaredCount = (key: string): number | null => {
    const v = covRaw[key];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  /* ---------------------------- raw sections ---------------------------- */
  const rawVocab = arr(r.vocabulary);
  const rawGrammar = arr(r.grammar);
  const rawIdioms = arr(r.idioms);
  const rawConversations = arr(r.conversations);
  const rawSentences = arr(r.sentences);
  const rawBank = isObj(r.activities) ? r.activities : null;

  const bankCount = rawBank
    ? ["matchPairs", "fillBlank", "reorder", "listenSelect", "typeHear", "speak", "tapComplete"].reduce((n, k) => n + arr(rawBank[k]).length, 0)
    : 0;

  const stats: Record<SectionKey, { dropped: number; missing: number; thin: number }> = {
    vocabulary: { dropped: 0, missing: 0, thin: 0 },
    grammar: { dropped: 0, missing: 0, thin: 0 },
    idioms: { dropped: 0, missing: 0, thin: 0 },
    conversations: { dropped: 0, missing: 0, thin: 0 },
    sentences: { dropped: 0, missing: 0, thin: 0 },
    activities: { dropped: 0, missing: 0, thin: 0 },
  };

  /* ------------------------------ vocabulary ------------------------------ */
  const seenTerms = new Map<string, number>();
  rawVocab.forEach((item, i) => {
    if (!isObj(item)) {
      a.add("error", "vocabulary", `vocabulary[${i}]`, `Entry is ${typeName(item)}, not an object — it will be dropped.`, "Each vocabulary entry must be { \"term\": …, \"translation\": …, … }.");
      stats.vocabulary.dropped++;
      return;
    }
    const term = vocabTerm(item);
    if (!term) {
      const nonString = ["term", "word", "english"].filter((k) => k in item && typeof item[k] !== "string");
      a.add(
        "error",
        "vocabulary",
        `vocabulary[${i}]`,
        nonString.length ? `“${nonString[0]}” is ${typeName(item[nonString[0]])}, not a string — it will be dropped.` : "No “term” — the entry will be dropped.",
        "Give every entry a non-empty string term.",
      );
      stats.vocabulary.dropped++;
      return;
    }
    const where = `vocabulary[${i}] “${short(term)}”`;
    let thin = false;

    const translation = vocabTranslation(item);
    const definition = str(item.definition) || str(item.meaning);
    const exampleIsObj = isObj(item.example);
    const ex = exampleIsObj ? bilingual(item.example) : null;
    if ("example" in item && item.example !== null && !exampleIsObj)
      a.add("warning", "vocabulary", where, `“example” is ${typeName(item.example)} — the app only reads an object like { "target": …, "native": … }.`);

    if (!translation) {
      a.add("warning", "vocabulary", where, "No L1 translation — Match and “Choose the translation” fall back to the English definition, so the learner never sees their own language.", 'Add "translation": "…" in the learner\'s first language.');
      stats.vocabulary.missing++;
      thin = true;
    } else if (lc(translation) === lc(term)) {
      a.add("warning", "vocabulary", where, `“translation” is identical to the term — looks untranslated.`, 'Write the meaning in the learner\'s first language, e.g. "luggage": "equipaje".');
    }
    if (!definition && !translation)
      a.add("info", "vocabulary", where, "Neither a definition nor a translation: this word carries no meaning for the exercises.");

    if (!ex) {
      a.add("warning", "vocabulary", where, "No example sentence (\"example.target\") — Fill-in-the-blank, Listen-and-type and the “speak” prompt lose this word.", 'Add "example": { "target": "…", "native": "…" }.');
      thin = true;
    } else {
      if (words(ex.target) < 3) {
        a.add("warning", "vocabulary", where, `The example sentence is only ${words(ex.target)} word(s); the player ignores sentences shorter than 3 words.`);
        thin = true;
      }
      if (!new RegExp(`\\b${escapeRe(term)}\\w*\\b`, "i").test(ex.target))
        a.add("info", "vocabulary", where, `The term “${term}” does not appear in its own example sentence, so Fill-in-the-blank has to fall back to another sentence.`);
      if (!ex.native) {
        a.add("warning", "vocabulary", where, "The example sentence has no translation (\"example.native\").", "Every example needs its L1 translation — that is what the learner sees as the hint.");
        stats.vocabulary.missing++;
      }
    }

    const key = lc(term);
    if (seenTerms.has(key)) a.add("warning", "vocabulary", where, `Duplicate term — it already appears at vocabulary[${seenTerms.get(key)}].`, "Duplicate words waste course slots; merge them.");
    else seenTerms.set(key, i);

    if (thin) stats.vocabulary.thin++;
  });
  const vocabKept = normalizePack(raw).vocabulary.length;

  /* ------------------------------- grammar ------------------------------- */
  rawGrammar.forEach((topic, i) => {
    if (!isObj(topic)) {
      a.add("error", "grammar", `grammar[${i}]`, `Entry is ${typeName(topic)}, not an object — it will be dropped.`);
      stats.grammar.dropped++;
      return;
    }
    const title = str(topic.title) || str(topic.topic);
    const rule = str(topic.rule) || str(topic.explanation) || str(topic.nativeRule);
    if (!title || !rule) {
      a.add("error", "grammar", `grammar[${i}]`, title ? "No rule/explanation — the point will be dropped." : "No title — the point will be dropped.", 'Give every grammar point "title" and "rule".');
      stats.grammar.dropped++;
      return;
    }
    const where = `grammar[${i}] “${short(title)}”`;
    let thin = false;

    if (!str(topic.nativeRule)) {
      a.add("warning", "grammar", where, "No nativeRule — the learner never sees the rule explained in their own language.", 'Add "nativeRule" (the same rule in the L1).');
      stats.grammar.missing++;
    }

    const examples = arr(topic.examples);
    if (examples.length === 0) {
      a.add("warning", "grammar", where, "No examples array.", 'Add at least 3 "examples": [{ "target": …, "native": … }].');
      thin = true;
    } else {
      let badExamples = 0;
      let missingExampleNative = 0;
      examples.forEach((ex) => {
        const b = bilingual(ex);
        if (!b) badExamples++;
        else if (!b.native) missingExampleNative++;
      });
      if (badExamples) {
        a.add("error", "grammar", where, `${badExamples} example(s) have no "target" text — they will be dropped.`);
        stats.grammar.dropped += badExamples;
      }
      if (missingExampleNative) {
        a.add("warning", "grammar", where, `${missingExampleNative} example(s) have no L1 translation ("native").`);
        stats.grammar.missing += missingExampleNative;
      }
      if (examples.length < 3) {
        a.add("warning", "grammar", where, `Only ${examples.length} example(s); 3+ is what a grammar point needs to be taught, not just stated.`);
        thin = true;
      }
    }

    const exercises = arr(topic.exercises);
    if (exercises.length === 0) {
      a.add("error", "grammar", where, "No exercises — the “Grammar tap-complete” activity cannot be generated from this point.", 'Add at least 4 "exercises" with 4 options each.');
      thin = true;
    } else {
      const seenPrompts = new Map<string, number>();
      exercises.forEach((ex, j) => {
        const exWhere = `${where} → exercises[${j}]`;
        if (!isObj(ex)) {
          a.add("error", "grammar", exWhere, `Exercise is ${typeName(ex)}, not an object — it will be dropped.`);
          stats.grammar.dropped++;
          return;
        }
        const prompt = str(ex.prompt) || str(ex.question) || str(ex.sentence);
        const answer = str(ex.answer);
        if (!prompt || !answer) {
          a.add("error", "grammar", exWhere, prompt ? "No answer — the exercise will be dropped." : "No prompt — the exercise will be dropped.");
          stats.grammar.dropped++;
          return;
        }
        const options = arr(ex.options).map((o) => str(o)).filter(Boolean);
        const rawOptions = arr(ex.options).length;
        if (rawOptions !== options.length) a.add("warning", "grammar", exWhere, `${rawOptions - options.length} option(s) are not strings and will be ignored.`);
        if (options.length === 0) {
          a.add("warning", "grammar", exWhere, "No options — the player will invent distractors, which is far weaker than the agent's own.", 'Add "options": ["…","…","…","…"].');
          thin = true;
        } else if (options.length < 2) {
          a.add("error", "grammar", exWhere, "Only one option — the exercise is impossible to get wrong.", "Give at least 2, ideally 4, options.");
          thin = true;
        } else if (options.length < 4) {
          a.add("warning", "grammar", exWhere, `Only ${options.length} options (4 is the intended multiple-choice size).`);
          thin = true;
        }
        if (options.length && !options.some((o) => lc(o) === lc(answer))) {
          a.add("error", "grammar", exWhere, `The answer “${short(answer)}” is not among the options — the learner could never tap it.`, "Make the answer an exact copy of one of the options.");
          thin = true;
        }
        if (new Set(options.map(lc)).size !== options.length) a.add("warning", "grammar", exWhere, "Duplicate options.");
        if (!str(ex.explanation)) a.add("info", "grammar", exWhere, 'No "explanation" — the feedback after a wrong answer will be plain.');
        if (!str(ex.nativeExplanation)) a.add("info", "grammar", exWhere, 'No "nativeExplanation" — the feedback will not be in the learner\'s language.');
        const pKey = lc(prompt);
        if (seenPrompts.has(pKey)) a.add("warning", "grammar", exWhere, `Duplicate exercise prompt — already used at exercises[${seenPrompts.get(pKey)}].`);
        else seenPrompts.set(pKey, j);
      });
      if (exercises.length < 4) {
        a.add("warning", "grammar", where, `Only ${exercises.length} exercise(s) for this point; 4+ keeps the grammar lessons varied instead of repeating.`);
        thin = true;
      }
    }
    if (thin) stats.grammar.thin++;
  });
  const grammarKept = normalizePack(raw).grammar.length;

  /* -------------------------------- idioms ------------------------------- */
  const seenIdioms = new Map<string, number>();
  rawIdioms.forEach((item, i) => {
    if (!isObj(item)) {
      a.add("error", "idioms", `idioms[${i}]`, `Entry is ${typeName(item)}, not an object — it will be dropped.`);
      stats.idioms.dropped++;
      return;
    }
    const expression = idiomExpression(item);
    const meaning = idiomMeaning(item);
    if (!expression || !meaning) {
      a.add("error", "idioms", `idioms[${i}]`, expression ? "No meaning — the entry will be dropped." : "No expression — the entry will be dropped.", 'Give every entry "expression" and "meaning".');
      stats.idioms.dropped++;
      return;
    }
    const where = `idioms[${i}] “${short(expression)}”`;
    let thin = false;
    if (!str(item.nativeMeaning)) {
      a.add("warning", "idioms", where, "No nativeMeaning — the learner gets an English-only explanation of the expression.", 'Add "nativeMeaning" in the L1.');
      stats.idioms.missing++;
    }
    const ex = bilingual(item.example);
    if (!ex) {
      a.add("warning", "idioms", where, "No example — Match and Choose-the-meaning can only use the bare expression.", 'Add "example": { "target": …, "native": … }.');
      thin = true;
    } else if (!ex.native) {
      a.add("warning", "idioms", where, "The example has no L1 translation (\"example.native\").");
      stats.idioms.missing++;
    }
    if (!str(item.type)) a.add("info", "idioms", where, 'No "type" (idiom | phrasal_verb | collocation | proverb | slang | expression) — the list cannot be filtered well.');
    const key = lc(expression);
    if (seenIdioms.has(key)) a.add("warning", "idioms", where, `Duplicate expression — already at idioms[${seenIdioms.get(key)}].`);
    else seenIdioms.set(key, i);
    if (thin) stats.idioms.thin++;
  });
  const idiomsKept = normalizePack(raw).idioms.length;

  /* ----------------------------- conversations ---------------------------- */
  let conversationTurns = 0;
  rawConversations.forEach((c, i) => {
    if (!isObj(c)) {
      a.add("error", "conversations", `conversations[${i}]`, `Entry is ${typeName(c)}, not an object — it will be dropped.`);
      stats.conversations.dropped++;
      return;
    }
    const title = str(c.title);
    const turns = arr(c.turns).length ? arr(c.turns) : arr(c.dialogue);
    if (!title && turns.length === 0) {
      a.add("error", "conversations", `conversations[${i}]`, "Neither a title nor any turns — it will be dropped.");
      stats.conversations.dropped++;
      return;
    }
    const where = `conversations[${i}] “${short(title || "untitled")}”`;
    let thin = false;
    let missingTarget = 0;
    let missingNative = 0;
    turns.forEach((t) => {
      if (!isObj(t)) {
        missingTarget++;
        return;
      }
      if (!str(t.target) && !str(t.text) && !str(t.english)) missingTarget++;
      else if (!str(t.native) && !str(t.translation) && !str(t.persian)) missingNative++;
    });
    conversationTurns += Math.max(0, turns.length - missingTarget);
    if (missingTarget) {
      a.add("error", "conversations", where, `${missingTarget} line(s) have no target-language text — they will be dropped.`);
      stats.conversations.dropped += missingTarget;
    }
    if (missingNative) {
      a.add("warning", "conversations", where, `${missingNative} line(s) have no L1 translation ("native") — the dialogue cannot be understood by a beginner.`);
      stats.conversations.missing += missingNative;
    }
    if (turns.length < 6) {
      a.add("warning", "conversations", where, `Only ${turns.length} turn(s); a usable dialogue needs 6+ so it can be practised line by line.`);
      thin = true;
    }
    if (arr(c.keyPhrases).length === 0) a.add("info", "conversations", where, 'No "keyPhrases" — useful chunks from the dialogue are then not highlighted.');
    if (!str(c.nativeSummary)) {
      a.add("info", "conversations", where, 'No "nativeSummary" — the L1 one-line summary of the dialogue is missing.');
      stats.conversations.missing++;
    }
    if (thin) stats.conversations.thin++;
  });
  const conversationsKept = normalizePack(raw).conversations.length;

  /* ------------------------------ sentences ------------------------------ */
  const seenSentences = new Map<string, number>();
  rawSentences.forEach((s, i) => {
    const isPlainString = typeof s === "string";
    if (!isPlainString && !isObj(s)) {
      a.add("error", "sentences", `sentences[${i}]`, `Entry is ${typeName(s)}; it must be a string or an object — it will be dropped.`);
      stats.sentences.dropped++;
      return;
    }
    const obj = isObj(s) ? s : null;
    const target = isPlainString ? str(s) : sentenceTarget(obj!);
    if (!target) {
      a.add("error", "sentences", `sentences[${i}]`, "No target text — it will be dropped.");
      stats.sentences.dropped++;
      return;
    }
    const where = `sentences[${i}] “${short(target)}”`;
    let thin = false;
    const native = isPlainString ? "" : sentenceNative(obj!);
    if (!native) {
      a.add(
        "warning",
        "sentences",
        where,
        isPlainString ? "This is a plain string, so it has no L1 translation." : "No L1 translation (\"native\").",
        isPlainString ? 'Use { "target": "…", "native": "…" } instead of a bare string.' : 'Add "native".',
      );
      stats.sentences.missing++;
      thin = true;
    }
    if (words(target) < 3) {
      a.add("warning", "sentences", where, `Only ${words(target)} word(s); the player skips sentences shorter than 3 words, so Listen-and-type / Reorder / Speak cannot use it.`);
      thin = true;
    }
    const key = lc(target);
    if (seenSentences.has(key)) a.add("warning", "sentences", where, `Duplicate sentence — already at sentences[${seenSentences.get(key)}].`);
    else seenSentences.set(key, i);
    if (thin) stats.sentences.thin++;
  });
  const sentencesKept = normalizePack(raw).sentences.length;

  /* --------------------------- explicit bank ----------------------------- */
  if (rawBank) {
    const banks: Array<[string, string]> = [
      ["matchPairs", "pairs"],
      ["fillBlank", "sentence"],
      ["reorder", "sentence"],
      ["listenSelect", "prompt"],
      ["typeHear", "sentence"],
      ["speak", "sentence"],
      ["tapComplete", "prompt"],
    ];
    banks.forEach(([bank, required]) => {
      const items = arr(rawBank[bank]);
      if (bank in rawBank && !Array.isArray(rawBank[bank])) {
        a.add("error", "activities", `activities.${bank}`, `Must be an array, found ${typeName(rawBank[bank])} — the whole bank is ignored.`);
        stats.activities.dropped++;
        return;
      }
      items.forEach((item, i) => {
        const where = `activities.${bank}[${i}]`;
        if (!isObj(item)) {
          a.add("error", "activities", where, `Entry is ${typeName(item)}, not an object — it will be ignored.`);
          stats.activities.dropped++;
          return;
        }
        if (bank === "matchPairs") {
          const pairs = arr(item.pairs).map(bilingual).filter(Boolean) as Array<{ target: string; native: string }>;
          if (pairs.length < 2) {
            a.add("warning", "activities", where, `Only ${pairs.length} usable pair(s) — a matching exercise needs 2+.`);
            stats.activities.thin++;
          }
          if (pairs.some((p) => !p.native)) {
            a.add("warning", "activities", where, "Some pairs have no native text, so there is nothing to match against.");
            stats.activities.missing++;
          }
          return;
        }
        const text = str(item[required]) || str(item.sentence) || str(item.prompt);
        if (!text) {
          a.add("error", "activities", where, `No “${required}” — the item will be ignored.`);
          stats.activities.dropped++;
          return;
        }
        if (bank !== "typeHear" && bank !== "speak" && bank !== "reorder" && bank !== "fillBlank" && !str(item.answer)) {
          a.add("error", "activities", where, "No answer.", `Add "answer" with the exact text of the correct option.`);
          stats.activities.dropped++;
          return;
        }
        const options = arr(item.options).map((o) => str(o)).filter(Boolean);
        if ((bank === "listenSelect" || bank === "tapComplete") && options.length && !options.some((o) => lc(o) === lc(str(item.answer)))) {
          a.add("error", "activities", where, `The answer “${short(str(item.answer))}” is not among the options.`);
          stats.activities.thin++;
        }
        if (["reorder", "typeHear", "speak"].includes(bank) && words(text) < 3) {
          a.add("warning", "activities", where, `Only ${words(text)} word(s) — the player skips very short sentences.`);
          stats.activities.thin++;
        }
        // A gap may be written either as a blank ("______") or as the full sentence with the answer in it.
        const preBlanked = /_{2,}|\[\s*\]|…/.test(text);
        if (bank === "fillBlank" && str(item.answer) && !preBlanked && !lc(text).includes(lc(str(item.answer)))) {
          a.add(
            "warning",
            "activities",
            where,
            `The answer “${short(str(item.answer))}” does not appear in the sentence and there is no blank ("______"), so the gap cannot be created.`,
            'Either write the sentence with "______" or include the answer word so the app can blank it out.',
          );
          stats.activities.thin++;
        }
        if (!str(item.native) && bank !== "matchPairs") {
          a.add("info", "activities", where, "No native translation for this bank item.");
          stats.activities.missing++;
        }
      });
    });
  }

  /* --------------------------- section reports --------------------------- */
  const actualCounts: Record<string, number> = {
    vocabulary: rawVocab.length,
    grammar: rawGrammar.length,
    idioms: rawIdioms.length,
    conversations: rawConversations.length,
    sentences: rawSentences.length,
  };
  const declaredByKey: Record<string, number> = {
    vocabulary: declaredCount("vocabularyCount") ?? -1,
    grammar: declaredCount("grammarCount") ?? -1,
    idioms: declaredCount("idiomCount") ?? -1,
    conversations: declaredCount("conversationCount") ?? -1,
    sentences: declaredCount("sentenceCount") ?? -1,
  };
  const coverageMismatches: string[] = [];
  (Object.keys(actualCounts) as Array<keyof typeof actualCounts>).forEach((key) => {
    const declared = declaredByKey[key];
    if (declared < 0) return;
    if (declared !== actualCounts[key]) {
      const label = SECTION_META.find((s) => s.key === key)!.label;
      coverageMismatches.push(`${label}: agent declared ${declared}, file contains ${actualCounts[key]}`);
    }
  });
  if (coverageMismatches.length)
    a.add(
      "warning",
      "meta",
      "meta.coverage",
      `The coverage report does not match the file — ${coverageMismatches.join("; ")}.`,
      "A false coverage report is the classic sign of a truncated answer: the agent stopped early and still claimed full coverage.",
    );

  const rawByKey: Record<SectionKey, number> = {
    vocabulary: rawVocab.length,
    grammar: rawGrammar.length,
    idioms: rawIdioms.length,
    conversations: rawConversations.length,
    sentences: rawSentences.length,
    activities: bankCount,
  };
  const keptByKey: Record<SectionKey, number> = {
    vocabulary: vocabKept,
    grammar: grammarKept,
    idioms: idiomsKept,
    conversations: conversationsKept,
    sentences: sentencesKept,
    activities: bankCount,
  };

  const sections: SectionReport[] = SECTION_META.map((s) => {
    const sectionIssues = a.issues.filter((i) => i.section === s.key);
    return {
      key: s.key,
      label: s.label,
      icon: s.icon,
      present: rawByKey[s.key] > 0,
      declared: s.key === "activities" ? null : declaredByKey[s.key] >= 0 ? declaredByKey[s.key] : null,
      raw: rawByKey[s.key],
      kept: keptByKey[s.key],
      dropped: stats[s.key].dropped,
      missingTranslations: stats[s.key].missing,
      thin: stats[s.key].thin,
      errors: sectionIssues.filter((i) => i.severity === "error").length,
      warnings: sectionIssues.filter((i) => i.severity === "warning").length,
    };
  });

  const emptySections = sections.filter((s) => s.key !== "activities" && s.raw === 0).map((s) => s.key);
  emptySections.forEach((key) => {
    const meta = SECTION_META.find((s) => s.key === key)!;
    a.add("warning", key, meta.label, `The “${meta.label}” section is empty or missing.`, emptySectionAdvice(key));
  });

  /* ------------------------- activity readiness -------------------------- */
  const np = normalizePack(raw) as ContentPack;
  const withTranslation = np.vocabulary.filter((v) => v.translation).length;
  const withMeaning = np.idioms.filter((i) => i.meaning).length;
  const distinctTerms = new Set(np.vocabulary.map((v) => lc(v.term))).size;
  const fillableVocab = np.vocabulary.filter((v) => v.example?.target && new RegExp(`\\b${escapeRe(v.term)}\\w*\\b`, "i").test(v.example.target)).length;
  const bankFill = arr(rawBank?.fillBlank).length;
  const longSentences = np.sentences.filter((s) => words(s.target) >= 3).length;
  const longTurns = np.conversations.flatMap((c) => c.turns).filter((t) => words(t.target) >= 3).length;
  const bankSentences =
    arr(rawBank?.typeHear).length + arr(rawBank?.speak).length + arr(rawBank?.reorder).length;
  const sentencePool = longSentences + longTurns + bankSentences;
  const tapReady = np.grammar.reduce(
    (n, g) => n + g.exercises.filter((e) => (e.options?.length ?? 0) >= 2 && e.options!.some((o) => lc(o) === lc(e.answer))).length,
    0,
  );
  const grammarExercises = np.grammar.reduce((n, g) => n + g.exercises.length, 0);

  /* ------------------------ repetition & depth ------------------------ */
  /**
   * The player turns every sentence into its own question, so a repeated sentence is
   * a repeated question — the single most common failure of an AI-written pack, and
   * the one the learner notices first. This counts the sentences the exercises can
   * really use and reports the copies.
   */
  const sentenceTexts: string[] = [
    ...np.sentences.map((s) => s.target),
    ...np.conversations.flatMap((c) => c.turns.map((t) => t.target)),
    ...np.vocabulary.map((v) => v.example?.target ?? ""),
    ...np.idioms.map((i) => i.example?.target ?? ""),
    ...(np.activities.typeHear ?? []).map((x) => x.sentence),
    ...(np.activities.speak ?? []).map((x) => x.sentence),
    ...(np.activities.reorder ?? []).map((x) => x.sentence),
    ...(np.activities.listenSelect ?? []).map((x) => x.prompt),
  ];
  const sentenceCounts = new Map<string, number>();
  for (const text of sentenceTexts) {
    const key = lc(text).replace(/\s+/g, " ").replace(/[.?!,;:]+$/g, "").trim();
    if (key.length < 8) continue; // short chunks (greetings, single words) repeat legitimately
    sentenceCounts.set(key, (sentenceCounts.get(key) ?? 0) + 1);
  }
  const repeated = [...sentenceCounts.entries()].filter(([, count]) => count > 1);
  const extraCopies = repeated.reduce((n, [, count]) => n + (count - 1), 0);
  if (repeated.length)
    a.add(
      extraCopies > 4 ? "warning" : "info",
      "sentences",
      "repetition",
      `${repeated.length} sentence(s) appear more than once (${extraCopies} extra copy/copies) — every repeat turns into a duplicate question in the lessons and the timed races.`,
      `Rewrite the repeats as new sentences — for example “${short(repeated[0][0])}” — and ask the agent for one unique sentence per item.`,
    );

  /** Items with no mini lesson teach nothing beyond the translation. */
  const missingLessons =
    np.vocabulary.filter((v) => !v.feedback).length +
    np.idioms.filter((i) => !i.feedback).length +
    np.grammar.filter((g) => !g.feedback).length;
  if (missingLessons > 0)
    a.add(
      "info",
      "vocabulary",
      "mini lessons",
      `${missingLessons} item(s) have no "feedback" block, so their answer feedback is only the translation — no form, no usage in the learner's own life, no examples and no speaking question.`,
      'Add "feedback": { "meaning", "form", "use", "examples": […], "ccq" } to every vocabulary item, idiom and grammar point — the AI prompt asks for exactly this.',
    );

  const activities: ActivityReport[] = [
    {
      kind: "match",
      label: ACTIVITY_LABELS.match,
      ready: Math.max(withTranslation, withMeaning) >= 2,
      pool: withTranslation + withMeaning,
      sources: [`${withTranslation} translated words`, `${withMeaning} idioms`],
      blocker: Math.max(withTranslation, withMeaning) >= 2 ? undefined : "Needs 2+ items that have a translation or meaning.",
    },
    {
      kind: "select_translation",
      label: ACTIVITY_LABELS.select_translation,
      ready: distinctTerms >= 4,
      pool: distinctTerms,
      sources: [`${distinctTerms} distinct terms`, `${np.vocabulary.filter((v) => v.translation || v.definition).length} with a meaning`],
      blocker: distinctTerms >= 4 ? undefined : `Needs 4+ distinct vocabulary terms to build 4 options (has ${distinctTerms}).`,
    },
    {
      kind: "fill_blank",
      label: ACTIVITY_LABELS.fill_blank,
      ready: fillableVocab >= 1 || bankFill >= 1,
      pool: fillableVocab + bankFill,
      sources: [`${fillableVocab} examples containing their own word`, `${bankFill} bank items`],
      blocker:
        fillableVocab >= 1 || bankFill >= 1
          ? undefined
          : "No example sentence contains the word it illustrates — fill-in-the-blank falls back to a different activity.",
    },
    {
      kind: "type_hear",
      label: ACTIVITY_LABELS.type_hear,
      ready: sentencePool >= 1,
      pool: sentencePool,
      sources: [`${longSentences} sentences`, `${longTurns} dialogue lines`, `${bankSentences} bank items`],
      blocker: sentencePool >= 1 ? undefined : "Needs sentences or dialogue lines of 3+ words.",
    },
    {
      kind: "reorder",
      label: ACTIVITY_LABELS.reorder,
      ready: sentencePool >= 1,
      pool: sentencePool,
      sources: [`${longSentences} sentences`, `${longTurns} dialogue lines`],
      blocker: sentencePool >= 1 ? undefined : "Needs sentences of 3+ words.",
    },
    {
      kind: "listen_select",
      label: ACTIVITY_LABELS.listen_select,
      ready: distinctTerms >= 2 || sentencePool >= 1,
      pool: distinctTerms + sentencePool,
      sources: [`${distinctTerms} terms`, `${sentencePool} sentences`],
      blocker: distinctTerms >= 2 || sentencePool >= 1 ? undefined : "Needs at least 2 words or 1 sentence to build options.",
    },
    {
      kind: "speak",
      label: ACTIVITY_LABELS.speak,
      ready: sentencePool >= 1 || np.vocabulary.length >= 1,
      pool: sentencePool + np.vocabulary.length,
      sources: [`${sentencePool} sentences`, `${np.vocabulary.length} words`],
      blocker: sentencePool >= 1 || np.vocabulary.length >= 1 ? undefined : "Needs sentences or at least one word.",
    },
    {
      kind: "tap_complete",
      label: ACTIVITY_LABELS.tap_complete,
      ready: tapReady >= 1,
      pool: tapReady,
      sources: [`${tapReady} of ${grammarExercises} exercises are answerable`],
      blocker: tapReady >= 1 ? undefined : "No grammar exercise has 2+ options that include its own answer.",
    },
  ];
  activities.forEach((act) => {
    if (!act.ready) a.add("warning", act.kind === "tap_complete" ? "grammar" : "json", act.label, `Activity unavailable: ${act.blocker}`);
  });

  /* ------------------------------ scoring ------------------------------- */
  // Identical problems are grouped first, so a systematic gap counts once in the
  // lists (with a ×N badge) but still weighs a little more than a one-off.
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  const issues = groupIssues(a.issues).sort((x, y) => order[x.severity] - order[y.severity]);

  const weight: Record<Severity, number> = { error: 6, warning: 1.5, info: 0.25 };
  const penalty = issues.reduce((n, i) => n + weight[i.severity] * Math.min(i.count ?? 1, 5), 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const infos = issues.filter((i) => i.severity === "info").length;
  const verdict: AuditReport["verdict"] = errors >= 8 || score < 50 ? "broken" : errors > 0 || warnings > 0 ? "needs-work" : "ready";

  const totals = {
    items: rawVocab.length + rawGrammar.length + rawIdioms.length + rawConversations.length + rawSentences.length,
    kept: vocabKept + grammarKept + idiomsKept + conversationsKept + sentencesKept,
    dropped: sections.reduce((n, s) => n + s.dropped, 0),
    missingTranslations: sections.reduce((n, s) => n + s.missingTranslations, 0),
    thin: sections.reduce((n, s) => n + s.thin, 0),
    errors,
    warnings,
    infos,
  };

  const course: CoursePreview = {
    units: totalUnits(np),
    lessons: totalLessons(np),
    exercisesPerLesson: exercisesPerLesson(np),
    items: np.vocabulary.length + np.grammar.length + np.idioms.length + np.conversations.reduce((n, c) => n + c.turns.length, 0) + np.sentences.length,
  };

  return {
    parseError: null,
    verdict,
    score,
    issues,
    sections,
    activities,
    emptySections,
    coverage: {
      declaredSections,
      omissions,
      declared: declaredByKey,
      actual: actualCounts,
      mismatches: coverageMismatches,
    },
    meta: {
      app: str(metaRaw.app),
      version: str(metaRaw.version),
      sourceDocument: str(metaRaw.sourceDocument),
      l1: metaL1,
      l1Name: metaL1Name || metaL1,
      targetLanguage,
      level: str(metaRaw.level),
      learnerProfile: !!str(metaRaw.learnerProfile),
    },
    course,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Collapses identical problems into one line ("No nativeExplanation … ×23"),
 * so a systematic gap in the agent's output reads as one instruction instead of
 * 23 near-duplicate lines. Problems that name their own item are never merged.
 */
function groupIssues(issues: Issue[]): Issue[] {
  const groups = new Map<string, Issue>();
  for (const issue of issues) {
    const key = `${issue.severity}|${issue.section}|${issue.message}`;
    const found = groups.get(key);
    if (!found) {
      groups.set(key, { ...issue, count: 1, samples: [issue.where] });
      continue;
    }
    found.count = (found.count ?? 1) + 1;
    if (found.samples && found.samples.length < 5) found.samples.push(issue.where);
  }
  return [...groups.values()].map((group) =>
    (group.count ?? 1) > 1 ? { ...group, where: `${group.samples?.[0] ?? group.where} +${(group.count ?? 1) - 1} more` } : group,
  );
}

function emptySectionAdvice(key: SectionKey): string {
  switch (key) {
    case "vocabulary":
      return "Without vocabulary there is no Words page, no Match and no Choose-the-translation activity.";
    case "grammar":
      return "Without grammar there is no Grammar lesson and no tap-complete exercise.";
    case "idioms":
      return "Without idioms or expressions the Idioms page and the idiom lessons stay empty.";
    case "conversations":
      return "Without conversations there is no Talk page and no dialogue role-play.";
    case "sentences":
      return "Without sentences the listening (type-hear), reorder and speaking activities lose most of their material.";
    default:
      return "That section is not used by the course.";
  }
}

/* ------------------------------ report text ------------------------------ */

const VERDICT_LABEL: Record<AuditReport["verdict"], string> = {
  ready: "READY TO PUBLISH",
  "needs-work": "NEEDS WORK",
  broken: "DO NOT PUBLISH",
};

/** Plain-text version of a report, for pasting back to the AI agent. */
export function reportToText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`Lingo content-pack check — ${new Date(report.generatedAt).toLocaleString("en-US")}`);
  lines.push(`Verdict: ${VERDICT_LABEL[report.verdict]} (score ${report.score}/100)`);
  if (report.parseError) lines.push(`JSON error: ${report.parseError.message}`);
  lines.push(
    `${report.totals.items} items written · ${report.totals.kept} usable · ${report.totals.dropped} dropped · ` +
      `${report.totals.missingTranslations} missing translations · ${report.totals.thin} thin items`,
  );
  lines.push(`Course it builds: ${report.course.units} unit(s), ${report.course.lessons} lesson(s), ${report.course.exercisesPerLesson} exercises each`);
  lines.push(`Errors ${report.totals.errors} · Warnings ${report.totals.warnings} · Notes ${report.totals.infos}`);
  lines.push("");
  for (const severity of ["error", "warning", "info"] as Severity[]) {
    const group = report.issues.filter((i) => i.severity === severity);
    if (!group.length) continue;
    lines.push(`## ${severity.toUpperCase()}S (${group.length})`);
    for (const issue of group)
      lines.push(
        `- ${issue.where}: ${issue.message}${issue.count && issue.count > 1 ? ` (${issue.count}×)` : ""}${issue.fix ? ` → ${issue.fix}` : ""}`,
      );
    lines.push("");
  }
  lines.push("## ACTIVITY COVERAGE");
  for (const act of report.activities) lines.push(`- ${act.ready ? "OK" : "MISSING"} ${act.label} (${act.pool} items)${act.blocker ? ` — ${act.blocker}` : ""}`);
  return lines.join("\n");
}
