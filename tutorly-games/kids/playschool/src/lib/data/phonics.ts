/**
 * Phonics + handwriting data.
 * Tracing paths are polylines (M/L only) in a 100x100 viewBox so we can sample
 * points with SVGPathElement.getTotalLength()/getPointAtLength() for real
 * "did the finger cover the letter" detection.
 */

export type TraceGlyph = {
  /** one polyline per pen stroke, "|" separated */
  strokes: string;
  /** where the pen starts, in viewBox units */
  start: [number, number];
  /** arrows for stroke direction */
  arrows: number;
};

const U: Record<string, string> = {
  A: "M20 90 L50 12 L80 90|M32 62 L68 62",
  B: "M25 12 L52 12 L63 22 L63 33 L52 42 L25 42|M25 42 L56 42 L70 54 L70 78 L56 90 L25 90",
  C: "M78 28 L62 12 L40 12 L22 30 L22 70 L40 88 L62 88 L78 72",
  D: "M25 12 L48 12 L71 31 L71 71 L48 90 L25 90",
  E: "M78 12 L25 12 L25 90 L78 90|M25 50 L66 50",
  F: "M78 12 L25 12 L25 90|M25 50 L66 50",
  G: "M78 28 L62 12 L40 12 L22 30 L22 70 L40 88 L62 88 L78 74 L78 58 L54 58",
  H: "M25 12 L25 90|M78 12 L78 90|M25 51 L78 51",
  I: "M50 12 L50 90|M34 12 L66 12|M34 90 L66 90",
  J: "M70 12 L70 72 L55 88 L35 88 L24 76",
  K: "M25 12 L25 90|M78 12 L30 56 L78 90",
  L: "M28 12 L28 90 L78 90",
  M: "M22 90 L22 12 L50 64 L78 12 L78 90",
  N: "M25 90 L25 12 L75 90 L75 12",
  O: "M50 12 L26 28 L22 50 L26 74 L50 88 L74 74 L78 50 L74 28 L50 12",
  P: "M25 90 L25 12 L60 12 L73 26 L73 42 L60 56 L25 56",
  Q: "M50 12 L26 28 L22 50 L26 74 L50 88 L74 74 L78 50 L74 28 L50 12|M58 70 L86 96",
  R: "M25 90 L25 12 L60 12 L73 26 L73 42 L60 56 L25 56|M52 56 L78 90",
  S: "M78 26 L62 12 L38 12 L25 22 L25 36 L38 46 L64 52 L76 62 L76 78 L62 88 L38 88 L22 74",
  T: "M20 12 L80 12|M50 12 L50 90",
  U: "M25 12 L25 70 L35 86 L52 90 L68 86 L78 70 L78 12",
  V: "M22 12 L50 90 L78 12",
  W: "M18 12 L32 90 L50 42 L68 90 L82 12",
  X: "M24 12 L78 90|M78 12 L24 90",
  Y: "M24 12 L50 52 L76 12|M50 52 L50 90",
  Z: "M24 12 L78 12 L24 90 L78 90",
};

const LOWER: Record<string, string> = {
  a: "M76 22 L76 78|M76 34 Q68 22 54 22 Q34 24 30 50 Q30 76 54 78 Q68 78 76 66",
  b: "M26 12 L26 90|M26 36 Q36 22 54 22 Q76 26 76 50 Q76 76 54 78 Q36 78 26 62",
  c: "M74 30 Q62 20 48 22 Q28 28 28 50 Q28 72 48 78 Q62 80 74 70",
  d: "M74 12 L74 90|M74 36 Q64 22 46 22 Q24 26 24 50 Q24 76 46 78 Q64 78 74 62",
  e: "M28 52 L74 52 Q74 26 51 22 Q28 26 28 50 Q28 76 51 78 Q66 78 74 68",
  f: "M68 20 Q60 12 50 12 Q36 14 36 30 L36 90|M24 38 L54 38",
  g: "M74 22 L74 76 Q74 96 52 96 Q34 96 26 84|M74 34 Q64 22 46 22 Q24 26 24 50 Q24 76 46 78 Q64 78 74 62",
  h: "M26 12 L26 90|M26 42 Q38 22 56 22 Q74 26 74 52 L74 90",
  i: "M48 32 L48 90|M48 12 L48 16",
  j: "M52 32 L52 78 Q52 96 34 96 Q22 96 18 86|M52 12 L52 16",
  k: "M26 12 L26 90|M72 32 L34 58 L72 90",
  l: "M44 12 L44 84 Q46 92 56 90",
  m: "M24 32 L24 90|M24 46 Q34 32 46 32 Q58 34 58 48 L58 90|M58 46 Q68 32 78 32 Q88 34 88 48 L88 90",
  n: "M26 32 L26 90|M26 46 Q38 22 58 22 Q74 26 74 50 L74 90",
  o: "M50 22 Q28 26 28 50 Q28 76 50 78 Q72 76 72 50 Q72 26 50 22",
  p: "M26 32 L26 104|M26 36 Q36 22 54 22 Q76 26 76 50 Q76 76 54 78 Q36 78 26 62",
  q: "M74 32 L74 104|M74 36 Q64 22 46 22 Q24 26 24 50 Q24 76 46 78 Q64 78 74 62",
  r: "M28 32 L28 90|M28 46 Q40 22 60 24",
  s: "M72 40 Q66 22 48 22 Q30 26 32 40 Q34 52 50 54 Q68 56 70 72 Q68 88 48 88 Q30 86 24 72",
  t: "M40 12 L40 76 Q42 90 58 88|M26 32 L58 32",
  u: "M26 32 L26 68 Q28 78 46 78 Q66 78 72 66|M72 32 L72 90",
  v: "M26 32 L50 90 L74 32",
  w: "M20 32 L34 90 L50 48 L66 90 L80 32",
  x: "M28 32 L72 90|M72 32 L28 90",
  y: "M26 32 L50 90 L58 78 Q68 62 74 32|M46 74 Q42 96 24 100",
  z: "M28 32 L72 32 L28 90 L72 90",
};

const NUM: Record<string, string> = {
  "0": "M50 12 L28 26 L24 50 L28 76 L50 88 L72 76 L76 50 L72 26 L50 12",
  "1": "M32 30 L50 12 L50 90|M32 90 L68 90",
  "2": "M26 30 L40 14 L60 14 L74 28 L74 44 L26 90 L78 90",
  "3": "M26 22 L40 12 L62 12 L74 24 L74 40 L62 50 L48 50|M48 50 L64 52 L76 64 L74 78 L60 88 L40 88 L24 76",
  "4": "M60 90 L60 12 L24 62 L82 62",
  "5": "M76 14 L30 14 L26 48 L44 42 L62 44 L74 56 L74 74 L60 88 L38 88 L24 78",
  "6": "M72 22 L58 12 L40 16 L26 36 L24 60 L28 78 L44 88 L60 86 L74 74 L74 58 L62 46 L44 44 L28 54",
  "7": "M22 14 L80 14 L48 90",
  "8": "M50 12 L34 20 L32 36 L44 48 L58 52 L70 64 L68 80 L50 88 L32 80 L30 64 L42 52 L56 48 L68 36 L66 20 L50 12",
  "9": "M74 78 L60 88 L44 86 L30 74 L30 58 L42 46 L58 44 L72 54 L74 30 L66 16 L50 12 L32 22",
};

function starts(p: string): [number, number] {
  const m = p.match(/M(-?[\d.]+) (-?[\d.]+)/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
}

export const TRACE_UPPER: Record<string, TraceGlyph> = Object.fromEntries(
  Object.entries(U).map(([k, v]) => [k, { strokes: v, start: starts(v.split("|")[0]), arrows: v.split("|").length }]),
);

export const TRACE_LOWER: Record<string, TraceGlyph> = Object.fromEntries(
  Object.entries(LOWER).map(([k, v]) => [k, { strokes: v, start: starts(v.split("|")[0]), arrows: v.split("|").length }]),
);

export const TRACE_NUM: Record<string, TraceGlyph> = Object.fromEntries(
  Object.entries(NUM).map(([k, v]) => [k, { strokes: v, start: starts(v.split("|")[0]), arrows: v.split("|").length }]),
);

/** letter -> phonics sound + example word (word id must exist in the dictionary) */
export const LETTER_SOUNDS: { L: string; sound: string; ex: string; action: string }[] = [
  { L: "A", sound: "a", ex: "apple", action: "open your mouth wide like an apple" },
  { L: "B", sound: "b", ex: "bear", action: "bounce your hands like a bear" },
  { L: "C", sound: "k", ex: "cat", action: "stroke whiskers on your cheeks" },
  { L: "D", sound: "d", ex: "duck", action: "flap your arms like a duck" },
  { L: "E", sound: "e", ex: "egg", action: "crack an egg on your head" },
  { L: "F", sound: "f", ex: "fish", action: "put your hands together and swim" },
  { L: "G", sound: "g", ex: "giraffe", action: "stretch your neck up tall" },
  { L: "H", sound: "h", ex: "hat", action: "put a hat on your head" },
  { L: "I", sound: "i", ex: "icecream", action: "lick an ice cream" },
  { L: "J", sound: "j", ex: "juice", action: "pour juice in the air" },
  { L: "K", sound: "k", ex: "kite", action: "pull a kite string" },
  { L: "L", sound: "l", ex: "lion", action: "roar like a lion" },
  { L: "M", sound: "m", ex: "monkey", action: "rub your tummy" },
  { L: "N", sound: "n", ex: "nose", action: "point to your nose" },
  { L: "O", sound: "o", ex: "octopus", action: "wiggle eight arms" },
  { L: "P", sound: "p", ex: "pig", action: "snort like a pig" },
  { L: "Q", sound: "kw", ex: "quiet", action: "put a finger on your lips" },
  { L: "R", sound: "r", ex: "rabbit", action: "hop like a rabbit" },
  { L: "S", sound: "s", ex: "socks", action: "hiss like a snake" },
  { L: "T", sound: "t", ex: "tree", action: "stand tall like a tree" },
  { L: "U", sound: "u", ex: "up", action: "reach up high" },
  { L: "V", sound: "v", ex: "van", action: "drive a steering wheel" },
  { L: "W", sound: "w", ex: "water", action: "wave like water" },
  { L: "X", sound: "ks", ex: "fox", action: "make an X with your arms" },
  { L: "Y", sound: "y", ex: "yellow", action: "yawn and stretch" },
  { L: "Z", sound: "z", ex: "zebra", action: "buzz like a bee" },
];

export const SOUND_MAP: Record<string, { sound: string; ex: string; action: string }> = Object.fromEntries(
  LETTER_SOUNDS.map((x) => [x.L, { sound: x.sound, ex: x.ex, action: x.action }]),
);

/** CVC word families — every artId exists in the picture dictionary. */
export type Cvc = { c1: string; v: string; c2: string; word: string; artId: string };
export const CVC_WORDS: Cvc[] = [
  { c1: "c", v: "a", c2: "t", word: "cat", artId: "cat" },
  { c1: "h", v: "a", c2: "t", word: "hat", artId: "hat" },
  { c1: "v", v: "a", c2: "n", word: "van", artId: "van" },
  { c1: "c", v: "a", c2: "p", word: "cap", artId: "hat" },
  { c1: "b", v: "e", c2: "d", word: "bed", artId: "bed" },
  { c1: "p", v: "e", c2: "n", word: "pen", artId: "pen" },
  { c1: "h", v: "e", c2: "n", word: "hen", artId: "hen" },
  { c1: "t", v: "e", c2: "n", word: "ten", artId: "num10" },
  { c1: "r", v: "e", c2: "d", word: "red", artId: "red" },
  { c1: "l", v: "e", c2: "g", word: "leg", artId: "leg" },
  { c1: "p", v: "i", c2: "g", word: "pig", artId: "pig" },
  { c1: "b", v: "i", c2: "g", word: "big", artId: "big" },
  { c1: "s", v: "i", c2: "x", word: "six", artId: "num6" },
  { c1: "d", v: "o", c2: "g", word: "dog", artId: "dog" },
  { c1: "h", v: "o", c2: "t", word: "hot", artId: "hot" },
  { c1: "c", v: "u", c2: "p", word: "cup", artId: "cup" },
  { c1: "s", v: "u", c2: "n", word: "sun", artId: "sunny" },
  { c1: "b", v: "u", c2: "s", word: "bus", artId: "bus" },
  { c1: "b", v: "u", c2: "g", word: "bug", artId: "worm" },
  { c1: "r", v: "u", c2: "n", word: "run", artId: "run" },
  { c1: "m", v: "u", c2: "d", word: "mud", artId: "dirty" },
];

/** vowel-team / digraph stretch words */
export const BLEND_WORDS: { letters: string[]; word: string; artId: string; note: string }[] = [
  { letters: ["sh", "ee", "p"], word: "sheep", artId: "sheep", note: "sh says shhh" },
  { letters: ["b", "ee"], word: "bee", artId: "bee", note: "ee says eee" },
  { letters: ["m", "oo", "n"], word: "moon", artId: "moon", note: "oo says ooo" },
  { letters: ["r", "ai", "n"], word: "rain", artId: "rainy", note: "ai says ay" },
  { letters: ["s", "ta", "r"], word: "star", artId: "star", note: "ar says arr" },
  { letters: ["b", "oa", "t"], word: "boat", artId: "boat", note: "oa says oh" },
  { letters: ["c", "a", "ke"], word: "cake", artId: "cake", note: "magic e makes a say ay" },
  { letters: ["k", "i", "te"], word: "kite", artId: "kite", note: "magic e makes i say eye" },
  { letters: ["n", "o", "se"], word: "nose", artId: "nose", note: "magic e makes o say oh" },
  { letters: ["c", "u", "be"], word: "cube", artId: "square", note: "magic e makes u say you" },
];

export const FRUIT_FOR: Record<string, string> = {
  a: "🍎",
  e: "🥚",
  i: "🍦",
  o: "🍊",
  u: "🍌",
  sh: "🐑",
  ee: "🐝",
  oo: "🌙",
  ai: "🌧️",
  oa: "⛵",
  ar: "⭐",
};

export const VOWELS = ["a", "e", "i", "o", "u"] as const;
export const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split("");
