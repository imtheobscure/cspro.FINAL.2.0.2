import type { Word } from "./types";
import { t } from "./wordKit";

type NumRow = [n: number, zh: string, py: string, fr: string, it: string, de: string, tr: string];

const EN = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

const ROWS: NumRow[] = [
  [0, "零", "líng", "zéro", "zero", "null", "sıfır"],
  [1, "一", "yī", "un", "uno", "eins", "bir"],
  [2, "二", "èr", "deux", "due", "zwei", "iki"],
  [3, "三", "sān", "trois", "tre", "drei", "üç"],
  [4, "四", "sì", "quatre", "quattro", "vier", "dört"],
  [5, "五", "wǔ", "cinq", "cinque", "fünf", "beş"],
  [6, "六", "liù", "six", "sei", "sechs", "altı"],
  [7, "七", "qī", "sept", "sette", "sieben", "yedi"],
  [8, "八", "bā", "huit", "otto", "acht", "sekiz"],
  [9, "九", "jiǔ", "neuf", "nove", "neun", "dokuz"],
  [10, "十", "shí", "dix", "dieci", "zehn", "on"],
  [11, "十一", "shíyī", "onze", "undici", "elf", "on bir"],
  [12, "十二", "shí'èr", "douze", "dodici", "zwölf", "on iki"],
  [13, "十三", "shísān", "treize", "tredici", "dreizehn", "on üç"],
  [14, "十四", "shísì", "quatorze", "quattordici", "vierzehn", "on dört"],
  [15, "十五", "shíwǔ", "quinze", "quindici", "fünfzehn", "on beş"],
  [16, "十六", "shíliù", "seize", "sedici", "sechzehn", "on altı"],
  [17, "十七", "shíqī", "dix-sept", "diciassette", "siebzehn", "on yedi"],
  [18, "十八", "shíbā", "dix-huit", "diciotto", "achtzehn", "on sekiz"],
  [19, "十九", "shíjiǔ", "dix-neuf", "diciannove", "neunzehn", "on dokuz"],
  [20, "二十", "èrshí", "vingt", "venti", "zwanzig", "yirmi"],
];

const KEYS = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];

export const NUMBERS: Word[] = ROWS.map(([n, zh, py, fr, it, de, tr]) => ({
  id: `numbers:${n}`,
  emoji: KEYS[n] ?? "🔢",
  numeral: n,
  pinyin: py,
  t: t(EN[n], zh, fr, it, de, tr),
}));

/** objects used by the counting game */
export const COUNTABLES = ["🍎", "🎈", "⭐", "🐟", "🌸", "🚗", "🍪", "🐤", "🍓", "⚽"];
