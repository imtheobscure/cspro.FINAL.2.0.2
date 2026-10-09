import type { Lang } from "./types";

function p(en: string, zh: string, fr: string, it: string, de: string, tr: string) {
  return { en, zh, fr, it, de, tr };
}

/** Phrases for the 9 signature games + lesson mode. */
export const PHRASES_PLAY: Record<string, { en: string; zh: string; fr: string; it: string; de: string; tr: string }> = {
  /* ---------------- modes ---------------- */
  "mode.lesson": p("Lesson", "课程", "Leçon", "Lezione", "Lektion", "Ders"),
  "mode.trace": p("Sand Tracing", "沙盘描红", "Traçage dans le sable", "Traccia nella sabbia", "Sand-Schreiben", "Kum Üzerine Yazma"),
  "mode.echo": p("Echo Monsters", "回声小怪兽", "Monstres écho", "Mostri eco", "Echo-Monster", "Yankı Canavarları"),
  "mode.smoothie": p("Word Smoothie", "单词果昔", "Smoothie de mots", "Frullato di parole", "Wort-Smoothie", "Kelime Smoothie"),
  "mode.scavenger": p("Magic Camera Hunt", "魔法相机寻宝", "Chasse à la caméra", "Caccia alla fotocamera", "Kamera-Suche", "Sihirli Kamera Avı"),
  "mode.mirror": p("Face Mirror", "表情镜子", "Miroir des émotions", "Specchio delle emozioni", "Gefühls-Spiegel", "Duygu Aynası"),
  "mode.charade": p("Charades", "你演我猜", "Mimes", "Mimica", "Pantomime", "Taklit Oyunu"),
  "mode.train": p("Sentence Train", "句子小火车", "Train des phrases", "Treno delle frasi", "Satz-Zug", "Cümle Treni"),
  "mode.dollhouse": p("Dollhouse Hunt", "娃娃屋捉迷藏", "Chasse dans la maison", "Caccia nella casa", "Puppenhaus-Suche", "Oyuncak Evi"),
  "mode.dressing": p("Dressing Room", "换装间", "Cabine d'essayage", "Camerino", "Ankleide", "Giyinme Odası"),

  /* ---------------- trace ---------------- */
  "trace.title": p("Trace it in the sand!", "在沙子上描一描！", "Trace-le dans le sable !", "Traccialo nella sabbia!", "Schreib es in den Sand!", "Kumda çiz!"),
  "trace.start": p("Start here", "从这里开始", "Commence ici", "Inizia qui", "Hier beginnen", "Buradan başla"),
  "trace.coverage": p("Sand covered", "沙子覆盖", "Sable couvert", "Sabbia coperta", "Sand bedeckt", "Kum kaplandı"),
  "trace.smooth": p("Smooth it flat", "把沙子抹平", "Aplanis le sable", "Livella la sabbia", "Glatt streichen", "Kumu düzle"),
  "trace.saySound": p("Say the sound!", "说出声音！", "Dis le son !", "Di il suono!", "Sag den Laut!", "Sesi söyle!"),
  "trace.nextLetter": p("Next letter", "下一个字母", "Lettre suivante", "Lettera successiva", "Nächster Buchstabe", "Sonraki harf"),
  "trace.done": p("Beautiful writing!", "写得真棒！", "Quelle belle écriture !", "Che bella scrittura!", "Wunderbar geschrieben!", "Çok güzel yazdın!"),
  "trace.upper": p("BIG", "大写", "MAJUSCULE", "MAIUSCOLO", "GROSS", "BÜYÜK"),
  "trace.lower": p("small", "小写", "minuscule", "minuscolo", "klein", "küçük"),
  "trace.numbers": p("Numbers", "数字", "Chiffres", "Numeri", "Zahlen", "Sayılar"),

  /* ---------------- echo monsters ---------------- */
  "echo.title": p("Say it back to the monster!", "跟小怪兽说一遍！", "Répète au monstre !", "Ripeti al mostro!", "Sag es dem Monster nach!", "Canavara söyle!"),
  "echo.listen": p("Monster says…", "小怪兽说……", "Le monstre dit…", "Il mostro dice…", "Das Monster sagt…", "Canavar diyor ki…"),
  "echo.yourturn": p("Your turn!", "该你了！", "À toi !", "Tocca a te!", "Du bist dran!", "Sıra sende!"),
  "echo.record": p("Hold to talk", "按住说话", "Appuie pour parler", "Tieni premuto e parla", "Halten und sprechen", "Basılı tut ve konuş"),
  "echo.playback": p("Monster voice", "怪兽声音", "Voix du monstre", "Voce del mostro", "Monster-Stimme", "Canavar sesi"),
  "echo.chipmunk": p("Chipmunk", "小花栗鼠", "Écureuil", "Scoiattolo", "Streifenhörnchen", "Sincap"),
  "echo.giant": p("Giant", "大巨人", "Géant", "Gigante", "Riese", "Dev"),
  "echo.ghost": p("Ghost", "小幽灵", "Fantôme", "Fantasma", "Gespenst", "Hayalet"),
  "echo.robot": p("Robot", "机器人", "Robot", "Robot", "Roboter", "Robot"),
  "echo.tryAgain": p("Try again!", "再试一次！", "Encore !", "Ancora!", "Nochmal!", "Tekrar dene!"),
  "echo.micNeeded": p("Turn on the microphone to play", "打开麦克风开始玩", "Active le micro pour jouer", "Attiva il microfono per giocare", "Mikrofon einschalten", "Oynamak için mikrofonu aç"),
  "echo.listening": p("I'm listening…", "我在听……", "J'écoute…", "Sto ascoltando…", "Ich höre zu…", "Dinliyorum…"),
  "echo.loud": p("Louder!", "大点声！", "Plus fort !", "Più forte!", "Lauter!", "Daha yüksek!"),
  "echo.volume": p("Voice power", "声音能量", "Puissance de la voix", "Potenza della voce", "Stimmkraft", "Ses gücü"),
  "echo.perfect": p("The monster loved it!", "小怪兽太喜欢了！", "Le monstre adore !", "Al mostro è piaciuto!", "Das Monster liebt es!", "Canavar bayıldı!"),

  /* ---------------- smoothie ---------------- */
  "smoothie.title": p("Blend the sounds into a word!", "把声音搅拌成单词！", "Mélange les sons !", "Frulla i suoni!", "Mische die Laute!", "Sesleri karıştır!"),
  "smoothie.pick": p("Drop 3 fruits in the blender", "把3个水果放进搅拌机", "Mets 3 fruits dans le blender", "Metti 3 frutti nel frullatore", "Leg 3 Früchte in den Mixer", "3 meyveyi blendera koy"),
  "smoothie.blend": p("BLEND!", "开始搅拌！", "MIXER !", "FRULLA!", "MIXEN!", "KARIŞTIR!"),
  "smoothie.blending": p("Whirrrr…", "呼呼呼……", "Brrrrr…", "Vrrrrr…", "Vrrrrr…", "Vınnnn…"),
  "smoothie.sounds": p("Say each sound", "一个一个说", "Dis chaque son", "Di ogni suono", "Sag jeden Laut", "Her sesi söyle"),
  "smoothie.blendIt": p("Now blend it fast!", "现在快速连读！", "Maintenant, enchaîne !", "Ora uniscili!", "Jetzt schnell verbinden!", "Şimdi hızlı birleştir!"),
  "smoothie.newWord": p("New smoothie", "新的果昔", "Nouveau smoothie", "Nuovo frullato", "Neuer Smoothie", "Yeni smoothie"),
  "smoothie.recipe": p("Recipe", "配方", "Recette", "Ricetta", "Rezept", "Tarif"),
  "smoothie.magicE": p("Magic E", "魔法E", "E magique", "E magica", "Magisches E", "Sihirli E"),

  /* ---------------- scavenger ---------------- */
  "hunt.title": p("Magic Camera Hunt", "魔法相机寻宝", "Chasse à la caméra", "Caccia alla fotocamera", "Magische Kamerasuche", "Sihirli Kamera Avı"),
  "hunt.find": p("Can you find…", "你能找到……", "Peux-tu trouver…", "Puoi trovare…", "Kannst du finden…", "Bulabilir misin…"),
  "hunt.found": p("I found it!", "我找到了！", "Je l'ai trouvé !", "L'ho trovato!", "Ich hab's gefunden!", "Buldum!"),
  "hunt.camera": p("Turn on the camera", "打开相机", "Allume la caméra", "Accendi la fotocamera", "Kamera einschalten", "Kamerayı aç"),
  "hunt.off": p("Camera is off", "相机已关闭", "Caméra éteinte", "Fotocamera spenta", "Kamera aus", "Kamera kapalı"),
  "hunt.next": p("Next thing to find", "下一个要找的", "Chose suivante", "Prossima cosa", "Nächster Gegenstand", "Sıradaki şey"),
  "hunt.look": p("Look around with the camera!", "用相机四处看看！", "Regarde autour avec la caméra !", "Guardati intorno!", "Schau mit der Kamera umher!", "Kamerayla etrafa bak!"),
  "hunt.frame": p("Put it in the magic frame", "把它放进魔法框里", "Mets-le dans le cadre magique", "Mettilo nel riquadro magico", "Ab in den magischen Rahmen", "Sihirli çerçeveye koy"),
  "hunt.trophy": p("Hunt complete!", "寻宝完成！", "Chasse terminée !", "Caccia completata!", "Suche beendet!", "Av tamamlandı!"),
  "hunt.mirror": p("Show me!", "给我看看！", "Montre-moi !", "Mostrami!", "Zeig mir!", "Bana göster!"),
  "hunt.notThere": p("Not here — look again!", "不在这里——再找找！", "Pas ici — cherche encore !", "Non qui — cerca ancora!", "Nicht hier — nochmal suchen!", "Burada değil — tekrar bak!"),

  /* ---------------- mirror ---------------- */
  "mirror.title": p("Make the face in the mirror!", "在镜子里做出表情！", "Fais la tête dans le miroir !", "Fai la faccia nello specchio!", "Mach das Gesicht im Spiegel!", "Aynada o ifadeyi yap!"),
  "mirror.copy": p("Copy the face!", "照着做表情！", "Imite la tête !", "Imita la faccia!", "Mach das Gesicht nach!", "Yüzü taklit et!"),
  "mirror.brows": p("Eyebrows", "眉毛", "Sourcils", "Sopracciglia", "Augenbrauen", "Kaşlar"),
  "mirror.mouth": p("Mouth", "嘴巴", "Bouche", "Bocca", "Mund", "Ağız"),
  "mirror.eyes": p("Eyes", "眼睛", "Yeux", "Occhi", "Augen", "Gözler"),
  "mirror.sculpt": p("Sculpt it", "捏一捏", "Sculpte", "Scolpiscilo", "Formen", "Şekillendir"),
  "mirror.match": p("Did you match it?", "做对了吗？", "C'est bon ?", "Ci sei riuscito?", "Passt es?", "Eşleşti mi?"),
  "mirror.me": p("That's me!", "这是我！", "C'est moi !", "Questo sono io!", "Das bin ich!", "Benim!"),

  /* ---------------- charade ---------------- */
  "charade.title": p("Act it out!", "演一演！", "Mime l'action !", "Recitala!", "Spiel es vor!", "Canlandır!"),
  "charade.roll": p("Roll a new action", "换一个动作", "Nouvelle action", "Nuova azione", "Neue Aktion", "Yeni eylem"),
  "charade.guess": p("Guess the action!", "猜动作！", "Devine l'action !", "Indovina l'azione!", "Errate die Aktion!", "Eylemi tahmin et!"),
  "charade.gotit": p("They guessed it!", "猜对了！", "Trouvé !", "Indovinato!", "Erraten!", "Buldu!"),
  "charade.doit": p("Do it now!", "现在就做！", "Fais-le maintenant !", "Falalo ora!", "Mach es jetzt!", "Hemen yap!"),
  "charade.slowmo": p("Slow motion", "慢动作", "Ralenti", "Rallentato", "Zeitlupe", "Ağaç çekim"),
  "charade.fast": p("Super fast!", "超级快！", "Très vite !", "Velocissimo!", "Superschnell!", "Süper hızlı!"),
  "charade.whisper": p("Whisper the word", "小声说单词", "Chuchote le mot", "Sussurra la parola", "Flüstere das Wort", "Kelimeyi fısılda"),

  /* ---------------- train ---------------- */
  "train.title": p("Build the sentence train!", "搭起句子小火车！", "Construis le train de phrases !", "Costruisci il treno di frasi!", "Baue den Satz-Zug!", "Cümle trenini kur!"),
  "train.who": p("WHO?", "谁？", "QUI ?", "CHI?", "WER?", "KİM?"),
  "train.do": p("DOES WHAT?", "做什么？", "QUOI ?", "COSA FA?", "WAS TUT ES?", "NE YAPAR?"),
  "train.what": p("WHAT?", "什么？", "QUOI ?", "COSA?", "WAS?", "NE?"),
  "train.where": p("WHERE?", "哪里？", "OÙ ?", "DOVE?", "WO?", "NEREDE?"),
  "train.cargo": p("Drag the word onto a carriage", "把单词拖到车厢上", "Glisse le mot sur un wagon", "Trascina la parola sul vagone", "Zieh das Wort auf einen Waggon", "Kelimeyi vagona sürükle"),
  "train.go": p("Choo choo! Read it!", "呜呜！读出来！", "Tchou tchou ! Lis-le !", "Ciuf ciuf! Leggila!", "Tschu tschu! Lies vor!", "Çuf çuf! Oku!"),
  "train.complete": p("The train is ready!", "小火车准备好了！", "Le train est prêt !", "Il treno è pronto!", "Der Zug ist fertig!", "Tren hazır!"),
  "train.mixed": p("Mix it again", "重新搭配", "Mélange encore", "Rimescola", "Neu mischen", "Yeniden karıştır"),

  /* ---------------- dollhouse ---------------- */
  "house.title": p("Hide the cat! Where is it?", "把小猫藏起来！它在哪里？", "Cache le chat ! Où est-il ?", "Nascondi il gatto! Dov'è?", "Versteck die Katze! Wo ist sie?", "Kediyi sakla! O nerede?"),
  "house.put": p("Put the cat…", "把小猫放……", "Mets le chat…", "Metti il gatto…", "Setz die Katze…", "Kediyi koy…"),
  "house.where": p("Where is the cat?", "小猫在哪里？", "Où est le chat ?", "Dov'è il gatto?", "Wo ist die Katze?", "Kedi nerede?"),
  "house.found": p("Here it is!", "在这里！", "Le voilà !", "Eccolo!", "Da ist sie!", "İşte burada!"),
  "house.in": p("in", "在里面", "dans", "dentro", "in", "içinde"),
  "house.on": p("on", "在上面", "sur", "sopra", "auf", "üstünde"),
  "house.under": p("under", "在下面", "sous", "sotto", "unter", "altında"),
  "house.behind": p("behind", "在后面", "derrière", "dietro", "hinter", "arkasında"),
  "house.nextto": p("next to", "在旁边", "à côté de", "accanto a", "neben", "yanında"),
  "house.between": p("between", "在中间", "entre", "tra", "zwischen", "arasında"),
  "house.infront": p("in front of", "在前面", "devant", "davanti a", "vor", "önünde"),
  "house.above": p("above", "在上面高处", "au-dessus de", "sopra a", "über", "yukarısında"),
  "house.bed": p("bed", "床", "lit", "letto", "Bett", "yatak"),
  "house.box": p("box", "箱子", "boîte", "scatola", "Kiste", "kutu"),
  "house.chair": p("chair", "椅子", "chaise", "sedia", "Stuhl", "sandalye"),
  "house.table": p("table", "桌子", "table", "tavolo", "Tisch", "masa"),
  "house.lamp": p("lamp", "灯", "lampe", "lampada", "Lampe", "lamba"),
  "house.curtain": p("curtain", "窗帘", "rideau", "tenda", "Vorhang", "perde"),
  "house.rug": p("rug", "地毯", "tapis", "tappeto", "Teppich", "halı"),
  "house.plant": p("plant", "植物", "plante", "pianta", "Pflanze", "bitki"),

  /* ---------------- dressing room ---------------- */
  "dress.title": p("Dress the monster!", "给小怪兽穿衣！", "Habille le monstre !", "Vesti il mostro!", "Zieh das Monster an!", "Canavarı giydir!"),
  "dress.pick": p("Pick an adjective + a thing", "选一个形容词 + 一件衣服", "Choisis un adjectif + un vêtement", "Scegli aggettivo + vestito", "Adjektiv + Kleidung wählen", "Sıfat + kıyafet seç"),
  "dress.wearing": p("is wearing…", "正穿着……", "porte…", "indossa…", "trägt…", "üzerinde var…"),
  "dress.puton": p("Put it on!", "穿上它！", "Mets-le !", "Mettilo!", "Zieh es an!", "Giysi giy!"),
  "dress.takeoff": p("Take it off", "脱下来", "Enlève-le", "Toglilo", "Ausziehen", "Çıkar"),
  "dress.adjective": p("Adjective", "形容词", "Adjectif", "Aggettivo", "Adjektiv", "Sıfat"),
  "dress.thing": p("Thing", "东西", "Vêtement", "Vestito", "Kleidung", "Kıyafet"),
  "dress.describe": p("Describe it!", "描述一下！", "Décris-le !", "Descrivilo!", "Beschreib es!", "Anlat!"),

  /* ---------------- lesson ---------------- */
  "les.plan": p("Lesson plan", "课程计划", "Plan de leçon", "Piano di lezione", "Lektionsplan", "Ders planı"),
  "les.objectives": p("Learning goals", "学习目标", "Objectifs", "Obiettivi", "Lernziele", "Hedefler"),
  "les.vocab": p("Key words", "重点单词", "Mots clés", "Parole chiave", "Kernwörter", "Temel Kelimeler"),
  "les.warmup": p("1 · Warm-up", "1 · 热身", "1 · Échauffement", "1 · Riscaldamento", "1 · Aufwärmen", "1 · Isınma"),
  "les.present": p("2 · Present", "2 · 呈现", "2 · Présentation", "2 · Presentazione", "2 · Präsentieren", "2 · Sunum"),
  "les.practise": p("3 · Practise", "3 · 练习", "3 · Pratique", "3 · Pratica", "3 · Üben", "3 · Alıştırma"),
  "les.produce": p("4 · Speak!", "4 · 开口说！", "4 · Parler !", "4 · Parlare!", "4 · Sprechen!", "4 · Konuşma!"),
  "les.games": p("5 · Play", "5 · 游戏", "5 · Jouer", "5 · Giocare", "5 · Spielen", "5 · Oyun"),
  "les.wrapup": p("6 · Wrap-up", "6 · 总结", "6 · Conclusion", "6 · Conclusione", "6 · Abschluss", "6 · Kapanış"),
  "les.materials": p("You need", "你需要", "Il te faut", "Ti serve", "Du brauchst", "Gerekli"),
  "les.extension": p("Extra challenge", "拓展挑战", "Défi bonus", "Sfida extra", "Extra", "Ek Görev"),
  "les.review": p("Review next time", "下次复习", "À revoir la prochaine fois", "Da ripassare", "Nächstes Mal wiederholen", "Tekrar edilecek"),
  "les.step": p("Step", "步骤", "Étape", "Passo", "Schritt", "Adım"),
  "les.say": p("Say", "说", "Dis", "Di'", "Sag", "Söyle"),
  "les.ask": p("Ask", "问", "Demande", "Chiedi", "Frage", "Sor"),
  "les.expected": p("Child answers", "孩子回答", "L'enfant répond", "Il bambino risponde", "Kind antwortet", "Çocuk cevap verir"),
  "les.minutes": p("min", "分钟", "min", "min", "Min", "dk"),
  "les.print": p("Print plan", "打印计划", "Imprimer", "Stampa", "Drucken", "Yazdır"),
  "les.openUnit": p("Open unit", "打开单元", "Ouvrir l'unité", "Apri unità", "Einheit öffnen", "Üniteyi aç"),
  "les.total": p("Total lesson time", "课程总时长", "Durée totale", "Durata totale", "Gesamtdauer", "Toplam süre"),
};

/** Short "how to say it" tutor script lines per language. */
export const SCRIPT: Record<string, Record<Lang, string>> = {};
