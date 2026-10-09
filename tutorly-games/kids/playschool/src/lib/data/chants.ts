import type { Lang } from "./types";

export type Chant = {
  id: string;
  title: Record<Lang, string>;
  /** each line in each language — arrays must be the same length */
  lines: Record<Lang, string[]>;
  /** syllable beat counts, used for the bouncing-ball rhythm animation */
  beats: number[];
};

const C = (
  id: string,
  title: Record<Lang, string>,
  lines: Record<Lang, string[]>,
  beats: number[],
): Chant => ({ id, title, lines, beats });

export const CHANTS: Chant[] = [
  C(
    "me",
    {
      en: "This Is Me!",
      zh: "这就是我！",
      fr: "C'est moi !",
      it: "Questo sono io!",
      de: "Das bin ich!",
      tr: "Bu Benim!",
    },
    {
      en: [
        "This is me! This is me!",
        "My eyes can see. My eyes can see.",
        "My ears can hear. My ears can hear.",
        "I am happy! Ha-ha-ha!",
        "One, two, three — this is me!",
      ],
      zh: [
        "这就是我！这就是我！",
        "我的眼睛会看。我的眼睛会看。",
        "我的耳朵会听。我的耳朵会听。",
        "我很开心！哈哈哈！",
        "一、二、三——这就是我！",
      ],
      fr: [
        "C'est moi ! C'est moi !",
        "Mes yeux peuvent voir. Mes yeux peuvent voir.",
        "Mes oreilles peuvent entendre. Mes oreilles peuvent entendre.",
        "Je suis content ! Ha-ha-ha !",
        "Un, deux, trois — c'est moi !",
      ],
      it: [
        "Questo sono io! Questo sono io!",
        "I miei occhi vedono. I miei occhi vedono.",
        "Le mie orecchie sentono. Le mie orecchie sentono.",
        "Sono felice! Ha-ha-ha!",
        "Uno, due, tre — questo sono io!",
      ],
      de: [
        "Das bin ich! Das bin ich!",
        "Meine Augen sehen. Meine Augen sehen.",
        "Meine Ohren hören. Meine Ohren hören.",
        "Ich bin glücklich! Ha-ha-ha!",
        "Eins, zwei, drei — das bin ich!",
      ],
      tr: [
        "Bu benim! Bu benim!",
        "Gözlerim görür. Gözlerim görür.",
        "Kulaklarım duyar. Kulaklarım duyar.",
        "Ben mutluyum! Ha-ha-ha!",
        "Bir, iki, üç — bu benim!",
      ],
    },
    [4, 6, 6, 6, 6],
  ),
  C(
    "home",
    {
      en: "In My House",
      zh: "在我的家里",
      fr: "Dans ma maison",
      it: "Nella mia casa",
      de: "In meinem Haus",
      tr: "Benim Evimde",
    },
    {
      en: [
        "In my house, in my house,",
        "I can see a bed. I can see a bed.",
        "I can see a chair. I can see a chair.",
        "Yum, yum, yum — I eat my food!",
        "Night, night, night — I go to sleep!",
      ],
      zh: [
        "在我的家里，在我的家里，",
        "我看见一张床。我看见一张床。",
        "我看见一把椅子。我看见一把椅子。",
        "好吃，好吃，好吃——我吃饭啦！",
        "晚安，晚安，晚安——我去睡觉啦！",
      ],
      fr: [
        "Dans ma maison, dans ma maison,",
        "Je vois un lit. Je vois un lit.",
        "Je vois une chaise. Je vois une chaise.",
        "Miam, miam, miam — je mange !",
        "Bonne nuit, bonne nuit — je vais dormir !",
      ],
      it: [
        "Nella mia casa, nella mia casa,",
        "Vedo un letto. Vedo un letto.",
        "Vedo una sedia. Vedo una sedia.",
        "Gnam, gnam, gnam — io mangio!",
        "Notte, notte, notte — vado a dormire!",
      ],
      de: [
        "In meinem Haus, in meinem Haus,",
        "Ich sehe ein Bett. Ich sehe ein Bett.",
        "Ich sehe einen Stuhl. Ich sehe einen Stuhl.",
        "Mmm, mmm, mmm — ich esse!",
        "Nacht, Nacht, Nacht — ich gehe schlafen!",
      ],
      tr: [
        "Benim evimde, benim evimde,",
        "Bir yatak görüyorum. Bir yatak görüyorum.",
        "Bir sandalye görüyorum. Bir sandalye görüyorum.",
        "Nam, nam, nam — yemeğimi yiyorum!",
        "İyi geceler, iyi geceler — uyumaya gidiyorum!",
      ],
    },
    [4, 6, 6, 6, 6],
  ),
  C(
    "school",
    {
      en: "Colours, Numbers, ABC",
      zh: "颜色、数字、字母",
      fr: "Couleurs, nombres, ABC",
      it: "Colori, numeri, ABC",
      de: "Farben, Zahlen, ABC",
      tr: "Renkler, Sayılar, ABC",
    },
    {
      en: [
        "Red and yellow, blue and green,",
        "Circle, square and star!",
        "A, B, C — sing with me!",
        "One, two, three — count with me!",
        "Big and small, big and small!",
      ],
      zh: [
        "红色和黄色，蓝色和绿色，",
        "圆形、方形和星星！",
        "A、B、C——和我一起唱！",
        "一、二、三——和我一起数！",
        "大和小，大和小！",
      ],
      fr: [
        "Rouge et jaune, bleu et vert,",
        "Cercle, carré et étoile !",
        "A, B, C — chante avec moi !",
        "Un, deux, trois — compte avec moi !",
        "Grand et petit, grand et petit !",
      ],
      it: [
        "Rosso e giallo, blu e verde,",
        "Cerchio, quadrato e stella!",
        "A, B, C — canta con me!",
        "Uno, due, tre — conta con me!",
        "Grande e piccolo, grande e piccolo!",
      ],
      de: [
        "Rot und gelb, blau und grün,",
        "Kreis, Quadrat und Stern!",
        "A, B, C — sing mit mir!",
        "Eins, zwei, drei — zähl mit mir!",
        "Groß und klein, groß und klein!",
      ],
      tr: [
        "Kırmızı ve sarı, mavi ve yeşil,",
        "Daire, kare ve yıldız!",
        "A, B, C — benimle söyle!",
        "Bir, iki, üç — benimle say!",
        "Büyük ve küçük, büyük ve küçük!",
      ],
    },
    [6, 5, 6, 6, 6],
  ),
  C(
    "town",
    {
      en: "Beep, Beep, Choo, Choo!",
      zh: "哔哔，呜呜！",
      fr: "Bip, bip, tchou, tchou !",
      it: "Bip, bip, ciuf, ciuf!",
      de: "Tut, tut, tschu, tschu!",
      tr: "Bip, Bip, Çuf, Çuf!",
    },
    {
      en: [
        "In my town, in my town,",
        "The bus goes beep, beep, beep!",
        "The train goes choo, choo, choo!",
        "The plane goes up, up, up!",
        "Zoom, zoom, zoom — here we go!",
      ],
      zh: [
        "在我的城镇，在我的城镇，",
        "公共汽车哔哔哔！",
        "火车呜呜呜！",
        "飞机飞上天空！",
        "嗖，嗖，嗖——我们出发啦！",
      ],
      fr: [
        "Dans ma ville, dans ma ville,",
        "Le bus fait bip, bip, bip !",
        "Le train fait tchou, tchou, tchou !",
        "L'avion monte, monte, monte !",
        "Vroum, vroum, vroum — c'est parti !",
      ],
      it: [
        "Nella mia città, nella mia città,",
        "L'autobus fa bip, bip, bip!",
        "Il treno fa ciuf, ciuf, ciuf!",
        "L'aereo sale, sale, sale!",
        "Zum, zum, zum — si va!",
      ],
      de: [
        "In meiner Stadt, in meiner Stadt,",
        "Der Bus macht tut, tut, tut!",
        "Der Zug macht tschu, tschu, tschu!",
        "Das Flugzeug fliegt hoch, hoch, hoch!",
        "Flutsch, flutsch, flutsch — los geht's!",
      ],
      tr: [
        "Benim şehrimde, benim şehrimde,",
        "Otobüs bip, bip, bip der!",
        "Tren çuf, çuf, çuf der!",
        "Uçak yukarı, yukarı, yukarı!",
        "Vınn, vınn, vınn — haydi gidelim!",
      ],
    },
    [4, 6, 6, 6, 6],
  ),
  C(
    "nature",
    {
      en: "Animal Sounds",
      zh: "动物的声音",
      fr: "Les cris des animaux",
      it: "I versi degli animali",
      de: "Tiergeräusche",
      tr: "Hayvan Sesleri",
    },
    {
      en: [
        "The cat says meow, meow, meow.",
        "The dog says woof, woof, woof.",
        "The cow says moo, moo, moo.",
        "The duck says quack, quack, quack.",
        "I love animals — yes, yes, yes!",
      ],
      zh: [
        "小猫喵喵喵。",
        "小狗汪汪汪。",
        "奶牛哞哞哞。",
        "小鸭嘎嘎嘎。",
        "我爱动物——是，是，是！",
      ],
      fr: [
        "Le chat fait miaou, miaou, miaou.",
        "Le chien fait ouaf, ouaf, ouaf.",
        "La vache fait meuh, meuh, meuh.",
        "Le canard fait coin, coin, coin.",
        "J'aime les animaux — oui, oui, oui !",
      ],
      it: [
        "Il gatto fa miao, miao, miao.",
        "Il cane fa bau, bau, bau.",
        "La mucca fa muu, muu, muu.",
        "L'anatra fa qua, qua, qua.",
        "Amo gli animali — sì, sì, sì!",
      ],
      de: [
        "Die Katze macht miau, miau, miau.",
        "Der Hund macht wuff, wuff, wuff.",
        "Die Kuh macht muh, muh, muh.",
        "Die Ente macht quak, quak, quak.",
        "Ich mag Tiere — ja, ja, ja!",
      ],
      tr: [
        "Kedi miyav, miyav, miyav der.",
        "Köpek hav, hav, hav der.",
        "İnek mö, mö, mö der.",
        "Ördek vak, vak, vak der.",
        "Hayvanları severim — evet, evet, evet!",
      ],
    },
    [6, 6, 6, 6, 7],
  ),
  C(
    "fun",
    {
      en: "Party Day!",
      zh: "派对日！",
      fr: "Jour de fête !",
      it: "Giorno di festa!",
      de: "Partytag!",
      tr: "Parti Günü!",
    },
    {
      en: [
        "Happy birthday to you!",
        "One, two, three — blow the candles!",
        "Jump, jump, jump! Clap, clap, clap!",
        "Open your present — what is it?",
        "Hooray, hooray — it's party day!",
      ],
      zh: [
        "祝你生日快乐！",
        "一、二、三——吹蜡烛！",
        "跳，跳，跳！拍，拍，拍！",
        "打开你的礼物——是什么？",
        "万岁，万岁——今天是派对日！",
      ],
      fr: [
        "Joyeux anniversaire !",
        "Un, deux, trois — souffle les bougies !",
        "Saute, saute, saute ! Tape, tape, tape !",
        "Ouvre ton cadeau — qu'est-ce que c'est ?",
        "Hourra, hourra — c'est la fête !",
      ],
      it: [
        "Buon compleanno a te!",
        "Uno, due, tre — soffia le candeline!",
        "Salta, salta, salta! Batti, batti, batti!",
        "Apri il regalo — che cos'è?",
        "Urrà, urrà — è giorno di festa!",
      ],
      de: [
        "Alles Gute zum Geburtstag!",
        "Eins, zwei, drei — puste die Kerzen aus!",
        "Hüpf, hüpf, hüpf! Klatsch, klatsch, klatsch!",
        "Öffne dein Geschenk — was ist es?",
        "Hurra, hurra — es ist Partytag!",
      ],
      tr: [
        "İyi ki doğdun!",
        "Bir, iki, üç — mumları üfle!",
        "Zıpla, zıpla, zıpla! Alkışla, alkışla, alkışla!",
        "Hediyeni aç — o ne?",
        "Yaşasın, yaşasın — bugün parti günü!",
      ],
    },
    [5, 7, 6, 6, 7],
  ),
];

export const CHANT_MAP: Record<string, Chant> = Object.fromEntries(CHANTS.map((c) => [c.id, c]));
