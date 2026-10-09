import { W, makeWords, t, inBin, withSound } from "../wordKit";
import type { Bin, Subtheme } from "../types";

const classroom = makeWords(
  "classroom",
  [
    W("🏫", "school", "学校", "xuéxiào", "l'école", "la scuola", "die Schule", "okul"),
    W("👩‍🏫", "teacher", "老师", "lǎoshī", "la maîtresse", "la maestra", "die Lehrerin", "öğretmen"),
    W("📕", "book", "书", "shū", "le livre", "il libro", "das Buch", "kitap"),
    W("🪑", "chair", "椅子", "yǐzi", "la chaise", "la sedia", "der Stuhl", "sandalye"),
    W("🎒", "school bag", "书包", "shūbāo", "le sac d'école", "lo zaino", "die Schultasche", "okul çantası"),
    withSound(W("🔔", "bell", "铃", "líng", "la cloche", "la campanella", "die Glocke", "zil"), "Ding dong!", "叮当叮当！", "Ding dong !", "Din don!", "Bimm bamm!", "Ding dong!"),
    W("🎨", "paint", "颜料", "yánliào", "la peinture", "i colori", "die Farbe", "boya"),
    W("🎵", "song", "歌", "gē", "la chanson", "la canzone", "das Lied", "şarkı"),
    W("📖", "story", "故事", "gùshi", "l'histoire", "la storia", "die Geschichte", "hikâye"),
    W("⭐", "star", "星星", "xīngxing", "l'étoile", "la stella", "der Stern", "yıldız"),
  ],
);

const supplies = makeWords(
  "supplies",
  [
    W("✏️", "pencil", "铅笔", "qiānbǐ", "le crayon", "la matita", "der Bleistift", "kurşun kalem"),
    W("🖊️", "pen", "钢笔", "gāngbǐ", "le stylo", "la penna", "der Kuli", "dolma kalem"),
    W("📄", "paper", "纸", "zhǐ", "la feuille", "il foglio", "das Papier", "kâğıt"),
    W("✂️", "scissors", "剪刀", "jiǎndāo", "les ciseaux", "le forbici", "die Schere", "makas"),
    W("🧴", "glue", "胶水", "jiāoshuǐ", "la colle", "la colla", "der Kleber", "yapıştırıcı"),
    W("📏", "ruler", "尺子", "chǐzi", "la règle", "il righello", "das Lineal", "cetvel"),
    W("🖍️", "crayon", "蜡笔", "làbǐ", "le crayon de couleur", "il pastello", "der Buntstift", "mum boya"),
    W("🎒", "backpack", "背包", "bèibāo", "le sac à dos", "lo zaino", "der Rucksack", "sırt çantası"),
    W("📓", "notebook", "本子", "běnzi", "le cahier", "il quaderno", "das Heft", "defter"),
    W("🖌️", "paintbrush", "画笔", "huàbǐ", "le pinceau", "il pennello", "der Pinsel", "fırça"),
    W("👝", "pencil case", "铅笔盒", "qiānbǐhé", "la trousse", "l'astuccio", "das Federmäppchen", "kalem kutusu"),
    W("💻", "computer", "电脑", "diànnǎo", "l'ordinateur", "il computer", "der Computer", "bilgisayar"),
  ],
);

const colors = makeWords(
  "colors",
  [
    W("🔴", "red", "红色", "hóngsè", "rouge", "rosso", "rot", "kırmızı"),
    W("🔵", "blue", "蓝色", "lánsè", "bleu", "blu", "blau", "mavi"),
    W("🟡", "yellow", "黄色", "huángsè", "jaune", "giallo", "gelb", "sarı"),
    W("🟢", "green", "绿色", "lǜsè", "vert", "verde", "grün", "yeşil"),
    W("🟠", "orange", "橙色", "chéngsè", "orange", "arancione", "orange", "turuncu"),
    W("🟣", "purple", "紫色", "zǐsè", "violet", "viola", "lila", "mor"),
    W("🩷", "pink", "粉色", "fěnsè", "rose", "rosa", "rosa", "pembe"),
    W("⚫", "black", "黑色", "hēisè", "noir", "nero", "schwarz", "siyah"),
    W("⚪", "white", "白色", "báisè", "blanc", "bianco", "weiß", "beyaz"),
    W("🟤", "brown", "棕色", "zōngsè", "marron", "marrone", "braun", "kahverengi"),
    W("🩶", "grey", "灰色", "huīsè", "gris", "grigio", "grau", "gri"),
    W("🌈", "rainbow", "彩虹", "cǎihóng", "l'arc-en-ciel", "l'arcobaleno", "der Regenbogen", "gökkuşağı"),
  ],
);

const shapes = makeWords(
  "shapes",
  [
    W("⭕", "circle", "圆形", "yuánxíng", "le cercle", "il cerchio", "der Kreis", "daire"),
    W("🔳", "square", "正方形", "zhèngfāngxíng", "le carré", "il quadrato", "das Quadrat", "kare"),
    W("🔺", "triangle", "三角形", "sānjiǎoxíng", "le triangle", "il triangolo", "das Dreieck", "üçgen"),
    W("⭐", "star", "星形", "xīngxíng", "l'étoile", "la stella", "der Stern", "yıldız"),
    W("❤️", "heart", "心形", "xīnxíng", "le cœur", "il cuore", "das Herz", "kalp"),
    W("🧱", "rectangle", "长方形", "chángfāngxíng", "le rectangle", "il rettangolo", "das Rechteck", "dikdörtgen"),
    W("🔷", "diamond", "菱形", "língxíng", "le losange", "il rombo", "die Raute", "eşkenar dörtgen"),
    W("🥚", "oval", "椭圆形", "tuǒyuánxíng", "l'ovale", "l'ovale", "das Oval", "oval"),
    W("🌙", "moon shape", "月牙形", "yuèyáxíng", "le croissant", "la mezzaluna", "der Halbmond", "hilal"),
  ],
);

const OPPOSITE_BINS: Bin[] = [
  { key: "big", emoji: "🐘", t: t("big", "大", "grand", "grande", "groß", "büyük") },
  { key: "small", emoji: "🐭", t: t("small", "小", "petit", "piccolo", "klein", "küçük") },
  { key: "hot", emoji: "🔥", t: t("hot", "热", "chaud", "caldo", "heiß", "sıcak") },
  { key: "cold", emoji: "🧊", t: t("cold", "冷", "froid", "freddo", "kalt", "soğuk") },
  { key: "fast", emoji: "🐇", t: t("fast", "快", "rapide", "veloce", "schnell", "hızlı") },
  { key: "slow", emoji: "🐢", t: t("slow", "慢", "lent", "lento", "langsam", "yavaş") },
  { key: "up", emoji: "⬆️", t: t("up", "上", "en haut", "su", "hoch", "yukarı") },
  { key: "down", emoji: "⬇️", t: t("down", "下", "en bas", "giù", "runter", "aşağı") },
];

const opposites = makeWords(
  "opposites",
  [
    W("🐘", "big", "大", "dà", "grand", "grande", "groß", "büyük"),
    W("🐭", "small", "小", "xiǎo", "petit", "piccolo", "klein", "küçük"),
    W("🔥", "hot", "热", "rè", "chaud", "caldo", "heiß", "sıcak"),
    W("🧊", "cold", "冷", "lěng", "froid", "freddo", "kalt", "soğuk"),
    W("🐇", "fast", "快", "kuài", "rapide", "veloce", "schnell", "hızlı"),
    W("🐢", "slow", "慢", "màn", "lent", "lento", "langsam", "yavaş"),
    W("⬆️", "up", "上", "shàng", "en haut", "su", "hoch", "yukarı"),
    W("⬇️", "down", "下", "xià", "en bas", "giù", "runter", "aşağı"),
    W("🚪", "open", "开", "kāi", "ouvert", "aperto", "offen", "açık"),
    W("🔒", "closed", "关", "guān", "fermé", "chiuso", "geschlossen", "kapalı"),
    W("📏", "long", "长", "cháng", "long", "lungo", "lang", "uzun"),
    W("🐛", "short", "短", "duǎn", "court", "corto", "kurz", "kısa"),
    W("🌞", "day", "白天", "báitiān", "le jour", "il giorno", "der Tag", "gündüz"),
    W("🌛", "night", "晚上", "wǎnshang", "la nuit", "la notte", "die Nacht", "gece"),
    W("🧼", "clean", "干净", "gānjìng", "propre", "pulito", "sauber", "temiz"),
    W("🪰", "dirty", "脏", "zāng", "sale", "sporco", "schmutzig", "kirli"),
    W("🆕", "new", "新", "xīn", "nouveau", "nuovo", "neu", "yeni"),
    W("🧸", "old", "旧", "jiù", "vieux", "vecchio", "alt", "eski"),
    W("📢", "loud", "吵", "chǎo", "fort", "rumoroso", "laut", "gürültülü"),
    W("🤫", "quiet", "安静", "ānjìng", "calme", "silenzioso", "leise", "sessiz"),
    W("🥣", "full", "满", "mǎn", "plein", "pieno", "voll", "dolu"),
    W("🥡", "empty", "空", "kōng", "vide", "vuoto", "leer", "boş"),
    // sorted example items (bins) — these give the drag & drop sorting game its content
    inBin(W("🐘", "elephant", "大象", "dàxiàng", "l'éléphant", "l'elefante", "der Elefant", "fil"), "big"),
    inBin(W("🚌", "bus", "公共汽车", "gōnggòng qìchē", "le bus", "l'autobus", "der Bus", "otobüs"), "big"),
    inBin(W("🌳", "tree", "树", "shù", "l'arbre", "l'albero", "der Baum", "ağaç"), "big"),
    inBin(W("🐭", "mouse", "老鼠", "lǎoshǔ", "la souris", "il topo", "die Maus", "fare"), "small"),
    inBin(W("🐜", "ant", "蚂蚁", "mǎyǐ", "la fourmi", "la formica", "die Ameise", "karınca"), "small"),
    inBin(W("🍓", "strawberry", "草莓", "cǎoméi", "la fraise", "la fragola", "die Erdbeere", "çilek"), "small"),
    inBin(W("☀️", "sun", "太阳", "tàiyáng", "le soleil", "il sole", "die Sonne", "güneş"), "hot"),
    inBin(W("🍲", "soup", "hot soup", "tāng", "la soupe", "la zuppa", "die Suppe", "çorba"), "hot"),
    inBin(W("🔥", "fire", "火", "huǒ", "le feu", "il fuoco", "das Feuer", "ateş"), "hot"),
    inBin(W("⛄", "snowman", "雪人", "xuěrén", "le bonhomme de neige", "il pupazzo di neve", "der Schneemann", "kardan adam"), "cold"),
    inBin(W("🍦", "ice cream", "冰淇淋", "bīngqílín", "la glace", "il gelato", "das Eis", "dondurma"), "cold"),
    inBin(W("❄️", "snowflake", "雪花", "xuěhuā", "le flocon", "il fiocco di neve", "die Schneeflocke", "kar tanesi"), "cold"),
    inBin(W("🐇", "rabbit", "兔子", "tùzi", "le lapin", "il coniglio", "das Kaninchen", "tavşan"), "fast"),
    inBin(W("✈️", "plane", "飞机", "fēijī", "l'avion", "l'aereo", "das Flugzeug", "uçak"), "fast"),
    inBin(W("🐢", "turtle", "乌龟", "wūguī", "la tortue", "la tartaruga", "die Schildkröte", "kaplumbağa"), "slow"),
    inBin(W("🐌", "snail", "蜗牛", "wōniú", "l'escargot", "la lumaca", "die Schnecke", "salyangoz"), "slow"),
    inBin(W("🚀", "rocket", "火箭", "huǒjiàn", "la fusée", "il razzo", "die Rakete", "roket"), "up"),
    inBin(W("🎈", "balloon", "气球", "qìqiú", "le ballon", "il palloncino", "der Luftballon", "balon"), "up"),
    inBin(W("🌧️", "rain", "雨", "yǔ", "la pluie", "la pioggia", "der Regen", "yağmur"), "down"),
    inBin(W("🍂", "leaf", "叶子", "yèzi", "la feuille", "la foglia", "das Blatt", "yaprak"), "down"),
  ],
);

const verbs = makeWords(
  "verbs",
  [
    W("🏃", "run", "跑", "pǎo", "courir", "correre", "rennen", "koşmak"),
    W("🦘", "jump", "跳", "tiào", "sauter", "saltare", "springen", "zıplamak"),
    W("🚶", "walk", "走", "zǒu", "marcher", "camminare", "gehen", "yürümek"),
    W("🎤", "sing", "唱歌", "chànggē", "chanter", "cantare", "singen", "şarkı söylemek"),
    W("💃", "dance", "跳舞", "tiàowǔ", "danser", "ballare", "tanzen", "dans etmek"),
    W("👏", "clap", "拍手", "pāishǒu", "taper des mains", "battere le mani", "klatschen", "alkışlamak"),
    W("🏊", "swim", "游泳", "yóuyǒng", "nager", "nuotare", "schwimmen", "yüzmek"),
    W("🪽", "fly", "飞", "fēi", "voler", "volare", "fliegen", "uçmak"),
    W("⚾", "throw", "扔", "rēng", "lancer", "lanciare", "werfen", "atmak"),
    W("🤲", "catch", "接", "jiē", "attraper", "prendere", "fangen", "tutmak"),
    W("⚽", "kick", "踢", "tī", "donner un coup de pied", "calciare", "kicken", "tekmelemek"),
    W("🪑", "sit down", "坐下", "zuòxià", "s'asseoir", "sedersi", "sich setzen", "oturmak"),
    W("🧍", "stand up", "站起来", "zhàn qǐlái", "se lever", "alzarsi", "aufstehen", "ayağa kalkmak"),
    W("✋", "stop", "停", "tíng", "arrêter", "fermarsi", "anhalten", "durmak"),
  ],
);

export const SCHOOL_SUBTHEMES: Subtheme[] = [
  { id: "classroom", emoji: "🏫", t: t("My Classroom", "我的教室", "Ma classe", "La mia classe", "Mein Klassenzimmer", "Sınıfım"), words: classroom },
  { id: "supplies", emoji: "✏️", t: t("School Supplies", "学习用品", "Le matériel scolaire", "Il materiale scolastico", "Schulsachen", "Okul Malzemeleri"), words: supplies },
  { id: "colors", emoji: "🎨", t: t("Colours", "颜色", "Les couleurs", "I colori", "Farben", "Renkler"), words: colors },
  { id: "shapes", emoji: "🔺", t: t("Shapes", "形状", "Les formes", "Le forme", "Formen", "Şekiller"), words: shapes },
  { id: "opposites", emoji: "🐘", t: t("Opposites", "反义词", "Les contraires", "I contrari", "Gegenteile", "Zıt Anlamlılar"), words: opposites, bins: OPPOSITE_BINS },
  { id: "verbs", emoji: "🏃", t: t("Action Words", "动作词", "Les actions", "Le azioni", "Tuwörter", "Eylem Sözcükleri"), words: verbs },
];
