import { Word, w } from "../types";

/** Extra words for the School & Learning and Neighborhood & Community themes. */
export const extrasSchoolCommunity: Record<string, Word[]> = {
  classroom: [
    w("🗺️", "map", "地图", "dìtú", "la carte", "la mappa", "die Karte", "harita"),
    w("📝", "homework", "作业", "zuòyè", "les devoirs", "i compiti", "die Hausaufgaben", "ödev"),
    w("❓", "question", "问题", "wèntí", "la question", "la domanda", "die Frage", "soru"),
    w("💡", "answer", "答案", "dá'àn", "la réponse", "la risposta", "die Antwort", "cevap"),
  ],
  supplies: [
    w("📎", "paperclip", "回形针", "huíxíngzhēn", "le trombone", "la graffetta", "die Büroklammer", "ataç"),
    w("📁", "folder", "文件夹", "wénjiànjiā", "le classeur", "il raccoglitore", "der Ordner", "dosya"),
    w("🖌️", "brush", "画笔", "huàbǐ", "le pinceau", "il pennello", "der Pinsel", "fırça"),
    w("🖍️", "chalk", "粉笔", "fěnbǐ", "la craie", "il gesso", "die Kreide", "tebeşir"),
  ],
  colors: [
    w("🥇", "gold", "金色", "jīnsè", "doré", "dorato", "golden", "altın"),
    w("🥈", "silver", "银色", "yínsè", "argenté", "argentato", "silbern", "gümüş"),
    w("🩶", "grey", "灰色", "huīsè", "gris", "grigio", "grau", "gri"),
    w("🌑", "dark", "深色", "shēnsè", "foncé", "scuro", "dunkel", "koyu", { kind: "opposite" }),
  ],
  shapes: [
    w("🌀", "spiral", "螺旋", "luóxuán", "la spirale", "la spirale", "die Spirale", "sarmal"),
    w("🌙", "crescent", "月牙", "yuèyá", "le croissant", "la mezzaluna", "die Mondsichel", "hilal"),
    w("➡️", "arrow", "箭头", "jiàntóu", "la flèche", "la freccia", "der Pfeil", "ok"),
    w("✖️", "cross", "十字", "shízì", "la croix", "la croce", "das Kreuz", "artı"),
  ],
  opposites: [
    w("📏", "long", "长", "cháng", "long", "lungo", "lang", "uzun"),
    w("📐", "short", "短", "duǎn", "court", "corto", "kurz", "kısa"),
    w("💦", "wet", "湿", "shī", "mouillé", "bagnato", "nass", "ıslak"),
    w("🏜️", "dry", "干", "gān", "sec", "asciutto", "trocken", "kuru"),
  ],
  verbs: [
    w("🔓", "open", "打开", "dǎkāi", "ouvrir", "aprire", "öffnen", "açmak"),
    w("🔒", "close", "关上", "guānshàng", "fermer", "chiudere", "schließen", "kapatmak"),
    w("🤲", "give", "给", "gěi", "donner", "dare", "geben", "vermek"),
    w("🧼", "wash", "洗", "xǐ", "laver", "lavare", "waschen", "yıkamak"),
  ],
  town: [
    w("🚏", "bus stop", "车站", "chēzhàn", "l'arrêt de bus", "la fermata", "die Haltestelle", "durak"),
    w("🚸", "crossing", "人行横道", "rénxíng héngdào", "le passage piéton", "le strisce pedonali", "der Zebrastreifen", "yaya geçidi"),
    w("🏦", "bank", "银行", "yínháng", "la banque", "la banca", "die Bank", "banka"),
    w("🚉", "station", "火车站", "huǒchēzhàn", "la gare", "la stazione", "der Bahnhof", "istasyon"),
  ],
  places: [
    w("🏛️", "museum", "博物馆", "bówùguǎn", "le musée", "il museo", "das Museum", "müze"),
    w("🏨", "hotel", "旅馆", "lǚguǎn", "l'hôtel", "l'hotel", "das Hotel", "otel"),
    w("🅿️", "parking", "停车场", "tíngchēchǎng", "le parking", "il parcheggio", "der Parkplatz", "otopark", { kind: "thing" }),
    w("🛄", "airport", "机场", "jīchǎng", "l'aéroport", "l'aeroporto", "der Flughafen", "havalimanı"),
  ],
  jobs: [
    w("🦷", "dentist", "牙医", "yáyī", "le dentiste", "il dentista", "der Zahnarzt", "diş doktoru"),
    w("🐕", "vet", "兽医", "shòuyī", "le vétérinaire", "il veterinario", "der Tierarzt", "veteriner"),
    w("🥐", "baker", "面包师", "miànbāoshī", "le boulanger", "il panettiere", "der Bäcker", "fırıncı"),
    w("🎤", "singer", "歌手", "gēshǒu", "le chanteur", "il cantante", "der Sänger", "şarkıcı"),
  ],
  vehicles: [
    w("🚕", "taxi", "出租车", "chūzūchē", "le taxi", "il taxi", "das Taxi", "taksi"),
    w("🚇", "subway", "地铁", "dìtiě", "le métro", "la metropolitana", "die U-Bahn", "metro"),
    w("🚜", "tractor", "拖拉机", "tuōlājī", "le tracteur", "il trattore", "der Traktor", "traktör"),
    w("🚢", "ship", "轮船", "lúnchuán", "le navire", "la nave", "das Schiff", "gemi"),
  ],
};
