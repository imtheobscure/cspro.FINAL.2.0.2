import type { SupportedLanguage } from '@/types/theme';
import { buildLesson, hasBanks, registerBank, unregisterBank, type Lesson } from '@/data/lessonEngine';
import { findTheme, isBuiltInTheme, registerTheme, removeTheme, allThemes } from '@/data/themesMaster';

/**
 * THE TWO THINGS A TUTOR CAN PASTE IN
 *
 * 1. A **category** — a whole new theme with words (`installThemePack`). The
 *    theme shows up in the lesson library and behaves like a built-in one:
 *    its words go through the same sentence, chant and question builders.
 * 2. A **lesson plan** — a timed, tutor-ready plan for a theme that is already
 *    in the library (`installLessonPlan`). Scripts, concept-check questions,
 *    what to expect back, and which of the app's own games to play next.
 *
 * Both are stored in this browser (there is no server — the app is a static
 * export), namespaced under `talkquest.`, and re-registered on boot by
 * `registerStoredContent()`. That boot step is not optional: installing only
 * touches memory, so without it a reload silently falls back to the plan the
 * app writes itself.
 *
 * Two rules the parsers follow, learned the hard way in the sibling games:
 * a pasted pack may never take over a built-in theme id (that would look like
 * the library ate a topic), and a plan may never keep a word id the theme does
 * not have (an AI answers "apple" for a theme whose word is "Apple"), so unknown
 * ids are dropped and *reported* rather than silently highlighted as nothing.
 */

export const LANGS: SupportedLanguage[] = ['en', 'zh', 'fr', 'it', 'de', 'tr', 'fa'];

const LANG_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: 'Chinese (Mandarin)',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  tr: 'Turkish',
  fa: 'Farsi / Persian',
};

const LANG_LIST = LANGS.map((l) => `${l} (${LANG_NAMES[l]})`).join(', ');

export type PackWord = {
  english: string;
  emoji: string;
  tr: Record<SupportedLanguage, string>;
  sentence?: string;
  chant?: string;
  fact?: string;
};

export type PackTheme = {
  slug: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  objective?: string;
  warmUp?: string;
  words: PackWord[];
};

export type PlanStep = {
  title: string;
  minutes?: number;
  say: string;
  ask?: string[];
  tutor?: string;
  /** A screen or game in this app the tutor can jump to. */
  activity?: string;
};

export type LessonPlan = {
  slug: string;
  title: string;
  minutes: number;
  objective?: string;
  materials?: string[];
  words: string[];
  steps: PlanStep[];
  /** 'app' = written by the game from its own material, 'ai' = pasted in. */
  source: 'app' | 'ai';
};

/** The games the app can hand a plan's practice step to. */
export const PLAN_GAMES: { id: string; name: string; blurb: string }[] = [
  { id: 'whispering-wall', name: 'Whispering Wall', blurb: 'whisper a secret password to open the door' },
  { id: 'alien-cafe', name: 'Alien Café', blurb: 'repeat an alien order, then build the tray' },
  { id: 'parrot-partner', name: 'Parrot Partner', blurb: 'remember a message, rebuild it after the flight' },
  { id: 'detective-clue', name: 'Detective Office', blurb: 'ask three polite questions and find the culprit' },
  { id: 'animal-rescue', name: 'Animal Rescue', blurb: 'say the direction and guide the bear home' },
  { id: 'time-traveler', name: 'Time Traveller', blurb: 'explain today to someone from long ago' },
  { id: 'monster-babysitter', name: 'Monster Babysitter', blurb: 'use kind words to calm a crying monster' },
  { id: 'magic-mirror', name: 'Magic Mirror', blurb: 'heal a cracked mirror with kind adjectives' },
  { id: 'lost-and-found', name: 'Lost and Found', blurb: 'describe a lost toy so it can be found' },
  { id: 'robot-upgrade', name: 'Robot Upgrade', blurb: 'interview a robot and choose its new voice' },
];

/* ─────────────────────────────── the prompts ─────────────────────────────── */

const THEME_EXAMPLE = {
  slug: 'tiny-garden-bugs',
  name: 'Tiny Garden Bugs',
  icon: '🐌',
  category: 'Nature & Science',
  color: '#7d9163',
  objective: 'We will learn 8 words about tiny garden bugs and say each one in a sentence.',
  warmUp: 'Hello! Today we look for tiny bugs. Clap two times and say: I am ready!',
  words: [
    {
      english: 'Snail',
      emoji: '🐌',
      tr: { en: 'Snail', zh: '蜗牛', fr: 'Escargot', it: 'Lumaca', de: 'Schnecke', tr: 'Salyangoz', fa: 'حلزون' },
      sentence: 'The snail is very slow.',
      chant: 'Slow snail, slow snail, carry your house!',
      fact: 'A snail carries its house on its back.',
    },
    {
      english: 'Ant',
      emoji: '🐜',
      tr: { en: 'Ant', zh: '蚂蚁', fr: 'Fourmi', it: 'Formica', de: 'Ameise', tr: 'Karınca', fa: 'مورچه' },
      sentence: 'The ant is tiny and strong.',
      chant: 'Ant, ant, march in a line!',
      fact: 'Ants live together in a big family.',
    },
  ],
};

const PLAN_EXAMPLE = {
  slug: 'my-body',
  title: 'Hello, My Body!',
  minutes: 18,
  objective: 'The child can name six body words and use two of them in a sentence.',
  materials: ['A mirror', 'The word cards on screen'],
  words: ['Head', 'Hair', 'Eye', 'Ear', 'Nose', 'Mouth'],
  steps: [
    {
      title: 'Warm up',
      minutes: 2,
      say: 'Hello! Touch your head. Now touch your nose. Good!',
      ask: ['Can you find your nose?', 'Is your nose big or small?'],
      tutor: 'Copy every action yourself. Say the word twice, slowly.',
      activity: 'lesson:warmup',
    },
    {
      title: 'Say the words',
      minutes: 5,
      say: 'Eye. Your turn: eye. Ear. Your turn: ear.',
      ask: ['How many eyes do you have?', 'Can you close your eyes?'],
      tutor: 'Wait five seconds after each word. Do not fill the silence.',
      activity: 'lesson:vocab',
    },
    {
      title: 'Check and play',
      minutes: 6,
      say: 'Now the mirror game. Say: this is my mouth.',
      ask: ['Is this your mouth? Say yes or no.'],
      tutor: 'If the child says one word, smile and ask for the whole sentence.',
      activity: 'game:magic-mirror',
    },
    {
      title: 'Talk together',
      minutes: 4,
      say: 'Tell me about your face. What do you do with your eyes?',
      ask: ['What do you do with your ears?'],
      tutor: 'Let the child talk more than you do.',
      activity: 'lesson:speak',
    },
    {
      title: 'Bye bye',
      minutes: 1,
      say: 'Well done! Say bye bye, nose. Bye bye, eye.',
      ask: ['Which word was your favourite?'],
      tutor: 'Finish on a win, every time.',
    },
  ],
};

export function buildThemePrompt(topic: string) {
  return `You are an expert designer of bilingual picture lessons for children aged 5 to 12 (the Tutorly TalkQuest app). A tutor teaches one child online and shares this screen.

Create ONE new CATEGORY about: "${topic || 'YOUR TOPIC HERE'}".

Return ONLY valid JSON. No markdown fences, no comments, no text before or after. Use exactly this shape:

${JSON.stringify(THEME_EXAMPLE, null, 2)}

Rules:
1. "slug": lower-case letters and dashes only, 2 to 4 words, like "tiny-garden-bugs".
2. Words: 8 to 12 words. Every word is a thing, a person, an animal, a place or an action a child can point at, act out or answer a yes/no question about. No abstract ideas, nothing scary, no brand names, no real people.
3. "emoji": exactly ONE emoji for the word.
4. "tr": the word in all seven languages: ${LANG_LIST}. For Chinese add the everyday word a child hears. Keep every language short.
5. "sentence": ONE short sentence a six-year-old can repeat, 4 to 8 words, and it must contain the English word.
6. "chant": one line to clap or sing it, 4 to 8 words.
7. "fact": one true, simple line about the word, 5 to 9 words.
8. Language level: only words a six-year-old says out loud. No "utilise", no "observe", no "consume". Say "eat", "look", "use".
9. "warmUp": one friendly hello line with an action in it.
10. Output nothing except the JSON object.`;
}

export function buildLessonPlanPrompt(slug: string) {
  const theme = findTheme(slug);
  const words = wordList(slug);
  const minutes = lessonMinutes(slug);
  const name = theme?.name ?? slug;
  const games = PLAN_GAMES.map((g) => `"game:${g.id}" (${g.name} — ${g.blurb})`).join('\n  ');

  return `You are an expert online tutor of bilingual lessons for children aged 5 to 12 (the Tutorly TalkQuest app). Write ONE ready-to-teach LESSON PLAN.

Topic: "${name}" (the app's id for it is exactly ${slug})
The words the app already has for this topic: ${words.length ? words.join(', ') : '(none yet — keep the plan to warm up, talk and play)'}
A full lesson in this app runs about ${minutes} minutes.

Return ONLY valid JSON. No markdown fences, no comments, no text before or after. Use exactly this shape:

${JSON.stringify(PLAN_EXAMPLE, null, 2)}

Rules:
1. "slug": exactly ${slug} — the plan belongs to that topic, so the app can attach it.
2. "title": a friendly title a child would smile at, not a subject name.
3. "minutes": a realistic total for this age, between 10 and ${Math.max(30, minutes)}.
4. "objective": ONE short sentence starting "The child can …".
5. "materials": 1 to 3 short items the tutor needs.
6. "words": only words from the list above, spelled exactly as written there. If a word you want is not in the list, leave it out.
7. "steps": 4 to 7 steps in teaching order, adding up to "minutes". Every step needs:
   - "title": 2 to 3 words (Warm up, Say the words, Play, Talk together, Bye bye).
   - "minutes": a whole number.
   - "say": the exact words the tutor says out loud. 4 to 9 words per sentence. Warm and spoken, with the target word in it.
   - "ask": 1 to 3 concept-check questions a tutor asks a 5 to 12 year old. Two answers must be possible, so never ask a question with only one.
   - "tutor": one practical tip for the adult.
   - "activity": OPTIONAL. One of the app's own screens, or one of its speaking games:
  "lesson:warmup", "lesson:vocab", "lesson:ccq", "lesson:quiz", "lesson:story", "lesson:speak",
  ${games}
8. Language level: only words a six-year-old says out loud. Short sentences. Kind and positive — no scores, no pressure, nothing scary.
9. Output nothing except the JSON object.`;
}

/* ─────────────────────────────── parsing ─────────────────────────────── */

export type InstallResult =
  | { ok: true; summary: string; warnings: string[]; slug?: string }
  | { ok: false; error: string };

const slugify = (v: unknown, fallback = '') =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function parseJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

function readTranslations(value: unknown, english: string, warnings: string[], label: string): Record<SupportedLanguage, string> {
  const row = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const out = { en: str(row.en) || english } as Record<SupportedLanguage, string>;
  const missing: string[] = [];
  for (const lang of LANGS) {
    if (lang === 'en') continue;
    const text = str(row[lang]);
    if (text) out[lang] = text;
    else {
      out[lang] = out.en;
      missing.push(lang);
    }
  }
  if (missing.length) warnings.push(`${label}: no ${missing.join('/')} translation — English is shown instead.`);
  return out;
}

export function parseThemePack(text: string): { pack?: PackTheme; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch (e) {
    return { warnings, error: `That is not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object') return { warnings, error: 'The JSON must be an object.' };
  const row = raw as Record<string, unknown>;
  // Some models wrap the pack in {"theme": {...}} or hand back a one-item array.
  const inner = (Array.isArray(raw) ? raw[0] : (row.theme as unknown) ?? row.pack ?? row) as Record<string, unknown>;
  if (!inner || typeof inner !== 'object') return { warnings, error: 'No category found inside the JSON.' };

  const slug = slugify(inner.slug ?? inner.id);
  if (!slug) return { warnings, error: 'The category needs a "slug" like "tiny-garden-bugs".' };
  if (isBuiltInTheme(slug)) {
    return {
      warnings,
      error: `"${slug}" is a category the app already has, so pasting would replace it. Give your category a different slug (for example "${slug}-2").`,
    };
  }
  const name = str(inner.name ?? inner.title);
  if (!name) return { warnings, error: 'The category needs a "name".' };

  const rawWords = Array.isArray(inner.words) ? inner.words : [];
  if (!rawWords.length) return { warnings, error: 'The category needs a "words" array.' };

  const seen = new Set<string>();
  const words: PackWord[] = [];
  rawWords.forEach((rawWord, i) => {
    if (!rawWord || typeof rawWord !== 'object') return;
    const w = rawWord as Record<string, unknown>;
    // A pipe would break the row format the lesson engine reads, so it goes now.
    const english = str(w.english ?? w.word).replace(/\|/g, '/');
    if (!english) {
      warnings.push(`word ${i + 1} has no "english" spelling and was skipped.`);
      return;
    }
    const key = english.toLowerCase();
    if (seen.has(key)) {
      warnings.push(`"${english}" appears twice — the second copy was skipped.`);
      return;
    }
    seen.add(key);
    words.push({
      english,
      emoji: str(w.emoji) || '⭐',
      tr: readTranslations(w.tr ?? w.translations, english, warnings, `"${english}"`),
      sentence: str(w.sentence).replace(/\s+/g, ' ') || undefined,
      chant: str(w.chant).replace(/\s+/g, ' ') || undefined,
      fact: str(w.fact).replace(/\s+/g, ' ') || undefined,
    });
  });
  if (!words.length) return { warnings, error: 'No word in the category was usable.' };
  if (words.length < 4) warnings.push(`Only ${words.length} words — a lesson usually has 8 or more.`);

  return {
    warnings,
    pack: {
      slug,
      name,
      icon: str(inner.icon) || '🌟',
      category: str(inner.category) || 'Custom',
      color: /^#[0-9a-f]{3,8}$/i.test(str(inner.color)) ? str(inner.color) : '#6b7a9d',
      objective: str(inner.objective) || undefined,
      warmUp: str(inner.warmUp) || undefined,
      words,
    },
  };
}

export function parseLessonPlan(text: string, expectedSlug?: string): { plan?: LessonPlan; warnings: string[]; error?: string } {
  const warnings: string[] = [];
  let raw: unknown;
  try {
    raw = parseJson(text);
  } catch (e) {
    return { warnings, error: `That is not valid JSON: ${(e as Error).message}` };
  }
  if (!raw || typeof raw !== 'object') return { warnings, error: 'The JSON must be an object.' };
  const row = raw as Record<string, unknown>;
  const inner = (Array.isArray(raw) ? raw[0] : (row.lesson as unknown) ?? row.plan ?? row) as Record<string, unknown>;
  if (!inner || typeof inner !== 'object') return { warnings, error: 'No plan found inside the JSON.' };

  const slug = slugify(inner.slug ?? inner.topic, expectedSlug ?? '');
  if (!slug) return { warnings, error: 'The plan needs the topic "slug" it belongs to.' };
  if (!findTheme(slug)) {
    const names = allThemes().slice(0, 6).map((t) => t.slug).join(', ');
    return { warnings, error: `There is no topic "${slug}" in this app, so the plan cannot be attached to one. Topics include: ${names}…` };
  }
  if (expectedSlug && slug !== expectedSlug) {
    return { warnings, error: `This plan is for "${slug}", but you are on "${expectedSlug}". Open that topic first, or ask the AI for "${expectedSlug}".` };
  }

  const rawSteps = Array.isArray(inner.steps) ? inner.steps : [];
  const steps: PlanStep[] = rawSteps
    .map((rawStep): PlanStep | null => {
      if (!rawStep || typeof rawStep !== 'object') return null;
      const s = rawStep as Record<string, unknown>;
      const say = str(s.say).replace(/\s+/g, ' ');
      const title = str(s.title) || 'Step';
      if (!say) {
        warnings.push(`step "${title}" has nothing to say and was skipped.`);
        return null;
      }
      const minutes = Number(s.minutes);
      const ask = (Array.isArray(s.ask) ? s.ask : []).map((q) => str(q)).filter(Boolean).slice(0, 4);
      return {
        title,
        say,
        ask: ask.length ? ask : undefined,
        tutor: str(s.tutor) || undefined,
        minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : undefined,
        activity: str(s.activity) || undefined,
      };
    })
    .filter((s): s is PlanStep => Boolean(s));
  if (!steps.length) return { warnings, error: 'The plan needs a "steps" array, and every step needs "say".' };

  // Word ids an AI invents would highlight nothing, so they are dropped — loudly.
  const known = new Set(wordList(slug).map((w) => w.toLowerCase()));
  const words: string[] = [];
  const unknown: string[] = [];
  for (const raw of Array.isArray(inner.words) ? inner.words : []) {
    const word = str(raw);
    if (!word) continue;
    const match = wordList(slug).find((w) => w.toLowerCase() === word.toLowerCase());
    if (match) {
      if (!words.includes(match)) words.push(match);
    } else if (!unknown.includes(word)) unknown.push(word);
  }
  if (unknown.length) {
    warnings.push(`the plan mentions ${unknown.map((w) => `"${w}"`).join(', ')} — this topic does not have those words, so they were left out of the word list.`);
  }

  const totalFromSteps = steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0);
  const minutes = Number(inner.minutes);

  return {
    warnings,
    plan: {
      slug,
      title: str(inner.title ?? inner.name) || `${findTheme(slug)?.name ?? slug} plan`,
      minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : totalFromSteps || 15,
      objective: str(inner.objective) || undefined,
      materials: (Array.isArray(inner.materials) ? inner.materials : []).map((m) => str(m)).filter(Boolean).slice(0, 6),
      words,
      steps,
      source: 'ai',
    },
  };
}

/* ─────────────────────────── the live registry ─────────────────────────── */

const THEME_KEY = 'talkquest.customThemes.v1';
const PLAN_KEY = 'talkquest.customLessons.v1';

const installedPlans = new Map<string, LessonPlan>();
let planVersion = 0;
const planListeners = new Set<() => void>();

function notifyPlans() {
  planVersion++;
  planListeners.forEach((fn) => fn());
}

export function plansVersion() {
  return planVersion;
}

export function subscribePlans(fn: () => void) {
  planListeners.add(fn);
  return () => {
    planListeners.delete(fn);
  };
}

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readList<T>(key: string): T[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: unknown[]) {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    /* a full or blocked localStorage must not break the lesson */
  }
}

/** The words a theme has, English spelling, in teaching order. */
export function wordList(slug: string): string[] {
  try {
    return buildLesson(slug).words.map((w) => w.english);
  } catch {
    return [];
  }
}

export function lessonMinutes(slug: string): number {
  return planFor(slug).minutes;
}

/** Turn a pasted category into the row format the lesson engine reads. */
function rowsForPack(pack: PackTheme): string[] {
  return pack.words.map((w) => {
    const cells = [w.english, w.emoji, ...LANGS.filter((l) => l !== 'en').map((l) => w.tr[l] || w.english)];
    return cells.map((c) => String(c).replace(/\|/g, '/')).join('|');
  });
}

/**
 * The plan the app writes for itself when the tutor has pasted nothing.
 *
 * Every theme gets one, so the 📚 screen is never empty and pasting a plan is an
 * upgrade rather than the only way in. It is built from the lesson's own words,
 * its own concept-check questions and its own story.
 */
export function autoPlan(slug: string): LessonPlan {
  const lesson: Lesson = buildLesson(slug);
  const words = lesson.words;
  const chunk = 5;
  const steps: PlanStep[] = [];

  steps.push({
    title: 'Warm up',
    minutes: 2,
    say: lesson.warmUp,
    ask: ['Say hello! Can you clap two times?'],
    tutor: lesson.tutorNotes[0],
    activity: 'lesson:warmup',
  });

  for (let i = 0; i < words.length; i += chunk) {
    const slice = words.slice(i, i + chunk);
    const first = i === 0;
    steps.push({
      title: first ? 'Say the words' : `More words ${Math.floor(i / chunk) + 1}`,
      minutes: 4,
      say: slice.map((w) => `${w.sentence}`).join(' '),
      ask: slice.map((w) => w.ccq.q).slice(0, 3),
      tutor: lesson.tutorNotes[1],
      activity: 'lesson:vocab',
    });
  }

  steps.push({
    title: 'Check together',
    minutes: 3,
    say: 'Now I ask, you answer. Ready?',
    ask: words.slice(0, 3).map((w) => w.ccq.q),
    tutor: 'Ask one question, then wait five full seconds. Silence is thinking time.',
    activity: 'lesson:ccq',
  });
  steps.push({
    title: 'Quiz',
    minutes: 3,
    say: 'Let us see what you remember.',
    ask: ['What do you see in the picture?'],
    tutor: lesson.tutorNotes[2],
    activity: 'lesson:quiz',
  });
  steps.push({
    title: 'Story time',
    minutes: 3,
    say: lesson.story.title,
    ask: lesson.story.pages.slice(0, 2).map((p) => p.ask),
    tutor: 'Read one page, then ask the question on it. Let the child guess what happens next.',
    activity: 'lesson:story',
  });
  steps.push({
    title: 'Talk together',
    minutes: 3,
    say: 'Your turn to talk. I will listen.',
    ask: lesson.speakingChallenge.slice(0, 3),
    tutor: lesson.tutorNotes[3],
    activity: 'lesson:speak',
  });

  const game = PLAN_GAMES[Math.abs(hash(slug)) % PLAN_GAMES.length];
  steps.push({
    title: 'Play a game',
    minutes: 4,
    say: `Let us play ${game.name}. ${game.blurb.charAt(0).toUpperCase()}${game.blurb.slice(1)}!`,
    ask: ['Which word will you use in the game?'],
    tutor: 'Play one round. Stop while it is still fun.',
    activity: `game:${game.id}`,
  });

  steps.push({
    title: 'Bye bye',
    minutes: 1,
    say: 'Well done today! Say bye bye to your new words.',
    ask: ['Which word was your favourite?'],
    tutor: 'Finish on a win, every time.',
  });

  return {
    slug,
    title: `${lesson.name} — ready to teach`,
    minutes: steps.reduce((sum, s) => sum + (s.minutes ?? 0), 0),
    objective: lesson.objective,
    materials: ['This screen, shared', `${lesson.name} word cards`],
    words: words.map((w) => w.english),
    steps,
    source: 'app',
  };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** The plan for a theme: what the tutor pasted, or the one the app writes. */
export function planFor(slug: string): LessonPlan {
  return installedPlans.get(slug) ?? autoPlan(slug);
}

export function isPastedPlan(slug: string): boolean {
  return installedPlans.has(slug);
}

export function installedPlanSlugs(): string[] {
  return [...installedPlans.keys()];
}

/* ─────────────────────────── installing / removing ─────────────────────────── */

export function installThemePack(pack: PackTheme): string[] {
  const warnings: string[] = [];
  registerTheme({ slug: pack.slug, name: pack.name, icon: pack.icon, category: pack.category, color: pack.color });
  registerBank(pack.slug, rowsForPack(pack));
  writeList(THEME_KEY, [...readList<PackTheme>(THEME_KEY).filter((p) => p?.slug !== pack.slug), pack]);
  return warnings;
}

export function removeThemePack(slug: string) {
  removeTheme(slug);
  unregisterBank(slug);
  writeList(THEME_KEY, readList<PackTheme>(THEME_KEY).filter((p) => p?.slug !== slug));
}

export function installLessonPlan(plan: LessonPlan): string[] {
  installedPlans.set(plan.slug, plan);
  writeList(PLAN_KEY, [...readList<LessonPlan>(PLAN_KEY).filter((p) => p?.slug !== plan.slug), plan]);
  notifyPlans();
  return [];
}

export function removeLessonPlan(slug: string) {
  installedPlans.delete(slug);
  writeList(PLAN_KEY, readList<LessonPlan>(PLAN_KEY).filter((p) => p?.slug !== slug));
  notifyPlans();
}

/**
 * Put back everything the tutor pasted in an earlier visit.
 *
 * Called once when the app boots. Without it, installs live only in memory and a
 * reload quietly returns to the generated plan and the built-in library.
 */
export function registerStoredContent(): { themes: number; plans: number } {
  let themes = 0;
  let plans = 0;
  for (const pack of readList<PackTheme>(THEME_KEY)) {
    if (!pack?.slug || !Array.isArray(pack.words) || !pack.words.length) continue;
    // A stored pack that collides with a built-in id is left out rather than
    // taking the built-in over — the same rule the parser enforces.
    if (isBuiltInTheme(pack.slug)) continue;
    registerTheme({ slug: pack.slug, name: pack.name, icon: pack.icon || '🌟', category: pack.category || 'Custom', color: pack.color || '#6b7a9d' });
    registerBank(pack.slug, rowsForPack(pack));
    themes++;
  }
  for (const plan of readList<LessonPlan>(PLAN_KEY)) {
    if (!plan?.slug || !Array.isArray(plan.steps) || !plan.steps.length) continue;
    if (!hasBanks(plan.slug)) continue;
    installedPlans.set(plan.slug, { ...plan, source: 'ai' });
    plans++;
  }
  if (plans) notifyPlans();
  return { themes, plans };
}

/** One call for the studio: parse, install, and report what changed. */
export function addThemePackFromText(text: string): InstallResult {
  const { pack, warnings, error } = parseThemePack(text);
  if (!pack) return { ok: false, error: error ?? 'That pack could not be read.' };
  installThemePack(pack);
  return {
    ok: true,
    slug: pack.slug,
    summary: `“${pack.name}” is in your lesson library with ${pack.words.length} words.`,
    warnings,
  };
}

export function addLessonPlanFromText(text: string, slug: string): InstallResult {
  const { plan, warnings, error } = parseLessonPlan(text, slug);
  if (!plan) return { ok: false, error: error ?? 'That plan could not be read.' };
  installLessonPlan(plan);
  return {
    ok: true,
    slug: plan.slug,
    summary: `“${plan.title}” is ready — ${plan.steps.length} steps, ${plan.minutes} minutes.`,
    warnings,
  };
}
