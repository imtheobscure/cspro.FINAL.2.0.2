"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toggleMusic, isMusicOn, unlockAudio } from "@/lib/audio";
import { GAME } from "@/lib/branding";

export function Nav() {
  const [music, setMusic] = useState(false);
  useEffect(() => setMusic(isMusicOn()), []);
  return (
    <nav className="glass sticky top-0 z-40 rounded-b-3xl px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-2xl font-black" title={`${GAME.fullName} — back to the first page`}>
          <span className="text-3xl">{GAME.emoji}</span>
          <span className="gold-text">{GAME.brand}</span> <span>{GAME.name}</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base font-bold">
          <Link href="/host" className="rounded-xl px-3 py-2 hover:bg-white/10">Host</Link>
          <Link href="/play" className="rounded-xl px-3 py-2 hover:bg-white/10">Join</Link>
          <Link href="/maker" className="rounded-xl px-3 py-2 hover:bg-white/10 hidden sm:block">Test Maker</Link>
          <Link href="/review" className="rounded-xl px-3 py-2 hover:bg-white/10 hidden sm:block">Review</Link>
          <Link href="/guide" className="rounded-xl px-3 py-2 hover:bg-white/10">Guide</Link>
          {/* Brings the branded first page back — useful on a projector. */}
          <Link href="/?splash=1" className="rounded-xl px-3 py-2 hover:bg-white/10 hidden sm:block" title="Show the first page again">
            🏠
          </Link>
          <button onClick={() => { unlockAudio(); setMusic(toggleMusic()); }} className="rounded-xl px-3 py-2 hover:bg-white/10" title="Background music">{music ? "🎵" : "🔇"}</button>
        </div>
      </div>
    </nav>
  );
}
