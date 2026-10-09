import type { Kind, Theme, Unit, Word } from "./types";
import { w } from "./types";

/**
 * FOUR MORE THEMES — including two the lesson plans were already asking for.
 *
 * `lib/data/lessons.ts` lists `numbers1to10`, `numbers11to20` and `alphabet` in
 * its GAME_UNITS map (the tracing and scavenger-hunt sections), but those units
 * never existed, so the PlaySchool lesson silently skipped them. They are here
 * now, together with two brand-new preschool subjects — camping and the
 * supermarket — so this game's library grows in a different direction from its
 * siblings.
 *
 * Same register as the rest of the dictionary: concrete, picturable first words,
 * singular nouns with their article in French/Italian/German, pinyin on every
 * Chinese word.
 */

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
  const [en, zh, py, fr, it, de, tr] = NUMBER_ROWS[n - 1];
  return t(`num-${en}`, DIGIT_EMOJI[n] ?? "🔢", "number", en, zh, py, fr, it, de, tr, { digit: n });
};

/* ─────────────────────────── 🔤 letters ─────────────────────────── */

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
  w(`letter-${letter.toLowerCase()}`, emoji, "letter", [letter, letter, "", letter, letter, letter, letter], {
    letter,
    sound: `/${sound}/`,
    ex: exampleId,
  }),
);

/* ─────────────────────────── 🏕️ camping ─────────────────────────── */

const camping = u("camping", "unit.camping", "⛺", [
  t("tent", "⛺", "thing", "tent", "帐篷", "zhàngpeng", "la tente", "la tenda", "das Zelt", "çadır"),
  t("campfire", "🔥", "thing", "campfire", "篝火", "gōuhuǒ", "le feu de camp", "il falò", "das Lagerfeuer", "kamp ateşi"),
  t("sleepingbag", "🛏️", "thing", "sleeping bag", "睡袋", "shuìdài", "le sac de couchage", "il sacco a pelo", "der Schlafsack", "uyku tulumu"),
  t("torch", "🔦", "thing", "torch", "手电筒", "shǒudiàntǒng", "la lampe de poche", "la torcia", "die Taschenlampe", "el feneri"),
  t("backpack", "🎒", "thing", "backpack", "背包", "bēibāo", "le sac à dos", "lo zaino", "der Rucksack", "sırt çantası"),
  t("map", "🗺️", "thing", "map", "地图", "dìtú", "la carte", "la mappa", "die Karte", "harita"),
  t("camera", "📷", "thing", "camera", "相机", "xiàngjī", "l'appareil photo", "la macchina fotografica", "die Kamera", "fotoğraf makinesi"),
  t("boots", "🥾", "clothes", "boots", "靴子", "xuēzi", "les bottes", "gli stivali", "die Stiefel", "botlar"),
]);

const forest = u("forest", "unit.forest", "🌲", [
  t("forest", "🌲", "place", "forest", "森林", "sēnlín", "la forêt", "il bosco", "der Wald", "orman"),
  t("tree", "🌳", "nature", "tree", "树", "shù", "l'arbre", "l'albero", "der Baum", "ağaç"),
  t("leaf", "🍃", "nature", "leaf", "叶子", "yèzi", "la feuille", "la foglia", "das Blatt", "yaprak"),
  t("pinecone", "🌰", "nature", "pine cone", "松果", "sōngguǒ", "la pomme de pin", "la pigna", "der Tannenzapfen", "kozalak"),
  t("mushroom", "🍄", "nature", "mushroom", "蘑菇", "mógu", "le champignon", "il fungo", "der Pilz", "mantar"),
  t("bird", "🐦", "animal", "bird", "鸟", "niǎo", "l'oiseau", "l'uccello", "der Vogel", "kuş"),
  t("squirrel", "🐿️", "animal", "squirrel", "松鼠", "sōngshǔ", "l'écureuil", "lo scoiattolo", "das Eichhörnchen", "sincap"),
  t("stream", "💧", "place", "stream", "小溪", "xiǎoxī", "le ruisseau", "il ruscello", "der Bach", "dere"),
]);

/* ─────────────────────────── 🛒 supermarket ─────────────────────────── */

const shop = u("supermarket", "unit.supermarket", "🛒", [
  t("trolley", "🛒", "thing", "trolley", "购物车", "gòuwùchē", "le chariot", "il carrello", "der Einkaufswagen", "alışveriş arabası"),
  t("basket", "🧺", "thing", "basket", "篮子", "lánzi", "le panier", "il cestino", "der Korb", "sepet"),
  t("shelf", "🗄️", "thing", "shelf", "货架", "huòjià", "l'étagère", "lo scaffale", "das Regal", "raf"),
  t("bag", "🛍️", "thing", "bag", "袋子", "dàizi", "le sac", "la busta", "die Tasche", "poşet"),
  t("till", "💳", "thing", "till", "收银台", "shōuyíntái", "la caisse", "la cassa", "die Kasse", "kasa"),
  t("money", "💰", "thing", "money", "钱", "qián", "l'argent", "i soldi", "das Geld", "para"),
  t("list", "📝", "thing", "list", "清单", "qīngdān", "la liste", "la lista", "die Liste", "liste"),
  t("shopkeeper", "🧑‍🍳", "person", "shopkeeper", "店员", "diànyuán", "le vendeur", "il negoziante", "der Verkäufer", "satıcı"),
]);

const foods2 = u("foodshop", "unit.foodshop", "🥛", [
  t("bread", "🍞", "food", "bread", "面包", "miànbāo", "le pain", "il pane", "das Brot", "ekmek"),
  t("milk", "🥛", "drink", "milk", "牛奶", "niúnǎi", "le lait", "il latte", "die Milch", "süt"),
  t("cheese", "🧀", "food", "cheese", "奶酪", "nǎilào", "le fromage", "il formaggio", "der Käse", "peynir"),
  t("eggs", "🥚", "food", "eggs", "鸡蛋", "jīdàn", "les œufs", "le uova", "die Eier", "yumurta"),
  t("rice", "🍚", "food", "rice", "米饭", "mǐfàn", "le riz", "il riso", "der Reis", "pirinç"),
  t("soup", "🥣", "food", "soup", "汤", "tāng", "la soupe", "la zuppa", "die Suppe", "çorba"),
  t("pasta", "🍝", "food", "pasta", "意面", "yìmiàn", "les pâtes", "la pasta", "die Nudeln", "makarna"),
  t("juice", "🧃", "drink", "juice", "果汁", "guǒzhī", "le jus", "il succo", "der Saft", "meyve suyu"),
]);

/* ─────────────────────────── the themes ─────────────────────────── */

export const THEMES_EXTRAS: Theme[] = [
  {
    id: "numbers",
    name: "theme.numbers",
    icon: "🔢",
    color: "#7fb2de",
    soft: "#e8f1fb",
    chantId: "me",
    frame: "How many … are there? — There are …",
    units: [
      u("numbers1to10", "unit.num10", "1️⃣", Array.from({ length: 10 }, (_, i) => numberWord(i + 1))),
      u("numbers11to20", "unit.num20", "🔟", Array.from({ length: 10 }, (_, i) => numberWord(i + 11))),
    ],
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
    id: "camping",
    name: "theme.camping",
    icon: "⛺",
    color: "#7fbb63",
    soft: "#f1faec",
    chantId: "fun",
    frame: "What can you see outside? — I can see a …",
    units: [camping, forest],
  },
  {
    id: "supermarket",
    name: "theme.supermarket",
    icon: "🛒",
    color: "#efb03f",
    soft: "#fff7e6",
    chantId: "home",
    frame: "Can I have …, please? — Here you are.",
    units: [shop, foods2],
  },
];
