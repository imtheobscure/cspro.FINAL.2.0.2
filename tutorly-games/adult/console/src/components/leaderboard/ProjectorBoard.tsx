"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X, Radio, Wifi, WifiOff, QrCode } from "lucide-react";
import type { LeaderboardEntry } from "@/data/fakeLeaderboard";
import { formatResultCode } from "@/lib/offlineCode";
import { Avatar } from "./PlayerPicker";

/**
 * The board you point a projector at.
 *
 * RANKINGS is a control panel: it has a name box, tabs, a practice-rival toggle
 * and rows you click to hand the session over. None of that belongs on a wall.
 * This view is the other half of a room — the class watches it while the tutor
 * keeps the console — so it shows only what a class can read from the back row:
 * who is winning, by how much, and how to join.
 *
 * It is deliberately the same data as RANKINGS (`entries`), not a second
 * leaderboard, so the two can never disagree. Practice rivals are left out
 * entirely: a wall that says a stranger called `Valkyrie_X` is beating the class
 * is a lie told very large.
 *
 * Two things make it useful in a real room:
 *   · the join link *and* the code are both on screen, with a QR — in a classroom
 *     one learner reads the link, another types the code, and the rest scan;
 *   · it works with no room at all (the offline case), where it becomes the card
 *     a tutor photographs: the scores that were typed in, in order.
 */

export interface ProjectorBoardProps {
  entries: LeaderboardEntry[];
  gameTitle: string;
  /** Live room state — the code, the link, and whether a room is even running. */
  roomCode: string | null;
  roomLink: string | null;
  roomLive: boolean;
  /**
   * False while the console is being served from `localhost`: the link and its QR
   * would be correct and unscannable, so the code is shown on its own instead.
   */
  shareable?: boolean;
  /** Why there is no room, when there is not one (shown instead of a dead QR). */
  roomNote?: string | null;
  onClose: () => void;
}

/** QR via a public image service, exactly as the Party Mode engine does.
 *  A classroom projector has internet when a room is live; when it does not, the
 *  code underneath is already big enough to read out loud, so the QR simply
 *  removes itself rather than leaving a broken-image box on a wall. */
function qrSrc(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(data)}`;
}

function rankTone(rank: number): { ring: string; text: string; chip: string } {
  if (rank === 1) return { ring: "border-amber-400", text: "text-amber-300", chip: "bg-amber-400 text-slate-950" };
  if (rank === 2) return { ring: "border-slate-400", text: "text-slate-200", chip: "bg-slate-300 text-slate-950" };
  if (rank === 3) return { ring: "border-amber-700", text: "text-amber-200", chip: "bg-amber-700 text-amber-50" };
  return { ring: "border-slate-800", text: "text-slate-300", chip: "bg-slate-800 text-slate-300" };
}

export default function ProjectorBoard({
  entries,
  gameTitle,
  roomCode,
  roomLink,
  roomLive,
  shareable = true,
  roomNote,
  onClose,
}: ProjectorBoardProps) {
  const [qrBroken, setQrBroken] = useState(false);

  // Esc closes it: a tutor with a remote in one hand should not have to find a
  // small X on a projector-sized screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = useMemo(
    () => entries.filter((e) => e.isReal).sort((a, b) => b.score - a.score).slice(0, 12),
    [entries]
  );

  const scoring = rows.filter((r) => r.score > 0).length;
  const topScore = rows[0]?.score ?? 0;

  return (
    <div className="fixed inset-0 z-[60] bg-[#04060f] text-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 px-8 py-5 border-b border-slate-800/80">
        <div className="min-w-0">
          <div className="text-xs font-mono tracking-[0.3em] text-cyan-400">LIVE SCOREBOARD</div>
          <h2 className="text-2xl xl:text-4xl font-black truncate">{gameTitle}</h2>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Playing</div>
            <div className="text-xl xl:text-3xl font-black font-mono text-cyan-300">{scoring}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Top score</div>
            <div className="text-xl xl:text-3xl font-black font-mono text-amber-400">{topScore.toLocaleString()}</div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-700"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 p-8 min-h-0">
        {/* The board */}
        <div className="min-h-0 overflow-hidden">
          {rows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <div className="text-6xl">🏁</div>
              <p className="text-2xl font-black text-slate-300">No scores yet</p>
              <p className="text-sm font-mono text-slate-500 max-w-md">
                Play a game, or have learners join the room and score — this board fills in live.
              </p>
            </div>
          ) : (
            <div className="h-full grid gap-3 content-start overflow-y-auto pr-2">
              {rows.map((entry, i) => {
                const rank = i + 1;
                const tone = rankTone(rank);
                const width = topScore > 0 ? Math.max(6, Math.round((entry.score / topScore) * 100)) : 0;
                return (
                  <div
                    key={entry.id}
                    className={`relative flex items-center gap-5 rounded-2xl border-2 ${tone.ring} bg-slate-950/70 px-5 py-4 overflow-hidden`}
                  >
                    {/* progress bar behind the row: the gap to the leader, visible at a glance */}
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500/15 to-transparent"
                      style={{ width: `${width}%` }}
                    />
                    <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${tone.chip}`}>
                      {rank}
                    </span>
                    <Avatar avatar={entry.avatar} name={entry.playerName} size={52} />
                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl xl:text-3xl font-black truncate">{entry.playerName}</span>
                        {entry.roomRole === "guest" && (
                          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ROOM
                          </span>
                        )}
                        {entry.isUser && (
                          <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                            TUTOR
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-500 truncate">
                        {entry.badge}
                        {entry.plays ? ` · ${entry.plays} plays` : ""}
                        {entry.device ? ` · ${entry.device}` : ""}
                      </div>
                    </div>
                    <span className={`relative text-3xl xl:text-5xl font-black font-mono ${tone.text}`}>
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Join panel */}
        <div className="flex flex-col gap-5 min-h-0">
          <div className="rounded-3xl border-2 border-slate-800 bg-slate-950/70 p-6">
            <div className="flex items-center gap-2 mb-4">
              {roomLive ? (
                <>
                  <Radio className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-black tracking-widest text-emerald-400">ROOM OPEN</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-black tracking-widest text-amber-400">NO ROOM</span>
                </>
              )}
            </div>

            {roomCode && (
              <>
                <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Room code</div>
                <div className="text-5xl xl:text-6xl font-black tracking-[0.2em] text-cyan-300 font-mono text-center py-2">
                  {roomCode}
                </div>
              </>
            )}

            {roomLink && shareable && !qrBroken ? (
              <div className="mt-4 flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc(roomLink)}
                  alt="Join link QR code"
                  width={360}
                  height={360}
                  className="w-56 h-56 rounded-2xl bg-white p-2"
                  onError={() => setQrBroken(true)}
                />
                <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" /> Scan to join on a phone
                </div>
                <div className="w-full text-[11px] font-mono text-slate-400 break-all text-center">{roomLink}</div>
              </div>
            ) : roomLink && !shareable ? (
              <p className="mt-4 text-xs font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 leading-relaxed">
                This console is on <strong>localhost</strong>, so a link would only ever open on this machine. Read the
                code out, or serve the console from its normal address to get a QR — the code works either way.
              </p>
            ) : (
              roomNote && <p className="mt-4 text-xs font-mono text-slate-500 leading-relaxed">{roomNote}</p>
            )}

            {roomLive && (
              <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Phones answer here — scores appear above as they land.
              </div>
            )}
          </div>

          {/* The no-network half: how a result reaches this board without WebRTC. */}
          <div className="rounded-3xl border-2 border-slate-800 bg-slate-950/70 p-6">
            <div className="text-sm font-black tracking-widest text-slate-300 mb-2">NO NETWORK?</div>
            <ol className="text-xs font-mono text-slate-400 space-y-2 leading-relaxed">
              <li>1. Each learner plays on their own device.</li>
              <li>2. Their console shows a result code, like {formatResultCode("K7QM9X2C")}.</li>
              <li>3. Type that code into RANKINGS → NO NETWORK on the console and their score lands here.</li>
            </ol>
            <p className="mt-3 text-[11px] font-mono text-slate-500">
              A photographed version of this screen works too — the scores above are the whole story.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
