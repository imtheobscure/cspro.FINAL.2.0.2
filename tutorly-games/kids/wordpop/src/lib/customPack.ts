"use client";

import { useEffect, useState } from "react";
import { Category, CategoryId, Kind, Lang, LANGS, Theme, Word } from "./types";
import { readStore, writeStore, subscribe, K_THEMES } from "./store";
import { registerLesson, unregisterLesson, type LessonOverride } from "./lessons";

/**
 * CUSTOM CATEGORIES — copy a prompt into any external AI, paste the JSON back.
 *
 * The whole feature is two halves:
 *   · `buildPackPrompt` writes a demanding brief (quantity AND quality: real,
 *     teachable, kid-safe vocabulary with all six languages and pinyin), and
 *   · `parsePackJson` validates whatever comes back, repairs what it safely can
 *     and stores the result in this browser, so a tutor can add a topic the
 *     built-in library does not cover in about two minutes.
 */

export const KINDS: Kind[] = [
  "thing",
  "animal",
  "food",
  "person",
  "action",
  "feeling",
  "color",
  "shape",
  "number",
  "letter",
  "place",
  "weather",
  "body",
  "clothes",
  "vehicle",
  "opposite",
];

export const CATEGORY_PALETTE = [
  "#BDE0FE",
  "#CDEAC0",
  "#FFD6A5",
  "#E2D5F8",
  "#B9F0E1",
  "#FFC8DD",
  "#FFE9B0",
  "#D6E4FF",
  "#FFD1DC",
  "#C9F0D8",
];

export interface InstalledPack {
  id: string;
  name: string;
  installedAt: string;
  category: Category;
  themes: Theme[];
  warnings: string[];
  wordCount: number;
}

/* ═════════════════════════════ AI PROMPT ═════════════════════════════ */

export interface PackPromptOptions {
  /** Brand-new category, or more themes inside a category that already exists. */
  mode: "new" | "extend";
  /** e.g. "Space and planets" */
  topic: string;
  /** Existing category to extend (mode "extend"). */
  categoryId?: CategoryId;
  /** Language of the tutor's request, so the AI answers the titles naturally. */
  categoryName?: string;
  themeCount: number;
  wordsPerTheme: number;
  /** Languages the pack must contain. English is always included. */
  languages: Lang[];
  ageRange: string;
  notes?: string;
  /** English titles of the themes already in the app, so the AI does not repeat them. */
  existingThemes?: string[];
}

const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  zh: "Chinese (Simplified, with pinyin and tone marks)",
  fr: "French",
  it: "Italian",
  de: "German",
  tr: "Turkish",
};

const SCHEMA_SAMPLE = `{
  "category": {
    "id": "space",
    "emoji": "🚀",
    "color": "#BDE0FE",
    "title": { "en": "Space", "zh": "太空", "fr": "L'espace", "it": "Lo spazio", "de": "Weltraum", "tr": "Uzay" }
  },
  "themes": [
    {
      "id": "planets",
      "emoji": "🪐",
      "kind": "thing",
      "title": { "en": "Planets", "zh": "行星", "fr": "Les planètes", "it": "I pianeti", "de": "Planeten", "tr": "Gezegenler" },
      "words": [
        { "emoji": "🪐", "kind": "thing", "py": "xíngxīng",
          "t": { "en": "planet", "zh": "行星", "fr": "la planète", "it": "il pianeta", "de": "der Planet", "tr": "gezegen" } },
        { "emoji": "🌙", "kind": "thing", "py": "yuèliang",
          "t": { "en": "moon", "zh": "月亮", "fr": "la lune", "it": "la luna", "de": "der Mond", "tr": "ay" } }
      ]
    }
  ]
}`;

export function buildPackPrompt(o: PackPromptOptions): string {
  const langs = LANGS.filter((l) => l === "en" || o.languages.includes(l));
  const langList = langs.map((l) => `- "${l}": ${LANG_LABEL[l]}`).join("\n");
  const total = o.themeCount * o.wordsPerTheme;
  const already = o.existingThemes?.length
    ? `\n\n## ALREADY IN THE APP — DO NOT REPEAT THESE THEMES\n${o.existingThemes.join(", ")}`
    : "";

  return `You are an expert early-years language curriculum designer and bilingual lexicographer.
You build “WordPop” packs for Tutorly Kids: tutor-led, screen-shared first-word lessons for children aged ${o.ageRange}.

## WHAT TO BUILD
A complete, ready-to-teach vocabulary pack about: **${o.topic}**
${
  o.mode === "extend"
    ? `It will be added to the existing category \`${o.categoryId}\`, so call the category exactly that and treat it as new themes inside a family of topics the child already meets.`
    : `It becomes a brand-new category in the app, so give it a friendly, child-facing name, an emoji and a pastel colour.`
}

## QUANTITY (do not under-deliver)
- Exactly ${o.themeCount} themes — each one a genuinely distinct, teachable sub-topic (no theme that is just a rewording of another).
- Exactly ${o.wordsPerTheme} words in EVERY theme — ${total} words in total.
- Every single word must have all ${langs.length} languages filled in. A half-filled pack is a failed pack.

## LANGUAGES
${langList}

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary before or after, no trailing commas. Exactly this shape:

${SCHEMA_SAMPLE}

Field rules:
- "category": { "id": kebab-case-ascii, "emoji": ONE emoji, "color": a pastel hex like "#BDE0FE", "title": all languages }
- "themes": ${o.themeCount} items, each { "id", "emoji", "kind", "title", "words" }
- "words": ${o.wordsPerTheme} items, each { "emoji", "t", "py", "kind"? }
- "kind" is one of: ${KINDS.join(", ")} — it decides which talk-time questions the app asks, so choose the TRUE kind of the word (an animal is "animal", not "thing").
- For number themes add "n": the digit. For letter themes add "letter": "A". For shape themes add "shape": one of circle, square, triangle, rectangle, star, heart, oval, diamond. For colour themes add "color": the hex code.
- "py": Mandarin pinyin WITH tone marks (e.g. "xīngxīng") on every word of every theme — even when Chinese is not the theme's focus. Never put pinyin on non-Chinese words.
- "emoji": one real, universally available emoji that a child instantly recognises as that word. No flags, no skin-tone modifiers, no multi-person sequences.
- "id" fields: lowercase kebab-case ASCII, unique across the pack, derived from English.

## QUALITY BAR (a tutor and a 4-year-old will both see this)
- Concrete, picturable, high-frequency words: the words a small child actually says at home, in the park, in class. Nothing abstract, nothing a teacher would have to explain with three other words.
- Bedrock register: singular nouns (except real plurals like "pants"/"scissors"), simple infinitives for actions, positive feelings, no sarcasm, no scary, violent, medical or brand content, no proper nouns, no copyrighted characters, no alcohol/tobacco.
- Translations must be the natural everyday word that a native parent says to a toddler — not a dictionary or literal translation.
- French, Italian and German nouns must carry their article ("la pomme", "il sole", "der Apfel") and agree in number with the English word; Turkish nouns have no article.
- Chinese must be Simplified characters, natural for a small child, with the matching pinyin.
- No repeated word inside a theme and no word repeated across two themes.
- Consistency: every theme uses the same grammatical form (all singular, all plural) so the set can be drilled aloud.
${o.notes?.trim() ? `\n## EXTRA INSTRUCTIONS FROM THE TUTOR\n${o.notes.trim()}\n` : ""}${already}

## BEFORE YOU ANSWER, SILENTLY CHECK
1. ${o.themeCount} themes and ${o.wordsPerTheme} words each = ${total} words. 2. Every word has all ${langs.length} languages. 3. Every word has pinyin. 4. No duplicates. 5. The JSON parses.
Then output ONLY the JSON object.`;
}

/* ═════════════════════════ JSON VALIDATION ═════════════════════════ */

type Loose = Record<string, unknown>;

const asRecord = (v: unknown): Loose | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : null);
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "item";

/** Accept {"en": …} or {"en-US": …} or {"English": …}. */
function readTitleMap(raw: unknown, warnings: string[], label: string, fallbackEn: string): Record<Lang, string> | null {
  const rec = asRecord(raw);
  if (!rec) {
    warnings.push(`${label}: no title object — used "${fallbackEn}".`);
    return null;
  }
  const found: Partial<Record<Lang, string>> = {};
  for (const [key, value] of Object.entries(rec)) {
    const text = str(value);
    if (!text) continue;
    const code = key.trim().toLowerCase().slice(0, 2);
    const lang = LANGS.find((l) => l === code);
    if (lang && !found[lang]) found[lang] = text;
  }
  const en = found.en ?? fallbackEn;
  if (!en) return null;
  const missing = LANGS.filter((l) => !found[l]);
  if (missing.length) warnings.push(`${label}: missing ${missing.join(", ")} — filled from English.`);
  const out = {} as Record<Lang, string>;
  for (const l of LANGS) out[l] = found[l] ?? en;
  return out;
}

function readKind(raw: unknown, fallback: Kind): Kind {
  const k = str(raw).toLowerCase() as Kind;
  return KINDS.includes(k) ? k : fallback;
}

/**
 * Which languages a word's own `t` object was missing — the same key rule
 * `readTitleMap` uses. A word missing Turkish still works (English is shown),
 * but the tutor deserves to know the AI under-delivered.
 */
function missingLangs(raw: unknown): Lang[] {
  const rec = asRecord(raw);
  if (!rec) return [...LANGS];
  const found = new Set<Lang>();
  for (const [key, value] of Object.entries(rec)) {
    if (!str(value)) continue;
    const code = key.trim().toLowerCase().slice(0, 2);
    const lang = LANGS.find((l) => l === code);
    if (lang) found.add(lang);
  }
  return LANGS.filter((l) => !found.has(l));
}

/** Strip a pasted markdown fence and any chatter around the JSON object. */
export function extractJsonObject(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first > 0 || last < text.length - 1) {
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return text.trim();
}

export interface ParseResult {
  pack?: InstalledPack;
  error?: string;
}

export function parsePackJson(raw: string): ParseResult {
  const text = extractJsonObject(raw);
  if (!text) return { error: "Nothing to load — paste the JSON the AI returned." };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { error: `That is not valid JSON (${err instanceof Error ? err.message : "parse error"}). Paste the object the AI returned, starting with { and ending with }.` };
  }

  const root = asRecord(data);
  if (!root) return { error: "The JSON must be an object with a `category` and a `themes` array." };

  const warnings: string[] = [];
  const themesRaw = asArray<unknown>(root.themes ?? root.topics);
  if (!themesRaw.length) return { error: "No `themes` array found — the pack needs at least one theme with words." };

  const categoryRaw = asRecord(root.category) ?? {};
  const categoryName = str(asRecord(categoryRaw.title)?.en) || str(root.name) || "New category";
  const category: Category = {
    id: (slug(str(categoryRaw.id) || categoryName) || "custom") as CategoryId,
    emoji: str(categoryRaw.emoji) || "🌟",
    color: /^#[0-9a-f]{3,8}$/i.test(str(categoryRaw.color)) ? str(categoryRaw.color) : CATEGORY_PALETTE[0],
    title: readTitleMap(categoryRaw.title, warnings, "category title", categoryName) ?? {
      en: categoryName,
      zh: categoryName,
      fr: categoryName,
      it: categoryName,
      de: categoryName,
      tr: categoryName,
    },
  };

  const themes: Theme[] = [];
  let wordCount = 0;
  let wordsWithGaps = 0;
  let pinyinGaps = 0;
  const langGaps: Partial<Record<Lang, number>> = {};
  const seenThemeIds = new Set<string>();
  const seenWords = new Set<string>();

  for (const [ti, rawTheme] of themesRaw.slice(0, 40).entries()) {
    const t = asRecord(rawTheme);
    if (!t) {
      warnings.push(`Theme ${ti + 1} was not an object — skipped.`);
      continue;
    }
    const wordsRaw = asArray<unknown>(t.words);
    if (!wordsRaw.length) {
      warnings.push(`Theme "${str(asRecord(t.title)?.en) || ti + 1}" has no words — skipped.`);
      continue;
    }
    const themeKind = readKind(t.kind, "thing");
    const themeEn = str(asRecord(t.title)?.en) || str(t.id) || `Theme ${ti + 1}`;
    const title = readTitleMap(t.title, warnings, `theme "${themeEn}"`, themeEn);
    if (!title) {
      warnings.push(`Theme "${themeEn}" has no usable title — skipped.`);
      continue;
    }

    let themeId = slug(str(t.id) || title.en);
    while (seenThemeIds.has(themeId)) themeId = `${themeId}-2`;
    seenThemeIds.add(themeId);

    const words: Word[] = [];
    const seenInTheme = new Set<string>();
    for (const rawWord of wordsRaw.slice(0, 60)) {
      const wr = asRecord(rawWord);
      if (!wr) continue;
      const tMap = readTitleMap(wr.t ?? wr.word ?? wr.translations, [], "", "");
      const en = tMap?.en ?? str(wr.en) ?? "";
      if (!en) {
        warnings.push(`A word in "${title.en}" had no English form — skipped.`);
        continue;
      }
      const normEn = en.toLowerCase();
      if (seenInTheme.has(normEn)) continue;
      seenInTheme.add(normEn);
      if (seenWords.has(normEn)) warnings.push(`"${en}" appears in more than one theme.`);
      seenWords.add(normEn);

      const gaps = missingLangs(wr.t ?? wr.word ?? wr.translations);
      if (gaps.length) {
        wordsWithGaps++;
        for (const g of gaps) langGaps[g] = (langGaps[g] ?? 0) + 1;
      }
      if (!str(wr.py ?? wr.pinyin)) pinyinGaps++;

      const emoji = str(wr.emoji) || "🔤";
      const id = slug(str(wr.id) || en);
      const kind = readKind(wr.kind, themeKind);
      const word: Word = {
        id,
        emoji,
        t: tMap ?? { en, zh: en, fr: en, it: en, de: en, tr: en },
        py: str(wr.py ?? wr.pinyin),
        kind,
      };
      const n = Number(wr.n ?? wr.number);
      if (Number.isFinite(n) && n > 0) word.n = Math.round(n);
      const letter = str(wr.letter);
      if (letter) word.letter = letter.slice(0, 3).toUpperCase();
      const shape = str(wr.shape).toLowerCase();
      if (shape) word.shape = shape;
      const color = str(wr.color);
      if (/^#[0-9a-f]{3,8}$/i.test(color)) word.color = color;
      words.push(word);
      wordCount++;
    }

    if (!words.length) {
      warnings.push(`Theme "${title.en}" ended up with no usable words — skipped.`);
      continue;
    }
    if (words.length < 8) warnings.push(`Theme "${title.en}" has only ${words.length} words (8+ keeps the games interesting).`);

    themes.push({
      id: themeId,
      category: category.id,
      emoji: str(t.emoji) || words[0].emoji || "🌟",
      kind: themeKind,
      title,
      words,
      countEmoji: str(t.countEmoji) || undefined,
    });
  }

  if (!themes.length) return { error: "No usable themes in that JSON. Each theme needs a title, a kind and a words array." };
  if (themesRaw.length > 40) warnings.push("Only the first 40 themes were loaded.");

  // Quality report — first, so it is the first thing the tutor sees.
  if (wordsWithGaps) {
    const per = LANGS.filter((l) => langGaps[l])
      .map((l) => `${LANG_LABEL[l].replace(/\s*\(.*\)$/, "")} ×${langGaps[l]}`)
      .join(", ");
    warnings.unshift(
      `Quality: ${wordsWithGaps} of ${wordCount} words arrived without every language (${per}) — those show the English word instead. Paste the same prompt again and ask the AI for a complete set.`,
    );
  }
  if (pinyinGaps) {
    warnings.push(`${pinyinGaps} of ${wordCount} words had no pinyin — the Chinese cards still read aloud, but the pinyin line stays empty.`);
  }

  const pack: InstalledPack = {
    id: category.id,
    name: category.title.en,
    installedAt: new Date().toISOString(),
    category,
    themes,
    warnings,
    wordCount,
  };
  return { pack };
}

/* ═════════════════════════ STORAGE ═════════════════════════ */

function sanitizeForStorage(pack: InstalledPack): InstalledPack {
  // Keep only what the app renders; a pack lives in localStorage (5 MB), so the
  // raw AI text is not stored — the tutor can keep that in their own file.
  return {
    id: pack.id,
    name: pack.name,
    installedAt: pack.installedAt,
    category: pack.category,
    themes: pack.themes,
    warnings: pack.warnings.slice(0, 12),
    wordCount: pack.wordCount,
  };
}

export function listPacks(): InstalledPack[] {
  const rows = readStore<InstalledPack[]>(K_THEMES, []);
  if (!Array.isArray(rows)) return [];
  return rows.filter((p) => p && p.category && Array.isArray(p.themes));
}

export function installPack(pack: InstalledPack) {
  const others = listPacks().filter((p) => p.id !== pack.id);
  writeStore(K_THEMES, [...others, sanitizeForStorage(pack)]);
}

export function removePack(id: string) {
  writeStore(K_THEMES, listPacks().filter((p) => p.id !== id));
}

export function clearPacks() {
  writeStore(K_THEMES, []);
}

/** Live list of installed packs (same tab + other tabs). */
export function usePacks(): InstalledPack[] {
  const [packs, setPacks] = useState<InstalledPack[]>([]);
  useEffect(() => {
    const load = () => setPacks(listPacks());
    load();
    return subscribe(K_THEMES, load);
  }, []);
  return packs;
}

/**
 * Accept both a single pasted pack and a bundle downloaded from this app
 * (`{"app":"wordpop","packs":[…]}`), so the tutor can move categories
 * between devices or keep a backup file.
 */
export function parseAnyPackJson(raw: string): ParseResult[] {
  const text = extractJsonObject(raw);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const root = asRecord(data);
  const bundle = asArray<unknown>(root?.packs);
  if (bundle.length) return bundle.map((entry) => parsePackJson(JSON.stringify(entry)));
  return [parsePackJson(text)];
}

/** Download the installed packs as a .json file the tutor can reuse anywhere. */
export function downloadPacks(packs: InstalledPack[]) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ app: "wordpop", version: 1, packs }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wordpop-categories-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ═════════════════════════ LESSON PLANS ═════════════════════════
 *
 * The second kind of JSON this screen accepts. A pack adds topics; a LESSON
 * PLAN is a timed, tutor-ready plan for a topic that ALREADY exists — the
 * objectives, the materials, the stages with the words the tutor says out
 * loud, the concept-check questions and what the child should answer back.
 *
 * It works exactly like a pack: copy the prompt into any external AI, paste the
 * JSON back, and the plan is attached to that topic. Like a pack, only the
 * pasted PLAN is stored — the topic itself keeps coming from the library, so a
 * plan follows a language switch and never goes stale when the words change.
 *
 * Every topic already has a plan WordPop writes from its own words (see
 * lib/lessons.ts). Pasting one replaces it; removing it brings WordPop's back.
 */

export interface LessonPromptOptions {
  /** The topic the plan is for. */
  themeId: string;
  /** Minutes the tutor has with the child. */
  minutes: number;
  /** The child's age. */
  age: string;
  /** The language the tutor speaks to the child. */
  tutorLang: Lang;
  /** The language being taught. */
  targetLang: Lang;
  notes?: string;
  /** Stage headings to reuse unless the AI has better ones. */
  stageNames: string[];
}

const LESSON_SAMPLE = `{
  "themeId": "farm-animals",
  "objectives": ["Say 6 farm words clearly.", "Answer “Is it a cow?” with Yes/No."],
  "materials": ["2 soft toys", "a box", "colouring pencils"],
  "extension": "Ask the child to name the animals on the way home next time.",
  "review": ["cow", "duck", "I like …"],
  "vocab": ["cow", "duck", "sheep"],
  "stages": [
    { "title": { "en": "Warm-up", "zh": "热身", "fr": "Échauffement", "it": "Riscaldamento", "de": "Aufwärmen", "tr": "Isınma" },
      "icon": "👋", "color": "#f5c453",
      "steps": [
        { "minutes": 2, "script": "Hello! How are you today?", "expected": "“I am happy!”",
          "action": "Wave, then mirror the child's feeling face." },
        { "minutes": 2, "ccq": "Is a cow bigger than you?", "expected": "Yes + “It is a cow.”",
          "action": "Point at the animal cards." }
      ] }
  ]
}`;

/**
 * The brief for the external AI. It carries the topic's REAL word list, its
 * six translations and the exact activity arc WordPop can play, so the plan the
 * AI returns drops straight into this game.
 */
export function buildLessonPrompt(o: LessonPromptOptions, themes: Theme[]): string {
  const theme = themes.find((t) => t.id === o.themeId) ?? themes[0];
  const words = theme
    ? theme.words.map((w) => `${w.emoji} ${w.t.en} (${w.t[o.targetLang] ?? w.t.en})`).join(", ")
    : "";
  const gameWords = theme ? theme.words.slice(0, 6).map((w) => w.t[o.targetLang] ?? w.t.en).join(", ") : "";

  return `You are a master early-years language teacher (like a Montessori / Jolly Phonics trainer) writing a full lesson plan a tutor will follow word-for-word on a video call.

## THE LESSON
- Topic: **${theme ? theme.title.en : o.themeId}** — in the game WordPop, where the child plays six activities on these words.
- The words in this topic: ${words}
- The child is ${o.age} years old.
- The tutor speaks ${LANG_LABEL[o.tutorLang]} to the child and teaches ${LANG_LABEL[o.targetLang]}.
- The lesson must fill about **${o.minutes} minutes** and never sit still for more than 3 minutes on one activity.
- The child must SPEAK in almost every step. Screen-share friendly: everything happens out loud or with the child's own toys.
${o.notes?.trim() ? `- Tutor's own notes to respect: ${o.notes.trim()}\n` : ""}
## HOW TO WRITE IT
- ${o.stageNames.length} stages, one per heading: ${o.stageNames.join(" → ")}. You may rename them, but keep the same number and the same teaching arc (settle → present → practise → produce → play/game → wrap up).
- Each stage has 2–5 steps. The "minutes" of every step in a stage should add up to roughly the time that stage deserves.
- Write "script" as the ACTUAL words the tutor says out loud (in ${LANG_LABEL[o.targetLang]}), short and natural. Put the answer you expect from the child in "expected". Put the teaching move — the gesture, the toy, the praise — in "action".
- Use "ccq" for a concept-check question ("Is a cow bigger than you?", "Do you like milk?") and put the correct answer in "expected".
- "action" is English and is always about a REAL object or movement: a ball, a box, a mirror, a spoon, a walk to the window, clapping, jumping. Never "ask the child to repeat" with nothing to do.
- Point the tutor at the game's own activities where they fit: 💬 Learn (big cards + talk time), 🎵 Chant (clap and repeat), 🧩 Match (drag word to picture), 🃏 Memory (find the pairs), ❓ Quiz (listen and choose), 👂 Touch it! (hear and touch).
- Only use words from the topic list above plus function words the child already knows at this age.
- Safety: no scary, violent, medical or branded content; no food the child may be allergic to; nothing that needs a purchase.

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary. Exactly this shape:

${LESSON_SAMPLE}

Field rules:
- "themeId": exactly "${o.themeId}".
- "objectives": 3–5 one-sentence goals, written for the tutor.
- "materials": 3–6 things the tutor should have ready — household objects first, nothing expensive.
- "review": 3–5 items to run through at the very end (words or whole sentences).
- "vocab": the ids of the words you actually use — copy them exactly from the topic list. These ids are the English words lowercased with kebab-case (e.g. ${gameWords.split(", ").slice(0, 2).map((w) => slug(w)).join(", ") || "cat, dog"}).
- "stages": the stages above. "title" is an object with all six languages (en, zh, fr, it, de, tr), "icon" one emoji, "color" a hex from this palette only: #f5c453, #7fb2de, #8fbe9b, #e86a8a, #b394d6, #35302a.
- "steps": each has "minutes" (1–3, whole numbers), and at least one of "script" (tutor's spoken words), "ccq" (a concept-check question) or "action" (the physical move). "expected" and "action" are welcome on every step.

## BEFORE YOU ANSWER, SILENTLY CHECK
1. The steps' minutes add up to about ${o.minutes}.
2. Every stage makes the child speak.
3. Every "vocab" id exists in the topic list.
4. The JSON parses and has no trailing commas.
Then output ONLY the JSON object.`;
}

/* ═════════════════════════ JSON → LESSON PLAN ═════════════════════════ */

const HEX = /^#[0-9a-f]{3,8}$/i;

/** A pasted stage title in all six languages (the PlaySchool/WordPop rule). */
function readLessonTitle(raw: unknown, fallback: string): Record<Lang, string> {
  // An AI often answers with a plain string where the sample shows an object
  // (`"title": "Warm-up"` instead of `"title": { "en": "Warm-up", … }`). That is
  // a perfectly good title, so use it for every language — NOT a reason to show
  // "Stage 3".
  const plain = typeof raw === "string" ? raw.trim() : "";
  if (plain) {
    const out = {} as Record<Lang, string>;
    for (const l of LANGS) out[l] = plain;
    return out;
  }
  const rec = asRecord(raw);
  const found: Partial<Record<Lang, string>> = {};
  if (rec) {
    for (const [key, value] of Object.entries(rec)) {
      const text = str(value);
      if (!text) continue;
      const code = key.trim().toLowerCase().slice(0, 2);
      const lang = LANGS.find((l) => l === code);
      if (lang && !found[lang]) found[lang] = text;
    }
  }
  const en = found.en || fallback;
  const out = {} as Record<Lang, string>;
  for (const l of LANGS) out[l] = found[l] ?? en;
  return out;
}

export interface ParsedLesson {
  themeId: string;
  override: LessonOverride;
  warnings: string[];
  stages: number;
  steps: number;
  minutes: number;
}

export interface LessonParseResult {
  lesson?: ParsedLesson;
  error?: string;
}

/**
 * Validate and normalise a pasted lesson plan for one topic.
 *
 * `themes` is the live catalogue (built-in + installed packs), because a plan
 * may be written for a topic that was itself pasted in a moment ago.
 */
export function parseLessonJson(raw: string, themes: Theme[]): LessonParseResult {
  const text = extractJsonObject(raw);
  if (!text) return { error: "Nothing to load — paste the JSON the AI returned." };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { error: `That is not valid JSON (${err instanceof Error ? err.message : "parse error"}). Paste the object the AI returned.` };
  }

  const root = asRecord(data);
  if (!root) return { error: "The JSON must be an object with `themeId` and a `stages` array." };

  const warnings: string[] = [];
  const wanted = slug(str(root.themeId ?? root.theme ?? root.topic));
  const ids = themes.map((t) => t.id);
  let themeId = wanted && ids.includes(wanted) ? wanted : "";
  if (!themeId) {
    const guess = ids.find((id) => id === wanted || id.includes(wanted) || wanted.includes(id));
    if (guess) {
      warnings.push(`Topic "${wanted}" is not in the library — the plan was attached to "${guess}" instead.`);
      themeId = guess;
    } else {
      return { error: `Unknown topic "${str(root.themeId)}". The prompt prints the exact topic id to use.` };
    }
  }
  const theme = themes.find((t) => t.id === themeId);

  const stagesRaw = asArray<unknown>(root.stages ?? root.sections ?? root.parts);
  if (!stagesRaw.length) return { error: "No `stages` array found — a lesson needs at least one stage with timed steps." };

  const stages: NonNullable<LessonOverride["stages"]> = [];
  let steps = 0;
  let minutes = 0;

  for (const [si, rawStage] of stagesRaw.slice(0, 10).entries()) {
    const sRaw = asRecord(rawStage);
    if (!sRaw) continue;
    const title = readLessonTitle(sRaw.title ?? sRaw.name ?? sRaw.stage, `Stage ${si + 1}`);
    const stepsRaw = asArray<unknown>(sRaw.steps ?? sRaw.activities ?? sRaw.items);
    const clean: NonNullable<LessonOverride["stages"]>[number]["steps"] = [];

    for (const rawStep of stepsRaw.slice(0, 12)) {
      const stRaw = asRecord(rawStep);
      if (!stRaw) continue;
      const mins = Number(stRaw.minutes ?? stRaw.min);
      const step: (typeof clean)[number] = {
        minutes: Number.isFinite(mins) ? Math.min(10, Math.max(1, Math.round(mins))) : 2,
      };
      const script = str(stRaw.script ?? stRaw.say);
      if (script) step.script = script;
      const ccq = str(stRaw.ccq ?? stRaw.question);
      if (ccq) step.ccq = ccq;
      const expected = str(stRaw.expected ?? stRaw.answer);
      if (expected) step.expected = expected;
      const action = str(stRaw.action ?? stRaw.do);
      if (action) step.action = action;
      const wordIds = asArray<unknown>(stRaw.wordIds ?? stRaw.words).map(str).filter(Boolean);
      if (wordIds.length) step.wordIds = wordIds;

      if (!step.script && !step.ccq && !step.action) {
        warnings.push(`Stage ${si + 1}: a step had no script, question or action — skipped.`);
        continue;
      }
      clean.push(step);
      steps++;
      minutes += step.minutes;
    }

    if (!clean.length) {
      warnings.push(`Stage ${si + 1} ("${title.en}") had no usable steps — skipped.`);
      continue;
    }
    stages.push({
      title,
      icon: str(sRaw.icon) || undefined,
      color: HEX.test(str(sRaw.color)) ? str(sRaw.color) : undefined,
      steps: clean,
    });
  }

  if (!stages.length) return { error: "Every stage was empty — each stage needs steps with a script, a question or an action." };

  const override: LessonOverride = {
    stages,
    objectives: asArray<unknown>(root.objectives ?? root.goals).map(str).filter(Boolean).slice(0, 8),
    materials: asArray<unknown>(root.materials ?? root.props).map(str).filter(Boolean).slice(0, 10),
    review: asArray<unknown>(root.review).map(str).filter(Boolean).slice(0, 10),
    extension: str(root.extension ?? root.homework) || undefined,
    vocab: asArray<unknown>(root.vocab ?? root.wordIds).map(str).filter(Boolean).slice(0, 60),
    source: "ai",
  };

  // Word ids are English slugs — keep only the ones this topic actually has, so
  // a hallucinated word can never make the plan highlight nothing.
  if (override.vocab?.length && theme) {
    const known = new Set(theme.words.map((w) => w.id));
    const kept = override.vocab.filter((id) => known.has(slug(id))).map(slug);
    const unknown = override.vocab.filter((id) => !known.has(slug(id)));
    if (unknown.length) {
      warnings.push(`Ignored ${unknown.length} word id(s) this topic does not have: ${unknown.slice(0, 6).join(", ")}.`);
    }
    override.vocab = kept.length ? kept : undefined;
  }

  if (minutes < 5) warnings.push(`The whole plan only adds up to ${minutes} minutes — a real lesson is 20–40.`);

  return { lesson: { themeId, override, warnings, stages: stages.length, steps, minutes } };
}

/* ─────────────────────────── saved lesson plans ─────────────────────────── */

const K_LESSONS = "wordpop.customLessons.v1";

export interface StoredLesson {
  themeId: string;
  title: string;
  installedAt: string;
  stages: number;
  steps: number;
  minutes: number;
  override: LessonOverride;
}

export function listLessonPlans(): StoredLesson[] {
  const rows = readStore<StoredLesson[]>(K_LESSONS, []);
  if (!Array.isArray(rows)) return [];
  return rows.filter((l) => l && l.themeId && l.override);
}

function writeLessons(rows: StoredLesson[]) {
  writeStore(K_LESSONS, rows);
}

/** Turn a pasted plan into the live lesson for its topic, and remember it. */
export function installLesson(parsed: ParsedLesson, themes: Theme[]): void {
  const theme = themes.find((t) => t.id === parsed.themeId);
  const stored: StoredLesson = {
    themeId: parsed.themeId,
    title: theme?.title.en ?? parsed.themeId,
    installedAt: new Date().toISOString(),
    stages: parsed.stages,
    steps: parsed.steps,
    minutes: parsed.minutes,
    override: parsed.override,
  };
  writeLessons([...listLessonPlans().filter((l) => l.themeId !== parsed.themeId), stored]);
  registerLesson(parsed.themeId, parsed.override);
}

/** Re-attach every pasted plan (called once on boot). */
export function reinstallSavedLessons(): number {
  const rows = listLessonPlans();
  for (const row of rows) registerLesson(row.themeId, row.override);
  return rows.length;
}

/** Drop a pasted plan: the topic goes back to the plan WordPop writes. */
export function removeLesson(themeId: string): void {
  writeLessons(listLessonPlans().filter((l) => l.themeId !== themeId));
  unregisterLesson(themeId);
}

/** Live list of pasted plans (same tab + other tabs). */
export function useInstalledLessons(): StoredLesson[] {
  const [rows, setRows] = useState<StoredLesson[]>([]);
  useEffect(() => {
    const load = () => setRows(listLessonPlans());
    load();
    return subscribe(K_LESSONS, load);
  }, []);
  return rows;
}
