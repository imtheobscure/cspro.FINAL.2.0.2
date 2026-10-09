'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Cloud, CloudOff, Eye, EyeOff, Heart, Lightbulb, MessageCircle, RotateCcw, ShieldCheck, Sparkles, Volume2 } from 'lucide-react';
import Shell from './Shell';
import { GAME_MAP, lessonsFor, type GameId } from '@/lib/playroom/catalog';
import { child, studioTitles } from '@/lib/playroom/language';
import { finishLesson, usePlayroom } from '@/lib/playroom/state';
import { usePacksVersion } from '@/lib/playroom/usePacks';
import { api, type StudentDto } from '@/lib/api';
import { withBase } from '@/lib/basePath';
import { stopSpeaking } from '@/lib/speech';
import { sfxCorrect } from '@/lib/sfx';
import { usePlayAudio, type StudioProps } from './Controls';
import { SandboxStudio, SmoothieStudio, TrainStudio } from './LiteracyStudios';
import { EchoStudio, MirrorStudio, ScavengerStudio } from './VoiceStudios';
import { CharadesStudio, DollhouseStudio, DressingStudio } from './PretendStudios';
const STUDIOS={sandbox:SandboxStudio,monsters:EchoStudio,smoothies:SmoothieStudio,scavenger:ScavengerStudio,mirror:MirrorStudio,charades:CharadesStudio,train:TrainStudio,dollhouse:DollhouseStudio,dressing:DressingStudio};
export default function StudioPlayer({gameId,initialLesson}:{gameId:GameId;initialLesson?:string}){
 const lang=usePlayroom(s=>s.lang);const home=usePlayroom(s=>s.home);const bilingual=usePlayroom(s=>s.bilingual);const learner=usePlayroom(s=>s.learner);const patch=usePlayroom(s=>s.patch);const queue=usePlayroom(s=>s.queue);const enqueue=usePlayroom(s=>s.enqueue);
 const [selected,setSelected]=useState(initialLesson??'');const [present,setPresent]=useState(false);const [retry,setRetry]=useState(0);const [completed,setCompleted]=useState(false);const [saving,setSaving]=useState(false);const [synced,setSynced]=useState(false);const [learners,setLearners]=useState<StudentDto[]>([]);
 // A plan pasted in from an AI leads this studio's list, so it has to be
 // re-read when a new one arrives — hence the pack version in the deps.
 const packsVersion=usePacksVersion();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 const game=GAME_MAP[gameId];const all=useMemo(()=>lessonsFor(gameId,lang),[gameId,lang,packsVersion]);const lesson=all.find(l=>l.id===selected)??all[0];const lessonIndex=all.findIndex(l=>l.id===lesson.id);const locked=useRef(false);const started=useRef(0);const mountedKey=useRef('');const {say}=usePlayAudio();const key=`${lang}:${lesson.id}:${retry}:${learner?.id??'guest'}`;
 useEffect(()=>{started.current=Date.now();locked.current=false;mountedKey.current=key;setCompleted(false);setSynced(false);setSaving(false);patch({lastGame:gameId,lastLesson:lesson.id});return()=>{stopSpeaking();};},[key,gameId,lesson.id,patch]);
 useEffect(()=>{void api.listStudents().then(rows=>setLearners(rows??[]));},[]);
 // The lesson id is kept in the URL so a link can be shared mid-lesson. `withBase`
 // is required here: `history.replaceState` is the one kind of URL Next does not
 // prefix with the deployed sub-path, so a bare "/studio/…" would leave the app
 // folder and 404 on the next reload.
 const choose=useCallback((id:string)=>{stopSpeaking();setSelected(id);window.history.replaceState(null,'',withBase(`/studio/${gameId}/?lesson=${encodeURIComponent(id)}`));},[gameId]);
 const next=useCallback((delta:number)=>{choose(all[(lessonIndex+delta+all.length)%all.length].id);},[choose,all,lessonIndex]);
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPresent(false);return;}if((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]'))return;if(e.key==='n'&&!e.metaKey&&!e.ctrlKey)next(1);};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[next]);
 const complete=useCallback(()=>{if(locked.current)return;locked.current=true;setCompleted(true);setSaving(true);sfxCorrect();const thisKey=key;void finishLesson(lesson,(Date.now()-started.current)/1000).then(saved=>{if(mountedKey.current===thisKey){setSynced(saved);setSaving(false);}});},[key,lesson]);
 const restart=()=>{stopSpeaking();setRetry(r=>r+1);};
 const props:StudioProps={lesson,lang,home,bilingual,onComplete:complete,completed};const Studio=STUDIOS[gameId];const saved=queue.some(q=>q.lesson===lesson.id&&q.lang===lang);
 return <Shell presentation={present}><main className="studio-wrap"><div className="studio-nav"><Link href="/" className="icon-btn" aria-label="Back to the playroom"><ArrowLeft/></Link><h1>{game.title}</h1><span className="small-badge" style={{background:game.bg,color:game.color}}>{game.tag.toLowerCase()}</span><div className="studio-tools"><button className="icon-btn" onClick={restart} aria-label="Restart this lesson" title="Start fresh"><RotateCcw/></button><button className={`button ${present?'primary':'secondary'}`} onClick={()=>setPresent(p=>!p)}>{present?<Eye/>:<EyeOff/>}{present?'Tutor view':'Child view'}</button></div></div>
 <div className="studio-layout"><div style={{minWidth:0}}><section className="play-stage" aria-label={game.fullTitle}><div className="stage-heading"><div><div className="eyebrow" style={{fontSize:9,color:game.color,marginBottom:7}}>{game.skill}</div><h2>{studioTitles[gameId][lang]}{gameId==='sandbox'?` · ${lesson.title.replace('Trace ','')}`:''}</h2></div><span className="stage-count">{lessonIndex+1} / {all.length}</span></div><Studio key={key} {...props}/></section>
 {completed&&<div className="reward-banner" role="status"><Sparkles/><div><h3>{child.good[lang]}</h3><p>{saving?'Saving this little moment…':synced?'A little discovery, saved on this device.':'Kept in this browser. Please try saving again.'}</p></div><button className="button primary" onClick={()=>next(1)}>Next lesson<ArrowRight/></button></div>}
 <div className="studio-bottom"><span><ShieldCheck/>A safe space to try. There’s no rush.</span><span>Next lesson <kbd className="play-shortcut">N</kbd>{present&&<> · Exit child view <kbd className="play-shortcut">Esc</kbd></>}</span></div></div>
 <aside className="studio-guide" aria-label="Tutor guide"><section className="guide-box"><div className="guide-eyebrow"><BookOpen/>TODAY’S LITTLE LESSON</div><h3>{lesson.title}</h3><p style={{marginBottom:13}}>{lesson.subtitle}</p><label className="form-label" htmlFor="studio-lesson">Choose a lesson</label><select id="studio-lesson" className="form-input" value={lesson.id} onChange={e=>choose(e.target.value)}>{all.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select><div style={{display:'flex',gap:7,marginTop:10}}><button className="button secondary" style={{flex:1,padding:8,fontSize:10,minHeight:31}} onClick={()=>next(-1)}><ChevronLeft size={12}/>Previous</button><button className="button secondary" style={{flex:1,padding:8,fontSize:10,minHeight:31}} onClick={()=>next(1)}>Next<ChevronRight size={12}/></button><button className={`icon-btn ${saved?'on':''}`} onClick={()=>enqueue({game:gameId,lesson:lesson.id,lang})} aria-label={saved?'Remove from lesson shelf':'Save to lesson shelf'} title="Save to lesson shelf"><Heart fill={saved?'currentColor':'none'} size={13}/></button></div></section>
 <section className="guide-box"><div className="guide-eyebrow"><MessageCircle/>LET’S TALK</div><h3>Make room for a little voice.</h3>{game.questions.map(q=><button className="guide-ccq" key={q} onClick={()=>void say(child[q][lang],lang)}><Volume2/><span>{child[q][lang]}{lang!=='en'&&<small style={{display:'block',fontSize:9,marginTop:3,color:'#9aa589'}}>{child[q].en}</small>}</span></button>)}</section>
 {lesson.steps&&lesson.steps.length>0&&<section className="guide-box guide-plan"><div className="guide-eyebrow"><BookOpen/>YOUR PLAN{lesson.minutes?` · ${lesson.minutes} MIN`:''}</div><h3>{lesson.title}</h3><ol className="plan-steps">{lesson.steps.map((step,i)=><li key={`${step.title}-${i}`}><b>{step.title}{step.minutes?` · ${step.minutes} min`:''}</b><p className="plan-say">{step.say}<button type="button" className="plan-say-btn" aria-label={`Read step ${i+1} aloud`} onClick={()=>void say(step.say,lang)}><Volume2 size={14}/></button></p>{step.ask?.map(q=><p className="plan-ask" key={q}>{q}</p>)}{step.tutor&&<p className="plan-tip">💡 {step.tutor}</p>}</li>)}</ol></section>}
 <section className="guide-box"><div className="guide-eyebrow"><Lightbulb/>YOUR TUTOR NOTES</div><ol>{game.tutor.map(note=><li key={note}>{note}</li>)}</ol></section>
 <section className="guide-box guide-tip"><div className="guide-eyebrow"><Heart/>EVERY TRY COUNTS</div><label className="form-label" htmlFor="studio-learner">Who is exploring?</label><select id="studio-learner" className="form-input" value={learner?.id??''} onChange={e=>patch({learner:learners.find(l=>l.id===e.target.value)??null})}><option value="">Guest explorer</option>{learners.map(l=><option key={l.id} value={l.id}>{l.name} · age {l.age}</option>)}</select><p>Adapt the task, celebrate the attempt. You decide when a speaking moment is complete.</p><button className="button secondary" style={{width:'100%',marginTop:13,fontSize:11}} onClick={complete} disabled={completed}><CheckCircle2/>{completed?'Lesson explored':'Mark lesson explored'}</button>{completed&&<span className="save-chip" style={{marginTop:9}}>{synced?<Cloud/>:<CloudOff/>}{saving?'Saving…':synced?'Saved in your workspace':'Kept safely on this device'}</span>}</section></aside></div></main></Shell>;
}
