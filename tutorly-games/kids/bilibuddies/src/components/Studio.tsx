"use client";

import { useEffect, useState } from "react";
import { TutorRail } from "@/components/TutorRail";
import { AbcMode } from "@/components/games/AbcMode";
import { ChantMode } from "@/components/games/ChantMode";
import { CountMode } from "@/components/games/CountMode";
import { LearnMode } from "@/components/games/LearnMode";
import { MatchMode } from "@/components/games/MatchMode";
import { QuizMode } from "@/components/games/QuizMode";
import { SortMode } from "@/components/games/SortMode";
import { TalkMode } from "@/components/games/TalkMode";
import { LogoMark } from "@/components/ui/Logo";
import { StarIcon } from "@/components/ui/icons";
import { MODES, useStudio } from "@/lib/studio";
import type { StudentRow } from "@/lib/studio";
import { href, navigate } from "@/lib/route";
import { sfx, unlockAudio } from "@/lib/sfx";

export function Studio({ students }: { students: StudentRow[] }) {
  const st = useStudio();
  const [list, setList] = useState<StudentRow[]>(students);
  const { theme, subtheme, mode, settings, word, next, prev, reshuffle, addStar, stars, student, setMode } = st;
  const [cinema, setCinema] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.code === "Space") {
        e.preventDefault();
        unlockAudio();
        if (word) void st.sayPair(word);
      } else if (e.key.toLowerCase() === "s") {
        if (word) addStar(word);
      } else if (e.key.toLowerCase() === "r") {
        reshuffle();
      } else if (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "h") {
        setCinema((c) => !c);
        sfx.flip();
      } else if (e.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      } else if (/^[1-8]$/.test(e.key)) {
        const m = MODES[Number(e.key) - 1];
        if (m) setMode(m.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, word, addStar, reshuffle, setMode, st]);

  const body =
    mode === "learn" ? (
      <LearnMode />
    ) : mode === "quiz" ? (
      <QuizMode />
    ) : mode === "match" ? (
      <MatchMode />
    ) : mode === "sort" ? (
      <SortMode />
    ) : mode === "chant" ? (
      <ChantMode />
    ) : mode === "talk" ? (
      <TalkMode />
    ) : mode === "abc" ? (
      <AbcMode />
    ) : (
      <CountMode />
    );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <main
        className="relative flex min-w-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4 transition-all"
        style={{
          background: `radial-gradient(circle at 18% 12%, ${theme.soft}, #FFFBF5 55%, ${theme.soft} 140%)`,
        }}
      >
        {/* stage header */}
        <header className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 shadow-[0_3px_0_rgba(59,52,85,0.08)]">
            <LogoMark size={30} />
            <span className="display text-[1.05rem] font-extrabold text-ink">Tutorly</span>
          </div>

          {student ? (
            <div
              className="flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{ background: `${student.color}22`, boxShadow: `inset 0 0 0 2px ${student.color}55` }}
            >
              <span className="text-[1.5rem] leading-none">{student.avatar}</span>
              <span className="display text-[1.15rem] font-extrabold text-ink">{student.name}</span>
            </div>
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <span className="display truncate text-[clamp(1.05rem,1.7vw,1.5rem)] font-extrabold text-ink">
              {theme.emoji} {theme.t[settings.target]}
            </span>
            <span className="text-inksoft/50">›</span>
            <span className="display truncate text-[clamp(1.05rem,1.7vw,1.5rem)] font-bold text-inksoft">
              {subtheme.emoji} {subtheme.t[settings.target]}
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5"
            style={{ background: "#FFC14522", boxShadow: "inset 0 0 0 2px #FFC14566" }}
          >
            <StarIcon size={22} className="text-[#F2A62B]" />
            <span className="display text-[1.3rem] font-extrabold text-ink">{stars}</span>
          </div>

          <a
            href={href.pack}
            className="pressable display rounded-full border-2 border-line bg-white px-4 py-2 text-[1rem] font-extrabold text-inksoft"
            title="Add themes with an AI prompt"
          >
            📋 AI themes
          </a>

          <a
            href={href.voices}
            className="pressable display rounded-full border-2 border-line bg-white px-4 py-2 text-[1rem] font-extrabold text-inksoft"
            title="Check the read-aloud voices"
          >
            🎤 Voices
          </a>

          <button
            onClick={() => {
              sfx.flip();
              setCinema((c) => !c);
            }}
            className="pressable display rounded-full border-2 border-line bg-white px-4 py-2 text-[1rem] font-extrabold text-inksoft"
            title="Cinema mode (C)"
          >
            {cinema ? "🎛 Show controls" : "🎬 Cinema"}
          </button>
        </header>

        <div className="scroll-soft min-h-0 flex-1 overflow-y-auto pb-2">{body}</div>

        {cinema ? (
          <div className="pointer-events-none absolute bottom-3 right-5 text-[0.9rem] font-bold text-inksoft/40">
            press C for controls
          </div>
        ) : null}
      </main>

      <TutorRail
        students={list}
        onAddStudent={(s) => setList((l) => [...l, s])}
        cinema={cinema}
        setCinema={setCinema}
        onHome={() => navigate(href.home)}
      />
    </div>
  );
}
