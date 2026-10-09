import type { LangCode, Subtheme, Theme, Word } from "./types";
import { t } from "./wordKit";
import { SELF_SUBTHEMES } from "./words/self";
import { HOME_SUBTHEMES } from "./words/home";
import { SCHOOL_SUBTHEMES } from "./words/school";
import { COMMUNITY_SUBTHEMES } from "./words/community";
import { ANIMALS_SUBTHEMES } from "./words/animals";
import { CELEBRATIONS_SUBTHEMES } from "./words/celebrations";
import { NUMBERS } from "./numbers";
import { ALPHABET } from "./alphabet";
import { THEMES_EXTRAS } from "./extras";

/** words from every subtheme — used to localise the alphabet by emoji */
const POOL: Word[] = [...SELF_SUBTHEMES, ...HOME_SUBTHEMES, ...SCHOOL_SUBTHEMES, ...COMMUNITY_SUBTHEMES, ...ANIMALS_SUBTHEMES, ...CELEBRATIONS_SUBTHEMES].flatMap(
  (s) => s.words,
);

const BY_EMOJI = new Map<string, Word>();
for (const w of POOL) if (!BY_EMOJI.has(w.emoji)) BY_EMOJI.set(w.emoji, w);

function letterWord(letter: string, word: string, emoji: string, phonics: string): Word {
  const found = BY_EMOJI.get(emoji);
  return {
    id: `alphabet:${letter.toLowerCase()}`,
    emoji,
    letter,
    phonics,
    t: found
      ? { ...found.t }
      : { en: word, zh: word, fr: word, it: word, de: word, tr: word },
  };
}

const ALPHABET_WORDS: Word[] = ALPHABET.map((a) => letterWord(a.letter, a.word, a.emoji, a.sound));

const numbersSub: Subtheme = {
  id: "numbers",
  emoji: "🔢",
  kind: "numbers",
  t: t("Numbers 1–20", "数字 1–20", "Les nombres 1–20", "I numeri 1–20", "Zahlen 1–20", "Sayılar 1–20"),
  words: NUMBERS,
};

const alphabetSub: Subtheme = {
  id: "alphabet",
  emoji: "🔤",
  kind: "letters",
  t: t("Alphabet & Letter Sounds", "字母和发音", "L'alphabet et les sons", "L'alfabeto e i suoni", "Alphabet und Laute", "Alfabe ve Harf Sesleri"),
  words: ALPHABET_WORDS,
};

const CORE_THEMES: Theme[] = [
  {
    id: "self",
    emoji: "🧒",
    color: "#EF9BB8",
    soft: "#FFF1F6",
    t: t("Self & Family", "我和家人", "Moi et ma famille", "Io e la mia famiglia", "Ich und meine Familie", "Ben ve Ailem"),
    chant: [
      { en: "This is me! This is me!", zh: "这是我！这是我！", fr: "C'est moi ! C'est moi !", it: "Sono io! Sono io!", de: "Das bin ich! Das bin ich!", tr: "Bu benim! Bu benim!" },
      { en: "Head and shoulders, knees and toes!", zh: "头、肩膀、膝盖、脚！", fr: "La tête, les épaules, les genoux, les pieds !", it: "Testa, spalle, ginocchia, piedi!", de: "Kopf und Schultern, Knie und Fuß!", tr: "Baş, omuz, diz ve ayak!" },
      { en: "I am happy, I am sad,", zh: "我开心，我难过，", fr: "Je suis heureux, je suis triste,", it: "Sono felice, sono triste,", de: "Ich bin froh, ich bin traurig,", tr: "Mutluyum, üzgünüm," },
      { en: "I can say it — clap, clap, clap!", zh: "我会说——拍拍拍！", fr: "Je peux le dire — clap, clap, clap !", it: "So dirlo — clap, clap, clap!", de: "Ich sag es — klatsch, klatsch, klatsch!", tr: "Söylerim — alkış, alkış, alkış!" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: SELF_SUBTHEMES,
  },
  {
    id: "home",
    emoji: "🏠",
    color: "#EFB03F",
    soft: "#FFF7E6",
    t: t("Home & Daily Life", "家和日常生活", "La maison et la vie", "Casa e vita quotidiana", "Zuhause und Alltag", "Ev ve Günlük Yaşam"),
    chant: [
      { en: "In my house, tap tap tap!", zh: "在我的家里，咚咚咚！", fr: "Dans ma maison, toc toc toc !", it: "Nella mia casa, toc toc toc!", de: "In meinem Haus, klopf klopf klopf!", tr: "Evimde, tak tak tak!" },
      { en: "Kitchen, bedroom, bathroom too!", zh: "厨房、卧室、还有浴室！", fr: "Cuisine, chambre, salle de bains !", it: "Cucina, camera, anche bagno!", de: "Küche, Zimmer und das Bad!", tr: "Mutfak, yatak odası, banyo!" },
      { en: "Yummy food and yummy drink,", zh: "好吃的饭，好喝的饮料，", fr: "Bon à manger, bon à boire,", it: "Buono da mangiare e da bere,", de: "Lecker essen, lecker trinken,", tr: "Lezzetli yemek, lezzetli içecek," },
      { en: "Home is happy — yes it is!", zh: "家很快乐——是的！", fr: "Ma maison est super !", it: "La mia casa è bella!", de: "Mein Haus ist schön!", tr: "Evim çok güzel!" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: HOME_SUBTHEMES,
  },
  {
    id: "school",
    emoji: "🎒",
    color: "#6FA8E8",
    soft: "#EEF5FF",
    t: t("School & Learning", "学校和学习", "L'école et l'apprentissage", "La scuola e lo studio", "Schule und Lernen", "Okul ve Öğrenme"),
    chant: [
      { en: "Red and blue and yellow too,", zh: "红色、蓝色、还有黄色，", fr: "Rouge et bleu et jaune aussi,", it: "Rosso, blu e anche giallo,", de: "Rot und Blau und auch Gelb,", tr: "Kırmızı, mavi, sarı da," },
      { en: "Circle, square and triangle!", zh: "圆形、方形、三角形！", fr: "Cercle, carré et triangle !", it: "Cerchio, quadrato, triangolo!", de: "Kreis, Quadrat und Dreieck!", tr: "Daire, kare ve üçgen!" },
      { en: "One, two, three — count with me!", zh: "一、二、三——和我一起数！", fr: "Un, deux, trois — compte avec moi !", it: "Uno, due, tre — conta con me!", de: "Eins, zwei, drei — zähl mit mir!", tr: "Bir, iki, üç — benimle say!" },
      { en: "A, B, C — now sing with me!", zh: "A、B、C——和我一起唱！", fr: "A, B, C — chante avec moi !", it: "A, B, C — canta con me!", de: "A, B, C — sing mit mir!", tr: "A, B, C — benimle söyle!" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: [numbersSub, alphabetSub, ...SCHOOL_SUBTHEMES],
  },
  {
    id: "community",
    emoji: "🏙️",
    color: "#4FB89B",
    soft: "#ECFAF4",
    t: t("Neighbourhood & Community", "社区和城市", "Le quartier", "Il quartiere", "Nachbarschaft", "Mahalle ve Toplum"),
    chant: [
      { en: "Beep beep! Here comes the bus!", zh: "嘀嘀！公交车来了！", fr: "Tut tut ! Voilà le bus !", it: "Beep beep! Arriva il bus!", de: "Tut tut! Der Bus kommt!", tr: "Düt düt! Otobüs geliyor!" },
      { en: "To the park and to the zoo!", zh: "去公园，去动物园！", fr: "Au parc et puis au zoo !", it: "Al parco e poi allo zoo!", de: "Zum Park und dann zum Zoo!", tr: "Parka ve hayvanat bahçesine!" },
      { en: "Doctor, teacher, firefighter —", zh: "医生、老师、消防员——", fr: "Docteur, maîtresse, pompier —", it: "Dottore, maestra, pompiere —", de: "Arzt, Lehrerin, Feuerwehr —", tr: "Doktor, öğretmen, itfaiyeci —" },
      { en: "Thank you, thank you, all of you!", zh: "谢谢你们，谢谢大家！", fr: "Merci, merci à vous tous !", it: "Grazie, grazie a tutti voi!", de: "Danke, danke, euch allen!", tr: "Teşekkürler, hepinize!" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: COMMUNITY_SUBTHEMES,
  },
  {
    id: "animals",
    emoji: "🦁",
    color: "#7FBB63",
    soft: "#F1FAEC",
    t: t("Animals & Nature", "动物和自然", "Les animaux et la nature", "Animali e natura", "Tiere und Natur", "Hayvanlar ve Doğa"),
    chant: [
      { en: "The dog says woof, the cat says meow,", zh: "小狗汪汪叫，小猫喵喵叫，", fr: "Le chien fait ouah, le chat miaou,", it: "Il cane fa bau, il gatto miao,", de: "Der Hund macht wau, die Katze miau,", tr: "Köpek hav der, kedi miyav," },
      { en: "The cow says moo, moo, moo!", zh: "奶牛哞哞哞！", fr: "La vache fait meuh, meuh, meuh !", it: "La mucca fa muu, muu, muu!", de: "Die Kuh macht muh, muh, muh!", tr: "İnek möö, möö, möö!" },
      { en: "Sun and rain and snow and wind,", zh: "太阳、下雨、下雪、刮风，", fr: "Soleil, pluie, neige et vent,", it: "Sole, pioggia, neve e vento,", de: "Sonne, Regen, Schnee und Wind,", tr: "Güneş, yağmur, kar, rüzgâr," },
      { en: "I love nature — how about you?", zh: "我爱大自然——你呢？", fr: "J'aime la nature — et toi ?", it: "Amo la natura — e tu?", de: "Ich mag die Natur — und du?", tr: "Doğayı severim — ya sen?" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: ANIMALS_SUBTHEMES,
  },
  {
    id: "celebrations",
    emoji: "🎉",
    color: "#A98BE0",
    soft: "#F5F1FF",
    t: t("Celebrations & Fun", "节日和娱乐", "Les fêtes et les loisirs", "Feste e divertimento", "Feste und Freizeit", "Kutlamalar ve Eğlence"),
    chant: [
      { en: "Happy birthday, hip hip hooray!", zh: "生日快乐，万岁！", fr: "Bon anniversaire, hip hip hourra !", it: "Buon compleanno, hip hip urrà!", de: "Alles Gute, hip hip hurra!", tr: "İyi ki doğdun, hip hip hurra!" },
      { en: "Candles, cake and presents too!", zh: "蜡烛、蛋糕、还有礼物！", fr: "Bougies, gâteau et cadeaux !", it: "Candele, torta e regali!", de: "Kerzen, Kuchen, Geschenke!", tr: "Mumlar, pasta, hediyeler!" },
      { en: "Jump and dance and clap your hands,", zh: "跳一跳，跳舞，拍拍手，", fr: "Saute, danse, tape des mains,", it: "Salta, balla, batti le mani,", de: "Hüpf und tanz und klatsch,", tr: "Zıpla, dans et, el çırp," },
      { en: "I love playing games with you!", zh: "我喜欢和你一起玩！", fr: "J'adore jouer avec toi !", it: "Amo giocare con te!", de: "Ich spiel so gern mit dir!", tr: "Seninle oynamayı severim!" },
    ] as { en: string; zh: string; fr: string; it: string; de: string; tr: string }[],
    subthemes: CELEBRATIONS_SUBTHEMES,
  },
];

/**
 * THE LIVE DICTIONARY.
 *
 * `THEMES` / `SUBTHEMES` / `ALL_WORDS` are deliberately MUTABLE: a tutor can add
 * whole themes at runtime by pasting JSON from an external AI (lib/customPack.ts),
 * and `installThemes()` pushes them into these very arrays so every game mode sees
 * them without a single change. `WORD_COUNT` is a `let` so the counters follow.
 */
export const THEMES: Theme[] = [...CORE_THEMES, ...THEMES_EXTRAS];

export type SubthemeRef = Subtheme & { themeId: string };

export const SUBTHEMES: SubthemeRef[] = THEMES.flatMap((th) => th.subthemes.map((s) => ({ ...s, themeId: th.id })));

export const ALL_WORDS: Word[] = SUBTHEMES.flatMap((s) => s.words);

export let WORD_COUNT = ALL_WORDS.length;

/** Themes that arrived from pasted JSON rather than the build. */
export const CUSTOM_THEME_IDS = new Set<string>();

/** Add themes → subthemes → words to the live dictionary. */
export function installThemes(incoming: Theme[]): { added: number; skipped: string[] } {
  const skipped: string[] = [];
  let added = 0;
  for (const theme of incoming) {
    if (!theme?.id || THEMES.some((t) => t.id === theme.id)) {
      skipped.push(theme?.id ?? "?");
      continue;
    }
    THEMES.push(theme);
    CUSTOM_THEME_IDS.add(theme.id);
    for (const sub of theme.subthemes) {
      const ref: SubthemeRef = { ...sub, themeId: theme.id };
      SUBTHEMES.push(ref);
      for (const word of sub.words) ALL_WORDS.push(word);
    }
    added++;
  }
  WORD_COUNT = ALL_WORDS.length;
  return { added, skipped };
}

/** Remove themes (and everything under them) — used when a tutor deletes a pack. */
export function removeThemes(ids: string[]): void {
  const drop = new Set(ids);
  const keep = THEMES.filter((t) => !drop.has(t.id));
  THEMES.splice(0, THEMES.length, ...keep);
  const subs = keep.flatMap((t) => t.subthemes.map((s) => ({ ...s, themeId: t.id })));
  SUBTHEMES.splice(0, SUBTHEMES.length, ...subs);
  const words = subs.flatMap((s) => s.words);
  ALL_WORDS.splice(0, ALL_WORDS.length, ...words);
  ids.forEach((id) => CUSTOM_THEME_IDS.delete(id));
  WORD_COUNT = ALL_WORDS.length;
}

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function getSubtheme(id: string): Subtheme | undefined {
  for (const th of THEMES) {
    const s = th.subthemes.find((x) => x.id === id);
    if (s) return s;
  }
  return undefined;
}

export function themeOfSubtheme(subthemeId: string): Theme {
  return THEMES.find((th) => th.subthemes.some((s) => s.id === subthemeId)) ?? THEMES[0];
}

export function siblingSubthemes(theme: Theme, subthemeId: string): Subtheme[] {
  return theme.subthemes.filter((s) => s.id !== subthemeId && !s.kind);
}

export function wordsOf(subtheme: Subtheme): Word[] {
  return subtheme.words.filter((w) => !w.bin);
}

export function textOf(w: Word, lang: LangCode): string {
  return w.t[lang] || w.t.en;
}
