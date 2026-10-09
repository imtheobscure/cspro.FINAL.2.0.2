import { THEMES, WORDS, UNITS, WORD_MAP } from '@/lib/data';
import { t } from '@/lib/data/phrases';
import { w, type Lang, type Word } from '@/lib/data/types';
import { EXTRA_WORDS } from './extra-words';
import { RECIPES, traces } from './phonics';
import { ACTION_PACKS, CAMERA_MISSIONS, COLORS, EMOTIONS, GARMENTS, POSITIONS, SENTENCES } from './scenes';
import type { ChildKey } from './language';
import { customLessonPacks, lessonPhraseKey } from './customPack';

export const GAME_IDS=['sandbox','monsters','smoothies','scavenger','mirror','charades','train','dollhouse','dressing'] as const;
export type GameId=(typeof GAME_IDS)[number];
export type Game={id:GameId;title:string;fullTitle:string;description:string;category:'Sounds & letters'|'Speaking & expression'|'Everyday language';skill:string;age:string;minutes:number;color:string;bg:string;tag:string;questions:ChildKey[];tutor:string[]};
export const GAMES:Game[]=[
 {id:'sandbox',title:'The letter sandbox',fullTitle:'Tactile letter tracing',description:'Little fingers. Sandy paths. Big letter discoveries.',category:'Sounds & letters',skill:'Fine motor · Letter formation',age:'3–6',minutes:5,color:'#a37a42',bg:'#f6edda',tag:'TRACE & FEEL',questions:['trace','first','touch','slow'],tutor:['Model the stroke with your finger, then trace it together. The dots show where to begin.','Say the letter name; model its sound separately. Ask for an air-writing turn away from the screen.','The coverage meter checks the path, not handwriting quality. Clear the sand whenever you like.']},
 {id:'monsters',title:'Momo’s echo cave',fullTitle:'Voice-mimicking monsters',description:'Say it, hear it, giggle. Your new little echo friend.',category:'Speaking & expression',skill:'Listening · Confident speaking',age:'3–6',minutes:6,color:'#527e75',bg:'#e4eee8',tag:'LISTEN & ECHO',questions:['say','quiet','like','ask'],tutor:['Model one word, then leave a full five seconds for a response. Any attempt counts.','The microphone records this device, not a remote call. Invite a nearby child to speak or model the remote child’s answer yourself.','Clips are kept only in memory, never uploaded. Echo is playback, not pronunciation assessment.']},
 {id:'smoothies',title:'Sound smoothies',fullTitle:'Vowel & syllable blending',description:'A splash of sounds. A whole new word. Blend away!',category:'Sounds & letters',skill:'Phonological awareness · Blending',age:'4–6',minutes:7,color:'#b87660',bg:'#f6e7dd',tag:'MIX & SAY',questions:['blend','first','again','say'],tutor:['Drag sound tiles into the cup in order. Tap is also supported. Blend only when every sound is in.','English uses short CVC sounds. French, Italian, German and Turkish include syllable blending; Chinese uses initial + final pinyin.','Model pure sounds yourself when browser speech reads letter names. French final silent letters are visual spelling cues, not extra spoken sounds.']},
 {id:'scavenger',title:'Little object hunters',fullTitle:'Live-camera object scavenging',description:'Bring the real world into your language lesson.',category:'Everyday language',skill:'Real-world vocabulary · Describing',age:'3–6',minutes:6,color:'#6785a1',bg:'#e6edf3',tag:'LOOK & FIND',questions:['find','color','big','point'],tutor:['Start the tutor webcam. Drag picture stickers around the live view, or hide them and hold a real object inside the movable target.','The tutor confirms each find. This is a live overlay, not automatic object recognition or face tracking.','Use safe, reachable objects with an adult. No camera? Use the illustrated practice scene. Video is never recorded.']},
 {id:'mirror',title:'The feelings mirror',fullTitle:'Emotion-face sculpting',description:'Move a smile. Raise a brow. Tell us how you feel.',category:'Speaking & expression',skill:'Emotional language · Empathy',age:'3–6',minutes:6,color:'#a37b97',bg:'#f2e6ec',tag:'MAKE & FEEL',questions:['face','happy','smile','ask'],tutor:['Read the tiny story. Invite the child to name a feeling; more than one answer can make sense.','Slide the mouth, eyebrows and eyes to sculpt the face, then try the same face together.','Webcam mirroring is optional. There is no emotion detection or judgement of a child’s real face.']},
 {id:'charades',title:'Move like me',fullTitle:'Action-verb charades',description:'A wiggle, a jump, a story told with your whole body.',category:'Speaking & expression',skill:'Action words · Body expression',age:'3–6',minutes:5,color:'#b28545',bg:'#f5ecd9',tag:'MOVE & GUESS',questions:['act','touch','slow','say'],tutor:['Clear a safe space. Seated or hand-only versions count too.','Play the animation, then ask the child to guess and act. Hide the word for a real charade.','Let the child be the director: the tutor must copy their action next.']},
 {id:'train',title:'The talking train',fullTitle:'Visual sentence building',description:'One little word carriage at a time. All aboard!',category:'Everyday language',skill:'Word order · Full sentences',age:'4–6',minutes:7,color:'#688779',bg:'#e6eee4',tag:'BUILD & TELL',questions:['build','first','say','ask'],tutor:['Say the whole sentence first. Drag the word carriages into the numbered spaces.','Sentence strips are authored per language, including Turkish subject–object–verb order. Do not translate a strip word by word.','Make the train go, then invite the child to say it with a new voice or act it out.']},
 {id:'dollhouse',title:'Where’s Teddy?',fullTitle:'Prepositional hide-and-seek',description:'Under, over, in between. A tiny home to explore.',category:'Everyday language',skill:'Prepositions · Spatial language',age:'3–6',minutes:6,color:'#9d7b6c',bg:'#f0e9e1',tag:'HIDE & SEEK',questions:['where','on','under','ask'],tutor:['Choose a placement mission or switch to hide-and-seek. Drag Teddy, or tap a location.','In hide-and-seek, the child guesses a location and the tutor taps it. Reveal only when you are ready.','After the game, hide a real toy. Ask “Where?” and model a short phrase, not just one word.']},
 {id:'dressing',title:'Pip’s dressing room',fullTitle:'Noun–adjective dressing',description:'A blue hat? A red coat? Dress up a little story.',category:'Everyday language',skill:'Clothes · Colour descriptions',age:'3–6',minutes:6,color:'#9283ad',bg:'#ece8f3',tag:'DRESS & DESCRIBE',questions:['dress','color','wear','like'],tutor:['Read the outfit request. Choose a garment and colour, then drag it onto Pip.','Ask the child to request the next outfit. Colours are for everyone; there are no gendered choices.','Try free styling before the mission. Read the final phrase together; adjective agreement changes with the language.']},
];
export const GAME_MAP=Object.fromEntries(GAMES.map(g=>[g.id,g])) as Record<GameId,Game>;
// Resolve the old dictionary’s duplicate “dress” action id without losing either meaning.
const original=WORDS.map(word=>word.id==='dress'&&word.k==='action'?{...word,id:'getdressed'}:word);
const fallback=w('friend','🧒','person',['friend','朋友','péngyou','ami','amico','Freund','arkadaş']);
/** The dictionary alias the catalogue uses for the action “dress”. */
const ALIASES:Record<string,Word>=Object.fromEntries(WORDS.filter(x=>x.id==='dress'&&x.k==='action').map(x=>['getdressed',{...x,id:'getdressed'}]));
/**
 * The whole illustrated dictionary, built fresh on every call.
 *
 * It used to be a module-level constant, which froze it at load time — a
 * category pack pasted at runtime could never appear in the word garden (the
 * words were in `WORD_MAP`, but this list was already built). Built-ins keep
 * their order and take precedence over a pack that reuses an id.
 */
export function vocabList():Word[]{
 const map=new Map<string,Word>();
 for(const word of original)map.set(word.id,word);
 for(const word of EXTRA_WORDS)if(!map.has(word.id))map.set(word.id,word);
 for(const id of Object.keys(WORD_MAP)){const word=WORD_MAP[id];if(word&&!map.has(id))map.set(id,word);}
 return [...map.values()];
}
export const vocab=(id:string):Word=>WORD_MAP[id]??ALIASES[id]??fallback;
export const wordText=(id:string,lang:Lang)=>vocab(id).t[lang];

/** One timed step of a plan that was pasted in from an AI. */
export type LessonStep={title:string;say:string;ask?:string[];tutor?:string;minutes?:number};
export type Lesson={id:string;game:GameId;title:string;subtitle:string;theme:string;words:string[];index:number;level:'First steps'|'Growing voices';minutes:number;
 /** Present only on an imported plan; the studio prints it in the tutor guide. */
 steps?:LessonStep[];
 /** true when the lesson came from a pasted plan rather than the built-in catalogue. */
 custom?:boolean};
const make=(game:GameId,id:string,title:string,subtitle:string,theme:string,words:string[],index:number,level:Lesson['level']='First steps'):Lesson=>({id:`${game}-${id}`,game,title,subtitle,theme,words,index,level,minutes:GAME_MAP[game].minutes});
export function lessons(lang:Lang):Lesson[]{
 const out:Lesson[]=[];
 traces(lang).forEach((x,i)=>out.push(make('sandbox',`letter-${x.letter}`,`Trace ${x.letter}`,x.hint,'school',[x.word],i)));
 const units=[...UNITS,{id:'more-animals',name:'More little creatures',words:EXTRA_WORDS.filter(w=>w.k==='animal')},{id:'more-food',name:'More yummy words',words:EXTRA_WORDS.filter(w=>w.k==='food')},{id:'more-home',name:'Around the house',words:EXTRA_WORDS.filter(w=>w.k==='thing')},{id:'more-moves',name:'A little more movement',words:EXTRA_WORDS.filter(w=>w.k==='action')},{id:'more-feelings',name:'More little feelings',words:EXTRA_WORDS.filter(w=>w.k==='feeling')},{id:'more-body',name:'More about me',words:EXTRA_WORDS.filter(w=>w.k==='body')},{id:'more-nature',name:'Outside discoveries',words:EXTRA_WORDS.filter(w=>w.k==='nature')},{id:'more-clothes',name:'Getting dressed',words:EXTRA_WORDS.filter(w=>w.k==='clothes')}];
 for(const kind of ['place','person','vehicle','number','time'] as const){units.push({id:`extra-${kind}`,name:({place:'More places to explore',person:'People and story friends',vehicle:'More ways to travel',number:'Meet zero',time:'A new little day'})[kind],words:EXTRA_WORDS.filter(w=>w.k===kind)});}
 for(const unit of units){
  // Translate every unit name: built-ins use "unit.*" keys, an imported pack uses
  // "custom.*" keys, and a literal name (the extra vocabulary units below) simply
  // resolves to itself because `t()` falls back to the key.
  const name=t(unit.name,'en');
  const theme=THEMES.find(t=>t.units.some(u=>u.id===unit.id))?.id??'home';
  for(let i=0;i<unit.words.length;i+=5){const ws=unit.words.slice(i,i+5).map(w=>w.id==='dress'&&w.k==='action'?'getdressed':w.id);out.push(make('monsters',`${unit.id}-${i}`,`${name}${unit.words.length>5?` · ${Math.floor(i/5)+1}`:''}`,`${ws.length} words to listen, echo and say together.`,theme,ws,i));}
 }
 RECIPES[lang].forEach((x,i)=>out.push(make('smoothies',x.word,`Blend ${x.word}`,x.parts.join(' + ')+' → '+x.word,'school',[x.wordId],i,'Growing voices')));
 CAMERA_MISSIONS.forEach((x,i)=>out.push(make('scavenger',x.id,x.prompt.en,x.hint,'home',[x.word],i)));
 EMOTIONS.forEach((x,i)=>out.push(make('mirror',x.id,`Feeling ${wordText(x.id,'en')}`,x.situation.en,'me',[x.id],i)));
 ACTION_PACKS.forEach((x,i)=>out.push(make('charades',x.id,x.title,'A whole-body conversation. Watch, guess, then copy.','school',x.words,i)));
 SENTENCES.forEach((x,i)=>out.push(make('train',x.id,x.parts.en.join(' '),x.parts[lang].join(lang==='zh'?'':' '),x.theme,x.words,i,'Growing voices')));
 POSITIONS.forEach((x,i)=>out.push(make('dollhouse',x.id,`Teddy ${x.label.en}`,x.prompt.en,'home',['teddy'],i)));  GARMENTS.forEach((g,gi)=>COLORS.forEach((c,ci)=>out.push(make('dressing',`${g.id}-${c.id}`,`${c.en[0].toUpperCase()+c.en.slice(1)} ${g.label.en}`,'Listen to the request. Dress Pip. Describe the outfit.','me',[g.id,c.id],gi*COLORS.length+ci))));
 // Plans pasted in from an AI come first: a tutor who just added one wants to see
 // it, so it leads its studio's list instead of hiding at the end of 2,000 generated
 // lessons. The title is read from the pack's own registered phrase row, so it is
 // shown in the chosen language like every built-in lesson title.
 for(const pack of customLessonPacks()){
  const words=[...(pack.words??[]),...(pack.newWords??[]).map(x=>x.id)];
  out.unshift({id:pack.id,game:pack.game as GameId,title:t(lessonPhraseKey(pack.id),lang),subtitle:pack.subtitle,theme:pack.theme,words:words.length?words:['friend'],index:0,level:pack.level??'First steps',minutes:pack.minutes??6,steps:pack.steps,custom:true});
 }
 return out;
}
export const lessonsFor=(game:GameId,lang:Lang)=>lessons(lang).filter(x=>x.game===game);
export function findLesson(game:GameId,id:string|undefined,lang:Lang):Lesson{return lessonsFor(game,lang).find(x=>x.id===id)??lessonsFor(game,lang)[0];}
