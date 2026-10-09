import { W, makeWords, t, withSound } from "../wordKit";
import type { Subtheme } from "../types";

const rooms = makeWords(
  "rooms",
  [
    W("🏠", "house", "房子", "fángzi", "la maison", "la casa", "das Haus", "ev"),
    W("🛋️", "living room", "客厅", "kètīng", "le salon", "il salotto", "das Wohnzimmer", "oturma odası"),
    W("🛏️", "bedroom", "卧室", "wòshì", "la chambre", "la camera", "das Schlafzimmer", "yatak odası"),
    W("🍳", "kitchen", "厨房", "chúfáng", "la cuisine", "la cucina", "die Küche", "mutfak"),
    W("🛁", "bathroom", "浴室", "yùshì", "la salle de bains", "il bagno", "das Badezimmer", "banyo"),
    W("🌳", "garden", "花园", "huāyuán", "le jardin", "il giardino", "der Garten", "bahçe"),
    withSound(W("🚪", "door", "门", "mén", "la porte", "la porta", "die Tür", "kapı"), "Knock knock!", "咚咚！", "Toc toc !", "Toc toc!", "Klopf klopf!", "Tak tak!"),
    W("🪟", "window", "窗户", "chuānghu", "la fenêtre", "la finestra", "das Fenster", "pencere"),
    W("🪜", "stairs", "楼梯", "lóutī", "l'escalier", "le scale", "die Treppe", "merdiven"),
  ],
);

const furniture = makeWords(
  "furniture",
  [
    W("🛏️", "bed", "床", "chuáng", "le lit", "il letto", "das Bett", "yatak"),
    W("🪑", "chair", "椅子", "yǐzi", "la chaise", "la sedia", "der Stuhl", "sandalye"),
    W("🍽️", "table", "桌子", "zhuōzi", "la table", "il tavolo", "der Tisch", "masa"),
    W("🛋️", "sofa", "沙发", "shāfā", "le canapé", "il divano", "das Sofa", "kanepe"),
    W("💡", "lamp", "灯", "dēng", "la lampe", "la lampada", "die Lampe", "lamba"),
    withSound(W("🕐", "clock", "钟", "zhōng", "l'horloge", "l'orologio", "die Uhr", "saat"), "Tick tock!", "滴答滴答！", "Tic tac !", "Tic toc!", "Tick tack!", "Tik tak!"),
    W("📖", "book", "书", "shū", "le livre", "il libro", "das Buch", "kitap"),
    W("📺", "tv", "电视", "diànshì", "la télé", "la televisione", "der Fernseher", "televizyon"),
    W("🪞", "mirror", "镜子", "jìngzi", "le miroir", "lo specchio", "der Spiegel", "ayna"),
    W("🚽", "toilet", "马桶", "mǎtǒng", "les toilettes", "il water", "die Toilette", "tuvalet"),
    W("🚰", "sink", "水槽", "shuǐcáo", "l'évier", "il lavandino", "das Waschbecken", "lavabo"),
    W("🧺", "washing machine", "洗衣机", "xǐyījī", "la machine à laver", "la lavatrice", "die Waschmaschine", "çamaşır makinesi"),
    W("🔑", "keys", "钥匙", "yàoshi", "les clés", "le chiavi", "die Schlüssel", "anahtar"),
    withSound(W("📱", "phone", "电话", "diànhuà", "le téléphone", "il telefono", "das Telefon", "telefon"), "Ring ring!", "铃铃铃！", "Dring dring !", "Drin drin!", "Klingeling!", "Zil zil!"),
    W("📦", "box", "盒子", "hézi", "la boîte", "la scatola", "die Kiste", "kutu"),
  ],
);

const toys = makeWords(
  "toys",
  [
    W("⚽", "ball", "球", "qiú", "la balle", "la palla", "der Ball", "top"),
    W("🧸", "teddy bear", "泰迪熊", "tàidíxióng", "la peluche", "l'orsetto", "der Teddybär", "oyuncak ayı"),
    W("🪆", "doll", "娃娃", "wáwa", "la poupée", "la bambola", "die Puppe", "oyuncak bebek"),
    W("🧱", "blocks", "积木", "jīmù", "les cubes", "i cubetti", "die Bausteine", "bloklar"),
    W("🧩", "puzzle", "拼图", "pīntú", "le puzzle", "il puzzle", "das Puzzle", "yapboz"),
    W("🪁", "kite", "风筝", "fēngzheng", "le cerf-volant", "l'aquilone", "der Drachen", "uçurtma"),
    W("🎈", "balloon", "气球", "qìqiú", "le ballon", "il palloncino", "der Luftballon", "balon"),
    withSound(W("🥁", "drum", "鼓", "gǔ", "le tambour", "il tamburo", "die Trommel", "davul"), "Boom boom!", "咚咚咚！", "Boum boum !", "Bum bum!", "Bum bum!", "Bum bum!"),
    W("🖍️", "crayons", "蜡笔", "làbǐ", "les crayons", "i pastelli", "die Buntstifte", "mum boya"),
    withSound(W("🤖", "robot", "机器人", "jīqìrén", "le robot", "il robot", "der Roboter", "robot"), "Beep boop!", "哔啵哔啵！", "Bip bip !", "Bip bop!", "Piep piep!", "Bip bip!"),
    W("🎲", "dice", "骰子", "tóuzi", "le dé", "il dado", "der Würfel", "zar"),
    W("🪀", "yo-yo", "溜溜球", "liūliūqiú", "le yo-yo", "lo yo-yo", "das Jo-Jo", "yoyo"),
    W("🫧", "bubbles", "泡泡", "pàopao", "les bulles", "le bolle", "die Seifenblasen", "baloncuk"),
  ],
);

const routines = makeWords(
  "routines",
  [
    W("⏰", "wake up", "起床", "qǐchuáng", "se réveiller", "svegliarsi", "aufwachen", "uyanmak"),
    W("👕", "get dressed", "穿衣服", "chuān yīfu", "s'habiller", "vestirsi", "sich anziehen", "giyinmek"),
    W("🪥", "brush teeth", "刷牙", "shuā yá", "se brosser les dents", "lavarsi i denti", "Zähne putzen", "diş fırçalamak"),
    W("🧼", "wash hands", "洗手", "xǐ shǒu", "se laver les mains", "lavarsi le mani", "Hände waschen", "el yıkamak"),
    W("🛁", "take a bath", "洗澡", "xǐzǎo", "prendre le bain", "fare il bagno", "baden", "banyo yapmak"),
    W("🍽️", "eat", "吃饭", "chīfàn", "manger", "mangiare", "essen", "yemek yemek"),
    W("🥛", "drink", "喝", "hē", "boire", "bere", "trinken", "içmek"),
    W("🎒", "go to school", "上学", "shàngxué", "aller à l'école", "andare a scuola", "zur Schule gehen", "okula gitmek"),
    W("🤹", "play", "玩", "wán", "jouer", "giocare", "spielen", "oynamak"),
    W("📚", "read", "读书", "dúshū", "lire", "leggere", "lesen", "okumak"),
    W("🎨", "draw", "画画", "huàhuà", "dessiner", "disegnare", "zeichnen", "resim yapmak"),
    W("😴", "sleep", "睡觉", "shuìjiào", "dormir", "dormire", "schlafen", "uyumak"),
  ],
);

const fruits = makeWords(
  "fruits",
  [
    W("🍎", "apple", "苹果", "píngguǒ", "la pomme", "la mela", "der Apfel", "elma"),
    W("🍌", "banana", "香蕉", "xiāngjiāo", "la banane", "la banana", "die Banane", "muz"),
    W("🍊", "orange", "橙子", "chéngzi", "l'orange", "l'arancia", "die Orange", "portakal"),
    W("🍓", "strawberry", "草莓", "cǎoméi", "la fraise", "la fragola", "die Erdbeere", "çilek"),
    W("🍇", "grapes", "葡萄", "pútao", "le raisin", "l'uva", "die Trauben", "üzüm"),
    W("🍉", "watermelon", "西瓜", "xīguā", "la pastèque", "l'anguria", "die Wassermelone", "karpuz"),
    W("🍐", "pear", "梨", "lí", "la poire", "la pera", "die Birne", "armut"),
    W("🍑", "peach", "桃子", "táozi", "la pêche", "la pesca", "der Pfirsich", "şeftali"),
    W("🍋", "lemon", "柠檬", "níngméng", "le citron", "il limone", "die Zitrone", "limon"),
    W("🍍", "pineapple", "菠萝", "bōluó", "l'ananas", "l'ananas", "die Ananas", "ananas"),
    W("🍒", "cherries", "樱桃", "yīngtáo", "les cerises", "le ciliegie", "die Kirschen", "kiraz"),
    W("🥭", "mango", "芒果", "mángguǒ", "la mangue", "il mango", "die Mango", "mango"),
  ],
);

const vegetables = makeWords(
  "vegetables",
  [
    W("🥕", "carrot", "胡萝卜", "húluóbo", "la carotte", "la carota", "die Karotte", "havuç"),
    W("🍅", "tomato", "番茄", "fānqié", "la tomate", "il pomodoro", "die Tomate", "domates"),
    W("🥔", "potato", "土豆", "tǔdòu", "la pomme de terre", "la patata", "die Kartoffel", "patates"),
    W("🥦", "broccoli", "西兰花", "xīlánhuā", "le brocoli", "i broccoli", "der Brokkoli", "brokoli"),
    W("🌽", "corn", "玉米", "yùmǐ", "le maïs", "il mais", "der Mais", "mısır"),
    W("🥒", "cucumber", "黄瓜", "huángguā", "le concombre", "il cetriolo", "die Gurke", "salatalık"),
    W("🧅", "onion", "洋葱", "yángcōng", "l'oignon", "la cipolla", "die Zwiebel", "soğan"),
    W("🫑", "pepper", "青椒", "qīngjiāo", "le poivron", "il peperone", "die Paprika", "biber"),
    W("🥬", "salad", "生菜", "shēngcài", "la salade", "l'insalata", "der Salat", "marul"),
    W("🍄", "mushroom", "蘑菇", "mógu", "le champignon", "il fungo", "der Pilz", "mantar"),
  ],
);

const drinks = makeWords(
  "drinks",
  [
    W("💧", "water", "水", "shuǐ", "l'eau", "l'acqua", "das Wasser", "su"),
    W("🥛", "milk", "牛奶", "niúnǎi", "le lait", "il latte", "die Milch", "süt"),
    W("🧃", "juice", "果汁", "guǒzhī", "le jus", "il succo", "der Saft", "meyve suyu"),
    W("🍵", "tea", "茶", "chá", "le thé", "il tè", "der Tee", "çay"),
    W("🍫", "cocoa", "热可可", "rè kěkě", "le chocolat chaud", "la cioccolata calda", "die heiße Schokolade", "sıcak çikolata"),
    W("🥤", "smoothie", "冰沙", "bīngshā", "le smoothie", "il frullato", "der Smoothie", "smoothie"),
    W("🍲", "soup", "汤", "tāng", "la soupe", "la zuppa", "die Suppe", "çorba"),
    W("☕", "coffee", "咖啡", "kāfēi", "le café", "il caffè", "der Kaffee", "kahve"),
  ],
);

const meals = makeWords(
  "meals",
  [
    W("🥐", "breakfast", "早餐", "zǎocān", "le petit-déjeuner", "la colazione", "das Frühstück", "kahvaltı"),
    W("🍱", "lunch", "午餐", "wǔcān", "le déjeuner", "il pranzo", "das Mittagessen", "öğle yemeği"),
    W("🍝", "dinner", "晚餐", "wǎncān", "le dîner", "la cena", "das Abendessen", "akşam yemeği"),
    W("🍞", "bread", "面包", "miànbāo", "le pain", "il pane", "das Brot", "ekmek"),
    W("🥚", "egg", "鸡蛋", "jīdàn", "l'œuf", "l'uovo", "das Ei", "yumurta"),
    W("🧀", "cheese", "奶酪", "nǎilào", "le fromage", "il formaggio", "der Käse", "peynir"),
    W("🍚", "rice", "米饭", "mǐfàn", "le riz", "il riso", "der Reis", "pilav"),
    W("🍜", "noodles", "面条", "miàntiáo", "les nouilles", "gli spaghetti", "die Nudeln", "makarna"),
    W("🍰", "cake", "蛋糕", "dàngāo", "le gâteau", "la torta", "der Kuchen", "kek"),
    W("🍕", "pizza", "披萨", "bīsà", "la pizza", "la pizza", "die Pizza", "pizza"),
  ],
);

export const HOME_SUBTHEMES: Subtheme[] = [
  { id: "rooms", emoji: "🏠", t: t("Rooms in the House", "家里的房间", "Les pièces de la maison", "Le stanze della casa", "Zimmer im Haus", "Evin Odaları"), words: rooms },
  { id: "furniture", emoji: "🪑", t: t("Furniture & Things", "家具和物品", "Les meubles et les objets", "Mobili e oggetti", "Möbel und Dinge", "Mobilya ve Eşyalar"), words: furniture },
  { id: "toys", emoji: "🧸", t: t("Toys & Games", "玩具和游戏", "Les jouets et les jeux", "Giochi e giocattoli", "Spielzeug und Spiele", "Oyuncaklar ve Oyunlar"), words: toys },
  { id: "routines", emoji: "⏰", t: t("My Day (Routines)", "我的一天", "Ma journée", "La mia giornata", "Mein Tag", "Günüm"), words: routines },
  { id: "fruits", emoji: "🍎", t: t("Fruit", "水果", "Les fruits", "La frutta", "Obst", "Meyveler"), words: fruits },
  { id: "vegetables", emoji: "🥕", t: t("Vegetables", "蔬菜", "Les légumes", "Le verdure", "Gemüse", "Sebzeler"), words: vegetables },
  { id: "drinks", emoji: "🥛", t: t("Drinks", "饮料", "Les boissons", "Le bevande", "Getränke", "İçecekler"), words: drinks },
  { id: "meals", emoji: "🍽️", t: t("Meals & Food", "餐和食物", "Les repas", "I pasti", "Mahlzeiten", "Öğünler ve Yiyecekler"), words: meals },
];
