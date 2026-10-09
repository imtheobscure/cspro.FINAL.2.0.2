import { w, type Theme } from "./types";

/**
 * THEME 7 — Yummy Food & Drink, and THEME 8 — Shops & Shopping.
 *
 * Two of the three everyday themes a 3–6 year old actually lives inside: what
 * goes on the plate, and the little errands with an adult. Every unit is a
 * ready lesson for Momo's echo cave (the catalogue turns each unit into
 * listen-echo-say lessons automatically), and every word is also a card in the
 * word garden, so it can be read aloud in all six languages.
 *
 * Word ids are unique across the whole dictionary — the built-ins already own
 * the obvious ones (water, milk, juice, bread, cheese, chocolate, soup, cake…),
 * so these are the words a child meets next.
 */
const yum: Theme = {
  id: "yum",
  name: "theme.yum",
  icon: "🍎",
  color: "#e08f76",
  soft: "#fbe7e0",
  chantId: "fun",
  frame: "frame.iLike",
  units: [
    {
      id: "drinks",
      name: "unit.drinks",
      icon: "🥤",
      words: [
        w("tea", "🍵", "drink", ["tea", "茶", "chá", "le thé", "il tè", "der Tee", "çay"]),
        w("hotchocolate", "☕", "drink", ["hot chocolate", "热巧克力", "rè qiǎokèlì", "le chocolat chaud", "la cioccolata calda", "die heiße Schokolade", "sıcak çikolata"]),
        w("lemonade", "🍋", "drink", ["lemonade", "柠檬水", "níngméngshuǐ", "la citronnade", "la limonata", "die Limonade", "limonata"]),
        w("smoothie", "🥤", "drink", ["smoothie", "冰沙", "bīngshā", "le smoothie", "il frullato", "der Smoothie", "meyve suyu"]),
        w("milkshake", "🥛", "drink", ["milkshake", "奶昔", "nǎixī", "le milk-shake", "il frullato di latte", "der Milchshake", "milkshake"]),
        w("sparklingwater", "💧", "drink", ["fizzy water", "气泡水", "qìpàoshuǐ", "l'eau pétillante", "l'acqua frizzante", "das Sprudelwasser", "maden suyu"]),
        w("greentea", "🍃", "drink", ["green tea", "绿茶", "lǜchá", "le thé vert", "il tè verde", "der grüne Tee", "yeşil çay"]),
        w("applejuice", "🧃", "drink", ["apple juice", "苹果汁", "píngguǒzhī", "le jus de pomme", "il succo di mela", "der Apfelsaft", "elma suyu"]),
      ],
    },
    {
      id: "snacks",
      name: "unit.snacks",
      icon: "🍿",
      words: [
        w("popcorn", "🍿", "food", ["popcorn", "爆米花", "bàomǐhuā", "le pop-corn", "i popcorn", "das Popcorn", "patlamış mısır"]),
        w("cracker", "🍘", "food", ["cracker", "饼干", "bǐnggān", "le cracker", "il cracker", "der Cracker", "kraker"]),
        w("pretzel", "🥨", "food", ["pretzel", "扭结面包", "niǔjié miànbāo", "le bretzel", "il pretzel", "die Brezel", "simit"]),
        w("yogurt", "🍦", "food", ["yoghurt", "酸奶", "suānnǎi", "le yaourt", "lo yogurt", "der Joghurt", "yoğurt"]),
        w("raisins", "🍇", "food", ["raisins", "葡萄干", "pútáogān", "les raisins secs", "l'uvetta", "die Rosinen", "kuru üzüm"]),
        w("breadstick", "🥖", "food", ["bread stick", "面包棍", "miànbāogùn", "le gressin", "il grissino", "die Brotstange", "çubuk ekmek"]),
        w("hummus", "🫓", "food", ["hummus", "鹰嘴豆泥", "yīngzuǐdòuní", "le houmous", "l'hummus", "der Hummus", "humus"]),
        w("pancake", "🥞", "food", ["pancake", "薄饼", "báobǐng", "la crêpe", "la frittella", "der Pfannkuchen", "krep"]),
      ],
    },
    {
      id: "sweets",
      name: "unit.sweets",
      icon: "🍭",
      words: [
        w("lollipop", "🍭", "food", ["lollipop", "棒棒糖", "bàngbàngtáng", "la sucette", "il lecca-lecca", "der Lutscher", "lolipop"]),
        w("cupcake", "🧁", "food", ["cupcake", "纸杯蛋糕", "zhǐbēi dàngāo", "le petit gâteau", "il cupcake", "der Cupcake", "kek"]),
        w("donut", "🍩", "food", ["doughnut", "甜甜圈", "tiántiánquān", "le beignet", "la ciambella", "der Donut", "donut"]),
        w("jelly", "🍮", "food", ["jelly", "果冻", "guǒdòng", "la gelée", "la gelatina", "das Gelee", "jöle"]),
        w("marshmallow", "🍡", "food", ["marshmallow", "棉花糖", "miánhuātáng", "la guimauve", "il marshmallow", "das Marshmallow", "lokum"]),
        w("waffle", "🧇", "food", ["waffle", "华夫饼", "huáfūbǐng", "la gaufre", "il wafer", "die Waffel", "gofret"]),
        w("honey", "🍯", "food", ["honey", "蜂蜜", "fēngmì", "le miel", "il miele", "der Honig", "bal"]),
        w("candycane", "🍬", "food", ["sweet", "糖果", "tángguǒ", "le bonbon", "la caramella", "das Bonbon", "şeker"]),
      ],
    },
    {
      id: "tableware",
      name: "unit.tableware",
      icon: "🍽️",
      words: [
        w("bowl", "🥣", "thing", ["bowl", "碗", "wǎn", "le bol", "la ciotola", "die Schüssel", "kâse"]),
        w("chopsticks", "🥢", "thing", ["chopsticks", "筷子", "kuàizi", "les baguettes", "le bacchette", "die Stäbchen", "çubuk"]),
        w("lunchbox", "🧺", "thing", ["lunch box", "饭盒", "fànhé", "la boîte à repas", "il portapranzo", "die Brotdose", "beslenme çantası"]),
        w("napkin", "🧻", "thing", ["napkin", "餐巾", "cānjīn", "la serviette", "il tovagliolo", "die Serviette", "peçete"]),
        w("bib", "👶", "clothes", ["bib", "围兜", "wéidōu", "le bavoir", "il bavaglino", "das Lätzchen", "önlük"]),
        w("placemat", "🟫", "thing", ["place mat", "餐垫", "cāndiàn", "le set de table", "la tovaglietta", "der Platzset", "peçete altı"]),
        w("highchair", "🪑", "thing", ["high chair", "宝宝餐椅", "bǎobǎo cānyǐ", "la chaise haute", "il seggiolone", "der Hochstuhl", "mama sandalyesi"]),
        w("straw", "🥤", "thing", ["straw", "吸管", "xīguǎn", "la paille", "la cannuccia", "der Strohhalm", "pipet"]),
      ],
    },
  ],
};

const shops: Theme = {
  id: "shops",
  name: "theme.shops",
  icon: "🛒",
  color: "#8fae86",
  soft: "#e9f2e4",
  chantId: "town",
  frame: "frame.iGoTo",
  units: [
    {
      id: "shoppingbits",
      name: "unit.shoppingbits",
      icon: "🧺",
      words: [
        w("basket", "🧺", "thing", ["basket", "篮子", "lánzi", "le panier", "il cestino", "der Korb", "sepet"]),
        w("trolley", "🛒", "thing", ["trolley", "购物车", "gòuwùchē", "le caddie", "il carrello", "der Einkaufswagen", "alışveriş arabası"]),
        w("wallet", "👛", "thing", ["wallet", "钱包", "qiánbāo", "le portefeuille", "il portafoglio", "das Portemonnaie", "cüzdan"]),
        w("coin", "🪙", "thing", ["coin", "硬币", "yìngbì", "la pièce", "la moneta", "die Münze", "madeni para"]),
        w("price", "🏷️", "thing", ["price tag", "价签", "jiàqiān", "l'étiquette", "il cartellino", "das Preisschild", "fiyat etiketi"]),
        w("shoppinglist", "📝", "thing", ["shopping list", "购物清单", "gòuwù qīngdān", "la liste de courses", "la lista della spesa", "die Einkaufsliste", "alışveriş listesi"]),
        w("receipt", "🧾", "thing", ["receipt", "收据", "shōujù", "le ticket", "lo scontrino", "der Kassenzettel", "fiş"]),
        w("shoppingbag", "🛍️", "thing", ["shopping bag", "购物袋", "gòuwùdài", "le sac", "la busta", "die Einkaufstasche", "alışveriş çantası"]),
      ],
    },
    {
      id: "shopkinds",
      name: "unit.shopkinds",
      icon: "🏪",
      words: [
        w("flowershop", "💐", "place", ["flower shop", "花店", "huādiàn", "le fleuriste", "il fioraio", "der Blumenladen", "çiçekçi"]),
        w("toyshop", "🧸", "place", ["toy shop", "玩具店", "wánjùdiàn", "le magasin de jouets", "il negozio di giocattoli", "der Spielzeugladen", "oyuncakçı"]),
        w("sweetshop", "🍬", "place", ["sweet shop", "糖果店", "tángguǒdiàn", "la confiserie", "la caramelleria", "der Süßwarenladen", "şekerci"]),
        w("shoeshop", "👟", "place", ["shoe shop", "鞋店", "xiédiàn", "le magasin de chaussures", "il negozio di scarpe", "der Schuhladen", "ayakkabıcı"]),
        w("petstore", "🐾", "place", ["pet shop", "宠物店", "chǒngwùdiàn", "l'animalerie", "il negozio di animali", "die Tierhandlung", "evcil hayvan dükkânı"]),
        w("bookshop", "📚", "place", ["book shop", "书店", "shūdiàn", "la librairie", "la libreria", "die Buchhandlung", "kitapçı"]),
        w("marketstall", "⛺", "place", ["market stall", "市场摊位", "shìchǎng tānwèi", "l'étal du marché", "il banco del mercato", "der Marktstand", "pazar tezgâhı"]),
        w("cafe", "☕", "place", ["café", "咖啡馆", "kāfēiguǎn", "le café", "il bar", "das Café", "kafe"]),
      ],
    },
    {
      id: "attheshop",
      name: "unit.attheshop",
      icon: "💳",
      words: [
        w("cashier", "🧑‍💼", "person", ["shop keeper", "收银员", "shōuyínyuán", "le vendeur", "il cassiere", "der Verkäufer", "satıcı"]),
        w("customer", "🧑", "person", ["customer", "顾客", "gùkè", "le client", "il cliente", "der Kunde", "müşteri"]),
        w("queue2", "🚶🚶", "action", ["queue", "排队", "páiduì", "faire la queue", "fare la fila", "anstehen", "sıraya girmek"]),
        w("counter2", "🪵", "thing", ["counter", "柜台", "guìtái", "le comptoir", "il bancone", "die Theke", "tezgâh"]),
        w("change", "🪙", "thing", ["change", "找零", "zhǎolíng", "la monnaie", "il resto", "das Wechselgeld", "para üstü"]),
        w("bankcard", "💳", "thing", ["bank card", "银行卡", "yínhángkǎ", "la carte bancaire", "la carta", "die Bankkarte", "banka kartı"]),
        w("expensive", "💸", "feeling", ["expensive", "贵", "guì", "cher", "caro", "teuer", "pahalı"]),
        w("cheap", "🪙", "feeling", ["cheap", "便宜", "piányi", "bon marché", "economico", "günstig", "ucuz"]),
      ],
    },
  ],
};

export const THEMES_YUM_SHOPS = [yum, shops];
