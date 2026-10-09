"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Theme, Word } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { speakText, ui } from "@/lib/i18n";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage } from "../WordImage";
import { BigButton, Toast, shuffle } from "../ui";
import { Celebration } from "./Celebration";

const PAIRS = 4;

export function Match({ theme }: { theme: Theme }) {
  const s = useSettings();
  const target = s.target;
  const [seed, setSeed] = useState(0);
  const words = useMemo(() => shuffle(theme.words).slice(0, PAIRS), [theme, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const pictures = useMemo(() => shuffle(words), [words]);
  const [matched, setMatched] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; w: number; h: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (s.autoSpeak && s.ready) void speak(ui(target, "findPairs"), target);
  }, [seed, s.autoSpeak, s.ready, target]);

  const tryMatch = (wordId: string, picId: string) => {
    if (wordId === picId) {
      sfx.snap();
      sfx.ding();
      setMatched((m) => [...m, wordId]);
      setSelected(null);
      const w = words.find((x) => x.id === wordId)!;
      setToast(`⭐ ${w.t[target]}`);
      void speak(`${speakText(target, w)}! ${ui(target, "greatJob")}`, target);
      if (matched.length + 1 >= PAIRS) setTimeout(() => setDone(true), 900);
    } else {
      sfx.oops();
      setMisses((m) => m + 1);
      setWrongFlash(picId);
      setTimeout(() => setWrongFlash(null), 400);
      void speak(ui(target, "tryAgain"), target);
    }
  };

  /* pointer drag (mouse + touch) */
  const onPointerDown = (e: React.PointerEvent, w: Word) => {
    if (matched.includes(w.id)) return;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ id: w.id, x: e.clientX, y: e.clientY, w: r.width, h: r.height });
    sfx.tick();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop]") as HTMLElement | null;
    setHover(under?.dataset.drop ?? null);
  };
  const onPointerUp = (e: React.PointerEvent, w: Word) => {
    if (!drag) return;
    const moved = startRef.current ? Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) : 0;
    const under = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop]") as HTMLElement | null;
    setDrag(null);
    setHover(null);
    if (under?.dataset.drop) {
      tryMatch(w.id, under.dataset.drop);
    } else if (moved < 8) {
      // treat as a tap → select
      setSelected(selected === w.id ? null : w.id);
      sfx.pop();
      void speak(speakText(target, w), target);
    }
  };

  const onPicTap = (p: Word) => {
    if (matched.includes(p.id)) return;
    if (selected) tryMatch(selected, p.id);
    else { sfx.pop(); void speak(speakText(target, p), target); }
  };

  if (done) {
    const stars = misses === 0 ? 3 : misses <= 2 ? 2 : 1;
    return <Celebration stars={stars} themeId={theme.id} activity="match" onReplay={() => { setSeed((x) => x + 1); setMatched([]); setMisses(0); setDone(false); }} />;
  }

  const dragWord = drag ? words.find((w) => w.id === drag.id) : null;

  return (
    <div className="mx-auto max-w-5xl">
      {toast && <Toast key={toast + matched.length} text={toast} tone="mint" />}
      <div className="card-soft mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-display text-3xl font-bold">🧩 {ui(target, "findPairs")}</h2>
          <p className="text-ink-soft">{ui(target, "dragHint")}</p>
        </div>
        <div className="font-display text-2xl">{matched.length} / {PAIRS} ⭐</div>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:gap-10">
        {/* Words */}
        <div className="stagger flex flex-col gap-4">
          {words.map((w) => {
            const isMatched = matched.includes(w.id);
            const isSel = selected === w.id;
            return (
              <div
                key={w.id}
                onPointerDown={(e) => onPointerDown(e, w)}
                onPointerMove={onPointerMove}
                onPointerUp={(e) => onPointerUp(e, w)}
                onPointerCancel={() => { setDrag(null); setHover(null); }}
                style={{ touchAction: "none" }}
                className={`card-soft flex min-h-24 cursor-grab select-none items-center justify-center px-4 py-4 text-center font-display text-3xl font-bold transition-all sm:text-4xl ${
                  isMatched ? "bg-mint/40 text-mint-deep line-through opacity-70" : isSel ? "ring-4 ring-coral scale-105" : "hover:-translate-y-0.5"
                } ${drag?.id === w.id ? "opacity-30" : ""}`}
                role="button"
                aria-label={w.t[target]}
              >
                {isMatched ? "✓ " : ""}{w.t[target]}
                {target === "zh" && <span className="ml-2 text-xl text-ink-soft">{w.py}</span>}
              </div>
            );
          })}
        </div>
        {/* Pictures */}
        <div className="stagger flex flex-col gap-4">
          {pictures.map((p) => {
            const isMatched = matched.includes(p.id);
            const isHover = hover === p.id;
            return (
              <div
                key={p.id}
                data-drop={p.id}
                onClick={() => onPicTap(p)}
                className={`card-soft flex min-h-24 items-center justify-center gap-3 p-3 transition-all duration-200 ${
                  isMatched ? "anim-squash bg-mint/40 ring-4 ring-mint" : isHover ? "scale-105 ring-4 ring-sky bg-sky/20" : wrongFlash === p.id ? "anim-shake ring-4 ring-coral/60" : "border-2 border-dashed border-ink/10"
                }`}
                aria-label={p.t.en}
              >
                <WordImage word={p} size={80} countEmoji={theme.countEmoji} />
                {isMatched && <span className="font-display text-2xl font-bold text-mint-deep">{p.t[target]}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* drag ghost */}
      {drag && dragWord && (
        <div
          className="pointer-events-none fixed z-50 flex items-center justify-center rounded-3xl bg-white px-4 py-3 font-display text-3xl font-bold text-ink shadow-2xl ring-4 ring-coral"
          style={{ left: drag.x - drag.w / 2, top: drag.y - drag.h / 2, width: drag.w, height: drag.h, transform: "rotate(-3deg) scale(1.05)" }}
        >
          {dragWord.t[target]}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <BigButton tone="white" size="sm" onClick={() => { setSeed((x) => x + 1); setMatched([]); setMisses(0); setSelected(null); }}>🔀 {ui(target, "again")}</BigButton>
      </div>
    </div>
  );
}
