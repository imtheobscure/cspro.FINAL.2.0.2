import { Theme, w, tt } from "../types";

/**
 * NEW THEMES — ten more topics, at least one in every topic area, so each
 * category in the app is visibly deeper than it was. Same bar as the rest of the
 * library: concrete, picturable, high-frequency words for ages 3–6, all six
 * languages, pinyin on every Chinese word.
 */
export const part4: Theme[] = [
  // ───────────── SELF & FAMILY ─────────────
  {
    id: "bath-time",
    category: "self",
    emoji: "🛁",
    kind: "thing",
    title: tt("Bath Time", "洗澡时间", "L'heure du bain", "L'ora del bagno", "Badezeit", "Banyo Zamanı"),
    words: [
      w("🛁", "bathtub", "浴缸", "yùgāng", "la baignoire", "la vasca", "die Badewanne", "küvet"),
      w("🧼", "soap", "肥皂", "féizào", "le savon", "il sapone", "die Seife", "sabun"),
      w("🧻", "towel", "毛巾", "máojīn", "la serviette", "l'asciugamano", "das Handtuch", "havlu"),
      w("🧴", "shampoo", "洗发水", "xǐfàshuǐ", "le shampooing", "lo shampoo", "das Shampoo", "şampuan"),
      w("🧽", "sponge", "海绵", "hǎimián", "l'éponge", "la spugna", "der Schwamm", "sünger"),
      w("🚿", "shower", "淋浴", "línyù", "la douche", "la doccia", "die Dusche", "duş", { kind: "thing" }),
      w("🪥", "toothbrush", "牙刷", "yáshuā", "la brosse à dents", "lo spazzolino", "die Zahnbürste", "diş fırçası"),
      w("🦷", "toothpaste", "牙膏", "yágāo", "le dentifrice", "il dentifricio", "die Zahnpasta", "diş macunu"),
    ],
  },
  {
    id: "manners",
    category: "self",
    emoji: "🙏",
    kind: "action",
    title: tt("Kind Words", "礼貌用语", "Les mots gentils", "Le parole gentili", "Höfliche Wörter", "Nazik Sözler"),
    words: [
      w("👋", "hello", "你好", "nǐhǎo", "bonjour", "ciao", "hallo", "merhaba"),
      w("🙏", "thank you", "谢谢", "xièxie", "merci", "grazie", "danke", "teşekkürler"),
      w("🥺", "please", "请", "qǐng", "s'il te plaît", "per favore", "bitte", "lütfen"),
      w("😔", "sorry", "对不起", "duìbuqǐ", "pardon", "scusa", "entschuldigung", "özür dilerim"),
      w("👍", "yes", "好的", "hǎo de", "oui", "sì", "ja", "evet"),
      w("👎", "no", "不是", "bú shì", "non", "no", "nein", "hayır"),
      w("🤝", "welcome", "欢迎", "huānyíng", "bienvenue", "benvenuto", "willkommen", "hoş geldin"),
      w("❤️", "I love you", "我爱你", "wǒ ài nǐ", "je t'aime", "ti amo", "ich liebe dich", "seni seviyorum"),
    ],
  },

  // ───────────── HOME & DAILY LIFE ─────────────
  {
    id: "bedtime",
    category: "home",
    emoji: "🌙",
    kind: "thing",
    title: tt("Bedtime", "睡前时间", "Le coucher", "La nanna", "Schlafenszeit", "Uyku Zamanı"),
    words: [
      w("🛏️", "pillow", "枕头", "zhěntou", "l'oreiller", "il cuscino", "das Kissen", "yastık"),
      w("🛌", "blanket", "毯子", "tǎnzi", "la couverture", "la coperta", "die Decke", "battaniye"),
      w("🩳", "pyjamas", "睡衣", "shuìyī", "le pyjama", "il pigiama", "der Schlafanzug", "pijama", { kind: "clothes" }),
      w("💡", "night light", "小夜灯", "xiǎo yèdēng", "la veilleuse", "la lucina", "das Nachtlicht", "gece lambası"),
      w("📖", "story", "故事", "gùshi", "l'histoire", "la storia", "die Geschichte", "hikâye"),
      w("😘", "kiss", "亲亲", "qīnqin", "le bisou", "il bacio", "der Kuss", "öpücük", { kind: "action" }),
      w("🌜", "good night", "晚安", "wǎn'ān", "bonne nuit", "buonanotte", "gute Nacht", "iyi geceler"),
      w("💭", "dream", "梦", "mèng", "le rêve", "il sogno", "der Traum", "rüya"),
    ],
  },
  {
    id: "chores",
    category: "home",
    emoji: "🧺",
    kind: "action",
    title: tt("Helping at Home", "帮忙做家务", "Aider à la maison", "Aiutare in casa", "Zu Hause helfen", "Evde Yardım"),
    words: [
      w("🧺", "tidy up", "收拾", "shōushi", "ranger", "riordinare", "aufräumen", "toplamak"),
      w("🛏️", "make the bed", "整理床铺", "zhěnglǐ chuángpù", "faire le lit", "rifare il letto", "das Bett machen", "yatağı toplamak"),
      w("🪴", "water the plants", "浇花", "jiāohuā", "arroser les plantes", "annaffiare le piante", "die Blumen gießen", "çiçekleri sulamak"),
      w("🐶", "feed the pet", "喂宠物", "wèi chǒngwù", "nourrir l'animal", "dare da mangiare al cane", "das Tier füttern", "hayvanı beslemek"),
      w("🍽️", "set the table", "摆餐具", "bǎi cānjù", "mettre la table", "apparecchiare", "den Tisch decken", "sofrayı kurmak"),
      w("🧹", "sweep", "扫地", "sǎodì", "balayer", "spazzare", "fegen", "süpürmek"),
      w("🧼", "do the dishes", "洗碗", "xǐwǎn", "faire la vaisselle", "lavare i piatti", "abspülen", "bulaşık yıkamak"),
      w("🗑️", "take out the bin", "倒垃圾", "dào lājī", "sortir la poubelle", "buttare la spazzatura", "den Müll rausbringen", "çöpü atmak"),
    ],
  },

  // ───────────── SCHOOL & LEARNING ─────────────
  {
    id: "maths",
    category: "school",
    emoji: "🧮",
    kind: "number",
    title: tt("Maths Words", "数学用语", "Les mots des maths", "Le parole della matematica", "Mathe-Wörter", "Matematik Sözleri"),
    words: [
      w("🔢", "count", "数一数", "shǔ yi shǔ", "compter", "contare", "zählen", "saymak"),
      w("❓", "how many", "多少", "duōshao", "combien", "quanti", "wie viele", "kaç tane"),
      w("➕", "more", "更多", "gèng duō", "plus", "di più", "mehr", "daha çok", { kind: "opposite" }),
      w("➖", "less", "更少", "gèng shǎo", "moins", "di meno", "weniger", "daha az", { kind: "opposite" }),
      w("🟰", "same", "一样", "yíyàng", "pareil", "uguale", "gleich", "aynı", { kind: "opposite" }),
      w("🥇", "first", "第一", "dì yī", "premier", "primo", "erste", "birinci"),
      w("🏁", "last", "最后", "zuìhòu", "dernier", "ultimo", "letzte", "son"),
      w("🍕", "half", "一半", "yíbàn", "la moitié", "la metà", "die Hälfte", "yarım"),
    ],
  },

  // ───────────── NEIGHBORHOOD & COMMUNITY ─────────────
  {
    id: "road-safety",
    category: "community",
    emoji: "🚦",
    kind: "action",
    title: tt("Road Safety", "交通安全", "La sécurité routière", "La sicurezza stradale", "Verkehrssicherheit", "Trafik Güvenliği"),
    words: [
      w("✋", "stop", "停", "tíng", "arrête", "fermati", "halt", "dur"),
      w("⏳", "wait", "等一等", "děng yi děng", "attends", "aspetta", "warte", "bekle"),
      w("👀", "look", "看一看", "kàn yi kàn", "regarde", "guarda", "schau", "bak"),
      w("🚶", "cross", "过马路", "guò mǎlù", "traverse", "attraversa", "überqueren", "karşıya geç"),
      w("🤝", "hold hands", "拉手", "lā shǒu", "tenir la main", "tenere la mano", "Händchen halten", "el tutmak"),
      w("⛑️", "helmet", "头盔", "tóukuī", "le casque", "il casco", "der Helm", "kask", { kind: "clothes" }),
      w("🧷", "seat belt", "安全带", "ānquándài", "la ceinture de sécurité", "la cintura di sicurezza", "der Sicherheitsgurt", "emniyet kemeri", { kind: "thing" }),
      w("🚧", "road sign", "路牌", "lùpái", "le panneau", "il cartello", "das Verkehrsschild", "trafik levhası", { kind: "thing" }),
    ],
  },
  {
    id: "shopping",
    category: "community",
    emoji: "🛒",
    kind: "thing",
    title: tt("At the Shop", "在商店", "Au magasin", "Al negozio", "Im Laden", "Dükkânda"),
    words: [
      w("🏪", "shop", "商店", "shāngdiàn", "le magasin", "il negozio", "der Laden", "dükkân", { kind: "place" }),
      w("🛒", "trolley", "购物车", "gòuwùchē", "le caddie", "il carrello", "der Einkaufswagen", "alışveriş arabası"),
      w("🛍️", "bag", "袋子", "dàizi", "le sac", "la busta", "die Tüte", "poşet"),
      w("💰", "money", "钱", "qián", "l'argent", "i soldi", "das Geld", "para"),
      w("📝", "list", "清单", "qīngdān", "la liste", "la lista", "die Liste", "liste"),
      w("💳", "pay", "付钱", "fù qián", "payer", "pagare", "bezahlen", "ödemek", { kind: "action" }),
      w("💲", "price", "多少钱", "duōshao qián", "le prix", "il prezzo", "der Preis", "fiyat"),
      w("🪙", "change", "找钱", "zhǎo qián", "la monnaie", "il resto", "das Wechselgeld", "para üstü"),
    ],
  },

  // ───────────── ANIMALS & NATURE ─────────────
  {
    id: "baby-animals",
    category: "nature",
    emoji: "🐣",
    kind: "animal",
    title: tt("Baby Animals", "动物宝宝", "Les bébés animaux", "I cuccioli", "Tierbabys", "Hayvan Yavruları"),
    words: [
      w("🐄", "calf", "小牛", "xiǎoniú", "le veau", "il vitello", "das Kalb", "buzağı"),
      w("🐑", "lamb", "小羊", "xiǎoyáng", "l'agneau", "l'agnello", "das Lamm", "kuzu"),
      w("🦆", "duckling", "小鸭", "xiǎoyā", "le caneton", "l'anatroccolo", "das Entchen", "ördek yavrusu"),
      w("🐷", "piglet", "小猪", "xiǎozhū", "le porcelet", "il maialino", "das Ferkel", "domuz yavrusu"),
      w("🐻", "bear cub", "小熊", "xiǎoxióng", "l'ourson", "l'orsetto", "der Bärenjunge", "ayı yavrusu"),
      w("🐸", "tadpole", "蝌蚪", "kēdǒu", "le têtard", "il girino", "die Kaulquappe", "iribaş"),
      w("🐴", "foal", "小马驹", "xiǎomǎjū", "le poulain", "il puledro", "das Fohlen", "tay"),
      w("🦘", "joey", "小袋鼠", "xiǎo dàishǔ", "le bébé kangourou", "il piccolo canguro", "das Kängurubaby", "yavru kanguru"),
    ],
  },

  // ───────────── CELEBRATIONS & LEISURE ─────────────
  {
    id: "music",
    category: "fun",
    emoji: "🎵",
    kind: "thing",
    title: tt("Music Makers", "乐器", "Les instruments", "Gli strumenti", "Instrumente", "Çalgılar"),
    words: [
      w("🥁", "drum", "鼓", "gǔ", "le tambour", "il tamburo", "die Trommel", "davul"),
      w("🎹", "piano", "钢琴", "gāngqín", "le piano", "il pianoforte", "das Klavier", "piyano"),
      w("🎸", "guitar", "吉他", "jítā", "la guitare", "la chitarra", "die Gitarre", "gitar"),
      w("🎻", "violin", "小提琴", "xiǎotíqín", "le violon", "il violino", "die Geige", "keman"),
      w("🪈", "flute", "笛子", "dízi", "la flûte", "il flauto", "die Flöte", "flüt"),
      w("🎺", "trumpet", "小号", "xiǎohào", "la trompette", "la tromba", "die Trompete", "trompet"),
      w("🔔", "bell", "铃铛", "língdang", "la cloche", "la campana", "die Glocke", "zil"),
      w("🎤", "microphone", "麦克风", "màikèfēng", "le micro", "il microfono", "das Mikrofon", "mikrofon"),
    ],
  },
  {
    id: "playground",
    category: "fun",
    emoji: "🛝",
    kind: "thing",
    title: tt("Playground", "游乐场", "Le terrain de jeux", "Il parco giochi", "Der Spielplatz", "Oyun Parkı"),
    words: [
      w("🛝", "slide", "滑梯", "huátī", "le toboggan", "lo scivolo", "die Rutsche", "kaydırak"),
      w("⚖️", "seesaw", "跷跷板", "qiāoqiāobǎn", "la balançoire à bascule", "l'altalena", "die Wippe", "tahterevalli"),
      w("🏖️", "sandbox", "沙坑", "shākēng", "le bac à sable", "la sabbiera", "der Sandkasten", "kum havuzu", { kind: "place" }),
      w("🙈", "hide and seek", "捉迷藏", "zhuōmícáng", "cache-cache", "nascondino", "Verstecken", "saklambaç", { kind: "action" }),
      w("🪢", "jumping rope", "跳绳", "tiàoshéng", "la corde à sauter", "la corda", "das Springseil", "ip atlama"),
      w("🦶", "hopscotch", "跳房子", "tiào fángzi", "la marelle", "la campana", "Himmel und Hölle", "seksek", { kind: "action" }),
      w("🎠", "carousel", "旋转木马", "xuánzhuǎn mùmǎ", "le manège", "la giostra", "das Karussell", "atlıkarınca"),
      w("🧗", "climbing frame", "攀爬架", "pānpájià", "le portique", "la struttura per arrampicarsi", "das Klettergerüst", "tırmanma çubuğu"),
    ],
  },
];
