"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Theme, Word } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { speakText, ui } from "@/lib/i18n";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage } from "../WordImage";
import { SpeakButton } from "../SpeakButton";
import { BigButton, Toast, shuffle } from "../ui";
import { Celebration } from "./Celebration";

const ROUNDS = 6;

export function Listen({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const [seed, setSeed] = useState(0);
  const board = useMemo(() => shuffle(theme.words).slice(0, 6), [theme, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const order = useMemo(() => shuffle(board).slice(0, ROUNDS), [board]);
  const [idx, setIdx] = useState(0);
  const [hit, setHit] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [revealWord, setRevealWord] = useState(false);

  const current = order[idx];
  const promptText = current ? ui(target, "touchThe", { w: current.t[target] }) : "";

  const say = useCallback(() => { if (current) void speak(promptText, target); }, [current, promptText, target]);

  useEffect(() => {
    if (s.autoSpeak && s.ready && current) {
      const t = setTimeout(say, 500);
      return () => clearTimeout(t);
    }
  }, [idx, seed, say, s.autoSpeak, s.ready, current]);

  const tap = (w: Word) => {
    if (hit || !current) return;
    if (w.id === current.id) {
      sfx.ding();
      setHit(w.id);
      setToast(`⭐ ${w.t[target]}`);
      void speak(`${speakText(target, w)}! ${ui(target, "greatJob")}`, target).then(() => {
        setTimeout(() => {
          setFoundIds((f) => [...f, w.id]);
          setHit(null);
          if (idx + 1 >= order.length) setDone(true);
          else setIdx(idx + 1);
        }, 300);
      });
    } else {
      sfx.oops();
      setWrong(w.id);
      setMisses((m) => m + 1);
      setTimeout(() => setWrong(null), 400);
      void speak(`${speakText(target, w)}. ${ui(target, "tryAgain")}`, target);
    }
  };

  const reset = () => { setSeed((x) => x + 1); setIdx(0); setHit(null); setMisses(0); setFoundIds([]); setDone(false); };

  if (done) {
    const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
    return <Celebration stars={stars} themeId={theme.id} activity="listen" onReplay={reset} />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {toast && <Toast key={toast + idx} text={toast} tone="mint" />}
      <div className="card-soft mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <SpeakButton text={promptText} lang={target} size="lg" />
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              👂 {revealWord ? promptText : ui(target, "lookAndTouch")}
            </h2>
            <p className="text-ink-soft">{ui(target, "listenDesc")} · {idx + 1} / {order.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { sfx.tick(); setRevealWord((r) => !r); }} className={`rounded-full px-3 py-1.5 text-sm font-bold ${revealWord ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10"}`}>
            {revealWord ? "🙈 Hide word" : "👁️ Show word"}
          </button>
          <BigButton tone="white" size="sm" onClick={reset}>🔀 {ui(target, "again")}</BigButton>
        </div>
      </div>

      <div className="stagger grid grid-cols-2 gap-4 sm:grid-cols-3">
        {board.map((w) => {
          const isHit = hit === w.id;
          const isWrong = wrong === w.id;
          const isFound = foundIds.includes(w.id) && !isHit;
          return (
            <button
              key={w.id}
              onClick={() => tap(w)}
              className={`card-soft relative flex aspect-[4/3] flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isHit ? "anim-bounce ring-8 ring-mint bg-mint/20" : isWrong ? "anim-shake ring-4 ring-coral/50" : ""
              }`}
              aria-label={w.t.en}
            >
              <WordImage word={w} size={130} countEmoji={theme.countEmoji} />
              {(isHit || isFound) && <span className="font-display text-2xl font-bold text-ink">{w.t[target]}</span>}
              {isFound && <span className="absolute right-3 top-3 text-2xl">⭐</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
