"use client";

import {
  CUSTOM_THEME_IDS,
  SUBTHEMES,
  THEMES,
  getSubtheme,
  installThemes,
  removeThemes,
  themeOfSubtheme,
  wordsOf,
} from "@/data/dictionary";
import { LANGS } from "@/data/languages";
import type { LangCode, Subtheme, Theme, Translations, Word } from "@/data/types";
import { registerLesson, teachableSets, unregisterLesson, type LessonOverride } from "./lessons";

/**
 * COPY AN AI PROMPT → PASTE THE JSON BACK → A NEW THEME IS IN THE STUDIO.
 *
 * BiliBuddies ships with nine themes. Everything a tutor needs beyond that is
 * their own material, and this is how they add it: press one button, hand the
 * prompt to ChatGPT / Claude / Gemini / Grok, paste the answer back and the theme
 * is on the shelf — illustrated, translated into all six languages, with pinyin,
 * and playable by every mode (learn, quiz, match, sort, chant, talk, abc, count).
 *
 * The JSON grammar is BiliBuddies' own data model (theme → subthemes → words), so
 * an imported theme is indistinguishable from a built-in one:
 *   · `installThemes()` pushes it into the live dictionary (data/dictionary.ts),
 *   · the titles keep their six languages inside the pack, so nothing needs
 *     translating after the fact,
 *   · the pack is stored in localStorage, so it survives a reload.
 */

export interface PackOptions {
  topic: string;
  themeCount: number;
  subthemesPerTheme: number;
  wordsPerSubtheme: number;
  ageRange: string;
  languages: LangCode[];
  notes?: string;
  existingTitles: string[];
}

const LANG_LABEL: Record<LangCode, string> = {
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
      "id": "doctor",
      "title": { "en": "At the Doctor", "zh": "看医生", "fr": "Chez le médecin", "it": "Dal dottore", "de": "Beim Arzt", "tr": "Doktorda" },
      "emoji": "🩺",
      "color": "#6FA8E8",
      "soft": "#EEF5FF",
      "chant": [
        { "en": "Open wide, say aah!", "zh": "张大嘴，啊！", "fr": "Ouvre grand, dis aah !", "it": "Apri bene, di aah!", "de": "Mach weit auf, sag aah!", "tr": "Ağzını aç, aah de!" }
      ],
      "subthemes": [
        {
          "id": "doctor-things",
          "title": { "en": "Doctor things", "zh": "医生的东西", "fr": "Les affaires du docteur", "it": "Le cose del dottore", "de": "Arztsachen", "tr": "Doktor eşyaları" },
          "emoji": "🩹",
          "words": [
            { "emoji": "🩺", "pinyin": "tīngzhěnqì",
              "t": { "en": "stethoscope", "zh": "听诊器", "fr": "le stéthoscope", "it": "lo stetoscopio", "de": "das Stethoskop", "tr": "stetoskop" } }
          ]
        }
      ]
    }
  ]
}`;

export function buildPackPrompt(o: PackOptions): string {
  const langs = LANGS.filter((l) => l.id === "en" || o.languages.includes(l.id));
  const total = o.themeCount * o.subthemesPerTheme * o.wordsPerSubtheme;

  return `You are an expert early-years language teacher and bilingual lexicographer.
You are writing new themes for BiliBuddies, a tutor-led, screen-shared language studio for children aged ${o.ageRange}. The tutor speaks one language and the child is learning another.

## WHAT TO BUILD
New, ready-to-teach themes about: **${o.topic}**
- Exactly ${o.themeCount} theme(s) — genuinely distinct subjects, never a rewording of each other.
- Exactly ${o.subthemesPerTheme} subtheme(s) inside EVERY theme (a subtheme is a group of 6–8 words a tutor can teach in five minutes).
- Exactly ${o.wordsPerSubtheme} words in EVERY subtheme — ${total} words in total.
- Every word needs all ${langs.length} languages. A half-filled pack is a failed pack.

## LANGUAGES
${langs.map((l) => `- "${l.id}": ${LANG_LABEL[l.id]}`).join("\n")}

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary, no trailing commas. Exactly this shape:

${SAMPLE}

Field rules:
- "themes": ${o.themeCount} item(s). Each has "id" (lowercase kebab-case ASCII, unique across the pack), "title" (all languages), ONE "emoji", "color" (a strong hex like "#6FA8E8"), "soft" (a very pale tint of the SAME hue, e.g. "#EEF5FF"), "chant" (2–4 short singable lines in every language, each with a clap-friendly rhythm) and "subthemes".
- "subthemes": ${o.subthemesPerTheme} item(s). Each has "id" (kebab-case, unique across the pack), "title" (all languages), ONE "emoji" and "words".
- "words": ${o.wordsPerSubtheme} item(s). Each has "emoji" (one real, universally available emoji a child instantly recognises — no flags, no skin-tone modifiers, no multi-person sequences) and "t" (the word in every language).
- "pinyin": Mandarin pinyin WITH tone marks (e.g. "tīngzhěnqì") on every word. Never put pinyin on non-Chinese words.
- Animals and vehicles that make a sound: also add "sound" — the same six languages, e.g. "woof" / "汪汪" / "ouaf" / "bau" / "wau" / "hav".
- Numbers: "numeral" (the digit) and a keycap emoji. Letters: "letter" ("A") and "phonics" (the sound, like "a as in apple").
- Words that belong together in a sorting game: add "bin" — a short basket key shared by the words that go together (e.g. "fruit", "vegetable").

## QUALITY BAR (a tutor and a 4-year-old will both see this)
- Concrete, picturable, high-frequency words: the words a small child actually says at home, in the park, in class. Nothing abstract.
- Bedrock register: singular nouns (except real plurals like "pants"), simple infinitives for actions, positive feelings, no sarcasm, no scary/violent/medical/brand content, no proper nouns, no copyrighted characters, no alcohol.
- Translations must be the natural everyday word a native parent says to a toddler — not a dictionary translation.
- French, Italian and German nouns carry their article ("la pomme", "il sole", "der Apfel") and agree in number with the English word; Turkish nouns have no article.
- Chinese: Simplified characters, natural for a small child, with matching pinyin.
- No word repeated inside a subtheme and no word repeated across the pack.${
    o.existingTitles.length
      ? `\n\n## ALREADY IN THE STUDIO — DO NOT REPEAT THESE THEMES\n${o.existingTitles.join(", ")}`
      : ""
  }

## BEFORE YOU ANSWER, SILENTLY CHECK
1. ${o.themeCount} theme(s) × ${o.subthemesPerTheme} subtheme(s) × ${o.wordsPerSubtheme} words = ${total} words.
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

export function extractJsonObject(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  return text.trim();
}

function readTranslations(raw: unknown, fallback: string): Translations {
  // An AI often answers with a plain string where the sample shows an object
  // (`"title": "At the Doctor"` instead of `{ "en": "At the Doctor", … }`). That
  // is a perfectly good title: use it for every language rather than discarding it
  // and showing "Theme 1" on the shelf.
  const plain = typeof raw === "string" ? raw.trim() : "";
  if (plain) {
    const out = {} as Translations;
    for (const l of LANGS) out[l.id] = plain;
    return out;
  }
  const rec = asRecord(raw);
  const found: Partial<Record<LangCode, string>> = {};
  if (rec) {
    for (const [key, value] of Object.entries(rec)) {
      const text = str(value);
      if (!text) continue;
      const code = key.trim().toLowerCase().slice(0, 2) as LangCode;
      if (LANGS.some((l) => l.id === code) && !found[code]) found[code] = text;
    }
  }
  const en = found.en || fallback;
  const out = {} as Translations;
  for (const l of LANGS) out[l.id] = found[l.id] ?? en;
  return out;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

export interface ParseResult {
  pack?: InstalledPack;
  themes?: Theme[];
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
  if (!root) return { error: "The JSON must be an object with a `themes` array." };
  const themesRaw = asArray<unknown>(root.themes ?? root.topics ?? root.categories);
  if (!themesRaw.length) return { error: "No `themes` array found — a pack needs at least one theme with subthemes and words." };

  const warnings: string[] = [];
  const themes: Theme[] = [];
  const usedThemeIds = new Set(THEMES.map((t) => t.id));
  const usedSubIds = new Set(SUBTHEMES.map((s) => s.id));
  const usedWords = new Set<string>();
  let wordCount = 0;
  let missingLangs = 0;
  let missingPinyin = 0;

  for (const [ti, rawTheme] of themesRaw.slice(0, 8).entries()) {
    const tRaw = asRecord(rawTheme);
    if (!tRaw) {
      warnings.push(`Theme ${ti + 1} was not an object — skipped.`);
      continue;
    }
    const title = readTranslations(tRaw.title ?? tRaw.name, str(tRaw.id) || `Theme ${ti + 1}`);
    let themeId = slug(str(tRaw.id) || title.en);
    while (usedThemeIds.has(themeId)) themeId = `${themeId}-2`;
    usedThemeIds.add(themeId);

    const subsRaw = asArray<unknown>(tRaw.subthemes ?? tRaw.units ?? tRaw.groups);
    if (!subsRaw.length) {
      warnings.push(`Theme "${title.en}" has no subthemes — skipped.`);
      continue;
    }

    const subthemes: Subtheme[] = [];
    for (const [si, rawSub] of subsRaw.slice(0, 8).entries()) {
      const sRaw = asRecord(rawSub);
      if (!sRaw) continue;
      const subTitle = readTranslations(sRaw.title ?? sRaw.name, str(sRaw.id) || `Subtheme ${si + 1}`);
      let subId = slug(str(sRaw.id) || `${themeId}-${subTitle.en}`);
      while (usedSubIds.has(subId)) subId = `${subId}-2`;
      usedSubIds.add(subId);

      const words: Word[] = [];
      for (const rawWord of asArray<unknown>(sRaw.words ?? sRaw.items).slice(0, 40)) {
        const wRaw = asRecord(rawWord);
        if (!wRaw) continue;
        const en = str(asRecord(wRaw.t)?.en) || str(wRaw.en);
        const map = readTranslations(wRaw.t ?? wRaw.word ?? wRaw.translations, en);
        if (!map.en) {
          warnings.push(`A word in "${subTitle.en}" had no English form — skipped.`);
          continue;
        }
        const norm = map.en.toLowerCase();
        if (usedWords.has(norm)) {
          warnings.push(`"${map.en}" appeared twice in the pack — the second copy was skipped.`);
          continue;
        }
        usedWords.add(norm);

        const asTranslations = asRecord(wRaw.t) ?? asRecord(wRaw.word);
        if (LANGS.some((l) => !asTranslations?.[l.id])) missingLangs++;
        if (!str(wRaw.pinyin ?? wRaw.py)) missingPinyin++;

        let id = `${subId}:${slug(str(wRaw.id) || map.en)}`;
        while (usedWords.has(id)) id = `${id}-2`;
        usedWords.add(id);

        const word: Word = { id, emoji: str(wRaw.emoji) || "🔤", t: map };
        const pinyin = str(wRaw.pinyin ?? wRaw.py);
        if (pinyin) word.pinyin = pinyin;
        const numeral = Number(wRaw.numeral ?? wRaw.n);
        if (Number.isFinite(numeral) && numeral > 0) word.numeral = Math.round(numeral);
        const letter = str(wRaw.letter);
        if (letter) word.letter = letter.slice(0, 1).toUpperCase();
        const phonics = str(wRaw.phonics ?? wRaw.sound);
        if (phonics && word.letter) word.phonics = phonics;
        const bin = str(wRaw.bin);
        if (bin) word.bin = slug(bin);
        const sound = asRecord(wRaw.sound);
        if (sound && str(sound.en)) word.sound = readTranslations(sound, str(sound.en));
        if (wRaw.plural === true) word.plural = true;

        words.push(word);
        wordCount++;
      }

      if (!words.length) {
        warnings.push(`Subtheme "${subTitle.en}" ended up with no usable words — skipped.`);
        continue;
      }
      if (words.length < 4) warnings.push(`Subtheme "${subTitle.en}" has only ${words.length} words (6+ plays better).`);
      subthemes.push({ id: subId, emoji: str(sRaw.emoji) || words[0].emoji, t: subTitle, words });
    }

    if (!subthemes.length) {
      warnings.push(`Theme "${title.en}" ended up with no usable subthemes — skipped.`);
      continue;
    }

    const chantRaw = asArray<unknown>(tRaw.chant);
    const chant = chantRaw.map((line) => readTranslations(line, "")).filter((line) => line.en);

    themes.push({
      id: themeId,
      emoji: str(tRaw.emoji) || "🌟",
      color: HEX.test(str(tRaw.color)) ? str(tRaw.color) : "#6FA8E8",
      soft: HEX.test(str(tRaw.soft)) ? str(tRaw.soft) : "#EEF5FF",
      t: title,
      chant: chant.length ? chant : [{ en: `${title.en}!`, zh: title.zh, fr: title.fr, it: title.it, de: title.de, tr: title.tr }],
      subthemes,
    });
  }

  if (!themes.length) return { error: "No usable themes in that JSON. Each theme needs a title and at least one subtheme with words." };
  if (missingLangs) {
    warnings.unshift(
      `Quality: ${missingLangs} of ${wordCount} words arrived without every language — those show the English word instead. Ask the AI for a complete set and paste it again.`,
    );
  }
  if (missingPinyin) warnings.push(`${missingPinyin} of ${wordCount} words had no pinyin — the Chinese cards read aloud, but the pinyin line stays empty.`);

  return {
    pack: {
      id: themes[0].id,
      name: themes.map((t) => t.t.en).join(", "),
      installedAt: new Date().toISOString(),
      themeIds: themes.map((t) => t.id),
      words: wordCount,
      warnings: warnings.slice(0, 12),
    },
    themes,
  };
}

/* ═════════════════════════ storage ═════════════════════════ */

const K_PACKS = "bilibuddies.customPacks.v1";

interface StoredPack extends InstalledPack {
  themes: Theme[];
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

export function installPack(themes: Theme[], pack: InstalledPack): void {
  const rows = listPacks().filter((p) => !pack.themeIds.includes(p.id));
  rows.push({ ...pack, themes });
  writePacks(rows);
  installThemes(themes);
}

/** Put every saved pack back into the dictionary (called once on boot). */
export function reinstallSavedPacks(): number {
  let words = 0;
  for (const row of listPacks()) {
    installThemes(row.themes);
    words += row.themes.reduce((n, t) => n + t.subthemes.reduce((m, s) => m + s.words.length, 0), 0);
  }
  return words;
}

export function removePack(id: string): void {
  const rows = listPacks();
  const gone = rows.find((p) => p.id === id);
  writePacks(rows.filter((p) => p.id !== id));
  if (gone) removeThemes(gone.themes.map((t) => t.id));
}

/** Themes installed from pasted JSON, as opposed to the ones in the build. */
export function customThemes(): Theme[] {
  return THEMES.filter((t) => CUSTOM_THEME_IDS.has(t.id));
}

/* ═════════════════════════ LESSON PLANS ═════════════════════════
 *
 * The second kind of JSON this screen accepts. A pack adds themes; a LESSON PLAN
 * is a timed, tutor-ready plan for a word set that ALREADY exists — objectives,
 * materials, six stages and the words the tutor says out loud, with the
 * concept-check questions and what the child is expected to answer back.
 *
 * It works exactly like a pack: copy the prompt into any external AI, paste the
 * JSON back, and the plan is attached to that word set. Like a pack, only the
 * pasted PLAN is stored — the word set itself keeps coming from the dictionary,
 * so a plan follows a language switch and never goes stale when the words change.
 *
 * Every word set already has a plan BiliBuddies writes from its own chant and
 * question bank (lib/lessons.ts). Pasting one replaces it; removing it brings
 * BiliBuddies' back.
 */

export interface LessonPromptOptions {
  /** The word set the plan is for (a subtheme id). */
  subthemeId: string;
  /** Minutes the tutor has with the child. */
  minutes: number;
  /** The child's age. */
  age: string;
  /** The language the tutor speaks to the child. */
  tutorLang: LangCode;
  /** The language being taught. */
  targetLang: LangCode;
  notes?: string;
  /** Stage headings to reuse unless the AI has better ones. */
  stageNames: string[];
}

/**
 * Map a word id the AI wrote onto one this word set really has.
 *
 * The prompt prints the full dictionary id, but an AI happily shortens it
 * ("nose" for "self-body:nose") — that is a resolvable id, not a mistake worth
 * dropping the word over.
 */
function resolveWordId(id: string, known: Set<string>): string | undefined {
  if (known.has(id)) return id;
  const short = slug(id);
  for (const k of known) if (k.split(":").pop() === short) return k;
  return undefined;
}

const LESSON_SAMPLE = `{
  "subthemeId": "self-body",
  "objectives": ["Say 6 body words clearly.", "Answer “Is this your nose?” with Yes/No."],
  "materials": ["a mirror", "a soft toy", "colouring pencils"],
  "extension": "Play “touch your …” at bath time next time.",
  "review": ["nose", "hand", "This is my …"],
  "vocab": ["nose", "hand", "eye"],
  "stages": [
    { "title": { "en": "Warm-up", "zh": "热身", "fr": "Échauffement", "it": "Riscaldamento", "de": "Aufwärmen", "tr": "Isınma" },
      "icon": "👋", "color": "#f5c453",
      "steps": [
        { "minutes": 2, "script": "Hello! Touch your nose!", "expected": "The child touches their nose.",
          "action": "Wave, then mirror the child's own gesture back at them." },
        { "minutes": 2, "ccq": "Is this your nose?", "expected": "Yes + “This is my nose.”",
          "action": "Point at the card, then at your own face." }
      ] }
  ]
}`;

/**
 * The brief for the external AI. It carries the word set's REAL words, all six
 * translations and the exact modes the child can play, so the plan the AI returns
 * drops straight into this studio.
 */
export function buildLessonPrompt(o: LessonPromptOptions): string {
  const subtheme = getSubtheme(o.subthemeId);
  const theme = themeOfSubtheme(o.subthemeId);
  const words = subtheme ? wordsOf(subtheme) : [];
  const listed = words.map((w) => `${w.emoji} ${w.t.en} (${w.t[o.targetLang] ?? w.t.en})`).join(", ");
  const sampleIds = words.slice(0, 3).map((w) => w.id.split(":").pop() ?? w.id).join(", ");
  const chant = theme.chant.slice(0, 3).map((c) => c[o.targetLang] ?? c.en).join(" / ");

  return `You are a master early-years language teacher (like a Montessori / Jolly Phonics trainer) writing a full lesson plan a tutor will follow word-for-word on a video call.

## THE LESSON
- Word set: **${subtheme ? subtheme.t.en : o.subthemeId}** — inside the theme "${theme.t.en}".
- The words in this set: ${listed}
- The theme already has this chant the child knows: ${chant}
- The child is ${o.age} years old.
- The tutor speaks ${LANG_LABEL[o.tutorLang]} to the child and teaches ${LANG_LABEL[o.targetLang]}.
- The lesson must fill about **${o.minutes} minutes** and never sit still for more than 3 minutes on one activity.
- The child must SPEAK in almost every step. Screen-share friendly: everything happens out loud or with the child's own toys.
${o.notes?.trim() ? `- Tutor's own notes to respect: ${o.notes.trim()}\n` : ""}
## HOW TO WRITE IT
- ${o.stageNames.length} stages, one per heading: ${o.stageNames.join(" → ")}. You may rename them, but keep the same number and the same teaching arc (settle → present → chant → practise → talk → wrap up).
- Each stage has 2–5 steps. The "minutes" of every step in a stage should add up to roughly the time that stage deserves.
- Write "script" as the ACTUAL words the tutor says out loud (in ${LANG_LABEL[o.targetLang]}), short and natural. Put the answer you expect from the child in "expected". Put the teaching move — the gesture, the toy, the praise — in "action".
- Use "ccq" for a concept-check question ("Is this your nose?", "Do you like milk?") and put the correct answer in "expected".
- "action" is English and is always about a REAL object or movement: a mirror, a basket, a soft toy, a walk to the window, clapping, jumping. Never "ask the child to repeat" with nothing to do.
- Point the tutor at the studio's own modes where they fit: 🃏 Learn (big cards), 🧲 Match (drag word to picture), 🧺 Sort it (two baskets), 🎶 Chant (the theme's own chant), 💬 Talk time (question cards), 🎯 Quiz (listen and choose).
- Only use words from the set above plus function words the child already knows at this age.
- Safety: no scary, violent, medical or branded content; no food the child may be allergic to; nothing that needs a purchase.

## OUTPUT FORMAT — ONE JSON OBJECT, NOTHING ELSE
No markdown fences, no commentary. Exactly this shape:

${LESSON_SAMPLE}

Field rules:
- "subthemeId": exactly "${o.subthemeId}".
- "objectives": 3–5 one-sentence goals, written for the tutor.
- "materials": 3–6 things the tutor should have ready — household objects first, nothing expensive.
- "review": 3–5 items to run through at the very end (words or whole sentences).
- "vocab": the ids of the words you actually use — copy them exactly from the set list. These ids are the word's own id (e.g. ${sampleIds || "nose, hand"}), and a word you invent is discarded.
- "stages": the stages above. "title" is an object with all six languages (en, zh, fr, it, de, tr), "icon" one emoji, "color" a hex from this palette only: #f5c453, #7fb2de, #8fbe9b, #e86a8a, #b394d6, #35302a.
- "steps": each has "minutes" (1–3, whole numbers), and at least one of "script" (tutor's spoken words), "ccq" (a concept-check question) or "action" (the physical move). "expected" and "action" are welcome on every step.

## BEFORE YOU ANSWER, SILENTLY CHECK
1. The steps' minutes add up to about ${o.minutes}.
2. Every stage makes the child speak.
3. Every "vocab" id exists in the set list.
4. The JSON parses and has no trailing commas.
Then output ONLY the JSON object.`;
}

/* ═════════════════════════ JSON → LESSON PLAN ═════════════════════════ */

export interface ParsedLesson {
  subthemeId: string;
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
 * Validate and normalise a pasted lesson plan for one word set.
 *
 * The set is resolved against the LIVE dictionary, because a plan may be written
 * for a word set that was itself pasted in a moment ago.
 */
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
  if (!root) return { error: "The JSON must be an object with `subthemeId` and a `stages` array." };

  const warnings: string[] = [];
  const wanted = slug(str(root.subthemeId ?? root.unitId ?? root.themeId ?? root.topic));
  const sets = teachableSets();
  const ids = sets.map((s) => s.id);
  let subthemeId = wanted && ids.includes(wanted) ? wanted : "";
  if (!subthemeId) {
    const guess = ids.find((id) => id === wanted || id.includes(wanted) || wanted.includes(id));
    if (guess) {
      warnings.push(`Word set "${wanted}" is not in the dictionary — the plan was attached to "${guess}" instead.`);
      subthemeId = guess;
    } else {
      return { error: `Unknown word set "${str(root.subthemeId)}". The prompt prints the exact id to use.` };
    }
  }
  const subtheme = getSubtheme(subthemeId);
  const known = new Set((subtheme ? wordsOf(subtheme) : []).map((w) => w.id));

  const stagesRaw = asArray<unknown>(root.stages ?? root.sections ?? root.parts);
  if (!stagesRaw.length) return { error: "No `stages` array found — a lesson needs at least one stage with timed steps." };

  const stages: NonNullable<LessonOverride["stages"]> = [];
  let steps = 0;
  let minutes = 0;

  for (const [si, rawStage] of stagesRaw.slice(0, 10).entries()) {
    const sRaw = asRecord(rawStage);
    if (!sRaw) continue;
    const title = readTranslations(sRaw.title ?? sRaw.name ?? sRaw.stage, `Stage ${si + 1}`);
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

      // The AI sees ids like "nose"; the dictionary uses "self-body:nose". Accept
      // either, then keep only ids this word set really has.
      const rawIds = asArray<unknown>(stRaw.wordIds ?? stRaw.words ?? stRaw.vocab).map(str).filter(Boolean);
      const wordIds = rawIds.map((id) => resolveWordId(id, known)).filter((id): id is string => Boolean(id));
      if (wordIds.length) step.wordIds = [...new Set(wordIds)];

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
    source: "ai",
  };

  // Keep only words this set actually has, so a hallucinated word can never make
  // the plan highlight nothing. The AI sees ids like "nose" while the dictionary
  // prefixes them ("self-body:nose"), so a short id is resolved, not rejected.
  const rawVocab = asArray<unknown>(root.vocab ?? root.wordIds).map(str).filter(Boolean).slice(0, 60);
  if (rawVocab.length) {
    const kept: string[] = [];
    const unknown: string[] = [];
    for (const id of rawVocab) {
      const full = resolveWordId(id, known);
      if (full) kept.push(full);
      else unknown.push(id);
    }
    if (unknown.length) {
      warnings.push(`Ignored ${unknown.length} word id(s) this set does not have: ${unknown.slice(0, 6).join(", ")}.`);
    }
    override.vocab = kept.length ? [...new Set(kept)] : undefined;
  }

  if (minutes < 5) warnings.push(`The whole plan only adds up to ${minutes} minutes — a real lesson is 20–40.`);

  return { lesson: { subthemeId, override, warnings, stages: stages.length, steps, minutes } };
}

/* ─────────────────────────── saved lesson plans ─────────────────────────── */

const K_LESSONS = "bilibuddies.customLessons.v1";

export interface StoredLesson {
  subthemeId: string;
  title: string;
  installedAt: string;
  stages: number;
  steps: number;
  minutes: number;
  override: LessonOverride;
}

export function listLessonPlans(): StoredLesson[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(K_LESSONS);
    const rows = raw ? (JSON.parse(raw) as StoredLesson[]) : [];
    return Array.isArray(rows) ? rows.filter((l) => l && l.subthemeId && l.override) : [];
  } catch {
    return [];
  }
}

function writeLessons(rows: StoredLesson[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_LESSONS, JSON.stringify(rows));
  } catch {
    /* quota — the plan stays live for this session */
  }
}

/** Turn a pasted plan into the live lesson for its word set, and remember it. */
export function installLesson(parsed: ParsedLesson): void {
  const subtheme = getSubtheme(parsed.subthemeId);
  const stored: StoredLesson = {
    subthemeId: parsed.subthemeId,
    title: subtheme?.t.en ?? parsed.subthemeId,
    installedAt: new Date().toISOString(),
    stages: parsed.stages,
    steps: parsed.steps,
    minutes: parsed.minutes,
    override: parsed.override,
  };
  writeLessons([...listLessonPlans().filter((l) => l.subthemeId !== parsed.subthemeId), stored]);
  registerLesson(parsed.subthemeId, parsed.override);
}

/** Re-attach every pasted plan (called once on boot). */
export function reinstallSavedLessons(): number {
  const rows = listLessonPlans();
  for (const row of rows) registerLesson(row.subthemeId, row.override);
  return rows.length;
}

/** Drop a pasted plan: the set goes back to the plan BiliBuddies writes. */
export function removeLesson(subthemeId: string): void {
  writeLessons(listLessonPlans().filter((l) => l.subthemeId !== subthemeId));
  unregisterLesson(subthemeId);
}
