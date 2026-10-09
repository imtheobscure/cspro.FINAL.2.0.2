"use client";

import React, { useEffect, useMemo, useState } from "react";
import { LEAGUES, leagueForXp } from "@/content/units";
import { languageName, leagueOpponents, poolSize, hasNamePool, resolveL1 } from "@/content/languages";
import { PageShell, SectionTitle, ContentStatus, L1Input } from "@/components/ui";
import { useContent } from "@/lib/content-provider";
import { useStore } from "@/lib/store";

interface Entry {
  name: string;
  xp: number;
  avatar: string;
  isYou?: boolean;
}

const PROMOTE = 8;
const STAY = 14;

export default function LeaderboardPage() {
  const { pack } = useContent();
  const { state, update } = useStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 8000);
    return () => clearInterval(t);
  }, []);

  /** "auto" (or empty) follows the native language declared by the loaded content pack. */
  const l1 = resolveL1(state.l1, pack.meta.l1);

  const entries: Entry[] = useMemo(() => {
    const weekSeed = Math.floor(Date.now() / (7 * 86400000));
    const opponents = leagueOpponents(l1, weekSeed);
    const rand = (n: number) => {
      const x = Math.sin(weekSeed * 999 + n * 77.7 + tick * 0.13) * 10000;
      return x - Math.floor(x);
    };
    const list: Entry[] = opponents.map((o, i) => ({
      name: o.name,
      avatar: o.avatar,
      xp: Math.floor(rand(i) * (220 + tick * 2)) + 10,
    }));
    list.push({ name: "You", avatar: "🦉", xp: state.xpToday, isYou: true });
    return list.sort((a, b) => b.xp - a.xp);
  }, [l1, state.xpToday, tick]);

  const myRank = entries.findIndex((e) => e.isYou) + 1;
  const league = leagueForXp(state.xp);
  const leagueIdx = LEAGUES.findIndex((l) => l.name === league.name);

  return (
    <PageShell>
      <ContentStatus />
      <SectionTitle icon="🏆" title="Weekly league" sub={`${entries.length} learners · the top ${PROMOTE} get promoted`} />

      <div className="card-light mb-3 rounded-3xl border-2 border-slate-200 bg-white p-3">
        <label className="text-xs font-black text-slate-500" htmlFor="l1-select">
          Learner&apos;s first language — type it (changes the league names)
        </label>
        <L1Input
          id="l1-select"
          value={state.l1}
          packDefault={pack.meta.l1}
          onChange={(v) => update((s) => ({ ...s, l1: v }))}
        />
        <p className="mt-1 text-xs font-bold text-slate-400">
          Showing {poolSize(l1)} names for {languageName(l1)}
          {!hasNamePool(l1) && " (international names — no local pool for that language yet)"}
        </p>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
        {LEAGUES.map((l, i) => (
          <div
            key={l.name}
            className={`flex shrink-0 items-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-xs font-black ${i === leagueIdx ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-slate-200 bg-white text-slate-400"}`}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
            {l.name}
          </div>
        ))}
      </div>

      <div className="card-light overflow-hidden rounded-3xl border-2 border-slate-200 bg-white">
        <div className="border-b-2 border-slate-100 bg-gradient-to-r from-yellow-50 to-orange-50 p-3 text-center">
          <p className="text-sm font-black text-slate-700">
            🏆 {league.name} League · your rank: <b className="text-orange-500">{myRank} of {entries.length}</b>
          </p>
          <p className="text-[11px] text-slate-400">
            {myRank <= PROMOTE ? "You are in the promotion zone! 🚀" : myRank <= STAY ? "Close — a little more practice 💪" : "Danger zone — earn XP today 🔥"}
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {entries.map((e, i) => (
            <div
              key={`${e.name}-${i}`}
              className={`flex items-center gap-3 border-b border-slate-50 p-2.5 ${e.isYou ? "bg-green-50" : ""} ${i === PROMOTE - 1 ? "border-b-2 border-b-green-300" : ""} ${i === STAY - 1 ? "border-b-2 border-b-red-200" : ""}`}
            >
              <span className={`w-7 text-center text-sm font-black ${i < 3 ? "text-yellow-500" : "text-slate-400"}`}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xl">{e.avatar}</span>
              <span className={`flex-1 text-sm font-black ${e.isYou ? "text-green-700" : "text-slate-700"}`}>
                {e.name} {e.isYou && "(you)"}
              </span>
              <span className="text-sm font-black text-slate-400">{e.xp} XP</span>
            </div>
          ))}
        </div>
        <div className="flex justify-around border-t-2 border-slate-100 p-2 text-[10px] font-bold text-slate-400">
          <span>🟢 Rank 1–{PROMOTE}: promote</span>
          <span>⚪ Rank {PROMOTE + 1}–{STAY}: stay</span>
          <span>🔴 Rank {STAY + 1}+: demote</span>
        </div>
      </div>
    </PageShell>
  );
}
