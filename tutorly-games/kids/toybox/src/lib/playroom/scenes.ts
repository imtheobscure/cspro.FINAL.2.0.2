import type { Lang } from '@/lib/data/types';
import { l, type Localized } from './language';
export type Sentence = { id: string; theme: string; words: string[]; parts: Record<Lang,string[]> };
const s=(id:string,theme:string,words:string,en:string,zh:string,fr:string,it:string,de:string,tr:string):Sentence=>({id,theme,words:words.split(' '),parts:Object.fromEntries(Object.entries({en,zh,fr,it,de,tr}).map(([k,v])=>[k,v.split('|')])) as Sentence['parts']});
export const SENTENCES:Sentence[]=[
 s('see-cat','nature','eye cat','I|see|a cat.','我|看见|一只猫。','Je|vois|un chat.','Io|vedo|un gatto.','Ich|sehe|eine Katze.','Ben|bir kedi|görüyorum.'),
 s('see-dog','nature','eye dog','I|see|a dog.','我|看见|一只狗。','Je|vois|un chien.','Io|vedo|un cane.','Ich|sehe|einen Hund.','Ben|bir köpek|görüyorum.'),
 s('like-apple','home','heart apple','I|like|apples.','我|喜欢|苹果。','J’aime|les|pommes.','Mi|piacciono|le mele.','Ich|mag|Äpfel.','Ben|elma|severim.'),
 s('eat-banana','home','eat banana','I|eat|a banana.','我|吃|香蕉。','Je|mange|une banane.','Io|mangio|una banana.','Ich|esse|eine Banane.','Ben|muz|yiyorum.'),
 s('drink-water','home','drink water','I|drink|water.','我|喝|水。','Je|bois|de l’eau.','Io|bevo|l’acqua.','Ich|trinke|Wasser.','Ben|su|içiyorum.'),
 s('drink-milk','home','drink milk','I|drink|milk.','我|喝|牛奶。','Je|bois|du lait.','Io|bevo|il latte.','Ich|trinke|Milch.','Ben|süt|içiyorum.'),
 s('my-hat','me','hat red','My hat|is|red.','我的帽子|是|红色的。','Mon chapeau|est|rouge.','Il mio cappello|è|rosso.','Mein Hut|ist|rot.','Benim|şapkam|kırmızı.'),
 s('my-shirt','me','shirt blue','My shirt|is|blue.','我的衬衫|是|蓝色的。','Ma chemise|est|bleue.','La mia camicia|è|blu.','Mein Hemd|ist|blau.','Benim|gömleğim|mavi.'),
 s('happy','me','happy','I|am|happy.','我|很|开心。','Je|suis|content.','Io|sono|felice.','Ich|bin|glücklich.','Ben|çok|mutluyum.'),
 s('sleepy','me','sleepy','I|am|sleepy.','我|很|困。','J’ai|très|sommeil.','Io|ho|sonno.','Ich|bin|müde.','Ben|çok|uykuluyum.'),
 s('love-mum','me','mum heart','I|love|Mummy.','我|爱|妈妈。','J’aime|ma|maman.','Io|amo|la mamma.','Ich|liebe|Mama.','Ben|annemi|seviyorum.'),
 s('two-hands','me','hand num2','I|have|two hands.','我|有|两只手。','J’ai|deux|mains.','Io|ho|due mani.','Ich|habe|zwei Hände.','Benim|iki elim|var.'),
 s('two-eyes','me','eye num2','I|have|two eyes.','我|有|两只眼睛。','J’ai|deux|yeux.','Io|ho|due occhi.','Ich|habe|zwei Augen.','Benim|iki gözüm|var.'),
 s('can-jump','school','jump','I|can|jump.','我|会|跳。','Je|peux|sauter.','Io|posso|saltare.','Ich|kann|springen.','Ben|çok iyi|zıplayabilirim.'),
 s('can-run','school','run','I|can|run.','我|会|跑。','Je|peux|courir.','Io|posso|correre.','Ich|kann|rennen.','Ben|çok iyi|koşabilirim.'),
 s('can-swim','school','swim','I|can|swim.','我|会|游泳。','Je|peux|nager.','Io|posso|nuotare.','Ich|kann|schwimmen.','Ben|çok iyi|yüzebilirim.'),
 s('can-sing','school','sing','I|can|sing.','我|会|唱歌。','Je|peux|chanter.','Io|posso|cantare.','Ich|kann|singen.','Ben|güzel|şarkı söyleyebilirim.'),
 s('read-book','school','read book','I|read|a book.','我|在|读书。','Je|lis|un livre.','Io|leggo|un libro.','Ich|lese|ein Buch.','Ben|kitap|okuyorum.'),
 s('draw-flower','school','draw flower','I|draw|a flower.','我|画|一朵花。','Je|dessine|une fleur.','Io|disegno|un fiore.','Ich|male|eine Blume.','Ben|bir çiçek|çiziyorum.'),
 s('big-bus','town','bus big','The bus|is|big.','公共汽车|很|大。','Le bus|est|grand.','L’autobus|è|grande.','Der Bus|ist|groß.','Bu|otobüs|büyük.'),
 s('red-car','town','car red','The car|is|red.','汽车|是|红色的。','La voiture|est|rouge.','La macchina|è|rossa.','Das Auto|ist|rot.','Bu|araba|kırmızı.'),
 s('plane-flies','town','plane fly','The plane|can|fly.','飞机|会|飞。','L’avion|peut|voler.','L’aereo|può|volare.','Das Flugzeug|kann|fliegen.','Bu|uçak|uçabilir.'),
 s('go-park','town','park','I|go to|the park.','我|去|公园。','Je|vais|au parc.','Io|vado|al parco.','Ich|gehe|in den Park.','Ben|parka|gidiyorum.'),
 s('go-school','town','school','I|go to|school.','我|去|学校。','Je|vais|à l’école.','Io|vado|a scuola.','Ich|gehe|zur Schule.','Ben|okula|gidiyorum.'),
 s('rabbit-jumps','nature','rabbit jump','The rabbit|can|jump.','兔子|会|跳。','Le lapin|peut|sauter.','Il coniglio|può|saltare.','Das Kaninchen|kann|springen.','Bu|tavşan|zıplayabilir.'),
 s('bird-flies','nature','bird fly','The bird|can|fly.','小鸟|会|飞。','L’oiseau|peut|voler.','L’uccello|può|volare.','Der Vogel|kann|fliegen.','Bu|kuş|uçabilir.'),
 s('fish-swims','nature','fish swim','The fish|can|swim.','小鱼|会|游泳。','Le poisson|peut|nager.','Il pesce|può|nuotare.','Der Fisch|kann|schwimmen.','Bu|balık|yüzebilir.'),
 s('elephant-big','nature','elephant big','The elephant|is|big.','大象|很|大。','L’éléphant|est|grand.','L’elefante|è|grande.','Der Elefant|ist|groß.','Bu|fil|büyük.'),
 s('mouse-small','nature','mouse small','The mouse|is|small.','老鼠|很|小。','La souris|est|petite.','Il topo|è|piccolo.','Die Maus|ist|klein.','Bu|fare|küçük.'),
 s('yellow-sun','nature','sunny yellow','The sun|is|yellow.','太阳|是|黄色的。','Le soleil|est|jaune.','Il sole|è|giallo.','Die Sonne|ist|gelb.','Bu|güneş|sarı.'),
 s('green-tree','nature','tree green','The tree|is|green.','树|是|绿色的。','L’arbre|est|vert.','L’albero|è|verde.','Der Baum|ist|grün.','Bu|ağaç|yeşil.'),
 s('blue-sky','nature','cloudy blue','The sky|is|blue.','天空|是|蓝色的。','Le ciel|est|bleu.','Il cielo|è|blu.','Der Himmel|ist|blau.','Bu|gökyüzü|mavi.'),
 s('like-cake','fun','heart cake','I|like|cake.','我|喜欢|蛋糕。','J’aime|les|gâteaux.','Mi|piacciono|le torte.','Ich|mag|Kuchen.','Ben|kek|severim.'),
 s('have-gift','fun','gift','I|have|a present.','我|有|一个礼物。','J’ai|un|cadeau.','Io|ho|un regalo.','Ich|habe|ein Geschenk.','Benim|bir hediyem|var.'),
 s('play-ball','fun','play ball','I|play with|a ball.','我|在|玩球。','Je|joue avec|un ballon.','Io|gioco con|una palla.','Ich|spiele mit|einem Ball.','Ben|topla|oynuyorum.'),
 s('ride-bike','fun','bikeride bike','I|ride|my bike.','我|骑|自行车。','Je|fais|du vélo.','Io|vado|in bici.','Ich|fahre|Fahrrad.','Ben|bisiklet|sürüyorum.'),
 s('wash-hands','home','wash hand','I|wash|my hands.','我|在|洗手。','Je|lave|mes mains.','Io|lavo|le mani.','Ich|wasche|meine Hände.','Ben|ellerimi|yıkıyorum.'),
 s('brush-teeth','home','brush tooth','I|brush|my teeth.','我|在|刷牙。','Je|brosse|mes dents.','Io|lavo|i denti.','Ich|putze|meine Zähne.','Ben|dişlerimi|fırçalıyorum.'),
 s('teddy-bed','home','teddy bed','Teddy|is on|the bed.','泰迪熊|在|床上。','Nounours|est sur|le lit.','Teddy|è sul|letto.','Teddy|ist auf|dem Bett.','Teddy|yatağın|üstünde.'),
 s('cat-chair','home','cat chair','The cat|is under|the chair.','猫|在|椅子下面。','Le chat|est sous|la chaise.','Il gatto|è sotto|la sedia.','Die Katze|ist unter|dem Stuhl.','Kedi|sandalyenin|altında.'),
 s('toy-box','home','teddy box','The toy|is in|the box.','玩具|在|盒子里。','Le jouet|est dans|la boîte.','Il giocattolo|è nella|scatola.','Das Spielzeug|ist in|der Kiste.','Oyuncak|kutunun|içinde.'),
 s('like-music','fun','heart music','I|like|music.','我|喜欢|音乐。','J’aime|la|musique.','Mi|piace|la musica.','Ich|mag|Musik.','Ben|müzik|severim.'),
 /* Space, dinosaurs, stories, sport, food and shops — one strip each for the
    things a 3–6 year old most wants to talk about. Every strip keeps the same
    three carriages in all six languages, including Turkish word order. */
 s('see-planet','space','eye planet','I|see|a planet.','我|看见|一颗行星。','Je|vois|une planète.','Io|vedo|un pianeta.','Ich|sehe|einen Planeten.','Ben|bir gezegen|görüyorum.'),
 s('spaceship-fast','space','spaceship fast','The spaceship|is|fast.','宇宙飞船|很|快。','La fusée|est|rapide.','L’astronave|è|veloce.','Das Raumschiff|ist|schnell.','Uzay gemisi|çok|hızlı.'),
 s('astronaut-happy','space','astronaut happy','The astronaut|is|happy.','宇航员|很|开心。','L’astronaute|est|content.','L’astronauta|è|felice.','Der Astronaut|ist|glücklich.','Astronot|çok|mutlu.'),
 s('trex-big','dino','trex big','The T-rex|is|big.','霸王龙|很|大。','Le T-rex|est|grand.','Il T-rex|è|grande.','Der T-rex|ist|groß.','T-rex|çok|büyük.'),
 s('dinoegg-small','dino','dinoegg small','The egg|is|small.','恐龙蛋|很|小。','L’œuf|est|petit.','L’uovo|è|piccolo.','Das Ei|ist|klein.','Yumurta|çok|küçük.'),
 s('volcano-hot','dino','volcano hot','The volcano|is|hot.','火山|很|热。','Le volcan|est|chaud.','Il vulcano|è|caldo.','Der Vulkan|ist|heiß.','Yanardağ|çok|sıcak.'),
 s('have-crown','story','crown','I|have|a crown.','我|有|一个王冠。','J’ai|une|couronne.','Io|ho|una corona.','Ich|habe|eine Krone.','Benim|bir tacım|var.'),
 s('see-dragon','story','eye dragon','I|see|a dragon.','我|看见|一条龙。','Je|vois|un dragon.','Io|vedo|un drago.','Ich|sehe|einen Drachen.','Ben|bir ejderha|görüyorum.'),
 s('like-treasure','story','heart treasurechest','I|like|treasure.','我|喜欢|宝藏。','J’aime|les|trésors.','Mi|piace|il tesoro.','Ich|mag|Schätze.','Ben|hazine|severim.'),
 s('play-basketball','sport','play basketball','I|play|basketball.','我|打|篮球。','Je|joue au|basket.','Io|gioco a|basket.','Ich|spiele|Basketball.','Ben|basketbol|oynuyorum.'),
 s('swim-pool','sport','swim swimmingpool','I|swim|in the pool.','我|在泳池|游泳。','Je|nage|dans la piscine.','Io|nuoto|in piscina.','Ich|schwimme|im Schwimmbad.','Ben|havuzda|yüzüyorum.'),
 s('win-medal','sport','medal happy','I|have|a medal.','我|有|一块奖牌。','J’ai|une|médaille.','Io|ho|una medaglia.','Ich|habe|eine Medaille.','Benim|bir madalyam|var.'),
 s('drink-tea','yum','drink tea','I|drink|tea.','我|喝|茶。','Je|bois|du thé.','Io|bevo|il tè.','Ich|trinke|Tee.','Ben|çay|içiyorum.'),
 s('like-popcorn','yum','heart popcorn','I|like|popcorn.','我|喜欢|爆米花。','J’aime|le|pop-corn.','Mi|piacciono|i popcorn.','Ich|mag|Popcorn.','Ben|patlamış mısır|severim.'),
 s('go-shop','shops','go shop','I|go to|the shop.','我|去|商店。','Je|vais|au magasin.','Io|vado|al negozio.','Ich|gehe|in den Laden.','Ben|dükkâna|gidiyorum.'),
 s('buy-apple','shops','shoppingbag apple','I|buy|an apple.','我|买|一个苹果。','J’achète|une|pomme.','Io|compro|una mela.','Ich|kaufe|einen Apfel.','Ben|bir elma|alıyorum.'),
];
export const sentenceText=(s:Sentence,lang:Lang)=>s.parts[lang].join(lang==='zh'?'':' ');

export const POSITIONS = [
 {id:'on',label:l('on the sofa','在沙发上','sur le canapé','sul divano','auf dem Sofa','kanepenin üstünde'),prompt:l('Put Teddy on the sofa.','把泰迪熊放在沙发上。','Mets Nounours sur le canapé.','Metti Teddy sul divano.','Setze Teddy auf das Sofa.','Teddy’yi kanepenin üstüne koy.'),x:28.5,y:42.5},
 {id:'under',label:l('under the table','在桌子下面','sous la table','sotto il tavolo','unter dem Tisch','masanın altında'),prompt:l('Put Teddy under the table.','把泰迪熊放在桌子下面。','Mets Nounours sous la table.','Metti Teddy sotto il tavolo.','Setze Teddy unter den Tisch.','Teddy’yi masanın altına koy.'),x:71,y:51},
 {id:'in',label:l('in the box','在盒子里','dans la boîte','nella scatola','in der Kiste','kutunun içinde'),prompt:l('Put Teddy in the box.','把泰迪熊放进盒子里。','Mets Nounours dans la boîte.','Metti Teddy nella scatola.','Setze Teddy in die Kiste.','Teddy’yi kutunun içine koy.'),x:24,y:76.5},
 {id:'beside',label:l('next to the bed','在床旁边','à côté du lit','accanto al letto','neben dem Bett','yatağın yanında'),prompt:l('Put Teddy next to the bed.','把泰迪熊放在床旁边。','Mets Nounours à côté du lit.','Metti Teddy accanto al letto.','Setze Teddy neben das Bett.','Teddy’yi yatağın yanına koy.'),x:87,y:80},
 {id:'behind',label:l('behind the curtain','在窗帘后面','derrière le rideau','dietro la tenda','hinter dem Vorhang','perdenin arkasında'),prompt:l('Hide Teddy behind the curtain.','把泰迪熊藏在窗帘后面。','Cache Nounours derrière le rideau.','Nascondi Teddy dietro la tenda.','Verstecke Teddy hinter dem Vorhang.','Teddy’yi perdenin arkasına sakla.'),x:14,y:40},
 {id:'between',label:l('between the chairs','在两把椅子中间','entre les chaises','tra le sedie','zwischen den Stühlen','sandalyelerin arasında'),prompt:l('Put Teddy between the chairs.','把泰迪熊放在两把椅子中间。','Mets Nounours entre les chaises.','Metti Teddy tra le sedie.','Setze Teddy zwischen die Stühle.','Teddy’yi sandalyelerin arasına koy.'),x:41.6,y:78.5},
 {id:'front',label:l('in front of the house','在房子前面','devant la maison','davanti alla casa','vor dem Haus','evin önünde'),prompt:l('Put Teddy in front of the house.','把泰迪熊放在房子前面。','Mets Nounours devant la maison.','Metti Teddy davanti alla casa.','Setze Teddy vor das Haus.','Teddy’yi evin önüne koy.'),x:51,y:93},
];

export const EMOTIONS = [
 {id:'happy',mouth:85,brows:55,eyes:65,situation:l('A friend comes to play!','朋友来玩了！','Un ami vient jouer !','Un amico viene a giocare!','Ein Freund kommt zum Spielen!','Bir arkadaşın oynamaya geliyor!')},
 {id:'sad',mouth:10,brows:20,eyes:40,situation:l('My balloon flew away.','我的气球飞走了。','Mon ballon s’est envolé.','Il mio palloncino è volato via.','Mein Ballon ist weggeflogen.','Balonum uçup gitti.')},
 {id:'angry',mouth:20,brows:90,eyes:45,situation:l('My tower fell down.','我的积木塔倒了。','Ma tour est tombée.','La mia torre è caduta.','Mein Turm ist umgefallen.','Kulem yıkıldı.')},
 {id:'surprised',mouth:50,brows:5,eyes:100,situation:l('A present for me?','给我的礼物？','Un cadeau pour moi ?','Un regalo per me?','Ein Geschenk für mich?','Bana bir hediye mi?')},
 {id:'sleepy',mouth:40,brows:45,eyes:5,situation:l('It is bedtime.','该睡觉了。','C’est l’heure de dormir.','È ora di dormire.','Es ist Schlafenszeit.','Uyku vakti geldi.')},
 {id:'scared',mouth:45,brows:15,eyes:90,situation:l('I hear a loud thunderclap.','我听到很大的雷声。','J’entends le tonnerre.','Sento un tuono forte.','Ich höre lauten Donner.','Yüksek bir gök gürültüsü duyuyorum.')},
 {id:'excited',mouth:100,brows:30,eyes:90,situation:l('We are going to the park!','我们要去公园！','On va au parc !','Andiamo al parco!','Wir gehen in den Park!','Parka gidiyoruz!')},
 {id:'calm',mouth:65,brows:50,eyes:20,situation:l('I take a slow, deep breath.','我慢慢地深呼吸。','Je respire doucement.','Respiro piano piano.','Ich atme langsam und tief.','Yavaşça derin bir nefes alıyorum.')},
 {id:'shy',mouth:60,brows:40,eyes:35,situation:l('I meet a new friend.','我认识了新朋友。','Je rencontre un nouvel ami.','Incontro un nuovo amico.','Ich treffe einen neuen Freund.','Yeni bir arkadaşla tanışıyorum.')},
 {id:'proudFeeling',mouth:90,brows:65,eyes:55,situation:l('I made it all by myself!','我自己做到了！','Je l’ai fait tout seul !','L’ho fatto da solo!','Ich habe es allein geschafft!','Hepsini kendim yaptım!')},
];

export const ACTION_PACKS = [
 {id:'move',title:'Let’s get moving',words:['walk','run','jump','clap','stomp','tiptoe']},
 {id:'morning',title:'My little morning',words:['wakeup','stretch','brush','wash','eat','drink']},
 {id:'play',title:'Playtime superstars',words:['dance','sing','throw','catch','kick','swim']},
 {id:'quiet',title:'Quiet little moments',words:['sit','read','draw','sleep','smile','hug']},
 {id:'together',title:'Let’s do it together',words:['wave','stand','fly','cook','push','pull']},
 {id:'spacecrew',title:'Space crew training',words:['countdown','fly','jump','stand','wave','stretch']},
 {id:'dino',title:'Dino stomp',words:['stomp','dig','stretch','run','jump','throw']},
 {id:'splash',title:'Splash time',words:['swim','kick','throw','catch','clap','jump']},
];

export type CameraMission={id:string;word:string;prompt:Localized;hint:string};
const c=(id:string,word:string,hint:string,en:string,zh:string,fr:string,it:string,de:string,tr:string):CameraMission=>({id,word,hint,prompt:l(en,zh,fr,it,de,tr)});
export const CAMERA_MISSIONS:CameraMission[]=[
 c('book','book','Hold the book in the circle. Ask about its cover.','Show me a book!','给我看一本书！','Montre-moi un livre !','Fammi vedere un libro!','Zeig mir ein Buch!','Bana bir kitap göster!'),
 c('cup','cup','Use an empty, unbreakable cup.','Show me a cup!','给我看一个杯子！','Montre-moi une tasse !','Fammi vedere una tazza!','Zeig mir eine Tasse!','Bana bir fincan göster!'),
 c('spoon','spoon','A wooden or plastic spoon is perfect.','Show me a spoon!','给我看一把勺子！','Montre-moi une cuillère !','Fammi vedere un cucchiaio!','Zeig mir einen Löffel!','Bana bir kaşık göster!'),
 c('teddy','teddy','Any soft toy works. Introduce it by name.','Show me your teddy!','给我看你的泰迪熊！','Montre-moi ton nounours !','Fammi vedere il tuo orsacchiotto!','Zeig mir deinen Teddy!','Bana oyuncak ayını göster!'),
 c('ball','ball','Roll the ball gently into the frame.','Show me a ball!','给我看一个球！','Montre-moi un ballon !','Fammi vedere una palla!','Zeig mir einen Ball!','Bana bir top göster!'),
 c('pencil','pencil','Keep the pencil away from eyes.','Show me a pencil!','给我看一支铅笔！','Montre-moi un crayon !','Fammi vedere una matita!','Zeig mir einen Bleistift!','Bana bir kalem göster!'),
 c('paper','paper','Try folding it into a tiny rectangle.','Show me some paper!','给我看一张纸！','Montre-moi du papier !','Fammi vedere un foglio!','Zeig mir Papier!','Bana kağıt göster!'),
 c('sock','socks','Match it to another sock.','Show me a sock!','给我看一只袜子！','Montre-moi une chaussette !','Fammi vedere un calzino!','Zeig mir eine Socke!','Bana bir çorap göster!'),
 c('hat','hat','Put it on, take it off, say the word.','Show me a hat!','给我看一顶帽子！','Montre-moi un chapeau !','Fammi vedere un cappello!','Zeig mir einen Hut!','Bana bir şapka göster!'),
 c('shoe','shoes','Compare a big shoe and a small shoe.','Show me a shoe!','给我看一只鞋！','Montre-moi une chaussure !','Fammi vedere una scarpa!','Zeig mir einen Schuh!','Bana bir ayakkabı göster!'),
 c('apple','apple','An adult brings any fruit. Do not eat during the task.','Show me an apple!','给我看一个苹果！','Montre-moi une pomme !','Fammi vedere una mela!','Zeig mir einen Apfel!','Bana bir elma göster!'),
 c('banana','banana','Ask about the colour and the shape.','Show me a banana!','给我看一根香蕉！','Montre-moi une banane !','Fammi vedere una banana!','Zeig mir eine Banane!','Bana bir muz göster!'),
 c('red','red','Any safe red object counts.','Find something red!','找个红色的东西！','Trouve quelque chose de rouge !','Trova qualcosa di rosso!','Finde etwas Rotes!','Kırmızı bir şey bul!'),
 c('blue','blue','Offer two objects; let the child choose.','Find something blue!','找个蓝色的东西！','Trouve quelque chose de bleu !','Trova qualcosa di blu!','Finde etwas Blaues!','Mavi bir şey bul!'),
 c('yellow','yellow','A toy or a piece of paper works.','Find something yellow!','找个黄色的东西！','Trouve quelque chose de jaune !','Trova qualcosa di giallo!','Finde etwas Gelbes!','Sarı bir şey bul!'),
 c('green','green','Do not pick plants unless an adult says yes.','Find something green!','找个绿色的东西！','Trouve quelque chose de vert !','Trova qualcosa di verde!','Finde etwas Grünes!','Yeşil bir şey bul!'),
 c('circle','circle','A lid or a paper circle works.','Find a circle!','找一个圆形！','Trouve un cercle !','Trova un cerchio!','Finde einen Kreis!','Bir daire bul!'),
 c('square','square','Compare four equal sides.','Find a square!','找一个正方形！','Trouve un carré !','Trova un quadrato!','Finde ein Quadrat!','Bir kare bul!'),
 c('triangle','triangle','Make a triangle with your fingers.','Show me a triangle!','给我看一个三角形！','Montre-moi un triangle !','Fammi vedere un triangolo!','Zeig mir ein Dreieck!','Bana bir üçgen göster!'),
 c('two','num2','Keep both hands inside the frame.','Show me two fingers!','给我看两根手指！','Montre-moi deux doigts !','Fammi vedere due dita!','Zeig mir zwei Finger!','Bana iki parmak göster!'),
 c('five','num5','Count each finger slowly.','Show me five fingers!','给我看五根手指！','Montre-moi cinq doigts !','Fammi vedere cinque dita!','Zeig mir fünf Finger!','Bana beş parmak göster!'),
 c('small','small','Nothing small enough to swallow. Use a small soft toy.','Find something small!','找个小小的东西！','Trouve quelque chose de petit !','Trova qualcosa di piccolo!','Finde etwas Kleines!','Küçük bir şey bul!'),
 c('big','big','Stay seated; an adult brings the object.','Find something big!','找个大大的东西！','Trouve quelque chose de grand !','Trova qualcosa di grande!','Finde etwas Großes!','Büyük bir şey bul!'),
 c('smile','smile','Ask: how do you feel today?','Show me your smile!','给我看你的笑脸！','Montre-moi ton sourire !','Fammi vedere il tuo sorriso!','Zeig mir dein Lächeln!','Bana gülümsemeni göster!'),
 /* Ten more household missions, including the new food, drink and toy words. */
 c('bowl','bowl','Any unbreakable bowl works.','Show me a bowl!','给我看一个碗！','Montre-moi un bol !','Fammi vedere una ciotola!','Zeig mir eine Schüssel!','Bana bir kâse göster!'),
 c('tea','tea','An empty cup is fine — pretend it is tea.','Show me a cup of tea!','给我看一杯茶！','Montre-moi une tasse de thé !','Fammi vedere una tazza di tè!','Zeig mir eine Tasse Tee!','Bana bir bardak çay göster!'),
 c('carrot','carrot','A real or toy carrot. An adult handles the knife.','Show me a carrot!','给我看一根胡萝卜！','Montre-moi une carotte !','Fammi vedere una carota!','Zeig mir eine Karotte!','Bana bir havuç göster!'),
 c('socks','socks','Find the matching sock too.','Show me your socks!','给我看你的袜子！','Montre-moi tes chaussettes !','Fammi vedere i tuoi calzini!','Zeig mir deine Socken!','Bana çoraplarını göster!'),
 c('crayons','crayons','Choose one colour and name it.','Show me your crayons!','给我看你的蜡笔！','Montre-moi tes crayons !','Fammi vedere i tuoi pastelli!','Zeig mir deine Wachsmalstifte!','Bana boya kalemlerini göster!'),
 c('toytrain','toytrain','Push it gently into the circle.','Show me a toy train!','给我看玩具火车！','Montre-moi un petit train !','Fammi vedere un trenino!','Zeig mir eine Spielzeugeisenbahn!','Bana oyuncak tren göster!'),
 c('balloon','balloon','Hold it still — no popping.','Show me a balloon!','给我看一个气球！','Montre-moi un ballon de baudruche !','Fammi vedere un palloncino!','Zeig mir einen Luftballon!','Bana bir balon göster!'),
 c('phone','phone','A toy phone is perfect.','Show me a phone!','给我看一部电话！','Montre-moi un téléphone !','Fammi vedere un telefono!','Zeig mir ein Telefon!','Bana bir telefon göster!'),
 c('flower','flower','A real flower, or a picture of one.','Show me a flower!','给我看一朵花！','Montre-moi une fleur !','Fammi vedere un fiore!','Zeig mir eine Blume!','Bana bir çiçek göster!'),
 c('mirror','mirror','Hold it so we can see the room behind you.','Find a mirror!','找一面镜子！','Trouve un miroir !','Trova uno specchio!','Finde einen Spiegel!','Bir ayna bul!'),
];

export const GARMENTS = [
 {id:'hat',label:l('hat','帽子','chapeau','cappello','Hut','şapka'),fr:'m',it:'m',de:'m',zh:'一顶'},
 {id:'shirt',label:l('shirt','衬衫','chemise','camicia','Hemd','gömlek'),fr:'f',it:'f',de:'n',zh:'一件'},
 {id:'coat',label:l('coat','外套','manteau','cappotto','Mantel','palto'),fr:'m',it:'m',de:'m',zh:'一件'},
 {id:'dress',label:l('dress','连衣裙','robe','vestito','Kleid','elbise'),fr:'f',it:'m',de:'n',zh:'一条'},
 {id:'scarf',label:l('scarf','围巾','écharpe','sciarpa','Schal','atkı'),fr:'f',it:'f',de:'m',zh:'一条'},
 {id:'shoes',label:l('shoes','鞋子','chaussures','scarpe','Schuhe','ayakkabı'),fr:'fp',it:'fp',de:'p',zh:'一双'},
 {id:'shorts',label:l('shorts','短裤','short','pantaloncini','Shorts','şort'),fr:'m',it:'mp',de:'p',zh:'一条'},
 {id:'socks',label:l('socks','袜子','chaussettes','calzini','Socken','çorap'),fr:'fp',it:'mp',de:'p',zh:'一双'},
];
export const COLORS=[
 {id:'red',hex:'#dd7568',en:'red',zh:'红色',fr:'rouge',frF:'rouge',it:'rosso',de:'rot',tr:'kırmızı'},
 {id:'blue',hex:'#779cbd',en:'blue',zh:'蓝色',fr:'bleu',frF:'bleue',it:'blu',de:'blau',tr:'mavi'},
 {id:'yellow',hex:'#e9bd60',en:'yellow',zh:'黄色',fr:'jaune',frF:'jaune',it:'giallo',de:'gelb',tr:'sarı'},
 {id:'green',hex:'#7da48a',en:'green',zh:'绿色',fr:'vert',frF:'verte',it:'verde',de:'grün',tr:'yeşil'},
 {id:'pink',hex:'#d997b0',en:'pink',zh:'粉色',fr:'rose',frF:'rose',it:'rosa',de:'rosa',tr:'pembe'},
 {id:'purple',hex:'#ad9cc8',en:'purple',zh:'紫色',fr:'violet',frF:'violette',it:'viola',de:'lila',tr:'mor'},
];
export function outfitPhrase(garmentId:string,colorId:string,lang:Lang):string{
 const g=GARMENTS.find(x=>x.id===garmentId)??GARMENTS[0];const c=COLORS.find(x=>x.id===colorId)??COLORS[0];
 const plural=g.id==='shoes'||g.id==='shorts'||g.id==='socks';
 if(lang==='en') return `${plural?'Some':'A'} ${c.en} ${g.label.en}`;
 if(lang==='zh') return `${g.zh}${c.zh}的${g.label.zh}`;
 if(lang==='tr') return `${c.tr} ${g.label.tr}`;
 if(lang==='fr')return `${g.fr.endsWith('p')?'Des':g.fr==='f'?'Une':'Un'} ${g.label.fr} ${g.fr.startsWith('f')?c.frF:c.fr}${g.fr.endsWith('p')?'s':''}`;
 if(lang==='de')return `${g.de==='p'?'':g.de==='m'?'Ein ':'Ein '}${c.de}${['rosa','lila'].includes(c.de)?'':g.de==='p'?'e':g.de==='m'?'er':'es'} ${g.label.de}`;
 let adj=c.it;
 if(!['blu','rosa','viola'].includes(adj)){if(adj.endsWith('o')) adj=adj.slice(0,-1)+(g.it==='f'?'a':g.it==='fp'?'e':g.it==='mp'?'i':'o');else if(adj.endsWith('e')&&g.it.endsWith('p'))adj=adj.slice(0,-1)+'i';}
 return `${g.it==='f'?'Una':g.it==='fp'?'Delle':g.it==='mp'?'Dei':'Un'} ${g.label.it} ${adj}`;
}
