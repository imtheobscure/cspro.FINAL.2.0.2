import type { Lang } from "./types";
import { PHRASES_PLAY } from "./phrases.play";

type Row = Record<Lang, string>;

function p(en: string, zh: string, fr: string, it: string, de: string, tr: string): Row {
  return { en, zh, fr, it, de, tr };
}

export const PHRASES: Record<string, Row> = {
  /* ---------- brand & nav ---------- */
  "app.name": p("Tutorly Kids", "Tutorly Kids", "Tutorly Kids", "Tutorly Kids", "Tutorly Kids", "Tutorly Kids"),
  "app.tag": p(
    "Two languages, twelve games, one happy learner — ages 3–6",
    "3–6 岁双语语言游戏",
    "Jeu de langues bilingue pour les 3–6 ans",
    "Gioco bilingue per bambini da 3 a 6 anni",
    "Zweisprachiges Sprachspiel für 3–6Jährige",
    "3–6 yaş için iki dilli dil oyunu",
  ),
  "nav.home": p("Home", "首页", "Accueil", "Home", "Start", "Ana sayfa"),
  "nav.play": p("Play", "开始玩", "Jouer", "Gioca", "Spielen", "Oyna"),
  "nav.teacher": p("Tutor Panel", "教师面板", "Espace tuteur", "Pannello tutor", "Tutor-Bereich", "Öğretmen paneli"),

  /* ---------- setup ---------- */
  "setup.ispeak": p("I speak…", "我说…", "Je parle…", "Parlo…", "Ich spreche…", "Ben konuşuyorum…"),
  "setup.welearn": p("We learn…", "我们学…", "Nous apprenons…", "Impariamo…", "Wir lernen…", "Öğreniyoruz…"),
  "setup.mono": p("One language only", "只用一种语言", "Une seule langue", "Una sola lingua", "Nur eine Sprache", "Tek dil"),
  "setup.bilingual": p("Two languages", "两种语言", "Deux langues", "Due lingue", "Zwei Sprachen", "İki dil"),
  "setup.pickChild": p("Who is playing?", "谁在玩？", "Qui joue ?", "Chi gioca?", "Wer spielt?", "Kim oynuyor?"),
  "setup.newChild": p("Add a child", "添加孩子", "Ajouter un enfant", "Aggiungi bambino", "Kind hinzufügen", "Çocuk ekle"),
  "setup.start": p("Start the lesson", "开始上课", "Commencer la leçon", "Inizia la lezione", "Lektion starten", "Derse başla"),
  "setup.pickWords": p("Pick your words", "选择单词", "Choisis les mots", "Scegli le parole", "Wörter wählen", "Kelimeleri seç"),

  /* ---------- modes ---------- */
  "mode.learn": p("Learn", "学习", "Apprendre", "Impara", "Lernen", "Öğren"),
  "mode.talk": p("Talk Time", "说话时间", "Temps de parole", "Tempo di parlare", "Sprechzeit", "Konuşma zamanı"),
  "mode.listen": p("Listen & Find", "听一听找一找", "Écouter et trouver", "Ascolta e trova", "Hören und finden", "Dinle ve bul"),
  "mode.match": p("Match It", "配对", "Associer", "Abbina", "Zuordnen", "Eşleştir"),
  "mode.memory": p("Memory", "记忆翻牌", "Memory", "Memory", "Memory", "Hafıza"),
  "mode.sort": p("Sort It", "分类", "Trier", "Ordina", "Sortieren", "Sınıflandır"),
  "mode.chant": p("Chant", "歌谣", "Comptine", "Filastrocca", "Sprechgesang", "TeKERLEME"),
  "mode.quiz": p("Quiz", "小测验", "Quiz", "Quiz", "Quiz", "Quiz"),
  "mode.numbers": p("Count", "数一数", "Compter", "Conta", "Zählen", "Say"),
  "mode.abc": p("ABC", "字母", "ABC", "ABC", "ABC", "ABC"),
  "mode.opposites": p("Opposites", "反义词", "Contraires", "Contrari", "Gegenteile", "Zıt anlamlılar"),

  /* ---------- generic UI ---------- */
  "ui.listen": p("Listen", "听", "Écouter", "Ascolta", "Anhören", "Dinle"),
  "ui.again": p("Again", "再来一次", "Encore", "Ancora", "Nochmal", "Tekrar"),
  "ui.next": p("Next", "下一个", "Suivant", "Avanti", "Weiter", "İleri"),
  "ui.back": p("Back", "返回", "Retour", "Indietro", "Zurück", "Geri"),
  "ui.yes": p("Yes", "是", "Oui", "Sì", "Ja", "Evet"),
  "ui.no": p("No", "不是", "Non", "No", "Nein", "Hayır"),
  "ui.sayit": p("Say it!", "说出来！", "Dis-le !", "Dillo!", "Sag es!", "Söyle!"),
  "ui.isaid": p("I said it!", "我说了！", "Je l'ai dit !", "L'ho detto!", "Ich habe es gesagt!", "Söyledim!"),
  "ui.great": p("Great job!", "做得好！", "Bravo !", "Bravo!", "Super!", "Aferin!"),
  "ui.wow": p("Wow!", "哇！", "Waouh !", "Wow!", "Wow!", "Vay be!"),
  "ui.correct": p("Yes! That's right!", "对！答对了！", "Oui ! C'est juste !", "Sì! Giusto!", "Ja! Richtig!", "Evet! Doğru!"),
  "ui.oops": p("Look again!", "再看看！", "Regarde encore !", "Guarda ancora!", "Schau nochmal!", "Tekrar bak!"),
  "ui.stars": p("Stars", "星星", "Étoiles", "Stelle", "Sterne", "Yıldızlar"),
  "ui.done": p("All done!", "全部完成！", "C'est fini !", "Finito!", "Fertig!", "Bitti!"),
  "ui.save": p("Save lesson", "保存课程", "Enregistrer", "Salva lezione", "Lektion speichern", "Dersi kaydet"),
  "ui.saved": p("Saved!", "已保存！", "Enregistré !", "Salvato!", "Gespeichert!", "Kaydedildi!"),
  "ui.load": p("Open", "打开", "Ouvrir", "Apri", "Öffnen", "Aç"),
  "ui.delete": p("Delete", "删除", "Supprimer", "Elimina", "Löschen", "Sil"),
  "ui.words": p("Words", "单词", "Mots", "Parole", "Wörter", "Kelimeler"),
  "ui.theme": p("Theme", "主题", "Thème", "Tema", "Thema", "Tema"),
  "ui.all": p("All", "全部", "Tout", "Tutto", "Alle", "Hepsi"),
  "ui.score": p("Score", "分数", "Score", "Punteggio", "Punkte", "Puan"),
  "ui.clear": p("Clear", "清空", "Effacer", "Azzera", "Leeren", "Temizle"),
  "ui.hidepanel": p("Hide tutor panel (T)", "隐藏教师面板 (T)", "Cacher le panneau (T)", "Nascondi pannello (T)", "Panel ausblenden (T)", "Paneli gizle (T)"),
  "ui.showpanel": p("Show tutor panel (T)", "显示教师面板 (T)", "Montrer le panneau (T)", "Mostra pannello (T)", "Panel einblenden (T)", "Paneli göster (T)"),
  "ui.bigview": p("Big view", "大画面", "Grande vue", "Vista grande", "Große Ansicht", "Büyük görünüm"),
  "ui.slow": p("Slow voice", "慢速语音", "Voix lente", "Voce lenta", "Langsame Stimme", "Yavaş ses"),
  "ui.voice": p("Voice", "语音", "Voix", "Voce", "Stimme", "Ses"),
  "ui.azurekids": p("Azure kids voice", "Azure 儿童语音", "Voix enfant Azure", "Voce bimbi Azure", "Azure-Kinderstimme", "Azure çocuk sesi"),
  "ui.browser": p("Browser voice", "浏览器语音", "Voix du navigateur", "Voce del browser", "Browser-Stimme", "Tarayıcı sesi"),
  "ui.sound": p("Sound", "声音", "Son", "Audio", "Ton", "Ses"),
  "ui.off": p("Off", "关", "Off", "Off", "Aus", "Kapalı"),
  "ui.theme2": p("Themes", "主题", "Thèmes", "Temi", "Themen", "Temalar"),
  "ui.dragword": p("Drag the word to the picture", "把单词拖到图片上", "Glisse le mot sur l'image", "Trascina la parola sull'immagine", "Zieh das Wort zum Bild", "Kelimeyi resme sürükle"),
  "ui.dragsort": p("Drag the pictures into the box", "把图片拖进盒子里", "Glisse les images dans la boîte", "Trascina le immagini nella scatola", "Zieh die Bilder in die Kiste", "Resimleri kutuya sürükle"),
  "ui.tapcard": p("Tap two cards", "翻开两张卡片", "Touche deux cartes", "Tocca due carte", "Decke zwei Karten auf", "İki kart aç"),
  "ui.whichone": p("Which one?", "哪一个？", "Lequel ?", "Quale?", "Welches?", "Hangisi?"),
  "ui.talktimer": p("Talk time", "说话时间", "Temps de parole", "Tempo per parlare", "Sprechzeit", "Konuşma süresi"),
  "ui.tutornote": p("Tutor note", "教师提示", "Note du tuteur", "Nota del tutor", "Tutor-Hinweis", "Öğretmen notu"),
  "ui.progress": p("Word wall", "单词墙", "Mur des mots", "Muro delle parole", "Wortwand", "Kelime duvarı"),
  "ui.plans": p("Lesson plans", "课程计划", "Plans de leçon", "Piani di lezione", "Lektionspläne", "Ders planları"),
  "ui.results": p("Results", "成绩", "Résultats", "Risultati", "Ergebnisse", "Sonuçlar"),
  "ui.mastery": p("Mastered", "已掌握", "Maîtrisé", "Imparato", "Gelernt", "Öğrenildi"),
  "ui.learning": p("Learning", "学习中", "En cours", "In apprendimento", "Am Lernen", "Öğreniyor"),
  "ui.nochild": p("Add a child to save stars", "添加孩子以保存星星", "Ajoute un enfant pour garder les étoiles", "Aggiungi un bambino per salvare le stelle", "Füge ein Kind hinzu, um Sterne zu speichern", "Yıldızları kaydetmek için çocuk ekle"),
  "ui.round": p("Round", "回合", "Manche", "Giro", "Runde", "Tur"),
  "ui.question": p("Question", "问题", "Question", "Domanda", "Frage", "Soru"),
  "ui.speak": p("Speak now", "现在说", "Parle maintenant", "Parla ora", "Sprich jetzt", "Şimdi konuş"),

  /* ---------- quiz prompts ---------- */
  "quiz.whatisthis": p("What is this?", "这是什么？", "Qu'est-ce que c'est ?", "Che cos'è?", "Was ist das?", "Bu ne?"),
  "quiz.findpic": p("Find the picture!", "找出图片！", "Trouve l'image !", "Trova l'immagine!", "Finde das Bild!", "Resmi bul!"),
  "quiz.findword": p("Find the word!", "找出单词！", "Trouve le mot !", "Trova la parola!", "Finde das Wort!", "Kelimeyi bul!"),
  "quiz.listenfind": p("Listen… which one?", "听一听……是哪一个？", "Écoute… lequel ?", "Ascolta… quale?", "Hör zu… welches?", "Dinle… hangisi?"),
  "quiz.count": p("How many?", "有几个？", "Combien ?", "Quanti?", "Wie viele?", "Kaç tane?"),
  "quiz.sayit": p("Can you say it?", "你会说吗？", "Peux-tu le dire ?", "Sai dirlo?", "Kannst du es sagen?", "Söyleyebilir misin?"),
  "quiz.finish": p("You did it!", "你做到了！", "Tu as réussi !", "Ce l'hai fatta!", "Du hast es geschafft!", "Başardın!"),

  /* ---------- sentence frames ---------- */
  "frame.iLike": p("I like {w}.", "我喜欢{w}。", "J'aime {w}.", "Mi piace {w}.", "Ich mag {w}.", "{w} severim."),
  "frame.iCanSee": p("I can see {w}.", "我看见{w}。", "Je vois {w}.", "Vedo {w}.", "Ich sehe {w}.", "{w} görüyorum."),
  "frame.iHave": p("I have {w}.", "我有{w}。", "J'ai {w}.", "Ho {w}.", "Ich habe {w}.", "{w} var."),
  "frame.iGoTo": p("I go to the {w}.", "我去{w}。", "Je vais au {w}.", "Vado al {w}.", "Ich gehe zum {w}.", "{w} giderim."),
  "frame.itIs": p("It is {w}.", "它是{w}。", "C'est {w}.", "È {w}.", "Es ist {w}.", "O {w}."),
  "frame.thisIs": p("This is {w}.", "这是{w}。", "C'est {w}.", "Questo è {w}.", "Das ist {w}.", "Bu {w}."),
  "frame.iAm": p("I am {w}.", "我很{w}。", "Je suis {w}.", "Sono {w}.", "Ich bin {w}.", "Ben {w}."),
  "letter.aIsFor": p("{L} is for {w}", "{L} 代表 {w}", "{L} comme {w}", "{L} come {w}", "{L} wie {w}", "{L} — {w}"),

  /* ---------- CCQ questions (concept checking, kept ultra simple) ---------- */
  "ccq.isAnimal": p("Is it an animal?", "它是动物吗？", "Est-ce un animal ?", "È un animale?", "Ist es ein Tier?", "O bir hayvan mı?"),
  "ccq.isPerson": p("Is it a person?", "他是人吗？", "Est-ce une personne ?", "È una persona?", "Ist es ein Mensch?", "O bir insan mı?"),
  "ccq.isFood": p("Is it food?", "它是食物吗？", "Est-ce de la nourriture ?", "È cibo?", "Ist es Essen?", "O bir yiyecek mi?"),
  "ccq.isThing": p("Is it a thing?", "它是东西吗？", "Est-ce un objet ?", "È un oggetto?", "Ist es ein Ding?", "O bir nesne mi?"),
  "ccq.isPlace": p("Is it a place?", "它是一个地方吗？", "Est-ce un lieu ?", "È un luogo?", "Ist es ein Ort?", "O bir yer mi?"),
  "ccq.isVehicle": p("Can it go?", "它会走吗？", "Est-ce que ça roule ?", "Può andare?", "Kann es fahren?", "Gidebilir mi?"),
  "ccq.isAction": p("Can you do it?", "你能做吗？", "Peux-tu le faire ?", "Puoi farlo?", "Kannst du es machen?", "Yapabilir misin?"),
  "ccq.isColor": p("Is it a colour?", "它是一种颜色吗？", "Est-ce une couleur ?", "È un colore?", "Ist es eine Farbe?", "O bir renk mi?"),
  "ccq.isBody": p("Is it on your body?", "它在你的身体上吗？", "Est-ce sur ton corps ?", "È sul tuo corpo?", "Ist es an deinem Körper?", "O senin vücudunda mı?"),
  "ccq.isClothes": p("Do we wear it?", "我们穿它吗？", "Est-ce qu'on le porte ?", "Si indossa?", "Zieht man es an?", "Onu giyer miyiz?"),
  "ccq.canEat": p("Can we eat it?", "我们可以吃吗？", "Peut-on le manger ?", "Si può mangiare?", "Kann man es essen?", "Yenir mi?"),
  "ccq.canDrink": p("Do we drink it?", "我们喝它吗？", "Est-ce qu'on le boit ?", "Si beve?", "Trinkt man es?", "İçilir mi?"),
  "ccq.canFly": p("Can it fly?", "它会飞吗？", "Est-ce que ça vole ?", "Può volare?", "Kann es fliegen?", "Uçabilir mi?"),
  "ccq.canSwim": p("Can it swim?", "它会游泳吗？", "Est-ce que ça nage ?", "Può nuotare?", "Kann es schwimmen?", "Yüzebilir mi?"),
  "ccq.isBig": p("Is it big?", "它大吗？", "Est-ce grand ?", "È grande?", "Ist es groß?", "Büyük mü?"),
  "ccq.isHappy": p("Is it a happy feeling?", "这是开心的感觉吗？", "Est-ce un sentiment heureux ?", "È un'emozione felice?", "Ist es ein frohes Gefühl?", "Mutlu bir duygu mu?"),
  "ccq.bigOrSmall": p("Is it big or small?", "它是大还是小？", "C'est grand ou petit ?", "È grande o piccolo?", "Groß oder klein?", "Büyük mü küçük mü?"),
  "ccq.hotOrCold": p("Is it hot or cold?", "它是热还是冷？", "C'est chaud ou froid ?", "È caldo o freddo?", "Heiß oder kalt?", "Sıcak mı soğuk mu?"),
  "ccq.whatSound": p("What sound does it make?", "它发出什么声音？", "Quel bruit fait-il ?", "Che verso fa?", "Welches Geräusch macht es?", "Ne ses çıkarır?"),
  "ccq.whereIs": p("Where can you see it?", "你在哪里能看到它？", "Où peux-tu le voir ?", "Dove puoi vederlo?", "Wo kannst du es sehen?", "Onu nerede görürsün?"),
  "ccq.doYouLike": p("Do you like {w}?", "你喜欢{w}吗？", "Tu aimes {w} ?", "Ti piace {w}?", "Magst du {w}?", "{w} sever misin?"),
  "ccq.canYouSee": p("Can you see {w} here?", "你能在这里看到{w}吗？", "Tu vois {w} ici ?", "Vedi {w} qui?", "Siehst du {w} hier?", "Burada {w} görüyor musun?"),
  "ccq.pointTo": p("Point to {w}!", "指出{w}！", "Montre {w} !", "Indica {w}!", "Zeig auf {w}!", "{w} göster!"),
  "ccq.findInRoom": p("Can you find {w} in the room?", "你能在房间里找到{w}吗？", "Tu peux trouver {w} dans la pièce ?", "Puoi trovare {w} nella stanza?", "Findest du {w} im Zimmer?", "Odada {w} bulabilir misin?"),
  "ccq.whatIsThis": p("What is this?", "这是什么？", "Qu'est-ce que c'est ?", "Che cos'è?", "Was ist das?", "Bu ne?"),
  "ccq.howMany": p("How many can you see?", "你能看到几个？", "Combien en vois-tu ?", "Quanti ne vedi?", "Wie viele siehst du?", "Kaç tane görüyorsun?"),
  "ccq.whichColor": p("What colour is it?", "它是什么颜色？", "De quelle couleur est-ce ?", "Di che colore è?", "Welche Farbe ist das?", "Ne renk?"),

  /* ---------- speaking prompts (TPR + repetition drill) ---------- */
  "say.it3": p("Say it three times!", "说三遍！", "Dis-le trois fois !", "Dillo tre volte!", "Sag es dreimal!", "Üç kere söyle!"),
  "say.loud": p("Say it BIG and loud!", "大声说！", "Dis-le FORT !", "Dillo FORTE!", "Sag es LAUT!", "YÜKSEK sesle söyle!"),
  "say.quiet": p("Say it tiny and quiet…", "小声说……", "Dis-le tout bas…", "Dillo piano…", "Sag es ganz leise…", "Kısık sesle söyle…"),
  "say.slow": p("Say it slowly…", "慢慢说……", "Dis-le lentement…", "Dillo piano piano…", "Sag es langsam…", "Yavaşça söyle…"),
  "say.showme": p("Show me with your hands!", "用手表演出来！", "Montre avec tes mains !", "Mostralo con le mani!", "Zeig es mit deinen Händen!", "Ellerinle göster!"),
  "say.sentence": p("Say: {s}", "说：{s}", "Dis : {s}", "Di': {s}", "Sag: {s}", "Söyle: {s}"),
  "say.happy": p("Say it with a big smile!", "笑着说！", "Dis-le en souriant !", "Dillo sorridendo!", "Sag es mit einem Lächeln!", "Gülümseyerek söyle!"),
  "say.sing": p("Sing it!", "唱出来！", "Chante-le !", "Cantalo!", "Sing es!", "Şarkı gibi söyle!"),
  "say.ask": p("Now you ask me!", "现在你问我！", "Maintenant, demande-moi !", "Ora chiedi a me!", "Jetzt fragst du mich!", "Şimdi sen bana sor!"),

  /* ---------- themes & units ---------- */
  "theme.me": p("Me & My Family", "我和家人", "Moi et ma famille", "Io e la mia famiglia", "Ich und meine Familie", "Ben ve Ailem"),
  "theme.home": p("My Home & My Day", "我的家和一天", "Ma maison et ma journée", "La mia casa e la mia giornata", "Mein Zuhause und mein Tag", "Evim ve Günüm"),
  "theme.school": p("School & Learning", "学校和学习", "L'école et l'apprentissage", "Scuola e apprendimento", "Schule und Lernen", "Okul ve Öğrenme"),
  "theme.town": p("My Town & Community", "我的城镇", "Ma ville et ma communauté", "La mia città", "Meine Stadt", "Şehrim ve Topluluk"),
  "theme.nature": p("Animals & Nature", "动物和自然", "Animaux et nature", "Animali e natura", "Tiere und Natur", "Hayvanlar ve Doğa"),
  "theme.fun": p("Parties & Free Time", "派对和空闲时间", "Fêtes et loisirs", "Feste e tempo libero", "Feste und Freizeit", "Partiler ve Boş Zaman"),
  "unit.body": p("My Body", "我的身体", "Mon corps", "Il mio corpo", "Mein Körper", "Vücudum"),
  "unit.clothes": p("My Clothes", "我的衣服", "Mes vêtements", "I miei vestiti", "Meine Kleidung", "Kıyafetlerim"),
  "unit.family": p("My Family", "我的家人", "Ma famille", "La mia famiglia", "Meine Familie", "Ailem"),
  "unit.feelings": p("Feelings", "感觉", "Les émotions", "Le emozioni", "Gefühle", "Duygular"),
  "unit.senses": p("Five Senses", "五感", "Les cinq sens", "I cinque sensi", "Die fünf Sinne", "Beş Duyu"),
  "unit.rooms": p("Rooms", "房间", "Les pièces", "Le stanze", "Die Zimmer", "Odalar"),
  "unit.furniture": p("Things at Home", "家里的东西", "Objets de la maison", "Oggetti di casa", "Dinge zu Hause", "Ev Eşyaları"),
  "unit.toys": p("Toys & Games", "玩具和游戏", "Jouets et jeux", "Giochi e giocattoli", "Spielsachen", "Oyuncaklar"),
  "unit.routine": p("My Daily Routine", "我的日常", "Ma routine", "La mia routine", "Mein Tagesablauf", "Günlük Rutinim"),
  "unit.food": p("Food & Drinks", "食物和饮料", "Nourriture et boissons", "Cibo e bevande", "Essen und Trinken", "Yiyecek ve İçecek"),
  "unit.fruitveg": p("Fruit & Vegetables", "水果和蔬菜", "Fruits et légumes", "Frutta e verdura", "Obst und Gemüse", "Meyve ve Sebze"),
  "unit.meals": p("Meals & Table", "餐食", "Les repas", "I pasti", "Mahlzeiten", "Öğünler"),
  "unit.classroom": p("My Classroom", "我的教室", "Ma classe", "La mia classe", "Mein Klassenzimmer", "Sınıfım"),
  "unit.supplies": p("School Supplies", "学习用品", "Fournitures scolaires", "Materiale scolastico", "Schulsachen", "Okul Malzemeleri"),
  "unit.colors": p("Colours", "颜色", "Les couleurs", "I colori", "Farben", "Renkler"),
  "unit.shapes": p("Shapes", "形状", "Les formes", "Le forme", "Formen", "Şekiller"),
  "unit.num10": p("Numbers 1–10", "数字 1–10", "Les nombres 1–10", "Numeri 1–10", "Zahlen 1–10", "Sayılar 1–10"),
  "unit.num20": p("Numbers 11–20", "数字 11–20", "Les nombres 11–20", "Numeri 11–20", "Zahlen 11–20", "Sayılar 11–20"),
  "unit.alphabet": p("Alphabet & Sounds", "字母和发音", "L'alphabet et les sons", "Alfabeto e suoni", "Alphabet und Laute", "Alfabe ve Sesler"),
  "unit.opposites": p("Opposites", "反义词", "Les contraires", "I contrari", "Gegenteile", "Zıt Anlamlılar"),
  "unit.actions": p("Action Words", "动作词", "Les actions", "Le azioni", "Tuwörter", "Eylem Sözcükleri"),
  "unit.town": p("My Town", "我的城镇", "Ma ville", "La mia città", "Meine Stadt", "Şehrim"),
  "unit.places": p("Places to Go", "去的地方", "Les lieux", "I luoghi", "Orte", "Gidilecek Yerler"),
  "unit.helpers": p("Community Helpers", "社区工作者", "Les métiers", "I mestieri", "Helfer", "Toplum Yardımcıları"),
  "unit.vehicles": p("Vehicles", "交通工具", "Les véhicules", "I veicoli", "Fahrzeuge", "Taşıtlar"),
  "unit.pets": p("Pets", "宠物", "Les animaux de compagnie", "Gli animali domestici", "Haustiere", "Evcil Hayvanlar"),
  "unit.farm": p("Farm Animals", "农场动物", "Les animaux de la ferme", "Gli animali della fattoria", "Bauernhoftiere", "Çiftlik Hayvanları"),
  "unit.wild": p("Wild & Zoo Animals", "野生和动物园动物", "Les animaux sauvages", "Gli animali selvaggi", "Wilde Tiere", "Vahşi Hayvanlar"),
  "unit.sea": p("Sea Creatures", "海洋生物", "Les animaux marins", "Le creature marine", "Meerestiere", "Deniz Canlıları"),
  "unit.insects": p("Insects & Bugs", "昆虫", "Les insectes", "Gli insetti", "Insekten", "Böcekler"),
  "unit.plants": p("Plants, Flowers & Trees", "植物、花和树", "Plantes, fleurs et arbres", "Piante, fiori e alberi", "Pflanzen und Blumen", "Bitkiler ve Ağaçlar"),
  "unit.weather": p("Weather", "天气", "Le temps", "Il tempo", "Das Wetter", "Hava Durumu"),
  "unit.seasons": p("Four Seasons", "四季", "Les quatre saisons", "Le quattro stagioni", "Die vier Jahreszeiten", "Dört Mevsim"),
  "unit.birthday": p("Birthday Party", "生日派对", "L'anniversaire", "La festa di compleanno", "Geburtstagsparty", "Doğum Günü"),
  "unit.holidays": p("Holidays", "节日", "Les fêtes", "Le feste", "Feste", "Bayramlar"),
  "unit.hobbies": p("Hobbies & Free Time", "爱好和空闲时间", "Les loisirs", "Gli hobby", "Hobbys", "Hobiler"),

  /* ---------- the four extra themes in extras.ts ---------- */
  "theme.numbers": p("Numbers & Counting", "数字与数数", "Les nombres", "I numeri", "Die Zahlen", "Sayılar"),
  "theme.letters": p("Letters & Sounds", "字母与发音", "Les lettres et les sons", "Le lettere e i suoni", "Buchstaben und Laute", "Harfler ve sesler"),
  "theme.camping": p("Camping & the Forest", "露营和森林", "Le camping et la forêt", "Il campeggio e il bosco", "Zelten und Wald", "Kamp ve orman"),
  "theme.supermarket": p("At the Supermarket", "在超市", "Au supermarché", "Al supermercato", "Im Supermarkt", "Süpermarkette"),

  "unit.camping": p("Camping Gear", "露营装备", "Le matériel de camping", "L'attrezzatura da campeggio", "Die Campingausrüstung", "Kamp malzemeleri"),
  "unit.forest": p("In the Forest", "在森林里", "Dans la forêt", "Nel bosco", "Im Wald", "Ormanda"),
  "unit.supermarket": p("At the Shop", "商店里", "Au magasin", "Al negozio", "Im Laden", "Dükkânda"),
  "unit.foodshop": p("Food & Drink", "食物和饮料", "Manger et boire", "Cibo e bevande", "Essen und Trinken", "Yiyecek ve içecek"),
};

/*
 * The signature-game rows are merged INTO `PHRASES` instead of a second snapshot
 * object. A theme installed from pasted AI JSON (lib/customPack.ts) registers its
 * titles with `registerPhrase()` at runtime, and with a one-off `{...spread}` copy
 * those keys existed in `PHRASES` but `t()` still read the frozen snapshot — so an
 * imported theme showed its raw key (`theme.x.ocean`) as its title.
 */
for (const [key, row] of Object.entries(PHRASES_PLAY)) PHRASES[key] = row;

/** Register a row at runtime — a pasted-JSON pack's theme, unit and frame titles. */
export function registerPhrase(key: string, row: Record<Lang, string>): string {
  PHRASES[key] = { ...row };
  return key;
}

export function t(key: string, lang: Lang, vars?: Record<string, string>): string {
  const row = PHRASES[key];
  let s = row ? (row[lang] ?? row.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  }
  return s;
}

export function hasPhrase(key: string): boolean {
  return Boolean(PHRASES[key]);
}
