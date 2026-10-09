import { THEMES_ME_HOME } from "./themes.me.home";
import { THEMES_SCHOOL_TOWN } from "./themes.school.town";
import { THEMES_NATURE_FUN } from "./themes.nature.fun";
import { THEMES_EXTRAS } from "./extras";
import type { Lang, Theme, Unit, Word } from "./types";

export * from "./types";

/**
 * THE LIVE LIBRARY.
 *
 * Everything in `themes.*.ts` + `extras.ts` ships inside the build. A tutor can
 * add MORE themes at runtime by pasting JSON from an external AI (see
 * `lib/customPack.ts`), so these exports are deliberately MUTABLE containers:
 * `installThemes()` pushes new themes/units/words into the very same arrays and
 * maps the game already renders from, and `TOTAL_WORDS` is a `let` so the counts
 * on screen follow along. (ESM live bindings mean an importer always sees the
 * current value — no context, no re-wiring of the eleven game modes.)
 */
export const THEMES: Theme[] = [
  ...THEMES_ME_HOME,
  ...THEMES_SCHOOL_TOWN,
  ...THEMES_NATURE_FUN,
  ...THEMES_EXTRAS,
];

export const UNITS: Unit[] = THEMES.flatMap((t) => t.units);

export const WORDS: Word[] = UNITS.flatMap((u) => u.words);

export const WORD_MAP: Record<string, Word> = Object.fromEntries(WORDS.map((x) => [x.id, x]));

export const UNIT_MAP: Record<string, Unit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

export const THEME_MAP: Record<string, Theme> = Object.fromEntries(THEMES.map((t) => [t.id, t]));

/** Themes that arrived from pasted JSON rather than the build — shown as "your pack". */
export const CUSTOM_THEME_IDS = new Set<string>();

/** Add themes (themes → units → words) to the live library. Ids must be unique. */
export function installThemes(incoming: Theme[]): { added: number; skipped: string[] } {
  const skipped: string[] = [];
  let added = 0;
  for (const theme of incoming) {
    if (!theme?.id || THEME_MAP[theme.id]) {
      skipped.push(theme?.id ?? "?");
      continue;
    }
    THEMES.push(theme);
    THEME_MAP[theme.id] = theme;
    CUSTOM_THEME_IDS.add(theme.id);
    for (const unit of theme.units) {
      UNITS.push(unit);
      UNIT_MAP[unit.id] = unit;
      for (const word of unit.words) {
        WORDS.push(word);
        WORD_MAP[word.id] = word;
      }
    }
    added++;
  }
  refreshCounts();
  return { added, skipped };
}

/** Remove themes (and their units/words) — used when a tutor deletes a pack. */
export function removeThemes(ids: string[]): void {
  const drop = new Set(ids);
  const keepThemes = THEMES.filter((t) => !drop.has(t.id));
  const keepUnits = keepThemes.flatMap((t) => t.units);
  const keepWords = keepUnits.flatMap((u) => u.words);
  // Mutate in place: every importer already holds a reference to these arrays.
  THEMES.splice(0, THEMES.length, ...keepThemes);
  UNITS.splice(0, UNITS.length, ...keepUnits);
  WORDS.splice(0, WORDS.length, ...keepWords);
  for (const key of Object.keys(THEME_MAP)) if (drop.has(key)) delete THEME_MAP[key];
  for (const key of Object.keys(UNIT_MAP)) if (!keepUnits.some((u) => u.id === key)) delete UNIT_MAP[key];
  for (const key of Object.keys(WORD_MAP)) if (!keepWords.some((w) => w.id === key)) delete WORD_MAP[key];
  ids.forEach((id) => CUSTOM_THEME_IDS.delete(id));
  refreshCounts();
}

/** Recompute the derived counters after the library changed. */
function refreshCounts() {
  TOTAL_WORDS = WORDS.length;
}

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

export let TOTAL_WORDS = WORDS.length;
