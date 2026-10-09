import { PHRASES } from "@/lib/data/phrases";
import { THEMES, UNITS, UNIT_MAP, THEME_MAP, WORD_MAP } from "@/lib/data";
import type { Kind, Lang, Theme, Unit, Word } from "@/lib/data/types";

/**
 * CREATE YOUR OWN CONTENT — the “copy an AI prompt, paste the JSON back” studio.
 *
 * Two things can be created, because ToyBox has two kinds of content:
 *
 *   1. A CATEGORY PACK — a theme with units and words. It lands in the word
 *      garden (searchable, illustrated, read aloud in six languages), in the
 *      lesson library, and in every studio that plays with a word list. The
 *      sixteen lessons the app builds per unit come along for free.
 *   2. A LESSON PLAN — a timed plan for one of the nine studios, with what the
 *      tutor says, the questions to ask, a note per step and its own words.
 *      It appears in the lesson library and in the studio’s lesson picker, and
 *      the plan shows up in the studio’s tutor guide.
 *
 * HOW A PASTED PACK STAYS ALIVE (the part that is easy to get wrong):
 *   · ToyBox is a STATIC export, so a page is rendered on the server at build
 *     time and again in the browser. `localStorage` does not exist while
 *     prerendering, so custom content can never be part of the first render —
 *     it is installed on mount, from `registerStoredPacks()`.
 *   · The catalogue (`THEMES`, `UNITS`, `WORD_MAP`, `UNIT_MAP`, `THEME_MAP`,
 *     `PHRASES`) is exported as mutable arrays/objects, so installing a pack
 *     grows the very same data the screens already read. `packVersion()` plus
 *     `subscribePacks()` let the screens re-render when that happens.
 *   · Imported theme and unit names are registered as real phrase rows, so a
 *     pasted pack is translated by the same `t()` call as the built-in six.
 *   · Nothing is stored as a prepared object graph: the RAW pasted JSON is kept
 *     and re-parsed on every boot, so a fixed or improved importer upgrades
 *     packs that were pasted before it.
 */

/* ───────────────────────────── shape of a pack ───────────────────────────── */

export const PACK_KINDS: Kind[] = [
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

/** The nine studios a lesson plan can be written for. */
export const STUDIO_IDS = [
  "sandbox",
  "monsters",
  "smoothies",
  "scavenger",
  "mirror",
  "charades",
  "train",
  "dollhouse",
  "dressing",
] as const;
export type StudioId = (typeof STUDIO_IDS)[number];

export const STUDIO_NAMES: Record<StudioId, string> = {
  sandbox: "The letter sandbox (tracing letters)",
  monsters: "Momo’s echo cave (listen, echo, say words)",
  smoothies: "Sound smoothies (blending sounds into words)",
  scavenger: "Little object hunters (find real objects)",
  mirror: "The feelings mirror (naming feelings)",
  charades: "Move like me (action words)",
  train: "The talking train (building sentences)",
  dollhouse: "Where’s Teddy? (in, on, under)",
  dressing: "Pip’s dressing room (clothes and colours)",
};

const LANGS: Lang[] = ["en", "zh", "fr", "it", "de", "tr"];
const LANG_NAMES: Record<Lang, string> = {
  en: "en (English)",
  zh: "zh (Simplified Chinese)",
  fr: "fr (French)",
  it: "it (Italian)",
  de: "de (German)",
  tr: "tr (Turkish)",
};
const LANGS_LINE = LANGS.map((l) => LANG_NAMES[l]).join(", ");

export type PackWord = {
  id: string;
  e: string;
  k: Kind;
  t: Record<Lang, string>;
  py?: string;
  hex?: string;
  sound?: string;
  ex?: string;
};

export type PackUnit = { id: string; name: Record<Lang, string>; icon: string; words: PackWord[] };

export type PackTheme = {
  id: string;
  name: Record<Lang, string>;
  icon: string;
  color: string;
  soft?: string;
  units: PackUnit[];
};

export type PackStep = {
  title: string;
  say: string;
  ask?: string[];
  tutor?: string;
  minutes?: number;
};

export type PackLesson = {
  id: string;
  game: StudioId;
  title: Record<Lang, string>;
  subtitle: string;
  theme: string;
  level?: "First steps" | "Growing voices";
  minutes?: number;
  words?: string[];
  newWords?: PackWord[];
  steps: PackStep[];
};

/* ─────────────────────────── the AI prompts ─────────────────────────── */

const THEME_EXAMPLE = {
  id: "space-adventure",
  icon: "🚀",
  color: "#8fa2cf",
  soft: "#e8ecf7",
  name: {
    en: "Space Adventure",
    zh: "太空探险",
    fr: "L'aventure spatiale",
    it: "Avventura nello spazio",
    de: "Weltraumabenteuer",
    tr: "Uzay Macerası",
  },
  units: [
    {
      id: "planets",
      icon: "🪐",
      name: { en: "Planets", zh: "行星", fr: "Les planètes", it: "I pianeti", de: "Die Planeten", tr: "Gezegenler" },
      words: [
        {
          id: "planet",
          e: "🪐",
          k: "thing",
          t: {
            en: "planet",
            zh: "行星",
            fr: "la planète",
            it: "il pianeta",
            de: "der Planet",
            tr: "gezegen",
          },
          py: "xíngxīng",
        },
      ],
    },
  ],
};

const LESSON_EXAMPLE = {
  id: "rocket-words",
  game: "monsters",
  theme: "space",
  level: "First steps",
  minutes: 7,
  title: {
    en: "Rocket Words",
    zh: "火箭单词",
    fr: "Les mots fusée",
    it: "Parole razzo",
    de: "Raketenwörter",
    tr: "Roket Kelimeler",
  },
  subtitle: "Listen, echo and say six space words together.",
  words: ["planet", "rocket"],
  newWords: [
    {
      id: "comet",
      e: "☄️",
      k: "thing",
      t: { en: "comet", zh: "彗星", fr: "la comète", it: "la cometa", de: "der Komet", tr: "kuyruklu yıldız" },
      py: "huìxīng",
    },
  ],
  steps: [
    {
      title: "Warm up",
      minutes: 1,
      say: "Hello, space explorer! Show me your rocket arms.",
      ask: ["Can you count down with me? Three, two, one!"],
      tutor: "Do the countdown together, then whisper it: the calm voice keeps attention.",
    },
    {
      title: "Say the words",
      minutes: 3,
      say: "Planet. Your turn: planet.",
      ask: ["Is a planet big or small?", "Can you point to the sky?"],
      tutor: "One word at a time. Leave five full seconds after each word.",
    },
  ],
};

export function buildThemePrompt(topic: string) {
  return `You are an expert designer of bilingual early-language material for children aged 3–6 (the Tutorly ToyBox app).

Create ONE complete CATEGORY PACK (a theme with units and words) about: "${topic || "YOUR TOPIC HERE"}".

Return ONLY valid JSON — no markdown fences, no comments, no explanation — exactly matching this schema:

${JSON.stringify(THEME_EXAMPLE, null, 2)}

Rules:
1. "id": lower-case letters and dashes only, unique (e.g. "space", "under-the-sea").
2. "icon": exactly ONE emoji that pictures the theme.
3. "color": a soft pastel hex colour; "soft" an even lighter version of it for backgrounds.
4. "name": the theme title in ALL SIX languages: ${LANGS_LINE}.
5. "units": 4 to 6 units. Each unit needs "id" (lower-case, dashes), ONE "icon" emoji, a translated "name" in all six languages, and 8 to 12 "words".
6. Every word needs:
   - "id": lower-case letters, digits and dashes, unique across the WHOLE pack (e.g. "planet", "space-suit").
   - "e": exactly ONE emoji that clearly shows the word. It is rendered as artwork, so it must be an emoji, never a picture URL or text.
   - "k": one of ${PACK_KINDS.join(", ")} (use "thing" when unsure).
   - "t": the word in all six languages: ${LANGS_LINE}. For Chinese, include the measure word where a child would hear it, and add "py" with the pinyin (no tone marks needed, e.g. "xingxing").
   - For German, French and Italian nouns, include the article a child hears ("der Planet", "la planète", "il pianeta").
7. Words must be concrete, safe, and answerable by a 3–6 year old. No scary or violent content, no brand names, no living people.
8. Do not reuse an "id" that already exists in a common children's dictionary (dog, cat, apple, red, one, ball…): this pack adds to a dictionary that already has those. Give every word in this pack a new, specific id.
9. Output nothing except the JSON object.`;
}

export function buildLessonPrompt(opts: { game?: string; topic?: string; theme?: string; words?: string } = {}) {
  const studio = (opts.game && opts.game in STUDIO_NAMES ? opts.game : "monsters") as StudioId;
  return `You are an expert tutor of bilingual early-language lessons for children aged 3–6 (the Tutorly ToyBox app).

Write ONE ready-to-teach LESSON PLAN about "${opts.topic || "YOUR TOPIC HERE"}"
for this studio: "${studio}" — ${STUDIO_NAMES[studio]}.
${opts.theme ? `The lesson belongs to the packed theme id "${opts.theme}".` : ""}${opts.words ? `The words available are: ${opts.words}.` : ""}

Return ONLY valid JSON — no markdown fences, no comments, no explanation — exactly matching this schema:

${JSON.stringify(LESSON_EXAMPLE, null, 2)}

Rules:
1. "game": exactly one of ${STUDIO_IDS.join(", ")}. Choose the studio the plan is really for; "${studio}" is the expected one.
2. "title": a short, friendly title — not a subject name. In all six languages: ${LANGS_LINE}.
3. "subtitle": ONE short English sentence describing what the child will do.
4. "level": "First steps" or "Growing voices". "minutes": a realistic total for ages 3–6, between 4 and 9.
5. "steps": 4 to 6 steps, in teaching order, that add up to "minutes". Every step needs:
   - "title": 2–3 words (Warm up, Say the words, Play, Wrap up).
   - "minutes": a whole number of minutes.
   - "say": the exact words the tutor says to the child — short, warm, spoken language, with the target word in it.
   - "ask": 1 to 3 concept-check questions a tutor asks a 3–6 year old ("Is it big or small?", "Can you say it?", "What colour is it?").
   - "tutor": one practical tip for the adult.
6. "words": ids of words used. If you need a word that may not exist yet, put it in "newWords" with the full word shape and the same rules as a word in a category pack (id, ONE emoji "e", "k" kind, "t" translations, optional "py" pinyin).
7. Everything must be simple, kind, positive and safe: no scores, no pressure, no scary content, no more than 12 words in a sentence.
8. Output nothing except the JSON object.`;
}

/* ─────────────────────────────── parsing ─────────────────────────────── */

export type InstallResult =
  | { ok: true; summary: string; warnings: string[] }
  | { ok: false; error: string };

const slug = (v: unknown, fallback: string) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Read the translations of a name/word, filling anything missing with English. */
function readI18n(value: unknown, warnings: string[], label: string): Record<Lang, string> | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const en = str(row.en);
  if (!en) return null;
  const out = { en } as Record<Lang, string>;
  for (const lang of LANGS) {
    if (lang === "en") continue;
    const text = str(row[lang]);
    if (text) out[lang] = text;
    else {
      out[lang] = en;
      warnings.push(`${label}: no ${lang} text, using English.`);
    }
  }
  return out;
}

function readWord(raw: unknown, warnings: string[], seen: Set<string>): PackWord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = slug(row.id, "");
  if (!id) return null;
  if (seen.has(id)) {
    warnings.push(`word "${id}" appears twice — the second copy was skipped.`);
    return null;
  }
  const t = readI18n(row.t ?? row, warnings, `word "${id}"`);
  if (!t) {
    warnings.push(`word "${id}" has no translations and was skipped.`);
    return null;
  }
  const kind = PACK_KINDS.includes(row.k as Kind) ? (row.k as Kind) : "thing";
  if (kind !== row.k && row.k) warnings.push(`word "${id}": unknown kind "${String(row.k)}", using "thing".`);
  seen.add(id);
  return {
    id,
    e: str(row.e) || "❔",
    k: kind,
    t,
    py: str(row.py) || undefined,
    hex: /^#[0-9a-f]{3,8}$/i.test(str(row.hex)) ? str(row.hex) : undefined,
    sound: str(row.sound) || undefined,
    ex: str(row.ex) || undefined,
  };
}

/** Strip a ```json fence and parse. */
function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

export function parseThemePack(text: string): { pack?: PackTheme; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch (e) {
    return { warnings, error: `That is not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== "object") return { warnings, error: "The JSON must be an object." };
  const row = raw as Record<string, unknown>;
  // Be forgiving: some models wrap the pack in {"theme": {...}} or a one-item array.
  const inner = Array.isArray(raw) ? raw[0] : (row.theme as unknown) ?? row.pack ?? row;
  if (!inner || typeof inner !== "object") return { warnings, error: "No theme object found in the JSON." };
  const packRow = inner as Record<string, unknown>;

  const id = slug(packRow.id, "");
  if (!id) return { warnings, error: 'The pack needs an "id" (lower-case letters and dashes).' };
  const name = readI18n(packRow.name ?? packRow.title, warnings, "theme name");
  if (!name) return { warnings, error: 'The pack needs a "name" with at least "en".' };

  const rawUnits = Array.isArray(packRow.units) ? packRow.units : [];
  if (!rawUnits.length) return { warnings, error: 'The pack needs a "units" array with at least one unit.' };

  const usedWords = new Set<string>();
  const units: PackUnit[] = [];
  rawUnits.forEach((rawUnit, i) => {
    if (!rawUnit || typeof rawUnit !== "object") return;
    const u = rawUnit as Record<string, unknown>;
    const unitId = slug(u.id, `unit-${i + 1}`);
    const unitName = readI18n(u.name ?? u.title, warnings, `unit "${unitId}"`);
    if (!unitName) {
      warnings.push(`unit "${unitId}" has no name and was skipped.`);
      return;
    }
    const words = (Array.isArray(u.words) ? u.words : [])
      .map((word) => readWord(word, warnings, usedWords))
      .filter((w): w is PackWord => Boolean(w));
    if (!words.length) {
      warnings.push(`unit "${unitId}" has no usable words and was skipped.`);
      return;
    }
    units.push({ id: unitId, name: unitName, icon: str(u.icon) || "⭐", words });
  });

  if (!units.length) return { warnings, error: "No unit in the pack had usable words." };

  return {
    warnings,
    pack: {
      id,
      name,
      icon: str(packRow.icon) || "⭐",
      color: /^#[0-9a-f]{3,8}$/i.test(str(packRow.color)) ? str(packRow.color) : "#9aa9bd",
      soft: /^#[0-9a-f]{3,8}$/i.test(str(packRow.soft)) ? str(packRow.soft) : undefined,
      units,
    },
  };
}

export function parseLessonPack(text: string): { pack?: PackLesson; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch (e) {
    return { warnings, error: `That is not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== "object") return { warnings, error: "The JSON must be an object." };
  const row = raw as Record<string, unknown>;
  const inner = Array.isArray(raw) ? raw[0] : (row.lesson as unknown) ?? row.plan ?? row;
  if (!inner || typeof inner !== "object") return { warnings, error: "No lesson object found in the JSON." };
  const l = inner as Record<string, unknown>;

  const id = slug(l.id, "");
  if (!id) return { warnings, error: 'The lesson needs an "id" (lower-case letters and dashes).' };
  const title = readI18n(l.title ?? l.name, warnings, "lesson title");
  if (!title) return { warnings, error: 'The lesson needs a "title" with at least "en".' };

  const game = (STUDIO_IDS as readonly string[]).includes(str(l.game)) ? (str(l.game) as StudioId) : null;
  if (!game)
    return {
      warnings,
      error: `"game" must be one of ${STUDIO_IDS.join(", ")}${l.game ? ` (got "${String(l.game)}")` : ""}.`,
    };

  const rawSteps = Array.isArray(l.steps) ? l.steps : [];
  const steps: PackStep[] = rawSteps
    .map((rawStep): PackStep | null => {
      if (!rawStep || typeof rawStep !== "object") return null;
      const s = rawStep as Record<string, unknown>;
      const say = str(s.say);
      const stepTitle = str(s.title) || "Step";
      if (!say) {
        warnings.push(`step "${stepTitle}" has nothing to say and was skipped.`);
        return null;
      }
      const ask = (Array.isArray(s.ask) ? s.ask : []).map(str).filter(Boolean).slice(0, 4);
      const minutes = Number(s.minutes);
      return {
        title: stepTitle,
        say,
        ask: ask.length ? ask : undefined,
        tutor: str(s.tutor) || undefined,
        minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined,
      };
    })
    .filter((s): s is PackStep => Boolean(s));
  if (!steps.length) return { warnings, error: 'The lesson needs a "steps" array with at least one step that has "say".' };

  const seenNew = new Set<string>();
  const newWords = (Array.isArray(l.newWords) ? l.newWords : [])
    .map((word) => readWord(word, warnings, seenNew))
    .filter((w): w is PackWord => Boolean(w));

  const level = l.level === "Growing voices" ? "Growing voices" : "First steps";
  const totalFromSteps = steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const minutes = Number(l.minutes);

  return {
    warnings,
    pack: {
      id,
      game,
      title,
      subtitle: str(l.subtitle) || "A little plan made just for your learner.",
      theme: slug(l.theme, "custom"),
      level,
      minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : totalFromSteps || 6,
      words: (Array.isArray(l.words) ? l.words : []).map((w) => slug(w, "")).filter(Boolean),
      newWords: newWords.length ? newWords : undefined,
      steps,
    },
  };
}

/* ─────────────────────────── the live registry ─────────────────────────── */

const STORE_KEY = "toybox.customPacks.v1";

type StoredPacks = { themes: unknown[]; lessons: unknown[] };

/**
 * The ids that existed before anything was imported.
 *
 * A pasted pack must not be able to take one of these over: replacing the
 * built-in "nature" theme with a five-word demo would be silent data loss in
 * the tutor's dictionary, and deleting the pack afterwards would then delete the
 * built-in with it. Imports are refused (with an explanation) instead.
 */
const BUILTIN_THEME_IDS = new Set<string>();
const BUILTIN_UNIT_IDS = new Set<string>();
function snapshotBuiltins() {
  if (BUILTIN_THEME_IDS.size) return;
  for (const theme of THEMES) BUILTIN_THEME_IDS.add(theme.id);
  for (const unit of UNITS) BUILTIN_UNIT_IDS.add(unit.id);
}

const installedThemes = new Map<string, Theme>();
const installedLessons = new Map<string, PackLesson>();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((fn) => fn());
}

export function packVersion() {
  return version;
}

export function subscribePacks(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The custom themes currently installed (already part of the catalogue). */
export function customThemePacks(): Theme[] {
  return [...installedThemes.values()];
}

/** The custom lesson plans currently installed. */
export function customLessonPacks(): PackLesson[] {
  return [...installedLessons.values()];
}

function registerPhrase(key: string, row: Record<Lang, string>) {
  PHRASES[key] = { en: row.en, zh: row.zh, fr: row.fr, it: row.it, de: row.de, tr: row.tr };
}

function phraseKey(themeId: string, unitId?: string) {
  return unitId ? `custom.${themeId}.${unitId}` : `custom.${themeId}`;
}

/** The phrase key an imported lesson's localised title is registered under. */
export function lessonPhraseKey(lessonId: string) {
  return `custom.lesson.${lessonId}`;
}

/** Translate a pack theme into the catalogue's own Theme shape. */
function toTheme(pack: PackTheme): Theme {
  const units: Unit[] = pack.units.map((unit) => {
    registerPhrase(phraseKey(pack.id, unit.id), unit.name);
    return {
      id: unit.id,
      name: phraseKey(pack.id, unit.id),
      icon: unit.icon,
      words: unit.words as Word[],
    };
  });
  registerPhrase(phraseKey(pack.id), pack.name);
  return {
    id: pack.id,
    name: phraseKey(pack.id),
    icon: pack.icon,
    color: pack.color,
    soft: pack.soft ?? pack.color,
    // No chant is authored for an imported theme, so the chant screen keeps the
    // built-in one (`CHANT_MAP[...] ?? CHANT_MAP.me`). The sentence frame stays
    // the general “I can see …”, which fits any word a pack adds.
    chantId: pack.id,
    frame: "frame.iCanSee",
    units,
  };
}

/** Add a theme pack to the live catalogue. Safe to call twice. */
export function installThemePack(pack: PackTheme): string[] {
  const warnings: string[] = [];
  snapshotBuiltins();
  const theme = toTheme(pack);
  if (!installedThemes.has(pack.id)) {
    installedThemes.set(pack.id, theme);
    THEMES.push(theme);
  } else {
    // Re-import: replace the units of the same theme in place.
    const at = THEMES.findIndex((t) => t.id === theme.id);
    if (at >= 0) THEMES[at] = theme;
    installedThemes.set(pack.id, theme);
  }
  THEME_MAP[theme.id] = theme;
  for (const unit of theme.units) {
    // A built-in unit with this id is never replaced. The imported unit keeps all
    // of its words, under a namespaced id, so a pack can never quietly rewrite
    // "pets" or "weather" for every other theme that points at it.
    let unitId = unit.id;
    if (BUILTIN_UNIT_IDS.has(unit.id)) {
      const originalKey = phraseKey(theme.id, unit.id);
      const row = PHRASES[originalKey];
      unitId = `${theme.id}-${unit.id}`;
      warnings.push(promptClash(unit.id, unitId));
      unit.id = unitId;
      unit.name = phraseKey(theme.id, unitId);
      if (row) registerPhrase(unit.name, row);
      delete PHRASES[originalKey];
    }
    const existing = UNITS.findIndex((u) => u.id === unitId);
    if (existing >= 0) UNITS[existing] = unit;
    else UNITS.push(unit);
    UNIT_MAP[unitId] = unit;
    for (const word of unit.words) {
      if (WORD_MAP[word.id]) {
        warnings.push(`“${word.t.en}” is already in the dictionary — the built-in word was kept.`);
        continue;
      }
      WORD_MAP[word.id] = word;
    }
  }
  return warnings;
}

/** The message a tutor reads when an imported unit id collides with a built-in one. */
function promptClash(taken: string, renamed: string) {
  return `The unit “${taken}” already exists in ToyBox, so this one was added as “${renamed}”.`;
}

/** Remove an imported theme from the live catalogue. */
export function removeThemePack(themeId: string) {
  const theme = installedThemes.get(themeId);
  if (!theme) return;
  installedThemes.delete(themeId);
  const at = THEMES.findIndex((t) => t.id === themeId);
  if (at >= 0) THEMES.splice(at, 1);
  delete THEME_MAP[themeId];
  for (const unit of theme.units) {
    const ui = UNITS.findIndex((u) => u.id === unit.id);
    if (ui >= 0) UNITS.splice(ui, 1);
    delete UNIT_MAP[unit.id];
    for (const word of unit.words) {
      // Only drop words this pack introduced (a built-in id was never overwritten).
      const stillUsed = UNITS.some((u) => u.words.some((w) => w.id === word.id));
      if (!stillUsed) delete WORD_MAP[word.id];
    }
  }
  delete PHRASES[phraseKey(themeId)];
  const store = readStore();
  writeStore({ themes: store.themes.filter((t) => (t as PackTheme)?.id !== themeId), lessons: store.lessons });
  notify();
}

/** Add a lesson plan's own words, so it can stand on its own. */
export function installLessonWords(words: PackWord[] | undefined) {
  for (const word of words ?? []) if (!WORD_MAP[word.id]) WORD_MAP[word.id] = word as Word;
}

export function installLessonPack(pack: PackLesson): string[] {
  const warnings: string[] = [];
  // Re-importing the same id replaces the stored plan rather than duplicating it.
  installedLessons.set(pack.id, pack);
  // The plan's title is registered as a phrase row so the catalogue can show it
  // in whichever language the tutor picked, like every built-in lesson title.
  registerPhrase(lessonPhraseKey(pack.id), pack.title);
  const missing = (pack.words ?? []).filter(
    (id) => !WORD_MAP[id] && !(pack.newWords ?? []).some((w) => w.id === id),
  );
  if (missing.length) warnings.push(`Words not in the dictionary (they will show a friendly stand-in): ${missing.join(", ")}.`);
  installLessonWords(pack.newWords);
  notify();
  return warnings;
}

export function removeLessonPack(lessonId: string) {
  if (!installedLessons.delete(lessonId)) return;
  delete PHRASES[lessonPhraseKey(lessonId)];
  const store = readStore();
  writeStore({ themes: store.themes, lessons: store.lessons.filter((l) => (l as PackLesson)?.id !== lessonId) });
  notify();
}

/* ───────────────────────────── persistence ───────────────────────────── */

function readStore(): StoredPacks {
  if (typeof window === "undefined") return { themes: [], lessons: [] };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { themes: [], lessons: [] };
    const parsed = JSON.parse(raw) as Partial<StoredPacks>;
    return {
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    };
  } catch {
    return { themes: [], lessons: [] };
  }
}

function writeStore(next: StoredPacks) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    /* Private mode or full quota: the pack still works for this session. */
  }
}

let registered = false;

/**
 * Re-install every stored pack. Called once on mount by the shell — a static
 * export renders on the server first, where storage does not exist, so this is
 * the only correct place to bring custom content back to life.
 */
export function registerStoredPacks() {
  if (registered || typeof window === "undefined") return;
  registered = true;
  const store = readStore();
  let changed = false;
  for (const raw of store.themes) {
    const { pack, error } = parseThemePack(typeof raw === "string" ? raw : JSON.stringify(raw));
    if (pack) {
      installThemePack(pack);
      changed = true;
    } else {
      console.warn("[toybox] stored theme pack could not be read:", error);
    }
  }
  for (const raw of store.lessons) {
    const { pack, error } = parseLessonPack(typeof raw === "string" ? raw : JSON.stringify(raw));
    if (pack) {
      installLessonPack(pack);
      changed = true;
    } else {
      console.warn("[toybox] stored lesson plan could not be read:", error);
    }
  }
  if (changed) notify();
}

/** Paste-and-install, the whole flow the studio screen uses. */
export function addThemePackFromText(text: string): InstallResult {
  const { pack, warnings, error } = parseThemePack(text);
  if (!pack) return { ok: false, error: error ?? "The pack could not be read." };
  snapshotBuiltins();
  // Refuse to shadow a built-in category: it would replace the tutor's existing
  // theme, and deleting the pack afterwards would delete the built-in too.
  if (BUILTIN_THEME_IDS.has(pack.id)) {
    return {
      ok: false,
      error: `ToyBox already has a category with the id “${pack.id}”. Ask the AI for a new id — for example “${pack.id}-fun” — and paste it again.`,
    };
  }
  const extra = installThemePack(pack);
  const store = readStore();
  writeStore({ themes: [...store.themes.filter((t) => (t as PackTheme)?.id !== pack.id), pack], lessons: store.lessons });
  notify();
  const words = pack.units.reduce((n, u) => n + u.words.length, 0);
  return {
    ok: true,
    summary: `Added “${pack.name.en}” — ${pack.units.length} ${pack.units.length === 1 ? "unit" : "units"}, ${words} words. Find it in the word garden and the lesson library.`,
    warnings: [...warnings, ...extra],
  };
}

export function addLessonPackFromText(text: string): InstallResult {
  const { pack, warnings, error } = parseLessonPack(text);
  if (!pack) return { ok: false, error: error ?? "The plan could not be read." };
  const extra = installLessonPack(pack);
  const store = readStore();
  writeStore({ themes: store.themes, lessons: [...store.lessons.filter((l) => (l as PackLesson)?.id !== pack.id), pack] });
  notify();
  return {
    ok: true,
    summary: `Added the plan “${pack.title.en}” for ${pack.steps.length} steps (${pack.minutes} min). Open it from the lesson library or the studio’s lesson list.`,
    warnings: [...warnings, ...extra],
  };
}

/** Example JSON for the “Load an example” buttons. */
export const EXAMPLE_THEME = JSON.stringify(THEME_EXAMPLE, null, 2);
export const EXAMPLE_LESSON = JSON.stringify(LESSON_EXAMPLE, null, 2);
