import { w, type Theme } from "./types";

/**
 * THEME 11 — Once Upon a Time, and THEME 12 — Sports & Games.
 *
 * The storytelling theme gives a tutor the words to invent a story out loud
 * (castle, dragon, treasure, magic) — the language young children produce most
 * willingly. The sports theme gives them something to move to. Both slot into
 * the same catalogue, so each unit becomes a listen-echo-say lesson, a set of
 * word-garden cards and a read-aloud word in all six languages.
 *
 * `w(id, emoji, kind, [en, zh, pinyin, fr, it, de, tr])` — see `types.ts`.
 */
const story: Theme = {
  id: "story",
  name: "theme.story",
  icon: "🏰",
  color: "#b189bd",
  soft: "#f1e7f5",
  chantId: "fun",
  frame: "frame.iHave",
  units: [
    {
      id: "castle",
      name: "unit.castle",
      icon: "🏰",
      words: [
        w("castle", "🏰", "place", ["castle", "城堡", "chéngbǎo", "le château", "il castello", "das Schloss", "şato"]),
        w("king", "🤴", "person", ["king", "国王", "guówáng", "le roi", "il re", "der König", "kral"]),
        w("queen", "👸", "person", ["queen", "王后", "wánghòu", "la reine", "la regina", "die Königin", "kraliçe"]),
        w("princess", "👑", "person", ["princess", "公主", "gōngzhǔ", "la princesse", "la principessa", "die Prinzessin", "prenses"]),
        w("prince", "🤵", "person", ["prince", "王子", "wángzǐ", "le prince", "il principe", "der Prinz", "prens"]),
        w("knight", "🛡️", "person", ["knight", "骑士", "qíshì", "le chevalier", "il cavaliere", "der Ritter", "şövalye"]),
        w("crown", "👑", "clothes", ["crown", "王冠", "wángguān", "la couronne", "la corona", "die Krone", "taç"]),
        w("castleflag", "🚩", "thing", ["flag", "旗帜", "qízhì", "le drapeau", "la bandiera", "die Fahne", "bayrak"]),
        w("tower", "🗼", "place", ["tower", "塔楼", "tǎlóu", "la tour", "la torre", "der Turm", "kule"]),
      ],
    },
    {
      id: "magicfolk",
      name: "unit.magicfolk",
      icon: "🧚",
      words: [
        w("dragon", "🐉", "animal", ["dragon", "龙", "lóng", "le dragon", "il drago", "der Drache", "ejderha"]),
        w("wizard", "🧙", "person", ["wizard", "魔法师", "mófǎshī", "le magicien", "il mago", "der Zauberer", "büyücü"]),
        w("fairy", "🧚", "person", ["fairy", "仙女", "xiānnǚ", "la fée", "la fata", "die Fee", "peri"]),
        w("unicorn", "🦄", "animal", ["unicorn", "独角兽", "dújiǎoshòu", "la licorne", "l'unicorno", "das Einhorn", "tek boynuzlu at"]),
        w("giant", "🗿", "person", ["giant", "巨人", "jùrén", "le géant", "il gigante", "der Riese", "dev"]),
        w("elf", "🧝", "person", ["elf", "精灵", "jīnglíng", "l'elfe", "l'elfo", "der Elf", "elf"]),
        w("mermaid", "🧜", "person", ["mermaid", "美人鱼", "měirényú", "la sirène", "la sirena", "die Meerjungfrau", "deniz kızı"]),
        w("magicwand", "🪄", "thing", ["magic wand", "魔杖", "mózhàng", "la baguette magique", "la bacchetta magica", "der Zauberstab", "sihirli değnek"]),
      ],
    },
    {
      id: "treasure",
      name: "unit.treasure",
      icon: "💎",
      words: [
        w("treasurechest", "🧰", "thing", ["treasure chest", "宝箱", "bǎoxiāng", "le coffre au trésor", "il forziere", "die Schatzkiste", "hazine sandığı"]),
        w("goldcoins", "🪙", "thing", ["gold coins", "金币", "jīnbì", "les pièces d'or", "le monete d'oro", "die Goldmünzen", "altın paralar"]),
        w("treasuremap", "🗺️", "thing", ["treasure map", "藏宝图", "cángbǎotú", "la carte au trésor", "la mappa del tesoro", "die Schatzkarte", "hazine haritası"]),
        w("oldkey", "🗝️", "thing", ["key", "钥匙", "yàoshi", "la clé", "la chiave", "der Schlüssel", "anahtar"]),
        w("spyglass", "🔭", "thing", ["spyglass", "望远镜", "wàngyuǎnjìng", "la longue-vue", "il cannocchiale", "das Fernrohr", "dürbün"]),
        w("magicpotion", "🧪", "thing", ["magic potion", "魔法药水", "mófǎ yàoshuǐ", "la potion magique", "la pozione magica", "der Zaubertrank", "sihirli iksir"]),
        w("magicmirror", "🪞", "thing", ["magic mirror", "魔镜", "mójìng", "le miroir magique", "lo specchio magico", "der Zauberspiegel", "sihirli ayna"]),
        w("treasureisland", "🏝️", "place", ["treasure island", "宝岛", "bǎodǎo", "l'île au trésor", "l'isola del tesoro", "die Schatzinsel", "hazine adası"]),
      ],
    },
  ],
};

const sport: Theme = {
  id: "sport",
  name: "theme.sport",
  icon: "⚽",
  color: "#d9a35d",
  soft: "#fbefdb",
  chantId: "school",
  frame: "frame.iCanSee",
  units: [
    {
      id: "ballgames",
      name: "unit.ballgames",
      icon: "🏀",
      words: [
        w("basketball", "🏀", "thing", ["basketball", "篮球", "lánqiú", "le basket", "la pallacanestro", "der Basketball", "basketbol"]),
        w("volleyball", "🏐", "thing", ["volleyball", "排球", "páiqiú", "le volley", "la pallavolo", "der Volleyball", "voleybol"]),
        w("tennisracket", "🎾", "thing", ["tennis racket", "网球拍", "wǎngqiúpāi", "la raquette", "la racchetta", "der Tennisschläger", "tenis raketi"]),
        w("tennisball", "🟡", "thing", ["tennis ball", "网球", "wǎngqiú", "la balle de tennis", "la pallina", "der Tennisball", "tenis topu"]),
        w("pingpong", "🏓", "thing", ["table tennis", "乒乓球", "pīngpāngqiú", "le ping-pong", "il ping-pong", "das Tischtennis", "masa tenisi"]),
        w("beachball", "🏖️", "thing", ["beach ball", "沙滩球", "shāntānqiú", "le ballon de plage", "il pallone da spiaggia", "der Strandball", "plaj topu"]),
        w("goalnet", "🥅", "thing", ["goal", "球门", "qiúmén", "le but", "la porta", "das Tor", "kale"]),
        w("hoop", "⭕", "thing", ["hoop", "篮圈", "lánquān", "le panier", "il canestro", "der Korb", "çember"]),
      ],
    },
    {
      id: "waterfun",
      name: "unit.waterfun",
      icon: "🏊",
      words: [
        w("swimmingpool", "🏊", "place", ["swimming pool", "游泳池", "yóuyǒngchí", "la piscine", "la piscina", "das Schwimmbad", "yüzme havuzu"]),
        w("goggles", "🥽", "clothes", ["goggles", "泳镜", "yǒngjìng", "les lunettes de piscine", "gli occhialini", "die Schwimmbrille", "deniz gözlüğü"]),
        w("floaty", "🛟", "thing", ["float", "游泳圈", "yóuyǒngquān", "la bouée", "il salvagente", "der Schwimmreifen", "can simidi"]),
        w("snorkel", "🤿", "thing", ["snorkel", "浮潜管", "fúqiǎnguǎn", "le tuba", "il boccaglio", "der Schnorchel", "şnorkel"]),
        w("paddle", "🛶", "thing", ["paddle", "船桨", "chuánjiǎng", "la pagaie", "la pagaia", "das Paddel", "kürek"]),
        w("swimcap", "🧢", "clothes", ["swimming cap", "泳帽", "yǒngmào", "le bonnet de bain", "la cuffia", "die Badekappe", "yüzme bonesi"]),
        w("flippers", "🐬", "thing", ["flippers", "脚蹼", "jiǎopǔ", "les palmes", "le pinne", "die Flossen", "palet"]),
        w("waterslide", "🌊", "thing", ["water slide", "水上滑梯", "shuǐshàng huátī", "le toboggan aquatique", "lo scivolo d'acqua", "die Wasserrutsche", "su kaydırağı"]),
      ],
    },
    {
      id: "races",
      name: "unit.races",
      icon: "🏃",
      words: [
        w("sprint", "🏃", "action", ["running fast", "快跑", "kuàipǎo", "courir vite", "correre veloce", "schnell laufen", "hızlı koşmak"]),
        w("relay", "🤝", "action", ["relay", "接力", "jiēlì", "le relais", "la staffetta", "die Staffel", "bayrak yarışı"]),
        w("whistle", "📣", "thing", ["whistle", "哨子", "shàozi", "le sifflet", "il fischietto", "die Pfeife", "düdük"]),
        w("medal", "🏅", "thing", ["medal", "奖牌", "jiǎngpái", "la médaille", "la medaglia", "die Medaille", "madalya"]),
        w("stopwatch", "⏱️", "thing", ["stopwatch", "秒表", "miǎobiǎo", "le chronomètre", "il cronometro", "die Stoppuhr", "kronometre"]),
        w("finishline", "🏁", "place", ["finish line", "终点线", "zhōngdiǎnxiàn", "la ligne d'arrivée", "il traguardo", "die Ziellinie", "bitiş çizgisi"]),
        w("startingline", "🚦", "place", ["starting line", "起跑线", "qǐpǎoxiàn", "la ligne de départ", "la linea di partenza", "die Startlinie", "başlangıç çizgisi"]),
        w("stretch", "🤸", "action", ["stretching", "拉伸", "lāshēn", "s'étirer", "allungarsi", "dehnen", "germe"]),
      ],
    },
  ],
};

export const THEMES_STORY_SPORT = [story, sport];
