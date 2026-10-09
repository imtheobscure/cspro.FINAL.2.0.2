import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SplashGate } from "@/components/GameShell";
import { GAME } from "@/lib/branding";
import { POWERUPS } from "@/lib/engine";

/**
 * The home screen sits BEHIND the shared Tutorly splash (`SplashGate`), so the
 * arena's first page is the branded one — the same first page every other Tutorly
 * game shows — and this is what a tutor reaches after pressing Play.
 */
export default function Home() {
  return (
    <SplashGate>
    <div className="min-h-dvh">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="anim-fade">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-sm font-bold text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live multiplayer · WebRTC · 100% free
            </div>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] sm:text-7xl">
              Answer. <span className="cash-text">Earn cash.</span>
              <br />Upgrade. <span className="gold-text">Dominate.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-xl text-white/80">{GAME.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/host" className="btn btn-gold text-2xl">🎤 Host a game</Link>
              <Link href="/play" className="btn btn-primary text-2xl">📱 Join with code</Link>
              <Link href="/play?solo=1" className="btn btn-ghost text-2xl">🎯 Solo practice</Link>
            </div>
          </div>
          <div className="relative anim-card">
            <div className="glass rounded-[2rem] p-6">
              <div className="text-xs uppercase tracking-widest text-white/50">Live wallet</div>
              <div className="cash-text text-6xl">$12,750</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[["💰", "Multiplier", "Lv 3"], ["🔥", "Streak", "×7"], ["🛡️", "Insurance", "80%"]].map(([i, l, v]) => (
                  <div key={l} className="rounded-2xl bg-white/5 p-3">
                    <div className="text-3xl">{i}</div>
                    <div className="text-xs text-white/60">{l}</div>
                    <div className="font-black">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 overflow-hidden">
                {POWERUPS.slice(0, 5).map((p) => (
                  <div key={p.key} className={`flex-1 rounded-xl bg-gradient-to-br ${p.color} p-2 text-center text-2xl`}>{p.icon}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["💵", "Cash Economy", "Correct = +$10 base. Buy multipliers up to $25,000 per answer, streak bonuses and insurance in the live shop."],
            ["🃏", "15 Power-Ups", "Double Jeopardy, Mega Shield, Golden Question, Heist, Jackpot… drops every 3 correct answers."],
            ["🎧", "7 Question Types", "MCQ, multi-select, true/false, reading passages, listening with natural multi-voice TTS, dialogue completion, gap-fill."],
            ["🧠", "Review Suite", "Teaching slides for every question, wrong-answer flashcards and a one-click offline HTML export."],
          ].map(([i, t, d]) => (
            <div key={t} className="glass rounded-3xl p-6 anim-fade">
              <div className="text-5xl">{i}</div>
              <div className="mt-3 text-2xl font-black">{t}</div>
              <div className="mt-2 text-white/70">{d}</div>
            </div>
          ))}
        </section>

        <section className="mt-16 glass rounded-3xl p-8 grid gap-6 md:grid-cols-3 text-center">
          {[["1", "Tutor hosts", "Pick a quiz, share the QR code, link or 6-letter code on the big screen."], ["2", "Learners join", "Phones, tablets, laptops — no install, no account. Pick an avatar and go."], ["3", "Battle & review", "Earn cash, buy upgrades, sabotage rivals. Then learn from every mistake."]].map(([n, t, d]) => (
            <div key={n}>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-600 text-3xl font-black text-black">{n}</div>
              <div className="mt-3 text-2xl font-black">{t}</div>
              <div className="text-white/70">{d}</div>
            </div>
          ))}
        </section>
      </main>
    </div>
    </SplashGate>
  );
}
