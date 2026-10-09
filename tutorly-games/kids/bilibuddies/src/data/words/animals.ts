import { W, makeWords, t, withSound } from "../wordKit";
import type { Subtheme } from "../types";

const pets = makeWords(
  "pets",
  [
    withSound(W("🐶", "dog", "狗", "gǒu", "le chien", "il cane", "der Hund", "köpek"), "Woof woof!", "汪汪!", "Ouah ouah !", "Bau bau!", "Wau wau!", "Hav hav!"),
    withSound(W("🐱", "cat", "猫", "māo", "le chat", "il gatto", "die Katze", "kedi"), "Meow!", "喵!", "Miaou !", "Miao!", "Miau!", "Miyav!"),
    withSound(W("🐰", "rabbit", "兔子", "tùzi", "le lapin", "il coniglio", "das Kaninchen", "tavşan"), "Nibble nibble!", "啃啃!", "Miam miam !", "Sgranck!", "Knabber!", "Kıtır kıtır!"),
    withSound(W("🐹", "hamster", "仓鼠", "cāngshǔ", "le hamster", "il criceto", "der Hamster", "hamster"), "Squeak!", "吱吱!", "Cui cui !", "Squitt!", "Quietsch!", "Vik vik!"),
    withSound(W("🐠", "fish", "鱼", "yú", "le poisson", "il pesce", "der Fisch", "balık"), "Blub blub!", "咕噜咕噜!", "Bloup bloup !", "Glub glub!", "Blubb!", "Glup glup!"),
    withSound(W("🐦", "bird", "鸟", "niǎo", "l'oiseau", "l'uccello", "der Vogel", "kuş"), "Tweet tweet!", "叽叽喳喳!", "Cui cui !", "Cip cip!", "Tschilp!", "Cik cik!"),
    withSound(W("🐢", "turtle", "乌龟", "wūguī", "la tortue", "la tartaruga", "die Schildkröte", "kaplumbağa"), "Slow... slow...", "慢…慢…", "Doucement...", "Piano piano...", "Langsam...", "Yavaş..."),
    W("🦜", "parrot", "鹦鹉", "yīngwǔ", "le perroquet", "il pappagallo", "der Papagei", "papağan"),
    W("🐾", "paw", "爪子", "zhuǎzi", "la patte", "la zampa", "die Pfote", "pati"),
    W("🦴", "bone", "骨头", "gǔtou", "l'os", "l'osso", "der Knochen", "kemik"),
    W("🏠", "pet home", "宠物窝", "chǒngwù wō", "la niche", "la cuccia", "das Tierheim", "kulübe"),
    W("🧶", "ball of wool", "毛线球", "máoxiànqiú", "la laine", "il gomitolo", "das Wollknäuel", "yumak"),
  ],
);

const farm = makeWords(
  "farm",
  [
    withSound(W("🐮", "cow", "奶牛", "nǎiniú", "la vache", "la mucca", "die Kuh", "inek"), "Moo!", "哞!", "Meuh !", "Muu!", "Muh!", "Möö!"),
    withSound(W("🐷", "pig", "猪", "zhū", "le cochon", "il maiale", "das Schwein", "domuz"), "Oink oink!", "哼哼!", "Groin groin !", "Oink oink!", "Oink!", "Oink!"),
    withSound(W("🐑", "sheep", "绵羊", "miányáng", "le mouton", "la pecora", "das Schaf", "koyun"), "Baa!", "咩!", "Bêê !", "Bee!", "Mäh!", "Mee!"),
    withSound(W("🐔", "hen", "母鸡", "mǔjī", "la poule", "la gallina", "das Huhn", "tavuk"), "Cluck cluck!", "咯咯!", "Cot cot !", "Coccodè!", "Tock tock!", "Gıt gıt!"),
    withSound(W("🐤", "chick", "小鸡", "xiǎojī", "le poussin", "il pulcino", "das Küken", "civciv"), "Peep peep!", "叽叽!", "Piu piu !", "Pio pio!", "Piep!", "Cik cik!"),
    withSound(W("🦆", "duck", "鸭子", "yāzi", "le canard", "l'anatra", "die Ente", "ördek"), "Quack quack!", "嘎嘎!", "Coin coin !", "Qua qua!", "Kvak!", "Vak vak!"),
    withSound(W("🐴", "horse", "马", "mǎ", "le cheval", "il cavallo", "das Pferd", "at"), "Neigh!", "咴!", "Hi hi !", "Iiih!", "Hü hot!", "Kiiş!"),
    withSound(W("🐐", "goat", "山羊", "shānyáng", "la chèvre", "la capra", "die Ziege", "keçi"), "Baa baa!", "咩咩!", "Bê bê !", "Bee bee!", "Mäh!", "Mee!"),
    withSound(W("🦃", "turkey", "火鸡", "huǒjī", "le dindon", "il tacchino", "der Truthahn", "hindi"), "Gobble!", "咕噜!", "Glouglou !", "Glu glu!", "Kollern!", "Gul gul!"),
    W("🥚", "egg", "蛋", "dàn", "l'œuf", "l'uovo", "das Ei", "yumurta"),
    W("🌾", "wheat", "小麦", "xiǎomài", "le blé", "il grano", "der Weizen", "buğday"),
    W("🚜", "tractor", "拖拉机", "tuōlājī", "le tracteur", "il trattore", "der Traktor", "traktör"),
    W("🏡", "barn", "谷仓", "gǔcāng", "la grange", "il fienile", "die Scheune", "ahır"),
    W("🥛", "milk", "牛奶", "niúnǎi", "le lait", "il latte", "die Milch", "süt"),
  ],
);

const wild = makeWords(
  "wild",
  [
    withSound(W("🦁", "lion", "狮子", "shīzi", "le lion", "il leone", "der Löwe", "aslan"), "Roar!", "吼!", "Rrrr !", "Roar!", "Rööör!", "Kükre!"),
    withSound(W("🐘", "elephant", "大象", "dàxiàng", "l'éléphant", "l'elefante", "der Elefant", "fil"), "Toot!", "嘟嘟!", "Pouet !", "Barrito!", "Töröö!", "Fiii!"),
    withSound(W("🐵", "monkey", "猴子", "hóuzi", "le singe", "la scimmia", "der Affe", "maymun"), "Ooh ooh ah ah!", "呜呜啊啊!", "Ouh ouh !", "Uh uh!", "Uu uu!", "Uu aa!"),
    withSound(W("🐻", "bear", "熊", "xióng", "l'ours", "l'orso", "der Bär", "ayı"), "Growl!", "吼吼!", "Grrr !", "Grrr!", "Grrr!", "Hırr!"),
    withSound(W("🐯", "tiger", "老虎", "lǎohǔ", "le tigre", "la tigre", "der Tiger", "kaplan"), "Roar!", "嗷!", "Rrrr !", "Roar!", "Rööör!", "Kükre!"),
    withSound(W("🦒", "giraffe", "长颈鹿", "chángjǐnglù", "la girafe", "la giraffa", "die Giraffe", "zürafa"), "Munch munch!", "嚼嚼!", "Miam !", "Munch!", "Mampf!", "Munch!"),
    withSound(W("🦓", "zebra", "斑马", "bānmǎ", "le zèbre", "la zebra", "das Zebra", "zebra"), "Neigh!", "咴!", "Hi !", "Iiih!", "Hü!", "Kiiş!"),
    withSound(W("🐺", "wolf", "狼", "láng", "le loup", "il lupo", "der Wolf", "kurt"), "Awoo!", "嗷呜!", "Aouh !", "Uuuuh!", "Auuu!", "Uuu!"),
    withSound(W("🦊", "fox", "狐狸", "húli", "le renard", "la volpe", "der Fuchs", "tilki"), "Yip yip!", "吱吱!", "Yip !", "Yip!", "Yip!", "Yip!"),
    W("🐼", "panda", "熊猫", "xióngmāo", "le panda", "il panda", "der Panda", "panda"),
    W("🦘", "kangaroo", "袋鼠", "dàishǔ", "le kangourou", "il canguro", "das Känguru", "kanguru"),
    W("🐨", "koala", "考拉", "kǎolā", "le koala", "il koala", "der Koala", "koala"),
    W("🦛", "hippo", "河马", "hémǎ", "l'hippopotame", "l'ippopotamo", "das Nilpferd", "su aygırı"),
    W("🐊", "crocodile", "鳄鱼", "èyú", "le crocodile", "il coccodrillo", "das Krokodil", "timsah"),
  ],
);

const sea = makeWords(
  "sea",
  [
    withSound(W("🐬", "dolphin", "海豚", "hǎitún", "le dauphin", "il delfino", "der Delfin", "yunus"), "Click click!", "咔嗒!", "Clic clic !", "Click!", "Klick!", "Tık tık!"),
    withSound(W("🐳", "whale", "鲸鱼", "jīngyú", "la baleine", "la balena", "der Wal", "balina"), "Whoooosh!", "呼!", "Pfffft !", "Sfiuuu!", "Puuuh!", "Fuuu!"),
    W("🦈", "shark", "鲨鱼", "shāyú", "le requin", "lo squalo", "der Hai", "köpek balığı"),
    W("🐙", "octopus", "章鱼", "zhāngyú", "la pieuvre", "il polpo", "der Oktopus", "ahtapot"),
    W("🦀", "crab", "螃蟹", "pángxiè", "le crabe", "il granchio", "die Krabbe", "yengeç"),
    W("🐢", "sea turtle", "海龟", "hǎiguī", "la tortue de mer", "la tartaruga marina", "die Meeresschildkröte", "deniz kaplumbağası"),
    W("🐠", "little fish", "小鱼", "xiǎoyú", "le petit poisson", "il pesciolino", "der kleine Fisch", "küçük balık"),
    W("🦑", "squid", "鱿鱼", "yóuyú", "le calamar", "il calamaro", "der Tintenfisch", "kalamar"),
    W("🐡", "pufferfish", "河豚", "hétún", "le poisson-globe", "il pesce palla", "der Kugelfisch", "balon balığı"),
    W("🪸", "coral", "珊瑚", "shānhú", "le corail", "il corallo", "die Koralle", "mercan"),
    W("🐚", "shell", "贝壳", "bèiké", "le coquillage", "la conchiglia", "die Muschel", "deniz kabuğu"),
    W("🌊", "wave", "波浪", "bōlàng", "la vague", "l'onda", "die Welle", "dalga"),
  ],
);

const insects = makeWords(
  "insects",
  [
    withSound(W("🐝", "bee", "蜜蜂", "mìfēng", "l'abeille", "l'ape", "die Biene", "arı"), "Bzzz!", "嗡嗡!", "Bzzz !", "Bzzz!", "Summ!", "Vızz!"),
    withSound(W("🦋", "butterfly", "蝴蝶", "húdié", "le papillon", "la farfalla", "der Schmetterling", "kelebek"), "Flap flap!", "扑扇扑扇!", "Flap flap !", "Sbatti!", "Flatter!", "Pır pır!"),
    withSound(W("🐞", "ladybug", "瓢虫", "piáochóng", "la coccinelle", "la coccinella", "der Marienkäfer", "uğur böceği"), "Tiny steps!", "轻轻走!", "Petit pas !", "Piano!", "Trippel!", "Minik adım!"),
    W("🐜", "ant", "蚂蚁", "mǎyǐ", "la fourmi", "la formica", "die Ameise", "karınca"),
    W("🐛", "caterpillar", "毛毛虫", "máomaochóng", "la chenille", "il bruco", "die Raupe", "tırtıl"),
    W("🕷️", "spider", "蜘蛛", "zhīzhū", "l'araignée", "il ragno", "die Spinne", "örümcek"),
    W("🐌", "snail", "蜗牛", "wōniú", "l'escargot", "la lumaca", "die Schnecke", "salyangoz"),
    W("🦗", "cricket", "蟋蟀", "xīshuài", "le grillon", "il grillo", "die Grille", "cricket"),
    W("🪲", "beetle", "甲虫", "jiǎchóng", "le scarabée", "lo scarabeo", "der Käfer", "böcek"),
    W("🪱", "worm", "蚯蚓", "qiūyǐn", "le ver", "il verme", "der Wurm", "solucan"),
    W("🕸️", "web", "蜘蛛网", "zhīzhūwǎng", "la toile", "la tela", "das Netz", "ağ"),
    W("🍯", "honey", "蜂蜜", "fēngmì", "le miel", "il miele", "der Honig", "bal"),
  ],
);

const plants = makeWords(
  "plants",
  [
    W("🌳", "tree", "树", "shù", "l'arbre", "l'albero", "der Baum", "ağaç"),
    W("🌸", "flower", "花", "huā", "la fleur", "il fiore", "die Blume", "çiçek"),
    W("🌻", "sunflower", "向日葵", "xiàngrìkuí", "le tournesol", "il girasole", "die Sonnenblume", "ayçiçeği"),
    W("🌹", "rose", "玫瑰", "méiguī", "la rose", "la rosa", "die Rose", "gül"),
    W("🌷", "tulip", "郁金香", "yùjīnxiāng", "la tulipe", "il tulipano", "die Tulpe", "lale"),
    W("🌱", "seedling", "小苗", "xiǎomiáo", "la pousse", "il germoglio", "der Sprössling", "fide"),
    W("🍃", "leaf", "叶子", "yèzi", "la feuille", "la foglia", "das Blatt", "yaprak"),
    W("🌵", "cactus", "仙人掌", "xiānrénzhǎng", "le cactus", "il cactus", "der Kaktus", "kaktüs"),
    W("🍄", "mushroom", "蘑菇", "mógu", "le champignon", "il fungo", "der Pilz", "mantar"),
    W("🌿", "plant", "植物", "zhíwù", "la plante", "la pianta", "die Pflanze", "bitki"),
    W("🪴", "pot plant", "盆栽", "pénzāi", "la plante en pot", "la pianta in vaso", "die Topfpflanze", "saksı bitkisi"),
    W("🌰", "seed", "种子", "zhǒngzi", "la graine", "il seme", "der Samen", "tohum"),
  ],
);

const weather = makeWords(
  "weather",
  [
    W("☀️", "sunny", "晴天", "qíngtiān", "ensoleillé", "soleggiato", "sonnig", "güneşli"),
    W("🌧️", "rainy", "下雨", "xiàyǔ", "pluvieux", "piovoso", "regnerisch", "yağmurlu"),
    W("❄️", "snowy", "下雪", "xiàxuě", "neigeux", "nevoso", "verschneit", "karlı"),
    W("💨", "windy", "刮风", "guāfēng", "venteux", "ventoso", "windig", "rüzgârlı"),
    W("☁️", "cloudy", "多云", "duōyún", "nuageux", "nuvoloso", "bewölkt", "bulutlu"),
    W("⛈️", "stormy", "雷雨", "léiyǔ", "orageux", "tempestoso", "stürmisch", "fırtınalı"),
    W("🌈", "rainbow", "彩虹", "cǎihóng", "l'arc-en-ciel", "l'arcobaleno", "der Regenbogen", "gökkuşağı"),
    W("🌡️", "warm", "温暖", "wēnnuǎn", "chaud", "caldo", "warm", "ılık"),
    W("🌫️", "foggy", "有雾", "yǒuwù", "brumeux", "nebbioso", "neblig", "sisli"),
    W("⚡", "lightning", "闪电", "shǎndiàn", "l'éclair", "il fulmine", "der Blitz", "şimşek"),
    W("☂️", "umbrella", "雨伞", "yǔsǎn", "le parapluie", "l'ombrello", "der Regenschirm", "şemsiye"),
  ],
);

const seasons = makeWords(
  "seasons",
  [
    W("🌷", "spring", "春天", "chūntiān", "le printemps", "la primavera", "der Frühling", "ilkbahar"),
    W("🌞", "summer", "夏天", "xiàtiān", "l'été", "l'estate", "der Sommer", "yaz"),
    W("🍂", "autumn", "秋天", "qiūtiān", "l'automne", "l'autunno", "der Herbst", "sonbahar"),
    W("⛄", "winter", "冬天", "dōngtiān", "l'hiver", "l'inverno", "der Winter", "kış"),
  ],
);

export const ANIMALS_SUBTHEMES: Subtheme[] = [
  { id: "pets", emoji: "🐶", t: t("Pets", "宠物", "Les animaux de compagnie", "Gli animali domestici", "Haustiere", "Evcil Hayvanlar"), words: pets },
  { id: "farm", emoji: "🐮", t: t("Farm Animals", "农场动物", "Les animaux de la ferme", "Gli animali della fattoria", "Bauernhoftiere", "Çiftlik Hayvanları"), words: farm },
  { id: "wild", emoji: "🦁", t: t("Wild & Zoo Animals", "野生动物", "Les animaux sauvages", "Gli animali selvaggi", "Wilde Tiere", "Vahşi Hayvanlar"), words: wild },
  { id: "sea", emoji: "🐬", t: t("Sea Creatures", "海洋生物", "Les animaux de la mer", "Gli animali del mare", "Meerestiere", "Deniz Canlıları"), words: sea },
  { id: "insects", emoji: "🐝", t: t("Insects & Bugs", "昆虫", "Les insectes", "Gli insetti", "Insekten", "Böcekler"), words: insects },
  { id: "plants", emoji: "🌳", t: t("Plants, Flowers & Trees", "植物、花和树", "Plantes et fleurs", "Piante e fiori", "Pflanzen und Blumen", "Bitkiler ve Çiçekler"), words: plants },
  { id: "weather", emoji: "☀️", t: t("Weather", "天气", "La météo", "Il tempo", "Das Wetter", "Hava Durumu"), words: weather },
  { id: "seasons", emoji: "🍂", t: t("The Four Seasons", "四季", "Les quatre saisons", "Le quattro stagioni", "Die vier Jahreszeiten", "Dört Mevsim"), words: seasons },
];
