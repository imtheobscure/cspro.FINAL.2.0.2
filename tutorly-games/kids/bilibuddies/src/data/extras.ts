import type { Subtheme, Theme } from "./types";
import { makeWords, t, W } from "./wordKit";

/**
 * MORE THEMES — the variety a tutor actually runs out of.
 *
 * The library already covered self, home, school, town, animals and parties, but
 * there was nothing about the sky, nothing about music, and nothing about baby
 * animals — three subjects that fill a lesson on their own with 3–5 year olds.
 * Same register as the rest of the dictionary: singular nouns, natural everyday
 * translations with articles in French/Italian/German, pinyin on every Chinese
 * word, and `makeWords()` prefixes the ids so nothing collides with the core set.
 */

const words = (prefix: string, list: ReturnType<typeof W>[]) => makeWords(prefix, list);

/* ───────────────────────── 🚀 space & sky ───────────────────────── */

const sky: Subtheme = {
  id: "sky",
  emoji: "🌤️",
  t: t("In the Sky", "天空中", "Dans le ciel", "Nel cielo", "Am Himmel", "Gökyüzünde"),
  words: words("sky", [
    W("☀️", "sun", "太阳", "tàiyáng", "le soleil", "il sole", "die Sonne", "güneş"),
    W("🌙", "moon", "月亮", "yuèliang", "la lune", "la luna", "der Mond", "ay"),
    W("⭐", "star", "星星", "xīngxing", "l'étoile", "la stella", "der Stern", "yıldız"),
    W("🪐", "planet", "行星", "xíngxīng", "la planète", "il pianeta", "der Planet", "gezegen"),
    W("🌍", "Earth", "地球", "dìqiú", "la Terre", "la Terra", "die Erde", "dünya"),
    W("🌌", "galaxy", "银河", "yínhé", "la galaxie", "la galassia", "die Galaxie", "galaksi"),
    W("☄️", "comet", "彗星", "huìxīng", "la comète", "la cometa", "der Komet", "kuyruklu yıldız"),
    W("🔭", "telescope", "望远镜", "wàngyuǎnjìng", "le télescope", "il telescopio", "das Teleskop", "teleskop"),
  ]),
};

const space: Subtheme = {
  id: "space",
  emoji: "🚀",
  t: t("Going to Space", "去太空", "Aller dans l'espace", "Andare nello spazio", "Ins All fliegen", "Uzaya gitmek"),
  words: words("space", [
    W("🚀", "rocket", "火箭", "huǒjiàn", "la fusée", "il razzo", "die Rakete", "roket"),
    W("👨‍🚀", "astronaut", "宇航员", "yǔhángyuán", "l'astronaute", "l'astronauta", "der Astronaut", "astronot"),
    W("🧑‍🚀", "space suit", "太空服", "tàikōngfú", "la combinaison spatiale", "la tuta spaziale", "der Raumanzug", "uzay giysisi"),
    W("🛸", "UFO", "飞碟", "fēidié", "la soucoupe volante", "il disco volante", "das UFO", "ufo"),
    W("🛰️", "satellite", "卫星", "wèixīng", "le satellite", "il satellite", "der Satellit", "uydu"),
    W("👽", "alien", "外星人", "wàixīngrén", "l'extraterrestre", "l'alieno", "der Außerirdische", "uzaylı"),
    W("🛫", "take off", "起飞", "qǐfēi", "décoller", "decollare", "abheben", "kalkmak"),
    W("🌕", "full moon", "满月", "mǎnyuè", "la pleine lune", "la luna piena", "der Vollmond", "dolunay"),
  ]),
};

/* ───────────────────────── 🎶 music & dance ───────────────────────── */

const instruments: Subtheme = {
  id: "instruments",
  emoji: "🥁",
  t: t("Instruments", "乐器", "Les instruments", "Gli strumenti", "Instrumente", "Çalgılar"),
  words: words("music", [
    W("🥁", "drum", "鼓", "gǔ", "le tambour", "il tamburo", "die Trommel", "davul"),
    W("🎸", "guitar", "吉他", "jítā", "la guitare", "la chitarra", "die Gitarre", "gitar"),
    W("🎹", "piano", "钢琴", "gāngqín", "le piano", "il pianoforte", "das Klavier", "piyano"),
    W("🎺", "trumpet", "小号", "xiǎohào", "la trompette", "la tromba", "die Trompete", "trompet"),
    W("🎻", "violin", "小提琴", "xiǎotíqín", "le violon", "il violino", "die Geige", "keman"),
    W("🔔", "bell", "铃铛", "língdang", "la cloche", "la campanella", "die Glocke", "çan"),
    W("🎤", "microphone", "话筒", "huàtǒng", "le micro", "il microfono", "das Mikrofon", "mikrofon"),
    W("🎶", "music", "音乐", "yīnyuè", "la musique", "la musica", "die Musik", "müzik"),
  ]),
};

const move: Subtheme = {
  id: "move",
  emoji: "💃",
  t: t("Move With Me", "跟我动一动", "Bouge avec moi", "Muoviti con me", "Beweg dich mit", "Benimle hareket et"),
  words: words("move", [
    W("💃", "dance", "跳舞", "tiàowǔ", "danser", "ballare", "tanzen", "dans etmek"),
    W("🦘", "jump", "跳", "tiào", "sauter", "saltare", "springen", "zıplamak"),
    W("👏", "clap", "拍手", "pāishǒu", "taper des mains", "battere le mani", "klatschen", "el çırpmak"),
    W("🕺", "spin", "转圈", "zhuànquān", "tourner", "girare", "drehen", "dönmek"),
    W("🚶", "walk", "走", "zǒu", "marcher", "camminare", "gehen", "yürümek"),
    W("🤸", "stretch", "伸展", "shēnzhǎn", "s'étirer", "stirarsi", "strecken", "gerinmek"),
    W("⏸️", "stop", "停", "tíng", "s'arrêter", "fermarsi", "anhalten", "durmak"),
    W("🎵", "sing", "唱歌", "chànggē", "chanter", "cantare", "singen", "şarkı söylemek"),
  ]),
};

/* ───────────────────────── 🐣 baby animals & growing ───────────────────────── */

const babyanimals: Subtheme = {
  id: "babyanimals",
  emoji: "🐣",
  t: t("Baby Animals", "动物宝宝", "Les bébés animaux", "I cuccioli", "Tierbabys", "Hayvan yavruları"),
  words: words("baby", [
    W("🐶", "puppy", "小狗", "xiǎogǒu", "le chiot", "il cucciolo", "der Welpe", "yavru köpek"),
    W("🐱", "kitten", "小猫", "xiǎomāo", "le chaton", "il gattino", "das Kätzchen", "yavru kedi"),
    W("🐤", "chick", "小鸡", "xiǎojī", "le poussin", "il pulcino", "das Küken", "civciv"),
    W("🐮", "calf", "小牛", "xiǎoniú", "le veau", "il vitello", "das Kalb", "buzağı"),
    W("🐑", "lamb", "小羊", "xiǎoyáng", "l'agneau", "l'agnello", "das Lamm", "kuzu"),
    W("🐷", "piglet", "小猪", "xiǎozhū", "le porcelet", "il maialino", "das Ferkel", "yavru domuz"),
    W("🦆", "duckling", "小鸭", "xiǎoyā", "le caneton", "l'anatroccolo", "das Entenküken", "ördek yavrusu"),
    W("🐴", "foal", "小马", "xiǎomǎ", "le poulain", "il puledro", "das Fohlen", "tay"),
  ]),
};

const growing: Subtheme = {
  id: "growing",
  emoji: "🌱",
  t: t("Growing Things", "生长", "Ça pousse", "Cose che crescono", "Wachsendes", "Büyüyen şeyler"),
  words: words("grow", [
    W("🌱", "seed", "种子", "zhǒngzi", "la graine", "il seme", "der Samen", "tohum"),
    W("🌿", "sprout", "嫩芽", "nènyá", "la pousse", "il germoglio", "der Sprössling", "filiz"),
    W("🌻", "sunflower", "向日葵", "xiàngrìkuí", "le tournesol", "il girasole", "die Sonnenblume", "ayçiçeği"),
    W("🌳", "tree", "树", "shù", "l'arbre", "l'albero", "der Baum", "ağaç"),
    W("🍃", "leaf", "叶子", "yèzi", "la feuille", "la foglia", "das Blatt", "yaprak"),
    W("🪴", "garden", "花园", "huāyuán", "le jardin", "il giardino", "der Garten", "bahçe"),
    W("🚿", "water", "浇水", "jiāoshuǐ", "arroser", "annaffiare", "gießen", "sulamak"),
    W("🦋", "butterfly", "蝴蝶", "húdié", "le papillon", "la farfalla", "der Schmetterling", "kelebek"),
  ]),
};

/* ───────────────────────── the themes ───────────────────────── */

export const THEMES_EXTRAS: Theme[] = [
  {
    id: "spacesky",
    emoji: "🚀",
    color: "#6F8FD6",
    soft: "#EEF1FC",
    t: t("Space & Sky", "太空和天空", "L'espace et le ciel", "Spazio e cielo", "Weltraum und Himmel", "Uzay ve Gökyüzü"),
    chant: [
      { en: "Up in the sky, what do I see?", zh: "在天空中，我看到了什么？", fr: "Là-haut dans le ciel, que vois-je ?", it: "Lassù nel cielo, cosa vedo?", de: "Hoch am Himmel, was seh ich da?", tr: "Gökyüzünde ne görüyorum?" },
      { en: "The sun, the moon, a star for me!", zh: "太阳、月亮，还有一颗星星！", fr: "Le soleil, la lune, une étoile pour moi !", it: "Il sole, la luna, una stella per me!", de: "Die Sonne, der Mond, ein Stern für mich!", tr: "Güneş, ay ve bir yıldız bana!" },
      { en: "Rocket up and zoom, zoom, zoom —", zh: "火箭升空，嗖嗖嗖——", fr: "La fusée monte, zoum, zoum, zoum —", it: "Il razzo sale, zoom, zoom, zoom —", de: "Rakete hoch, zisch, zisch, zisch —", tr: "Roket yukarı, zum zum zum —" },
      { en: "Hello, space! I'll be back soon.", zh: "你好，太空！我很快回来。", fr: "Bonjour l'espace ! À bientôt !", it: "Ciao spazio! Torno presto!", de: "Hallo Weltraum, bis bald!", tr: "Merhaba uzay, yakında dönerim." },
    ],
    subthemes: [sky, space],
  },
  {
    id: "musicdance",
    emoji: "🎶",
    color: "#E8A33D",
    soft: "#FFF6E8",
    t: t("Music & Dance", "音乐和舞蹈", "Musique et danse", "Musica e ballo", "Musik und Tanz", "Müzik ve Dans"),
    chant: [
      { en: "Drum, drum, drum — tap your knees!", zh: "咚咚咚——拍拍膝盖！", fr: "Boum, boum, boum — tape tes genoux !", it: "Bum, bum, bum — batti le ginocchia!", de: "Bumm, bumm, bumm — klopf aufs Knie!", tr: "Dum, dum, dum — dizlerine vur!" },
      { en: "Ding, ding, ding — shake the bells!", zh: "叮叮叮——摇摇铃铛！", fr: "Ding, ding, ding — secoue les cloches !", it: "Din, din, din — scuoti le campane!", de: "Kling, kling, kling — schüttel die Glocken!", tr: "Ding, ding, ding — çanları salla!" },
      { en: "Stand up tall and dance with me,", zh: "站起来，和我一起跳舞，", fr: "Lève-toi et danse avec moi,", it: "Alzati e balla con me,", de: "Steh auf und tanz mit mir,", tr: "Kalk ve benimle dans et," },
      { en: "One, two, three and stop — hooray!", zh: "一、二、三，停——万岁！", fr: "Un, deux, trois et stop — hourra !", it: "Uno, due, tre e stop — urrà!", de: "Eins, zwei, drei und stopp — hurra!", tr: "Bir, iki, üç ve dur — hurra!" },
    ],
    subthemes: [instruments, move],
  },
  {
    id: "babygrow",
    emoji: "🐣",
    color: "#7FBB63",
    soft: "#F2FAEC",
    t: t("Baby Animals & Growing", "动物宝宝和生长", "Bébés animaux et plantes", "Cuccioli e piante", "Tierbabys und Wachsen", "Yavrular ve Büyüme"),
    chant: [
      { en: "The puppy says woof, the kitten says meow,", zh: "小狗汪汪，小猫喵喵，", fr: "Le chiot fait ouaf, le chaton miaou,", it: "Il cucciolo fa bau, il gattino miao,", de: "Der Welpe macht wau, das Kätzchen miau,", tr: "Yavru köpek hav, yavru kedi miyav," },
      { en: "The little chick goes cheep, cheep, cheep!", zh: "小鸡叽叽叽！", fr: "Le petit poussin fait piou, piou, piou !", it: "Il pulcino fa pio, pio, pio!", de: "Das Küken piept, piep, piep!", tr: "Civciv cik cik cik!" },
      { en: "A seed, a sprout, a flower grows,", zh: "一颗种子，一棵嫩芽，一朵花，", fr: "Une graine, une pousse, une fleur,", it: "Un seme, un germoglio, un fiore,", de: "Ein Samen, ein Trieb, eine Blume,", tr: "Bir tohum, bir filiz, bir çiçek," },
      { en: "Water it and watch it go!", zh: "浇浇水，看它长！", fr: "Arrose-la et regarde-la pousser !", it: "Annaffia e guarda crescere!", de: "Gieß es und sieh es wachsen!", tr: "Sula ve büyümesini izle!" },
    ],
    subthemes: [babyanimals, growing],
  },
];

