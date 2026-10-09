"use client";

import React, { useMemo, useState } from "react";
import { LeaderboardEntry } from "@/data/fakeLeaderboard";
import { Trophy, Medal, Award, CheckCircle2, Sparkles, MousePointerClick, Info } from "lucide-react";
import confetti from "canvas-confetti";
import { Avatar } from "./PlayerPicker";

/**
 * The board.
 *
 * It used to hold exactly one real row — "you" — plus twenty practice rivals, and
 * the tutor's own learner was folded into it under whatever name happened to be in
 * the box. Now every real player the console has a record for is a row: the tutor's
 * saved players, and everyone who joined a score room. Clicking a real row switches
 * the session to that player, which is the whole point of keeping a roster.
 *
 * Two deliberate behaviours:
 *   · practice rivals stay for solo warm-ups, and the tutor can switch them off to
 *     see their own class alone (the toggle lives in the player picker);
 *   · the All-Time / This Week / Today tabs now actually filter. Rivals carry no
 *     timestamps, so the narrower windows show real players only rather than
 *     pretending a practice score was set this morning.
 */

export interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  userBestScore?: number;
  userRank?: number;
  playerName: string;
  /** The name box + saved players + suggestion list (see PlayerPicker). */
  picker?: React.ReactNode;
  /** Click a real row to make that player the active one. */
  onSelectEntry?: (entry: LeaderboardEntry) => void;
}

type Period = "all" | "weekly" | "today";

export default function LeaderboardView({
  entries,
  userBestScore,
  userRank,
  playerName,
  picker,
  onSelectEntry,
}: LeaderboardViewProps) {
  const [period, setPeriod] = useState<Period>("all");

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#38bdf8", "#ec4899", "#f59e0b", "#10b981"],
    });
  };

  /**
   * The rows for the selected window, re-ranked. Rivals survive only on All-Time;
   * a real player with no score in the window is shown at 0 rather than dropped, so
   * the tutor can still click them and hand over the session.
   */
  const rows = useMemo(() => {
    const forPeriod = (e: LeaderboardEntry): number | null => {
      if (!e.isReal) return period === "all" ? e.score : null;
      const best = e.best ?? { all: e.score, week: e.score, today: e.score };
      return period === "all" ? best.all : period === "weekly" ? best.week : best.today;
    };
    return entries
      .map((e) => ({ entry: e, score: forPeriod(e) }))
      .filter((r): r is { entry: LeaderboardEntry; score: number } => r.score !== null)
      .map((r) => ({ ...r.entry, score: r.score, isUser: r.entry.isUser }))
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [entries, period]);

  const rivalsHidden = period !== "all";

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-amber-400/30">
          <Trophy className="w-4 h-4 fill-current" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-300 text-slate-950 font-black flex items-center justify-center shadow-md">
          <Medal className="w-4 h-4 fill-current" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-black flex items-center justify-center shadow-md">
          <Award className="w-4 h-4 fill-current" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 font-mono text-xs font-bold flex items-center justify-center border border-slate-700">
        #{rank}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-black text-white">RANKINGS</h3>
            <div className="mt-1.5 relative">{picker}</div>
          </div>
        </div>

        {/* Time filters — these now filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(
            [
              ["all", "All-Time"],
              ["weekly", "This Week"],
              ["today", "Today"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                period === value ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal best callout */}
      {userBestScore !== undefined && userBestScore > 0 && (
        <div className="my-4 p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/70 via-indigo-950/70 to-purple-950/70 border border-cyan-500/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <div className="text-xs text-cyan-300 font-mono flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5" /> {playerName.toUpperCase()}
              </div>
              <div className="text-sm font-semibold text-white">
                Ranked <span className="text-cyan-400 font-mono font-bold">#{userRank ?? "—"}</span> on this board
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">High Score</span>
              <span className="text-xl font-black text-cyan-400 font-mono">
                {userBestScore.toLocaleString()}
              </span>
            </div>
            <button
              onClick={triggerConfetti}
              className="p-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg shadow-md transition"
              title="Celebrate!"
            >
              🎉
            </button>
          </div>
        </div>
      )}

      {rivalsHidden && (
        <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Practice rivals have no dates, so {period === "today" ? "today" : "this week"} shows your own players.
        </div>
      )}

      {/* Rows */}
      <div className="mt-4 divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto pr-1">
        {rows.map((entry) => {
          const isTop3 = entry.rank <= 3;
          const clickable = !!entry.isReal && !!onSelectEntry && !entry.isUser;
          return (
            <div
              key={entry.id}
              onClick={clickable ? () => onSelectEntry?.(entry) : undefined}
              title={clickable ? `Continue as ${entry.playerName}` : undefined}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-between transition-colors ${
                entry.isUser
                  ? "bg-cyan-950/40 border border-cyan-500/50 shadow-md shadow-cyan-500/10"
                  : clickable
                  ? "cursor-pointer hover:bg-cyan-950/20 border border-transparent hover:border-cyan-500/30"
                  : "hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {getRankBadge(entry.rank)}

                <Avatar avatar={entry.avatar} name={entry.playerName} size={36} />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-bold text-sm truncate ${
                        entry.isUser ? "text-cyan-300 font-black" : "text-white"
                      }`}
                    >
                      {entry.playerName}
                    </span>
                    {entry.isUser && (
                      <span className="bg-cyan-500 text-slate-950 text-[10px] font-black px-1.5 rounded font-mono shrink-0">
                        PLAYING
                      </span>
                    )}
                    {entry.roomRole === "guest" && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-1.5 rounded font-mono shrink-0">
                        ROOM
                      </span>
                    )}
                    {entry.verified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    {!entry.isReal && (
                      <span className="text-xs shrink-0" title={`Region: ${entry.country}`}>
                        {entry.countryFlag}
                      </span>
                    )}
                    {clickable && <MousePointerClick className="w-3 h-3 text-slate-600 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate">
                    <span className="text-amber-400/90">{entry.badge}</span>
                    <span>•</span>
                    <span className="text-slate-500 truncate">{entry.device}</span>
                    {entry.plays ? <span className="text-slate-600">· {entry.plays} plays</span> : null}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-base font-black font-mono ${
                    isTop3 ? "text-amber-400" : entry.isUser ? "text-cyan-300" : "text-slate-200"
                  }`}
                >
                  {entry.score.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{entry.timeAgo}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
