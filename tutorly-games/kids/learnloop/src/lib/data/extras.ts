import type { Kind, Theme, Unit, Word } from "./types";
import { w } from "./types";

/**
 * FOUR MORE THEMES — and two broken modes fixed.
 *
 * `NumbersMode` counts with `WORDS.filter(w => w.k === "number")` and `AbcMode`
 * walks `WORDS.filter(w => w.k === "letter")`. Neither theme existed, so both
 * modes had an EMPTY list — `NUMBERS.find(…)` returned undefined and the screen
 * crashed the moment a tutor opened it. The `numbers` and `letters` themes below
 * are what those modes were written against.
 *
 * The other two themes (space, music) are new teaching material in the same
 * register as the rest of the library: concrete, picturable, first-500-words
 * vocabulary, singular nouns with their article in French/Italian/German,
 * ordinal-free numbers, and pinyin on every Chinese word.
 */

/** Compact unit builder. */
const u = (id: string, name: string, icon: string, words: Word[]): Unit => ({ id, name, icon, words });

const t = (
  id: string,
  e: string,
  k: Kind,
  en: string,
  zh: string,
  py: string,
  fr: string,
  it: string,
  de: string,
  tr: string,
  extra: Partial<Word> = {},
): Word => w(id, e, k, [en, zh, py, fr, it, de, tr], extra);

/* ─────────────────────────── 🔢 numbers ─────────────────────────── */

const DIGIT_EMOJI = ["", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const NUMBER_ROWS: [string, string, string, string, string, string, string][] = [
  ["one", "一", "yī", "un", "uno", "eins", "bir"],
  ["two", "二", "èr", "deux", "due", "zwei", "iki"],
  ["three", "三", "sān", "trois", "tre", "drei", "üç"],
  ["four", "四", "sì", "quatre", "quattro", "vier", "dört"],
  ["five", "五", "wǔ", "cinq", "cinque", "fünf", "beş"],
  ["six", "六", "liù", "six", "sei", "sechs", "altı"],
  ["seven", "七", "qī", "sept", "sette", "sieben", "yedi"],
  ["eight", "八", "bā", "huit", "otto", "acht", "sekiz"],
  ["nine", "九", "jiǔ", "neuf", "nove", "neun", "dokuz"],
  ["ten", "十", "shí", "dix", "dieci", "zehn", "on"],
  ["eleven", "十一", "shíyī", "onze", "undici", "elf", "on bir"],
  ["twelve", "十二", "shí'èr", "douze", "dodici", "zwölf", "on iki"],
  ["thirteen", "十三", "shísān", "treize", "tredici", "dreizehn", "on üç"],
  ["fourteen", "十四", "shísì", "quatorze", "quattordici", "vierzehn", "on dört"],
  ["fifteen", "十五", "shíwǔ", "quinze", "quindici", "fünfzehn", "on beş"],
  ["sixteen", "十六", "shíliù", "seize", "sedici", "sechzehn", "on altı"],
  ["seventeen", "十七", "shíqī", "dix-sept", "diciassette", "siebzehn", "on yedi"],
  ["eighteen", "十八", "shíbā", "dix-huit", "diciotto", "achtzehn", "on sekiz"],
  ["nineteen", "十九", "shíjiǔ", "dix-neuf", "diciannove", "neunzehn", "on dokuz"],
  ["twenty", "二十", "èrshí", "vingt", "venti", "zwanzig", "yirmi"],
];

const numberWord = (n: number): Word => {
  const row = NUMBER_ROWS[n - 1];
  const [en, zh, py, fr, it, de, tr] = row;
  return t(`num-${en}`, DIGIT_EMOJI[n] ?? "🔢", "number", en, zh, py, fr, it, de, tr, { digit: n });
};

const numbers10 = Array.from({ length: 10 }, (_, i) => numberWord(i + 1));
const numbers20 = Array.from({ length: 10 }, (_, i) => numberWord(i + 11));

/* ─────────────────────────── 🔤 letters ─────────────────────────── */

/**
 * A–Z. Every letter points at a real word that is already in the library
 * (`ex`), so the ABC mode shows the same picture the child met in the theme —
 * no second dictionary, no translations to keep in sync.
 */
const LETTER_ROWS: [string, string, string, string][] = [
  ["A", "🍎", "apple", "a"],
  ["B", "⚽", "ball", "b"],
  ["C", "🐱", "cat", "c"],
  ["D", "🐶", "dog", "d"],
  ["E", "🐘", "elephant", "e"],
  ["F", "🦊", "fox", "f"],
  ["G", "🦒", "giraffe", "g"],
  ["H", "🎩", "hat", "h"],
  ["I", "🍦", "icecream", "i"],
  ["J", "🧃", "juice", "j"],
  ["K", "🪁", "kite", "k"],
  ["L", "🦁", "lion", "l"],
  ["M", "🐵", "monkey", "m"],
  ["N", "👃", "nose", "n"],
  ["O", "🐙", "octopus", "o"],
  ["P", "🐼", "panda", "p"],
  ["Q", "🤫", "quiet", "q"],
  ["R", "🐰", "rabbit", "r"],
  ["S", "⭐", "star", "s"],
  ["T", "🐯", "tiger", "t"],
  ["U", "☂️", "umbrella", "u"],
  ["V", "🚐", "van", "v"],
  ["W", "🐳", "whale", "w"],
  ["X", "🦊", "fox", "x"],
  ["Y", "🟡", "yellow", "y"],
  ["Z", "🦓", "zebra", "z"],
];

const letterWords: Word[] = LETTER_ROWS.map(([letter, emoji, exampleId, sound]) =>
  w(
    `letter-${letter.toLowerCase()}`,
    emoji,
    "letter",
    [letter, letter, "", letter, letter, letter, letter],
    {
      letter,
      sound: `/${sound}/`,
      ex: exampleId,
      // "X is for fox" — X has no first-sound example in a first-words list, so
      // the classic children's-book solve: the letter at the END of a word.
      ...(sound === "x" ? { ex: "fox" } : {}),
    },
  ),
);

/* ─────────────────────────── 🚀 space ─────────────────────────── */

const planets = u("planets", "unit.planets", "🪐", [
  t("sun", "☀️", "nature", "sun", "太阳", "tàiyáng", "le soleil", "il sole", "die Sonne", "güneş"),
  t("moon", "🌙", "nature", "moon", "月亮", "yuèliang", "la lune", "la luna", "der Mond", "ay"),
  t("star", "⭐", "nature", "star", "星星", "xīngxing", "l'étoile", "la stella", "der Stern", "yıldız"),
  t("planet", "🪐", "thing", "planet", "行星", "xíngxīng", "la planète", "il pianeta", "der Planet", "gezegen"),
  t("earth", "🌍", "place", "Earth", "地球", "dìqiú", "la Terre", "la Terra", "die Erde", "dünya"),
  t("galaxy", "🌌", "nature", "galaxy", "银河", "yínhé", "la galaxie", "la galassia", "die Galaxie", "galaksi"),
  t("comet", "☄️", "nature", "comet", "彗星", "huìxīng", "la comète", "la cometa", "der Komet", "kuyruklu yıldız"),
  t("telescope", "🔭", "thing", "telescope", "望远镜", "wàngyuǎnjìng", "le télescope", "il telescopio", "das Teleskop", "teleskop"),
]);

const spaceTravel = u("spacetravel", "unit.spacetravel", "🚀", [
  t("rocket", "🚀", "vehicle", "rocket", "火箭", "huǒjiàn", "la fusée", "il razzo", "die Rakete", "roket"),
  t("astronaut", "👨‍🚀", "person", "astronaut", "宇航员", "yǔhángyuán", "l'astronaute", "l'astronauta", "der Astronaut", "astronot"),
  t("spacesuit", "🧑‍🚀", "clothes", "space suit", "太空服", "tàikōngfú", "la combinaison spatiale", "la tuta spaziale", "der Raumanzug", "uzay giysisi"),
  t("ufo", "🛸", "vehicle", "UFO", "飞碟", "fēidié", "la soucoupe volante", "il disco volante", "das UFO", "ufo"),
  t("satellite", "🛰️", "thing", "satellite", "卫星", "wèixīng", "le satellite", "il satellite", "der Satellit", "uydu"),
  t("alien", "👽", "person", "alien", "外星人", "wàixīngrén", "l'extraterrestre", "l'alieno", "der Außerirdische", "uzaylı"),
  t("takeoff", "🛫", "action", "take off", "起飞", "qǐfēi", "décoller", "decollare", "abheben", "kalkmak"),
]);

/* ─────────────────────────── 🎵 music ─────────────────────────── */

const musicMakers = u("musicmakers", "unit.musicmakers", "🥁", [
  t("drum", "🥁", "thing", "drum", "鼓", "gǔ", "le tambour", "il tamburo", "die Trommel", "davul"),
  t("guitar", "🎸", "thing", "guitar", "吉他", "jítā", "la guitare", "la chitarra", "die Gitarre", "gitar"),
  t("piano", "🎹", "thing", "piano", "钢琴", "gāngqín", "le piano", "il pianoforte", "das Klavier", "piyano"),
  t("trumpet", "🎺", "thing", "trumpet", "小号", "xiǎohào", "la trompette", "la tromba", "die Trompete", "trompet"),
  t("violin", "🎻", "thing", "violin", "小提琴", "xiǎotíqín", "le violon", "il violino", "die Geige", "keman"),
  t("bell", "🔔", "thing", "bell", "铃铛", "língdang", "la cloche", "la campanella", "die Glocke", "çan"),
  t("microphone", "🎤", "thing", "microphone", "话筒", "huàtǒng", "le micro", "il microfono", "das Mikrofon", "mikrofon"),
  t("music", "🎶", "thing", "music", "音乐", "yīnyuè", "la musique", "la musica", "die Musik", "müzik"),
]);

const playground = u("playground", "unit.playground", "⚽", [
  t("ball", "⚽", "thing", "ball", "球", "qiú", "le ballon", "la palla", "der Ball", "top"),
  t("kite", "🪁", "thing", "kite", "风筝", "fēngzheng", "le cerf-volant", "l'aquilone", "der Drachen", "uçurtma"),
  t("bike", "🚲", "vehicle", "bicycle", "自行车", "zìxíngchē", "le vélo", "la bicicletta", "das Fahrrad", "bisiklet"),
  t("balloon", "🎈", "thing", "balloon", "气球", "qìqiú", "le ballon de baudruche", "il palloncino", "der Luftballon", "balon"),
  t("skateboard", "🛹", "thing", "skateboard", "滑板", "huábǎn", "le skateboard", "lo skateboard", "das Skateboard", "kaykay"),
  t("teddy", "🧸", "thing", "teddy bear", "小熊", "xiǎoxióng", "le nounours", "l'orsetto", "der Teddybär", "oyuncak ayı"),
  t("puzzle", "🧩", "thing", "puzzle", "拼图", "pīntú", "le puzzle", "il puzzle", "das Puzzle", "yapboz"),
  t("blocks", "🧱", "thing", "blocks", "积木", "jīmù", "les cubes", "i cubetti", "die Bausteine", "küpler"),
]);

/* ─────────────────────────── the themes ─────────────────────────── */

export const THEMES_EXTRAS: Theme[] = [
  {
    id: "numbers",
    name: "theme.numbers",
    icon: "🔢",
    color: "#7fb2e5",
    soft: "#e8f1fb",
    chantId: "me",
    frame: "How many … are there? — There are …",
    units: [u("numbers1to10", "unit.num10", "1️⃣", numbers10), u("numbers11to20", "unit.num20", "🔟", numbers20)],
  },
  {
    id: "letters",
    name: "theme.letters",
    icon: "🔤",
    color: "#b394d6",
    soft: "#f1ebfa",
    chantId: "me",
    frame: "… starts with the letter … — A is for apple.",
    units: [u("alphabet", "unit.alphabet", "🔤", letterWords)],
  },
  {
    id: "space",
    name: "theme.space",
    icon: "🚀",
    color: "#6f8fd6",
    soft: "#e8edfb",
    chantId: "me",
    frame: "What can you see in the sky? — I can see …",
    units: [planets, spaceTravel],
  },
  {
    id: "music",
    name: "theme.music",
    icon: "🎵",
    color: "#e8a33d",
    soft: "#fdf1dc",
    chantId: "fun",
    frame: "Can you play the …? — Yes, I can play the …",
    units: [musicMakers, playground],
  },
];
