import { Word, w } from "../types";

/**
 * EXTRA WORDS for the themes that already exist.
 *
 * Kept in its own file (merged by `../data/index.ts`) so the original theme files
 * stay readable: the four words below are added to the END of each theme's list,
 * every one of them with all six languages and pinyin, held to the same bar as
 * the built-in vocabulary — concrete, picturable, high-frequency for ages 3–6.
 *
 * Adding another word is a one-line change:
 *   w("emoji", "en", "中文", "pīnyīn", "fr", "it", "de", "tr")
 */
export const extrasSelfHome: Record<string, Word[]> = {
  body: [
    w("👅", "tongue", "舌头", "shétou", "la langue", "la lingua", "die Zunge", "dil"),
    w("🧠", "brain", "大脑", "dànǎo", "le cerveau", "il cervello", "das Gehirn", "beyin"),
    w("🦴", "bone", "骨头", "gǔtou", "l'os", "l'osso", "der Knochen", "kemik"),
    w("👆", "finger", "手指", "shǒuzhǐ", "le doigt", "il dito", "der Finger", "parmak"),
  ],
  clothes: [
    w("👢", "boots", "靴子", "xuēzi", "les bottes", "gli stivali", "die Stiefel", "botlar"),
    w("🩴", "sandals", "凉鞋", "liángxié", "les sandales", "i sandali", "die Sandalen", "sandalet"),
    w("🕶️", "sunglasses", "太阳镜", "tàiyángjìng", "les lunettes de soleil", "gli occhiali da sole", "die Sonnenbrille", "güneş gözlüğü"),
    w("⌚", "watch", "手表", "shǒubiǎo", "la montre", "l'orologio", "die Armbanduhr", "saat"),
  ],
  family: [
    w("👩", "aunt", "姑姑", "gūgu", "la tante", "la zia", "die Tante", "hala"),
    w("👨", "uncle", "叔叔", "shūshu", "l'oncle", "lo zio", "der Onkel", "amca"),
    w("👫", "parents", "父母", "fùmǔ", "les parents", "i genitori", "die Eltern", "ebeveynler"),
    w("🧑", "cousin", "表兄妹", "biǎoxiōngmèi", "le cousin", "il cugino", "der Cousin", "kuzen", { kind: "person" }),
  ],
  feelings: [
    w("🤗", "proud", "自豪", "zìháo", "fier", "orgoglioso", "stolz", "gururlu"),
    w("😳", "shy", "害羞", "hàixiū", "timide", "timido", "schüchtern", "utangaç"),
    w("🦸", "brave", "勇敢", "yǒnggǎn", "courageux", "coraggioso", "mutig", "cesur"),
    w("❤️", "love", "爱", "ài", "l'amour", "l'amore", "die Liebe", "sevgi", { kind: "thing" }),
  ],
  senses: [
    w("📢", "loud", "大声", "dàshēng", "fort", "forte", "laut", "yüksek", { kind: "opposite" }),
    w("🧸", "soft", "柔软", "róuruǎn", "doux", "morbido", "weich", "yumuşak", { kind: "opposite" }),
    w("🍬", "sweet", "甜", "tián", "sucré", "dolce", "süß", "tatlı", { kind: "food" }),
    w("✨", "bright", "明亮", "míngliàng", "lumineux", "luminoso", "hell", "parlak", { kind: "opposite" }),
  ],
  rooms: [
    w("🪜", "stairs", "楼梯", "lóutī", "les escaliers", "le scale", "die Treppe", "merdiven", { kind: "thing" }),
    w("🛗", "elevator", "电梯", "diàntī", "l'ascenseur", "l'ascensore", "der Aufzug", "asansör", { kind: "thing" }),
    w("🏡", "yard", "院子", "yuànzi", "la cour", "il cortile", "der Hof", "avlu"),
    w("📬", "mailbox", "邮箱", "yóuxiāng", "la boîte aux lettres", "la cassetta delle lettere", "der Briefkasten", "posta kutusu", { kind: "thing" }),
  ],
  furniture: [
    w("🗄️", "drawer", "抽屉", "chōuti", "le tiroir", "il cassetto", "die Schublade", "çekmece"),
    w("📚", "shelf", "架子", "jiàzi", "l'étagère", "lo scaffale", "das Regal", "raf"),
    w("🧊", "fridge", "冰箱", "bīngxiāng", "le frigo", "il frigorifero", "der Kühlschrank", "buzdolabı"),
    w("🖼️", "picture", "相框", "xiàngkuàng", "le cadre", "la cornice", "der Rahmen", "çerçeve"),
  ],
  toys: [
    w("🫧", "bubbles", "泡泡", "pàopao", "les bulles", "le bolle", "die Seifenblasen", "baloncuklar"),
    w("🤖", "robot", "机器人", "jīqìrén", "le robot", "il robot", "der Roboter", "robot"),
    w("🛹", "skateboard", "滑板", "huábǎn", "le skateboard", "lo skateboard", "das Skateboard", "kaykay"),
    w("🃏", "cards", "纸牌", "zhǐpái", "les cartes", "le carte", "die Karten", "oyun kartları"),
  ],
  routines: [
    w("💇", "comb my hair", "梳头", "shūtóu", "se coiffer", "pettinarsi", "sich kämmen", "saçını taramak"),
    w("👟", "tie my shoes", "系鞋带", "jì xiédài", "lacer mes chaussures", "allacciarmi le scarpe", "Schuhe binden", "ayakkabı bağlamak"),
    w("🧹", "help at home", "帮忙做事", "bāngmáng zuòshì", "aider à la maison", "aiutare in casa", "zu Hause helfen", "evde yardım etmek"),
    w("👋", "say goodbye", "说再见", "shuō zàijiàn", "dire au revoir", "dire arrivederci", "tschüss sagen", "hoşça kal demek"),
  ],
  food: [
    w("🍲", "soup", "汤", "tāng", "la soupe", "la zuppa", "die Suppe", "çorba"),
    w("🥗", "salad", "沙拉", "shālā", "la salade", "l'insalata", "der Salat", "salata"),
    w("🐟", "fish", "鱼", "yú", "le poisson", "il pesce", "der Fisch", "balık"),
    w("🧈", "butter", "黄油", "huángyóu", "le beurre", "il burro", "die Butter", "tereyağı"),
  ],
  fruitveg: [
    w("🍋", "lemon", "柠檬", "níngméng", "le citron", "il limone", "die Zitrone", "limon"),
    w("🍑", "peach", "桃子", "táozi", "la pêche", "la pesca", "der Pfirsich", "şeftali"),
    w("🍍", "pineapple", "菠萝", "bōluó", "l'ananas", "l'ananas", "die Ananas", "ananas"),
    w("🍄", "mushroom", "蘑菇", "mógu", "le champignon", "il fungo", "der Pilz", "mantar"),
  ],
  meals: [
    w("🧻", "napkin", "餐巾", "cānjīn", "la serviette", "il tovagliolo", "die Serviette", "peçete", { kind: "thing" }),
    w("🫖", "teapot", "茶壶", "cháhú", "la théière", "la teiera", "die Teekanne", "çaydanlık", { kind: "thing" }),
    w("🥢", "chopsticks", "筷子", "kuàizi", "les baguettes", "le bacchette", "die Stäbchen", "yemek çubukları", { kind: "thing" }),
    w("🎂", "cake", "蛋糕", "dàngāo", "le gâteau", "la torta", "der Kuchen", "pasta"),
  ],
};
