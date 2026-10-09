export type LangCode = "en" | "zh" | "fr" | "it" | "de" | "tr";

export type Translations = Record<LangCode, string>;

export type Word = {
  /** unique id, assigned at assembly time: `${subthemeId}:${slug}` */
  id: string;
  emoji: string;
  t: Translations;
  /** when set the card renders the numeral instead of emoji art */
  numeral?: number;
  /** when set the card renders a big letter (alphabet mode) */
  letter?: string;
  /** phonics hint, e.g. "a as in apple" */
  phonics?: string;
  /** romanisation for Chinese */
  pinyin?: string;
  /** animal / object sound in every language ("woof") */
  sound?: Translations;
  /** basket key for the sorting game */
  bin?: string;
  /** plural only word (les cheveux) */
  plural?: boolean;
};

export type Bin = {
  key: string;
  emoji: string;
  t: Translations;
  /** emoji of example items pulled from anywhere in the dictionary */
  examples?: string[];
};

export type Subtheme = {
  id: string;
  emoji: string;
  t: Translations;
  words: Word[];
  /** when present, the sorting game uses these baskets instead of sibling subthemes */
  bins?: Bin[];
  kind?: "words" | "numbers" | "letters";
};

export type Theme = {
  id: string;
  emoji: string;
  t: Translations;
  /** tailwind-free hex used for accents */
  color: string;
  soft: string;
  chant: Translations[];
  subthemes: Subtheme[];
};
