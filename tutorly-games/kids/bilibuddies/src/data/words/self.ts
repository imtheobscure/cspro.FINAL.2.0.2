import { W, makeWords, t } from "../wordKit";
import type { Subtheme } from "../types";

const body = makeWords(
  "body",
  [
    W("🗣️", "head", "头", "tóu", "la tête", "la testa", "der Kopf", "baş"),
    W("💇", "hair", "头发", "tóufa", "les cheveux", "i capelli", "die Haare", "saç"),
    W("🙂", "face", "脸", "liǎn", "le visage", "la faccia", "das Gesicht", "yüz"),
    W("👁️", "eye", "眼睛", "yǎnjing", "l'œil", "l'occhio", "das Auge", "göz"),
    W("👂", "ear", "耳朵", "ěrduo", "l'oreille", "l'orecchio", "das Ohr", "kulak"),
    W("👃", "nose", "鼻子", "bízi", "le nez", "il naso", "die Nase", "burun"),
    W("👄", "mouth", "嘴巴", "zuǐba", "la bouche", "la bocca", "der Mund", "ağız"),
    W("🦷", "tooth", "牙齿", "yáchǐ", "la dent", "il dente", "der Zahn", "diş"),
    W("👅", "tongue", "舌头", "shétou", "la langue", "la lingua", "die Zunge", "dil"),
    W("✋", "hand", "手", "shǒu", "la main", "la mano", "die Hand", "el"),
    W("👆", "finger", "手指", "shǒuzhǐ", "le doigt", "il dito", "der Finger", "parmak"),
    W("💪", "arm", "手臂", "shǒubì", "le bras", "il braccio", "der Arm", "kol"),
    W("🦵", "leg", "腿", "tuǐ", "la jambe", "la gamba", "das Bein", "bacak"),
    W("🦶", "foot", "脚", "jiǎo", "le pied", "il piede", "der Fuß", "ayak"),
  ],
);

const clothes = makeWords(
  "clothes",
  [
    W("👕", "shirt", "衬衫", "chènshān", "la chemise", "la camicia", "das Hemd", "gömlek"),
    W("👖", "trousers", "裤子", "kùzi", "le pantalon", "i pantaloni", "die Hose", "pantolon"),
    W("🩳", "shorts", "短裤", "duǎnkù", "le short", "i pantaloncini", "die Shorts", "şort"),
    W("👗", "dress", "连衣裙", "liányīqún", "la robe", "il vestito", "das Kleid", "elbise"),
    W("👟", "shoes", "鞋子", "xiézi", "les chaussures", "le scarpe", "die Schuhe", "ayakkabı"),
    W("🧦", "socks", "袜子", "wàzi", "les chaussettes", "i calzini", "die Socken", "çorap"),
    W("🧢", "hat", "帽子", "màozi", "la casquette", "il cappello", "die Mütze", "şapka"),
    W("🧥", "coat", "外套", "wàitào", "le manteau", "il cappotto", "der Mantel", "palto"),
    W("🧣", "scarf", "围巾", "wéijīn", "l'écharpe", "la sciarpa", "der Schal", "atkı"),
    W("🧤", "gloves", "手套", "shǒutào", "les gants", "i guanti", "die Handschuhe", "eldiven"),
    W("🥾", "boots", "靴子", "xuēzi", "les bottes", "gli stivali", "die Stiefel", "bot"),
    W("🕶️", "sunglasses", "太阳镜", "tàiyángjìng", "les lunettes de soleil", "gli occhiali da sole", "die Sonnenbrille", "güneş gözlüğü"),
  ],
);

const family = makeWords(
  "family",
  [
    W("👩", "mum", "妈妈", "māma", "la maman", "la mamma", "die Mama", "anne"),
    W("👨", "dad", "爸爸", "bàba", "le papa", "il papà", "der Papa", "baba"),
    W("👶", "baby", "宝宝", "bǎobao", "le bébé", "il bebè", "das Baby", "bebek"),
    W("👦", "brother", "兄弟", "xiōngdì", "le frère", "il fratello", "der Bruder", "erkek kardeş"),
    W("👧", "sister", "姐妹", "jiěmèi", "la sœur", "la sorella", "die Schwester", "kız kardeş"),
    W("👵", "grandma", "奶奶", "nǎinai", "la grand-mère", "la nonna", "die Oma", "büyükanne"),
    W("👴", "grandpa", "爷爷", "yéye", "le grand-père", "il nonno", "der Opa", "büyükbaba"),
    W("👪", "family", "家人", "jiārén", "la famille", "la famiglia", "die Familie", "aile"),
    W("👫", "friend", "朋友", "péngyou", "l'ami", "l'amico", "der Freund", "arkadaş"),
    W("🧒", "child", "孩子", "háizi", "l'enfant", "il bambino", "das Kind", "çocuk"),
    W("🙋", "me", "我", "wǒ", "moi", "io", "ich", "ben"),
    W("❤️", "love", "爱", "ài", "l'amour", "l'amore", "die Liebe", "sevgi"),
  ],
);

const feelings = makeWords(
  "feelings",
  [
    W("😀", "happy", "开心", "kāixīn", "heureux", "felice", "glücklich", "mutlu"),
    W("😢", "sad", "难过", "nánguò", "triste", "triste", "traurig", "üzgün"),
    W("😠", "angry", "生气", "shēngqì", "fâché", "arrabbiato", "wütend", "kızgın"),
    W("😨", "scared", "害怕", "hàipà", "effrayé", "spaventato", "ängstlich", "korkmuş"),
    W("😴", "tired", "累", "lèi", "fatigué", "stanco", "müde", "yorgun"),
    W("😲", "surprised", "惊讶", "jīngyà", "surpris", "sorpreso", "überrascht", "şaşırmış"),
    W("🤪", "silly", "调皮", "tiáopí", "farceur", "buffo", "albern", "komik"),
    W("😋", "hungry", "饿", "è", "affamé", "affamato", "hungrig", "aç"),
    W("🥤", "thirsty", "渴", "kě", "assoiffé", "assetato", "durstig", "susuz"),
    W("🤒", "ill", "生病", "shēngbìng", "malade", "malato", "krank", "hasta"),
    W("🙈", "shy", "害羞", "hàixiū", "timide", "timido", "schüchtern", "utangaç"),
    W("🤩", "excited", "兴奋", "xīngfèn", "excité", "emozionato", "aufgeregt", "heyecanlı"),
    W("🥰", "loved", "被爱", "bèi ài", "aimé", "amato", "geliebt", "sevilmiş"),
  ],
);

const senses = makeWords(
  "senses",
  [
    W("👀", "see", "看", "kàn", "voir", "vedere", "sehen", "görmek"),
    W("👂", "hear", "听", "tīng", "entendre", "udire", "hören", "duymak"),
    W("👃", "smell", "闻", "wén", "sentir", "annusare", "riechen", "koklamak"),
    W("👅", "taste", "尝", "cháng", "goûter", "assaggiare", "schmecken", "tatmak"),
    W("✋", "touch", "摸", "mō", "toucher", "toccare", "anfassen", "dokunmak"),
    W("🤗", "feel", "感觉", "gǎnjué", "ressentir", "sentire", "fühlen", "hissetmek"),
  ],
);

export const SELF_SUBTHEMES: Subtheme[] = [
  { id: "body", emoji: "🧍", t: t("My Body", "我的身体", "Mon corps", "Il mio corpo", "Mein Körper", "Vücudum"), words: body },
  { id: "clothes", emoji: "👕", t: t("My Clothes", "我的衣服", "Mes vêtements", "I miei vestiti", "Meine Kleidung", "Kıyafetlerim"), words: clothes },
  { id: "family", emoji: "👪", t: t("My Family", "我的家人", "Ma famille", "La mia famiglia", "Meine Familie", "Ailem"), words: family },
  { id: "feelings", emoji: "😀", t: t("Feelings", "感觉和情绪", "Les émotions", "Le emozioni", "Gefühle", "Duygular"), words: feelings },
  { id: "senses", emoji: "👀", t: t("My Five Senses", "五种感觉", "Mes cinq sens", "I cinque sensi", "Meine fünf Sinne", "Beş Duyum"), words: senses },
];


