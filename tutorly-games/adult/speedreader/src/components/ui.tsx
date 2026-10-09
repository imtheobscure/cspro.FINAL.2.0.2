import React, { useEffect, useState } from "react";
import { useStore, type Player } from "../core/store";
import { rankedVoices, speak, stopSpeaking, guessGender } from "../core/speech";
import { sfx } from "../core/audio";

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

export function Btn({ children, onClick, variant = "primary", className = "", disabled, size = "md", title }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "success" | "gold" | "dark"; className?: string; disabled?: boolean; size?: "sm" | "md" | "lg" | "xl"; title?: string }) {
  const v = { primary: "bg-gradient-to-b from-indigo-500 to-indigo-700 text-white shadow-[0_6px_0_#312e81] hover:brightness-110 active:translate-y-1 active:shadow-none", ghost: "bg-white/10 text-white border border-white/20 hover:bg-white/20", danger: "bg-gradient-to-b from-rose-500 to-rose-700 text-white shadow-[0_6px_0_#881337] active:translate-y-1 active:shadow-none", success: "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_0_#065f46] active:translate-y-1 active:shadow-none", gold: "bg-gradient-to-b from-amber-300 to-orange-500 text-slate-900 shadow-[0_6px_0_#7c2d12] active:translate-y-1 active:shadow-none", dark: "bg-slate-800 text-white border border-slate-600 hover:bg-slate-700" }[variant];
  const s = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-7 py-3.5 text-lg", xl: "px-10 py-5 text-2xl" }[size];
  return <button title={title} disabled={disabled} onClick={() => { sfx.click(); onClick?.(); }} className={cx("rounded-xl font-bold uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed", v, s, className)}>{children}</button>;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl bg-slate-900/70 backdrop-blur border border-white/10 p-5 shadow-xl", className)}>{children}</div>;
}

export function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} className={cx("max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 bg-slate-900 p-6 shadow-2xl", wide ? "w-full max-w-6xl" : "w-full max-w-3xl")}>{children}</div>
  </div>;
}

const STYLES = ["adventurer", "avataaars", "big-smile", "bottts", "fun-emoji", "lorelei", "notionists", "pixel-art", "thumbs", "micah"];
const SEEDS = ["Felix", "Aneka", "Zoe", "Max", "Luna", "Kai", "Nova", "Leo", "Ivy", "Rex", "Mia", "Ozzy"];
export const avatarUrl = (style: string, seed: string) => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,ffd5dc,ffdfbf`;

export function AvatarPicker({ player, onChange }: { player: Player; onChange: (p: Player) => void }) {
  const [style, setStyle] = useState("adventurer");
  return <div className="space-y-3">
    <div className="flex items-center gap-3">
      <img src={player.avatar} className="h-16 w-16 rounded-full border-2 border-indigo-400 bg-white" />
      <input value={player.name} onChange={(e) => onChange({ ...player, name: e.target.value })} className="flex-1 rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white" placeholder="Name" />
    </div>
    <div className="flex flex-wrap gap-1">{STYLES.map((s) => <button key={s} onClick={() => setStyle(s)} className={cx("px-2 py-1 rounded text-[11px] border", style === s ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-800 border-white/10 text-slate-300")}>{s}</button>)}</div>
    <div className="grid grid-cols-6 gap-2">{SEEDS.map((seed) => { const u = avatarUrl(style, seed + player.id); return <button key={seed} onClick={() => { sfx.pop(); onChange({ ...player, avatar: u }); }} className={cx("rounded-full overflow-hidden border-2 bg-white", player.avatar === u ? "border-amber-400 scale-110" : "border-transparent hover:border-indigo-400")}><img src={u} className="h-12 w-12" loading="lazy" /></button>; })}</div>
  </div>;
}

export function VoiceStudio() {
  const { s, set } = useStore();
  const [voices, setVoices] = useState(rankedVoices());
  useEffect(() => { const t = setInterval(() => { const v = rankedVoices(); if (v.length !== voices.length) setVoices(v); }, 500); return () => clearInterval(t); }, [voices.length]);
  useEffect(() => { if (!s.narratorVoice && voices.length) set({ narratorVoice: voices[0].name }); }, [voices.length]);
  return <div className="space-y-3">
    <div className="text-sm text-slate-300">Narrator voice <span className="text-xs text-slate-500">({voices.length} English voices — Microsoft Natural / Edge ranked first)</span></div>
    <div className="flex gap-2">
      <select value={s.narratorVoice} onChange={(e) => set({ narratorVoice: e.target.value })} className="flex-1 rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white text-sm">
        {voices.map((v) => <option key={v.name} value={v.name}>{guessGender(v) === "f" ? "♀" : guessGender(v) === "m" ? "♂" : "•"} {v.name} ({v.lang})</option>)}
      </select>
      <Btn size="sm" variant="ghost" onClick={() => speak("This is your read-aloud model voice. Listen, then shadow it.", { voice: s.narratorVoice, rate: s.rate })}>▶ Audition</Btn>
      <Btn size="sm" variant="ghost" onClick={stopSpeaking}>■</Btn>
    </div>
    <label className="flex items-center gap-3 text-sm text-slate-300">Speed <input type="range" min={0.6} max={1.4} step={0.05} value={s.rate} onChange={(e) => set({ rate: +e.target.value })} className="flex-1 accent-indigo-500" /> {s.rate.toFixed(2)}×</label>
  </div>;
}

export function Scoreboard({ compact }: { compact?: boolean }) {
  const { s, set } = useStore();
  return <div className={cx("flex gap-2 flex-wrap", compact ? "" : "justify-center")}>
    {s.players.map((p) => <button key={p.id} onClick={() => set({ activePlayer: p.id })} className={cx("flex items-center gap-2 rounded-full pl-1 pr-4 py-1 border transition", s.activePlayer === p.id ? "bg-amber-400/20 border-amber-400 ring-2 ring-amber-400/50" : "bg-white/5 border-white/10 hover:bg-white/10")}>
      <img src={p.avatar} className="h-8 w-8 rounded-full bg-white" /><span className="text-sm font-semibold text-white">{p.name}</span><span className="text-xs font-mono text-amber-300">{p.score}</span>
    </button>)}
  </div>;
}

export function Countdown({ onDone, label }: { onDone: () => void; label?: string }) {
  const [n, setN] = useState(3);
  useEffect(() => { if (n === 0) { sfx.countdown(true); const t = setTimeout(onDone, 400); return () => clearTimeout(t); } sfx.countdown(); const t = setTimeout(() => setN(n - 1), 800); return () => clearTimeout(t); }, [n]);
  return <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70"><div className="text-amber-300 tracking-[0.4em] text-sm uppercase mb-2">{label || "Get ready"}</div><div key={n} className="text-[12rem] font-black text-white drop-shadow-[0_0_40px_rgba(250,204,21,0.8)] animate-ping-once leading-none">{n === 0 ? "GO!" : n}</div></div>;
}
