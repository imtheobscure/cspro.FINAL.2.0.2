"use client";

import React from "react";
import Link from "next/link";
import { leagueForXp } from "@/content/units";
import { languageName, resolveL1 } from "@/content/languages";
import { PageShell, SectionTitle, Mascot, ContentStatus, PackSummary, L1Input, APP_NAME } from "@/components/ui";
import { VoiceSettings } from "@/components/VoiceSettings";
import { PwaSettingsCard } from "@/components/PwaBoot";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";

const ACHIEVEMENTS = [
  { key: "first-lesson", icon: "🌱", title: "First step", desc: "Finish your first lesson" },
  { key: "scholar-10", icon: "📚", title: "Scholar", desc: "Finish 10 lessons" },
  { key: "scholar-50", icon: "🎓", title: "Master student", desc: "Finish 50 lessons" },
  { key: "streak-7", icon: "🔥", title: "7-day streak", desc: "Seven days in a row" },
  { key: "streak-30", icon: "⚡", title: "Streak master", desc: "Thirty days in a row" },
  { key: "xp-1000", icon: "💪", title: "Thousand club", desc: "Earn 1000 XP" },
  { key: "words-100", icon: "👑", title: "Word king", desc: "Learn 100 words" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ProfilePage() {
  const { pack, reload, loading, source, setSource, localPack, removePack } = useContent();
  const { state, update, resetAll } = useStore();
  const league = leagueForXp(state.xp);
  const effectiveL1 = resolveL1(state.l1, pack.meta.l1);

  const week = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const found = state.xpHistory.find((h) => h.date === key);
    return { day: DAYS[d.getDay()], xp: found?.xp || 0, today: i === 6 };
  });
  const maxXp = Math.max(10, ...week.map((w) => w.xp));

  return (
    <PageShell>
      <ContentStatus />
      <SectionTitle icon="👤" title="My profile" sub="Progress, achievements and settings" />

      <div className="card-light rounded-3xl border-2 border-slate-200 bg-white p-5 text-center">
        <Mascot size={100} mood="excited" />
        <h2 className="mt-1 text-xl font-black text-slate-800">Dedicated learner 🦉</h2>
        <p className="text-sm text-slate-400">
          {league.name} League · learning {pack.meta.targetLanguage || "English"} · native language: {languageName(effectiveL1)}
        </p>
        <div className="mx-auto mt-3 grid max-w-md grid-cols-4 gap-2">
          <div className="rounded-2xl bg-orange-50 p-2.5">
            <p className="text-lg font-black text-orange-500">🔥{state.streak}</p>
            <p className="text-[10px] font-bold text-orange-400">Streak</p>
          </div>
          <div className="rounded-2xl bg-yellow-50 p-2.5">
            <p className="text-lg font-black text-yellow-600">⚡{state.xp}</p>
            <p className="text-[10px] font-bold text-yellow-500">XP</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-2.5">
            <p className="text-lg font-black text-blue-500">💎{state.gems}</p>
            <p className="text-[10px] font-bold text-blue-400">Gems</p>
          </div>
          <div className="rounded-2xl bg-green-50 p-2.5">
            <p className="text-lg font-black text-green-600">📚{state.completedLessons.length}</p>
            <p className="text-[10px] font-bold text-green-500">Lessons</p>
          </div>
        </div>
      </div>

      <div className="card-light mt-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-800">📊 Weekly activity (daily XP)</h3>
        <div className="mt-3 flex h-36 items-end justify-around gap-1">
          {week.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-black text-slate-400">{w.xp > 0 ? w.xp : ""}</span>
              <div
                className={`w-full max-w-[44px] rounded-t-xl transition-all ${w.today ? "bg-[#1CB0F6]" : w.xp > 0 ? "bg-[#58CC02]" : "bg-slate-100"}`}
                style={{ height: `${Math.max(8, (w.xp / maxXp) * 100)}px` }}
              />
              <span className={`text-[10px] font-bold ${w.today ? "text-blue-500" : "text-slate-400"}`}>{w.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-light mt-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-800">
          🏅 Achievements ({state.achievements.length} of {ACHIEVEMENTS.length})
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = state.achievements.includes(a.key);
            return (
              <div key={a.key} className={`rounded-2xl border-2 p-3 text-center ${unlocked ? "border-yellow-200 bg-yellow-50" : "border-slate-100 bg-slate-50 opacity-50"}`}>
                <p className="text-3xl">{unlocked ? a.icon : "🔒"}</p>
                <p className="mt-1 text-xs font-black text-slate-700">{a.title}</p>
                <p className="text-[10px] text-slate-400">{a.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-light mt-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-800">📦 Course content</h3>
        <p className="mt-1 text-xs text-slate-400">
          Source document: <b>{pack.meta.sourceDocument || "not specified"}</b>
          {pack.meta.level ? ` · level ${pack.meta.level}` : ""}
          {pack.meta.version ? ` · pack v${pack.meta.version}` : ""}
        </p>
        <div className="mt-3">
          <PackSummary />
        </div>
        {pack.meta.coverage && (
          <details className="mt-3 rounded-2xl bg-slate-50 p-3">
            <summary className="cursor-pointer text-xs font-black text-slate-600">Coverage report from the AI agent</summary>
            <pre className="mt-2 max-h-40 overflow-auto text-[10px] text-slate-500">{JSON.stringify(pack.meta.coverage, null, 2)}</pre>
          </details>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={reload} className="btn-3d rounded-xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2 text-xs font-black text-white">
            {loading ? "Reloading…" : "Reload content file"}
          </button>
          <Link href="/prompt" className="btn-3d rounded-xl border-[#46A302] bg-[#58CC02] px-4 py-2 text-xs font-black text-white">
            Build a new content pack 🤖
          </Link>
          <Link href="/check" className="btn-3d rounded-xl border-[#1899D6] bg-[#1CB0F6] px-4 py-2 text-xs font-black text-white">
            Check a pack before publishing 🔍
          </Link>
        </div>
      </div>

      <div className="card-light mt-3 rounded-3xl border-2 border-purple-200 bg-purple-50/40 p-4">
        <h3 className="font-black text-slate-800">🧪 Demo data (for testing)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Lingo ships with a small sample pack (2 demo units: words, grammar, idioms, conversations and all eight
          activity types) so every screen can be tried out before your own JSON file exists. A pack you dropped on Home or
          pasted on the AI Prompt page is kept in this browser and can be switched back to from here.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => setSource("default")}
            className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black ${source === "default" ? "border-[#58CC02] bg-white text-[#4b9417]" : "border-slate-200 bg-white text-slate-400"}`}
          >
            📄 Your content pack
            <span className="block text-[11px] font-bold text-slate-400">content/tutolingo-content.json</span>
          </button>
          <button
            onClick={() => setSource("mock")}
            className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black ${source === "mock" ? "border-purple-400 bg-white text-purple-600" : "border-slate-200 bg-white text-slate-400"}`}
          >
            🧪 Sample data (mock)
            <span className="block text-[11px] font-bold text-slate-400">content/tutolingo-content.mock.json</span>
          </button>
          {localPack ? (
            <button
              onClick={() => setSource("local")}
              className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-black ${source === "local" ? "border-[#58CC02] bg-white text-[#4b9417]" : "border-slate-200 bg-white text-slate-400"}`}
            >
              📥 Uploaded file
              <span className="block truncate text-[11px] font-bold text-slate-400">{localPack.name}</span>
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 px-4 py-3 text-left text-sm font-black text-slate-300">
              📥 Uploaded file
              <span className="block text-[11px] font-bold text-slate-300">none yet — drop a .json on Home</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Currently loading: <b>{source === "mock" ? "sample (mock) pack" : source === "local" ? `the uploaded file (${localPack?.name ?? "—"})` : "your content pack"}</b> — {loading ? "loading…" : "ready"}. You can also open the app with <code className="rounded bg-white px-1 font-mono">?pack=mock</code> to jump straight into the sample data.
        </p>
        {localPack && (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-white/70 px-3 py-2">
            <p className="flex-1 text-[11px] font-bold text-slate-500">
              Uploaded {new Date(localPack.savedAt).toLocaleString("en-US")} · {(localPack.json.length / 1024).toFixed(0)} KB, stored in this
              browser only.
            </p>
            <button onClick={removePack} className="rounded-xl border-2 border-red-100 px-3 py-1.5 text-[11px] font-black text-red-400">
              🗑 Forget uploaded file
            </button>
          </div>
        )}
      </div>

      <PwaSettingsCard />

      <VoiceSettings />

      <div className="card-light mt-3 rounded-3xl border-2 border-slate-200 bg-white p-4">
        <h3 className="font-black text-slate-800">⚙️ Settings</h3>
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <label className="text-sm font-bold text-slate-600" htmlFor="profile-l1">
              🌍 Learner&apos;s first language (L1) — type it
            </label>
            <L1Input
              id="profile-l1"
              value={state.l1}
              packDefault={pack.meta.l1}
              onChange={(v) => update((s) => ({ ...s, l1: v }))}
            />
            <p className="mt-1 text-[11px] text-slate-400">This also switches the names shown in the weekly league.</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <label className="text-sm font-bold text-slate-600" htmlFor="profile-info">
              🧑‍🎓 Learner information (used to personalise examples)
            </label>
            <textarea
              id="profile-info"
              value={state.learnerInfo}
              onChange={(e) => update((s) => ({ ...s, learnerInfo: e.target.value }))}
              rows={4}
              placeholder="Age, level, goals, interests, profession, exam target…"
              className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#58CC02]"
            />
            <p className="mt-1 text-[11px] text-slate-400">This text is carried into the AI prompt builder so generated examples match the learner.</p>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
            <span className="text-sm font-bold text-slate-600">🔊 Sound effects</span>
            <button
              onClick={() => update((s) => ({ ...s, soundOn: !s.soundOn }))}
              className={`h-7 w-14 rounded-full p-1 transition ${state.soundOn ? "bg-[#58CC02]" : "bg-slate-300"}`}
              aria-label="Toggle sound"
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-all ${state.soundOn ? "translate-x-7" : ""}`} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
            <span className="text-sm font-bold text-slate-600">🌙 Dark mode</span>
            <button
              onClick={() => update((s) => ({ ...s, darkMode: !s.darkMode }))}
              className={`h-7 w-14 rounded-full p-1 transition ${state.darkMode ? "bg-[#58CC02]" : "bg-slate-300"}`}
              aria-label="Toggle dark mode"
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-all ${state.darkMode ? "translate-x-7" : ""}`} />
            </button>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
            <span className="text-sm font-bold text-slate-600">🔍 Large font</span>
            <button
              onClick={() => update((s) => ({ ...s, fontBig: !s.fontBig }))}
              className={`h-7 w-14 rounded-full p-1 transition ${state.fontBig ? "bg-[#58CC02]" : "bg-slate-300"}`}
              aria-label="Toggle large font"
            >
              <span className={`block h-5 w-5 rounded-full bg-white transition-all ${state.fontBig ? "translate-x-7" : ""}`} />
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm("Delete all progress and stats?")) resetAll();
            }}
            className="w-full rounded-2xl border-2 border-red-100 py-2.5 text-sm font-black text-red-400"
          >
            🗑 Reset all progress
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        {APP_NAME} · one content file, every activity.
      </p>
    </PageShell>
  );
}
