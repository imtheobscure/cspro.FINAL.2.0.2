'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, Clock3, Heart, Leaf, Search, ShieldCheck, Sparkles, Sun, WandSparkles, Volume2, Globe2 } from 'lucide-react';
import Shell from './Shell';
import { StudioArt } from './Illustrations';
import { GAMES, GAME_MAP, lessons, lessonsFor, type GameId } from '@/lib/playroom/catalog';
import { usePlayroom } from '@/lib/playroom/state';
import { usePacksVersion } from '@/lib/playroom/usePacks';
const FILTERS=['All adventures','Sounds & letters','Speaking & expression','Everyday language','My favourites'];
export default function Dashboard(){
 const [category,setCategory]=useState(FILTERS[0]);const [query,setQuery]=useState('');const lang=usePlayroom(s=>s.lang);const favorites=usePlayroom(s=>s.favorites);const favorite=usePlayroom(s=>s.favorite);const lastGame=usePlayroom(s=>s.lastGame);const lastLesson=usePlayroom(s=>s.lastLesson);const sessions=usePlayroom(s=>s.sessions);
 const packsVersion=usePacksVersion();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 const allLessons=useMemo(()=>lessons(lang),[lang,packsVersion]);
 const filtered=GAMES.filter(g=>(category===FILTERS[0]||category===g.category||(category==='My favourites'&&favorites.includes(g.id)))&&`${g.title} ${g.description} ${g.skill}`.toLowerCase().includes(query.toLowerCase()));
 const startGame:GameId=lastGame in GAME_MAP?lastGame:'sandbox';
 return <Shell><main className="workspace"><div className="page-heading"><div><h1>Welcome to ToyBox<span style={{color:'#c8ae78'}}> ✦</span></h1><p>Meaningful play. Real conversations. A world of little discoveries.</p></div><span className="date-pill"><Sun size={15}/> A lovely day to learn</span></div>
 <section className="hero-panel"><div className="hero-copy"><div className="eyebrow"><Sparkles size={12}/> MADE FOR CURIOUS LITTLE MINDS</div><h2>Little hands.<br/><span>Big discoveries.</span></h2><p>A little movement. A little imagination.<br/>A whole lot of language.</p><div className="hero-actions"><Link href={`/studio/${startGame}${lastLesson?`?lesson=${encodeURIComponent(lastLesson)}`:''}`} className="button primary">{sessions.length?'Continue exploring':'Let’s play together'}<ArrowRight/></Link><Link href="/lessons" className="button ghost">Explore lessons<ArrowRight/></Link></div><div className="hero-pill"><Leaf size={11}/> Calm, playful learning for ages 3–6</div></div>{
 /* The hero used to be an <img> of a picture that is not in public/ (it 404ed).
    It is now built from the app's own illustrations, so it can never break and
    needs no download: the sandbox, Momo the echo monster, the smoothie blender
    and the talking train. */
}
<div className="hero-art" role="img" aria-label="A wooden letter-tracing sandbox, a friendly teal monster, a pastel blender and a little talking train"><div className="hero-art-collage"><span><StudioArt game="sandbox"/></span><span><StudioArt game="monsters"/></span><span><StudioArt game="smoothies"/></span><span><StudioArt game="train"/></span></div></div><span className="hero-note"><Heart size={10}/> Little moments. Lasting learning.</span></section>
 <div className="benefit-strip"><span><ShieldCheck/>You lead. They explore.</span><span><HandIcon/>Hands-on, not heads-down</span><span><Globe2/>6 languages, one little world</span><span><Volume2/>Gentle sounds. Natural voices.</span></div>
 <section aria-labelledby="adventures-heading"><div className="section-head"><div><h2 id="adventures-heading">Pick a little adventure</h2><p>Nine ways to move, make, and find their voice.</p></div><span className="count"><BookOpen size={12}/>{allLessons.length} ready-to-play lessons</span></div><div className="filters">{FILTERS.map((f,i)=><button key={f} className={`filter ${category===f?'active':''}`} onClick={()=>setCategory(f)}>{i===0?<WandSparkles/>:i===4?<Heart/>:null}{f}</button>)}<div className="search-box"><Search/><input aria-label="Find an adventure" placeholder="Find an adventure…" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
 <div className="activity-grid">{filtered.map(g=><article className="activity-card" key={g.id}><div className="activity-art" style={{background:g.bg}}><Link href={`/studio/${g.id}`} aria-label={`Play ${g.title}`} style={{display:'block',height:'100%'}}><StudioArt game={g.id}/></Link><span className="card-age">AGES {g.age}</span><button className={`heart-btn ${favorites.includes(g.id)?'saved':''}`} onClick={()=>favorite(g.id)} aria-label={`${favorites.includes(g.id)?'Unsave':'Save'} ${g.title}`} aria-pressed={favorites.includes(g.id)}><Heart fill={favorites.includes(g.id)?'currentColor':'none'}/></button></div><div className="activity-body"><div className="activity-tag" style={{color:g.color}}><i/>{g.tag}</div><Link href={`/studio/${g.id}`}><h3>{g.title}</h3></Link><p>{g.description}</p><div className="activity-footer"><div className="activity-meta"><span><Clock3/>{g.minutes}–{g.minutes+2} min</span><span><BookOpen/>{lessonsFor(g.id,lang).length} lessons</span></div><Link href={`/studio/${g.id}`} className="card-go" aria-label={`Open ${g.title}`}><ArrowRight/></Link></div></div></article>)}</div>
 {!filtered.length&&<div className="empty-state"><Heart size={30}/><h3>{category==='My favourites'?'Your favourites live here':'No adventures found'}</h3><p>{category==='My favourites'?'Tap the little heart on an adventure to keep it close.':'Try a different word, or explore all nine studios.'}</p><button className="button secondary" onClick={()=>{setQuery('');setCategory(FILTERS[0]);}}>See all adventures</button></div>}
 <p className="under-grid"><Check/>No ads. No rush. Just room to grow.<span style={{margin:'0 7px',color:'#d8ddce'}}>·</span>Always tutor-led, always a little magical.</p></section></main></Shell>;
}
function HandIcon(){return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V5a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10c0 5-4 7-8 7-4 0-6-3-9-7-2-3 1-5 3-3l2 2"/></svg>;}
