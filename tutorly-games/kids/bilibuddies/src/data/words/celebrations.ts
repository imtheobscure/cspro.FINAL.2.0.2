import { W, makeWords, t } from "../wordKit";
import type { Subtheme } from "../types";

const birthday = makeWords(
  "birthday",
  [
    W("🎂", "birthday", "生日", "shēngrì", "l'anniversaire", "il compleanno", "der Geburtstag", "doğum günü"),
    W("🍰", "cake", "蛋糕", "dàngāo", "le gâteau", "la torta", "der Kuchen", "kek"),
    W("🕯️", "candle", "蜡烛", "làzhú", "la bougie", "la candela", "die Kerze", "mum"),
    W("🎈", "balloon", "气球", "qìqiú", "le ballon", "il palloncino", "der Luftballon", "balon"),
    W("🎁", "present", "礼物", "lǐwù", "le cadeau", "il regalo", "das Geschenk", "hediye"),
    W("🎉", "party", "聚会", "jùhuì", "la fête", "la festa", "die Party", "parti"),
    W("🥳", "party hat", "派对帽", "pàiduì mào", "le chapeau de fête", "il cappellino", "der Partyhut", "parti şapkası"),
    W("🎊", "confetti", "彩纸", "cǎizhǐ", "les confettis", "i coriandoli", "das Konfetti", "konfeti"),
    W("💌", "card", "贺卡", "hèkǎ", "la carte", "il biglietto", "die Karte", "kart"),
    W("👑", "crown", "王冠", "wángguān", "la couronne", "la corona", "die Krone", "taç"),
    W("👭", "friends", "朋友们", "péngyoumen", "les amis", "gli amici", "die Freunde", "arkadaşlar"),
    W("🎶", "birthday song", "生日歌", "shēngrì gē", "la chanson", "la canzone", "das Lied", "doğum günü şarkısı"),
  ],
);

const holidays = makeWords(
  "holidays",
  [
    W("🎄", "Christmas", "圣诞节", "Shèngdànjié", "Noël", "Natale", "Weihnachten", "Noel"),
    W("🎅", "Santa", "圣诞老人", "Shèngdàn lǎorén", "le Père Noël", "Babbo Natale", "der Weihnachtsmann", "Noel Baba"),
    W("🛷", "sleigh", "雪橇", "xuěqiāo", "le traîneau", "la slitta", "der Schlitten", "kızak"),
    W("⛄", "snowman", "雪人", "xuěrén", "le bonhomme de neige", "il pupazzo di neve", "der Schneemann", "kardan adam"),
    W("🎃", "Halloween", "万圣节", "Wànshèngjié", "Halloween", "Halloween", "Halloween", "Cadılar Bayramı"),
    W("👻", "ghost", "幽灵", "yōulíng", "le fantôme", "il fantasma", "das Gespenst", "hayalet"),
    W("🧙", "witch", "女巫", "nǚwū", "la sorcière", "la strega", "die Hexe", "cadı"),
    W("🦇", "bat", "蝙蝠", "biānfú", "la chauve-souris", "il pipistrello", "die Fledermaus", "yarasa"),
    W("🎇", "New Year", "新年", "xīnnián", "le Nouvel An", "Capodanno", "Neujahr", "Yeni Yıl"),
    W("🎆", "fireworks", "烟花", "yānhuā", "le feu d'artifice", "i fuochi d'artificio", "das Feuerwerk", "havai fişek"),
    W("🐰", "Easter", "复活节", "fùhuójié", "Pâques", "Pasqua", "Ostern", "Paskalya"),
    W("🥚", "Easter egg", "复活节彩蛋", "fùhuójié cǎidàn", "l'œuf de Pâques", "l'uovo di Pasqua", "das Osterei", "Paskalya yumurtası"),
    W("🏮", "lantern", "灯笼", "dēnglong", "la lanterne", "la lanterna", "die Laterne", "fener"),
  ],
);

const hobbies = makeWords(
  "hobbies",
  [
    W("🎨", "drawing", "画画", "huàhuà", "le dessin", "il disegno", "das Malen", "resim"),
    W("🎤", "singing", "唱歌", "chànggē", "le chant", "il canto", "das Singen", "şarkı"),
    W("💃", "dancing", "跳舞", "tiàowǔ", "la danse", "la danza", "das Tanzen", "dans"),
    W("📚", "reading", "看书", "kànshū", "la lecture", "la lettura", "das Lesen", "okuma"),
    W("🧱", "building", "搭积木", "dā jīmù", "la construction", "le costruzioni", "das Bauen", "inşa etme"),
    W("⚽", "football", "足球", "zúqiú", "le foot", "il calcio", "der Fußball", "futbol"),
    W("🚲", "cycling", "骑自行车", "qí zìxíngchē", "le vélo", "la bici", "das Radfahren", "bisiklet"),
    W("🏊", "swimming", "游泳", "yóuyǒng", "la natation", "il nuoto", "das Schwimmen", "yüzme"),
    W("🎹", "music", "音乐", "yīnyuè", "la musique", "la musica", "die Musik", "müzik"),
    W("🧩", "puzzles", "拼图", "pīntú", "les puzzles", "i puzzle", "die Puzzles", "yapboz"),
    W("🌱", "gardening", "园艺", "yuányì", "le jardinage", "il giardinaggio", "das Gärtnern", "bahçecilik"),
    W("🙈", "hide and seek", "捉迷藏", "zhuōmícáng", "cache-cache", "nascondino", "Verstecken", "saklambaç"),
  ],
);

export const CELEBRATIONS_SUBTHEMES: Subtheme[] = [
  { id: "birthday", emoji: "🎂", t: t("Birthday Party", "生日聚会", "La fête d'anniversaire", "La festa di compleanno", "Geburtstagsparty", "Doğum Günü Partisi"), words: birthday },
  { id: "holidays", emoji: "🎄", t: t("Holidays", "节日", "Les fêtes", "Le feste", "Feste", "Bayramlar"), words: holidays },
  { id: "hobbies", emoji: "🎨", t: t("Hobbies & Free Time", "爱好和空闲时间", "Les loisirs", "I passatempi", "Hobbys", "Hobiler"), words: hobbies },
];
