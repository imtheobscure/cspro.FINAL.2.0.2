import type { Lang } from '@/lib/data/types';

export type Trace = { letter: string; paths: string[]; word: string; hint: string };
/** Center-line paths, in a 400 × 360 writing space; paths follow stroke direction. */
const UPPER: Record<string, string[]> = {
 A:['M100 300 L200 60 L300 300','M140 205 L260 205'],
 B:['M120 300 L120 60','M120 60 H220 C315 60 315 175 220 175 H120','M120 175 H230 C335 175 335 300 220 300 H120'],
 C:['M290 95 C165 -10 70 80 80 190 C90 315 220 340 295 265'],
 D:['M115 300 V60','M115 60 H185 C345 60 345 300 185 300 H115'],
 E:['M285 60 H115 V300 H285','M115 180 H255'],
 F:['M285 60 H115 V300','M115 180 H255'],
 G:['M290 95 C165 -10 70 80 80 190 C90 315 230 335 295 265 V190 H220'],
 H:['M110 60 V300','M290 60 V300','M110 180 H290'],
 I:['M125 60 H275','M200 60 V300','M125 300 H275'],
 J:['M135 60 H280','M245 60 V235 C245 325 110 340 95 240'],
 K:['M115 60 V300','M295 60 L115 205','M175 155 L300 300'],
 L:['M120 60 V300 H290'],
 M:['M85 300 V60 L200 205 L315 60 V300'],
 N:['M105 300 V60 L295 300 V60'],
 O:['M200 60 C55 60 55 300 200 300 C345 300 345 60 200 60'],
 P:['M120 300 V60','M120 60 H230 C335 60 335 185 230 185 H120'],
 Q:['M200 60 C55 60 55 290 200 290 C345 290 345 60 200 60','M230 245 L305 320'],
 R:['M120 300 V60','M120 60 H225 C335 60 335 180 225 180 H120','M205 180 L300 300'],
 S:['M290 100 C210 0 75 65 115 145 C140 190 275 165 295 235 C325 325 145 350 100 260'],
 T:['M80 60 H320','M200 60 V300'],
 U:['M100 60 V215 C100 335 300 335 300 215 V60'],
 V:['M85 60 L200 300 L315 60'],
 W:['M60 60 L125 300 L200 130 L275 300 L340 60'],
 X:['M100 60 L300 300','M300 60 L100 300'],
 Y:['M90 60 L200 180 L310 60','M200 180 V300'],
 Z:['M100 60 H300 L100 300 H300'],
 '0':['M200 60 C75 60 75 300 200 300 C325 300 325 60 200 60'],
 '1':['M140 120 L210 60 V300','M140 300 H280'],
 '2':['M95 120 C120 0 315 50 295 140 C280 200 130 225 100 300 H300'],
 '3':['M100 80 C310 -5 345 170 200 175 C355 165 335 355 100 280'],
 '4':['M255 60 L90 225 H310','M255 60 V300'],
 '5':['M285 60 H125 V170 C340 105 350 365 110 280'],
 '6':['M275 65 C115 30 60 300 200 300 C330 300 335 155 210 160 C110 165 95 230 120 265'],
 '7':['M90 60 H305 L160 300'],
 '8':['M200 175 C50 130 120 30 220 60 C335 95 255 160 200 175 C30 225 120 345 245 290 C340 245 255 180 200 175'],
 '9':['M270 190 C210 260 80 190 115 110 C170 -10 340 75 280 220 L210 305'],
};
const LOWER: Record<string,string[]> = {
 a:['M270 160 C110 45 65 315 215 285 C295 265 305 125 250 135','M280 130 V295'],
 b:['M115 55 V295','M115 200 C125 90 300 105 300 215 C300 330 115 320 115 200'],
 c:['M285 155 C120 55 50 305 255 285'],
 d:['M280 180 C260 65 80 125 110 240 C145 350 295 275 280 180','M280 55 V295'],
 e:['M110 210 H290 C290 75 95 110 100 225 C110 315 240 335 290 270'],
 f:['M265 65 C180 10 160 100 165 170 V305','M110 165 H250'],
 g:['M275 170 C200 50 60 195 130 270 C205 340 300 230 275 170','M285 130 V295 C290 375 150 380 120 330'],
 h:['M115 55 V300','M115 210 C115 105 290 90 290 210 V300'],
 i:['M200 140 V300','M200 80 L201 80'],
 j:['M240 140 V290 C240 350 155 370 125 320','M240 80 L241 80'],
 k:['M120 55 V300','M285 125 L125 235','M195 190 L290 300'],
 l:['M185 55 V270 Q185 300 220 300'],
 m:['M75 140 V300','M75 210 C75 100 200 100 200 210 V300','M200 210 C200 100 325 100 325 210 V300'],
 n:['M110 140 V300','M110 215 C110 95 290 95 290 210 V300'],
 o:['M200 130 C75 130 75 300 200 300 C325 300 325 130 200 130'],
 p:['M115 130 V350','M115 205 C115 85 300 105 300 205 C300 325 115 320 115 205'],
 q:['M280 205 C280 85 95 105 95 205 C95 320 280 320 280 205','M280 130 V350'],
 r:['M140 130 V300','M140 215 Q145 95 270 140'],
 s:['M275 155 C175 80 70 170 175 205 C360 240 230 360 115 275'],
 t:['M185 75 V260 Q180 315 260 290','M110 155 H270'],
 u:['M110 130 V230 C110 330 280 330 280 200','M280 130 V300'],
 v:['M100 130 L200 300 L300 130'],
 w:['M65 130 L125 300 L200 185 L275 300 L335 130'],
 x:['M115 130 L285 300','M285 130 L115 300'],
 y:['M100 130 L200 275','M290 130 L165 350'],
 z:['M110 135 H290 L110 295 H290'],
};
const ZH: Record<string,string[]> = {
 '一':['M65 180 H335'], '二':['M100 110 H300','M65 260 H335'],
 '三':['M90 75 H310','M115 180 H285','M65 285 H335'],
 '人':['M220 65 Q225 215 80 305','M205 165 Q240 270 325 305'],
 '大':['M70 155 H330','M205 55 Q215 225 75 310','M205 170 Q245 275 325 305'],
 '小':['M200 65 V295 Q200 320 170 300','M125 155 L75 250','M275 155 L325 250'],
 '口':['M95 80 V295','M95 80 H305 V295','M95 295 H305'],
 '日':['M110 60 V300','M110 60 H290 V300','M110 180 H290','M110 300 H290'],
 '山':['M200 60 V285','M90 145 V285 H315','M315 145 V285'],
 '木':['M75 145 H325','M200 60 V310','M190 160 Q145 240 70 290','M210 160 Q250 245 330 290'],
 '十':['M75 150 H325','M200 55 V305'],
 '上':['M205 65 V280','M205 145 H305','M75 285 H325'],
 '下':['M75 80 H325','M200 80 V310','M210 150 L300 230'],
};
const EXAMPLES = ['apple','bear','cat','dog','egg','fish','giraffe','hat','icecream','juice','kite','lion','mum','nose','octopus','pig','queen','rabbit','sun','turtle','umbrella','van','water','xylophone','yellow','zebra'];
const EXAMPLE_MAP:Partial<Record<Lang,Record<string,string>>>={
 fr:{A:'bee',B:'banana',C:'cat',D:'doctor',E:'school',F:'flower',G:'giraffe',H:'hamster',I:'igloo',J:'juice',K:'kiwi',L:'lion',M:'mum',N:'nose',O:'orangeF',P:'apple',Q:'num4',R:'robot',S:'sun',T:'tomato',U:'factory',V:'bike',W:'wagon',X:'xylophone',Y:'yogurt',Z:'zebra','É':'school','È':'goat','Ç':'boy','À':'dad'},
 it:{A:'bee',B:'banana',C:'dog',D:'tooth',E:'elephant',F:'flower',G:'cat',H:'hotel',I:'island',L:'moon',M:'apple',N:'nose',O:'bear',P:'bread',Q:'num4',R:'frog',S:'sun',T:'mouse',U:'grapes',V:'vase',Z:'zebra'},
 de:{A:'apple',B:'ball',C:'clown',D:'dolphin',E:'duck',F:'fish',G:'giraffe',H:'hat',I:'hedgehog',J:'yogurt',K:'cat',L:'lion',M:'moon',N:'nose',O:'grandma',P:'panda',Q:'square',R:'rose',S:'sun',T:'table',U:'clock',V:'bird',W:'water',X:'xylophone',Y:'yogurt',Z:'zebra','Ä':'apples','Ö':'oil','Ü':'surprise'},
 tr:{A:'bee',B:'fish',C:'chick','Ç':'flower',D:'doctor',E:'hand',F:'elephant',G:'sun','Ğ':'tree',H:'carrot',I:'spinach','İ':'cow',J:'jaguar',K:'cat',L:'lemon',M:'table',N:'pomegranate',O:'bus','Ö':'duck',P:'panda',R:'robot',S:'water','Ş':'hat',T:'ball',U:'plane','Ü':'grapes',V:'vase',Y:'leaf',Z:'giraffe'}
};
export function traces(lang: Lang): Trace[] {
 if(lang==='zh') return Object.entries(ZH).map(([letter,paths],i)=>({letter,paths,word:['num1','num2','num3','person','big','small','mouth','day','mountain','tree','num10','up','down'][i],hint:'Start at the numbered dots. Trace each stroke in order.'}));
 let letters=lang==='tr'?'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ':lang==='it'?'ABCDEFGHILMNOPQRSTUVZ':'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 const extras:Record<string,string[]>={
 'Ç':[...UPPER.C,'M200 310 L185 330 L205 340'],'Ğ':[...UPPER.G,'M165 20 Q200 55 235 20'],'İ':[...UPPER.I,'M200 20 L201 20'],
 'Ö':[...UPPER.O,'M160 20 L161 20','M240 20 L241 20'],'Ş':[...UPPER.S,'M200 310 L185 330 L205 340'],'Ü':[...UPPER.U,'M160 20 L161 20','M240 20 L241 20'],
 'É':[...UPPER.E,'M190 30 L235 5'],'Ä':[...UPPER.A,'M160 20 L161 20','M240 20 L241 20'],'È':[...UPPER.E,'M180 5 L225 30'],'À':[...UPPER.A,'M180 5 L225 30']
 };
 const lowerExtra:Record<string,string[]>={
 'ç':[...LOWER.c,'M200 310 L185 330 L205 340'],'ğ':[...LOWER.g,'M165 75 Q200 110 235 75'],'ı':[LOWER.i[0]],
 'ö':[...LOWER.o,'M160 85 L161 85','M240 85 L241 85'],'ş':[...LOWER.s,'M200 310 L185 330 L205 340'],'ü':[...LOWER.u,'M160 85 L161 85','M240 85 L241 85'],
 'é':[...LOWER.e,'M190 90 L235 65'],'ä':[...LOWER.a,'M160 85 L161 85','M240 85 L241 85'],'è':[...LOWER.e,'M180 65 L225 90'],'à':[...LOWER.a,'M180 65 L225 90']
 };
 if(lang==='fr')letters+='ÉÈÇÀ';if(lang==='de')letters+='ÄÖÜ';
 const example=(letter:string)=>EXAMPLE_MAP[lang]?.[letter]??EXAMPLES[Math.max(0,'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(letter))];
 const upper=[...letters].map(letter=>({letter,paths:UPPER[letter]??extras[letter],word:example(letter),hint:letter==='Ğ'?'Soft G never starts a Turkish word. Find it inside ağaç.':'Start at 1. Move slowly along the path. Lift between strokes.'}));
 const lower=[...letters.toLocaleLowerCase(lang==='tr'?'tr':'en')].map(letter=>({letter,paths:LOWER[letter]??lowerExtra[letter],word:example(letter.toLocaleUpperCase(lang==='tr'?'tr':'en')),hint:'Small letters! Start at the dot and trace gently.'}));
 return [...upper,...lower,...Array.from({length:10},(_,i)=>({letter:String(i),paths:UPPER[String(i)],word:`num${i}`,hint:'Trace, then show the number with your fingers.'}))];
}

export type Recipe = { id: string; word: string; parts: string[]; wordId: string; ipa?: string[]; reading?: string };
const r=(word:string,parts:string,wordId:string,ipa?:string,reading?:string):Recipe=>({id:word,word,parts:parts.split('|'),wordId,ipa:ipa?.split('|'),reading});
export const RECIPES: Record<Lang,Recipe[]>={
 en:[r('cat','c|a|t','cat','k|æ|t'),r('hat','h|a|t','hat','h|æ|t'),r('bat','b|a|t','bat','b|æ|t'),r('bag','b|a|g','bag','b|æ|ɡ'),r('map','m|a|p','map','m|æ|p'),r('dad','d|a|d','dad','d|æ|d'),r('van','v|a|n','van','v|æ|n'),r('man','m|a|n','dad','m|æ|n'),r('bed','b|e|d','bed','b|ɛ|d'),r('red','r|e|d','red','ɹ|ɛ|d'),r('hen','h|e|n','hen','h|ɛ|n'),r('pen','p|e|n','pen','p|ɛ|n'),r('leg','l|e|g','leg','l|ɛ|ɡ'),r('net','n|e|t','net','n|ɛ|t'),r('pig','p|i|g','pig','p|ɪ|ɡ'),r('six','s|i|x','num6','s|ɪ|ks'),r('sit','s|i|t','sit','s|ɪ|t'),r('big','b|i|g','big','b|ɪ|ɡ'),r('dog','d|o|g','dog','d|ɑ|ɡ'),r('fox','f|o|x','fox','f|ɑ|ks'),r('box','b|o|x','box','b|ɑ|ks'),r('log','l|o|g','log','l|ɑ|ɡ'),r('pot','p|o|t','pot','p|ɑ|t'),r('sun','s|u|n','sunny','s|ʌ|n'),r('cup','c|u|p','cup','k|ʌ|p'),r('bus','b|u|s','bus','b|ʌ|s'),r('run','r|u|n','run','ɹ|ʌ|n'),r('hug','h|u|g','hug','h|ʌ|ɡ'),r('bug','b|u|g','beetle','b|ʌ|ɡ'),r('mum','m|u|m','mum','m|ʌ|m')],
 fr:[r('chat','ch|a','cat','ʃ|a'),r('lit','l|i','bed','l|i'),r('sac','s|a|c','bag','s|a|k'),r('bol','b|o|l','bowl','b|ɔ|l'),r('bus','b|u|s','bus','b|y|s'),r('papa','pa|pa','dad','pa|pa'),r('maman','ma|man','mum','ma|mɑ̃'),r('bébé','bé|bé','baby','be|be'),r('lapin','la|pin','rabbit','la|pɛ̃'),r('tapis','ta|pis','rug','ta|pi'),r('tomate','to|mate','tomato','tɔ|mat'),r('banane','ba|nane','banana','ba|nan'),r('salade','sa|lade','salad','sa|lad'),r('pirate','pi|rate','pirate','pi|ʁat'),r('vélo','vé|lo','bike','ve|lo'),r('robot','ro|bot','robot','ʁɔ|bo'),r('dodo','do|do','sleep','do|do'),r('ami','a|mi','friend','a|mi')],
 it:[r('mela','me|la','apple'),r('pane','pa|ne','bread'),r('sole','so|le','sunny'),r('luna','lu|na','moon'),r('casa','ca|sa','house'),r('mano','ma|no','hand'),r('naso','na|so','nose'),r('vaso','va|so','vase'),r('gatto','gat|to','cat'),r('cane','ca|ne','dog'),r('pera','pe|ra','pear'),r('rosa','ro|sa','rose'),r('rana','ra|na','frog'),r('toro','to|ro','cow'),r('topo','to|po','mouse'),r('mucca','muc|ca','cow'),r('nave','na|ve','boat'),r('neve','ne|ve','snowy'),r('ape','a|pe','bee'),r('uva','u|va','grapes')],
 de:[r('Hut','H|u|t','hat'),r('Bus','B|u|s','bus'),r('rot','r|o|t','red'),r('Oma','O|ma','grandma'),r('Opa','O|pa','grandpa'),r('Mama','Ma|ma','mum'),r('Papa','Pa|pa','dad'),r('Nase','Na|se','nose'),r('Hase','Ha|se','rabbit'),r('Rose','Ro|se','rose'),r('Sonne','Son|ne','sunny'),r('Katze','Kat|ze','cat'),r('Ente','En|te','duck'),r('Löwe','Lö|we','lion'),r('Auto','Au|to','car'),r('Blume','Blu|me','flower'),r('Tasse','Tas|se','cup'),r('Wasser','Was|ser','water')],
 tr:[r('el','e|l','hand'),r('at','a|t','horse'),r('ay','a|y','moon'),r('ev','e|v','house'),r('su','s|u','water'),r('süt','s|ü|t','milk'),r('bal','b|a|l','honey'),r('top','t|o|p','ball'),r('kuş','k|u|ş','bird'),r('muz','m|u|z','banana'),r('kedi','ke|di','cat'),r('anne','an|ne','mum'),r('baba','ba|ba','dad'),r('elma','el|ma','apple'),r('kuzu','ku|zu','sheep'),r('kutu','ku|tu','box'),r('arı','a|rı','bee'),r('ayı','a|yı','bear'),r('gemi','ge|mi','boat'),r('sarı','sa|rı','yellow')],
 zh:[r('妈','m|ā','mum',undefined,'mā'),r('爸','b|à','dad',undefined,'bà'),r('猫','m|āo','cat',undefined,'māo'),r('狗','g|ǒu','dog',undefined,'gǒu'),r('兔','t|ù','rabbit',undefined,'tù'),r('马','m|ǎ','horse',undefined,'mǎ'),r('猪','zh|ū','pig',undefined,'zhū'),r('牛','n|iú','cow',undefined,'niú'),r('羊','y|áng','sheep',undefined,'yáng'),r('花','h|uā','flower',undefined,'huā'),r('书','sh|ū','book',undefined,'shū'),r('水','sh|uǐ','water',undefined,'shuǐ'),r('手','sh|ǒu','hand',undefined,'shǒu'),r('口','k|ǒu','mouth',undefined,'kǒu'),r('大','d|à','big',undefined,'dà'),r('小','x|iǎo','small',undefined,'xiǎo'),r('红','h|óng','red',undefined,'hóng'),r('蓝','l|án','blue',undefined,'lán')]
};
