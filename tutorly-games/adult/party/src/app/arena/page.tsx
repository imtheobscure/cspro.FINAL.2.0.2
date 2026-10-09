"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArenaProvider, loadState, newSession, type ArenaState } from "@/components/arena/provider";
import Shell from "@/components/arena/Shell";
import { avatarUrl } from "@/lib/avatars";

export default function ArenaPage() {
  const [state, setState] = useState<ArenaState | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const s = loadState();
    if (s) setState(s);
    else setMissing(true);
  }, []);

  if (missing && !state) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-black">No game is set up yet</h1>
        <p className="text-slate-400">Add the players and pick a game first — or jump straight in with a single demo team.</p>
        <div className="flex gap-2">
          <Link href="/" className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-slate-950">Go to setup</Link>
          <button
            className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-bold"
            onClick={() => setState(newSession([
              { id: "demo1", name: "Team Alpha", avatar: avatarUrl("adventurer", "Alpha"), score: 0, streak: 0, powers: [] },
              { id: "demo2", name: "Team Bravo", avatar: avatarUrl("micah", "Bravo"), score: 0, streak: 0, powers: [] },
            ]))}
          >
            Quick demo game
          </button>
        </div>
      </main>
    );
  }

  if (!state) return <main className="grid min-h-screen place-items-center text-slate-500">Loading the arena…</main>;

  return (
    <ArenaProvider initial={state}>
      <Shell />
    </ArenaProvider>
  );
}
