export type Lang = "en" | "zh" | "fr" | "it" | "de" | "tr";
export const LANGS: Lang[] = ["en", "zh", "fr", "it", "de", "tr"];

export type Kind =
  | "thing"
  | "animal"
  | "food"
  | "person"
  | "action"
  | "feeling"
  | "color"
  | "shape"
  | "number"
  | "letter"
  | "place"
  | "weather"
  | "body"
  | "clothes"
  | "vehicle"
  | "opposite";

export interface Word {
  id: string;
  emoji: string;
  /** translations */
  t: Record<Lang, string>;
  /** pinyin for Chinese */
  py: string;
  kind?: Kind;
  /** numbers */
  n?: number;
  /** alphabet */
  letter?: string;
  /** shapes */
  shape?: string;
  /** colors */
  color?: string;
}

export interface Theme {
  id: string;
  category: CategoryId;
  emoji: string;
  kind: Kind;
  title: Record<Lang, string>;
  words: Word[];
  /** emoji used to draw countable objects for number themes */
  countEmoji?: string;
}

export type CategoryId =
  | "self"
  | "home"
  | "school"
  | "community"
  | "nature"
  | "fun";

export interface Category {
  id: CategoryId;
  emoji: string;
  color: string;
  title: Record<Lang, string>;
}

export type Activity = "learn" | "chant" | "quiz" | "match" | "memory" | "listen";
export const ACTIVITIES: Activity[] = ["learn", "chant", "quiz", "match", "memory", "listen"];

/** compact word builder */
export function w(
  emoji: string,
  en: string,
  zh: string,
  py: string,
  fr: string,
  it: string,
  de: string,
  tr: string,
  extra: Partial<Word> = {},
): Word {
  return {
    id: en.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    emoji,
    t: { en, zh, fr, it, de, tr },
    py,
    ...extra,
  };
}

export function tt(
  en: string,
  zh: string,
  fr: string,
  it: string,
  de: string,
  tr: string,
): Record<Lang, string> {
  return { en, zh, fr, it, de, tr };
}
