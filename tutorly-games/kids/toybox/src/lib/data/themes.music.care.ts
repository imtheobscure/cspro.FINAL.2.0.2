import { w, type Theme } from "./types";

/**
 * THEME 13 — Music & Making Sounds, and THEME 14 — Looking After Me.
 *
 * Two more everyday worlds for a 3–6 year old. Music is the noisiest room in
 * the playroom: instruments to name, the loud/quiet and fast/slow words a child
 * needs to control their own voice, and the singing/dancing verbs that turn a
 * language lesson into a game. Care is the useful one for a tutor: the bathroom
 * words, the doctor's words and the safety words a grown-up has to keep saying
 * anyway — now shared in six languages.
 *
 * Both themes reuse a built-in chant and CCQ frame, so every unit plays
 * everywhere a built-in unit does (word garden, echo cave, smoothies, the
 * talking train and the lesson library) with no extra wiring. Word ids are
 * unique across the dictionary — the words the built-ins already own (drum,
 * fast, slow, soap…) are not reused here.
 */
const music: Theme = {
  id: "music",
  name: "theme.music",
  icon: "🎵",
  color: "#b08fc4",
  soft: "#f2e9f6",
  chantId: "fun",
  frame: "frame.iCanSee",
  units: [
    {
      id: "musicband",
      name: "unit.musicband",
      icon: "🎺",
      words: [
        w("guitar", "🎸", "thing", ["guitar", "吉他", "jítā", "la guitare", "la chitarra", "die Gitarre", "gitar"]),
        w("piano", "🎹", "thing", ["piano", "钢琴", "gāngqín", "le piano", "il pianoforte", "das Klavier", "piyano"]),
        w("trumpet", "🎺", "thing", ["trumpet", "小号", "xiǎohào", "la trompette", "la tromba", "die Trompete", "trompet"]),
        w("violin", "🎻", "thing", ["violin", "小提琴", "xiǎotíqín", "le violon", "il violino", "die Geige", "keman"]),
        w("flute", "🪈", "thing", ["flute", "长笛", "chángdí", "la flûte", "il flauto", "die Flöte", "flüt"]),
        w("xylophone", "🎵", "thing", ["xylophone", "木琴", "mùqín", "le xylophone", "lo xilofono", "das Xylophon", "ksilofon"]),
        w("microphone", "🎤", "thing", ["microphone", "麦克风", "màikèfēng", "le micro", "il microfono", "das Mikrofon", "mikrofon"]),
        w("headphones", "🎧", "thing", ["headphones", "耳机", "ěrjī", "le casque", "le cuffie", "die Kopfhörer", "kulaklık"]),
      ],
    },
    {
      id: "soundtalk",
      name: "unit.soundtalk",
      icon: "🔊",
      words: [
        w("loudsound", "🔊", "feeling", ["noisy", "大声", "dàshēng", "bruyant", "rumoroso", "laut", "gürültülü"]),
        w("softsound", "🔉", "feeling", ["quiet", "小声", "xiǎoshēng", "doux", "piano", "leise", "kısık ses"]),
        w("whisper", "🤫", "action", ["whisper", "悄悄说", "qiāoqiāo shuō", "chuchoter", "sussurrare", "flüstern", "fısıldamak"]),
        w("shout", "📣", "action", ["shout", "喊", "hǎn", "crier", "gridare", "rufen", "bağırmak"]),
        w("echo", "🔁", "action", ["echo", "回声", "huíshēng", "l'écho", "l'eco", "das Echo", "yankı"]),
        w("listen2", "👂", "action", ["listen", "听", "tīng", "écouter", "ascoltare", "zuhören", "dinlemek"]),
        w("clap2", "👏", "action", ["clap", "拍手", "pāishǒu", "taper des mains", "battere le mani", "klatschen", "alkışlamak"]),
        w("stamp", "🦶", "action", ["stamp", "跺脚", "duòjiǎo", "taper des pieds", "battere i piedi", "stampfen", "ayak vurmak"]),
      ],
    },
    {
      id: "singdance",
      name: "unit.singdance",
      icon: "💃",
      words: [
        w("sing2", "🎤", "action", ["sing", "唱歌", "chànggē", "chanter", "cantare", "singen", "şarkı söylemek"]),
        w("dance2", "💃", "action", ["dance", "跳舞", "tiàowǔ", "danser", "ballare", "tanzen", "dans etmek"]),
        w("hum", "🎶", "action", ["hum", "哼歌", "hēnggē", "fredonner", "canticchiare", "summen", "mırıldanmak"]),
        w("twirl", "🌀", "action", ["twirl", "转圈", "zhuàn quān", "tourner", "girare", "sich drehen", "dönmek"]),
        w("song", "🎵", "thing", ["song", "歌", "gē", "la chanson", "la canzone", "das Lied", "şarkı"]),
        w("band", "🎼", "person", ["band", "乐队", "yuèduì", "le groupe", "la band", "die Band", "müzik grubu"]),
        w("stage", "🎪", "place", ["stage", "舞台", "wǔtái", "la scène", "il palco", "die Bühne", "sahne"]),
        w("quietmotion", "🕺", "action", ["move", "动起来", "dòng qǐlai", "bouger", "muoversi", "sich bewegen", "hareket etmek"]),
      ],
    },
  ],
};

const care: Theme = {
  id: "care",
  name: "theme.care",
  icon: "🧼",
  color: "#7f9fb5",
  soft: "#e6eef5",
  chantId: "me",
  frame: "frame.iHave",
  units: [
    {
      id: "bodycare",
      name: "unit.bodycare",
      icon: "🪥",
      words: [
        w("toothbrush2", "🪥", "thing", ["toothbrush", "牙刷", "yáshuā", "la brosse à dents", "lo spazzolino", "die Zahnbürste", "diş fırçası"]),
        w("toothpaste", "🧴", "thing", ["toothpaste", "牙膏", "yágāo", "le dentifrice", "il dentifricio", "die Zahnpasta", "diş macunu"]),
        w("soap2", "🧼", "thing", ["soap", "肥皂", "féizào", "le savon", "il sapone", "die Seife", "sabun"]),
        w("shampoo", "🧴", "thing", ["shampoo", "洗发水", "xǐfàshuǐ", "le shampooing", "lo shampoo", "das Shampoo", "şampuan"]),
        w("towel2", "🧻", "thing", ["hand towel", "毛巾", "máojīn", "la serviette", "l'asciugamano", "das Handtuch", "havlu"]),
        w("comb2", "🪮", "thing", ["comb", "梳子", "shūzi", "le peigne", "il pettine", "der Kamm", "tarak"]),
        w("tissue", "🤧", "thing", ["tissue", "纸巾", "zhǐjīn", "le mouchoir", "il fazzoletto", "das Taschentuch", "peçete"]),
        w("mirror2", "🪞", "thing", ["mirror", "镜子", "jìngzi", "le miroir", "lo specchio", "der Spiegel", "ayna"]),
      ],
    },
    {
      id: "health",
      name: "unit.health",
      icon: "🩺",
      words: [
        w("nurse2", "👩‍⚕️", "person", ["nurse", "护士", "hùshi", "l'infirmière", "l'infermiera", "die Krankenschwester", "hemşire"]),
        w("dentist2", "🦷", "person", ["dentist", "牙医", "yáyī", "le dentiste", "il dentista", "der Zahnarzt", "dişçi"]),
        w("medicine", "💊", "thing", ["medicine", "药", "yào", "le médicament", "la medicina", "das Medizin", "ilaç"]),
        w("plaster", "🩹", "thing", ["plaster", "创可贴", "chuàngkětiē", "le pansement", "il cerotto", "das Pflaster", "yara bandı"]),
        w("hospital2", "🏥", "place", ["hospital", "医院", "yīyuàn", "l'hôpital", "l'ospedale", "das Krankenhaus", "hastane"]),
        w("thermometer", "🌡️", "thing", ["thermometer", "体温计", "tǐwēn jì", "le thermomètre", "il termometro", "das Thermometer", "termometre"]),
        w("healthy", "💪", "feeling", ["healthy", "健康", "jiànkāng", "en bonne santé", "in salute", "gesund", "sağlıklı"]),
        w("sleepy2", "😴", "feeling", ["tired", "困", "kùn", "fatigué", "stanco", "müde", "yorgun"]),
      ],
    },
    {
      id: "safety",
      name: "unit.safety",
      icon: "🦺",
      words: [
        w("helmet", "⛑️", "thing", ["helmet", "头盔", "tóukuī", "le casque", "il casco", "der Helm", "kask"]),
        w("seatbelt", "🚗", "thing", ["seat belt", "安全带", "ānquándài", "la ceinture", "la cintura", "der Gurt", "emniyet kemeri"]),
        w("trafficlight2", "🚦", "thing", ["traffic light", "红绿灯", "hónglǜdēng", "le feu", "il semaforo", "die Ampel", "trafik lambası"]),
        w("crosswalk", "🚸", "place", ["crossing", "人行横道", "rénxíng héngdào", "le passage piéton", "le strisce", "der Zebrastreifen", "yaya geçidi"]),
        w("careful", "⚠️", "action", ["be careful", "小心", "xiǎoxīn", "attention", "attenzione", "aufpassen", "dikkat etmek"]),
        w("dangerous", "☢️", "feeling", ["dangerous", "危险", "wēixiǎn", "dangereux", "pericoloso", "gefährlich", "tehlikeli"]),
        w("safe", "🛟", "feeling", ["safe", "安全", "ānquán", "en sécurité", "al sicuro", "sicher", "güvende"]),
        w("holdhand", "🤝", "action", ["hold hands", "拉手", "lā shǒu", "se donner la main", "darsi la mano", "Händchen halten", "el ele tutuşmak"]),
      ],
    },
    {
      id: "littlejobs",
      name: "unit.littlejobs",
      icon: "🧹",
      words: [
        w("tidyup", "🧺", "action", ["tidy up", "收拾", "shōushi", "ranger", "riordinare", "aufräumen", "toplamak"]),
        w("sweep", "🧹", "action", ["sweep", "扫地", "sǎodì", "balayer", "spazzare", "fegen", "süpürmek"]),
        w("waterplants", "🪴", "action", ["water the plants", "浇花", "jiāohuā", "arroser les plantes", "annaffiare", "gießen", "çiçek sulamak"]),
        w("feedpet", "🐈", "action", ["feed the cat", "喂猫", "wèi māo", "nourrir le chat", "dare da mangiare al gatto", "die Katze füttern", "kediyi beslemek"]),
        w("makebed", "🛏️", "action", ["make the bed", "铺床", "pū chuáng", "faire le lit", "rifare il letto", "das Bett machen", "yatağı toplamak"]),
        w("laundry", "🧺", "thing", ["laundry", "要洗的衣服", "yào xǐ de yīfu", "le linge", "il bucato", "die Wäsche", "çamaşır"]),
        w("rubbishbin", "🗑️", "thing", ["rubbish bin", "垃圾桶", "lājī tǒng", "la poubelle", "il cestino", "der Mülleimer", "çöp kutusu"]),
        w("help2", "🙋", "action", ["help", "帮忙", "bāngmáng", "aider", "aiutare", "helfen", "yardım etmek"]),
      ],
    },
  ],
};

export const THEMES_MUSIC_CARE = [music, care];
