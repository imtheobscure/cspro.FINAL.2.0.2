import { w, type Theme } from "./types";

/**
 * THEME 9 — Space Adventure, and THEME 10 — Dinosaur Days.
 *
 * The two themes a 3–6 year old asks for unprompted. Both are built the same way
 * as the originals: concrete nouns a child can point at or act out, one clear
 * emoji per word, six languages per word, and units that each become a
 * listen-echo-say lesson in Momo's echo cave as soon as they exist.
 *
 * `w(id, emoji, kind, [en, zh, pinyin, fr, it, de, tr])` — see `types.ts`.
 */
const space: Theme = {
  id: "space",
  name: "theme.space",
  icon: "🚀",
  color: "#8b9dd0",
  soft: "#e8ecf9",
  chantId: "nature",
  frame: "frame.iCanSee",
  units: [
    {
      id: "planets",
      name: "unit.planets",
      icon: "🪐",
      words: [
        w("planet", "🪐", "thing", ["planet", "行星", "xíngxīng", "la planète", "il pianeta", "der Planet", "gezegen"]),
        w("planetearth", "🌍", "nature", ["Earth", "地球", "dìqiú", "la Terre", "la Terra", "die Erde", "Dünya"]),
        w("mars", "🔴", "thing", ["Mars", "火星", "huǒxīng", "Mars", "Marte", "der Mars", "Mars"]),
        w("jupiter", "🟠", "thing", ["Jupiter", "木星", "mùxīng", "Jupiter", "Giove", "der Jupiter", "Jüpiter"]),
        w("saturn", "🪐", "thing", ["Saturn", "土星", "tǔxīng", "Saturne", "Saturno", "der Saturn", "Satürn"]),
        w("neptune", "🔵", "thing", ["Neptune", "海王星", "hǎiwángxīng", "Neptune", "Nettuno", "der Neptun", "Neptün"]),
        w("mercury", "🟡", "thing", ["Mercury", "水星", "shuǐxīng", "Mercure", "Mercurio", "der Merkur", "Merkür"]),
        w("moonshadow", "🌒", "nature", ["crescent moon", "弯月", "wānyuè", "le croissant de lune", "la luna crescente", "die Mondsichel", "hilal ay"]),
      ],
    },
    {
      id: "rockets",
      name: "unit.rockets",
      icon: "🚀",
      words: [
        w("spaceship", "🚀", "vehicle", ["spaceship", "宇宙飞船", "yǔzhòu fēichuán", "la fusée", "l'astronave", "das Raumschiff", "uzay gemisi"]),
        w("spacesuit", "🧑‍🚀", "clothes", ["space suit", "宇航服", "yǔhángfú", "la combinaison spatiale", "la tuta spaziale", "der Raumanzug", "uzay giysisi"]),
        w("astronaut", "👩‍🚀", "person", ["astronaut", "宇航员", "yǔhángyuán", "l'astronaute", "l'astronauta", "der Astronaut", "astronot"]),
        w("launchpad", "🛫", "place", ["launch pad", "发射台", "fāshètái", "la rampe de lancement", "la rampa di lancio", "die Startrampe", "fırlatma rampası"]),
        w("countdown", "3️⃣", "action", ["countdown", "倒计时", "dàojìshí", "le compte à rebours", "il conto alla rovescia", "der Countdown", "geri sayım"]),
        w("booster", "🔥", "thing", ["booster", "助推器", "zhùtuīqì", "le propulseur", "il razzo ausiliario", "der Booster", "itici güç"]),
        w("rocketfuel", "⛽", "thing", ["fuel", "燃料", "ránliào", "le carburant", "il carburante", "der Treibstoff", "yakıt"]),
        w("spacehelmet", "🪖", "clothes", ["space helmet", "宇航头盔", "yǔháng tóukuī", "le casque spatial", "il casco spaziale", "der Raumhelm", "uzay kaskı"]),
      ],
    },
    {
      id: "nightsky",
      name: "unit.nightsky",
      icon: "🌌",
      words: [
        w("shootingstar", "🌠", "nature", ["shooting star", "流星", "liúxīng", "l'étoile filante", "la stella cadente", "die Sternschnuppe", "kayan yıldız"]),
        w("comet", "☄️", "nature", ["comet", "彗星", "huìxīng", "la comète", "la cometa", "der Komet", "kuyruklu yıldız"]),
        w("galaxy", "🌌", "nature", ["galaxy", "星系", "xīngxì", "la galaxie", "la galassia", "die Galaxie", "galaksi"]),
        w("telescope", "🔭", "thing", ["telescope", "望远镜", "wàngyuǎnjìng", "le télescope", "il telescopio", "das Teleskop", "teleskop"]),
        w("satellite2", "🛰️", "thing", ["satellite", "卫星", "wèixīng", "le satellite", "il satellite", "der Satellit", "uydu"]),
        w("constellation", "✨", "nature", ["constellation", "星座", "xīngzuò", "la constellation", "la costellazione", "das Sternbild", "takımyıldız"]),
        w("milkyway", "🌫️", "nature", ["milky way", "银河", "yínhé", "la voie lactée", "la via lattea", "die Milchstraße", "samanyolu"]),
        w("starrynight", "🌃", "time", ["starry night", "星空", "xīngkōng", "la nuit étoilée", "la notte stellata", "die Sternennacht", "yıldızlı gece"]),
      ],
    },
    {
      id: "spacecrew",
      name: "unit.spacecrew",
      icon: "👽",
      words: [
        w("alien", "👽", "person", ["alien", "外星人", "wàixīngrén", "l'extraterrestre", "l'alieno", "das Alien", "uzaylı"]),
        w("ufo", "🛸", "vehicle", ["flying saucer", "飞碟", "fēidié", "la soucoupe volante", "il disco volante", "die Untertasse", "uçan daire"]),
        w("martian", "🟢", "person", ["martian", "火星人", "huǒxīngrén", "le martien", "il marziano", "der Marsmensch", "Marslı"]),
        w("robotfriend", "🤖", "person", ["robot", "机器人", "jīqìrén", "le robot", "il robot", "der Roboter", "robot"]),
        w("spacecat", "🐱🚀", "animal", ["space cat", "太空猫", "tàikōngmāo", "le chat de l'espace", "il gatto spaziale", "die Weltraumkatze", "uzay kedisi"]),
        w("starfriend", "⭐", "person", ["star friend", "星星朋友", "xīngxing péngyou", "l'ami étoile", "l'amico stella", "der Sternenfreund", "yıldız arkadaş"]),
      ],
    },
  ],
};

const dino: Theme = {
  id: "dino",
  name: "theme.dino",
  icon: "🦕",
  color: "#8aa877",
  soft: "#e9f0e2",
  chantId: "nature",
  frame: "frame.iCanSee",
  units: [
    {
      id: "dinofriends",
      name: "unit.dinofriends",
      icon: "🦖",
      words: [
        w("trex", "🦖", "animal", ["T-rex", "霸王龙", "bàwánglóng", "le T-rex", "il T-rex", "der T-Rex", "T-rex"]),
        w("triceratops", "🦕", "animal", ["triceratops", "三角龙", "sānjiǎolóng", "le tricératops", "il triceratopo", "der Triceratops", "triceratops"]),
        w("stegosaurus", "🦕", "animal", ["stegosaurus", "剑龙", "jiànlóng", "le stégosaure", "lo stegosauro", "der Stegosaurus", "stegosaurus"]),
        w("brachiosaurus", "🦕", "animal", ["brachiosaurus", "腕龙", "wànlóng", "le brachiosaure", "il brachiosauro", "der Brachiosaurus", "brachiosaurus"]),
        w("raptor", "🦖", "animal", ["raptor", "迅猛龙", "xùnměnglóng", "le vélociraptor", "il velociraptor", "der Raptor", "raptor"]),
        w("pterodactyl", "🦅", "animal", ["pterodactyl", "翼龙", "yìlóng", "le ptérodactyle", "lo pterodattilo", "der Pterodactylus", "pterodaktil"]),
        w("spinosaurus", "🦖", "animal", ["spinosaurus", "棘龙", "jílóng", "le spinosaure", "lo spinosauro", "der Spinosaurus", "spinosaurus"]),
        w("ankylosaurus", "🦕", "animal", ["ankylosaurus", "甲龙", "jiǎlóng", "l'ankylosaure", "l'anchilosauro", "der Ankylosaurus", "ankylosaurus"]),
      ],
    },
    {
      id: "dinolife",
      name: "unit.dinolife",
      icon: "🥚",
      words: [
        w("dinobaby", "🦕", "animal", ["dinosaur baby", "恐龙宝宝", "kǒnglóng bǎobǎo", "le bébé dinosaure", "il piccolo dinosauro", "das Dinobaby", "dinozor yavrusu"]),
        w("dinoegg", "🥚", "thing", ["dinosaur egg", "恐龙蛋", "kǒnglóng dàn", "l'œuf de dinosaure", "l'uovo di dinosauro", "das Dino-Ei", "dinozor yumurtası"]),
        w("dinonest", "🪹", "thing", ["nest", "巢", "cháo", "le nid", "il nido", "das Nest", "yuva"]),
        w("footprint", "👣", "thing", ["footprint", "脚印", "jiǎoyìn", "l'empreinte", "l'impronta", "der Fußabdruck", "ayak izi"]),
        w("fossil", "🦴", "thing", ["fossil", "化石", "huàshí", "le fossile", "il fossile", "das Fossil", "fosil"]),
        w("dinotooth", "🦷", "thing", ["dinosaur tooth", "恐龙牙齿", "kǒnglóng yáchǐ", "la dent de dinosaure", "il dente di dinosauro", "der Dinizahn", "dinozor dişi"]),
        w("hatchling", "🐣", "animal", ["hatching", "破壳", "pòké", "l'éclosion", "la schiusa", "das Schlüpfen", "yumurtadan çıkma"]),
        w("bigdinosaur", "🦕", "animal", ["big dinosaur", "大恐龙", "dà kǒnglóng", "le grand dinosaure", "il grande dinosauro", "der große Dinosaurier", "büyük dinozor"]),
      ],
    },
    {
      id: "volcano",
      name: "unit.volcano",
      icon: "🌋",
      words: [
        w("volcano", "🌋", "nature", ["volcano", "火山", "huǒshān", "le volcan", "il vulcano", "der Vulkan", "yanardağ"]),
        w("lava", "🔥", "nature", ["lava", "岩浆", "yánjiāng", "la lave", "la lava", "die Lava", "lav"]),
        w("eruption", "💥", "action", ["erupting", "喷发", "pēnfā", "l'éruption", "l'eruzione", "der Ausbruch", "püskürme"]),
        w("ashcloud", "🌫️", "nature", ["ash cloud", "火山灰", "huǒshānhuī", "le nuage de cendres", "la nuvola di cenere", "die Aschewolke", "kül bulutu"]),
        w("hotrock", "🪨", "nature", ["hot rock", "热岩石", "rè yánshí", "la roche chaude", "la roccia calda", "der heiße Stein", "sıcak kaya"]),
        w("magma", "🟠", "nature", ["magma", "岩浆", "yánjiāng", "le magma", "il magma", "das Magma", "magma"]),
        w("crater", "🕳️", "place", ["crater", "火山口", "huǒshānkǒu", "le cratère", "il cratere", "der Krater", "krater"]),
        w("mountainside", "⛰️", "place", ["mountain side", "山坡", "shānpō", "le flanc de la montagne", "il fianco della montagna", "der Berghang", "dağ yamacı"]),
      ],
    },
    {
      id: "fossilhunt",
      name: "unit.fossilhunt",
      icon: "🔎",
      words: [
        w("paleontologist", "🧑‍🔬", "person", ["fossil hunter", "化石猎人", "huàshí lièrén", "le paléontologue", "il paleontologo", "der Forscher", "fosil avcısı"]),
        w("digbrush", "🖌️", "thing", ["brush", "刷子", "shuāzi", "la brosse", "la spazzola", "die Bürste", "fırça"]),
        w("dig", "⛏️", "action", ["digging", "挖掘", "wājué", "creuser", "scavare", "graben", "kazmak"]),
        w("bones", "🦴", "thing", ["bones", "骨头", "gǔtou", "les os", "le ossa", "die Knochen", "kemikler"]),
        w("skeletonbones", "💀", "thing", ["skeleton", "骨架", "gǔjià", "le squelette", "lo scheletro", "das Skelett", "iskelet"]),
        w("dinomuseum", "🏛️", "place", ["museum", "博物馆", "bówùguǎn", "le musée", "il museo", "das Museum", "müze"]),
        w("magnifier", "🔍", "thing", ["magnifying glass", "放大镜", "fàngdàjìng", "la loupe", "la lente", "die Lupe", "büyüteç"]),
        w("soil", "🟤", "nature", ["soil", "泥土", "nítǔ", "la terre", "la terra", "die Erde", "toprak"]),
      ],
    },
  ],
};

export const THEMES_SPACE_DINO = [space, dino];
