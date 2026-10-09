import { THEMES_ME_HOME } from "./themes.me.home";
import { THEMES_SCHOOL_TOWN } from "./themes.school.town";
import { THEMES_NATURE_FUN } from "./themes.nature.fun";
import { THEMES_YUM_SHOPS } from "./themes.yum.shops";
import { THEMES_SPACE_DINO } from "./themes.space.dino";
import { THEMES_STORY_SPORT } from "./themes.story.sport";
import { THEMES_MUSIC_CARE } from "./themes.music.care";
import type { Lang, Theme, Unit, Word } from "./types";

export * from "./types";

/**
 * Every theme in the dictionary, in the order the tutor sees them.
 *
 * The array is deliberately MUTABLE: a category pack pasted in from an AI is
 * appended to it at runtime (`src/lib/playroom/customPack.ts`), which is what
 * makes an imported theme behave exactly like a built-in one — same word
 * garden, same lesson generation, same six languages.
 */
export const THEMES: Theme[] = [
  ...THEMES_ME_HOME,
  ...THEMES_SCHOOL_TOWN,
  ...THEMES_NATURE_FUN,
  ...THEMES_YUM_SHOPS,
  ...THEMES_SPACE_DINO,
  ...THEMES_STORY_SPORT,
  ...THEMES_MUSIC_CARE,
];

export const UNITS: Unit[] = THEMES.flatMap((t) => t.units);

export const WORDS: Word[] = UNITS.flatMap((u) => u.words);

export const WORD_MAP: Record<string, Word> = Object.fromEntries(WORDS.map((x) => [x.id, x]));

export const UNIT_MAP: Record<string, Unit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export const THEME_MAP: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

export function unitTheme(unitId: string): Theme {
  return THEMES.find((t) => t.units.some((u) => u.id === unitId)) ?? THEMES[0];
}

export function wordUnit(wordId: string): Unit {
  return UNITS.find((u) => u.words.some((x) => x.id === wordId)) ?? UNITS[0];
}

export function wordsByIds(ids: string[]): Word[] {
  const out = ids.map((id) => WORD_MAP[id]).filter(Boolean);
  return out.length ? out : WORDS.slice(0, 8);
}

export function label(word: Word, lang: Lang): string {
  return word.t[lang] ?? word.t.en;
}

/** Deterministic shuffle so the tutor sees the same board on refresh. */
export function shuffle<T>(arr: T[], seed = 1): T[] {
  const a = [...arr];
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample<T>(arr: T[], n: number, seed = Date.now() % 1000): T[] {
  if (arr.length <= n) return shuffle(arr, seed);
  return shuffle(arr, seed).slice(0, n);
}

export const TOTAL_WORDS = WORDS.length;
