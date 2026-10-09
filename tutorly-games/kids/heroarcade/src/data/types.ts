export type Lang = 'en' | 'zh' | 'fr' | 'it' | 'de' | 'tr' | 'fa';
export const LANGS: Lang[] = ['en', 'zh', 'fr', 'it', 'de', 'tr', 'fa'];

export const LANG_META: Record<Lang, { name: string; native: string; flag: string; bcp: string; rtl?: boolean }> = {
  en: { name: 'English', native: 'English', flag: '🇬🇧', bcp: 'en-US' },
  zh: { name: 'Chinese', native: '中文', flag: '🇨🇳', bcp: 'zh-CN' },
  fr: { name: 'French', native: 'Français', flag: '🇫🇷', bcp: 'fr-FR' },
  it: { name: 'Italian', native: 'Italiano', flag: '🇮🇹', bcp: 'it-IT' },
  de: { name: 'German', native: 'Deutsch', flag: '🇩🇪', bcp: 'de-DE' },
  tr: { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷', bcp: 'tr-TR' },
  fa: { name: 'Farsi', native: 'فارسی', flag: '🇮🇷', bcp: 'fa-IR', rtl: true },
};

export type Tr = Record<Lang, string>;

export interface Word {
  id: string;
  t: Tr;          // translations
  icon: string;   // emoji (rendered as OpenMoji SVG) or short text (e.g. "11")
  ccq?: string[]; // extra English CCQs for this word
}

export interface StoryPage {
  icon: string;   // emoji scene
  text: string;   // simple English sentence(s)
  focus?: string[]; // vocabulary word ids highlighted
}
export interface StoryQuestion {
  q: string;
  options: string[];
  answer: number;
}
export interface Story {
  title: string;
  pages: StoryPage[];
  questions: StoryQuestion[];
}

export interface Theme {
  id: string;
  icon: string;
  color: string;          // tailwind-safe pastel hex
  title: Tr;
  words: Word[];
  talk: string[];         // open "talk about it" CCQs (English, tutor reads)
  story: Story;
  custom?: boolean;
}

// tuple: [en, zh, fr, it, de, tr, fa, icon, ...ccq]
export type WordTuple = [string, string, string, string, string, string, string, string, ...string[]];

export function W(rows: WordTuple[]): Word[] {
  return rows.map((r) => ({
    id: r[0].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    t: { en: r[0], zh: r[1], fr: r[2], it: r[3], de: r[4], tr: r[5], fa: r[6] },
    icon: r[7],
    ccq: r.length > 8 ? (r.slice(8) as string[]) : undefined,
  }));
}

export function T(en: string, zh: string, fr: string, it: string, de: string, tr: string, fa: string): Tr {
  return { en, zh, fr, it, de, tr, fa };
}
