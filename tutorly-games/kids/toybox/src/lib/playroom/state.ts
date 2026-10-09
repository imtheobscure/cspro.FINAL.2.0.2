'use client';
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '@/lib/data/types';
import { api, type StudentDto } from '@/lib/api';
import type { GameId, Lesson } from './catalog';
import { setSfxEnabled } from '@/lib/sfx';
import { registerStoredPacks } from './customPack';

export type Session={id:string;workspaceId:string;studentId:string|null;gameId:GameId;lessonId:string;language:Lang;seconds:number;createdAt:string;synced:boolean};
type QueueItem={game:GameId;lesson:string;lang:Lang};
/** How large the type is drawn — the tutor sets it in Settings. */
export type TextSize='large'|'xlarge'|'huge';
type State={
 workspaceId:string;lang:Lang;home:Lang;bilingual:boolean;muted:boolean;slow:boolean;effects:boolean;calm:boolean;localVoice:boolean;voices:Partial<Record<Lang,string>>;textSize:TextSize;
 learner:StudentDto|null;favorites:GameId[];queue:QueueItem[];sessions:Session[];lastGame:GameId;lastLesson:string;hydrated:boolean;
 patch:(s:Partial<State>)=>void;favorite:(id:GameId)=>void;enqueue:(item:QueueItem)=>void;
};
export const usePlayroom=create<State>()(persist((set,get)=>({
 workspaceId:'',lang:'en',home:'zh',bilingual:true,muted:false,slow:false,effects:true,calm:true,localVoice:false,voices:{},
 // Larger type by default: ToyBox is usually on a shared screen. See the
 // READABILITY block in globals.css for what the sizes actually change.
 textSize:'xlarge' as TextSize,
 learner:null,favorites:[],queue:[],sessions:[],lastGame:'sandbox',lastLesson:'',hydrated:false,
 patch:s=>set(s),favorite:id=>set({favorites:get().favorites.includes(id)?get().favorites.filter(x=>x!==id):[...get().favorites,id]}),
 enqueue:item=>{const q=get().queue;const exists=q.some(x=>x.lesson===item.lesson&&x.lang===item.lang);set({queue:exists?q.filter(x=>x.lesson!==item.lesson||x.lang!==item.lang):[...q,item].slice(0,20)});},
}),{name:'tutorly-playroom-v2',skipHydration:true,partialize:({hydrated,patch,favorite,enqueue,...s})=>{void hydrated;void patch;void favorite;void enqueue;return s;}}));

let syncing=false;
export async function syncProgress(){
 if(syncing)return;syncing=true;
 try{
  const st=usePlayroom.getState();if(!st.workspaceId)return;
  for(const row of st.sessions.filter(x=>!x.synced)){
   await api.saveStudioSession({...row,workspaceId:st.workspaceId});
  }
  const remote=await api.listStudioSessions(st.workspaceId);
  const map=new Map(usePlayroom.getState().sessions.map(x=>[x.id,x]));
  for(const row of remote)map.set(row.id,{...row,synced:true} as Session);
  usePlayroom.setState({sessions:[...map.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,1000)});
 }catch{/* The in-memory copy is intentionally retained. */}finally{syncing=false;}
}
export async function finishLesson(lesson:Lesson,seconds:number):Promise<boolean>{
 const s=usePlayroom.getState();
 const workspaceId=s.workspaceId||crypto.randomUUID();
 const row:Session={id:crypto.randomUUID(),workspaceId,studentId:s.learner?.id??null,gameId:lesson.game,lessonId:lesson.id,language:s.lang,seconds:Math.max(0,Math.round(seconds)),createdAt:new Date().toISOString(),synced:false};
 s.patch({workspaceId,sessions:[row,...s.sessions].slice(0,1000)});
 await syncProgress();
 return usePlayroom.getState().sessions.find(x=>x.id===row.id)?.synced??false;
}
export function useInitialize(){
 const effects=usePlayroom(s=>s.effects);const muted=usePlayroom(s=>s.muted);const calm=usePlayroom(s=>s.calm);const textSize=usePlayroom(s=>s.textSize);
 useEffect(()=>{
  let active=true;
  // Category packs and lesson plans pasted by the tutor live in this browser.
  // This is the one correct moment to bring them back: a static export renders
  // on the server first, where there is no storage to read them from.
  registerStoredPacks();
  void Promise.resolve(usePlayroom.persist.rehydrate()).then(()=>{if(!active)return;const s=usePlayroom.getState();s.patch({workspaceId:s.workspaceId||crypto.randomUUID(),hydrated:true});void syncProgress();});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{setSfxEnabled(effects&&!muted);},[effects,muted]);
 useEffect(()=>{document.documentElement.dataset.calm=String(calm);},[calm]);
 // The whole READABILITY block in globals.css scales from this one attribute.
 useEffect(()=>{document.documentElement.dataset.textsize=textSize;},[textSize]);
}
