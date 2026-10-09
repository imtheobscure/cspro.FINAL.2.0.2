export type Lang = "en" | "zh" | "fr" | "it" | "de" | "tr";

export const LANGS: { id: Lang; label: string; flag: string; native: string }[] = [
  { id: "en", label: "English", native: "English", flag: "🇬🇧" },
  { id: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { id: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { id: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { id: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { id: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
];

export const LANG_BY_ID: Record<Lang, (typeof LANGS)[number]> = Object.fromEntries(
  LANGS.map((l) => [l.id, l]),
) as Record<Lang, (typeof LANGS)[number]>;

/** Concept-check "kind" drives automatic CCQ generation. */
export type Kind =
  | "animal"
  | "person"
  | "food"
  | "drink"
  | "thing"
  | "clothes"
  | "body"
  | "place"
  | "vehicle"
  | "action"
  | "color"
  | "shape"
  | "number"
  | "letter"
  | "feeling"
  | "weather"
  | "time"
  | "nature";

export type Word = {
  id: string;
  /** Twemoji-compatible emoji artwork (rendered as crisp SVG). */
  e: string;
  k: Kind;
  /** [en, zh, pinyin, fr, it, de, tr] */
  t: Record<Lang, string>;
  py?: string;
  /** colour swatch */
  hex?: string;
  /** vector shape */
  shape?: "circle" | "square" | "triangle" | "rectangle" | "star" | "heart" | "oval" | "diamond";
  /** number art */
  digit?: number;
  /** alphabet art */
  letter?: string;
  /** opposite partner word id */
  opp?: string;
  /** letter sound / phonics hint */
  sound?: string;
  /** simple sentence frame example, shown in tutor notes */
  ex?: string;
};

export type Unit = {
  id: string;
  /** i18n phrase key */
  name: string;
  icon: string;
  words: Word[];
};

export type Theme = {
  id: string;
  name: string;
  icon: string;
  color: string;
  soft: string;
  chantId: string;
  frame: string;
  units: Unit[];
};

/** Build a word from a compact tuple: [en, zh, pinyin, fr, it, de, tr] */
export function w(
  id: string,
  e: string,
  k: Kind,
  t: [string, string, string, string, string, string, string],
  extra?: Partial<Word>,
): Word {
  return {
    id,
    e,
    k,
    t: { en: t[0], zh: t[1], fr: t[3], it: t[4], de: t[5], tr: t[6] },
    py: t[2] || undefined,
    ...extra,
  };
}

export function wordLabel(word: Word, lang: Lang): string {
  return word.t[lang] ?? word.t.en;
}
