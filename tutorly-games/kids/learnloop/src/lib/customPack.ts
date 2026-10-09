"use client";

import { PHRASES, t } from "./data/phrases";
import { CUSTOM_THEME_IDS, THEMES, UNITS, UNIT_MAP, WORDS, installThemes, label, removeThemes, unitTheme } from "./data";
import type { Kind, Lang, Theme, Unit, Word } from "./data/types";
import { LANGS } from "./data/types";
import { getCcqs, sentenceFor } from "./data/ccq";
import {
  allUnitIds,
  autoLesson,
  registerLesson,
  unregisterLesson,
  type LessonOverride,
  type Step,
} from "./data/lessons";

/**
 * COPY AN AI PROMPT → PASTE THE JSON BACK → A NEW THEME APPEARS.
 *
 * LearnLoop ships with 10 themes. Everything else is a tutor's own material, and
 * this is how a tutor adds it: press one button, give the prompt to ChatGPT /
 * Claude / Gemini / Grok, paste the answer into the box and the theme is on the
 * shelf — illustrated, translated into all six languages, with pinyin, and
 * playable by every one of the eleven game modes.
 *
 * The grammar of the JSON is LearnLoop's own data model (theme → units → words),
 * so the imported material is indistinguishable from the built-in themes:
 *   · `installThemes()` pushes it into the live library (see lib/data/index.ts),
 *   · the titles are registered as real phrase rows, so `t()` localises them,
 *   · the whole pack is stored in localStorage, so it survives a reload.
 */

const KIND_LIST: Kind[] = [
  "animal",
  "person",
  "food",
  "drink",
  "thing",
  "clothes",
  "body",
  "place",
  "vehicle",
  "action",
  "color",
  "shape",
  "number",
  "letter",
  "feeling",
  "weather",
  "time",
  "nature",
];

export interface PackOptions {
  topic: string;
  /** How many themes to ask for (1–8). */
  themeCount: number;
  /** Units per theme. */
  unitsPerTheme: number;
  /** Words per unit. */
  wordsPerUnit: number;
  ageRange: string;
  languages: Lang[];
  notes?: string;
  /** English titles already in the library, so the AI does not repeat them. */
  existingTitles: string[];
}

const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  zh: "Chinese (Simplified, with pinyin and tone marks)",
  fr: "French",
  it: "Italian",
  de: "German",
  tr: "Turkish",
};

const SAMPLE = `{
  "themes": [
    {
      "id": "ocean",
      "title": { "en": "Under the Sea", "zh": "海底世界", "fr": "Sous la mer", "it": "Sotto il mare", "de": "Unter dem Meer", "tr": "Denizin altında" },
      "icon": "🐠",
      "color": "#7fb2e5",
      "soft": "#e8f1fb",
      "frame": "What can you see? — I can see a …",
      "units": [
        {
          "id": "seacreatures",
          "title": { "en": "Sea creatures", "zh": "海洋动物", "fr": "Les animaux marins", "it": "Gli animali del mare", "de": "Meerestiere", "tr": "Deniz canlıları" },
          "icon": "🐙",
          "words": [
            { "emoji": "🐙", "kind": "animal", "py": "zhāngyú",
              "t": { "en": "octopus", "zh": "章鱼", "fr": "la pieuvre", "it": "il polpo", "de": "der Oktopus", "tr": "ahtapot" } }
          ]
        }
      ]
    }
  ]
}`;

export function buildPackPrompt(o: PackOptions): string {
  const langs = LANGS.filter((l) => l.id === "en" || o.languages.includes(l.id));
  const total = o.themeCount * o.unitsPerTheme * o.wordsPerUnit;
  const already = o.existingTitles.length
    ? `\n\n## ALREADY IN THE GAME — DO NOT REPEAT THESE THEMES\n${o.existingTitles.join(", ")}`
    : "";

  return `You are an expert early-years language curriculum designer and bilingual lexicographer.
You are writing new themes for LearnLoop: tutor-led, screen-shared language lessons for children aged ${o.ageRange}. The tutor speaks one language, the child learns another.

## WHAT TO BUILD
New, ready-to-teach themes about: **${o.topic}**
- Exactly ${o.themeCount} theme(s) — genuinely distinct sub-topics, never a rewording of each other.
- Exactly ${o.unitsPerTheme} unit(s) inside EVERY theme.
- Exactly ${o.wordsPerUnit} words in EVERY unit — ${total} words in total.
- Every word needs all ${langs.length} languages. A half-filled pack is a failed pack.

## LANGUAGES
${langs.map((l) => `- "${l.id}": ${LANG_LABEL[l.id]}`).join("\n")}

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary, no trailing commas. Exactly this shape:

${SAMPLE}

Field rules:
- "themes": ${o.themeCount} item(s). Each has "id" (lowercase kebab-case ASCII, unique), "title", ONE "icon" emoji, "color" (a strong hex like "#7fb2e5"), "soft" (a very pale tint of the SAME hue, e.g. "#e8f1fb"), "frame" (one English sentence frame the tutor can drill, with a "…" gap) and "units".
- "units": ${o.unitsPerTheme} item(s). Each has "id" (kebab-case, unique across the whole pack), "title" (all languages), "icon" (one emoji) and "words".
- "words": ${o.wordsPerUnit} item(s). Each has "emoji" (one real, universally available emoji a child instantly recognises; no flags, no skin-tone modifiers, no multi-person sequences), "kind" (one of: ${KIND_LIST.join(", ")}) and "t" (the word in every language).
- "py": Mandarin pinyin WITH tone marks (e.g. "zhāngyú") on every word. Never put pinyin on non-Chinese words.
- Numbers: also add "digit": the numeral (1–20) and use the keycap emoji ("1️⃣"). Colours: also add "hex": the colour code. Shapes: also add "shape": one of circle, square, triangle, rectangle, star, heart, oval, diamond. Letters: also add "letter": "A" and "sound": the phonics sound like "/a/". Opposites: also add "opp" — the "id" of the opposite word in this pack.
- "kind" decides which concept-check questions the app asks, so choose the TRUE kind (an animal is "animal", not "thing").

## QUALITY BAR (a tutor and a 4-year-old will both see this)
- Concrete, picturable, high-frequency words: the words a small child actually says at home, in the park, in class. Nothing abstract.
- Bedrock register: singular nouns (except real plurals like "pants"), simple infinitives for actions, positive feelings, no sarcasm, no scary/violent/medical/brand content, no proper nouns, no copyrighted characters, no alcohol.
- Translations must be the natural everyday word a native parent says to a toddler — not a dictionary translation.
- French, Italian and German nouns carry their article ("la pomme", "il sole", "der Apfel") and agree in number with the English word; Turkish nouns have no article.
- Chinese: Simplified characters, natural for a small child, matching pinyin.
- No word repeated inside a unit and no word repeated across the pack.
- One grammatical form per unit (all singular, or all plural) so the set can be drilled aloud.${already}

## BEFORE YOU ANSWER, SILENTLY CHECK
1. ${o.themeCount} theme(s) × ${o.unitsPerTheme} unit(s) × ${o.wordsPerUnit} words = ${total} words.
2. Every word has all ${langs.length} languages and pinyin.
3. No duplicates. 4. The JSON parses.
Then output ONLY the JSON object.`;
}

/* ═════════════════════════ JSON → THEMES ═════════════════════════ */

type Loose = Record<string, unknown>;
const asRecord = (v: unknown): Loose | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Loose) : null);
const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";

export interface InstalledPack {
  id: string;
  name: string;
  installedAt: string;
  themeIds: string[];
  words: number;
  warnings: string[];
}

/** Strip a pasted markdown fence and any chatter around the JSON object. */
export function extractJsonObject(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  return text.trim();
}

/** Read a { en, zh, … } object, accepting "en-US"/"English" style keys too. */
function readTitle(raw: unknown, fallback: string): Record<Lang, string> {
  const out = {} as Record<Lang, string>;
  // An AI often answers with a plain string where the sample shows an object
  // (`"title": "Under the Sea"` instead of `{ "en": "Under the Sea", … }`). That
  // is a perfectly good title: use it for every language rather than discarding it
  // and showing "Theme 1" in the shelf.
  const plain = typeof raw === "string" ? raw.trim() : "";
  if (plain) {
    for (const l of LANGS) out[l.id] = plain;
    return out;
  }
  const rec = asRecord(raw);
  const found: Partial<Record<Lang, string>> = {};
  if (rec) {
    for (const [key, value] of Object.entries(rec)) {
      const text = str(value);
      if (!text) continue;
      const code = key.trim().toLowerCase().slice(0, 2);
      const lang = LANGS.find((l) => l.id === code);
      if (lang && !found[lang.id]) found[lang.id] = text;
    }
  }
  const en = found.en || fallback;
  for (const l of LANGS) out[l.id] = found[l.id] ?? en;
  return out;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

export interface ParseResult {
  pack?: InstalledPack;
  themes?: Theme[];
  error?: string;
}

/**
 * Turn the AI's JSON into LearnLoop themes. Repairs what it safely can (missing
 * languages fall back to English, loose ids get slugged) and reports honestly
 * what it could not fix.
 */
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
  if (!root) return { error: "The JSON must be an object with a `themes` array." };
  const themesRaw = asArray<unknown>(root.themes ?? root.topics ?? root.categories);
  if (!themesRaw.length) return { error: "No `themes` array found — a pack needs at least one theme with units and words." };

  const warnings: string[] = [];
  const themes: Theme[] = [];
  const seenThemeIds = new Set<string>(THEMES.map((t) => t.id));
  const seenUnitIds = new Set<string>(UNITS.map((u) => u.id));
  const seenWordIds = new Set<string>(WORDS.map((w) => w.id));
  const seenWords = new Set<string>();
  let wordCount = 0;
  let missingLangs = 0;
  let missingPinyin = 0;

  for (const [ti, rawTheme] of themesRaw.slice(0, 8).entries()) {
    const tRaw = asRecord(rawTheme);
    if (!tRaw) {
      warnings.push(`Theme ${ti + 1} was not an object — skipped.`);
      continue;
    }
    const title = readTitle(tRaw.title ?? tRaw.name, str(tRaw.id) || `Theme ${ti + 1}`);
    const enTitle = title.en;
    let themeId = slug(str(tRaw.id) || enTitle);
    while (seenThemeIds.has(themeId)) themeId = `${themeId}-2`;
    seenThemeIds.add(themeId);

    const unitsRaw = asArray<unknown>(tRaw.units ?? tRaw.groups ?? tRaw.subthemes);
    if (!unitsRaw.length) {
      warnings.push(`Theme "${enTitle}" has no units — skipped.`);
      continue;
    }

    const themeKey = `theme.x.${themeId}`;
    PHRASES[themeKey] = title;

    const units: Unit[] = [];
    for (const [ui, rawUnit] of unitsRaw.slice(0, 8).entries()) {
      const uRaw = asRecord(rawUnit);
      if (!uRaw) continue;
      const unitTitle = readTitle(uRaw.title ?? uRaw.name, str(uRaw.id) || `Unit ${ui + 1}`);
      let unitId = slug(str(uRaw.id) || `${themeId}-${unitTitle.en}`);
      while (seenUnitIds.has(unitId)) unitId = `${unitId}-2`;
      seenUnitIds.add(unitId);

      const wordsRaw = asArray<unknown>(uRaw.words ?? uRaw.items);
      const words: Word[] = [];
      for (const rawWord of wordsRaw.slice(0, 40)) {
        const wRaw = asRecord(rawWord);
        if (!wRaw) continue;
        const map = readTitle(wRaw.t ?? wRaw.word ?? wRaw.translations, str(wRaw.en) || "");
        const en = str(asRecord(wRaw.t)?.en) || str(wRaw.en) || map.en;
        if (!en) {
          warnings.push(`A word in "${unitTitle.en}" had no English form — skipped.`);
          continue;
        }
        const norm = en.toLowerCase();
        if (seenWords.has(norm)) {
          warnings.push(`"${en}" appeared twice in the pack — the second copy was skipped.`);
          continue;
        }
        seenWords.add(norm);

        if (LANGS.some((l) => !asRecord(wRaw.t)?.[l.id] && !asRecord(wRaw.word)?.[l.id])) missingLangs++;
        if (!str(wRaw.py ?? wRaw.pinyin)) missingPinyin++;

        let wordId = slug(str(wRaw.id) || en);
        while (seenWordIds.has(wordId)) wordId = `${wordId}-2`;
        seenWordIds.add(wordId);

        const kind = (KIND_LIST as string[]).includes(str(wRaw.kind).toLowerCase())
          ? (str(wRaw.kind).toLowerCase() as Kind)
          : "thing";
        const word: Word = {
          id: wordId,
          e: str(wRaw.emoji) || "🔤",
          k: kind,
          t: map,
          py: str(wRaw.py ?? wRaw.pinyin) || undefined,
        };
        const hex = str(wRaw.hex ?? wRaw.color);
        if (HEX.test(hex)) word.hex = hex;
        const shape = str(wRaw.shape).toLowerCase();
        if (shape) word.shape = shape as Word["shape"];
        const digit = Number(wRaw.digit ?? wRaw.n);
        if (Number.isFinite(digit) && digit > 0) word.digit = Math.round(digit);
        const letter = str(wRaw.letter);
        if (letter) word.letter = letter.slice(0, 1).toUpperCase();
        const sound = str(wRaw.sound);
        if (sound) word.sound = sound;
        const ex = str(wRaw.ex ?? wRaw.example);
        if (ex) word.ex = ex;
        const opp = str(wRaw.opp ?? wRaw.opposite);
        if (opp) word.opp = opp;
        const frame = str(wRaw.ex ?? wRaw.sentence);
        if (frame) word.ex = frame;

        words.push(word);
        wordCount++;
      }

      if (!words.length) {
        warnings.push(`Unit "${unitTitle.en}" ended up with no usable words — skipped.`);
        continue;
      }
      if (words.length < 4) warnings.push(`Unit "${unitTitle.en}" has only ${words.length} words (6+ plays better).`);

      const unitKey = `unit.x.${unitId}`;
      PHRASES[unitKey] = unitTitle;
      units.push({ id: unitId, name: unitKey, icon: str(uRaw.icon) || words[0].e || "🎈", words });
    }

    if (!units.length) {
      warnings.push(`Theme "${enTitle}" ended up with no usable units — skipped.`);
      delete PHRASES[themeKey];
      continue;
    }

    const color = HEX.test(str(tRaw.color)) ? str(tRaw.color) : "#7fb2e5";
    const soft = HEX.test(str(tRaw.soft)) ? str(tRaw.soft) : "#eef4fb";
    const frame = str(tRaw.frame) || `What is it? — It is a …`;
    const frameKey = `frame.x.${themeId}`;
    PHRASES[frameKey] = readTitle(tRaw.frame, frame);

    themes.push({
      id: themeId,
      name: themeKey,
      icon: str(tRaw.icon) || "🌟",
      color,
      soft,
      chantId: "me",
      frame,
      units,
    });
  }

  if (!themes.length) return { error: "No usable themes in that JSON. Each theme needs a title and at least one unit with words." };

  if (missingLangs) {
    warnings.unshift(
      `Quality: ${missingLangs} of ${wordCount} words arrived without every language — those show the English word instead. Ask the AI for a complete set and paste it again.`,
    );
  }
  if (missingPinyin) warnings.push(`${missingPinyin} of ${wordCount} words had no pinyin — the Chinese cards read aloud, but the pinyin line stays empty.`);

  const pack: InstalledPack = {
    id: themes[0].id,
    name: themes.map((t) => t.name).length === 1 ? themes[0].name : `${themes.length} themes`,
    installedAt: new Date().toISOString(),
    themeIds: themes.map((t) => t.id),
    words: wordCount,
    warnings: warnings.slice(0, 12),
  };
  return { pack, themes };
}

/* ═════════════════════════ storage ═════════════════════════ */

const K_PACKS = "learnloop.customPacks.v1";

interface StoredPack {
  id: string;
  name: string;
  installedAt: string;
  words: number;
  /** the themes exactly as parsed, so a reload can put them back */
  themes: Theme[];
  /** the phrase rows the titles live in (theme.x.*, unit.x.*, frame.x.*) */
  phrases: Record<string, Record<Lang, string>>;
}

export function listPacks(): StoredPack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(K_PACKS);
    const rows = raw ? (JSON.parse(raw) as StoredPack[]) : [];
    return Array.isArray(rows) ? rows.filter((p) => p && Array.isArray(p.themes)) : [];
  } catch {
    return [];
  }
}

function writePacks(rows: StoredPack[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_PACKS, JSON.stringify(rows));
  } catch {
    /* quota — the themes stay usable for this session */
  }
}

/** Remember a freshly parsed pack and switch it on. */
export function installPack(themes: Theme[], pack: InstalledPack): void {
  const phrases: Record<string, Record<Lang, string>> = {};
  for (const theme of themes) {
    if (PHRASES[theme.name]) phrases[theme.name] = PHRASES[theme.name];
    for (const unit of theme.units) if (PHRASES[unit.name]) phrases[unit.name] = PHRASES[unit.name];
  }
  const rows = listPacks().filter((p) => !pack.themeIds.includes(p.id));
  rows.push({ ...pack, themes, phrases });
  writePacks(rows);
  activateThemes(themes);
}

/** Put every saved pack back into the library (called once on boot). */
export function reinstallSavedPacks(): number {
  const rows = listPacks();
  let words = 0;
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.phrases ?? {})) PHRASES[key] = value;
    const res = activateThemes(row.themes);
    words += row.themes.reduce((n, t) => n + t.units.reduce((m, u) => m + u.words.length, 0), 0);
    if (res.skipped.length) {
      // Already in the library (e.g. two tabs) — nothing to do.
    }
  }
  return words;
}

/** Forget a pack: it disappears from the library and from storage. */
export function removePack(id: string): void {
  const rows = listPacks();
  const gone = rows.find((p) => p.id === id);
  writePacks(rows.filter((p) => p.id !== id));
  if (gone) removeThemes(gone.themes.map((t) => t.id));
}

/** Install into the live library right now. */
export function activateThemes(themes: Theme[]): { added: number; skipped: string[] } {
  return installThemes(themes);
}

/** Themes installed from pasted JSON, as opposed to the ones in the build. */
export function customThemes(): Theme[] {
  return THEMES.filter((t) => CUSTOM_THEME_IDS.has(t.id));
}

/* ═════════════════════════════ THE LESSON-PLAN PROMPT ═════════════════════════════ */

/**
 * A LESSON PLAN FOR ONE UNIT — the same copy-prompt → paste-JSON route, aimed at
 * the thing a tutor actually teaches from.
 *
 * LearnLoop already writes a timed plan for every unit (lib/data/lessons.ts), so
 * the AI is asked to improve on that: keep the six-stage teaching arc the child
 * already knows, but write the objectives, the materials and the tutor's actual
 * spoken script for THIS unit's words. The unit's sentence frames and
 * concept-check questions are handed over as raw material, so the plan builds on
 * material the game itself already uses.
 */
export interface LessonPromptOptions {
  unitId: string;
  /** Minutes the tutor has with the child. */
  minutes: number;
  /** The child's age, e.g. "4". */
  age: string;
  tutorLang: Lang;
  targetLang: Lang;
  notes?: string;
  /** Stage headings to reuse unless the AI has better ones. */
  stageNames: string[];
}

const LESSON_SAMPLE = `{
  "unitId": "pets",
  "objectives": ["Say 6 pet words clearly.", "Answer “Is it a cat?” with Yes/No."],
  "materials": ["2 soft toys", "a box", "colouring pencils"],
  "extension": "Ask the child to name their own pet at home next time.",
  "review": ["cat", "dog", "I have a …"],
  "vocab": ["cat", "dog", "fish"],
  "stages": [
    { "title": { "en": "Warm-up", "zh": "热身", "fr": "Échauffement", "it": "Riscaldamento", "de": "Aufwärmen", "tr": "Isınma" },
      "icon": "👋", "color": "#f5c453",
      "steps": [
        { "minutes": 2, "script": "Hello! How are you today?", "expected": "“I am happy!”",
          "action": "Wave, then mirror the child's feeling face." },
        { "minutes": 2, "ccq": "Is a cat alive?", "expected": "Yes + “It is a cat.”",
          "action": "Point at the pet cards." }
      ] }
  ]
}`;

export function buildLessonPrompt(o: LessonPromptOptions, words: Word[]): string {
  const unit = UNIT_MAP[o.unitId];
  const theme = unit ? unitTheme(o.unitId) : undefined;
  const source = unit ? unit.words : words;
  const lines = source
    .slice(0, 8)
    .map((wd) => `${wd.id} → ${wd.e} ${label(wd, "en")}${o.targetLang !== "en" ? ` (${label(wd, o.targetLang)})` : ""} [${wd.k}]`)
    .join("\n");
  const frames = unit ? unit.words.slice(0, 4).map((wd) => `- ${label(wd, "en")}: “${sentenceFor(wd, o.targetLang)}”`).join("\n") : "";
  const ccqs = unit
    ? unit.words
        .slice(0, 5)
        .flatMap((wd) => getCcqs(wd, o.targetLang).slice(0, 2).map((q) => `- ${t(q.key, o.targetLang, q.vars)}`))
        .join("\n")
    : "";

  return `You are a master early-years language teacher (Montessori / Jolly Phonics trained) writing a full lesson plan a tutor will follow word-for-word on a video call.

## THE LESSON
- Unit: **${unit ? t(unit.name, "en") : o.unitId}**${theme ? ` — inside the theme "${t(theme.name, "en")}"` : ""}.
- The child is ${o.age} years old.
- The tutor speaks ${LANG_LABEL[o.tutorLang]} to the child and teaches ${LANG_LABEL[o.targetLang]}.
- The lesson must fill about **${o.minutes} minutes** and never sit still for more than 3 minutes on one activity.
- The child must SPEAK in almost every step. Screen-share friendly: everything happens out loud or with the child's own toys.
${o.notes?.trim() ? `- Tutor's own notes to respect: ${o.notes.trim()}\n` : ""}
## THE UNIT'S WORDS (use only these, plus words the child already knows)
${lines}

## SENTENCE FRAMES ALREADY WIRED INTO THE GAME
${frames || "- (this unit has no frames yet — write your own simple one)"}

## CONCEPT-CHECK QUESTIONS THE GAME ALREADY ASKS
${ccqs || "- (none generated for this unit — write your own simple ones)"}
Reuse these where they fit, and add your own where the words need them.

## HOW TO WRITE IT
- ${o.stageNames.length} stages, one per heading: ${o.stageNames.join(" → ")}. You may rename them, but keep the same number and the same teaching arc (settle → present → practise → produce → play → wrap up).
- Each stage has 2–5 steps whose "minutes" add up to what that stage deserves.
- Write "script" as the ACTUAL words the tutor says out loud (in ${LANG_LABEL[o.targetLang]}), short and natural. Put the answer you expect from the child in "expected". Put the teaching move — the gesture, the toy, the praise — in "action".
- Use "ccq" for a concept-check question and put the correct answer in "expected".
- "action" is English and is always about a REAL object or movement: a ball, a box, a mirror, a spoon, a walk to the window, clapping, jumping. Never just "ask the child to repeat" with nothing to do.
- Every stage ends with the child producing language, not only listening.
- Safety: no scary, violent, medical or branded content; nothing needing a purchase.

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary before or after. Exactly this shape:

${LESSON_SAMPLE}

Field rules:
- "unitId": exactly "${o.unitId}".
- "objectives": 3–5 one-sentence goals written for the tutor.
- "materials": 3–6 things to have ready — household objects first, nothing expensive.
- "review": 3–5 items to run through at the very end (words or whole sentences).
- "vocab": ids of the words you actually use, copied EXACTLY from the word list above.
- "stages": the stages above. "title" is an object with all six languages (en, zh, fr, it, de, tr), "icon" one emoji, "color" a hex from this palette only: #f5c453, #7fb2de, #e86a8a, #8fbe9b, #b394d6, #35302a.
- "steps": each has "minutes" (1–3, whole numbers) and at least one of "script", "ccq" or "action".

## BEFORE YOU ANSWER, SILENTLY CHECK
1. The steps' minutes add up to about ${o.minutes}.
2. Every stage makes the child speak.
3. Every "vocab" id exists in the word list.
4. The JSON parses and has no trailing commas.
Then output ONLY the JSON object.`;
}

/* ═════════════════════════════ JSON → LESSON PLAN ═════════════════════════════ */

export interface ParsedLesson {
  unitId: string;
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

/** Validate and normalise a pasted lesson plan. */
export function parseLessonJson(raw: string): LessonParseResult {
  const text = extractJsonObject(raw);
  if (!text) return { error: "Nothing to load — paste the JSON the AI returned." };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { error: `That is not valid JSON (${err instanceof Error ? err.message : "parse error"}). Paste the object the AI returned.` };
  }

  const root = asRecord(data);
  if (!root) return { error: "The JSON must be an object with `unitId` and a `stages` array." };

  const warnings: string[] = [];
  let unitId = slug(str(root.unitId));
  // `allUnitIds()` is live, so a unit from a theme the tutor just installed counts.
  if (!unitId || !allUnitIds().includes(unitId)) {
    const guess = allUnitIds().find((id) => id === unitId || id.includes(unitId) || unitId.includes(id));
    if (guess) {
      warnings.push(`Unit "${unitId}" is not in the library — the plan was attached to "${guess}" instead.`);
      unitId = guess;
    } else {
      return { error: `Unknown unit "${str(root.unitId)}". The prompt prints the exact unit id to use.` };
    }
  }

  const stagesRaw = asArray<unknown>(root.stages ?? root.sections ?? root.parts);
  if (!stagesRaw.length) return { error: "No `stages` array found — a lesson needs at least one stage with timed steps." };

  const stages: NonNullable<LessonOverride["stages"]> = [];
  let steps = 0;
  let minutes = 0;

  for (const [si, rawStage] of stagesRaw.slice(0, 10).entries()) {
    const sRaw = asRecord(rawStage);
    if (!sRaw) continue;
    const title = readTitle(sRaw.title ?? sRaw.name ?? sRaw.stage, `Stage ${si + 1}`);
    const stepsRaw = asArray<unknown>(sRaw.steps ?? sRaw.activities ?? sRaw.items);
    const clean: Step[] = [];

    for (const rawStep of stepsRaw.slice(0, 12)) {
      const stRaw = asRecord(rawStep);
      if (!stRaw) continue;
      const mins = Number(stRaw.minutes ?? stRaw.min);
      const step: Step = { minutes: Number.isFinite(mins) ? Math.min(10, Math.max(1, Math.round(mins))) : 2 };
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
    vocab: asArray<unknown>(root.vocab ?? root.wordIds).map(str).filter(Boolean).slice(0, 40),
    source: "ai",
  };

  if (override.vocab?.length) {
    const known = new Set(override.vocab.filter((id) => autoLesson(unitId, "en", false)?.vocab.some((wd) => wd.id === id)));
    const unknown = override.vocab.filter((id) => !known.has(id));
    if (unknown.length) {
      warnings.push(`Ignored ${unknown.length} unknown word id(s): ${unknown.slice(0, 6).join(", ")}.`);
      override.vocab = [...known];
    }
  }

  if (minutes < 5) warnings.push(`The whole plan only adds up to ${minutes} minutes — a real lesson is 20–40.`);

  return { lesson: { unitId, override, warnings, stages: stages.length, steps, minutes } };
}

/* ═════════════════════════════ lesson storage ═════════════════════════════ */

const K_LESSONS = "learnloop.customLessons.v1";

export interface StoredLesson extends ParsedLesson {
  installedAt: string;
}

export function listLessons(): StoredLesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(K_LESSONS);
    const rows = raw ? (JSON.parse(raw) as StoredLesson[]) : [];
    return Array.isArray(rows) ? rows.filter((l) => l && l.unitId && l.override) : [];
  } catch {
    return [];
  }
}

function writeLessons(rows: StoredLesson[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_LESSONS, JSON.stringify(rows));
  } catch {
    /* quota — the plan stays usable for this session */
  }
}

/** Register a parsed plan in the live game and remember it for next time. */
export function installLesson(lesson: ParsedLesson): void {
  registerLesson(lesson.unitId, lesson.override);
  const rows = listLessons().filter((l) => l.unitId !== lesson.unitId);
  rows.push({ ...lesson, installedAt: new Date().toISOString() });
  writeLessons(rows);
}

/** Put every saved plan back into the game (called once on boot). */
export function reinstallSavedLessons(): number {
  const rows = listLessons();
  for (const row of rows) registerLesson(row.unitId, row.override);
  return rows.length;
}

export function removeLesson(unitId: string): void {
  writeLessons(listLessons().filter((l) => l.unitId !== unitId));
  unregisterLesson(unitId);
}

/** The units a lesson can be written for — the live library, custom themes included. */
export function lessonUnits(): { id: string; label: string; icon: string; words: number }[] {
  return UNITS.map((u) => ({ id: u.id, label: t(u.name, "en"), icon: u.icon, words: u.words.length }));
}
