import type { LangCode, Translations, Word } from "./types";

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Raw = [emoji: string, en: string, zh: string, py: string, fr: string, it: string, de: string, tr: string];

/** compact word factory: emoji + 6 languages (+ pinyin) */
export function W(...raw: Raw): Word {
  const [emoji, en, zh, py, fr, it, de, tr] = raw;
  return {
    id: slug(en),
    emoji,
    pinyin: py,
    t: { en, zh, fr, it, de, tr } as Translations,
  };
}

/** attach an animal / object sound (en, zh, fr, it, de, tr) to a word */
export function withSound(w: Word, en: string, zh: string, fr: string, it: string, de: string, tr: string): Word {
  return { ...w, sound: { en, zh, fr, it, de, tr } as Translations };
}

/** mark a word as belonging to a sorting basket */
export function inBin(w: Word, bin: string): Word {
  return { ...w, bin };
}

export function t(en: string, zh: string, fr: string, it: string, de: string, tr: string): Translations {
  return { en, zh, fr, it, de, tr } as Record<LangCode, string>;
}

/** builds a word list and gives every entry a globally unique id */
export function makeWords(prefix: string, list: Word[]): Word[] {
  const seen = new Map<string, number>();
  return list.map((w) => {
    const base = `${prefix}:${w.id}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...w, id: n === 0 ? base : `${base}-${n + 1}` };
  });
}
