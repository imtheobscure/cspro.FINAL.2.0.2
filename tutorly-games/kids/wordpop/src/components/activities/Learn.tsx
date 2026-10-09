"use client";

import { useCallback, useEffect, useState } from "react";
import { Theme } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { ccqFor, speakText, ui, LANG_META } from "@/lib/i18n";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { WordImage } from "../WordImage";
import { SpeakButton } from "../SpeakButton";
import { BigButton, ProgressDots, Toast } from "../ui";
import { Celebration } from "./Celebration";

export function Learn({ theme }: { theme: Theme }) {
  const s = useSettings();
  const [i, setI] = useState(0);
  const [anim, setAnim] = useState("anim-pop");
  const [seen, setSeen] = useState<boolean[]>(() => theme.words.map(() => false));
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const word = theme.words[i];
  const target = s.target;
  const support = s.support;

  useEffect(() => {
    setSeen((p) => { const n = [...p]; n[i] = true; return n; });
    if (s.autoSpeak && s.ready) {
      const t = setTimeout(() => void speak(speakText(target, word), target), 250);
      return () => clearTimeout(t);
    }
  }, [i, word, target, s.autoSpeak, s.ready]);

  const go = useCallback((dir: 1 | -1) => {
    sfx.flip();
    setAnim(dir === 1 ? "anim-pop" : "anim-squash");
    setI((p) => (p + dir + theme.words.length) % theme.words.length);
  }, [theme.words.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (done) {
    return <Celebration stars={3} themeId={theme.id} activity="learn" onReplay={() => { setDone(false); setI(0); }} />;
  }

  const ccqs = ccqFor(target, word, theme.kind);
  const isLast = i === theme.words.length - 1;
  const tapCard = () => {
    sfx.pop();
    setAnim("");
    requestAnimationFrame(() => setAnim("anim-squash"));
    void speak(speakText(target, word), target);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {toast && <Toast text={toast} tone="sun" />}
      {/* Flashcard */}
      <section className="flex flex-col items-center gap-5">
        <div
          key={word.id + anim}
          onClick={tapCard}
          className={`card-soft ${anim} relative flex w-full max-w-3xl cursor-pointer flex-col items-center gap-4 px-6 py-8 sm:py-10`}
          role="button"
          aria-label="Tap to hear the word"
        >
          <span className="absolute left-5 top-4 rounded-full bg-cream-2 px-3 py-1 text-sm font-bold text-ink-soft">
            {i + 1} / {theme.words.length}
          </span>
          <WordImage word={word} size={220} countEmoji={theme.countEmoji} className="drop-shadow-sm" />
          <div className="text-center">
            <div className="font-display text-6xl font-bold leading-tight text-ink sm:text-7xl">
              {word.letter ? `${word.letter} · ` : ""}{word.t[target]}
            </div>
            {target === "zh" && <div className="mt-1 font-display text-3xl text-ink-soft">{word.py}</div>}
            {support !== "none" && (
              <div className="mt-2 font-display text-4xl text-ink-soft">
                <span className="mr-2 text-2xl">{LANG_META[support].flag}</span>
                {word.t[support]}
                {support === "zh" && <span className="ml-2 text-2xl">{word.py}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <SpeakButton text={speakText(target, word)} lang={target} size="lg" label={ui(target, "listenBtn")} />
          <SpeakButton text={speakText(target, word)} lang={target} size="lg" slow tone="white" />
          {support !== "none" && (
            <SpeakButton text={speakText(support, word)} lang={support} size="lg" tone="sun" label={LANG_META[support].flag} />
          )}
          <BigButton
            tone="mint"
            onClick={() => { setToast(`🗣️ ${ui(target, "sayIt")}`); void speak(`${ui(target, "repeatAfterMe")} ${speakText(target, word)}`, target); }}
          >
            🗣️ {ui(target, "sayIt")}
          </BigButton>
        </div>

        <div className="flex w-full max-w-3xl items-center justify-between gap-3">
          <BigButton tone="white" onClick={() => go(-1)} size="md">◀ {ui(target, "back")}</BigButton>
          <ProgressDots total={theme.words.length} current={i} done={seen} />
          {isLast ? (
            <BigButton tone="coral" onClick={() => setDone(true)} size="md">🎉 {ui(target, "allDone")}</BigButton>
          ) : (
            <BigButton tone="coral" onClick={() => go(1)} size="md">{ui(target, "next")} ▶</BigButton>
          )}
        </div>

        {/* Thumbnails */}
        <div className="no-scrollbar flex w-full max-w-3xl gap-2 overflow-x-auto py-2">
          {theme.words.map((w, idx) => (
            <button
              key={w.id}
              onClick={() => { sfx.tick(); setI(idx); }}
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white ring-2 transition-transform hover:scale-105 ${idx === i ? "ring-coral" : "ring-transparent"}`}
              aria-label={w.t.en}
            >
              {w.n !== undefined ? <span className="font-display text-2xl font-bold">{w.n}</span>
                : w.letter ? <span className="font-display text-2xl font-bold text-sky-deep">{w.letter}</span>
                : <WordImage word={w} size={40} />}
            </button>
          ))}
        </div>
      </section>

      {/* Talk time (tutor) */}
      {s.showCCQ && (
        <aside className="card-soft h-fit bg-cream-2 p-5 lg:sticky lg:top-24">
          <h3 className="font-display mb-3 flex items-center gap-2 text-2xl font-bold text-ink">
            💬 {ui(target, "talkTime")}
            <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-ink-soft">CCQ</span>
          </h3>
          <ul className="space-y-2">
            {ccqs.map((q) => (
              <li key={q} className="flex items-center gap-2 rounded-2xl bg-white p-3 text-lg font-bold text-ink shadow-sm">
                <SpeakButton text={q} lang={target} size="sm" tone="white" />
                <span className="leading-snug">{q}</span>
              </li>
            ))}
          </ul>
          {support !== "none" && (
            <div className="mt-4 rounded-2xl bg-white/70 p-3 text-base text-ink-soft">
              <div className="mb-1 font-bold">{LANG_META[support].flag} {ui(support, "talkTime")}</div>
              <ul className="list-inside list-disc space-y-1">
                {ccqFor(support, word, theme.kind).slice(0, 3).map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {[ui(target, "yes"), ui(target, "no"), ui(target, "greatJob"), ui(target, "oneMoreTime")].map((p) => (
              <button key={p} onClick={() => { sfx.tick(); void speak(p, target); }} className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-ink/10 hover:bg-sun/50">
                🔊 {p}
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
