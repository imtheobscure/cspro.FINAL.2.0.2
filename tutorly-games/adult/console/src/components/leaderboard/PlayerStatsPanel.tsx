"use client";

import React, { useMemo, useState } from "react";
import { X, Gamepad2, Trophy, Clock, TrendingUp, Users } from "lucide-react";
import type { ConsolePlayer } from "@/lib/players";
import { formatDuration, getPlayerStats } from "@/lib/localApi";
import { Avatar } from "./PlayerPicker";

/**
 * One player's whole record, read straight out of the score rows that are already
 * stored — no separate stats table, so this panel can never disagree with the board.
 *
 * The four numbers a tutor actually asks about, in the order they ask them:
 *   · GAMES PLAYED — how much of the catalogue this learner has touched;
 *   · BEST PER GAME — what they are good at, which is the interesting column;
 *   · WEEKLY TREND — are they improving, and are they still showing up;
 *   · TIME SPENT — the honest measure of effort, and the one a parent asks for.
 *
 * The trend is drawn from daily totals rather than a smoothed line: a gap in the
 * bars is a week they did not play, which is exactly the thing worth noticing.
 */

export interface PlayerStatsPanelProps {
  player: ConsolePlayer;
  /** Game id → title, so a column of ids reads like a report card. */
  titleFor: (gameId: string) => string;
  onPlayGame?: (gameId: string) => void;
  onClose: () => void;
}

export default function PlayerStatsPanel({ player, titleFor, onPlayGame, onClose }: PlayerStatsPanelProps) {
  const [window_, setWindow_] = useState<7 | 14 | 30>(14);

  const stats = useMemo(() => {
    try {
      return getPlayerStats({ id: player.id, name: player.name }, window_);
    } catch {
      return null;
    }
  }, [player.id, player.name, window_]);

  const peak = stats ? Math.max(1, ...stats.days.map((d) => d.best)) : 1;
  const activeDays = stats ? stats.days.filter((d) => d.plays > 0).length : 0;
  const firstWords = stats?.days.slice(0, Math.max(1, Math.floor(window_ / 2))).reduce((s, d) => s + d.best, 0) ?? 0;
  const lastWords = stats?.days.slice(-Math.max(1, Math.floor(window_ / 2))).reduce((s, d) => s + d.best, 0) ?? 0;
  const improving = lastWords > firstWords && firstWords > 0;

  return (
    <div className="fixed inset-0 z-[55] bg-[#04060f]/95 backdrop-blur-sm overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar avatar={player.avatar} name={player.name} size={56} />
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-black text-white truncate">{player.name}</h3>
              <p className="text-[11px] font-mono text-slate-500">
                {player.source === "adult" || player.source === "kids"
                  ? "From your dashboard"
                  : player.source === "guest"
                  ? "Joined a room"
                  : "Saved on this console"}
                {stats?.lastPlayedAt ? ` · last played ${new Date(stats.lastPlayedAt).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!stats || stats.totalPlays === 0 ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-lg font-black text-slate-300">No scores yet</p>
            <p className="text-xs font-mono text-slate-500 mt-1">Play something as {player.name} and this fills in.</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6">
            {/* The four numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: <Gamepad2 className="w-4 h-4" />, label: "Games played", value: stats.distinctGames.toLocaleString(), sub: `${stats.totalPlays} session${stats.totalPlays === 1 ? "" : "s"}` },
                { icon: <Trophy className="w-4 h-4" />, label: "Best score", value: stats.bestOverall.toLocaleString(), sub: stats.games[0] ? titleFor(stats.games[0].gameId) : "" },
                { icon: <Clock className="w-4 h-4" />, label: "Time spent", value: formatDuration(stats.totalSeconds), sub: `${activeDays} active day${activeDays === 1 ? "" : "s"}` },
                { icon: <Users className="w-4 h-4" />, label: "From others", value: String(stats.fromOthers), sub: "room + coded results" },
              ].map((cell) => (
                <div key={cell.label} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-500">
                    {cell.icon}
                    {cell.label}
                  </div>
                  <div className="text-2xl font-black font-mono text-white mt-1.5">{cell.value}</div>
                  {cell.sub && <div className="text-[10px] font-mono text-slate-500 truncate">{cell.sub}</div>}
                </div>
              ))}
            </div>

            {/* Weekly trend */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${improving ? "text-emerald-400" : "text-slate-400"}`} />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Trend</h4>
                  {improving && <span className="text-[10px] font-mono text-emerald-400">improving</span>}
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  {([7, 14, 30] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setWindow_(d)}
                      className={`px-2.5 py-1 rounded-lg font-mono transition ${
                        window_ === d ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-1 h-32">
                {stats.days.map((d) => (
                  <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1" title={`${d.date}: best ${d.best.toLocaleString()} over ${d.plays} play(s)`}>
                    <div
                      className={`w-full rounded-t ${d.plays ? "bg-gradient-to-t from-cyan-600 to-cyan-400" : "bg-slate-800"}`}
                      style={{ height: d.plays ? `${Math.max(4, Math.round((d.best / peak) * 100))}%` : "3px" }}
                    />
                    {window_ <= 14 && <span className="text-[8px] font-mono text-slate-600">{d.label}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] font-mono text-slate-500">
                Bars are each day&apos;s best score. A flat grey bar is a day this learner did not play.
              </p>
            </div>

            {/* Best per game */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 text-sm font-black text-white uppercase tracking-wider font-mono">
                Best per game
              </div>
              <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto">
                {stats.games.map((g) => (
                  <div key={g.gameId} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 min-w-0 text-xs font-bold text-white truncate">{titleFor(g.gameId)}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{g.plays} play{g.plays === 1 ? "" : "s"}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">avg {g.average.toLocaleString()}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{formatDuration(g.seconds)}</span>
                    <span className="text-base font-black font-mono text-amber-400 shrink-0 w-24 text-right">{g.best.toLocaleString()}</span>
                    {onPlayGame && (
                      <button
                        onClick={() => onPlayGame(g.gameId)}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-[10px] font-black transition"
                        title="Put this game on the console"
                      >
                        PLAY
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-600">
              Every number here is derived from {player.name}&apos;s saved score rows — nothing extra is stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
