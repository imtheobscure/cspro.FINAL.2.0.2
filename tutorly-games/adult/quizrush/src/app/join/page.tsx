"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AVATAR_SETS } from "@/lib/types";
import { sfx, unlockAudio } from "@/lib/sound";
import { joinGame } from "@/lib/localApi";

function JoinInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [setIdx, setSetIdx] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = sp.get("code");
    if (c) setCode(c.toUpperCase());
  }, [sp]);

  const join = async () => {
    if (!name.trim()) {
      setError("Enter your name first!");
      return;
    }
    if (code.trim().length < 4) {
      setError("Enter a valid game code.");
      return;
    }
    setBusy(true);
    setError("");
    unlockAudio();
    // No fetch: the room lives in this browser (see `lib/localApi.ts`), so joining
    // is a localStorage write. The route's own error strings come back unchanged.
    const data = joinGame(code.trim().toUpperCase(), { name: name.trim(), avatar });
    if ("playerId" in data) {
      sfx.join();
      sessionStorage.setItem(`player_${data.code}`, String(data.playerId));
      router.push(`/play?code=${data.code}&pid=${data.playerId}`);
    } else {
      setError(data.error || "Could not join.");
    }
    setBusy(false);
  };

  const set = AVATAR_SETS[setIdx];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-center text-4xl md:text-5xl font-black">
        <span className="text-gradient">Quiz</span>Rush
      </h1>
      <p className="mb-6 text-center text-lg text-slate-300">Join the arena 🎮</p>

      <div className="glass-strong rounded-3xl p-5">
        <label className="text-sm font-bold uppercase tracking-wide text-slate-400">Game Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABC123"
          className="mt-1 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-4 text-center text-3xl font-black tracking-[0.3em] outline-none focus:border-cyan-400"
        />

        <label className="mt-4 block text-sm font-bold uppercase tracking-wide text-slate-400">Your Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Type a nickname"
          className="mt-1 w-full rounded-2xl border-2 border-white/15 bg-white/5 px-4 py-4 text-center text-2xl font-bold outline-none focus:border-cyan-400"
        />

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-wide text-slate-400">Pick Avatar</label>
            <div className="flex gap-1">
              {AVATAR_SETS.map((s, i) => (
                <button
                  key={s.name}
                  onClick={() => setSetIdx(i)}
                  className={`rounded-lg px-2 py-1 text-xs font-bold ${i === setIdx ? "bg-cyan-500/30 ring-1 ring-cyan-400" : "bg-white/10"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {set.avatars.map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAvatar(a);
                  sfx.click();
                }}
                className={`aspect-square rounded-2xl text-3xl transition ${avatar === a ? "bg-cyan-500/30 ring-2 ring-cyan-400 scale-105" : "bg-white/8 hover:bg-white/15"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-3 rounded-xl bg-red-500/20 px-3 py-2 text-center font-bold text-red-300">{error}</div>}

        <button
          onClick={join}
          disabled={busy}
          className="btn-glow mt-5 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-5 text-2xl font-black text-slate-900 disabled:opacity-50"
        >
          {busy ? "Joining…" : `${avatar} Enter Game`}
        </button>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading…</div>}>
      <JoinInner />
    </Suspense>
  );
}
