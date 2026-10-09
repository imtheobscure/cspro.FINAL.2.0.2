import { Word, w } from "../types";

/** Extra words for the Animals & Nature and Celebrations & Leisure themes. */
export const extrasNatureFun: Record<string, Word[]> = {
  pets: [
    w("🐭", "mouse", "老鼠", "lǎoshǔ", "la souris", "il topo", "die Maus", "fare"),
    w("🐕", "puppy", "小狗", "xiǎogǒu", "le chiot", "il cucciolo", "der Welpe", "yavru köpek"),
    w("🐈", "kitten", "小猫", "xiǎomāo", "le chaton", "il gattino", "das Kätzchen", "kedi yavrusu"),
    w("🐴", "pony", "小马", "xiǎomǎ", "le poney", "il pony", "das Pony", "midilli"),
  ],
  farm: [
    w("🦃", "turkey", "火鸡", "huǒjī", "la dinde", "il tacchino", "der Truthahn", "hindi"),
    w("🏚️", "barn", "谷仓", "gǔcāng", "la grange", "il fienile", "die Scheune", "ahır", { kind: "place" }),
    w("🌾", "hay", "干草", "gāncǎo", "le foin", "il fieno", "das Heu", "saman"),
    w("🪵", "fence", "篱笆", "líba", "la clôture", "lo steccato", "der Zaun", "çit"),
  ],
  wild: [
    w("🦌", "deer", "鹿", "lù", "le cerf", "il cervo", "das Reh", "geyik"),
    w("🦊", "fox", "狐狸", "húli", "le renard", "la volpe", "der Fuchs", "tilki"),
    w("🐺", "wolf", "狼", "láng", "le loup", "il lupo", "der Wolf", "kurt"),
    w("🦉", "owl", "猫头鹰", "māotóuyīng", "le hibou", "il gufo", "die Eule", "baykuş"),
  ],
  sea: [
    w("🐚", "shell", "贝壳", "bèiké", "le coquillage", "la conchiglia", "die Muschel", "deniz kabuğu"),
    w("🌊", "wave", "海浪", "hǎilàng", "la vague", "l'onda", "die Welle", "dalga"),
    w("🪸", "coral", "珊瑚", "shānhú", "le corail", "il corallo", "die Koralle", "mercan"),
    w("🐠", "tropical fish", "热带鱼", "rèdàiyú", "le poisson tropical", "il pesce tropicale", "der Tropenfisch", "tropikal balık"),
  ],
  insects: [
    w("🪱", "worm", "蚯蚓", "qiūyǐn", "le ver", "il verme", "der Wurm", "solucan"),
    w("🪰", "fly", "苍蝇", "cāngying", "la mouche", "la mosca", "die Fliege", "sinek"),
    w("🍯", "honey", "蜂蜜", "fēngmì", "le miel", "il miele", "der Honig", "bal", { kind: "food" }),
    w("🕸️", "spider web", "蜘蛛网", "zhīzhūwǎng", "la toile d'araignée", "la ragnatela", "das Spinnennetz", "örümcek ağı"),
  ],
  plants: [
    w("🪵", "branch", "树枝", "shùzhī", "la branche", "il ramo", "der Zweig", "dal"),
    w("🌰", "acorn", "橡子", "xiàngzi", "le gland", "la ghianda", "die Eichel", "meşe palamudu"),
    w("🪴", "flower pot", "花盆", "huāpén", "le pot de fleurs", "il vaso di fiori", "der Blumentopf", "saksı"),
    w("🌲", "pine tree", "松树", "sōngshù", "le sapin", "il pino", "die Tanne", "çam"),
  ],
  weather: [
    w("⚡", "thunder", "雷", "léi", "le tonnerre", "il tuono", "der Donner", "gök gürültüsü", { kind: "thing" }),
    w("🌩️", "lightning", "闪电", "shǎndiàn", "l'éclair", "il fulmine", "der Blitz", "şimşek", { kind: "thing" }),
    w("🌌", "sky", "天空", "tiānkōng", "le ciel", "il cielo", "der Himmel", "gökyüzü", { kind: "place" }),
    w("💦", "puddle", "水坑", "shuǐkēng", "la flaque", "la pozzanghera", "die Pfütze", "su birikintisi", { kind: "thing" }),
  ],
  seasons: [
    w("🪁", "kite", "风筝", "fēngzheng", "le cerf-volant", "l'aquilone", "der Drachen", "uçurtma", { kind: "thing" }),
    w("🍦", "ice cream", "冰淇淋", "bīngqílín", "la glace", "il gelato", "das Eis", "dondurma", { kind: "food" }),
    w("🧥", "rain coat", "雨衣", "yǔyī", "l'imperméable", "l'impermeabile", "der Regenmantel", "yağmurluk", { kind: "clothes" }),
    w("👒", "sun hat", "太阳帽", "tàiyángmào", "le chapeau de soleil", "il cappello di paglia", "der Sonnenhut", "hasır şapka", { kind: "clothes" }),
  ],
  birthday: [
    w("💌", "invitation", "请柬", "qǐngjiǎn", "l'invitation", "l'invito", "die Einladung", "davetiye"),
    w("🥳", "party hat", "派对帽", "pàiduìmào", "le chapeau de fête", "il cappello della festa", "der Partyhut", "parti şapkası"),
    w("🤗", "hug", "拥抱", "yōngbào", "le câlin", "l'abbraccio", "die Umarmung", "sarılma", { kind: "action" }),
    w("📸", "photo", "照片", "zhàopiàn", "la photo", "la foto", "das Foto", "fotoğraf"),
  ],
  holidays: [
    w("🎺", "parade", "游行", "yóuxíng", "la parade", "la parata", "die Parade", "geçit töreni"),
    w("🦸", "costume", "演出服", "yǎnchūfú", "le costume", "il costume", "das Kostüm", "kostüm"),
    w("🎀", "ribbon", "蝴蝶结", "húdiéjié", "le ruban", "il nastro", "die Schleife", "kurdele"),
    w("🥮", "moon cake", "月饼", "yuèbǐng", "le gâteau de lune", "il dolce della luna", "der Mondkuchen", "ay keki", { kind: "food" }),
  ],
  hobbies: [
    w("♟️", "play chess", "下棋", "xiàqí", "jouer aux échecs", "giocare a scacchi", "Schach spielen", "satranç oynamak"),
    w("✍️", "write a story", "写故事", "xiě gùshi", "écrire une histoire", "scrivere una storia", "eine Geschichte schreiben", "hikâye yazmak"),
    w("🎣", "go fishing", "钓鱼", "diàoyú", "pêcher", "pescare", "angeln", "balık tutmak"),
    w("🏕️", "go camping", "露营", "lùyíng", "camper", "fare campeggio", "campen", "kamp yapmak"),
  ],
};
