import { useEffect, useState } from "react";
import { StoreProvider, useStore, type CEFR } from "./core/store";
import { playMusic, setAudioEnabled, sfx, unlockAudio } from "./core/audio";
import { AvatarPicker, Btn, Card, cx, Modal, Scoreboard, VoiceStudio, avatarUrl } from "./components/ui";
import SpeedReader from "./games/SpeedReader";
import { MODES } from "./games/modes";
import { LV, dailyText } from "./data/content";
import { load } from "./core/store";

type Rec = Record<string, { wpm: number; score: number; holder: string; acc?: number }>;

function Hub({ go }: { go: (modeId: string) => void }) {
  const { s, set } = useStore();
  const [setup, setSetup] = useState(false);
  const [hovered, setHovered] = useState(MODES[0].id);
  const hover = MODES.find((m) => m.id === hovered) || MODES[0];
  // Storage is namespaced `speedreader.` — SpeedReader is its own game (its own
  // folder, its own URL), so it must not write into another game's keys. It used
  // to store under `talkarena.*`, which collided in spirit with TalkArena's `ta.*`.
  const records: Rec = load("speedreader.records", {});
  const daily = dailyText(s.audience);
  useEffect(() => { playMusic("hub"); }, []);

  return <div className="relative min-h-screen overflow-hidden">
    <img src={hover.img} className="absolute inset-0 w-full h-full object-cover scale-105 transition-all duration-700" alt="" />
    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/90" />
    <div className="absolute inset-0 pointer-events-none opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

    <div className="relative z-10 max-w-7xl mx-auto px-5 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.45em] text-amber-300">Tutor-controlled classroom · PTE Read Aloud</div>
          <h1 className="text-6xl md:text-7xl text-white leading-none" style={{ fontFamily: "Bebas Neue, sans-serif" }}>SPEED<span className="text-amber-400">READER</span></h1>
          <p className="text-slate-300 max-w-xl">Karaoke shadowing with live pronunciation scoring. One projector. A room full of voices. Ten rounds. Do not stop talking.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <span className="text-[11px] text-slate-400">CEFR</span>
          {LV.map((l: CEFR) => <button key={l} onClick={() => { sfx.click(); set({ level: l }); }} className={cx("px-2.5 py-1 rounded-lg text-xs font-bold", s.level === l ? "bg-amber-400 text-black" : "bg-black/50 text-slate-300 border border-white/10")}>{l}</button>)}
          {(["adult", "kids"] as const).map((a) => <button key={a} onClick={() => set({ audience: a })} className={cx("px-3 py-1 rounded-lg text-xs font-bold", s.audience === a ? "bg-white text-black" : "bg-black/50 text-slate-300 border border-white/10")}>{a === "adult" ? "Adults" : "Kids"}</button>)}
          <Btn size="sm" variant="ghost" onClick={() => setSetup(true)}>Players</Btn>
          <Btn size="sm" variant={s.bgm ? "gold" : "dark"} onClick={() => { set({ bgm: !s.bgm }); setAudioEnabled(!s.bgm, s.sfx); }}>{s.bgm ? "Music" : "Muted"}</Btn>
          <Btn size="sm" variant={s.sfx ? "gold" : "dark"} onClick={() => { set({ sfx: !s.sfx }); setAudioEnabled(s.bgm, !s.sfx); }}>SFX</Btn>
        </div>
      </header>

      <Scoreboard />

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
        {MODES.map((m) => <button key={m.id} onMouseEnter={() => setHovered(m.id)} onFocus={() => setHovered(m.id)} onClick={() => go(m.id)}
          className="group relative h-56 overflow-hidden rounded-3xl border border-white/10 text-left shadow-2xl hover:border-amber-300 hover:scale-[1.02] transition">
          <img src={m.img} alt={m.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
          <div className="relative h-full flex flex-col justify-end p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-amber-300">{m.tag}</div>
            <div className="text-3xl text-white leading-none" style={{ fontFamily: "Bebas Neue, sans-serif" }}>{m.name}</div>
            <p className="text-xs text-white/80 mt-1 line-clamp-2">{m.desc}</p>
            <div className="mt-2 text-[10px] font-bold text-amber-200 opacity-0 group-hover:opacity-100 transition">ENTER →</div>
          </div>
        </button>)}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-black text-white mb-1">Daily challenge</h3>
          <p className="text-sm text-slate-300">{daily.title} · {daily.level} · {daily.focus.join(" · ")}</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-3">{daily.text}</p>
        </Card>
        <Card>
          <h3 className="font-black text-white mb-1">Hall of records</h3>
          <div className="max-h-28 overflow-auto text-xs space-y-1">{Object.keys(records).length === 0 ? <span className="text-slate-500">No records yet. Break one.</span> : Object.entries(records).sort((a, b) => b[1].score - a[1].score).slice(0, 6).map(([id, r]) => <div key={id} className="flex justify-between text-slate-300"><span>{r.holder}</span><span className="text-amber-300 font-mono">{r.score} · {r.wpm} wpm</span></div>)}</div>
        </Card>
        <Card>
          <h3 className="font-black text-white mb-2">Voices</h3>
          <VoiceStudio />
          <label className="flex items-center gap-2 mt-3 text-xs text-slate-300">Mic strictness <input type="range" min={0.55} max={0.95} step={0.05} value={s.strictness} onChange={(e) => set({ strictness: +e.target.value })} className="flex-1 accent-amber-400" /> {Math.round(s.strictness * 100)}%</label>
        </Card>
      </div>
      <footer className="text-center text-[11px] text-slate-500 pb-6">Speech recognition & Microsoft Natural voices in-browser (Edge/Chrome). Avatars by DiceBear. Word IPA & audio from dictionaryapi.dev. Rhymes from Datamuse. Music synthesised live.</footer>
    </div>

    {setup && <Modal onClose={() => setSetup(false)}>
      <h2 className="text-2xl font-black text-white mb-4">Players & avatars</h2>
      <div className="grid md:grid-cols-2 gap-6">{s.players.map((p) => <div key={p.id} className="rounded-xl bg-slate-800/60 p-4 border border-white/10"><AvatarPicker player={p} onChange={(np) => set({ players: s.players.map((x) => x.id === p.id ? np : x) })} /><div className="flex justify-between mt-2"><Btn size="sm" variant="ghost" onClick={() => set({ players: s.players.map((x) => x.id === p.id ? { ...x, score: 0 } : x) })}>Reset score</Btn>{s.players.length > 1 && <Btn size="sm" variant="danger" onClick={() => set({ players: s.players.filter((x) => x.id !== p.id), activePlayer: s.players.find((x) => x.id !== p.id)!.id })}>Remove</Btn>}</div></div>)}</div>
      <div className="flex gap-2 mt-4 justify-between"><Btn variant="success" disabled={s.players.length >= 6} onClick={() => { const id = "p" + Date.now(); set({ players: [...s.players, { id, name: `Player ${s.players.length + 1}`, avatar: avatarUrl("adventurer", id), score: 0 }] }); }}>+ Add player</Btn><Btn onClick={() => setSetup(false)}>Done</Btn></div>
    </Modal>}
  </div>;
}

function Shell() {
  const [view, setView] = useState<"hub" | string>("hub");
  const [unlocked, setUnlocked] = useState(false);
  const { s } = useStore();
  useEffect(() => { setAudioEnabled(s.bgm, s.sfx); }, [s.bgm, s.sfx]);
  if (!unlocked) return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <img src={MODES[0].img} className="absolute inset-0 w-full h-full object-cover" alt="" />
      <div className="absolute inset-0 bg-black/70" />
      <button onClick={() => { unlockAudio(); setAudioEnabled(s.bgm, s.sfx); setUnlocked(true); sfx.fanfare(); }} className="relative text-center group">
        <div className="text-[11px] tracking-[0.5em] uppercase text-amber-300 mb-3">Classroom speaking arena</div>
        <div className="text-7xl md:text-8xl text-white leading-none" style={{ fontFamily: "Bebas Neue, sans-serif" }}>SPEED<span className="text-amber-400">READER</span></div>
        <div className="mt-6 inline-block rounded-full bg-amber-400 px-10 py-3 font-black text-black uppercase tracking-widest shadow-[0_0_40px_rgba(251,191,36,0.65)] animate-pulse">Tap to enter</div>
        <div className="text-slate-400 text-xs mt-3">Enables music, effects and the microphone</div>
      </button>
    </div>
  );
  return <div className="min-h-screen bg-black text-white">
    {view === "hub" ? <Hub go={(id) => { sfx.whoosh(); setView(id); }} /> : <SpeedReader initialMode={view} onExit={() => { sfx.whoosh(); setView("hub"); }} />}
  </div>;
}

export default function App() { return <StoreProvider><Shell /></StoreProvider>; }
