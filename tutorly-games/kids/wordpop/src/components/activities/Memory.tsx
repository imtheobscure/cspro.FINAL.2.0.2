"use client";

import { useEffect, useMemo, useState } from "react";
import { Theme, Word } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { speakText, ui } from "@/lib/i18n";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage } from "../WordImage";
import { BigButton, shuffle } from "../ui";
import { Celebration } from "./Celebration";

type Card = { key: string; word: Word; face: "pic" | "word" };

export function Memory({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const [pairs, setPairs] = useState<4 | 6>(4);
  const [wordFaces, setWordFaces] = useState(true); // picture+word (false = picture+picture for 3-year-olds)
  const [seed, setSeed] = useState(0);
  const cards = useMemo<Card[]>(() => {
    const ws = shuffle(theme.words).slice(0, pairs);
    return shuffle(ws.flatMap((w) => [
      { key: w.id + "-a", word: w, face: "pic" as const },
      { key: w.id + "-b", word: w, face: wordFaces ? ("word" as const) : ("pic" as const) },
    ]));
  }, [theme, pairs, wordFaces, seed]);
  const [open, setOpen] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (s.autoSpeak && s.ready) void speak(ui(target, "findPairs"), target);
  }, [seed, pairs, s.autoSpeak, s.ready, target]);

  const reset = () => { setOpen([]); setFound([]); setMoves(0); setDone(false); setSeed((x) => x + 1); };

  const flip = (c: Card) => {
    if (lock || open.includes(c.key) || found.includes(c.word.id)) return;
    sfx.flip();
    void speak(speakText(target, c.word), target);
    const next = [...open, c.key];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next.map((k) => cards.find((x) => x.key === k)!);
      setLock(true);
      if (a.word.id === b.word.id) {
        setTimeout(() => {
          sfx.ding();
          setFound((f) => {
            const nf = [...f, a.word.id];
            if (nf.length >= pairs) setTimeout(() => setDone(true), 700);
            return nf;
          });
          setOpen([]);
          setLock(false);
        }, 600);
      } else {
        setTimeout(() => { sfx.oops(); setOpen([]); setLock(false); }, 1100);
      }
    }
  };

  if (done) {
    const perfect = pairs + 1;
    const stars = moves <= perfect ? 3 : moves <= pairs * 2 ? 2 : 1;
    return <Celebration stars={stars} themeId={theme.id} activity="memory" onReplay={reset} message={`${moves} 🔁`} />;
  }

  const cols = pairs === 4 ? "grid-cols-4" : "grid-cols-4";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="card-soft mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-display text-3xl font-bold">🃏 {ui(target, "findPairs")}</h2>
          <p className="text-ink-soft">{ui(target, "flipHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <button onClick={() => { setPairs(4); reset(); }} className={`rounded-full px-3 py-1.5 ${pairs === 4 ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}>4 pairs</button>
          <button onClick={() => { setPairs(6); reset(); }} className={`rounded-full px-3 py-1.5 ${pairs === 6 ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}>6 pairs</button>
          <span className="mx-1 h-5 w-px bg-ink/10" />
          <button onClick={() => { setWordFaces(false); reset(); }} className={`rounded-full px-3 py-1.5 ${!wordFaces ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}>🖼️ + 🖼️</button>
          <button onClick={() => { setWordFaces(true); reset(); }} className={`rounded-full px-3 py-1.5 ${wordFaces ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}>🖼️ + 🔤</button>
          <span className="ml-2 font-display text-xl">{found.length}/{pairs} ⭐ · {moves} 🔁</span>
        </div>
      </div>

      <div className={`grid ${cols} gap-3 sm:gap-4`}>
        {cards.map((c) => {
          const isOpen = open.includes(c.key) || found.includes(c.word.id);
          const isFound = found.includes(c.word.id);
          return (
            <button
              key={c.key}
              onClick={() => flip(c)}
              className={`perspective aspect-square ${isFound ? "anim-squash" : ""}`}
              aria-label={isOpen ? c.word.t[target] : "card"}
            >
              <div className={`preserve-3d relative h-full w-full transition-transform duration-500 ${isOpen ? "rotate-y-180" : ""}`} style={{ transitionTimingFunction: "var(--ease-pop)" }}>
                {/* back */}
                <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-3xl bg-gradient-to-br from-sky to-lilac shadow-md ring-4 ring-white">
                  <span className="text-5xl drop-shadow">⭐</span>
                </div>
                {/* front */}
                <div className={`backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl bg-white p-2 shadow-md ring-4 ${isFound ? "ring-mint" : "ring-sun"}`}>
                  {c.face === "pic" ? (
                    <WordImage word={c.word} size={pairs === 6 ? 72 : 96} countEmoji={theme.countEmoji} />
                  ) : (
                    <span className="font-display text-center text-2xl font-bold leading-tight text-ink sm:text-3xl">{c.word.t[target]}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <BigButton tone="white" size="sm" onClick={reset}>🔀 {ui(target, "again")}</BigButton>
      </div>
    </div>
  );
}
