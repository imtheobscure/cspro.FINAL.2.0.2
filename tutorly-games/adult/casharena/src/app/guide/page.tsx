"use client";
import { useState } from "react";
import { Nav } from "@/components/Nav";
import { PowerCard } from "@/components/PowerUpCard";
import { ATTACKS, POWERUPS, SHOP_UPGRADES, MULTIPLIER_LEVELS, STREAK_BONUS, INSURANCE_RATE, fmtCash, type PowerDef } from "@/lib/engine";
import { speak, stopSpeech, sfx } from "@/lib/audio";

const BASICS = [
  { icon: "💵", title: "Earn cash", text: "Every correct answer pays cash — $10 at the start. Wrong answers cost you a small penalty, unless you're protected." },
  { icon: "🛒", title: "Spend to earn more", text: "Open the Shop any time. Money Multiplier is your best friend: level 5 pays $25,000 per answer. Streak Bonus rewards consistency. Insurance removes penalties." },
  { icon: "🃏", title: "Power-up drops", text: "Every 3 correct answers a random power-up card drops into your dock at the bottom. Tap a card to use it. Rarer cards are stronger." },
  { icon: "⚔️", title: "Sabotage rivals", text: "In live games you can buy attacks: Blackout, Scramble, Brain Fog, Slow-Mo and Cash Drain. Reflector bounces attacks back." },
  { icon: "🏁", title: "Win", text: "The clock runs for the whole round and questions loop. When time is up, the richest wallet takes the crown." },
];

export default function GuidePage() {
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [detail, setDetail] = useState<PowerDef | null>(null);

  const read = (key: string, text: string) => {
    if (speaking === key) { stopSpeech(); setSpeaking(null); return; }
    stopSpeech(); setSpeaking(key);
    speak(text, "female", { onend: () => setSpeaking(null) });
  };

  const readAll = () => {
    const t = "Welcome to Tutorly Quizziz. " + BASICS.map((b) => `${b.title}. ${b.text}`).join(" ") + " Power-ups: " + POWERUPS.map((p) => `${p.name}. ${p.guide}`).join(" ");
    read("all", t);
  };

  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-4xl sm:text-5xl font-black">📖 How to play</h1>
          <button onClick={readAll} className={`btn ${speaking === "all" ? "btn-danger" : "btn-gold"}`}>{speaking === "all" ? "⏹ Stop" : "🔊 Read the whole guide"}</button>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {BASICS.map((b) => (
            <div key={b.title} className="glass rounded-3xl p-5 anim-fade">
              <div className="flex items-start justify-between"><div className="text-5xl">{b.icon}</div><button onClick={() => read(b.title, `${b.title}. ${b.text}`)} className="rounded-full bg-white/10 px-3 py-1 text-sm">{speaking === b.title ? "⏹" : "🔊"}</button></div>
              <div className="mt-2 text-2xl font-black">{b.title}</div>
              <div className="mt-1 text-white/75">{b.text}</div>
            </div>
          ))}
        </section>

        <h2 className="mt-12 text-3xl font-black">🛒 The Shop</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SHOP_UPGRADES.map((d) => (
            <div key={d.key} className="glass rounded-3xl p-5">
              <div className="text-4xl">{d.icon}</div>
              <div className="text-2xl font-black">{d.name}</div>
              <div className="text-white/70">{d.desc}</div>
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {Array.from({ length: d.max + 1 }).map((_, l) => (
                    <tr key={l} className="border-t border-white/10"><td className="py-1 text-white/60">Lv {l}</td><td className="py-1 font-bold">{d.levelLabel(l)}</td><td className="py-1 text-right text-amber-300">{l === 0 ? "free" : fmtCash(d.costs[l])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="glass mt-4 rounded-2xl p-4 text-white/80">
          <b>Pro strategy:</b> Multiplier level 1 ({fmtCash(MULTIPLIER_LEVELS[1])}/✓) costs only $100 — buy it after 10 correct answers. Then alternate Multiplier and Streak Bonus (+{fmtCash(STREAK_BONUS[3])} × streak at Lv 3). Grab Insurance ({Math.round(INSURANCE_RATE[3] * 100)}% at Lv 3) once penalties start to hurt.
        </div>

        <h2 className="mt-12 text-3xl font-black">🃏 Power-up cards <span className="text-lg text-white/50 font-bold">({POWERUPS.length}) — tap a card for details</span></h2>
        <div className="mt-4 flex flex-wrap gap-4">
          {POWERUPS.map((p) => (
            <PowerCard key={p.key} def={p} onClick={() => { sfx.reveal(); setDetail(p); read(p.key, `${p.name}. ${p.guide}`); }} />
          ))}
        </div>

        <h2 className="mt-12 text-3xl font-black">⚔️ Attacks (live games)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ATTACKS.map((a) => (
            <div key={a.type} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between"><div className="text-4xl">{a.icon}</div><button onClick={() => read(a.type, `${a.name}. ${a.desc}`)} className="rounded-full bg-white/10 px-3 py-1 text-sm">🔊</button></div>
              <div className="text-xl font-black">{a.name}</div>
              <div className="text-sm text-white/70">{a.desc}</div>
              <div className="mt-2 text-amber-300 font-bold">{fmtCash(a.cost)} · target: {a.target}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-3xl font-black">🎧 Question types</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["🅰️", "Multiple choice", "One correct answer. Options are shuffled and equal-sized so length never gives it away."], ["☑️", "Select all", "Two or three correct answers. Tap to select, then lock in."], ["✅", "True / False", "Judge the statement."], ["📖", "Reading", "Read the passage (or have it read to you), then answer."], ["🎧", "Listening", "Audio plays automatically with natural multi-character voices. Replay any time."], ["💬", "Dialogue", "Pick the line that completes the conversation naturally."], ["✍️", "Fill the gap", "Choose the word that fits the blank."]].map(([i, t, d]) => (
            <div key={t} className="glass rounded-2xl p-4"><div className="text-3xl">{i}</div><div className="text-xl font-black">{t}</div><div className="text-sm text-white/70">{d}</div></div>
          ))}
        </div>
      </main>

      {detail && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onClick={() => { setDetail(null); stopSpeech(); setSpeaking(null); }}>
          <div className="glass max-w-lg rounded-3xl p-6 text-center anim-card" onClick={(e) => e.stopPropagation()}>
            <div className="text-7xl">{detail.icon}</div>
            <div className="mt-2 text-3xl font-black">{detail.name}</div>
            <div className="text-xs uppercase tracking-widest text-white/60">{detail.rarity} · {detail.instant ? "instant" : "armed until triggered"}</div>
            <div className="mt-4 text-lg text-white/85">{detail.guide}</div>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => read(detail.key, `${detail.name}. ${detail.guide}`)} className="btn btn-ghost">🔊 Read aloud</button>
              <button onClick={() => { setDetail(null); stopSpeech(); setSpeaking(null); }} className="btn btn-primary">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
