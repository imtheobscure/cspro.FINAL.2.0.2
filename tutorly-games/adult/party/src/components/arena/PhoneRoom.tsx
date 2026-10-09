"use client";

import { useEffect, useState } from "react";
import { Avatar, Btn, Chip } from "@/components/ui";
import { useArena } from "./provider";
import { sfx } from "@/lib/audio";
import { createRoom, getRoom, pushPrompt, resetScores, type RoomPrompt } from "@/lib/localApi";
import { joinUrl } from "@/lib/basePath";
import QrImage from "@/components/qr-image";

type Player = { playerKey: string; name: string; avatar: string; score: number; streak: number };

export default function PhoneRoomPanel() {
  const a = useArena();
  const [players, setPlayers] = useState<Player[]>([]);
  const [free, setFree] = useState("");

  useEffect(() => {
    if (!a.s.roomCode) return;
    const poll = () => {
      const code = a.s.roomCode;
      if (!code) return;
      const r = getRoom(code);
      if (r?.players) setPlayers(r.players);
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [a.s.roomCode]);

  const create = () => {
    const r = createRoom({ hostName: "Tutor", sessionCode: a.s.sessionCode });
    if (r.code) { a.set((st) => ({ ...st, roomCode: r.code })); sfx("reveal"); }
  };

  const push = (prompt: RoomPrompt) => {
    if (!a.s.roomCode) return;
    pushPrompt(a.s.roomCode, prompt);
    sfx("chime");
  };

  const url = typeof window !== "undefined" && a.s.roomCode ? joinUrl(a.s.roomCode) : "";

  if (!a.s.roomCode) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-300">Open a room so learners can answer from a second window while this screen stays the shared board. The room runs inside this browser — a static game has no server for other devices to join.</p>
        <Btn tone="violet" onClick={create}>Open a room</Btn>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-5">
        <QrImage text={url} className="h-40 w-40 rounded-2xl bg-white p-2" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Room code</p>
          <p className="text-5xl font-black tracking-[0.25em] text-amber-300">{a.s.roomCode}</p>
          <p className="mt-1 truncate text-xs text-slate-400">{url}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn size="sm" tone="ghost" onClick={() => navigator.clipboard?.writeText(url)}>Copy link</Btn>
            <Btn size="sm" tone="ghost" onClick={() => void push({ kind: "idle", title: "Eyes on the board 👀" })}>Send “eyes up”</Btn>
            <Btn size="sm" tone="ghost" onClick={() => void push({ kind: "buzz", title: "Buzz in!", options: ["BUZZ"] })}>Buzzer round</Btn>
            <Btn size="sm" tone="red" onClick={() => resetScores(a.s.roomCode ?? "")}>Reset phone scores</Btn>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <input value={free} onChange={(e) => setFree(e.target.value)} placeholder="Push an open question to every phone…"
          className="flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm" />
        <Btn tone="blue" onClick={() => { void push({ kind: "open", title: "Type your answer", question: free }); setFree(""); }}>Send</Btn>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">In the room · {players.length}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {players.map((p, i) => (
            <li key={p.playerKey} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="w-4 text-xs font-black text-slate-500">{i + 1}</span>
              <Avatar src={p.avatar} name={p.name} size={30} />
              <span className="flex-1 truncate text-sm font-bold">{p.name}</span>
              {p.streak > 1 && <Chip colour="#fb7185">{p.streak}🔥</Chip>}
              <span className="text-sm font-black text-amber-300 tabular-nums">{p.score}</span>
            </li>
          ))}
          {!players.length && <li className="text-sm text-slate-500">Nobody has joined yet.</li>}
        </ul>
      </div>
    </div>
  );
}
