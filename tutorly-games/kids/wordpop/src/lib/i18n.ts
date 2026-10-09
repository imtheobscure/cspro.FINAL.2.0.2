import { Kind, Lang, Word } from "./types";

export const LANG_META: Record<
  Lang,
  { name: string; native: string; flag: string; bcp47: string; voice: string }
> = {
  en: { name: "English", native: "English", flag: "🇬🇧", bcp47: "en-US", voice: "en-US-AnaNeural" },
  zh: { name: "Chinese", native: "中文", flag: "🇨🇳", bcp47: "zh-CN", voice: "zh-CN-XiaoshuangNeural" },
  fr: { name: "French", native: "Français", flag: "🇫🇷", bcp47: "fr-FR", voice: "fr-FR-EloiseNeural" },
  it: { name: "Italian", native: "Italiano", flag: "🇮🇹", bcp47: "it-IT", voice: "it-IT-PierinaNeural" },
  de: { name: "German", native: "Deutsch", flag: "🇩🇪", bcp47: "de-DE", voice: "de-DE-GiselaNeural" },
  tr: { name: "Turkish", native: "Türkçe", flag: "🇹🇷", bcp47: "tr-TR", voice: "tr-TR-EmelNeural" },
};

type UIKey =
  | "learn" | "chant" | "quiz" | "match" | "memory" | "listen"
  | "learnDesc" | "chantDesc" | "quizDesc" | "matchDesc" | "memoryDesc" | "listenDesc"
  | "next" | "back" | "again" | "sayIt" | "listenBtn" | "greatJob" | "tryAgain"
  | "whatIsThis" | "touchThe" | "howMany" | "whichPicture" | "whichWord"
  | "wellDone" | "youDidIt" | "playAgain" | "chooseGame" | "letsGo" | "talkTime"
  | "repeatAfterMe" | "findPairs" | "allDone" | "home" | "pickTheme" | "hello"
  | "letsLearn" | "count" | "clapWithMe" | "oneMoreTime" | "yes" | "no" | "superStar"
  | "isFor" | "dragHint" | "flipHint" | "lookAndTouch" | "everyoneSay"
  /* lesson plan (lib/lessons.ts) */
  | "lesson" | "planFor" | "generatedPlan" | "yourPlan" | "objectives" | "materials"
  | "vocabList" | "extension" | "review" | "script" | "expected" | "action"
  | "minutes" | "step" | "stages" | "total" | "print" | "copyPlan" | "lessonFor"
  | "lessonLength" | "childAge" | "mustInclude" | "willLearn" | "noPlan"
  | "installedPlans" | "newPlan" | "planHint" | "readAloud" | "openInGame";

const UI_EN: Record<UIKey, string> = {
  learn: "Learn", chant: "Chant", quiz: "Quiz", match: "Match", memory: "Memory", listen: "Touch it!",
  learnDesc: "Big picture cards + talk time", chantDesc: "Clap and say it together", quizDesc: "Listen, look, choose",
  matchDesc: "Drag the word to the picture", memoryDesc: "Find the pairs", listenDesc: "Listen and touch",
  next: "Next", back: "Back", again: "Again", sayIt: "Say it!", listenBtn: "Listen", greatJob: "Great job!",
  tryAgain: "Try again!", whatIsThis: "What is this?", touchThe: "Touch the {w}!", howMany: "How many?",
  whichPicture: "Which picture?", whichWord: "Which word?", wellDone: "Well done!", youDidIt: "You did it!",
  playAgain: "Play again", chooseGame: "Choose a game", letsGo: "Let's go!", talkTime: "Talk time",
  repeatAfterMe: "Repeat after me", findPairs: "Find the pairs", allDone: "All done!", home: "Home",
  pickTheme: "Pick a topic", hello: "Hello!", letsLearn: "Let's learn together", count: "Count with me!",
  clapWithMe: "Clap with me!", oneMoreTime: "One more time!", yes: "Yes", no: "No", superStar: "Super star!",
  isFor: "{L} is for {w}", dragHint: "Drag the word to the picture, or tap a word then a picture.",
  flipHint: "Tap two cards to find a pair.", lookAndTouch: "Look and touch!", everyoneSay: "Everyone say:",

  lesson: "Lesson plan", planFor: "A timed plan for {t}",
  generatedPlan: "WordPop wrote this plan itself from the topic's own words.",
  yourPlan: "This topic uses your own plan, pasted from an external AI.",
  objectives: "Objectives", materials: "Have ready", vocabList: "Target words",
  extension: "Next time", review: "Run through at the end", script: "You say",
  expected: "Expect from the child", action: "Do this", minutes: "min", step: "Step",
  stages: "Stages", total: "Total", print: "Print", copyPlan: "Copy plan",
  lessonFor: "Lesson for", lessonLength: "Lesson length", childAge: "Child's age",
  mustInclude: "Anything the lesson must include",
  willLearn: "The AI will write the lesson around these words:",
  noPlan: "Pick a topic to build its lesson plan.", installedPlans: "Your plans",
  newPlan: "New lesson plan", planHint: "Every topic already has a plan written from its own words.",
  readAloud: "Read it aloud", openInGame: "Open in the game",
};
const UI_ZH: Record<UIKey, string> = {
  learn: "学一学", chant: "念一念", quiz: "小测验", match: "连一连", memory: "记忆", listen: "点一点！",
  learnDesc: "大卡片 + 说一说", chantDesc: "拍手一起念", quizDesc: "听、看、选",
  matchDesc: "把词拖到图片上", memoryDesc: "找一找配对", listenDesc: "听一听，点一点",
  next: "下一个", back: "返回", again: "再来", sayIt: "说一说！", listenBtn: "听", greatJob: "太棒了！",
  tryAgain: "再试一次！", whatIsThis: "这是什么？", touchThe: "点一点{w}！", howMany: "有几个？",
  whichPicture: "哪一张图？", whichWord: "哪一个词？", wellDone: "做得好！", youDidIt: "你做到了！",
  playAgain: "再玩一次", chooseGame: "选一个游戏", letsGo: "开始吧！", talkTime: "说一说",
  repeatAfterMe: "跟我说", findPairs: "找配对", allDone: "全部完成！", home: "首页",
  pickTheme: "选一个主题", hello: "你好！", letsLearn: "一起学习吧", count: "一起数！",
  clapWithMe: "一起拍手！", oneMoreTime: "再来一次！", yes: "是", no: "不是", superStar: "超级明星！",
  isFor: "{L}，{w}", dragHint: "把词拖到图片上，或者先点词再点图片。",
  flipHint: "点两张卡片找配对。", lookAndTouch: "看一看，点一点！", everyoneSay: "大家一起说：",

  lesson: "课程计划", planFor: "{t} 的定时课程",
  generatedPlan: "本计划由 WordPop 根据本主题的单词自动编写。",
  yourPlan: "本主题使用你从外部 AI 粘贴的课程计划。",
  objectives: "学习目标", materials: "准备物品", vocabList: "目标词汇",
  extension: "下次课", review: "最后复习", script: "你说",
  expected: "预期回答", action: "做这个", minutes: "分钟", step: "步骤",
  stages: "阶段", total: "总计", print: "打印", copyPlan: "复制计划",
  lessonFor: "课程主题", lessonLength: "课程长度", childAge: "孩子年龄",
  mustInclude: "课程必须包含",
  willLearn: "AI 将围绕这些单词编写课程：",
  noPlan: "选择一个主题以生成课程计划。", installedPlans: "你的课程计划",
  newPlan: "新课程计划", planHint: "每个主题都已有一份根据其单词编写的计划。",
  readAloud: "朗读", openInGame: "在游戏中打开",
};
const UI_FR: Record<UIKey, string> = {
  learn: "Apprendre", chant: "Chanter", quiz: "Quiz", match: "Associer", memory: "Mémo", listen: "Touche !",
  learnDesc: "Grandes cartes + on parle", chantDesc: "On tape des mains et on répète", quizDesc: "Écoute, regarde, choisis",
  matchDesc: "Glisse le mot sur l'image", memoryDesc: "Trouve les paires", listenDesc: "Écoute et touche",
  next: "Suivant", back: "Retour", again: "Encore", sayIt: "Dis-le !", listenBtn: "Écoute", greatJob: "Bravo !",
  tryAgain: "Essaie encore !", whatIsThis: "Qu'est-ce que c'est ?", touchThe: "Touche {w} !", howMany: "Combien ?",
  whichPicture: "Quelle image ?", whichWord: "Quel mot ?", wellDone: "Très bien !", youDidIt: "Tu as réussi !",
  playAgain: "Rejouer", chooseGame: "Choisis un jeu", letsGo: "C'est parti !", talkTime: "On parle",
  repeatAfterMe: "Répète après moi", findPairs: "Trouve les paires", allDone: "Terminé !", home: "Accueil",
  pickTheme: "Choisis un thème", hello: "Bonjour !", letsLearn: "Apprenons ensemble", count: "Compte avec moi !",
  clapWithMe: "Tape des mains !", oneMoreTime: "Encore une fois !", yes: "Oui", no: "Non", superStar: "Super star !",
  isFor: "{L} comme {w}", dragHint: "Glisse le mot sur l'image, ou touche un mot puis une image.",
  flipHint: "Touche deux cartes pour trouver une paire.", lookAndTouch: "Regarde et touche !", everyoneSay: "Tous ensemble :",

  lesson: "Plan de leçon", planFor: "Un plan minuté pour {t}",
  generatedPlan: "WordPop a écrit ce plan à partir des mots du thème.",
  yourPlan: "Ce thème utilise votre propre plan, collé depuis une IA.",
  objectives: "Objectifs", materials: "À préparer", vocabList: "Mots cibles",
  extension: "La prochaine fois", review: "À revoir à la fin", script: "Vous dites",
  expected: "Réponse attendue", action: "À faire", minutes: "min", step: "Étape",
  stages: "Étapes", total: "Total", print: "Imprimer", copyPlan: "Copier le plan",
  lessonFor: "Leçon pour", lessonLength: "Durée", childAge: "Âge de l'enfant",
  mustInclude: "À inclure absolument",
  willLearn: "L'IA écrira la leçon autour de ces mots :",
  noPlan: "Choisis un thème pour créer son plan.", installedPlans: "Vos plans",
  newPlan: "Nouveau plan", planHint: "Chaque thème a déjà un plan écrit à partir de ses mots.",
  readAloud: "Lire à voix haute", openInGame: "Ouvrir dans le jeu",
};
const UI_IT: Record<UIKey, string> = {
  learn: "Impara", chant: "Canta", quiz: "Quiz", match: "Abbina", memory: "Memory", listen: "Tocca!",
  learnDesc: "Carte grandi + parliamo", chantDesc: "Batti le mani e ripeti", quizDesc: "Ascolta, guarda, scegli",
  matchDesc: "Trascina la parola sull'immagine", memoryDesc: "Trova le coppie", listenDesc: "Ascolta e tocca",
  next: "Avanti", back: "Indietro", again: "Ancora", sayIt: "Dillo!", listenBtn: "Ascolta", greatJob: "Bravissimo!",
  tryAgain: "Riprova!", whatIsThis: "Che cos'è?", touchThe: "Tocca {w}!", howMany: "Quanti sono?",
  whichPicture: "Quale immagine?", whichWord: "Quale parola?", wellDone: "Ben fatto!", youDidIt: "Ce l'hai fatta!",
  playAgain: "Gioca ancora", chooseGame: "Scegli un gioco", letsGo: "Andiamo!", talkTime: "Parliamo",
  repeatAfterMe: "Ripeti con me", findPairs: "Trova le coppie", allDone: "Finito!", home: "Casa",
  pickTheme: "Scegli un tema", hello: "Ciao!", letsLearn: "Impariamo insieme", count: "Conta con me!",
  clapWithMe: "Batti le mani!", oneMoreTime: "Ancora una volta!", yes: "Sì", no: "No", superStar: "Super stella!",
  isFor: "{L} come {w}", dragHint: "Trascina la parola sull'immagine, o tocca una parola e poi un'immagine.",
  flipHint: "Tocca due carte per trovare una coppia.", lookAndTouch: "Guarda e tocca!", everyoneSay: "Tutti insieme:",

  lesson: "Piano di lezione", planFor: "Un piano a tempo per {t}",
  generatedPlan: "WordPop ha scritto questo piano dalle parole del tema.",
  yourPlan: "Questo tema usa il tuo piano, incollato da un'IA.",
  objectives: "Obiettivi", materials: "Da preparare", vocabList: "Parole obiettivo",
  extension: "La prossima volta", review: "Da ripassare alla fine", script: "Tu dici",
  expected: "Risposta attesa", action: "Da fare", minutes: "min", step: "Passo",
  stages: "Tappe", total: "Totale", print: "Stampa", copyPlan: "Copia il piano",
  lessonFor: "Lezione per", lessonLength: "Durata", childAge: "Età del bambino",
  mustInclude: "Da includere",
  willLearn: "L'IA scriverà la lezione su queste parole:",
  noPlan: "Scegli un tema per creare il suo piano.", installedPlans: "I tuoi piani",
  newPlan: "Nuovo piano", planHint: "Ogni tema ha già un piano scritto dalle sue parole.",
  readAloud: "Leggi ad alta voce", openInGame: "Apri nel gioco",
};
const UI_DE: Record<UIKey, string> = {
  learn: "Lernen", chant: "Singen", quiz: "Quiz", match: "Zuordnen", memory: "Memory", listen: "Tipp drauf!",
  learnDesc: "Große Karten + Sprechzeit", chantDesc: "Klatschen und nachsprechen", quizDesc: "Hören, schauen, wählen",
  matchDesc: "Zieh das Wort zum Bild", memoryDesc: "Finde die Paare", listenDesc: "Hören und tippen",
  next: "Weiter", back: "Zurück", again: "Nochmal", sayIt: "Sag es!", listenBtn: "Hören", greatJob: "Super gemacht!",
  tryAgain: "Versuch es nochmal!", whatIsThis: "Was ist das?", touchThe: "Tipp auf {w}!", howMany: "Wie viele?",
  whichPicture: "Welches Bild?", whichWord: "Welches Wort?", wellDone: "Gut gemacht!", youDidIt: "Geschafft!",
  playAgain: "Nochmal spielen", chooseGame: "Wähle ein Spiel", letsGo: "Los geht's!", talkTime: "Sprechzeit",
  repeatAfterMe: "Sprich mir nach", findPairs: "Finde die Paare", allDone: "Alles fertig!", home: "Start",
  pickTheme: "Wähle ein Thema", hello: "Hallo!", letsLearn: "Lass uns zusammen lernen", count: "Zähl mit mir!",
  clapWithMe: "Klatsch mit!", oneMoreTime: "Noch einmal!", yes: "Ja", no: "Nein", superStar: "Superstar!",
  isFor: "{L} wie {w}", dragHint: "Zieh das Wort zum Bild, oder tipp ein Wort und dann ein Bild.",
  flipHint: "Tipp zwei Karten an, um ein Paar zu finden.", lookAndTouch: "Schau und tipp!", everyoneSay: "Alle zusammen:",

  lesson: "Lektionsplan", planFor: "Ein getakteter Plan für {t}",
  generatedPlan: "WordPop hat diesen Plan aus den Wörtern des Themas geschrieben.",
  yourPlan: "Dieses Thema nutzt deinen eigenen Plan aus einer KI.",
  objectives: "Lernziele", materials: "Bereitlegen", vocabList: "Zielwörter",
  extension: "Nächstes Mal", review: "Am Ende wiederholen", script: "Du sagst",
  expected: "Antwort des Kindes", action: "Das tun", minutes: "Min.", step: "Schritt",
  stages: "Phasen", total: "Gesamt", print: "Drucken", copyPlan: "Plan kopieren",
  lessonFor: "Lektion für", lessonLength: "Dauer", childAge: "Alter des Kindes",
  mustInclude: "Muss enthalten",
  willLearn: "Die KI schreibt die Lektion um diese Wörter:",
  noPlan: "Wähle ein Thema für seinen Plan.", installedPlans: "Deine Pläne",
  newPlan: "Neuer Plan", planHint: "Jedes Thema hat schon einen Plan aus seinen Wörtern.",
  readAloud: "Vorlesen", openInGame: "Im Spiel öffnen",
};
const UI_TR: Record<UIKey, string> = {
  learn: "Öğren", chant: "Tekerleme", quiz: "Bilmece", match: "Eşleştir", memory: "Hafıza", listen: "Dokun!",
  learnDesc: "Büyük kartlar + konuşma zamanı", chantDesc: "Alkışla ve tekrar et", quizDesc: "Dinle, bak, seç",
  matchDesc: "Kelimeyi resme sürükle", memoryDesc: "Eşleri bul", listenDesc: "Dinle ve dokun",
  next: "Sonraki", back: "Geri", again: "Tekrar", sayIt: "Söyle!", listenBtn: "Dinle", greatJob: "Harika!",
  tryAgain: "Tekrar dene!", whatIsThis: "Bu ne?", touchThe: "{w} — dokun!", howMany: "Kaç tane?",
  whichPicture: "Hangi resim?", whichWord: "Hangi kelime?", wellDone: "Aferin!", youDidIt: "Başardın!",
  playAgain: "Tekrar oyna", chooseGame: "Bir oyun seç", letsGo: "Hadi başlayalım!", talkTime: "Konuşma zamanı",
  repeatAfterMe: "Benden sonra tekrar et", findPairs: "Eşleri bul", allDone: "Hepsi bitti!", home: "Ana sayfa",
  pickTheme: "Bir konu seç", hello: "Merhaba!", letsLearn: "Birlikte öğrenelim", count: "Benimle say!",
  clapWithMe: "Benimle alkışla!", oneMoreTime: "Bir kez daha!", yes: "Evet", no: "Hayır", superStar: "Süper yıldız!",
  isFor: "{L} — {w}", dragHint: "Kelimeyi resme sürükle ya da önce kelimeye sonra resme dokun.",
  flipHint: "Eş bulmak için iki karta dokun.", lookAndTouch: "Bak ve dokun!", everyoneSay: "Hep birlikte:",

  lesson: "Ders planı", planFor: "{t} için zamanlı plan",
  generatedPlan: "Bu planı WordPop konunun kendi kelimelerinden yazdı.",
  yourPlan: "Bu konu dış yapay zekâdan yapıştırdığın planı kullanıyor.",
  objectives: "Hedefler", materials: "Hazırla", vocabList: "Hedef kelimeler",
  extension: "Bir dahaki sefere", review: "Sonda tekrar", script: "Sen söyle",
  expected: "Çocuktan beklenen", action: "Şunu yap", minutes: "dk", step: "Adım",
  stages: "Aşamalar", total: "Toplam", print: "Yazdır", copyPlan: "Planı kopyala",
  lessonFor: "Ders:", lessonLength: "Süre", childAge: "Çocuğun yaşı",
  mustInclude: "Ders şunu içermeli",
  willLearn: "Yapay zekâ dersi bu kelimelerle yazacak:",
  noPlan: "Planı için bir konu seç.", installedPlans: "Planların",
  newPlan: "Yeni ders planı", planHint: "Her konunun kendi kelimelerinden yazılmış bir planı var.",
  readAloud: "Sesli oku", openInGame: "Oyunda aç",
};

const UI: Record<Lang, Record<UIKey, string>> = { en: UI_EN, zh: UI_ZH, fr: UI_FR, it: UI_IT, de: UI_DE, tr: UI_TR };

export function ui(lang: Lang, key: UIKey, vars: Record<string, string> = {}): string {
  let s = UI[lang][key] ?? UI.en[key];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/* ───────────────────── CCQ (concept-checking questions) ───────────────────── */

type CCQTable = Record<"generic" | Kind, string[]>;

const CCQ: Record<Lang, CCQTable> = {
  en: {
    generic: ["What is this?", "Is this the {w}? Yes or no?", "Say it with me: {w}!", "Can you point to the {w}?"],
    thing: ["What color is the {w}?", "Is the {w} big or small?", "Do you have a {w} at home?"],
    animal: ["Is the {w} big or small?", "What sound does the {w} make?", "Do you like the {w}?"],
    food: ["Do you like {w}? Yum or yuck?", "What color is the {w}?", "Do you eat {w} at home?"],
    person: ["Who is this?", "Is this your {w}?", "Wave hello to the {w}!"],
    action: ["Can you {w}? Show me!", "Let's {w} together!", "Is it fun to {w}?"],
    feeling: ["Show me a {w} face!", "Are you {w} today?", "Is the face {w} or happy?"],
    color: ["What color is this?", "Find something {w} in your room!", "Is the sky {w}?"],
    shape: ["What shape is this?", "Can you draw a {w} in the air?", "Is a ball a {w}?"],
    number: ["Count with me!", "Show me {w} fingers!", "Can you clap {w} times?"],
    letter: ["What letter is this?", "What starts with this letter?", "Can you draw it in the air?"],
    place: ["Do you go to the {w}?", "What can you see at the {w}?", "Is the {w} big or small?"],
    weather: ["Is it {w} today?", "What do you wear when it is {w}?", "Look outside! Is it {w}?"],
    body: ["Where is your {w}? Touch it!", "How many {w} do you have?", "Wiggle your {w}!"],
    clothes: ["Are you wearing {w} today?", "What color is your {w}?", "Is the {w} for hot or cold days?"],
    vehicle: ["Is the {w} fast or slow?", "Does the {w} fly, swim or drive?", "What sound does the {w} make?"],
    opposite: ["Is it {w}? Yes or no!", "Show me {w} with your hands!", "Is an elephant {w}?"],
  },
  zh: {
    generic: ["这是什么？", "这是{w}吗？是不是？", "跟我说：{w}！", "你能指一指{w}吗？"],
    thing: ["{w}是什么颜色？", "{w}是大还是小？", "你家里有{w}吗？"],
    animal: ["{w}是大还是小？", "{w}怎么叫？", "你喜欢{w}吗？"],
    food: ["你喜欢{w}吗？好吃吗？", "{w}是什么颜色？", "你在家吃{w}吗？"],
    person: ["这是谁？", "这是你的{w}吗？", "跟{w}挥挥手！"],
    action: ["你会{w}吗？做给我看！", "我们一起{w}！", "{w}好玩吗？"],
    feeling: ["做一个{w}的表情！", "你今天{w}吗？", "他是{w}还是开心？"],
    color: ["这是什么颜色？", "在你的房间找一个{w}的东西！", "天空是{w}的吗？"],
    shape: ["这是什么形状？", "在空中画一个{w}！", "球是{w}吗？"],
    number: ["一起数！", "给我看{w}根手指！", "拍{w}下手！"],
    letter: ["这是什么字母？", "什么东西是这个字母开头？", "在空中画一画！"],
    place: ["你去{w}吗？", "在{w}能看到什么？", "{w}是大还是小？"],
    weather: ["今天{w}吗？", "{w}的时候穿什么？", "看看外面！是{w}吗？"],
    body: ["你的{w}在哪里？摸一摸！", "你有几个{w}？", "动一动你的{w}！"],
    clothes: ["你今天穿{w}了吗？", "你的{w}是什么颜色？", "{w}是热天穿还是冷天穿？"],
    vehicle: ["{w}快还是慢？", "{w}会飞、会游还是会跑？", "{w}是什么声音？"],
    opposite: ["是{w}吗？是不是！", "用手做一个{w}！", "大象是{w}的吗？"],
  },
  fr: {
    generic: ["Qu'est-ce que c'est ?", "C'est {w} ? Oui ou non ?", "Dis avec moi : {w} !", "Tu peux montrer {w} ?"],
    thing: ["De quelle couleur est {w} ?", "{w}, c'est grand ou petit ?", "Tu as {w} à la maison ?"],
    animal: ["{w}, c'est grand ou petit ?", "Quel bruit fait {w} ?", "Tu aimes {w} ?"],
    food: ["Tu aimes {w} ? Miam ou beurk ?", "De quelle couleur est {w} ?", "Tu manges {w} à la maison ?"],
    person: ["Qui est-ce ?", "C'est ton/ta {w} ?", "Fais coucou à {w} !"],
    action: ["Tu sais {w} ? Montre-moi !", "On va {w} ensemble !", "C'est amusant de {w} ?"],
    feeling: ["Fais une tête {w} !", "Tu es {w} aujourd'hui ?", "Il est {w} ou content ?"],
    color: ["C'est quelle couleur ?", "Trouve quelque chose de {w} dans ta chambre !", "Le ciel est {w} ?"],
    shape: ["C'est quelle forme ?", "Dessine {w} dans l'air !", "Un ballon, c'est {w} ?"],
    number: ["Compte avec moi !", "Montre-moi {w} doigts !", "Tape {w} fois dans tes mains !"],
    letter: ["C'est quelle lettre ?", "Qu'est-ce qui commence par cette lettre ?", "Dessine-la dans l'air !"],
    place: ["Tu vas à {w} ?", "Qu'est-ce qu'on voit à {w} ?", "{w}, c'est grand ou petit ?"],
    weather: ["Il fait {w} aujourd'hui ?", "Qu'est-ce qu'on porte quand il fait {w} ?", "Regarde dehors ! C'est {w} ?"],
    body: ["Où est {w} ? Touche !", "Tu as combien de {w} ?", "Bouge {w} !"],
    clothes: ["Tu portes {w} aujourd'hui ?", "De quelle couleur est {w} ?", "{w}, c'est pour le chaud ou le froid ?"],
    vehicle: ["{w}, c'est rapide ou lent ?", "{w}, ça vole, ça nage ou ça roule ?", "Quel bruit fait {w} ?"],
    opposite: ["C'est {w} ? Oui ou non !", "Montre-moi {w} avec tes mains !", "Un éléphant, c'est {w} ?"],
  },
  it: {
    generic: ["Che cos'è?", "È {w}? Sì o no?", "Dillo con me: {w}!", "Puoi indicare {w}?"],
    thing: ["Di che colore è {w}?", "{w} è grande o piccolo?", "Hai {w} a casa?"],
    animal: ["{w} è grande o piccolo?", "Che verso fa {w}?", "Ti piace {w}?"],
    food: ["Ti piace {w}? Gnam o bleah?", "Di che colore è {w}?", "Mangi {w} a casa?"],
    person: ["Chi è?", "È {w} tuo/tua?", "Saluta {w}!"],
    action: ["Sai {w}? Fammi vedere!", "Dai, {w} insieme!", "È divertente {w}?"],
    feeling: ["Fai una faccia {w}!", "Sei {w} oggi?", "È {w} o felice?"],
    color: ["Che colore è?", "Trova qualcosa di {w} nella tua stanza!", "Il cielo è {w}?"],
    shape: ["Che forma è?", "Disegna {w} nell'aria!", "Una palla è {w}?"],
    number: ["Conta con me!", "Fammi vedere {w} dita!", "Batti le mani {w} volte!"],
    letter: ["Che lettera è?", "Cosa inizia con questa lettera?", "Disegnala nell'aria!"],
    place: ["Vai a {w}?", "Cosa vedi a {w}?", "{w} è grande o piccolo?"],
    weather: ["Oggi è {w}?", "Cosa ti metti quando è {w}?", "Guarda fuori! È {w}?"],
    body: ["Dov'è {w}? Tocca!", "Quanti {w} hai?", "Muovi {w}!"],
    clothes: ["Hai {w} oggi?", "Di che colore è {w}?", "{w} è per il caldo o per il freddo?"],
    vehicle: ["{w} è veloce o lento?", "{w} vola, nuota o corre?", "Che rumore fa {w}?"],
    opposite: ["È {w}? Sì o no!", "Fammi vedere {w} con le mani!", "Un elefante è {w}?"],
  },
  de: {
    generic: ["Was ist das?", "Ist das {w}? Ja oder nein?", "Sag es mit mir: {w}!", "Kannst du auf {w} zeigen?"],
    thing: ["Welche Farbe hat {w}?", "Ist {w} groß oder klein?", "Hast du {w} zu Hause?"],
    animal: ["Ist {w} groß oder klein?", "Wie macht {w}?", "Magst du {w}?"],
    food: ["Magst du {w}? Lecker oder igitt?", "Welche Farbe hat {w}?", "Isst du {w} zu Hause?"],
    person: ["Wer ist das?", "Ist das dein/deine {w}?", "Wink {w} zu!"],
    action: ["Kannst du {w}? Zeig mal!", "Lass uns zusammen {w}!", "Macht {w} Spaß?"],
    feeling: ["Mach ein {w}es Gesicht!", "Bist du heute {w}?", "Ist das Gesicht {w} oder fröhlich?"],
    color: ["Welche Farbe ist das?", "Finde etwas {w}es in deinem Zimmer!", "Ist der Himmel {w}?"],
    shape: ["Welche Form ist das?", "Mal {w} in die Luft!", "Ist ein Ball {w}?"],
    number: ["Zähl mit mir!", "Zeig mir {w} Finger!", "Klatsch {w} Mal!"],
    letter: ["Welcher Buchstabe ist das?", "Was fängt mit diesem Buchstaben an?", "Mal ihn in die Luft!"],
    place: ["Gehst du in {w}?", "Was siehst du in {w}?", "Ist {w} groß oder klein?"],
    weather: ["Ist es heute {w}?", "Was ziehst du an, wenn es {w} ist?", "Schau nach draußen! Ist es {w}?"],
    body: ["Wo ist {w}? Fass an!", "Wie viele {w} hast du?", "Wackel mit {w}!"],
    clothes: ["Trägst du heute {w}?", "Welche Farbe hat {w}?", "Ist {w} für warme oder kalte Tage?"],
    vehicle: ["Ist {w} schnell oder langsam?", "Fliegt, schwimmt oder fährt {w}?", "Wie klingt {w}?"],
    opposite: ["Ist es {w}? Ja oder nein!", "Zeig mir {w} mit den Händen!", "Ist ein Elefant {w}?"],
  },
  tr: {
    generic: ["Bu ne?", "Bu {w}, değil mi? Evet mi hayır mı?", "Benimle söyle: {w}!", "{w} nerede? Gösterebilir misin?"],
    thing: ["{w} ne renk?", "{w} büyük mü küçük mü?", "Evde {w} var mı?"],
    animal: ["{w} büyük mü küçük mü?", "{w} nasıl ses çıkarır?", "{w} sever misin?"],
    food: ["{w} sever misin? Mmm mı, ıyy mı?", "{w} ne renk?", "Evde {w} yer misin?"],
    person: ["Bu kim?", "Bu senin {w} mi?", "{w} — el salla!"],
    action: ["{w} — yapabilir misin? Göster!", "Hadi birlikte: {w}!", "{w} eğlenceli mi?"],
    feeling: ["{w} bir yüz yap!", "Bugün {w} musun?", "Bu yüz {w} mı, mutlu mu?"],
    color: ["Bu ne renk?", "Odanda {w} bir şey bul!", "Gökyüzü {w} mı?"],
    shape: ["Bu hangi şekil?", "Havada bir {w} çiz!", "Top bir {w} mi?"],
    number: ["Benimle say!", "Bana {w} parmak göster!", "{w} kez alkışla!"],
    letter: ["Bu hangi harf?", "Bu harfle ne başlar?", "Havada çiz!"],
    place: ["{w} — gider misin?", "{w} — orada ne görürsün?", "{w} büyük mü küçük mü?"],
    weather: ["Bugün hava {w} mı?", "Hava {w} olunca ne giyersin?", "Dışarı bak! Hava {w} mı?"],
    body: ["{w} nerede? Dokun!", "Kaç tane {w} var?", "{w} — oynat!"],
    clothes: ["Bugün {w} giydin mi?", "Senin {w} ne renk?", "{w} sıcak için mi soğuk için mi?"],
    vehicle: ["{w} hızlı mı yavaş mı?", "{w} uçar mı, yüzer mi, gider mi?", "{w} nasıl ses çıkarır?"],
    opposite: ["{w} mi? Evet mi hayır mı!", "Ellerinle {w} göster!", "Fil {w} mü?"],
  },
};

/** Words in English need an article after "the"; the other languages carry articles in the data. */
function fillWord(lang: Lang, template: string, word: Word): string {
  const text = word.t[lang];
  return template.replaceAll("{w}", text);
}

export function ccqFor(lang: Lang, word: Word, themeKind: Kind): string[] {
  const kind = word.kind ?? themeKind;
  const table = CCQ[lang];
  const specific = table[kind] ?? table.thing;
  const list = [table.generic[0], ...specific, table.generic[2], table.generic[3]];
  // dedupe & fill
  const out: string[] = [];
  for (const t of list) {
    const s = fillWord(lang, t, word);
    if (!out.includes(s)) out.push(s);
  }
  return out.slice(0, 5);
}

/* ───────────────────── Chants ───────────────────── */

type ChantGroup = "animal" | "food" | "action" | "feeling" | "color" | "number" | "default";

const CHANT: Record<Lang, { line1: string; line2: Record<ChantGroup, string>; letter: string; clap: string }> = {
  en: {
    line1: "{w}, {w}, {w}!",
    line2: {
      animal: "The {w} says hello!", food: "Yummy, yummy {w}!", action: "Let's go! {w}!",
      feeling: "I feel {w} today!", color: "{w} here, {w} there!", number: "{w}! Clap {w} times!",
      default: "Look, look! I see the {w}!",
    },
    letter: "{L}, {L}, {w}! {L} is for {w}!",
    clap: "Clap, clap, clap!",
  },
  zh: {
    line1: "{w}，{w}，{w}！",
    line2: {
      animal: "{w}说你好！", food: "{w}真好吃！", action: "一起来！{w}！",
      feeling: "我今天很{w}！", color: "这里{w}，那里{w}！", number: "{w}！拍{w}下手！",
      default: "看，看！我看到{w}！",
    },
    letter: "{L}，{L}，{w}！{L}，{w}！",
    clap: "拍手，拍手，拍手！",
  },
  fr: {
    line1: "{w}, {w}, {w} !",
    line2: {
      animal: "{w} dit bonjour !", food: "Miam, miam, {w} !", action: "Allez ! {w} !",
      feeling: "Je suis {w} aujourd'hui !", color: "{w} ici, {w} là !", number: "{w} ! Tape {w} fois !",
      default: "Regarde, regarde ! Je vois {w} !",
    },
    letter: "{L}, {L}, {w} ! {L} comme {w} !",
    clap: "Tape, tape, tape !",
  },
  it: {
    line1: "{w}, {w}, {w}!",
    line2: {
      animal: "{w} dice ciao!", food: "Gnam, gnam, {w}!", action: "Dai! {w}!",
      feeling: "Oggi sono {w}!", color: "{w} qui, {w} là!", number: "{w}! Batti le mani {w} volte!",
      default: "Guarda, guarda! Vedo {w}!",
    },
    letter: "{L}, {L}, {w}! {L} come {w}!",
    clap: "Batti, batti, batti!",
  },
  de: {
    line1: "{w}, {w}, {w}!",
    line2: {
      animal: "{w} sagt hallo!", food: "Lecker, lecker, {w}!", action: "Los geht's! {w}!",
      feeling: "Ich bin heute {w}!", color: "{w} hier, {w} da!", number: "{w}! Klatsch {w} Mal!",
      default: "Schau, schau! Ich sehe {w}!",
    },
    letter: "{L}, {L}, {w}! {L} wie {w}!",
    clap: "Klatsch, klatsch, klatsch!",
  },
  tr: {
    line1: "{w}, {w}, {w}!",
    line2: {
      animal: "{w} merhaba diyor!", food: "Mmm, nefis {w}!", action: "Hadi! {w}!",
      feeling: "Bugün {w} hissediyorum!", color: "Burada {w}, orada {w}!", number: "{w}! {w} kez alkışla!",
      default: "Bak, bak! {w} görüyorum!",
    },
    letter: "{L}, {L}, {w}! {L} — {w}!",
    clap: "Alkış, alkış, alkış!",
  },
};

function chantGroup(kind: Kind): ChantGroup {
  switch (kind) {
    case "animal": return "animal";
    case "food": return "food";
    case "action": return "action";
    case "feeling": return "feeling";
    case "color": return "color";
    case "number": return "number";
    default: return "default";
  }
}

export interface ChantVerse {
  word: Word;
  lines: string[];
}

export function chantFor(lang: Lang, words: Word[], themeKind: Kind): ChantVerse[] {
  const c = CHANT[lang];
  return words.map((word) => {
    const text = word.t[lang];
    const kind = word.kind ?? themeKind;
    if (kind === "letter" && word.letter) {
      return { word, lines: [c.letter.replaceAll("{L}", word.letter).replaceAll("{w}", text), c.clap] };
    }
    const g = chantGroup(kind);
    return {
      word,
      lines: [c.line1.replaceAll("{w}", text), c.line2[g].replaceAll("{w}", text), c.clap],
    };
  });
}

/** Text used for the read-aloud of a single word (letters get "A. apple"). */
export function speakText(lang: Lang, word: Word): string {
  const t = word.t[lang];
  if (word.letter) return `${word.letter}. ${t}.`;
  return t;
}
