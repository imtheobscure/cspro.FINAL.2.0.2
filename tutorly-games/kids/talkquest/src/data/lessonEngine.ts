import { SupportedLanguage } from '@/types/theme';
import { allThemes, findTheme } from './themesMaster';
import { BANK_A } from './bankA';
import { BANK_B } from './bankB';
import { BANK_C } from './bankC';
import { BANK_D } from './bankD';
import { kindOf, makeCcq, storyFor, topicName, type WordKind } from './contentGen';
import { talkFor } from './talkLines';

const BANK: Record<string, string[]> = { ...BANK_A, ...BANK_B, ...BANK_C, ...BANK_D };

/**
 * Word rows for themes the tutor pasted in. Kept beside `BANK` (which stays the
 * record of what the app ships with) and read through `rowsFor` everywhere, so a
 * pasted theme goes through exactly the same pipeline as a built-in one:
 * the same talk lines, the same concept-check questions, the same story shape.
 */
const EXTRA_BANKS = new Map<string, string[]>();

export function registerBank(slug: string, rows: string[]) {
  EXTRA_BANKS.set(slug, rows);
}

export function unregisterBank(slug: string) {
  EXTRA_BANKS.delete(slug);
}

function rowsFor(slug: string): string[] | undefined {
  return EXTRA_BANKS.get(slug) ?? BANK[slug];
}

export interface LessonWord {
  id: string;
  english: string;
  emoji: string;
  tr: Record<SupportedLanguage, string>;
  sentence: string;
  sentences: string[];
  ccq: { q: string; options: string[]; correct: number; why: string; sayIt: string };
  chant: string;
  chants: string[];
  fact: string;
  kind: string;
  talk: string;
}

export interface QuizItem {
  kind: 'word' | 'image' | 'audio' | 'translate';
  prompt: string;
  emoji?: string;
  options: string[];
  correct: number;
  speakAfter: string;
}

export interface StoryPage {
  n: number;
  text: string;
  tr: Record<SupportedLanguage, string>;
  art: string;
  ask: string;
}

export interface Comprehension {
  q: string;
  options: string[];
  correct: number;
  discuss: string;
}

export interface Lesson {
  slug: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  objective: string;
  warmUp: string;
  words: LessonWord[];
  quiz: QuizItem[];
  matching: { left: string; right: string; emoji: string }[];
  story: { title: string; pages: StoryPage[]; comprehension: Comprehension[] };
  speakingChallenge: string[];
  tutorNotes: string[];
}

export const LANGS: SupportedLanguage[] = ['en', 'zh', 'fr', 'it', 'de', 'tr', 'fa'];

function parseRow(row: string, slug: string, i: number, allEnglish: string[]): LessonWord {
  const [english, emoji, zh, fr, it, de, tr, fa] = row.split('|');
  const tmap = { en: english, zh, fr, it, de, tr, fa } as Record<SupportedLanguage, string>;
  const kind = kindOf(slug, english);
  const others = allEnglish.filter(w => w !== english);
  const talk = talkFor(english, kind as WordKind);
  const generated = makeCcq(kind, english, i, others);
  return {
    id: `${slug}-${i}`,
    english,
    emoji,
    tr: tmap,
    sentence: talk.say[0],
    sentences: talk.say,
    ccq: {
      q: talk.ask || generated.q,
      options: generated.options,
      correct: generated.correct,
      why: talk.why || generated.why,
      sayIt: talk.talk || generated.sayIt,
    },
    chant: talk.chants[0],
    chants: talk.chants,
    fact: talk.fact,
    kind,
    talk: talk.talk,
  };
}

/**
 * A theme with no word bank of its own would otherwise silently show the
 * alphabet — twenty cards about apples and balls in a lesson about the sea.
 * Callers can ask first and tell the tutor instead.
 */
export function hasBanks(slug: string): boolean {
  const rows = rowsFor(slug);
  return Array.isArray(rows) && rows.length > 0;
}

function buildQuiz(words: LessonWord[], name: string): QuizItem[] {
  const pool = words.map(w => w.english);
  const decoys = (correct: string, n = 3) => {
    const others = pool.filter(p => p !== correct);
    const picked: string[] = [];
    while (picked.length < n && others.length) {
      const idx = Math.floor(Math.random() * others.length);
      picked.push(others.splice(idx, 1)[0]);
    }
    return picked;
  };

  const prompts = [
    (w: LessonWord) => ({ kind: 'image' as const, prompt: 'What do you see in the picture?', speak: w.talk }),
    (w: LessonWord) => ({ kind: 'word' as const, prompt: `Finish the sentence: “${w.sentence.replace(new RegExp(w.english, 'i'), '____')}”`, speak: 'Now say the whole sentence.' }),
    (w: LessonWord) => ({ kind: 'audio' as const, prompt: 'Listen. Which word did you hear?', speak: 'Say it back to me.' }),
    (w: LessonWord) => ({ kind: 'translate' as const, prompt: `Which word goes with ${name}?`, speak: 'Say it in both languages.' }),
  ];

  return words.slice(0, 8).map((w, i) => {
    const opts = [w.english, ...decoys(w.english, 3)].sort(() => Math.random() - 0.5);
    const p = prompts[i % prompts.length](w);
    return {
      kind: p.kind,
      prompt: p.prompt,
      emoji: p.kind === 'audio' ? '🔊' : w.emoji,
      options: opts,
      correct: opts.indexOf(w.english),
      speakAfter: p.speak,
    };
  });
}

export function buildLesson(slug: string): Lesson {
  const meta = findTheme(slug) ?? {
    slug, name: slug.replace(/-/g, ' '), icon: '🌟', category: 'General', color: '#475569',
  };
  const rows = rowsFor(slug) ?? BANK['alphabet'];
  const englishList = rows.map(r => r.split('|')[0]);
  const words = rows.map((r, i) => parseRow(r, slug, i, englishList));
  const pack = storyFor(slug, meta.name, meta.icon, words);

  return {
    slug: meta.slug,
    name: meta.name,
    icon: meta.icon,
    category: meta.category,
    color: meta.color,
    objective: `We will learn ${words.length} words about ${topicName(meta.name)} and say each one in a sentence.`,
    warmUp: pack.warmUp,
    words,
    quiz: buildQuiz(words, meta.name),
    matching: words.slice(0, 8).map(w => ({ left: w.english, right: w.english, emoji: w.emoji })),
    story: {
      title: pack.title,
      pages: pack.pages.map((p, i) => ({
        n: i + 1,
        text: p.text,
        art: p.art,
        ask: p.ask,
        tr: { en: p.text, zh: p.text, fr: p.text, it: p.text, de: p.text, tr: p.text, fa: p.text },
      })),
      comprehension: pack.comp,
    },
    speakingChallenge: pack.speaking,
    tutorNotes: [
      'Wait five seconds after you ask. Let them think.',
      'If they say one word, smile and ask: Can you say the whole sentence?',
      'Say “well done” first. Then help with the hard sound.',
      'Let the child talk more than you do.',
    ],
  };
}

export function allLessonSlugs(): string[] {
  return allThemes().map(t => t.slug);
}

export function langLabel(l: SupportedLanguage) {
  return { en: 'English', zh: '中文', fr: 'Français', it: 'Italiano', de: 'Deutsch', tr: 'Türkçe', fa: 'فارسی' }[l];
}


