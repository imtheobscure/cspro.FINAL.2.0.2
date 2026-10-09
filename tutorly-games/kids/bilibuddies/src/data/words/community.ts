import { W, makeWords, t, withSound } from "../wordKit";
import type { Subtheme } from "../types";

const town = makeWords(
  "town",
  [
    W("🏙️", "city", "城市", "chéngshì", "la ville", "la città", "die Stadt", "şehir"),
    W("🛣️", "street", "街道", "jiēdào", "la rue", "la strada", "die Straße", "sokak"),
    W("🏞️", "park", "公园", "gōngyuán", "le parc", "il parco", "der Park", "park"),
    W("🏪", "shop", "商店", "shāngdiàn", "le magasin", "il negozio", "das Geschäft", "mağaza"),
    W("🏥", "hospital", "医院", "yīyuàn", "l'hôpital", "l'ospedale", "das Krankenhaus", "hastane"),
    W("🚨", "fire station", "消防站", "xiāofángzhàn", "la caserne", "la caserma", "die Feuerwache", "itfaiye"),
    W("🏛️", "police station", "警察局", "jǐngchájú", "le commissariat", "la stazione di polizia", "die Polizeiwache", "karakol"),
    W("📚", "library", "图书馆", "túshūguǎn", "la bibliothèque", "la biblioteca", "die Bibliothek", "kütüphane"),
    W("🥖", "bakery", "面包店", "miànbāodiàn", "la boulangerie", "il panificio", "die Bäckerei", "fırın"),
    W("📮", "post office", "邮局", "yóujú", "la poste", "l'ufficio postale", "die Post", "postane"),
  ],
);

const places = makeWords(
  "places",
  [
    W("🛝", "playground", "游乐场", "yóulèchǎng", "l'aire de jeux", "il parco giochi", "der Spielplatz", "oyun parkı"),
    W("🛒", "supermarket", "超市", "chāoshì", "le supermarché", "il supermercato", "der Supermarkt", "süpermarket"),
    W("🦁", "zoo", "动物园", "dòngwùyuán", "le zoo", "lo zoo", "der Zoo", "hayvanat bahçesi"),
    W("🚜", "farm", "农场", "nóngchǎng", "la ferme", "la fattoria", "der Bauernhof", "çiftlik"),
    W("🏖️", "beach", "海滩", "hǎitān", "la plage", "la spiaggia", "der Strand", "plaj"),
    W("🏊", "swimming pool", "游泳池", "yóuyǒngchí", "la piscine", "la piscina", "das Schwimmbad", "havuz"),
    W("🍿", "cinema", "电影院", "diànyǐngyuàn", "le cinéma", "il cinema", "das Kino", "sinema"),
    W("🦖", "museum", "博物馆", "bówùguǎn", "le musée", "il museo", "das Museum", "müze"),
    W("🍴", "restaurant", "餐馆", "cānguǎn", "le restaurant", "il ristorante", "das Restaurant", "restoran"),
    W("🏫", "school", "学校", "xuéxiào", "l'école", "la scuola", "die Schule", "okul"),
  ],
);

const helpers = makeWords(
  "helpers",
  [
    W("👩‍🏫", "teacher", "老师", "lǎoshī", "la maîtresse", "la maestra", "die Lehrerin", "öğretmen"),
    W("🩺", "doctor", "医生", "yīshēng", "le docteur", "il dottore", "der Arzt", "doktor"),
    W("👩‍⚕️", "nurse", "护士", "hùshi", "l'infirmière", "l'infermiera", "die Krankenschwester", "hemşire"),
    W("👨‍🚒", "firefighter", "消防员", "xiāofángyuán", "le pompier", "il pompiere", "der Feuerwehrmann", "itfaiyeci"),
    W("👮", "police officer", "警察", "jǐngchá", "le policier", "il poliziotto", "der Polizist", "polis"),
    W("👨‍✈️", "pilot", "飞行员", "fēixíngyuán", "le pilote", "il pilota", "der Pilot", "pilot"),
    W("👨‍🍳", "chef", "厨师", "chúshī", "le cuisinier", "il cuoco", "der Koch", "aşçı"),
    W("👨‍🌾", "farmer", "农民", "nóngmín", "le fermier", "il contadino", "der Bauer", "çiftçi"),
    W("👷", "builder", "建筑工人", "jiànzhú gōngrén", "le constructeur", "il costruttore", "der Bauarbeiter", "inşaatçı"),
    W("🦷", "dentist", "牙医", "yáyī", "le dentiste", "il dentista", "der Zahnarzt", "diş hekimi"),
    W("🐾", "vet", "兽医", "shòuyī", "le vétérinaire", "il veterinario", "der Tierarzt", "veteriner"),
    W("💈", "hairdresser", "理发师", "lǐfàshī", "le coiffeur", "il parrucchiere", "der Friseur", "kuaför"),
  ],
);

const vehicles = makeWords(
  "vehicles",
  [
    withSound(W("🚗", "car", "汽车", "qìchē", "la voiture", "la macchina", "das Auto", "araba"), "Beep beep!", "嘀嘀！", "Tut tut !", "Bip bip!", "Tut tut!", "Düt düt!"),
    withSound(W("🚌", "bus", "公共汽车", "gōnggòng qìchē", "le bus", "l'autobus", "der Bus", "otobüs"), "Vroom vroom!", "轰轰！", "Vroum vroum !", "Brum brum!", "Brumm brumm!", "Vroom vroom!"),
    withSound(W("🚂", "train", "火车", "huǒchē", "le train", "il treno", "der Zug", "tren"), "Choo choo!", "呜呜——咔嚓！", "Wouh wouh !", "Ciuf ciuf!", "Tschu tschu!", "Çuf çuf!"),
    withSound(W("✈️", "plane", "飞机", "fēijī", "l'avion", "l'aereo", "das Flugzeug", "uçak"), "Whooooosh!", "呼——！", "Vrouuuu !", "Vrooom!", "Schwuuuu!", "Vuuuu!"),
    withSound(W("⛵", "boat", "船", "chuán", "le bateau", "la barca", "das Boot", "tekne"), "Toot toot!", "嘟嘟！", "Pouët pouët !", "Tuu tuu!", "Töööt!", "Düt düt!"),
    withSound(W("🚲", "bike", "自行车", "zìxíngchē", "le vélo", "la bicicletta", "das Fahrrad", "bisiklet"), "Ring ring!", "铃铃！", "Dring dring !", "Drin drin!", "Klingeling!", "Zil zil!"),
    withSound(W("🚚", "truck", "卡车", "kǎchē", "le camion", "il camion", "der Lastwagen", "kamyon"), "Honk honk!", "嘟嘟！", "Tut tut !", "Pon pon!", "Tuut tuut!", "Düt düt!"),
    withSound(W("🚕", "taxi", "出租车", "chūzūchē", "le taxi", "il taxi", "das Taxi", "taksi"), "Beep!", "嘀！", "Bip !", "Beep!", "Tut!", "Düt!"),
    withSound(W("🚁", "helicopter", "直升机", "zhíshēngjī", "l'hélicoptère", "l'elicottero", "der Hubschrauber", "helikopter"), "Whop whop whop!", "呼呼呼！", "Vlap vlap vlap !", "Vlap vlap!", "Wupp wupp!", "Vup vup!"),
    withSound(W("🚜", "tractor", "拖拉机", "tuōlājī", "le tracteur", "il trattore", "der Traktor", "traktör"), "Put put put!", "突突突！", "Pouet pouet !", "Brum brum!", "Tuck tuck!", "Pat pat!"),
    withSound(W("🚒", "fire engine", "消防车", "xiāofángchē", "le camion de pompiers", "l'autopompa", "das Feuerwehrauto", "itfaiye aracı"), "Wee-woo wee-woo!", "呜哇呜哇！", "Pin pon pin pon !", "Wee-woo wee-woo!", "Tatütata!", "Vee-vuu vee-vuu!"),
    withSound(W("🚑", "ambulance", "救护车", "jiùhùchē", "l'ambulance", "l'ambulanza", "der Krankenwagen", "ambulans"), "Wee-woo wee-woo!", "呜哇呜哇！", "Pin pon pin pon !", "Wee-woo!", "Tatütata!", "Vee-vuu!"),
    withSound(W("🛴", "scooter", "滑板车", "huábǎnchē", "la trottinette", "il monopattino", "der Roller", "scooter"), "Zoom!", "嗖！", "Zoom !", "Sfuuuum!", "Flutsch!", "Vızz!"),
    withSound(W("🚓", "police car", "警车", "jǐngchē", "la voiture de police", "l'auto della polizia", "das Polizeiauto", "polis arabası"), "Wee-woo!", "呜哇！", "Pin pon !", "Wee-woo!", "Tatütata!", "Vee-vuu!"),
    withSound(W("🚐", "van", "面包车", "miànbāochē", "le van", "il furgone", "der Lieferwagen", "minibüs"), "Vroom!", "轰！", "Vroum !", "Brum!", "Brumm!", "Vroom!"),
  ],
);

export const COMMUNITY_SUBTHEMES: Subtheme[] = [
  { id: "town", emoji: "🏙️", t: t("My Town", "我的城市", "Ma ville", "La mia città", "Meine Stadt", "Şehrim"), words: town },
  { id: "places", emoji: "🛝", t: t("Places to Go", "可以去的地方", "Les lieux", "I luoghi", "Orte", "Gidilecek Yerler"), words: places },
  { id: "helpers", emoji: "👩‍🏫", t: t("Community Helpers", "社区工作者", "Les métiers", "I mestieri", "Helfer und Berufe", "Toplum Yardımcıları"), words: helpers },
  { id: "vehicles", emoji: "🚗", t: t("Vehicles", "交通工具", "Les véhicules", "I veicoli", "Fahrzeuge", "Taşıtlar"), words: vehicles },
];
