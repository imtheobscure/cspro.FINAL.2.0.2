'use client';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Volume2, X, Hand, Check } from 'lucide-react';
import { usePlayroom } from '@/lib/playroom/state';
import { speak, stopSpeaking } from '@/lib/speech';
import type { Lang } from '@/lib/data/types';
import type { Lesson } from '@/lib/playroom/catalog';
import { child, type Localized } from '@/lib/playroom/language';
import { sfxDrop, sfxPick } from '@/lib/sfx';

export type StudioProps={lesson:Lesson;lang:Lang;home:Lang;bilingual:boolean;onComplete:()=>void;completed:boolean};
export function usePlayAudio(){
 const lang=usePlayroom(s=>s.lang);const muted=usePlayroom(s=>s.muted);const slow=usePlayroom(s=>s.slow);const local=usePlayroom(s=>s.localVoice);const voices=usePlayroom(s=>s.voices);
 const [busy,setBusy]=useState(false);const version=useRef(0);
 const say=useCallback(async(text:string,language:Lang=lang,phoneme?:string)=>{const v=++version.current;setBusy(true);await speak(text,{lang:language,muted,slow,local,voice:voices[language],phoneme});if(v===version.current)setBusy(false);},[lang,muted,slow,local,voices]);
 return {say,busy,stop:stopSpeaking};
}
export function Listen({text,lang,title='Read aloud'}:{text:string;lang?:Lang;title?:string}){const {say,busy}=usePlayAudio();return <button type="button" className="listen-round" title={title} aria-label={title} aria-busy={busy} onClick={()=>void say(text,lang)}><Volume2 size={20}/></button>;}
export function Prompt({copy,lang,home,bilingual}:{copy:Localized;lang:Lang;home:Lang;bilingual:boolean}){return <div><p className="child-prompt">{copy[lang]}</p>{bilingual&&lang!==home&&<p className="child-translation">{copy[home]}</p>}</div>;}
export function MoveTile({children,onPlace,onTap,className='',label,disabled=false}:{children:ReactNode;onPlace:(zone:string)=>void;onTap?:()=>void;className?:string;label:string;disabled?:boolean}){
 const [offset,setOffset]=useState({x:0,y:0});const [moving,setMoving]=useState(false);const start=useRef<{x:number;y:number;active:boolean}|null>(null);
 const down=(e:PointerEvent<HTMLButtonElement>)=>{if(disabled||e.button!==0)return;start.current={x:e.clientX,y:e.clientY,active:true};e.currentTarget.setPointerCapture(e.pointerId);sfxPick();};
 const move=(e:PointerEvent<HTMLButtonElement>)=>{if(!start.current?.active)return;const x=e.clientX-start.current.x,y=e.clientY-start.current.y;if(Math.hypot(x,y)>7){setMoving(true);setOffset({x,y});}};
 const end=(e:PointerEvent<HTMLButtonElement>)=>{const st=start.current;if(!st)return;const dist=Math.hypot(e.clientX-st.x,e.clientY-st.y);start.current=null;setMoving(false);setOffset({x:0,y:0});if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(dist<8){onTap?.();return;}const zone=document.elementsFromPoint(e.clientX,e.clientY).map(el=>el.closest<HTMLElement>('[data-drop]')).find(Boolean)?.dataset.drop;if(zone){sfxDrop();onPlace(zone);}};
 return <button type="button" disabled={disabled} aria-label={label} className={`drag-tile ${moving?'is-dragging':''} ${className}`} style={moving?{transform:`translate(${offset.x}px,${offset.y}px)`,zIndex:90}:undefined} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={()=>{start.current=null;setMoving(false);setOffset({x:0,y:0});}} onClick={e=>{if(e.detail===0)onTap?.();}}>{children}</button>;
}
export function DragHint(){return <p className="pointer-note"><Hand size={12}/> Drag to explore. Tap works too.</p>;}
export function FinishButton({onClick,disabled=false,lang,children}:{onClick:()=>void;disabled?:boolean;lang:Lang;children?:ReactNode}){return <button type="button" className="button primary large" disabled={disabled} onClick={onClick}><Check size={19}/>{children??child.good[lang]}</button>;}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const titleId=useId();const ref=useRef<HTMLDivElement>(null);const closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const old=document.activeElement as HTMLElement;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const nodes=()=>ref.current?.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex="0"]');nodes()?.[0]?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')closeRef.current();if(e.key==='Tab'){const els=nodes();if(!els?.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key);old?.focus();};},[]);
 return <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} className="modal scroll-thin" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="modal-head"><h2 id={titleId}>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog"><X size={18}/></button></div>{children}</div></div>;
}
export function Toggle({value,onChange,label}:{value:boolean;onChange:()=>void;label:string}){return <button type="button" className="toggle" role="switch" aria-checked={value} aria-label={label} onClick={onChange}><i/></button>;}
export function useCamera(){
 const videoRef=useRef<HTMLVideoElement>(null);const stream=useRef<MediaStream|null>(null);const mounted=useRef(true);const [active,setActive]=useState(false);const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 const stop=useCallback(()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;if(videoRef.current)videoRef.current.srcObject=null;setActive(false);},[]);
 const start=useCallback(async()=>{setError('');if(!navigator.mediaDevices?.getUserMedia){setError('Camera access is not available here. Use the practice scene, or open this app in a secure browser tab.');return;}setLoading(true);try{const media=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'},audio:false});if(!mounted.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;setActive(true);if(videoRef.current){videoRef.current.srcObject=media;await videoRef.current.play();}}catch(e){if(!mounted.current)return;setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Camera permission was blocked. Allow it in your browser, or use the practice scene.':'No camera could be opened. Check the device connection or use the practice scene.');}finally{if(mounted.current)setLoading(false);}},[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 useEffect(()=>{if(active&&videoRef.current&&stream.current){videoRef.current.srcObject=stream.current;void videoRef.current.play().catch(()=>{});}},[active]);
 return {videoRef,active,loading,error,start,stop};
}
