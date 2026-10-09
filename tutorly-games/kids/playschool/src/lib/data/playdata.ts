import type { Lang } from "./types";

/* ============================================================ MONSTERS */

export type Monster = {
  id: string;
  name: Record<Lang, string>;
  color: string;
  dark: string;
  eyes: number;
  horns: boolean;
  spots: boolean;
  /** playbackRate for the recorded echo */
  pitch: number;
  /** SSML pitch offset for Azure voice */
  ssml: string;
  vibe: Record<Lang, string>;
  noise: "squeak" | "rumble" | "wobble" | "beep";
};

export const MONSTERS: Monster[] = [
  {
    id: "blip",
    name: { en: "Blip", zh: "哔哔", fr: "Blip", it: "Blip", de: "Blip", tr: "Bip" },
    color: "#8fbe9b", dark: "#5e926c", eyes: 1, horns: false, spots: false,
    pitch: 1.55, ssml: "+25%", noise: "squeak",
    vibe: { en: "tiny and squeaky", zh: "又小又尖", fr: "tout petit et aigu", it: "piccolissimo e acuto", de: "ganz klein und piepsig", tr: "minik ve tiz" },
  },
  {
    id: "grumbo",
    name: { en: "Grumbo", zh: "咕噜", fr: "Grumbo", it: "Grumbo", de: "Grumbo", tr: "Grumbo" },
    color: "#7fb2de", dark: "#4d7fae", eyes: 3, horns: true, spots: true,
    pitch: 0.68, ssml: "-22%", noise: "rumble",
    vibe: { en: "big and rumbly", zh: "又大又响", fr: "énorme et grave", it: "grande e profondo", de: "groß und brummig", tr: "kocaman ve gürleyen" },
  },
  {
    id: "wobbles",
    name: { en: "Wobbles", zh: "摇摇", fr: "Wobbles", it: "Wobbles", de: "Wackel", tr: "Wobbles" },
    color: "#b394d6", dark: "#8364a8", eyes: 2, horns: false, spots: true,
    pitch: 1.25, ssml: "+12%", noise: "wobble",
    vibe: { en: "wobbly and silly", zh: "摇摇晃晃真滑稽", fr: "qui vacille et rigole", it: "barcollante e buffo", de: "wackelig und albern", tr: "titrek ve komik" },
  },
  {
    id: "zing",
    name: { en: "Zing", zh: "闪闪", fr: "Zing", it: "Zing", de: "Zing", tr: "Zing" },
    color: "#f5c453", dark: "#c69322", eyes: 4, horns: true, spots: false,
    pitch: 1.8, ssml: "+35%", noise: "beep",
    vibe: { en: "fast and beepy", zh: "又快又会哔哔叫", fr: "rapide et robotique", it: "veloce e robotico", de: "schnell und piepsend", tr: "hızlı ve bip bip" },
  },
  {
    id: "moo",
    name: { en: "Snugglepuff", zh: "抱抱", fr: "Snugglepuff", it: "Snugglepuff", de: "Kuschelpuff", tr: "Snugglepuff" },
    color: "#e86a8a", dark: "#bb3f61", eyes: 2, horns: false, spots: false,
    pitch: 0.9, ssml: "-5%", noise: "squeak",
    vibe: { en: "soft and cuddly", zh: "软软的想抱抱", fr: "tout doux", it: "morbido e coccoloso", de: "weich und kuschelig", tr: "yumuşacık" },
  },
  {
    id: "echo",
    name: { en: "Echo", zh: "回声", fr: "Écho", it: "Eco", de: "Echo", tr: "Yankı" },
    color: "#f2836b", dark: "#c85f45", eyes: 2, horns: true, spots: false,
    pitch: 1.0, ssml: "+8%", noise: "wobble",
    vibe: { en: "copies every word you say", zh: "你说什么它就说什么", fr: "répète tout ce que tu dis", it: "ripete tutto quello che dici", de: "wiederholt alles, was du sagst", tr: "söylediğin her şeyi tekrar eder" },
  },
];

/* ============================================================ EMOTION FACES */

export type FaceParams = {
  browAngle: number; // -1 .. 1  (inner end up/down)
  browY: number; // -1 .. 1
  eyeOpen: number; // 0.1 .. 1
  eyeSize: number; // 0.6 .. 1.4
  mouthCurve: number; // -1 (sad) .. 1 (happy)
  mouthOpen: number; // 0 .. 1
  mouthW: number; // 0.5 .. 1.4
  blush: number; // 0 .. 1
  tears: number; // 0 .. 1
  brows: boolean;
  tongue: boolean;
  zzz: boolean;
};

export type EmotionFace = {
  id: string;
  key: string;
  face: FaceParams;
  ccq: string;
  when: string;
};

const F = (p: Partial<FaceParams>): FaceParams => ({
  browAngle: 0, browY: 0, eyeOpen: 1, eyeSize: 1, mouthCurve: 0.4, mouthOpen: 0,
  mouthW: 1, blush: 0, tears: 0, brows: true, tongue: false, zzz: false,
  ...p,
});

export const EMOTION_FACES: EmotionFace[] = [
  { id: "happy", key: "happy", ccq: "ccq.isHappy", when: "when you get a present",
    face: F({ browAngle: 0.2, browY: -0.15, mouthCurve: 0.95, mouthOpen: 0.5, mouthW: 1.2, blush: 0.5 }) },
  { id: "sad", key: "sad", ccq: "ccq.isHappy", when: "when your balloon flies away",
    face: F({ browAngle: -0.75, browY: 0.2, eyeOpen: 0.75, mouthCurve: -0.85, mouthW: 1, tears: 0.35 }) },
  { id: "angry", key: "angry", ccq: "ccq.isHappy", when: "when someone takes your toy",
    face: F({ browAngle: -0.95, browY: -0.2, eyeOpen: 0.7, eyeSize: 0.9, mouthCurve: -0.55, mouthOpen: 0.35, mouthW: 1.1 }) },
  { id: "scared", key: "scared", ccq: "ccq.isHappy", when: "when it is very dark",
    face: F({ browAngle: 0.85, browY: -0.35, eyeOpen: 1, eyeSize: 1.35, mouthCurve: -0.2, mouthOpen: 0.9, mouthW: 0.85, blush: 0.25 }) },
  { id: "surprised", key: "surprised", ccq: "ccq.isHappy", when: "when you see a big spider",
    face: F({ browAngle: 0.6, browY: -0.45, eyeOpen: 1, eyeSize: 1.4, mouthCurve: 0, mouthOpen: 1, mouthW: 0.7 }) },
  { id: "tired", key: "tired", ccq: "ccq.isHappy", when: "after playing outside all day",
    face: F({ browAngle: -0.3, browY: 0.3, eyeOpen: 0.28, eyeSize: 1, mouthCurve: -0.25, mouthW: 0.8, zzz: true }) },
  { id: "sleepy", key: "sleepy", ccq: "ccq.isHappy", when: "when it is bedtime",
    face: F({ browAngle: -0.15, browY: 0.35, eyeOpen: 0.12, mouthOpen: 0.35, mouthCurve: 0.1, mouthW: 0.75, zzz: true }) },
  { id: "sick", key: "sick", ccq: "ccq.isHappy", when: "when you have a cold",
    face: F({ browAngle: -0.5, browY: 0.22, eyeOpen: 0.45, mouthCurve: -0.5, mouthW: 0.85, blush: 0.7 }) },
  { id: "love", key: "love", ccq: "ccq.isHappy", when: "when you hug your mummy",
    face: F({ browAngle: 0.35, browY: -0.2, eyeOpen: 0.45, eyeSize: 1.15, mouthCurve: 0.85, mouthOpen: 0.3, blush: 0.85 }) },
  { id: "proud", key: "proud", ccq: "ccq.isHappy", when: "when you build a tall tower",
    face: F({ browAngle: 0.5, browY: -0.3, eyeOpen: 0.85, mouthCurve: 0.6, mouthOpen: 0.15, mouthW: 1.05, blush: 0.35 }) },
];

/* ============================================================ CHARADES */

export type Charade = {
  id: string;
  art: string;
  hint: Record<Lang, string>;
  sound: Record<Lang, string>;
  place: string;
};

const C = (id: string, art: string, hint: [string, string, string, string, string, string], sound: [string, string, string, string, string, string], place: string): Charade => ({
  id, art, place,
  hint: { en: hint[0], zh: hint[1], fr: hint[2], it: hint[3], de: hint[4], tr: hint[5] },
  sound: { en: sound[0], zh: sound[1], fr: sound[2], it: sound[3], de: sound[4], tr: sound[5] },
});

export const CHARADES: Charade[] = [
  C("run", "🏃", ["run on the spot", "在原地跑", "cours sur place", "corri sul posto", "lauf auf der Stelle", "yerinde koş"], ["tap tap tap", "哒哒哒", "tap tap tap", "tatata", "tapp tapp tapp", "tak tak tak"], "in the park"),
  C("jump", "🦘", ["jump up and down", "上下跳", "saute", "salta", "hüpf", "zıpla"], ["boing boing", "嘣嘣", "boing boing", "boing boing", "boing boing", "bonc bonc"], "on the bed"),
  C("walk", "🚶", ["walk slowly", "慢慢地走", "marche lentement", "cammina piano", "geh langsam", "yavaş yürü"], ["step step", "踏踏", "pas pas", "passo passo", "Schritt Schritt", "adım adım"], "to school"),
  C("swim", "🏊", ["move your arms like swimming", "像游泳一样摆动手臂", "nage avec les bras", "nuota con le braccia", "schwimm mit den Armen", "kollarınla yüz"], ["splash splash", "哗哗", "splash splash", "splash splash", "platsch platsch", "çaş çaş"], "in the sea"),
  C("fly", "🕊️", ["stretch your arms like wings", "张开手臂像翅膀", "étends les bras comme des ailes", "apri le braccia come ali", "streck die Arme wie Flügel", "kollarını kanat gibi aç"], ["flap flap", "扑扑", "flap flap", "flap flap", "flatter flatter", "çırp çırp"], "in the sky"),
  C("clap", "👏", ["clap your hands", "拍拍手", "tape des mains", "batti le mani", "klatsch in die Hände", "alkışla"], ["clap clap", "啪啪", "clap clap", "clap clap", "klatsch klatsch", "pat pat"], "at a party"),
  C("sing", "🎤", ["sing la la la", "唱啦啦啦", "chante la la la", "canta la la la", "sing la la la", "la la la söyle"], ["la la la", "啦啦啦", "la la la", "la la la", "la la la", "la la la"], "in the classroom"),
  C("dance", "💃", ["dance and wiggle", "跳舞扭一扭", "danse et remue", "balla e scuolati", "tanz und wackel", "dans et sallan"], ["shuffle shuffle", "嚓嚓", "chhh chhh", "sci sci", "schuff schuff", "şış şış"], "at a birthday"),
  C("draw", "✏️", ["draw in the air", "在空中画画", "dessine en l'air", "disegna in aria", "mal in die Luft", "havaya çiz"], ["scratch scratch", "沙沙", "scribble scribble", "scarabocchio", "kritzel kritzel", "kırış kırış"], "at the table"),
  C("sleep", "😴", ["close your eyes and snore", "闭眼打呼噜", "ferme les yeux et ronfle", "chiudi gli occhi e russa", "mach die Augen zu und schnarch", "gözünü kapat horula"], ["snore snore", "呼噜呼噜", "ronf ronf", "ronf ronf", "schnarch schnarch", "horul horul"], "in the bedroom"),
  C("eat", "🍽️", ["pretend to eat with a spoon", "假装用勺子吃饭", "mange avec une cuillère", "mangia con il cucchiaio", "iss mit dem Löffel", "kaşıkla ye"], ["yum yum yum", "好吃好吃", "miam miam", "gnam gnam", "mjam mjam", "nam nam"], "at lunch"),
  C("drink", "🥤", ["pretend to drink a big glass", "假装喝一大杯", "bois un grand verre", "bevi un grande bicchiere", "trink ein großes Glas", "büyük bir bardak iç"], ["glug glug", "咕嘟咕嘟", "glou glou", "glu glu", "gluck gluck", "gurl gurl"], "in the kitchen"),
  C("wash", "🧼", ["rub your hands together", "搓搓手", "frotte tes mains", "strofina le mani", "reib die Hände", "ellerini ovuştur"], ["squish squish", "搓搓", "splash splash", "squish squish", "schubb schubb", "köp köp"], "at the sink"),
  C("brush", "🪥", ["brush your teeth", "刷刷牙", "brosse tes dents", "lavati i denti", "putz die Zähne", "dişlerini fırçala"], ["scribble scribble", "唰唰", "bross bross", "fruscio", "wischi wischi", "fırş fırş"], "in the bathroom"),
  C("hug", "🤗", ["give a big hug", "给一个大大的拥抱", "fait un gros câlin", "fai un abbraccio", "gib eine Umarmung", "kocaman sarıl"], ["squeeeeze", "抱紧", "serrrrre", "squeeese", "quuuetsch", "sıkııı"], "with mummy"),
  C("wave", "👋", ["wave hello", "挥手问好", "fais coucou", "saluta", "wink Hallo", "selam ver"], ["hi hi hi", "嗨嗨嗨", "coucou coucou", "ciao ciao", "hallo hallo", "selam selam"], "at the window"),
  C("kick", "🦵", ["kick a big ball", "踢大球", "tape dans le ballon", "calcia la palla", "kick den Ball", "topa tekme at"], ["boom boom", "砰砰", "boum boum", "bum bum", "bumm bumm", "bom bom"], "on the playground"),
  C("throw", "🤾", ["throw the ball high", "把球扔高", "lance le ballon haut", "lancia la palla in alto", "wirf den Ball hoch", "topu yukarı at"], ["whoosh", "嗖", "whoosh", "vrum", "wusch", "vınn"], "in the garden"),
  C("read", "📖", ["open a book and read", "打开书读一读", "ouvre un livre et lis", "apri un libro e leggi", "öffne ein Buch und lies", "kitap aç ve oku"], ["shhh page", "哗啦", "chut la page", "sfoglia", "blätter", "şşş sayfa"], "in the library"),
  C("cook", "🥣", ["stir a big pot", "搅拌大锅", "remue la marmite", "mescola la pentola", "rühre den Topf", "tencereyi karıştır"], ["bubble bubble", "咕嘟咕嘟", "bouillon bouillon", "bolle bolle", "blub blub", "gaın gaın"], "in the kitchen"),
  C("climb", "🧗", ["climb up a ladder", "爬梯子", "grimpe à l'échelle", "sulla sulla scala", "kletter die Leiter", "merdivene tırman"], ["up up up", "爬爬爬", "haut haut haut", "sù sù sù", "hoch hoch hoch", "yukarı yukarı"], "at the playground"),
  C("hide", "🙈", ["hide behind your hands", "用手挡住脸躲起来", "cache-toi derrière tes mains", "nasconditi dietro le mani", "versteck dich hinter den Händen", "ellerinin arkasına saklan"], ["hehe you can't see me", "嘻嘻你看不到我", "hé hé tu ne me vois pas", "eh eh non mi vedi", "hi hi du siehst mich nicht", "he he beni göremiyorsun"], "behind the curtain"),
  C("sit", "🪑", ["sit down gently", "轻轻地坐下", "assieds-toi doucement", "siediti piano", "setz dich langsam", "yavaşça otur"], ["plop", "扑通", "plop", "plop", "plumps", "pört"], "on the chair"),
  C("stand", "🧍", ["stand up tall", "站得高高的", "lève-toi bien droit", "alzati su", "steh ganz aufrecht", "dimdik ayağa kalk"], ["ta-da", "当当", "ta-da", "tadà", "tata", "ta da"], "in the classroom"),
  C("wakeup", "🌅", ["stretch and wake up", "伸懒腰起床", "étire-toi et réveille-toi", "stirati e svegliati", "reck dich und wach auf", "geril ve uyan"], ["yaaawn", "哈——", "aaah", "aahh", "gääähn", "haaah"], "in the morning"),
  C("ride", "🚴", ["ride a bike", "骑自行车", "fais du vélo", "pedala in bici", "fahr Fahrrad", "bisiklet sür"], ["ring ring", "叮叮", "dring dring", "din din", "kling kling", "zın zın"], "in the street"),
  C("catch", "🥎", ["catch a big ball", "接住大球", "attrape le ballon", "prendi la palla", "fang den Ball", "topu tut"], ["gotcha", "接到啦", "attrapé", "preso", "hab dich", "yakaladım"], "at the park"),
  C("point", "👉", ["point at something far away", "指向远处的东西", "montre quelque chose de loin", "indica qualcosa lontano", "zeig auf etwas Weites", "uzaktaki bir şeyi göster"], ["look look", "看看", "regarde regarde", "guarda guarda", "guck guck", "bak bak"], "out of the window"),
];

/* ============================================================ SENTENCE TRAIN */

export type Cargo = { id: string; slot: "who" | "do" | "what" | "where"; en: string; art?: string; zh: string; fr: string; it: string; de: string; tr: string };

const K = (
  id: string,
  slot: Cargo["slot"],
  en: string,
  art: string | undefined,
  tr: [string, string, string, string, string, string],
): Cargo => ({
  id,
  slot,
  en,
  art,
  zh: tr[1],
  fr: tr[2],
  it: tr[3],
  de: tr[4],
  tr: tr[5],
});

export const CARGO: Cargo[] = [
  K("who_i", "who", "I", "🧒", ["I", "我", "je", "io", "ich", "ben"]),
  K("who_mum", "who", "my mummy", "👩", ["my mummy", "我妈妈", "ma maman", "la mia mamma", "meine Mama", "annem"]),
  K("who_dad", "who", "my daddy", "👨", ["my daddy", "我爸爸", "mon papa", "il mio papà", "mein Papa", "babam"]),
  K("who_cat", "who", "the cat", "🐱", ["the cat", "小猫", "le chat", "il gatto", "die Katze", "kedi"]),
  K("who_dog", "who", "the dog", "🐶", ["the dog", "小狗", "le chien", "il cane", "der Hund", "köpek"]),
  K("who_bear", "who", "the bear", "🐻", ["the bear", "熊", "l'ours", "l'orso", "der Bär", "ayı"]),
  K("who_teacher", "who", "the teacher", "🧑‍🏫", ["the teacher", "老师", "le maître", "la maestra", "die Lehrerin", "öğretmen"]),
  K("who_baby", "who", "the baby", "👶", ["the baby", "宝宝", "le bébé", "il bebè", "das Baby", "bebek"]),

  K("do_like", "do", "like", undefined, ["like", "喜欢", "aime", "mi piace", "mag", "severim"]),
  K("do_see", "do", "see", undefined, ["see", "看见", "vois", "vedo", "sehe", "görür"]),
  K("do_eat", "do", "eat", undefined, ["eat", "吃", "mange", "mangia", "esse", "yer"]),
  K("do_drink", "do", "drink", undefined, ["drink", "喝", "bois", "beve", "trinke", "içer"]),
  K("do_read", "do", "read", undefined, ["read", "读", "lis", "legge", "liest", "okur"]),
  K("do_hug", "do", "hug", undefined, ["hug", "抱", "câline", "abbraccia", "umarmt", "sarılır"]),
  K("do_wash", "do", "wash", undefined, ["wash", "洗", "lave", "lava", "wäscht", "yıkar"]),
  K("do_open", "do", "open", undefined, ["open", "打开", "ouvre", "apre", "öffnet", "açar"]),
  K("do_play", "do", "play", undefined, ["play", "玩", "joue avec", "gioca con", "spielt mit", "oynar"]),

  K("what_apple", "what", "an apple", "🍎", ["an apple", "一个苹果", "une pomme", "una mela", "einen Apfel", "elma"]),
  K("what_banana", "what", "a banana", "🍌", ["a banana", "一根香蕉", "une banane", "una banana", "eine Banane", "muz"]),
  K("what_milk", "what", "milk", "🥛", ["milk", "牛奶", "du lait", "il latte", "Milch", "süt"]),
  K("what_water", "what", "water", "💧", ["water", "水", "de l'eau", "l'acqua", "Wasser", "su"]),
  K("what_book", "what", "a book", "📖", ["a book", "一本书", "un livre", "un libro", "ein Buch", "kitap"]),
  K("what_ball", "what", "a ball", "⚽", ["a ball", "一个球", "un ballon", "una palla", "einen Ball", "top"]),
  K("what_cake", "what", "cake", "🍰", ["cake", "蛋糕", "le gâteau", "la torta", "Kuchen", "kek"]),
  K("what_teddy", "what", "my teddy", "🧸", ["my teddy", "我的泰迪熊", "mon doudou", "il mio orsetto", "meinen Teddy", "oyuncak ayım"]),
  K("what_icecream", "what", "ice cream", "🍦", ["ice cream", "冰淇淋", "la glace", "il gelato", "Eis", "dondurma"]),
  K("what_cup", "what", "a cup", "🥤", ["a cup", "一个杯子", "une tasse", "una tazza", "eine Tasse", "fincan"]),

  K("where_home", "where", "at home", "🏠", ["at home", "在家里", "à la maison", "a casa", "zu Hause", "evde"]),
  K("where_park", "where", "in the park", "🌳", ["in the park", "在公园里", "dans le parc", "al parco", "im Park", "parkta"]),
  K("where_school", "where", "at school", "🏫", ["at school", "在学校里", "à l'école", "a scuola", "in der Schule", "okulda"]),
  K("where_garden", "where", "in the garden", "🌷", ["in the garden", "在花园里", "dans le jardin", "in giardino", "im Garten", "bahçede"]),
  K("where_zoo", "where", "at the zoo", "🐒", ["at the zoo", "在动物园里", "au zoo", "allo zoo", "im Zoo", "hayvanat bahçesinde"]),
  K("where_kitchen", "where", "in the kitchen", "🍳", ["in the kitchen", "在厨房里", "dans la cuisine", "in cucina", "in der Küche", "mutfakta"]),
  K("where_bed", "where", "in bed", "🛏️", ["in bed", "在床上", "au lit", "a letto", "im Bett", "yatakta"]),
  K("where_bath", "where", "in the bath", "🛁", ["in the bath", "在浴缸里", "dans le bain", "nel bagno", "in der Badewanne", "küvette"]),
];

/** ad-hoc alias so the K helper's tuple maps cleanly */
type CargoX = Cargo & { tr2?: never };

export const CARGO_BY_SLOT = (slot: Cargo["slot"]) => CARGO.filter((c) => c.slot === slot);

export function cargoLabel(c: Cargo, lang: Lang): string {
  const map: Record<Lang, string> = {
    en: c.en, zh: c.zh, fr: c.fr, it: c.it, de: c.de, tr: (c as CargoX).tr2 ?? c.tr,
  };
  return map[lang] ?? c.en;
}

/* ============================================================ DOLLHOUSE PREPOSITIONS */

export type Spot = {
  id: string;
  prep: string; // phrase key
  furnKey: string; // furniture phrase key
  /** cat centre when snapped, viewBox 0 0 200 140 */
  x: number;
  y: number;
  /** drop target rect */
  rx: number;
  ry: number;
  rw: number;
  rh: number;
};

export type Room = {
  id: string;
  nameKey: string;
  wall: string;
  floor: string;
  spots: Spot[];
};

export const ROOMS: Room[] = [
  {
    id: "bedroom",
    nameKey: "unit.rooms",
    wall: "#f6e7d4",
    floor: "#e0c9a6",
    spots: [
      { id: "in_box", prep: "house.in", furnKey: "house.box", x: 40, y: 96, rx: 22, ry: 78, rw: 40, rh: 34 },
      { id: "on_bed", prep: "house.on", furnKey: "house.bed", x: 138, y: 62, rx: 104, ry: 48, rw: 78, rh: 24 },
      { id: "under_bed", prep: "house.under", furnKey: "house.bed", x: 142, y: 118, rx: 106, ry: 104, rw: 74, rh: 22 },
      { id: "behind_curtain", prep: "house.behind", furnKey: "house.curtain", x: 180, y: 62, rx: 166, ry: 14, rw: 30, rh: 96 },
      { id: "nextto_lamp", prep: "house.nextto", furnKey: "house.lamp", x: 84, y: 92, rx: 66, ry: 74, rw: 34, rh: 34 },
    ],
  },
  {
    id: "livingroom",
    nameKey: "unit.rooms",
    wall: "#e4eefa",
    floor: "#cdb79a",
    spots: [
      { id: "on_sofa", prep: "house.on", furnKey: "house.chair", x: 132, y: 84, rx: 100, ry: 66, rw: 84, rh: 28 },
      { id: "under_table", prep: "house.under", furnKey: "house.table", x: 52, y: 116, rx: 22, ry: 100, rw: 62, rh: 22 },
      { id: "on_table", prep: "house.on", furnKey: "house.table", x: 52, y: 82, rx: 22, ry: 66, rw: 62, rh: 22 },
      { id: "behind_plant", prep: "house.behind", furnKey: "house.plant", x: 182, y: 74, rx: 166, ry: 44, rw: 30, rh: 62 },
      { id: "in_box", prep: "house.in", furnKey: "house.box", x: 26, y: 128, rx: 8, ry: 112, rw: 38, rh: 24 },
    ],
  },
  {
    id: "kitchen",
    nameKey: "unit.rooms",
    wall: "#e2f0e5",
    floor: "#d9c3a5",
    spots: [
      { id: "in_box", prep: "house.in", furnKey: "house.box", x: 40, y: 74, rx: 20, ry: 56, rw: 42, rh: 34 },
      { id: "on_table", prep: "house.on", furnKey: "house.table", x: 116, y: 88, rx: 88, ry: 70, rw: 74, rh: 24 },
      { id: "under_table", prep: "house.under", furnKey: "house.table", x: 116, y: 120, rx: 88, ry: 104, rw: 74, rh: 22 },
      { id: "nextto_lamp", prep: "house.nextto", furnKey: "house.lamp", x: 182, y: 66, rx: 164, ry: 46, rw: 32, rh: 40 },
      { id: "between", prep: "house.between", furnKey: "house.box", x: 76, y: 128, rx: 58, ry: 110, rw: 38, rh: 26 },
    ],
  },
];

/* ============================================================ DRESSING ROOM */

export type Garment = {
  id: string;
  en: string;
  art: string;
  layer: number; // draw order
  /** SVG path in a 200x260 figure space */
  path: string;
  tintable: boolean;
  zh: string; fr: string; it: string; de: string; tr: string;
};

export const GARMENTS: Garment[] = [
  { id: "hat", en: "hat", art: "🧢", layer: 6, tintable: true, path: "M74 62 Q100 26 126 62 L132 66 L68 66 Z", zh: "帽子", fr: "chapeau", it: "cappello", de: "Hut", tr: "şapka" },
  { id: "scarf", en: "scarf", art: "🧣", layer: 5, tintable: true, path: "M86 84 L114 84 L110 122 Q100 128 90 122 Z", zh: "围巾", fr: "écharpe", it: "sciarpa", de: "Schal", tr: "atkı" },
  { id: "shirt", en: "shirt", art: "👕", layer: 2, tintable: true, path: "M78 86 L60 96 L52 148 L68 152 L68 190 L132 190 L132 152 L148 148 L140 96 L122 86 Q100 104 78 86 Z", zh: "衬衫", fr: "chemise", it: "camicia", de: "Hemd", tr: "gömlek" },
  { id: "dress", en: "dress", art: "👗", layer: 2, tintable: true, path: "M80 86 L62 96 L48 196 L152 196 L138 96 L120 86 Q100 104 80 86 Z", zh: "连衣裙", fr: "robe", it: "vestito", de: "Kleid", tr: "elbise" },
  { id: "coat", en: "coat", art: "🧥", layer: 3, tintable: true, path: "M76 86 L54 98 L46 172 L66 176 L66 200 L134 200 L134 176 L154 172 L146 98 L124 86 L100 108 Z", zh: "外套", fr: "manteau", it: "cappotto", de: "Mantel", tr: "palto" },
  { id: "pants", en: "trousers", art: "👖", layer: 1, tintable: true, path: "M68 186 L132 186 L136 248 L114 248 L100 206 L86 248 L64 248 Z", zh: "裤子", fr: "pantalon", it: "pantaloni", de: "Hose", tr: "pantolon" },
  { id: "socks", en: "socks", art: "🧦", layer: 4, tintable: true, path: "M74 210 L92 210 L92 244 L74 244 Z M108 210 L126 210 L126 244 L108 244 Z", zh: "袜子", fr: "chaussettes", it: "calzini", de: "Socken", tr: "çorap" },
  { id: "shoes", en: "shoes", art: "👟", layer: 5, tintable: true, path: "M70 244 L94 244 L96 256 L70 256 Z M106 244 L130 244 L130 256 L106 256 Z", zh: "鞋子", fr: "chaussures", it: "scarpe", de: "Schuhe", tr: "ayakkabı" },
  { id: "gloves", en: "gloves", art: "🧤", layer: 5, tintable: true, path: "M44 130 L60 130 L60 158 L44 158 Z M140 130 L156 130 L156 158 L140 158 Z", zh: "手套", fr: "gants", it: "guanti", de: "Handschuhe", tr: "eldiven" },
  { id: "skirt", en: "skirt", art: "🩱", layer: 1, tintable: true, path: "M70 178 L130 178 L142 214 L58 214 Z", zh: "裙子", fr: "jupe", it: "gonna", de: "Rock", tr: "etek" },
];

export type Adjective = {
  id: string;
  en: string;
  key?: string;
  color?: string;
  scale?: number;
  pattern?: "none" | "dots" | "stripes" | "checks";
  art: string;
  zh: string; fr: string; it: string; de: string; tr: string;
};

export const ADJECTIVES: Adjective[] = [
  { id: "red", en: "red", color: "#e4573d", art: "🔴", zh: "红色的", fr: "rouge", it: "rosso", de: "rot", tr: "kırmızı" },
  { id: "blue", en: "blue", color: "#4c8fd1", art: "🔵", zh: "蓝色的", fr: "bleu", it: "blu", de: "blau", tr: "mavi" },
  { id: "yellow", en: "yellow", color: "#f5c453", art: "🟡", zh: "黄色的", fr: "jaune", it: "giallo", de: "gelb", tr: "sarı" },
  { id: "green", en: "green", color: "#79b473", art: "🟢", zh: "绿色的", fr: "vert", it: "verde", de: "grün", tr: "yeşil" },
  { id: "purple", en: "purple", color: "#9b72cf", art: "🟣", zh: "紫色的", fr: "violet", it: "viola", de: "lila", tr: "mor" },
  { id: "pink", en: "pink", color: "#f19cb4", art: "🌸", zh: "粉色的", fr: "rose", it: "rosa", de: "rosa", tr: "pembe" },
  { id: "big", en: "big", scale: 1.22, art: "🐘", zh: "大的", fr: "grand", it: "grande", de: "groß", tr: "büyük" },
  { id: "small", en: "small", scale: 0.78, art: "🐭", zh: "小的", fr: "petit", it: "piccolo", de: "klein", tr: "küçük" },
  { id: "long", en: "long", scale: 1.34, art: "🐍", zh: "长的", fr: "long", it: "lungo", de: "lang", tr: "uzun" },
  { id: "spotty", en: "spotty", pattern: "dots", art: "🐞", zh: "有圆点的", fr: "à pois", it: "a pois", de: "gepunktet", tr: "benekli" },
  { id: "stripy", en: "stripy", pattern: "stripes", art: "🦓", zh: "有条纹的", fr: "à rayures", it: "a strisce", de: "gestreift", tr: "çizgili" },
  { id: "checky", en: "checky", pattern: "checks", art: "🟪", zh: "有格子的", fr: "à carreaux", it: "a quadri", de: "kariert", tr: "kareli" },
  { id: "fluffy", en: "fluffy", color: "#f2ddc4", art: "🐑", zh: "毛绒绒的", fr: "duveteux", it: "soffice", de: "flauschig", tr: "tüylü" },
  { id: "new", en: "new", color: "#8fbe9b", art: "✨", zh: "新的", fr: "neuf", it: "nuovo", de: "neu", tr: "yeni" },
];

export function adjLabel(a: Adjective, lang: Lang): string {
  return ({ en: a.en, zh: a.zh, fr: a.fr, it: a.it, de: a.de, tr: a.tr } as Record<Lang, string>)[lang] ?? a.en;
}

export function garmentLabel(g: Garment, lang: Lang): string {
  return ({ en: g.en, zh: g.zh, fr: g.fr, it: g.it, de: g.de, tr: g.tr } as Record<Lang, string>)[lang] ?? g.en;
}

/* ============================================================ SCAVENGER HUNTS */

export type HuntItem = { id: string; art: string; prompt: string; ccq: string; fallbackId?: string };

export type Hunt = {
  id: string;
  nameKey: string;
  color: string;
  items: HuntItem[];
};

const I = (id: string, art: string, prompt: string, ccq: string, fallbackId?: string): HuntItem => ({ id, art, prompt, ccq, fallbackId });

export const HUNTS: Hunt[] = [
  {
    id: "colors", nameKey: "unit.colors", color: "#f2836b",
    items: [
      I("red", "🔴", "something RED", "ccq.whichColor", "red"),
      I("blue", "🔵", "something BLUE", "ccq.whichColor", "blue"),
      I("yellow", "🟡", "something YELLOW", "ccq.whichColor", "yellow"),
      I("green", "🟢", "something GREEN", "ccq.whichColor", "green"),
      I("white", "⚪", "something WHITE", "ccq.whichColor", "white"),
      I("brown", "🟤", "something BROWN", "ccq.whichColor", "brown"),
    ],
  },
  {
    id: "shapes", nameKey: "unit.shapes", color: "#7fb2de",
    items: [
      I("circle", "⭕", "a CIRCLE", "ccq.whatIsThis", "circle"),
      I("square", "🟧", "a SQUARE", "ccq.whatIsThis", "square"),
      I("triangle", "🔺", "a TRIANGLE", "ccq.whatIsThis", "triangle"),
      I("rectangle", "🟦", "a RECTANGLE", "ccq.whatIsThis", "rectangle"),
      I("star", "⭐", "a STAR shape", "ccq.whatIsThis", "star"),
    ],
  },
  {
    id: "letters", nameKey: "unit.alphabet", color: "#8fbe9b",
    items: [
      I("A", "🅰️", "the letter A", "ccq.whatSound", "lettera"),
      I("B", "🅱️", "the letter B", "ccq.whatSound", "letterb"),
      I("M", "Ⓜ️", "the letter M", "ccq.whatSound", "letterm"),
      I("S", "💧", "the letter S", "ccq.whatSound", "letters"),
      I("O", "⭕", "the letter O", "ccq.whatSound", "lettero"),
    ],
  },
  {
    id: "numbers", nameKey: "unit.num10", color: "#f5c453",
    items: [
      I("1", "1️⃣", "ONE thing", "ccq.howMany", "num1"),
      I("2", "2️⃣", "TWO things", "ccq.howMany", "num2"),
      I("3", "3️⃣", "THREE things", "ccq.howMany", "num3"),
      I("5", "5️⃣", "FIVE things", "ccq.howMany", "num5"),
      I("10", "🔟", "TEN things", "ccq.howMany", "num10"),
    ],
  },
  {
    id: "toys", nameKey: "unit.toys", color: "#b394d6",
    items: [
      I("ball", "⚽", "a ball", "ccq.isThing", "ball"),
      I("teddy", "🧸", "a teddy bear", "ccq.isThing", "teddy"),
      I("book", "📖", "a book", "ccq.isThing", "book"),
      I("blocks", "🧱", "some blocks", "ccq.isThing", "blocks"),
      I("phone", "📱", "a phone", "ccq.isThing", "phone"),
    ],
  },
  {
    id: "body", nameKey: "unit.body", color: "#e86a8a",
    items: [
      I("hand", "✋", "a hand", "ccq.isBody", "hand"),
      I("foot", "🦶", "a foot", "ccq.isBody", "foot"),
      I("nose", "👃", "a nose", "ccq.isBody", "nose"),
      I("ear", "👂", "an ear", "ccq.isBody", "ear"),
      I("hair", "💇", "hair", "ccq.isBody", "hair"),
    ],
  },
  {
    id: "food", nameKey: "unit.food", color: "#8fbe9b",
    items: [
      I("apple", "🍎", "a fruit", "ccq.canEat", "apple"),
      I("bread", "🍞", "some bread", "ccq.canEat", "bread"),
      I("cup", "🥤", "a cup", "ccq.canDrink", "cup"),
      I("spoon", "🥄", "a spoon", "ccq.isThing", "spoon"),
      I("milk", "🥛", "something to drink", "ccq.canDrink", "milk"),
    ],
  },
  {
    id: "clothes", nameKey: "unit.clothes", color: "#7fb2de",
    items: [
      I("shoes", "👟", "some shoes", "ccq.isClothes", "shoes"),
      I("socks", "🧦", "some socks", "ccq.isClothes", "socks"),
      I("hat", "🧢", "a hat", "ccq.isClothes", "hat"),
      I("shirt", "👕", "a shirt", "ccq.isClothes", "shirt"),
      I("coat", "🧥", "a coat", "ccq.isClothes", "coat"),
    ],
  },
  {
    id: "feelings", nameKey: "unit.feelings", color: "#f5c453",
    items: [
      I("happy", "😀", "a HAPPY face", "ccq.isHappy", "happy"),
      I("sad", "😢", "a SAD face", "ccq.isHappy", "sad"),
      I("angry", "😠", "an ANGRY face", "ccq.isHappy", "angry"),
      I("surprised", "😲", "a SURPRISED face", "ccq.isHappy", "surprised"),
      I("sleepy", "😴", "a SLEEPY face", "ccq.isHappy", "sleepy"),
    ],
  },
  {
    id: "nature", nameKey: "unit.plants", color: "#79b473",
    items: [
      I("tree", "🌳", "a tree", "ccq.whatIsThis", "tree"),
      I("flower", "🌸", "a flower", "ccq.whatIsThis", "flower"),
      I("leaf", "🍃", "a leaf", "ccq.whatIsThis", "leaf"),
      I("grass", "🌱", "some grass", "ccq.whatIsThis", "grass"),
      I("stone", "🪨", "a small stone", "ccq.whatIsThis", "seed"),
    ],
  },
];
